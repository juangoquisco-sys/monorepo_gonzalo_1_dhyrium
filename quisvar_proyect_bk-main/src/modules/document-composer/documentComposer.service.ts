import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { DocumentArtifactStatus, DocumentArtifactType } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import { DOCUMENT_COMPOSER_LIMITS } from './documentComposer.constants';
import {
  getArtifactAbsolutePath,
  createComposerWorkDir,
  persistArtifactFile,
  readArtifactSize,
  removeComposerPath,
  writeComposerFile,
} from './documentComposer.storage';
import {
  isPdfBuffer,
  getPdfSourceArtifactIds,
  parseDocumentManifest,
  sanitizePdfName,
  validateJpeg,
} from './documentComposer.domain';
import {
  extractPdfPage,
  getPdfPageCount,
  mergeSinglePagePdfs,
  validatePdfWithQpdf,
} from './qpdf.service';
import type {
  ArtifactResponse,
  DocumentManifest,
} from './documentComposer.types';
import {
  cleanupExpiredThumbnailCache,
  getOrStartDocumentThumbnail,
  removeArtifactThumbnailCache,
} from './documentComposer.thumbnail';

type CreateArtifactInput = {
  ownerId: number;
  name: string;
  idempotencyKey?: string;
  manifest: unknown;
  files: Express.Multer.File[];
};

type RegisterPdfInput = {
  ownerId: number;
  name?: string;
  idempotencyKey?: string;
  file: Express.Multer.File;
};

const buildArtifactResponse = (artifact: {
  id: string;
  safeName: string;
  originalName: string | null;
  status: DocumentArtifactStatus;
  type: DocumentArtifactType;
  mimeType: string;
  sizeBytes: number;
  pageCount: number;
  createdAt: Date;
  expiresAt: Date | null;
}): ArtifactResponse => ({
  id: artifact.id,
  name: artifact.safeName,
  originalName: artifact.originalName,
  status: artifact.status,
  type: artifact.type,
  mimeType: artifact.mimeType,
  sizeBytes: artifact.sizeBytes,
  pageCount: artifact.pageCount,
  createdAt: artifact.createdAt,
  expiresAt: artifact.expiresAt,
  downloadUrl: `/api/v1/document-composer/artifacts/${artifact.id}/download`,
});

const assertNotExpired = (
  artifact: {
    status: DocumentArtifactStatus;
    expiresAt: Date | null;
  },
  asNotFound = false
) => {
  const expired =
    artifact.status === DocumentArtifactStatus.EXPIRED ||
    (artifact.expiresAt !== null && artifact.expiresAt.getTime() <= Date.now());
  if (expired) {
    throw new AppError(
      asNotFound
        ? 'El artefacto solicitado no existe.'
        : 'El artefacto temporal expiró.',
      asNotFound ? 404 : 410,
      asNotFound ? 'DOCUMENT_ARTIFACT_NOT_FOUND' : 'DOCUMENT_ARTIFACT_EXPIRED'
    );
  }
};

const getIdempotentArtifact = async (
  ownerId: number,
  idempotencyKey?: string
) => {
  if (!idempotencyKey) return null;
  const artifact = await prisma.documentArtifact.findUnique({
    where: {
      ownerId_idempotencyKey: {
        ownerId,
        idempotencyKey,
      },
    },
  });
  if (artifact) assertNotExpired(artifact);
  return artifact;
};

const validateTotalUpload = (files: Express.Multer.File[]) => {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > DOCUMENT_COMPOSER_LIMITS.maxTotalBytes) {
    throw new AppError(
      'Los archivos superan el límite total de 200 MB.',
      413,
      'DOCUMENT_TOTAL_LIMIT_EXCEEDED'
    );
  }
};

const createImagePagePdf = async (
  image: Express.Multer.File,
  outputPath: string
) => {
  const { width, height } = validateJpeg(image);
  const isLandscape = width > height;
  const pageWidth = isLandscape ? 841.89 : 595.28;
  const pageHeight = isLandscape ? 595.28 : 841.89;
  const margin = 12;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;
  const scale = Math.min(availableWidth / width, availableHeight / height);
  const renderWidth = width * scale;
  const renderHeight = height * scale;

  const document = await PDFDocument.create();
  const embedded = await document.embedJpg(image.buffer);
  const page = document.addPage([pageWidth, pageHeight]);
  page.drawImage(embedded, {
    x: (pageWidth - renderWidth) / 2,
    y: (pageHeight - renderHeight) / 2,
    width: renderWidth,
    height: renderHeight,
  });
  await writeComposerFile(outputPath, Buffer.from(await document.save()));
};

const resolveImageFiles = (
  manifest: DocumentManifest,
  files: Express.Multer.File[]
) => {
  const fileMap = new Map<string, Express.Multer.File>();
  for (const file of files) {
    if (fileMap.has(file.originalname)) {
      throw new AppError(
        'Se enviaron archivos con la misma clave.',
        400,
        'DOCUMENT_FILE_DUPLICATED'
      );
    }
    fileMap.set(file.originalname, file);
  }

  const expectedKeys = new Set(
    manifest.items.flatMap(item =>
      item.kind === 'image' ? [item.fileKey] : []
    )
  );
  if (expectedKeys.size !== files.length) {
    throw new AppError(
      'La cantidad de imágenes no coincide con el manifiesto.',
      400,
      'DOCUMENT_FILE_MISSING'
    );
  }
  for (const key of expectedKeys) {
    if (!fileMap.has(key)) {
      throw new AppError(
        `Falta la imagen identificada por ${key}.`,
        400,
        'DOCUMENT_FILE_MISSING'
      );
    }
  }
  return fileMap;
};

class DocumentComposerService {
  static async getOwnedArtifact(
    ownerId: number,
    artifactId: string,
    expiredAsNotFound = false
  ) {
    const artifact = await prisma.documentArtifact.findUnique({
      where: { id: artifactId },
    });
    if (!artifact) {
      throw new AppError(
        'El artefacto solicitado no existe.',
        404,
        'DOCUMENT_ARTIFACT_NOT_FOUND'
      );
    }
    if (artifact.ownerId !== ownerId) {
      throw new AppError(
        'No tienes acceso a este artefacto.',
        403,
        'DOCUMENT_ARTIFACT_FORBIDDEN'
      );
    }
    assertNotExpired(artifact, expiredAsNotFound);
    return artifact;
  }

  static async registerPdfSource(input: RegisterPdfInput) {
    const existing = await getIdempotentArtifact(
      input.ownerId,
      input.idempotencyKey
    );
    if (existing) return buildArtifactResponse(existing);

    if (
      input.file.size > DOCUMENT_COMPOSER_LIMITS.maxPdfBytes ||
      !isPdfBuffer(input.file.buffer)
    ) {
      throw new AppError(
        'El archivo no es un PDF válido o supera 150 MB.',
        415,
        'DOCUMENT_PDF_INVALID'
      );
    }

    const artifactId = randomUUID();
    const workDir = await createComposerWorkDir();
    const sourcePath = path.join(workDir, 'source.pdf');
    try {
      await writeComposerFile(sourcePath, input.file.buffer);
      await validatePdfWithQpdf(sourcePath);
      const pageCount = await getPdfPageCount(sourcePath);
      if (pageCount > DOCUMENT_COMPOSER_LIMITS.maxPages) {
        throw new AppError(
          'El PDF supera el límite de 200 páginas.',
          413,
          'DOCUMENT_PAGE_LIMIT_EXCEEDED'
        );
      }

      const safeName = sanitizePdfName(input.name || input.file.originalname);
      const { storageKey } = await persistArtifactFile(
        sourcePath,
        input.ownerId,
        artifactId
      );
      const artifact = await prisma.documentArtifact.create({
        data: {
          id: artifactId,
          ownerId: input.ownerId,
          type: DocumentArtifactType.ORIGINAL_PDF,
          status: DocumentArtifactStatus.TEMPORARY,
          safeName,
          originalName: input.file.originalname,
          storageKey,
          mimeType: 'application/pdf',
          sizeBytes: input.file.size,
          pageCount,
          sha256: createHash('sha256').update(input.file.buffer).digest('hex'),
          idempotencyKey: input.idempotencyKey,
          expiresAt: new Date(
            Date.now() + DOCUMENT_COMPOSER_LIMITS.artifactTtlMs
          ),
        },
      });
      return buildArtifactResponse(artifact);
    } finally {
      await removeComposerPath(workDir);
    }
  }

  static async compose(input: CreateArtifactInput) {
    const existing = await getIdempotentArtifact(
      input.ownerId,
      input.idempotencyKey
    );
    if (existing) return buildArtifactResponse(existing);

    const manifest = parseDocumentManifest(input.manifest);
    validateTotalUpload(input.files);
    const fileMap = resolveImageFiles(manifest, input.files);
    const sourceArtifacts = new Map(
      await Promise.all(
        getPdfSourceArtifactIds(manifest.items).map(
          async sourceArtifactId =>
            [
              sourceArtifactId,
              await DocumentComposerService.getOwnedArtifact(
                input.ownerId,
                sourceArtifactId
              ),
            ] as const
        )
      )
    );
    const artifactId = randomUUID();
    const workDir = await createComposerWorkDir();
    const outputPath = path.join(workDir, 'result.pdf');

    try {
      const ordered = [...manifest.items].sort((a, b) => a.order - b.order);
      const pagePaths: string[] = [];

      for (const [index, item] of ordered.entries()) {
        const pagePath = path.join(workDir, `page-${index + 1}.pdf`);
        if (item.kind === 'image') {
          const file = fileMap.get(item.fileKey);
          if (!file) {
            throw new AppError(
              'Falta una imagen del manifiesto.',
              400,
              'DOCUMENT_FILE_MISSING'
            );
          }
          await createImagePagePdf(file, pagePath);
        } else {
          const source = sourceArtifacts.get(item.sourceArtifactId);
          if (!source) {
            throw new AppError(
              'Una fuente PDF del manifiesto no existe.',
              404,
              'DOCUMENT_ARTIFACT_NOT_FOUND'
            );
          }
          if (item.pageNumber > source.pageCount) {
            throw new AppError(
              'Una página del PDF fuente no existe.',
              422,
              'DOCUMENT_PAGE_NOT_FOUND'
            );
          }
          await extractPdfPage(
            getArtifactAbsolutePath(source.storageKey),
            item.pageNumber,
            pagePath
          );
        }
        pagePaths.push(pagePath);
      }

      await mergeSinglePagePdfs(pagePaths, outputPath);
      await validatePdfWithQpdf(outputPath);
      const pageCount = await getPdfPageCount(outputPath);
      if (pageCount !== ordered.length) {
        throw new AppError(
          'El PDF generado no conserva el orden solicitado.',
          422,
          'DOCUMENT_GENERATION_FAILED'
        );
      }
      const sizeBytes = await readArtifactSize(outputPath);
      if (sizeBytes > DOCUMENT_COMPOSER_LIMITS.maxPdfBytes) {
        throw new AppError(
          'El PDF generado supera el límite de 150 MB.',
          413,
          'DOCUMENT_PDF_LIMIT_EXCEEDED'
        );
      }

      const safeName = sanitizePdfName(input.name);
      const { storageKey, absolutePath } = await persistArtifactFile(
        outputPath,
        input.ownerId,
        artifactId
      );
      const fileBuffer = await readFile(absolutePath);
      const artifact = await prisma.documentArtifact.create({
        data: {
          id: artifactId,
          ownerId: input.ownerId,
          type: DocumentArtifactType.COMPOSED_PDF,
          status: DocumentArtifactStatus.TEMPORARY,
          safeName,
          storageKey,
          mimeType: 'application/pdf',
          sizeBytes,
          pageCount,
          sha256: createHash('sha256').update(fileBuffer).digest('hex'),
          manifest,
          idempotencyKey: input.idempotencyKey,
          expiresAt: new Date(
            Date.now() + DOCUMENT_COMPOSER_LIMITS.artifactTtlMs
          ),
        },
      });
      return buildArtifactResponse(artifact);
    } finally {
      await removeComposerPath(workDir);
    }
  }

  static async getMetadata(ownerId: number, artifactId: string) {
    return buildArtifactResponse(
      await DocumentComposerService.getOwnedArtifact(ownerId, artifactId)
    );
  }

  static async getDownload(ownerId: number, artifactId: string) {
    const artifact = await DocumentComposerService.getOwnedArtifact(
      ownerId,
      artifactId
    );
    return {
      artifact,
      absolutePath: getArtifactAbsolutePath(artifact.storageKey),
    };
  }

  static async getThumbnail(
    ownerId: number,
    artifactId: string,
    pageNumber: number
  ) {
    const artifact = await DocumentComposerService.getOwnedArtifact(
      ownerId,
      artifactId,
      true
    );
    const isUsable =
      artifact.status === DocumentArtifactStatus.TEMPORARY ||
      artifact.status === DocumentArtifactStatus.PUBLISHED;
    if (artifact.mimeType !== 'application/pdf' || !isUsable) {
      throw new AppError(
        'El artefacto solicitado no es un PDF disponible.',
        404,
        'DOCUMENT_ARTIFACT_NOT_FOUND'
      );
    }
    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      pageNumber > artifact.pageCount
    ) {
      throw new AppError(
        'La página solicitada no existe.',
        404,
        'DOCUMENT_PAGE_NOT_FOUND'
      );
    }

    return getOrStartDocumentThumbnail({
      artifact,
      sourcePath: getArtifactAbsolutePath(artifact.storageKey),
      pageNumber,
    });
  }

  static async deleteTemporary(ownerId: number, artifactId: string) {
    const artifact = await DocumentComposerService.getOwnedArtifact(
      ownerId,
      artifactId
    );
    const references = await prisma.contractDocumentVersion.count({
      where: { artifactId },
    });
    if (
      references > 0 ||
      artifact.status === DocumentArtifactStatus.PUBLISHED
    ) {
      throw new AppError(
        'Un documento publicado no puede eliminarse desde Herramientas.',
        409,
        'DOCUMENT_ARTIFACT_IN_USE'
      );
    }

    await prisma.documentArtifact.delete({ where: { id: artifactId } });
    await removeComposerPath(getArtifactAbsolutePath(artifact.storageKey));
    await removeArtifactThumbnailCache(artifact);
  }

  static async cleanupExpired(now = new Date()) {
    const artifacts = await prisma.documentArtifact.findMany({
      where: {
        expiresAt: { lte: now },
        status: {
          in: [DocumentArtifactStatus.TEMPORARY, DocumentArtifactStatus.FAILED],
        },
      },
    });

    let removed = 0;
    for (const artifact of artifacts) {
      await removeComposerPath(getArtifactAbsolutePath(artifact.storageKey));
      await removeArtifactThumbnailCache(artifact);
      await prisma.documentArtifact.update({
        where: { id: artifact.id },
        data: { status: DocumentArtifactStatus.EXPIRED },
      });
      removed += 1;
    }
    const thumbnailCleanup = await cleanupExpiredThumbnailCache(now.getTime());
    return {
      removed,
      removedThumbnailCaches: thumbnailCleanup.removed,
    };
  }
}

export default DocumentComposerService;

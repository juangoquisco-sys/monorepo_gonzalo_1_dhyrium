import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  DocumentArtifactStatus,
  DocumentArtifactType,
  FoliationReprintScope,
  Prisma,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import DownloadServices from '@/services/download.services';
import { FoliationServices, type FoliationConfig } from '@/services/foliation.services';
import { basenameFromPath } from '@/utils/tools';
import {
  createComposerWorkDir,
  getArtifactAbsolutePath,
  persistArtifactFile,
  readArtifactSize,
  removeComposerPath,
} from '@/modules/document-composer/documentComposer.storage';
import {
  getPdfPageCount,
  runQpdf,
  validatePdfWithQpdf,
} from '@/modules/document-composer/qpdf.service';
import { sanitizePdfName } from '@/modules/document-composer/documentComposer.domain';
import { removeArtifactThumbnailCache } from '@/modules/document-composer/documentComposer.thumbnail';
import type {
  ExpedienteRootType,
  ReprintSelection,
} from './expedienteFoliation.schema';

type PageEntry = {
  pageNumber: number;
  folioText: string;
  levelId?: number;
  taskId?: number;
  fileId?: number;
  pageIndexInFile?: number;
  pageSize?: string;
};

type GenerateInput = FoliationConfig & {
  actorId: number;
  rootId: number;
  rootType: ExpedienteRootType;
};

const EXPEDIENTE_QPDF_TIMEOUT_MS = 10 * 60 * 1000;

const getRootName = async (rootId: number, rootType: ExpedienteRootType) => {
  const root =
    rootType === 'stage'
      ? await prisma.stages.findUnique({ where: { id: rootId } })
      : await prisma.levels.findUnique({ where: { id: rootId } });
  if (!root) {
    throw new AppError(
      'El proyecto/nivel del expediente no existe.',
      404,
      'EXPEDIENTE_ROOT_NOT_FOUND'
    );
  }
  return root.name;
};

const buildDownloadUrl = (rootType: ExpedienteRootType, rootId: number) =>
  `/api/v1/expediente-foliation/${rootType}/${rootId}/download`;

const isPageEntry = (value: Prisma.JsonValue): value is PageEntry => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  return (
    Number.isInteger(entry.pageNumber) &&
    typeof entry.folioText === 'string' &&
    (entry.levelId === undefined || Number.isInteger(entry.levelId)) &&
    (entry.taskId === undefined || Number.isInteger(entry.taskId)) &&
    (entry.fileId === undefined || Number.isInteger(entry.fileId))
  );
};

const parsePageEntries = (value: Prisma.JsonValue): PageEntry[] =>
  Array.isArray(value) ? value.filter(isPageEntry) : [];

const resolveDescendantLevelIds = async (levelId: number) => {
  const levels = await prisma.levels.findMany({
    where: { OR: [{ id: levelId }, { levelList: { has: levelId } }] },
    select: { id: true },
  });
  if (!levels.length) {
    throw new AppError(
      'El nivel seleccionado no existe.',
      404,
      'EXPEDIENTE_LEVEL_NOT_FOUND'
    );
  }
  return new Set(levels.map(level => level.id));
};

const filterEntriesByScope = async (
  entries: PageEntry[],
  selection: ReprintSelection
) => {
  if (selection.scope === 'LEVEL') {
    const levelIds = await resolveDescendantLevelIds(selection.levelId);
    return entries.filter(entry =>
      entry.levelId === undefined ? false : levelIds.has(entry.levelId)
    );
  }
  if (selection.scope === 'TASK') {
    return entries.filter(entry => entry.taskId === selection.taskId);
  }
  if (selection.scope === 'FILE') {
    return entries.filter(entry => entry.fileId === selection.fileId);
  }
  const wanted = new Set(selection.pageNumbers);
  return entries.filter(entry => wanted.has(entry.pageNumber));
};

export const buildFolioRange = (matched: PageEntry[]) => {
  const sorted = [...matched].sort((a, b) => a.pageNumber - b.pageNumber);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return first.folioText === last.folioText
    ? first.folioText
    : `${last.folioText}-${first.folioText}`;
};

const buildScopeLabel = async (selection: ReprintSelection) => {
  if (selection.scope === 'LEVEL') {
    const level = await prisma.levels.findUnique({
      where: { id: selection.levelId },
      select: { item: true, name: true },
    });
    return level
      ? `${level.item ?? ''} ${level.name}`.trim()
      : `Nivel ${selection.levelId}`;
  }
  if (selection.scope === 'TASK') {
    const task = await prisma.subTasks.findUnique({
      where: { id: selection.taskId },
      select: { name: true },
    });
    return task?.name ?? `Tarea ${selection.taskId}`;
  }
  if (selection.scope === 'FILE') {
    const file = await prisma.files.findUnique({
      where: { id: selection.fileId },
      select: { name: true },
    });
    return file?.name ?? `Archivo ${selection.fileId}`;
  }
  return `${selection.pageNumbers.length} página(s) suelta(s)`;
};

export const toQpdfPageRange = (pageNumbers: number[]) => {
  const sorted = [...new Set(pageNumbers)].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let previous = sorted[0];

  for (let index = 1; index <= sorted.length; index += 1) {
    const current = sorted[index];
    if (current === previous + 1) {
      previous = current;
      continue;
    }
    ranges.push(start === previous ? `${start}` : `${start}-${previous}`);
    start = current;
    previous = current;
  }
  return ranges.join(',');
};

const toReprintScope = (scope: ReprintSelection['scope']) => {
  const scopes: Record<ReprintSelection['scope'], FoliationReprintScope> = {
    LEVEL: FoliationReprintScope.LEVEL,
    TASK: FoliationReprintScope.TASK,
    FILE: FoliationReprintScope.FILE,
    PAGE: FoliationReprintScope.PAGE,
  };
  return scopes[scope];
};

class ExpedienteFoliationService {
  static async generate(input: GenerateInput) {
    const { actorId, rootId, rootType, position, marginX, marginY } = input;
    const rootName = await getRootName(rootId, rootType);
    const sourceDir = `download/${randomUUID()}`;
    const pathIndex = new Map();

    await DownloadServices.mergePdfLevel(
      rootId,
      rootType,
      {
        sourceDir,
        createFiles: true,
        createCover: true,
        type: 'UPLOADS',
        reviewFiles: true,
      },
      pathIndex
    );
    const paths = DownloadServices.collectMergedPaths(sourceDir);
    if (!paths.length) {
      await removeComposerPath(sourceDir);
      throw new AppError(
        'No se encontraron archivos PDF para generar el expediente.',
        404,
        'EXPEDIENTE_EMPTY'
      );
    }

    const stampEntries = await FoliationServices.applyFoliation(paths, {
      position,
      marginX,
      marginY,
    });
    const workDir = await createComposerWorkDir();

    try {
      const mergedPath = `${workDir}/expediente.pdf`;
      await runQpdf(
        ['--empty', '--pages', ...paths, '--', mergedPath],
        EXPEDIENTE_QPDF_TIMEOUT_MS
      );
      await validatePdfWithQpdf(mergedPath, EXPEDIENTE_QPDF_TIMEOUT_MS);
      const pageCount = await getPdfPageCount(
        mergedPath,
        EXPEDIENTE_QPDF_TIMEOUT_MS
      );
      if (pageCount !== stampEntries.length) {
        throw new AppError(
          'El expediente generado no conserva la paginación esperada.',
          422,
          'EXPEDIENTE_GENERATION_FAILED'
        );
      }

      const pageEntries = stampEntries.map(({ sourcePath, ...entry }) => ({
        ...entry,
        ...(pathIndex.get(basenameFromPath(sourcePath)) ?? {}),
      }));
      const artifactId = randomUUID();
      const { storageKey } = await persistArtifactFile(
        mergedPath,
        actorId,
        artifactId
      );
      const absolutePath = getArtifactAbsolutePath(storageKey);
      const [sizeBytes, fileBuffer] = await Promise.all([
        readArtifactSize(absolutePath),
        readFile(absolutePath),
      ]);
      const sha256 = createHash('sha256').update(fileBuffer).digest('hex');
      const previous = await prisma.expedienteFoliation.findUnique({
        where: { rootId_rootType: { rootId, rootType } },
        include: { artifact: true },
      });
      const { artifact, foliation } = await prisma.$transaction(async tx => {
        if (previous) {
          await tx.expedienteFoliation.delete({ where: { id: previous.id } });
        }
        const artifact = await tx.documentArtifact.create({
          data: {
            id: artifactId,
            ownerId: actorId,
            type: DocumentArtifactType.COMPOSED_PDF,
            status: DocumentArtifactStatus.PUBLISHED,
            safeName: sanitizePdfName(`Expediente ${rootName}`),
            storageKey,
            mimeType: 'application/pdf',
            sizeBytes,
            pageCount,
            sha256,
          },
        });
        const foliation = await tx.expedienteFoliation.create({
          data: {
            rootId,
            rootType,
            artifactId: artifact.id,
            totalPages: pageCount,
            position,
            marginX,
            marginY,
            pageEntries: pageEntries as Prisma.InputJsonValue,
            generatedById: actorId,
          },
        });
        return { artifact, foliation };
      });

      if (previous) {
        await removeComposerPath(getArtifactAbsolutePath(previous.artifact.storageKey));
        await removeArtifactThumbnailCache(previous.artifact);
        await prisma.documentArtifact.delete({ where: { id: previous.artifact.id } });
      }

      return {
        rootId,
        rootType,
        artifactId: artifact.id,
        totalPages: foliation.totalPages,
        position: foliation.position,
        marginX: foliation.marginX,
        marginY: foliation.marginY,
        generatedAt: foliation.generatedAt,
        downloadUrl: buildDownloadUrl(rootType, rootId),
      };
    } finally {
      await removeComposerPath(workDir);
      await removeComposerPath(sourceDir);
    }
  }

  static async getStatus(rootId: number, rootType: ExpedienteRootType) {
    const foliation = await prisma.expedienteFoliation.findUnique({
      where: { rootId_rootType: { rootId, rootType } },
      include: { generatedBy: { include: { profile: true } } },
    });
    if (!foliation) return { exists: false };

    return {
      exists: true,
      rootId,
      rootType,
      artifactId: foliation.artifactId,
      totalPages: foliation.totalPages,
      position: foliation.position,
      marginX: foliation.marginX,
      marginY: foliation.marginY,
      generatedAt: foliation.generatedAt,
      generatedBy: {
        id: foliation.generatedBy.id,
        firstName: foliation.generatedBy.profile?.firstName ?? null,
        lastName: foliation.generatedBy.profile?.lastName ?? null,
      },
      pageEntries: parsePageEntries(foliation.pageEntries),
      downloadUrl: buildDownloadUrl(rootType, rootId),
    };
  }

  static async getDownload(rootId: number, rootType: ExpedienteRootType) {
    const foliation = await prisma.expedienteFoliation.findUnique({
      where: { rootId_rootType: { rootId, rootType } },
      include: { artifact: true },
    });
    if (!foliation) {
      throw new AppError(
        'Aún no se generó el expediente completo.',
        404,
        'EXPEDIENTE_FOLIATION_NOT_FOUND'
      );
    }
    return {
      absolutePath: getArtifactAbsolutePath(foliation.artifact.storageKey),
      fileName: foliation.artifact.safeName,
    };
  }

  static async reprint({
    actorId,
    rootId,
    rootType,
    selection,
  }: {
    actorId: number;
    rootId: number;
    rootType: ExpedienteRootType;
    selection: ReprintSelection;
  }) {
    const foliation = await prisma.expedienteFoliation.findUnique({
      where: { rootId_rootType: { rootId, rootType } },
      include: { artifact: true },
    });
    if (!foliation) {
      throw new AppError(
        'Aún no se generó el expediente completo.',
        404,
        'EXPEDIENTE_FOLIATION_NOT_FOUND'
      );
    }

    const matched = await filterEntriesByScope(
      parsePageEntries(foliation.pageEntries),
      selection
    );
    if (!matched.length) {
      throw new AppError(
        'No se encontraron páginas para esa selección.',
        404,
        'EXPEDIENTE_REPRINT_EMPTY'
      );
    }

    const folioRange = buildFolioRange(matched);
    const scopeLabel = await buildScopeLabel(selection);
    const workDir = await createComposerWorkDir();
    try {
      const outputPath = `${workDir}/reimpresion.pdf`;
      await runQpdf([
        '--empty',
        '--pages',
        getArtifactAbsolutePath(foliation.artifact.storageKey),
        toQpdfPageRange(matched.map(entry => entry.pageNumber)),
        '--',
        outputPath,
      ]);
      await validatePdfWithQpdf(outputPath);
      await prisma.foliationReprintLog.create({
        data: {
          rootId,
          rootType,
          scope: toReprintScope(selection.scope),
          scopeLabel,
          folioRange,
          pageCount: matched.length,
          requestedById: actorId,
        },
      });
      return {
        buffer: await readFile(outputPath),
        fileName: sanitizePdfName(`Reimpresion ${scopeLabel} ${folioRange}`),
      };
    } finally {
      await removeComposerPath(workDir);
    }
  }
}

export default ExpedienteFoliationService;

import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import type { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import TaskDocumentOfficePolicy from '@/modules/task-documents/taskDocumentOffice.policy';
import {
  assertDesktopDocumentBuffer,
  assertDesktopFileExtensionMatches,
  assertDesktopFileNameAllowed,
  createDesktopLaunchTicket,
  DESKTOP_LAUNCH_TICKET_TTL_MS,
  desktopTaskKindForSource,
  normalizeDesktopMimeType,
  sanitizeDesktopFileName,
  sha256,
  type DesktopDocumentSourceKind,
} from './desktopDocuments.domain';
import {
  createDesktopDocumentStorageKey,
  default as DesktopDocumentsStorage,
} from './desktopDocuments.storage';

type SourceRecord = {
  id: number;
  name: string;
  originalname: string | null;
  dir: string;
  taskId: number;
};

type VersionResponseInput = {
  id: string;
  versionNumber: number;
  originalName: string;
  mimeType: string;
  sizeBytes: bigint;
  checksumSha256: string;
  source: string;
  createdAt: Date;
};

const versionResponse = (version: VersionResponseInput) => ({
  id: version.id,
  versionNumber: version.versionNumber,
  originalName: version.originalName,
  mimeType: version.mimeType,
  sizeBytes: Number(version.sizeBytes),
  checksumSha256: version.checksumSha256,
  source: version.source,
  createdAt: version.createdAt,
});

class DesktopDocumentsService {
  private static async loadSourceRecord(input: {
    sourceKind: DesktopDocumentSourceKind;
    sourceFileId: number;
  }): Promise<SourceRecord> {
    const source =
      input.sourceKind === 'TASK_FILE'
        ? await prisma.files.findUnique({
            where: { id: input.sourceFileId },
            select: {
              id: true,
              name: true,
              originalname: true,
              dir: true,
              subTasksId: true,
            },
          })
        : await prisma.basicFiles.findUnique({
            where: { id: input.sourceFileId },
            select: {
              id: true,
              name: true,
              originalname: true,
              dir: true,
              subTasksId: true,
            },
          });

    if (!source || !source.dir) {
      throw new AppError(
        'El archivo no está disponible para Dhyrium Desktop.',
        404,
        'DESKTOP_DOCUMENT_SOURCE_NOT_FOUND'
      );
    }
    const originalName = sanitizeDesktopFileName(
      source.originalname || source.name
    );
    assertDesktopFileNameAllowed(originalName);
    return {
      id: source.id,
      name: source.name,
      originalname: source.originalname,
      dir: source.dir,
      taskId: source.subTasksId,
    };
  }

  private static async assertCanAccessSource(input: {
    user: UserType;
    sourceKind: DesktopDocumentSourceKind;
    source: SourceRecord;
  }) {
    await TaskDocumentOfficePolicy.assertCanEdit(
      input.user,
      desktopTaskKindForSource(input.sourceKind),
      input.source.taskId
    );
  }

  private static async findDocumentBySource(input: {
    sourceKind: DesktopDocumentSourceKind;
    sourceFileId: number;
  }) {
    return input.sourceKind === 'TASK_FILE'
      ? prisma.desktopDocument.findUnique({
          where: { sourceFileId: input.sourceFileId },
          include: {
            versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
          },
        })
      : prisma.desktopDocument.findUnique({
          where: { sourceBasicFileId: input.sourceFileId },
          include: {
            versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
          },
        });
  }

  private static async ensureInitialVersion(input: {
    sourceKind: DesktopDocumentSourceKind;
    source: SourceRecord;
    userId: number;
  }) {
    const existing = await this.findDocumentBySource({
      sourceKind: input.sourceKind,
      sourceFileId: input.source.id,
    });
    if (existing) {
      const latestVersion = existing.versions[0];
      if (!latestVersion || existing.sourceKind !== input.sourceKind) {
        throw new AppError(
          'El historial del archivo tiene una identidad inválida.',
          500,
          'DESKTOP_DOCUMENT_SOURCE_IDENTITY_INVALID'
        );
      }
      return { document: existing, version: latestVersion };
    }

    const originalName = sanitizeDesktopFileName(
      input.source.originalname || input.source.name
    );
    const extension = assertDesktopFileNameAllowed(originalName);
    const buffer = await DesktopDocumentsStorage.readSource(
      input.source.dir,
      input.source.name
    );
    const documentId = randomUUID();
    const versionId = randomUUID();
    const storageKey = createDesktopDocumentStorageKey(documentId, versionId);
    const checksumSha256 = sha256(buffer);
    await DesktopDocumentsStorage.writeImmutable(storageKey, buffer);

    try {
      const document = await prisma.desktopDocument.create({
        data: {
          id: documentId,
          sourceKind: input.sourceKind,
          sourceFileId:
            input.sourceKind === 'TASK_FILE' ? input.source.id : null,
          sourceBasicFileId:
            input.sourceKind === 'BASIC_FILE' ? input.source.id : null,
          originalName,
          extension,
          currentVersionNumber: 1,
          createdById: input.userId,
          updatedById: input.userId,
          versions: {
            create: {
              id: versionId,
              versionNumber: 1,
              storageKey,
              originalName,
              mimeType: 'application/octet-stream',
              sizeBytes: BigInt(buffer.length),
              checksumSha256,
              source: 'ORIGINAL_IMPORT',
              createdById: input.userId,
            },
          },
        },
        include: {
          versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        },
      });
      return { document, version: document.versions[0] };
    } catch (error) {
      await DesktopDocumentsStorage.remove(storageKey);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrent = await this.findDocumentBySource({
          sourceKind: input.sourceKind,
          sourceFileId: input.source.id,
        });
        const version = concurrent?.versions[0];
        if (
          concurrent &&
          version &&
          concurrent.sourceKind === input.sourceKind
        ) {
          return { document: concurrent, version };
        }
      }
      throw error;
    }
  }

  private static async createLaunchTicket(input: {
    userId: number;
    documentId: string;
    versionId: string;
  }) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const ticket = createDesktopLaunchTicket();
      const expiresAt = new Date(Date.now() + DESKTOP_LAUNCH_TICKET_TTL_MS);
      try {
        await prisma.desktopDocumentLaunchTicket.create({
          data: {
            tokenHash: sha256(ticket),
            userId: input.userId,
            documentId: input.documentId,
            versionId: input.versionId,
            expiresAt,
          },
        });
        return { ticket, expiresAt };
      } catch (error) {
        if (
          !(
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002' &&
            attempt === 0
          )
        ) {
          throw error;
        }
      }
    }
    throw new AppError(
      'No se pudo preparar la apertura del archivo.',
      500,
      'DESKTOP_DOCUMENT_LAUNCH_TICKET_CREATE_FAILED'
    );
  }

  static async createLaunch(input: {
    sourceKind: DesktopDocumentSourceKind;
    sourceFileId: number;
    user: UserType;
  }) {
    const source = await this.loadSourceRecord(input);
    await this.assertCanAccessSource({
      user: input.user,
      sourceKind: input.sourceKind,
      source,
    });
    const canonical = await this.ensureInitialVersion({
      sourceKind: input.sourceKind,
      source,
      userId: input.user.id,
    });
    const launch = await this.createLaunchTicket({
      userId: input.user.id,
      documentId: canonical.document.id,
      versionId: canonical.version.id,
    });
    return {
      protocolUrl: `dhyrium://open/document?ticket=${launch.ticket}`,
      expiresAt: launch.expiresAt,
      document: {
        id: canonical.document.id,
        originalName: canonical.document.originalName,
        version: versionResponse(canonical.version),
      },
    };
  }

  private static async loadAccessibleDocument(documentId: string, user: UserType) {
    const document = await prisma.desktopDocument.findUnique({
      where: { id: documentId },
      include: {
        sourceFile: {
          select: { id: true, subTasksId: true, name: true, dir: true },
        },
        sourceBasicFile: {
          select: { id: true, subTasksId: true, name: true, dir: true },
        },
      },
    });
    if (!document) {
      throw new AppError(
        'El archivo administrado no existe.',
        404,
        'DESKTOP_DOCUMENT_NOT_FOUND'
      );
    }
    const source =
      document.sourceKind === 'TASK_FILE'
        ? document.sourceFile
        : document.sourceBasicFile;
    if (!source) {
      throw new AppError(
        'El archivo administrado ya no tiene una fuente válida.',
        404,
        'DESKTOP_DOCUMENT_SOURCE_NOT_FOUND'
      );
    }
    if (!source.dir) {
      throw new AppError(
        'El archivo adjunto ya no tiene una ubicación válida para guardar.',
        404,
        'DESKTOP_DOCUMENT_SOURCE_MISSING'
      );
    }
    await TaskDocumentOfficePolicy.assertCanEdit(
      user,
      desktopTaskKindForSource(document.sourceKind),
      source.subTasksId
    );
    return document;
  }

  static async redeemLaunch(input: { ticket: string; user: UserType }) {
    const now = new Date();
    const ticket = await prisma.desktopDocumentLaunchTicket.findFirst({
      where: {
        tokenHash: sha256(input.ticket),
        userId: input.user.id,
        redeemedAt: null,
        expiresAt: { gt: now },
      },
      select: { id: true, documentId: true, versionId: true },
    });
    if (!ticket) {
      throw new AppError(
        'El enlace de apertura venció, ya fue usado o no pertenece a su sesión.',
        404,
        'DESKTOP_DOCUMENT_LAUNCH_INVALID'
      );
    }
    const redeemed = await prisma.desktopDocumentLaunchTicket.updateMany({
      where: {
        id: ticket.id,
        userId: input.user.id,
        redeemedAt: null,
        expiresAt: { gt: now },
      },
      data: { redeemedAt: now },
    });
    if (redeemed.count !== 1) {
      throw new AppError(
        'El enlace de apertura ya no está disponible.',
        409,
        'DESKTOP_DOCUMENT_LAUNCH_REDEEMED'
      );
    }
    const document = await this.loadAccessibleDocument(ticket.documentId, input.user);
    const version = await prisma.desktopDocumentVersion.findFirst({
      where: { id: ticket.versionId, documentId: document.id },
    });
    if (!version) {
      throw new AppError(
        'La versión solicitada ya no existe.',
        404,
        'DESKTOP_DOCUMENT_VERSION_NOT_FOUND'
      );
    }
    return {
      document: {
        id: document.id,
        originalName: document.originalName,
        extension: document.extension,
        currentVersionNumber: document.currentVersionNumber,
      },
      version: versionResponse(version),
      contentPath: `/desktop/documents/${document.id}/versions/${version.id}/content`,
      savePath: `/desktop/documents/${document.id}/versions`,
    };
  }

  static async downloadVersion(input: {
    documentId: string;
    versionId: string;
    user: UserType;
  }) {
    const document = await this.loadAccessibleDocument(
      input.documentId,
      input.user
    );
    const version = await prisma.desktopDocumentVersion.findFirst({
      where: { id: input.versionId, documentId: document.id },
    });
    if (!version) {
      throw new AppError(
        'La versión solicitada no existe.',
        404,
        'DESKTOP_DOCUMENT_VERSION_NOT_FOUND'
      );
    }
    const buffer = await DesktopDocumentsStorage.read(version.storageKey);
    return { document, version, buffer };
  }

  static async saveVersion(input: {
    documentId: string;
    baseVersionId: string;
    file: Express.Multer.File;
    user: UserType;
  }) {
    const document = await this.loadAccessibleDocument(
      input.documentId,
      input.user
    );
    const source =
      document.sourceKind === 'TASK_FILE'
        ? document.sourceFile
        : document.sourceBasicFile;
    if (!source?.dir) {
      throw new AppError(
        'El archivo adjunto ya no tiene una ubicación válida para guardar.',
        404,
        'DESKTOP_DOCUMENT_SOURCE_MISSING'
      );
    }
    const sourceDirectory = source.dir;
    assertDesktopFileExtensionMatches({
      documentName: document.originalName,
      uploadedName: input.file.originalname,
    });
    assertDesktopDocumentBuffer(input.file.buffer);

    const baseVersion = await prisma.desktopDocumentVersion.findFirst({
      where: { id: input.baseVersionId, documentId: document.id },
    });
    if (!baseVersion) {
      throw new AppError(
        'La versión base no pertenece a este archivo.',
        422,
        'DESKTOP_DOCUMENT_BASE_VERSION_INVALID'
      );
    }
    if (document.currentVersionNumber !== baseVersion.versionNumber) {
      throw new AppError(
        'El archivo cambió mientras estaba abierto. Actualícelo antes de guardar.',
        409,
        'DESKTOP_DOCUMENT_VERSION_CONFLICT'
      );
    }

    const checksumSha256 = sha256(input.file.buffer);
    if (checksumSha256 === baseVersion.checksumSha256) {
      return versionResponse(baseVersion);
    }

    const versionId = randomUUID();
    const storageKey = createDesktopDocumentStorageKey(document.id, versionId);
    await DesktopDocumentsStorage.writeImmutable(storageKey, input.file.buffer);
    try {
      const version = await prisma.$transaction(async transaction => {
        const updated = await transaction.desktopDocument.updateMany({
          where: {
            id: document.id,
            currentVersionNumber: baseVersion.versionNumber,
          },
          data: {
            currentVersionNumber: baseVersion.versionNumber + 1,
            updatedById: input.user.id,
          },
        });
        if (updated.count !== 1) {
          throw new AppError(
            'El archivo cambió mientras estaba abierto. Actualícelo antes de guardar.',
            409,
            'DESKTOP_DOCUMENT_VERSION_CONFLICT'
          );
        }
        const createdVersion = await transaction.desktopDocumentVersion.create({
          data: {
            id: versionId,
            documentId: document.id,
            versionNumber: baseVersion.versionNumber + 1,
            storageKey,
            originalName: document.originalName,
            mimeType: normalizeDesktopMimeType(input.file.mimetype),
            sizeBytes: BigInt(input.file.buffer.length),
            checksumSha256,
            source: 'DESKTOP_SAVE',
            createdById: input.user.id,
          },
        });
        await DesktopDocumentsStorage.replaceSource(
          sourceDirectory,
          source.name,
          input.file.buffer
        );
        return createdVersion;
      });
      return versionResponse(version);
    } catch (error) {
      await DesktopDocumentsStorage.remove(storageKey);
      throw error;
    }
  }
}

export default DesktopDocumentsService;

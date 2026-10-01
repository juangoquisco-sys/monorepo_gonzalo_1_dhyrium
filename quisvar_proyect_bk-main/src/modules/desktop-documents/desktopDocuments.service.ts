import {
  queueDesktopPublication,
  publishDesktopSource,
  removeDesktopPublication,
} from './desktopDocuments.publication';
import { randomUUID } from 'crypto';
import { rm } from 'fs/promises';
import {
  desktopTransfers,
  type DesktopTransfer,
} from './desktopDocuments.transfers';
import { Prisma } from '@prisma/client';
import type { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import TaskDocumentOfficePolicy from '@/modules/task-documents/taskDocumentOffice.policy';
import {
  assertDesktopDocumentSize,
  assertDesktopFileExtensionMatches,
  assertDesktopFileNameAllowed,
  createDesktopLaunchTicket,
  DESKTOP_LAUNCH_TICKET_TTL_MS,
  DESKTOP_LOCK_LEASE_MS,
  MAX_DESKTOP_DOCUMENT_BYTES,
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
  static async createTransfer(
    input: Parameters<typeof desktopTransfers.create>[0],
    documentId: string,
    user: UserType
  ) {
    await this.authorizeTransfer(documentId, user, input.originalName);
    return prisma.$transaction(async tx => {
      const quotaKey = `desktop-transfer-user-${user.id}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${quotaKey}, 0))`;
      return desktopTransfers.create(input, documentId, user.id);
    });
  }
  static async authorizeTransfer(
    documentId: string,
    user: UserType,
    originalName?: string
  ) {
    const document = await this.loadAccessibleDocument(documentId, user);
    if (originalName)
      assertDesktopFileExtensionMatches({
        documentName: document.originalName,
        uploadedName: originalName,
      });
    return document;
  }

  static async completeTransfer(transfer: DesktopTransfer, user: UserType) {
    return desktopTransfers.withLease(transfer, async () => {
      return this.completeLeasedTransfer(transfer, user);
    });
  }

  private static async completeLeasedTransfer(
    transfer: DesktopTransfer,
    user: UserType
  ) {
    await this.authorizeTransfer(transfer.documentId, user, transfer.originalName);
    // A lost success response must not turn a completed upload into a conflict.
    const latest = await prisma.desktopDocumentVersion.findFirst({
      where: { documentId: transfer.documentId },
      orderBy: { versionNumber: 'desc' },
    });
    const base = await prisma.desktopDocumentVersion.findFirst({
      where: { id: transfer.baseVersionId, documentId: transfer.documentId },
    });
    if (
      latest &&
      base &&
      latest.createdById === user.id &&
      latest.checksumSha256 === transfer.checksumSha256 &&
      (latest.id === base.id || latest.versionNumber === base.versionNumber + 1)
    )
      return versionResponse(latest);
    if (!base)
      throw new AppError(
        'La versión base no pertenece al archivo.',
        422,
        'DESKTOP_DOCUMENT_BASE_VERSION_INVALID'
      );
    if (latest?.id !== base.id)
      throw new AppError(
        'Otra persona actualizó el archivo. La entrega local se conserva; abra la versión actual antes de continuar.',
        409,
        'DESKTOP_DOCUMENT_VERSION_CONFLICT'
      );
    const assembled = await desktopTransfers.assemble(transfer);
    try {
      return await this.saveVersion({
        documentId: transfer.documentId,
        baseVersionId: transfer.baseVersionId,
        user,
        file: {
          path: assembled,
          size: transfer.sizeBytes,
          originalname: transfer.originalName,
          mimetype: 'application/octet-stream',
        } as Express.Multer.File,
      });
    } finally {
      await rm(assembled, { force: true });
    }
  }
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
    const sourcePath = await DesktopDocumentsStorage.resolveSourcePath(
      input.source.dir,
      input.source.name
    );
    const documentId = randomUUID();
    const versionId = randomUUID();
    const storageKey = createDesktopDocumentStorageKey(documentId, versionId);
    const { checksumSha256, sizeBytes } =
      await DesktopDocumentsStorage.importFile(storageKey, sourcePath);
    const importPublication = await queueDesktopPublication(
      documentId,
      versionId
    );

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
              sizeBytes: BigInt(sizeBytes),
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
      await removeDesktopPublication(importPublication);
      return { document, version: document.versions[0] };
    } catch (error) {
      // A connection failure can hide a successful commit. Leave the immutable
      // bytes and journal intact until maintenance can establish the DB outcome.
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

  static async loadAccessibleDocument(documentId: string, user: UserType) {
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

  private static lockHolderName(
    holder: { profile: { firstName: string; lastName: string } | null } | null
  ) {
    if (!holder?.profile) return 'otro usuario';
    return `${holder.profile.firstName} ${holder.profile.lastName}`.trim();
  }

  // Takes the edit lock when it is free, expired or already ours; otherwise
  // reports who holds it so the caller can be opened read-only.
  private static async acquireOrRenewLock(documentId: string, user: UserType) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DESKTOP_LOCK_LEASE_MS);
    const acquired = await prisma.desktopDocument.updateMany({
      where: {
        id: documentId,
        OR: [
          { lockedById: user.id },
          { lockedById: null },
          { lockExpiresAt: { lt: now } },
        ],
      },
      data: { lockedById: user.id, lockedAt: now, lockExpiresAt: expiresAt },
    });
    if (acquired.count === 1) return { readOnly: false, lockedByName: null };
    const document = await prisma.desktopDocument.findUnique({
      where: { id: documentId },
      select: {
        lockedBy: { select: { profile: { select: { firstName: true, lastName: true } } } },
      },
    });
    return {
      readOnly: true,
      lockedByName: this.lockHolderName(document?.lockedBy ?? null),
    };
  }

  static async heartbeatLock(documentId: string, user: UserType) {
    await this.loadAccessibleDocument(documentId, user);
    const now = new Date();
    const renewed = await prisma.desktopDocument.updateMany({
      where: { id: documentId, lockedById: user.id },
      data: { lockExpiresAt: new Date(now.getTime() + DESKTOP_LOCK_LEASE_MS) },
    });
    if (renewed.count !== 1) {
      throw new AppError(
        'Su bloqueo de edición expiró porque otra persona ya abrió este archivo. Vuelva a abrirlo desde la web.',
        409,
        'DESKTOP_DOCUMENT_LOCK_LOST'
      );
    }
  }

  static async releaseLock(documentId: string, user: UserType) {
    await prisma.desktopDocument.updateMany({
      where: { id: documentId, lockedById: user.id },
      data: { lockedById: null, lockedAt: null, lockExpiresAt: null },
    });
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
    const document = await this.loadAccessibleDocument(
      ticket.documentId,
      input.user
    );
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
    const lock = await this.acquireOrRenewLock(document.id, input.user);
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
      transferPath: `/desktop/documents/${document.id}/transfers`,
      maxFileBytes: MAX_DESKTOP_DOCUMENT_BYTES,
      readOnly: lock.readOnly,
      lockedByName: lock.lockedByName,
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
    const contentPath = await DesktopDocumentsStorage.contentPath(
      version.storageKey
    );
    return { document, version, contentPath };
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
    assertDesktopFileExtensionMatches({
      documentName: document.originalName,
      uploadedName: input.file.originalname,
    });
    assertDesktopDocumentSize(input.file.size);
    if (
      document.lockedById !== null &&
      document.lockedById !== input.user.id &&
      document.lockExpiresAt !== null &&
      document.lockExpiresAt > new Date()
    ) {
      throw new AppError(
        'Otra persona tiene este archivo abierto para editar. Sus cambios no se pueden guardar.',
        409,
        'DESKTOP_DOCUMENT_LOCKED'
      );
    }

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

    const versionId = randomUUID();
    const storageKey = createDesktopDocumentStorageKey(document.id, versionId);
    const { checksumSha256, sizeBytes } =
      await DesktopDocumentsStorage.importFile(storageKey, input.file.path);
    if (checksumSha256 === baseVersion.checksumSha256) {
      await DesktopDocumentsStorage.remove(storageKey);
      return versionResponse(baseVersion);
    }
    const publication = await queueDesktopPublication(document.id, versionId);
    const version = await prisma.$transaction(
      async transaction => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${document.id}, 0))`;
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
            sizeBytes: BigInt(sizeBytes),
            checksumSha256,
            source: 'DESKTOP_SAVE',
            createdById: input.user.id,
          },
        });
        return createdVersion;
      },
      { timeout: 15_000, maxWait: 120_000 }
    );
    const published = await publishDesktopSource(publication).catch(
      () => false
    );
    return {
      ...versionResponse(version),
      sourcePublicationPending: !published,
    };
    // On an uncertain commit response, maintenance retains/repairs the journal.
  }
}

export default DesktopDocumentsService;

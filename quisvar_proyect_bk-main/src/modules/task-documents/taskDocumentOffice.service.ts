import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import { ENV } from '@/config/env';
import type { UserType } from '@/middlewares/auth.middleware';
import type { TaskDocumentKind } from './taskDocuments.schema';
import TaskDocumentOfficePolicy from './taskDocumentOffice.policy';
import { hasProjectWriteRole } from './taskDocumentOffice.policy.domain';
import TaskDocumentOfficeStorage, {
  createStorageKey,
} from './taskDocumentOffice.storage';
import {
  DOCX_MIME_TYPE,
  assertOfficeEntityTag,
  assertOfficeLockToken,
  assertOfficeSingleLockToken,
  assertDocxBuffer,
  canAutoReleaseOfficeSession,
  createOpaqueToken,
  deriveOfficeSessionPhase,
  isActiveSessionStatus,
  matchesTaskDocumentSource,
  nextOfficeSessionExpiry,
  officeSessionHardExpiry,
  readOfficeLockToken,
  sanitizeOfficeFileName,
  sha256,
  toOfficeLockToken,
  toOfficeDocumentKey,
  type TaskDocumentOfficeActivity,
} from './taskDocumentOffice.domain';

const EMPTY_DOCUMENT = { type: 'doc', content: [{ type: 'paragraph' }] };
const OFFICE_ROUTE = '/task-documents/office-edit';

type OfficeProvider = 'WORD_DESKTOP';

const withoutTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const asBaseUrl = (value: string | undefined, label: string) => {
  if (!value) {
    throw new AppError(
      `${label} no está configurada.`,
      503,
      'TASK_DOCUMENT_PROVIDER_NOT_CONFIGURED'
    );
  }
  const url = new URL(value);
  if (
    url.protocol !== 'https:' &&
    !(ENV.NODE_ENV !== 'production' && ENV.TASK_DOCUMENT_ALLOW_INSECURE_HTTP)
  ) {
    throw new AppError(
      `${label} debe usar HTTPS. HTTP solo puede habilitarse explícitamente en desarrollo.`,
      503,
      'TASK_DOCUMENT_HTTPS_REQUIRED'
    );
  }
  return withoutTrailingSlash(url.toString());
};

const versionResponse = (version: {
  id: string;
  versionNumber: number;
  originalName: string;
  mimeType: string;
  sizeBytes: bigint;
  checksumSha256: string;
  source: string;
  createdAt: Date;
  createdBy?: {
    id: number;
    profile: { firstName: string; lastName: string } | null;
  };
}) => ({
  id: version.id,
  versionNumber: version.versionNumber,
  originalName: version.originalName,
  mimeType: version.mimeType,
  sizeBytes: Number(version.sizeBytes),
  checksumSha256: version.checksumSha256,
  source: version.source,
  createdAt: version.createdAt,
  createdBy: version.createdBy
    ? {
        id: version.createdBy.id,
        name: version.createdBy.profile
          ? `${version.createdBy.profile.firstName} ${version.createdBy.profile.lastName}`.trim()
          : 'Usuario Dhyrium',
      }
    : undefined,
});

const taskWhere = (taskKind: TaskDocumentKind, taskId: number) =>
  taskKind === 'subtasks' ? { subTaskId: taskId } : { basicTaskId: taskId };

const taskReference = (taskKind: TaskDocumentKind, taskId: number) =>
  taskKind === 'subtasks'
    ? { subTaskId: taskId, basicTaskId: null }
    : { subTaskId: null, basicTaskId: taskId };

class TaskDocumentOfficeService {
  private static assertProviderAvailable(_provider: OfficeProvider) {
    asBaseUrl(
      ENV.TASK_DOCUMENT_EXTERNAL_BASE_URL,
      'La URL pública de documentos'
    );
  }

  static capabilities() {
    const insecureAllowed =
      ENV.NODE_ENV !== 'production' && ENV.TASK_DOCUMENT_ALLOW_INSECURE_HTTP;
    const validUrl = (value?: string) => {
      if (!value) return false;
      try {
        const url = new URL(value);
        return url.protocol === 'https:' || insecureAllowed;
      } catch {
        return false;
      }
    };
    return {
      canonicalFormat: 'DOCX',
      wordDesktop: {
        available: validUrl(ENV.TASK_DOCUMENT_EXTERNAL_BASE_URL),
        secureTransport: ENV.TASK_DOCUMENT_EXTERNAL_BASE_URL
          ? new URL(ENV.TASK_DOCUMENT_EXTERNAL_BASE_URL).protocol === 'https:'
          : false,
      },
    };
  }

  private static maximumSessionMinutes() {
    return Math.max(
      ENV.TASK_DOCUMENT_SESSION_TTL_MINUTES,
      ENV.TASK_DOCUMENT_SESSION_MAX_TTL_MINUTES
    );
  }

  private static hardExpiresAt(createdAt: Date) {
    return officeSessionHardExpiry(createdAt, this.maximumSessionMinutes());
  }

  private static activityFromMetadata(
    metadata: Prisma.JsonValue
  ): TaskDocumentOfficeActivity | null {
    if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') {
      return null;
    }
    const activity = (metadata as { activity?: unknown }).activity;
    return typeof activity === 'string'
      ? (activity as TaskDocumentOfficeActivity)
      : null;
  }

  private static lockExpiryFromMetadata(metadata: Prisma.JsonValue) {
    if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') {
      return null;
    }
    const value = (metadata as { lockExpiresAt?: unknown }).lockExpiresAt;
    if (typeof value !== 'string') return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private static async lifecycleFor(session: {
    id: string;
    status: string;
    createdAt: Date;
    lastHeartbeatAt: Date;
    expiresAt: Date;
    currentVersion: {
      id: string;
      versionNumber: number;
      checksumSha256: string;
      createdAt: Date;
    };
  }) {
    const [heartbeat, savedEvent, lockHeartbeat] = await Promise.all([
      prisma.taskDocumentEvent.findFirst({
        where: { sessionId: session.id, action: 'SESSION_HEARTBEAT' },
        orderBy: { createdAt: 'desc' },
        select: { metadata: true },
      }),
      prisma.taskDocumentEvent.findFirst({
        where: { sessionId: session.id, action: 'VERSION_SAVED' },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      }),
      prisma.taskDocumentEvent.findFirst({
        where: {
          sessionId: session.id,
          action: 'SESSION_HEARTBEAT',
          OR: [
            {
              metadata: {
                path: ['activity'],
                equals: 'LOCK_ACQUIRED',
              },
            },
            {
              metadata: {
                path: ['activity'],
                equals: 'LOCK_REFRESH',
              },
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
        select: { metadata: true },
      }),
    ]);
    const lastActivity = heartbeat
      ? this.activityFromMetadata(heartbeat.metadata)
      : null;
    const lockExpiresAt = lockHeartbeat
      ? this.lockExpiryFromMetadata(lockHeartbeat.metadata)
      : null;
    const lockActive =
      isActiveSessionStatus(session.status) &&
      Boolean(lockExpiresAt && lockExpiresAt > new Date());
    const phase = deriveOfficeSessionPhase(
      session.status,
      lastActivity,
      lockActive
    );
    return {
      phase,
      lastActivity,
      lastHeartbeatAt: session.lastHeartbeatAt,
      expiresAt: session.expiresAt,
      hardExpiresAt: this.hardExpiresAt(session.createdAt),
      lockActive,
      lockExpiresAt,
      versionReceipt: savedEvent
        ? {
            id: session.currentVersion.id,
            versionNumber: session.currentVersion.versionNumber,
            checksumSha256: session.currentVersion.checksumSha256,
            createdAt: session.currentVersion.createdAt,
          }
        : null,
    };
  }

  private static async getOrCreateDocument(input: {
    taskKind: TaskDocumentKind;
    taskId: number;
    userId: number;
    title: string;
  }) {
    const existing = await prisma.taskDocument.findFirst({
      where: taskWhere(input.taskKind, input.taskId),
    });
    if (existing) return existing;

    try {
      return await prisma.taskDocument.create({
        data: {
          ...taskReference(input.taskKind, input.taskId),
          title: input.title,
          contentJson: EMPTY_DOCUMENT,
          contentHtml: '',
          plainText: '',
          createdById: input.userId,
          updatedById: input.userId,
          versions: {
            create: {
              versionNumber: 1,
              title: input.title,
              contentJson: EMPTY_DOCUMENT,
              contentHtml: '',
              plainText: '',
              createdById: input.userId,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return prisma.taskDocument.findFirstOrThrow({
          where: taskWhere(input.taskKind, input.taskId),
        });
      }
      throw error;
    }
  }

  private static async loadSourceRecord(input: {
    taskKind: TaskDocumentKind;
    taskId: number;
    sourceFileId: number;
  }) {
    const source =
      input.taskKind === 'subtasks'
        ? await prisma.files.findFirst({
            where: { id: input.sourceFileId, subTasksId: input.taskId },
            select: {
              id: true,
              name: true,
              originalname: true,
              dir: true,
            },
          })
        : await prisma.basicFiles.findFirst({
            where: { id: input.sourceFileId, subTasksId: input.taskId },
            select: {
              id: true,
              name: true,
              originalname: true,
              dir: true,
            },
          });

    if (!source || !source.dir) {
      throw new AppError(
        'El archivo Word no pertenece a la tarea solicitada.',
        404,
        'TASK_DOCUMENT_SOURCE_NOT_FOUND'
      );
    }
    const originalName = sanitizeOfficeFileName(
      source.originalname || source.name
    );
    if (!/\.docx$/i.test(originalName)) {
      throw new AppError(
        'La primera fase de edición admite únicamente archivos DOCX.',
        415,
        'TASK_DOCUMENT_SOURCE_FORMAT_NOT_SUPPORTED'
      );
    }
    return {
      source: { ...source, dir: source.dir },
      originalName,
    };
  }

  private static async loadSourceFile(input: {
    taskKind: TaskDocumentKind;
    taskId: number;
    sourceFileId: number;
  }) {
    const loaded = await this.loadSourceRecord(input);
    const absolutePath = TaskDocumentOfficeStorage.resolveSourcePath(
      loaded.source.dir,
      loaded.source.name
    );
    let buffer: Buffer;
    try {
      buffer = await readFile(absolutePath);
    } catch {
      throw new AppError(
        'El archivo adjunto ya no está disponible en el almacenamiento.',
        404,
        'TASK_DOCUMENT_SOURCE_MISSING'
      );
    }
    assertDocxBuffer(buffer);
    return { ...loaded, buffer };
  }

  private static async getDocumentSourceBinding(documentId: string) {
    const binding = await prisma.taskDocumentFileVersion.findFirst({
      where: { documentId, source: 'ORIGINAL_IMPORT' },
      orderBy: { versionNumber: 'asc' },
      select: {
        sourceFileId: true,
        sourceBasicFileId: true,
        originalName: true,
      },
    });
    if (!binding) {
      throw new AppError(
        'El historial DOCX no tiene una identidad de origen válida.',
        500,
        'TASK_DOCUMENT_SOURCE_IDENTITY_INVALID'
      );
    }
    const hasFileSource = binding.sourceFileId !== null;
    const hasBasicFileSource = binding.sourceBasicFileId !== null;
    if (hasFileSource === hasBasicFileSource) {
      throw new AppError(
        'El historial DOCX no tiene una identidad de origen válida.',
        500,
        'TASK_DOCUMENT_SOURCE_IDENTITY_INVALID'
      );
    }
    return binding;
  }

  private static async assertDocumentSourceBinding(input: {
    documentId: string;
    taskKind: TaskDocumentKind;
    taskId: number;
    sourceFileId: number;
  }) {
    await this.loadSourceRecord(input);
    const binding = await this.getDocumentSourceBinding(input.documentId);
    if (
      !matchesTaskDocumentSource(input.taskKind, input.sourceFileId, binding)
    ) {
      throw new AppError(
        'Esta tarea ya tiene otro archivo DOCX vinculado al historial documental.',
        409,
        'TASK_DOCUMENT_SOURCE_IDENTITY_CONFLICT'
      );
    }
    return {
      documentId: input.documentId,
      sourceFileId: input.sourceFileId,
    };
  }

  private static async ensureInitialVersion(input: {
    taskKind: TaskDocumentKind;
    taskId: number;
    sourceFileId: number;
    userId: number;
  }) {
    const latestDocument = await prisma.taskDocument.findFirst({
      where: taskWhere(input.taskKind, input.taskId),
      include: {
        fileVersions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    });
    if (latestDocument?.fileVersions[0]) {
      await this.assertDocumentSourceBinding({
        documentId: latestDocument.id,
        taskKind: input.taskKind,
        taskId: input.taskId,
        sourceFileId: input.sourceFileId,
      });
      return {
        document: latestDocument,
        version: latestDocument.fileVersions[0],
      };
    }

    const loaded = await this.loadSourceFile(input);
    const document =
      latestDocument ??
      (await this.getOrCreateDocument({
        taskKind: input.taskKind,
        taskId: input.taskId,
        userId: input.userId,
        title: loaded.originalName,
      }));
    const versionId = randomUUID();
    const storageKey = createStorageKey(document.id, versionId);
    const checksumSha256 = sha256(loaded.buffer);
    await TaskDocumentOfficeStorage.writeImmutable(storageKey, loaded.buffer);

    try {
      const version = await prisma.$transaction(async transaction => {
        const updated = await transaction.taskDocument.updateMany({
          where: { id: document.id, fileVersionNumber: 0 },
          data: { fileVersionNumber: 1 },
        });
        if (updated.count !== 1) {
          throw new AppError(
            'El documento fue importado simultáneamente por otra sesión.',
            409,
            'TASK_DOCUMENT_IMPORT_CONFLICT'
          );
        }
        const created = await transaction.taskDocumentFileVersion.create({
          data: {
            id: versionId,
            documentId: document.id,
            versionNumber: 1,
            sourceFileId:
              input.taskKind === 'subtasks' ? loaded.source.id : null,
            sourceBasicFileId:
              input.taskKind === 'basictasks' ? loaded.source.id : null,
            storageKey,
            originalName: loaded.originalName,
            mimeType: DOCX_MIME_TYPE,
            sizeBytes: BigInt(loaded.buffer.length),
            checksumSha256,
            source: 'ORIGINAL_IMPORT',
            createdById: input.userId,
          },
        });
        await transaction.taskDocumentEvent.create({
          data: {
            documentId: document.id,
            fileVersionId: created.id,
            actorId: input.userId,
            action: 'ORIGINAL_IMPORTED',
            metadata: {
              versionNumber: 1,
              checksumSha256,
              sourceFileId: loaded.source.id,
            },
          },
        });
        return created;
      });
      return { document: { ...document, fileVersionNumber: 1 }, version };
    } catch (error) {
      await TaskDocumentOfficeStorage.remove(storageKey);
      if (
        error instanceof AppError &&
        error.code === 'TASK_DOCUMENT_IMPORT_CONFLICT'
      ) {
        const concurrent = await prisma.taskDocument.findUniqueOrThrow({
          where: { id: document.id },
          include: {
            fileVersions: { orderBy: { versionNumber: 'desc' }, take: 1 },
          },
        });
        const version = concurrent.fileVersions[0];
        if (version) {
          await this.assertDocumentSourceBinding({
            documentId: concurrent.id,
            taskKind: input.taskKind,
            taskId: input.taskId,
            sourceFileId: input.sourceFileId,
          });
          return { document: concurrent, version };
        }
      }
      throw error;
    }
  }

  static async ensureOriginalVersion(input: {
    taskKind: TaskDocumentKind;
    taskId: number;
    sourceFileId: number;
    user: UserType;
  }) {
    await TaskDocumentOfficePolicy.assertCanEdit(
      input.user,
      input.taskKind,
      input.taskId
    );
    const canonical = await this.ensureInitialVersion({
      taskKind: input.taskKind,
      taskId: input.taskId,
      sourceFileId: input.sourceFileId,
      userId: input.user.id,
    });
    const original = await prisma.taskDocumentFileVersion.findFirstOrThrow({
      where: {
        documentId: canonical.document.id,
        source: 'ORIGINAL_IMPORT',
      },
      orderBy: { versionNumber: 'asc' },
    });
    return versionResponse(original);
  }

  private static async closeOwnPreviousSession(
    documentId: string,
    actorId: number
  ) {
    const now = new Date();
    const active = await prisma.taskDocumentEditSession.findFirst({
      where: {
        documentId,
        activeLeaseKey: documentId,
        status: { in: ['ACTIVE', 'SAVED'] },
      },
    });
    if (!active) return;
    const expired =
      active.expiresAt <= now || this.hardExpiresAt(active.createdAt) <= now;
    if (!expired && active.actorId !== actorId) {
      throw new AppError(
        'Otra persona está editando este documento. Intente nuevamente cuando libere la sesión.',
        423,
        'TASK_DOCUMENT_LOCKED'
      );
    }
    const activity = expired
      ? null
      : await prisma.taskDocumentEvent.findFirst({
          where: {
            sessionId: active.id,
            action: 'SESSION_HEARTBEAT',
          },
          select: { id: true },
        });
    if (
      !expired &&
      !canAutoReleaseOfficeSession({
        status: active.status,
        hasWebDavActivity: Boolean(activity),
      })
    ) {
      throw new AppError(
        'Microsoft Word ya tiene una sesiÃ³n activa para este documento.',
        423,
        'TASK_DOCUMENT_SESSION_ALREADY_ACTIVE'
      );
    }
    const status = expired ? 'EXPIRED' : 'RELEASED';
    await prisma.$transaction(async transaction => {
      const closed = await transaction.taskDocumentEditSession.updateMany({
        where: expired
          ? { id: active.id, status: { in: ['ACTIVE', 'SAVED'] } }
          : {
              id: active.id,
              status: 'ACTIVE',
              lastHeartbeatAt: active.lastHeartbeatAt,
            },
        data: { status, activeLeaseKey: null, closedAt: now },
      });
      if (closed.count !== 1) {
        throw new AppError(
          'Microsoft Word ya contactÃ³ la sesiÃ³n existente.',
          423,
          'TASK_DOCUMENT_SESSION_ALREADY_ACTIVE'
        );
      }
      await transaction.taskDocumentEvent.create({
        data: {
          documentId,
          sessionId: active.id,
          actorId: expired ? active.actorId : actorId,
          action: expired ? 'SESSION_EXPIRED' : 'SESSION_RELEASED',
          metadata: {
            reason: expired ? 'ttl_before_reopen' : 'reopened_prepared',
          },
        },
      });
    });
  }

  private static buildPublicFileUrl(
    baseUrl: string,
    token: string,
    fileName: string
  ) {
    return `${withoutTrailingSlash(
      baseUrl
    )}${OFFICE_ROUTE}/${token}/${encodeURIComponent(fileName)}`;
  }

  static async createSession(input: {
    taskKind: TaskDocumentKind;
    taskId: number;
    sourceFileId: number;
    provider: OfficeProvider;
    user: UserType;
  }) {
    this.assertProviderAvailable(input.provider);
    await TaskDocumentOfficePolicy.assertCanEdit(
      input.user,
      input.taskKind,
      input.taskId
    );
    const canonical = await this.ensureInitialVersion({
      taskKind: input.taskKind,
      taskId: input.taskId,
      sourceFileId: input.sourceFileId,
      userId: input.user.id,
    });
    await this.closeOwnPreviousSession(canonical.document.id, input.user.id);

    const rawToken = createOpaqueToken();
    const tokenHash = sha256(rawToken);
    const nonce = randomUUID();
    const documentKey = toOfficeDocumentKey(
      canonical.document.id,
      canonical.version.versionNumber,
      nonce
    );
    const sessionStartedAt = new Date();
    const expiresAt = nextOfficeSessionExpiry({
      now: sessionStartedAt,
      createdAt: sessionStartedAt,
      idleMinutes: ENV.TASK_DOCUMENT_SESSION_TTL_MINUTES,
      maximumMinutes: this.maximumSessionMinutes(),
    });

    let session;
    try {
      session = await prisma.$transaction(async transaction => {
        const created = await transaction.taskDocumentEditSession.create({
          data: {
            documentId: canonical.document.id,
            sourceVersionId: canonical.version.id,
            currentVersionId: canonical.version.id,
            actorId: input.user.id,
            provider: input.provider,
            status: 'ACTIVE',
            tokenHash,
            documentKey,
            activeLeaseKey: canonical.document.id,
            expectedVersionNumber: canonical.version.versionNumber,
            expiresAt,
          },
        });
        await transaction.taskDocumentEvent.create({
          data: {
            documentId: canonical.document.id,
            fileVersionId: canonical.version.id,
            sessionId: created.id,
            actorId: input.user.id,
            action: 'SESSION_OPENED',
            metadata: {
              provider: input.provider,
              expectedVersionNumber: canonical.version.versionNumber,
              expiresAt: expiresAt.toISOString(),
            },
          },
        });
        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppError(
          'Otra persona abrió el documento antes que usted.',
          423,
          'TASK_DOCUMENT_LOCKED'
        );
      }
      throw error;
    }

    const common = {
      id: session.id,
      binding: {
        documentId: canonical.document.id,
        sourceFileId: input.sourceFileId,
      },
      provider: session.provider,
      status: session.status,
      phase: 'PREPARED' as const,
      lastActivity: null,
      lastHeartbeatAt: session.lastHeartbeatAt,
      expiresAt: session.expiresAt,
      hardExpiresAt: this.hardExpiresAt(session.createdAt),
      lockActive: false,
      versionReceipt: null,
      version: versionResponse(canonical.version),
      title: canonical.version.originalName,
      editor: {
        id: input.user.id,
        name: input.user.profile
          ? `${input.user.profile.firstName} ${input.user.profile.lastName}`.trim()
          : 'Usuario Dhyrium',
      },
    };
    const externalBaseUrl = asBaseUrl(
      ENV.TASK_DOCUMENT_EXTERNAL_BASE_URL,
      'La URL pública de documentos'
    );
    const fileUrl = this.buildPublicFileUrl(
      externalBaseUrl,
      rawToken,
      canonical.version.originalName
    );
    return {
      ...common,
      wordDesktop: {
        launchUri: `ms-word:ofe|u|${fileUrl}`,
        secureTransport: new URL(externalBaseUrl).protocol === 'https:',
      },
    };
  }

  private static async resolvePublicSession(token: string) {
    const tokenHash = sha256(token);
    const session = await prisma.taskDocumentEditSession.findUnique({
      where: { tokenHash },
      include: { currentVersion: true, document: true },
    });
    if (!session || !isActiveSessionStatus(session.status)) {
      throw new AppError(
        'La sesión de edición no existe o ya fue cerrada.',
        401,
        'TASK_DOCUMENT_SESSION_INVALID'
      );
    }
    const now = new Date();
    if (
      session.expiresAt <= now ||
      this.hardExpiresAt(session.createdAt) <= now
    ) {
      await prisma.$transaction(async transaction => {
        const expired = await transaction.taskDocumentEditSession.updateMany({
          where: {
            id: session.id,
            status: { in: ['ACTIVE', 'SAVED'] },
          },
          data: {
            status: 'EXPIRED',
            activeLeaseKey: null,
            closedAt: now,
          },
        });
        if (expired.count !== 1) return;
        await transaction.taskDocumentEvent.create({
          data: {
            documentId: session.documentId,
            sessionId: session.id,
            actorId: session.actorId,
            action: 'SESSION_EXPIRED',
            metadata: { reason: 'request_after_ttl' },
          },
        });
      });
      throw new AppError(
        'La sesión de edición expiró.',
        401,
        'TASK_DOCUMENT_SESSION_EXPIRED'
      );
    }
    return session;
  }

  static async assertPublicSessionActive(token: string) {
    await this.resolvePublicSession(token);
  }

  private static async touchPublicSession(
    token: string,
    activity: TaskDocumentOfficeActivity
  ) {
    const session = await this.resolvePublicSession(token);
    const now = new Date();
    const expiresAt = nextOfficeSessionExpiry({
      now,
      createdAt: session.createdAt,
      idleMinutes: ENV.TASK_DOCUMENT_SESSION_TTL_MINUTES,
      maximumMinutes: this.maximumSessionMinutes(),
    });
    const isLockActivity =
      activity === 'LOCK_ACQUIRED' || activity === 'LOCK_REFRESH';
    const lockExpiresAt = isLockActivity
      ? new Date(
          Math.min(
            now.getTime() + ENV.TASK_DOCUMENT_LOCK_TTL_MINUTES * 60_000,
            this.hardExpiresAt(session.createdAt).getTime()
          )
        )
      : null;
    return prisma.$transaction(async transaction => {
      const touched = await transaction.taskDocumentEditSession.updateMany({
        where: { id: session.id, status: { in: ['ACTIVE', 'SAVED'] } },
        data: { expiresAt, lastHeartbeatAt: now },
      });
      if (touched.count !== 1) {
        throw new AppError(
          'La sesiÃ³n de ediciÃ³n ya no estÃ¡ activa.',
          409,
          'TASK_DOCUMENT_SESSION_CONFLICT'
        );
      }
      await transaction.taskDocumentEvent.create({
        data: {
          documentId: session.documentId,
          sessionId: session.id,
          actorId: session.actorId,
          action: 'SESSION_HEARTBEAT',
          metadata: {
            activity,
            expiresAt: expiresAt.toISOString(),
            ...(lockExpiresAt
              ? { lockExpiresAt: lockExpiresAt.toISOString() }
              : {}),
          },
        },
      });
      return transaction.taskDocumentEditSession.findUniqueOrThrow({
        where: { id: session.id },
        include: { currentVersion: true, document: true },
      });
    });
  }

  static async getPublicResource(
    token: string,
    activity: TaskDocumentOfficeActivity
  ) {
    const session = await this.touchPublicSession(token, activity);
    const lifecycle = await this.lifecycleFor(session);
    return {
      session,
      version: session.currentVersion,
      lifecycle,
      lockToken: toOfficeLockToken(session.documentKey),
    };
  }

  static async getPublicFile(
    token: string,
    activity: Extract<
      TaskDocumentOfficeActivity,
      'GET' | 'HEAD' | 'OPTIONS' | 'PROPFIND'
    >
  ) {
    const resource = await this.getPublicResource(token, activity);
    const buffer = await TaskDocumentOfficeStorage.read(
      resource.session.currentVersion.storageKey
    );
    return { ...resource, buffer };
  }

  static async lockPublicFile(input: {
    token: string;
    ifHeader?: unknown;
    lockTokenHeader?: unknown;
    contentLength?: unknown;
    transferEncoding?: unknown;
  }) {
    const session = await this.resolvePublicSession(input.token);
    const lockToken = toOfficeLockToken(session.documentKey);
    const presentedToken = readOfficeLockToken(
      input.ifHeader,
      input.lockTokenHeader
    );
    const lifecycle = await this.lifecycleFor(session);
    if (presentedToken) {
      assertOfficeSingleLockToken(lockToken, input.ifHeader);
      const contentLength = Number(input.contentLength ?? 0);
      if (
        (Number.isFinite(contentLength) && contentLength > 0) ||
        input.transferEncoding
      ) {
        throw new AppError(
          'La renovaciÃ³n LOCK no debe incluir cuerpo.',
          400,
          'TASK_DOCUMENT_LOCK_REFRESH_BODY_NOT_ALLOWED'
        );
      }
      if (!lifecycle.lockActive) {
        throw new AppError(
          'El bloqueo WebDAV expirÃ³ y debe adquirirse nuevamente.',
          423,
          'TASK_DOCUMENT_LOCK_EXPIRED'
        );
      }
    } else if (lifecycle.lockActive) {
      throw new AppError(
        'El documento ya tiene un bloqueo WebDAV activo.',
        423,
        'TASK_DOCUMENT_LOCKED'
      );
    }
    const activity = presentedToken ? 'LOCK_REFRESH' : 'LOCK_ACQUIRED';
    const touched = await this.touchPublicSession(input.token, activity);
    return {
      session: touched,
      version: touched.currentVersion,
      lifecycle: await this.lifecycleFor(touched),
      lockToken,
    };
  }

  private static async saveBuffer(input: {
    token: string;
    buffer: Buffer;
    source: 'WORD_DESKTOP';
    ifHeader?: unknown;
    ifMatchHeader?: unknown;
  }) {
    assertDocxBuffer(input.buffer);
    const preparedSession = await this.resolvePublicSession(input.token);
    const lockToken = toOfficeLockToken(preparedSession.documentKey);
    assertOfficeSingleLockToken(lockToken, input.ifHeader);
    const lifecycle = await this.lifecycleFor(preparedSession);
    if (!lifecycle.lockActive) {
      throw new AppError(
        'El bloqueo WebDAV expirÃ³ antes del guardado.',
        423,
        'TASK_DOCUMENT_LOCK_EXPIRED'
      );
    }
    assertOfficeEntityTag(
      preparedSession.currentVersion.checksumSha256,
      input.ifMatchHeader
    );
    const session = await this.touchPublicSession(input.token, 'PUT');
    if (session.provider !== input.source) {
      throw new AppError(
        'El canal de guardado no corresponde a la sesión.',
        403,
        'TASK_DOCUMENT_PROVIDER_MISMATCH'
      );
    }
    const checksumSha256 = sha256(input.buffer);
    if (checksumSha256 === session.currentVersion.checksumSha256) {
      await prisma.$transaction([
        prisma.taskDocumentEditSession.update({
          where: { id: session.id },
          data: { status: 'SAVED', lastHeartbeatAt: new Date() },
        }),
        prisma.taskDocumentEvent.create({
          data: {
            documentId: session.documentId,
            fileVersionId: session.currentVersion.id,
            sessionId: session.id,
            actorId: session.actorId,
            action: 'VERSION_SAVED',
            metadata: {
              provider: input.source,
              versionNumber: session.currentVersion.versionNumber,
              checksumSha256,
              created: false,
            },
          },
        }),
      ]);
      return {
        created: false,
        version: versionResponse(session.currentVersion),
      };
    }

    const versionId = randomUUID();
    const nextVersionNumber = session.expectedVersionNumber + 1;
    const storageKey = createStorageKey(session.documentId, versionId);
    await TaskDocumentOfficeStorage.writeImmutable(storageKey, input.buffer);
    try {
      const version = await prisma.$transaction(async transaction => {
        const documentUpdated = await transaction.taskDocument.updateMany({
          where: {
            id: session.documentId,
            fileVersionNumber: session.expectedVersionNumber,
          },
          data: {
            fileVersionNumber: nextVersionNumber,
            updatedById: session.actorId,
          },
        });
        if (documentUpdated.count !== 1) {
          throw new AppError(
            'El documento cambió desde que se abrió. Se rechazó el guardado.',
            409,
            'TASK_DOCUMENT_VERSION_CONFLICT'
          );
        }
        const created = await transaction.taskDocumentFileVersion.create({
          data: {
            id: versionId,
            documentId: session.documentId,
            versionNumber: nextVersionNumber,
            storageKey,
            originalName: session.currentVersion.originalName,
            mimeType: DOCX_MIME_TYPE,
            sizeBytes: BigInt(input.buffer.length),
            checksumSha256,
            source: input.source,
            createdById: session.actorId,
          },
        });
        const sessionUpdated =
          await transaction.taskDocumentEditSession.updateMany({
            where: {
              id: session.id,
              currentVersionId: session.currentVersionId,
              expectedVersionNumber: session.expectedVersionNumber,
              status: { in: ['ACTIVE', 'SAVED'] },
            },
            data: {
              currentVersionId: created.id,
              expectedVersionNumber: nextVersionNumber,
              status: 'SAVED',
              lastHeartbeatAt: new Date(),
            },
          });
        if (sessionUpdated.count !== 1) {
          throw new AppError(
            'La sesión cambió durante el guardado.',
            409,
            'TASK_DOCUMENT_SESSION_CONFLICT'
          );
        }
        await transaction.taskDocumentEvent.create({
          data: {
            documentId: session.documentId,
            fileVersionId: created.id,
            sessionId: session.id,
            actorId: session.actorId,
            action: 'VERSION_SAVED',
            metadata: {
              provider: input.source,
              versionNumber: nextVersionNumber,
              checksumSha256,
            },
          },
        });
        return created;
      });
      return { created: true, version: versionResponse(version) };
    } catch (error) {
      await TaskDocumentOfficeStorage.remove(storageKey);
      if (error instanceof AppError) {
        await prisma.taskDocumentEditSession.updateMany({
          where: { id: session.id },
          data: {
            status: 'CONFLICT',
            activeLeaseKey: null,
            closedAt: new Date(),
          },
        });
      }
      throw error;
    }
  }

  static saveFromWord(input: {
    token: string;
    buffer: Buffer;
    ifHeader?: unknown;
    ifMatchHeader?: unknown;
  }) {
    return this.saveBuffer({ ...input, source: 'WORD_DESKTOP' });
  }

  static async releaseByToken(
    token: string,
    reason: string,
    lockTokenHeader: unknown
  ) {
    const session = await this.resolvePublicSession(token);
    assertOfficeLockToken(
      toOfficeLockToken(session.documentKey),
      lockTokenHeader
    );
    const lifecycle = await this.lifecycleFor(session);
    if (!lifecycle.lockActive) {
      throw new AppError(
        'El bloqueo WebDAV ya no esta activo.',
        409,
        'TASK_DOCUMENT_LOCK_NOT_ACTIVE'
      );
    }
    await prisma.$transaction([
      prisma.taskDocumentEditSession.update({
        where: { id: session.id },
        data: {
          status: 'RELEASED',
          activeLeaseKey: null,
          closedAt: new Date(),
        },
      }),
      prisma.taskDocumentEvent.create({
        data: {
          documentId: session.documentId,
          sessionId: session.id,
          actorId: session.actorId,
          action: 'SESSION_RELEASED',
          metadata: { reason },
        },
      }),
    ]);
    return session;
  }

  private static assertSessionOwnerOrModerator(
    user: UserType,
    actorId: number
  ) {
    if (actorId === user.id || hasProjectWriteRole(user)) return;
    throw new AppError(
      'No puede administrar la sesión de otro usuario.',
      403,
      'TASK_DOCUMENT_SESSION_FORBIDDEN'
    );
  }

  static async getSession(sessionId: string, user: UserType) {
    const storedSession = await prisma.taskDocumentEditSession.findUnique({
      where: { id: sessionId },
      include: {
        currentVersion: true,
        actor: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!storedSession) {
      throw new AppError(
        'La sesión solicitada no existe.',
        404,
        'TASK_DOCUMENT_SESSION_NOT_FOUND'
      );
    }
    this.assertSessionOwnerOrModerator(user, storedSession.actorId);
    const now = new Date();
    const shouldExpire =
      isActiveSessionStatus(storedSession.status) &&
      (storedSession.expiresAt <= now ||
        this.hardExpiresAt(storedSession.createdAt) <= now);
    if (shouldExpire) {
      await prisma.$transaction(async transaction => {
        const expired = await transaction.taskDocumentEditSession.updateMany({
          where: {
            id: storedSession.id,
            status: { in: ['ACTIVE', 'SAVED'] },
          },
          data: {
            status: 'EXPIRED',
            activeLeaseKey: null,
            closedAt: now,
          },
        });
        if (expired.count !== 1) return;
        await transaction.taskDocumentEvent.create({
          data: {
            documentId: storedSession.documentId,
            sessionId: storedSession.id,
            actorId: storedSession.actorId,
            action: 'SESSION_EXPIRED',
            metadata: { reason: 'status_query_after_ttl' },
          },
        });
      });
    }
    const session = shouldExpire
      ? { ...storedSession, status: 'EXPIRED' as const, closedAt: now }
      : storedSession;
    const binding = await this.getDocumentSourceBinding(session.documentId);
    const lifecycle = await this.lifecycleFor(session);
    return {
      id: session.id,
      binding: {
        documentId: session.documentId,
        sourceFileId:
          binding.sourceFileId ?? (binding.sourceBasicFileId as number),
      },
      provider: session.provider,
      status: session.status,
      ...lifecycle,
      version: versionResponse(session.currentVersion),
      editor: {
        id: session.actor.id,
        name: session.actor.profile
          ? `${session.actor.profile.firstName} ${session.actor.profile.lastName}`.trim()
          : 'Usuario Dhyrium',
      },
    };
  }

  static async releaseSession(sessionId: string, user: UserType) {
    const session = await prisma.taskDocumentEditSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) return;
    this.assertSessionOwnerOrModerator(user, session.actorId);
    if (!isActiveSessionStatus(session.status)) return;
    await prisma.$transaction([
      prisma.taskDocumentEditSession.update({
        where: { id: session.id },
        data: {
          status: 'RELEASED',
          activeLeaseKey: null,
          closedAt: new Date(),
        },
      }),
      prisma.taskDocumentEvent.create({
        data: {
          documentId: session.documentId,
          sessionId: session.id,
          actorId: user.id,
          action: 'SESSION_RELEASED',
          metadata: { reason: 'api_release' },
        },
      }),
    ]);
  }

  static async listVersions(
    taskKind: TaskDocumentKind,
    taskId: number,
    sourceFileId: number,
    limit: number,
    user: UserType
  ) {
    await TaskDocumentOfficePolicy.assertCanEdit(user, taskKind, taskId);
    const document = await prisma.taskDocument.findFirst({
      where: taskWhere(taskKind, taskId),
      select: { id: true },
    });
    if (!document) return [];
    await this.assertDocumentSourceBinding({
      documentId: document.id,
      taskKind,
      taskId,
      sourceFileId,
    });
    const versions = await prisma.taskDocumentFileVersion.findMany({
      where: { documentId: document.id },
      orderBy: { versionNumber: 'desc' },
      take: limit,
      include: {
        createdBy: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    return versions.map(versionResponse);
  }

  private static async resolveVersion(input: {
    taskKind: TaskDocumentKind;
    taskId: number;
    versionNumber: number;
    sourceFileId: number;
  }) {
    const document = await prisma.taskDocument.findFirst({
      where: taskWhere(input.taskKind, input.taskId),
      select: { id: true, fileVersionNumber: true },
    });
    if (!document) {
      throw new AppError(
        'El documento solicitado no existe.',
        404,
        'TASK_DOCUMENT_NOT_FOUND'
      );
    }
    await this.assertDocumentSourceBinding({
      documentId: document.id,
      taskKind: input.taskKind,
      taskId: input.taskId,
      sourceFileId: input.sourceFileId,
    });
    const version = await prisma.taskDocumentFileVersion.findUnique({
      where: {
        documentId_versionNumber: {
          documentId: document.id,
          versionNumber: input.versionNumber,
        },
      },
    });
    if (!version) {
      throw new AppError(
        'La versión DOCX solicitada no existe.',
        404,
        'TASK_DOCUMENT_FILE_VERSION_NOT_FOUND'
      );
    }
    return { document, version };
  }

  static async downloadVersion(input: {
    taskKind: TaskDocumentKind;
    taskId: number;
    versionNumber: number;
    sourceFileId: number;
    user: UserType;
  }) {
    await TaskDocumentOfficePolicy.assertCanEdit(
      input.user,
      input.taskKind,
      input.taskId
    );
    const resolved = await this.resolveVersion(input);
    const buffer = await TaskDocumentOfficeStorage.read(
      resolved.version.storageKey
    );
    return { version: resolved.version, buffer };
  }

  static async restoreVersion(input: {
    taskKind: TaskDocumentKind;
    taskId: number;
    versionNumber: number;
    sourceFileId: number;
    user: UserType;
  }) {
    await TaskDocumentOfficePolicy.assertCanEdit(
      input.user,
      input.taskKind,
      input.taskId
    );
    const resolved = await this.resolveVersion(input);
    const active = await prisma.taskDocumentEditSession.findFirst({
      where: {
        documentId: resolved.document.id,
        status: { in: ['ACTIVE', 'SAVED'] },
        activeLeaseKey: resolved.document.id,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (active) {
      throw new AppError(
        'Cierre la sesión de edición antes de restaurar una versión.',
        423,
        'TASK_DOCUMENT_LOCKED'
      );
    }

    const buffer = await TaskDocumentOfficeStorage.read(
      resolved.version.storageKey
    );
    const nextVersionNumber = resolved.document.fileVersionNumber + 1;
    const versionId = randomUUID();
    const storageKey = createStorageKey(resolved.document.id, versionId);
    await TaskDocumentOfficeStorage.writeImmutable(storageKey, buffer);
    try {
      const restored = await prisma.$transaction(async transaction => {
        const updated = await transaction.taskDocument.updateMany({
          where: {
            id: resolved.document.id,
            fileVersionNumber: resolved.document.fileVersionNumber,
          },
          data: {
            fileVersionNumber: nextVersionNumber,
            updatedById: input.user.id,
          },
        });
        if (updated.count !== 1) {
          throw new AppError(
            'El documento cambió antes de completar la restauración.',
            409,
            'TASK_DOCUMENT_VERSION_CONFLICT'
          );
        }
        const created = await transaction.taskDocumentFileVersion.create({
          data: {
            id: versionId,
            documentId: resolved.document.id,
            versionNumber: nextVersionNumber,
            storageKey,
            originalName: resolved.version.originalName,
            mimeType: DOCX_MIME_TYPE,
            sizeBytes: BigInt(buffer.length),
            checksumSha256: resolved.version.checksumSha256,
            source: 'RESTORE',
            createdById: input.user.id,
          },
        });
        await transaction.taskDocumentEvent.create({
          data: {
            documentId: resolved.document.id,
            fileVersionId: created.id,
            actorId: input.user.id,
            action: 'VERSION_RESTORED',
            metadata: {
              restoredFromVersion: input.versionNumber,
              versionNumber: nextVersionNumber,
              checksumSha256: resolved.version.checksumSha256,
            },
          },
        });
        return created;
      });
      return versionResponse(restored);
    } catch (error) {
      await TaskDocumentOfficeStorage.remove(storageKey);
      throw error;
    }
  }
}

export default TaskDocumentOfficeService;

import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { UserType } from '@/middlewares/auth.middleware';
import { ENV } from '@/config/env';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import type {
  SaveTaskDocumentBody,
  TaskDocumentKind,
} from './taskDocuments.schema';
import TaskDocumentOfficePolicy from './taskDocumentOffice.policy';
import {
  taskDocumentAssetContentType,
  taskDocumentAssetExtension,
} from './taskDocumentAssets.domain';
import { validateCanvasResourceReferences } from './taskDocumentContentResources.domain';

const EMPTY_DOCUMENT = { type: 'doc', content: [{ type: 'paragraph' }] };
const MAX_JSON_BYTES = 6_000_000;
const PRIVATE_TASK_DOCUMENT_ASSET_DIRECTORY = 'task-documents-private';

type TaskReference =
  | { subTaskId: number; basicTaskId: null }
  | { subTaskId: null; basicTaskId: number };

const taskReference = (
  taskKind: TaskDocumentKind,
  taskId: number
): TaskReference =>
  taskKind === 'subtasks'
    ? { subTaskId: taskId, basicTaskId: null }
    : { subTaskId: null, basicTaskId: taskId };

const documentWhere = (taskKind: TaskDocumentKind, taskId: number) =>
  taskKind === 'subtasks' ? { subTaskId: taskId } : { basicTaskId: taskId };

const assertContentSize = (contentJson: unknown) => {
  const bytes = Buffer.byteLength(JSON.stringify(contentJson), 'utf8');
  if (bytes > MAX_JSON_BYTES) {
    throw new AppError(
      'El documento supera el tamaÃ±o mÃ¡ximo permitido.',
      413,
      'TASK_DOCUMENT_TOO_LARGE'
    );
  }
};

const assertTaskExists = async (taskKind: TaskDocumentKind, taskId: number) => {
  const task =
    taskKind === 'subtasks'
      ? await prisma.subTasks.findUnique({
          where: { id: taskId },
          select: { id: true },
        })
      : await prisma.basicTasks.findUnique({
          where: { id: taskId },
          select: { id: true },
        });

  if (!task) {
    throw new AppError(
      'La tarea solicitada no existe.',
      404,
      'TASK_DOCUMENT_TASK_NOT_FOUND'
    );
  }
};

const userSelect = {
  id: true,
  profile: { select: { firstName: true, lastName: true } },
} satisfies Prisma.UsersSelect;

const documentInclude = {
  updatedBy: { select: userSelect },
} satisfies Prisma.TaskDocumentInclude;

const toAuthor = (user: {
  id: number;
  profile: { firstName: string; lastName: string } | null;
}) => ({
  id: user.id,
  name: user.profile
    ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
    : 'Usuario Dhyrium',
});

const toResponse = (
  taskKind: TaskDocumentKind,
  taskId: number,
  document: Prisma.TaskDocumentGetPayload<{ include: typeof documentInclude }>
) => ({
  id: document.id,
  taskKind,
  taskId,
  title: document.title,
  contentJson: document.contentJson,
  contentHtml: document.contentHtml,
  plainText: document.plainText,
  revision: document.revision,
  versionNumber: document.versionNumber,
  updatedAt: document.updatedAt,
  updatedBy: toAuthor(document.updatedBy),
});

class TaskDocumentsService {
  static async saveAsset(input: {
    taskKind: TaskDocumentKind;
    taskId: number;
    file: Express.Multer.File;
    user: UserType;
  }) {
    await TaskDocumentOfficePolicy.assertCanEdit(
      input.user,
      input.taskKind,
      input.taskId
    );
    await assertTaskExists(input.taskKind, input.taskId);
    const extension = taskDocumentAssetExtension(input.file.mimetype);
    if (!extension) {
      throw new AppError(
        'El recurso del documento no es una imagen o video compatible.',
        415,
        'TASK_DOCUMENT_ASSET_TYPE_NOT_ALLOWED'
      );
    }

    const relativeDirectory = path.posix.join(
      input.taskKind,
      String(input.taskId)
    );
    const absoluteDirectory = path.resolve(
      process.cwd(),
      'uploads',
      PRIVATE_TASK_DOCUMENT_ASSET_DIRECTORY,
      relativeDirectory
    );
    const fileName = `${randomUUID()}.${extension}`;
    await mkdir(absoluteDirectory, { recursive: true });
    await writeFile(path.join(absoluteDirectory, fileName), input.file.buffer);

    return {
      url: `/${ENV.ROUTE}/task-documents/${relativeDirectory}/assets/${fileName}`,
    };
  }

  static async getAsset(input: {
    taskKind: TaskDocumentKind;
    taskId: number;
    fileName: string;
    user: UserType;
  }) {
    await TaskDocumentOfficePolicy.assertCanRead(
      input.user,
      input.taskKind,
      input.taskId
    );
    await assertTaskExists(input.taskKind, input.taskId);
    const contentType = taskDocumentAssetContentType(input.fileName);
    if (!contentType) {
      throw new AppError(
        'El recurso del documento no es vÃ¡lido.',
        400,
        'TASK_DOCUMENT_ASSET_INVALID'
      );
    }
    const candidatePaths = [
      path.resolve(
        process.cwd(),
        'uploads',
        PRIVATE_TASK_DOCUMENT_ASSET_DIRECTORY,
        input.taskKind,
        String(input.taskId),
        input.fileName
      ),
      // Compatibilidad de solo lectura: los recursos creados antes de H01-WEB
      // permanecen en este árbol, pero ya no se exponen mediante express.static.
      path.resolve(
        process.cwd(),
        'uploads',
        'task-documents',
        input.taskKind,
        String(input.taskId),
        input.fileName
      ),
    ];
    for (const candidatePath of candidatePaths) {
      try {
        const buffer = await readFile(candidatePath);
        return { buffer, contentType };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    throw new AppError(
      'El recurso del documento no existe.',
      404,
      'TASK_DOCUMENT_ASSET_NOT_FOUND'
    );
  }

  static async get(taskKind: TaskDocumentKind, taskId: number, user: UserType) {
    await TaskDocumentOfficePolicy.assertCanRead(user, taskKind, taskId);
    await assertTaskExists(taskKind, taskId);
    const document = await prisma.taskDocument.findFirst({
      where: documentWhere(taskKind, taskId),
      include: documentInclude,
    });
    return document ? toResponse(taskKind, taskId, document) : null;
  }

  static async save(input: {
    taskKind: TaskDocumentKind;
    taskId: number;
    user: UserType;
    body: SaveTaskDocumentBody;
  }) {
    await TaskDocumentOfficePolicy.assertCanEdit(
      input.user,
      input.taskKind,
      input.taskId
    );
    assertContentSize(input.body.contentJson);
    const resourceValidation = validateCanvasResourceReferences(
      input.body.contentJson,
      {
        taskKind: input.taskKind,
        taskId: input.taskId,
        apiRoute: ENV.ROUTE,
      }
    );
    if (!resourceValidation.ok) {
      throw new AppError(
        resourceValidation.message,
        422,
        'TASK_DOCUMENT_RESOURCE_REFERENCE_INVALID'
      );
    }
    await assertTaskExists(input.taskKind, input.taskId);

    const existing = await prisma.taskDocument.findFirst({
      where: documentWhere(input.taskKind, input.taskId),
      select: { id: true, revision: true, versionNumber: true },
    });

    if (!existing) {
      if (input.body.expectedRevision !== null) {
        throw new AppError(
          'El documento cambiÃ³. Actualice la pÃ¡gina antes de guardar.',
          409,
          'TASK_DOCUMENT_CONFLICT'
        );
      }

      try {
        const created = await prisma.taskDocument.create({
          data: {
            ...taskReference(input.taskKind, input.taskId),
            title: input.body.title,
            contentJson: input.body.contentJson,
            contentHtml: input.body.contentHtml,
            plainText: input.body.plainText,
            createdById: input.user.id,
            updatedById: input.user.id,
            versions: {
              create: {
                versionNumber: 1,
                title: input.body.title,
                contentJson: input.body.contentJson,
                contentHtml: input.body.contentHtml,
                plainText: input.body.plainText,
                createdById: input.user.id,
              },
            },
          },
        });
        const createdWithAuthor = await prisma.taskDocument.findUniqueOrThrow({
          where: { id: created.id },
          include: documentInclude,
        });
        return toResponse(input.taskKind, input.taskId, createdWithAuthor);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new AppError(
            'El documento fue creado por otro usuario. Actualice la pÃ¡gina.',
            409,
            'TASK_DOCUMENT_CONFLICT'
          );
        }
        throw error;
      }
    }

    if (input.body.expectedRevision !== existing.revision) {
      throw new AppError(
        'Otra persona guardÃ³ cambios en este documento. Actualice antes de continuar.',
        409,
        'TASK_DOCUMENT_CONFLICT'
      );
    }

    const nextVersion = input.body.createVersion
      ? existing.versionNumber + 1
      : existing.versionNumber;

    return prisma.$transaction(async transaction => {
      const updated = await transaction.taskDocument.updateMany({
        where: { id: existing.id, revision: existing.revision },
        data: {
          title: input.body.title,
          contentJson: input.body.contentJson,
          contentHtml: input.body.contentHtml,
          plainText: input.body.plainText,
          updatedById: input.user.id,
          revision: { increment: 1 },
          versionNumber: nextVersion,
        },
      });

      if (updated.count !== 1) {
        throw new AppError(
          'Otra persona guardÃ³ cambios en este documento. Actualice antes de continuar.',
          409,
          'TASK_DOCUMENT_CONFLICT'
        );
      }

      if (input.body.createVersion) {
        await transaction.taskDocumentVersion.create({
          data: {
            documentId: existing.id,
            versionNumber: nextVersion,
            title: input.body.title,
            contentJson: input.body.contentJson,
            contentHtml: input.body.contentHtml,
            plainText: input.body.plainText,
            createdById: input.user.id,
          },
        });
      }

      const document = await transaction.taskDocument.findUniqueOrThrow({
        where: { id: existing.id },
        include: documentInclude,
      });
      return toResponse(input.taskKind, input.taskId, document);
    });
  }

  static async listVersions(
    taskKind: TaskDocumentKind,
    taskId: number,
    limit: number,
    user: UserType
  ) {
    await TaskDocumentOfficePolicy.assertCanRead(user, taskKind, taskId);
    const document = await prisma.taskDocument.findFirst({
      where: documentWhere(taskKind, taskId),
      select: { id: true },
    });
    if (!document) return [];

    const versions = await prisma.taskDocumentVersion.findMany({
      where: { documentId: document.id },
      orderBy: { versionNumber: 'desc' },
      take: limit,
      select: {
        versionNumber: true,
        title: true,
        createdAt: true,
        createdBy: { select: userSelect },
      },
    });
    return versions.map(version => ({
      versionNumber: version.versionNumber,
      title: version.title,
      createdAt: version.createdAt,
      createdBy: toAuthor(version.createdBy),
    }));
  }

  static async restore(input: {
    taskKind: TaskDocumentKind;
    taskId: number;
    versionNumber: number;
    expectedRevision: number;
    user: UserType;
  }) {
    await TaskDocumentOfficePolicy.assertCanEdit(
      input.user,
      input.taskKind,
      input.taskId
    );
    const document = await prisma.taskDocument.findFirst({
      where: documentWhere(input.taskKind, input.taskId),
      select: { id: true },
    });
    if (!document) {
      throw new AppError(
        'El documento solicitado no existe.',
        404,
        'TASK_DOCUMENT_NOT_FOUND'
      );
    }
    const version = await prisma.taskDocumentVersion.findUnique({
      where: {
        documentId_versionNumber: {
          documentId: document.id,
          versionNumber: input.versionNumber,
        },
      },
    });
    if (!version) {
      throw new AppError(
        'La versiÃ³n solicitada no existe.',
        404,
        'TASK_DOCUMENT_VERSION_NOT_FOUND'
      );
    }

    return TaskDocumentsService.save({
      taskKind: input.taskKind,
      taskId: input.taskId,
      user: input.user,
      body: {
        title: version.title,
        contentJson: (version.contentJson ||
          EMPTY_DOCUMENT) as SaveTaskDocumentBody['contentJson'],
        contentHtml: version.contentHtml,
        plainText: version.plainText,
        expectedRevision: input.expectedRevision,
        createVersion: true,
      },
    });
  }
}

export default TaskDocumentsService;

import { BasicResourceKind, Prisma } from '@prisma/client';
import { UserType } from '@/middlewares/auth.middleware';
import MeetingPermissionService from '@/services/meetingPermission.services';
import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import type { BasicResourceTargetInput } from './basicResources.schema';
import { isBasicResourceManager } from './basicResources.policy';
import {
  normalizeBasicResourceTargets,
  type BasicResourceTargetGraph,
} from './basicResources.targets';

type UploadedResourceFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  storageKey: string;
};

const resourceInclude = {
  uploadedBy: {
    select: {
      id: true,
      profile: { select: { firstName: true, lastName: true } },
    },
  },
  targets: {
    include: {
      level: { select: { id: true, name: true, item: true } },
      subTask: { select: { id: true, name: true, item: true } },
    },
  },
} satisfies Prisma.BasicResourceInclude;

type BasicResourceWithRelations = Prisma.BasicResourceGetPayload<{
  include: typeof resourceInclude;
}>;

const publicResource = (resource: BasicResourceWithRelations) => ({
  ...resource,
  sizeBytes: resource.sizeBytes.toString(),
});

const fileKind = (file: UploadedResourceFile): BasicResourceKind => {
  if (file.mimetype.startsWith('image/')) return 'PHOTO';
  if (file.mimetype.startsWith('video/')) return 'VIDEO';
  if (file.mimetype === 'application/pdf') return 'DOCUMENT';
  const extension = file.originalname.split('.').at(-1)?.toLowerCase();
  if (['dwg', 'dxf'].includes(extension || '')) return 'DRAWING';
  if (['zip', 'rar', '7z'].includes(extension || '')) return 'ARCHIVE';
  if (['rvt', 'ifc', 'skp'].includes(extension || '')) return 'MODEL';
  return 'OTHER';
};

class BasicResourcesService {
  private static async isManager(actor: UserType) {
    return isBasicResourceManager(actor);
  }

  private static async assertContext(
    actor: UserType,
    unitId: string,
    projectId: number,
    stageId: number,
    options: { manage?: boolean } = {}
  ) {
    const canManage = await this.isManager(actor);
    if (options.manage && !canManage)
      throw new AppError(
        'Solo Laboratorio y Campo puede gestionar recursos básicos',
        403
      );
    if (!canManage)
      await MeetingPermissionService.assertCanReadUnit(actor, unitId);

    const [stage, focus] = await Promise.all([
      prisma.stages.findFirst({
        where: { id: stageId, projectId },
        select: { id: true },
      }),
      prisma.orgUnitProjectStageFocus.findFirst({
        where: {
          unitId,
          projectId,
          stageId,
          isCurrent: true,
          status: { not: 'INACTIVE' },
        },
        select: { id: true },
      }),
    ]);
    if (!stage)
      throw new AppError('La etapa no pertenece al proyecto indicado', 404);
    if (!focus)
      throw new AppError('La etapa no está asignada a esta oficina', 404);
    return { canManage };
  }

  private static async normalizeTargets(
    stageId: number,
    targets: BasicResourceTargetInput[]
  ) {
    const levelIds = targets.flatMap(target =>
      target.levelId ? [target.levelId] : []
    );
    const taskIds = targets.flatMap(target =>
      target.subTaskId ? [target.subTaskId] : []
    );
    const [levels, tasks] = await Promise.all([
      prisma.levels.findMany({
        where: { stagesId: stageId },
        select: { id: true, levelList: true },
      }),
      prisma.subTasks.findMany({
        where: { Levels: { stagesId: stageId } },
        select: { id: true, levels_Id: true },
      }),
    ]);
    const levelIdSet = new Set(levels.map(level => level.id));
    const taskIdSet = new Set(tasks.map(task => task.id));
    if (
      levelIds.some(levelId => !levelIdSet.has(levelId)) ||
      taskIds.some(taskId => !taskIdSet.has(taskId))
    )
      throw new AppError('Uno o más destinos no pertenecen a la etapa', 400);
    const graph: BasicResourceTargetGraph = {
      levels,
      tasks: tasks.map(task => ({ id: task.id, levelsId: task.levels_Id })),
    };
    return normalizeBasicResourceTargets(targets, graph);
  }

  public static async list(
    actor: UserType,
    input: { unitId: string; projectId: number; stageId: number; q?: string }
  ) {
    const { canManage } = await this.assertContext(
      actor,
      input.unitId,
      input.projectId,
      input.stageId
    );
    const resources = await prisma.basicResource.findMany({
      where: {
        projectId: input.projectId,
        stageId: input.stageId,
        ...(input.q
          ? {
              OR: [
                { originalName: { contains: input.q, mode: 'insensitive' } },
                { title: { contains: input.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: resourceInclude,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return { canManage, resources: resources.map(publicResource) };
  }

  public static async summary(
    actor: UserType,
    input: { unitId: string; projectId: number; stageId: number }
  ) {
    const { canManage } = await this.assertContext(
      actor,
      input.unitId,
      input.projectId,
      input.stageId
    );
    const targets = await prisma.basicResourceTarget.findMany({
      where: {
        resource: { projectId: input.projectId, stageId: input.stageId },
      },
      select: {
        levelId: true,
        subTaskId: true,
        resource: { select: { createdAt: true } },
      },
    });
    const byLevel: Record<number, { count: number; latestAt: Date | null }> =
      {};
    const byTask: Record<number, { count: number; latestAt: Date | null }> = {};
    targets.forEach(target => {
      const bucket = target.levelId ? byLevel : byTask;
      const id = target.levelId || target.subTaskId;
      if (!id) return;
      const current = bucket[id] || { count: 0, latestAt: null };
      current.count += 1;
      if (!current.latestAt || current.latestAt < target.resource.createdAt)
        current.latestAt = target.resource.createdAt;
      bucket[id] = current;
    });
    return { canManage, byLevel, byTask };
  }

  public static async create(
    actor: UserType,
    input: {
      unitId: string;
      projectId: number;
      stageId: number;
      title?: string;
      description?: string;
      targets: BasicResourceTargetInput[];
      files: UploadedResourceFile[];
    }
  ) {
    await this.assertContext(
      actor,
      input.unitId,
      input.projectId,
      input.stageId,
      { manage: true }
    );
    if (!input.files.length)
      throw new AppError('Adjunte al menos un archivo', 400);
    const targets = await this.normalizeTargets(input.stageId, input.targets);
    const created = await prisma.$transaction(
      input.files.map(file =>
        prisma.basicResource.create({
          data: {
            projectId: input.projectId,
            stageId: input.stageId,
            title: input.title || null,
            description: input.description || null,
            storedName: file.filename,
            originalName: file.originalname,
            storageKey: file.storageKey,
            mimeType: file.mimetype || 'application/octet-stream',
            extension: file.originalname.split('.').at(-1)?.toLowerCase() || '',
            sizeBytes: BigInt(file.size),
            kind: fileKind(file),
            uploadedById: actor.id,
            targets: { create: targets },
          },
          include: resourceInclude,
        })
      )
    );
    return created.map(publicResource);
  }

  private static async getResourceContext(
    actor: UserType,
    unitId: string,
    resourceId: string,
    manage = false
  ) {
    const resource = await prisma.basicResource.findUnique({
      where: { id: resourceId },
      include: resourceInclude,
    });
    if (!resource) throw new AppError('Recurso básico no encontrado', 404);
    await this.assertContext(
      actor,
      unitId,
      resource.projectId,
      resource.stageId,
      { manage }
    );
    return resource;
  }

  public static async update(
    actor: UserType,
    input: {
      unitId: string;
      resourceId: string;
      title?: string | null;
      description?: string | null;
      targets?: BasicResourceTargetInput[];
    }
  ) {
    const resource = await this.getResourceContext(
      actor,
      input.unitId,
      input.resourceId,
      true
    );
    const targetData = input.targets
      ? await this.normalizeTargets(resource.stageId, input.targets)
      : undefined;
    const updated = await prisma.basicResource.update({
      where: { id: resource.id },
      data: {
        title: input.title,
        description: input.description,
        ...(targetData
          ? { targets: { deleteMany: {}, create: targetData } }
          : {}),
      },
      include: resourceInclude,
    });
    return publicResource(updated);
  }

  public static async delete(
    actor: UserType,
    unitId: string,
    resourceId: string
  ) {
    const resource = await this.getResourceContext(
      actor,
      unitId,
      resourceId,
      true
    );
    await prisma.basicResource.delete({ where: { id: resource.id } });
    return {
      storageKey: resource.storageKey,
      originalName: resource.originalName,
    };
  }

  public static async download(
    actor: UserType,
    unitId: string,
    resourceId: string
  ) {
    const resource = await this.getResourceContext(actor, unitId, resourceId);
    return {
      storageKey: resource.storageKey,
      originalName: resource.originalName,
      mimeType: resource.mimeType,
    };
  }
}

export default BasicResourcesService;

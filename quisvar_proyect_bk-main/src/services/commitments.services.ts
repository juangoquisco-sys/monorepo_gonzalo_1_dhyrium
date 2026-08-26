import { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import type {
  CommitmentAssigneeRole,
  CommitmentConfirmationStatus,
  CommitmentOrigin,
  CommitmentPriority,
  CommitmentReviewDecision,
  CommitmentStatus,
  CommitmentTargetType,
  Prisma,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import MeetingPermissionService from '@/services/meetingPermission.services';
import {
  canonicalizeCommitmentAssignees,
  canonicalizeCommitmentContexts,
} from '@/services/commitmentSelection.policy';

type CommitmentAssigneeInput = {
  userId?: number;
  unitId?: string;
  role?: CommitmentAssigneeRole;
};

type CommitmentContextInput = {
  targetType: CommitmentTargetType;
  unitId?: string | null;
  projectId?: number | string | null;
  stageId?: number | string | null;
  levelId?: number | string | null;
  subTaskId?: number | string | null;
  includeChildren?: boolean;
  isPrimary?: boolean;
};

type CommitmentInput = {
  unitId: string;
  projectId?: number | null;
  meetingId?: string | null;
  title: string;
  description?: string | null;
  dueDate?: string | Date | null;
  status?: CommitmentStatus;
  priority?: CommitmentPriority;
  confirmationStatus?: CommitmentConfirmationStatus;
  origin?: CommitmentOrigin;
  assignees?: CommitmentAssigneeInput[];
  contexts?: CommitmentContextInput[];
};

type CommitmentListQuery = {
  unitId?: string;
  projectId?: string | number;
  meetingId?: string;
  confirmationStatus?: CommitmentConfirmationStatus;
  targetType?: CommitmentTargetType;
  stageId?: string | number;
  levelId?: string | number;
  subTaskId?: string | number;
  includeChildren?: string | boolean;
  reviewDecision?: CommitmentReviewDecision;
  assigneeUserId?: string | number;
  assigneeUnitId?: string;
};

type NormalizedContext = {
  targetType: CommitmentTargetType;
  unitId?: string | null;
  projectId?: number | null;
  stageId?: number | null;
  levelId?: number | null;
  subTaskId?: number | null;
  includeChildren: boolean;
  isPrimary: boolean;
};

class CommitmentsServices {
  private static includeCommitment = {
    unit: { select: { id: true, name: true, type: true, codemap: true } },
    project: {
      select: {
        id: true,
        name: true,
        contract: { select: { id: true, cui: true, projectShortName: true } },
      },
    },
    meeting: {
      select: { id: true, title: true, scheduledAt: true, status: true },
    },
    proposedBy: {
      select: {
        id: true,
        profile: { select: { firstName: true, lastName: true } },
      },
    },
    confirmedBy: {
      select: {
        id: true,
        profile: { select: { firstName: true, lastName: true } },
      },
    },
    createdBy: {
      select: {
        id: true,
        profile: { select: { firstName: true, lastName: true } },
      },
    },
    assignees: {
      include: {
        user: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true, job: true } },
          },
        },
        unit: { select: { id: true, name: true, type: true, codemap: true } },
      },
    },
    contexts: {
      include: {
        unit: { select: { id: true, name: true, type: true, codemap: true } },
        project: {
          select: {
            id: true,
            name: true,
            contract: {
              select: { id: true, cui: true, projectShortName: true },
            },
          },
        },
        stage: { select: { id: true, name: true, projectId: true } },
        level: {
          select: {
            id: true,
            name: true,
            item: true,
            index: true,
            level: true,
            stagesId: true,
          },
        },
        subTask: {
          select: {
            id: true,
            name: true,
            item: true,
            index: true,
            status: true,
            levels_Id: true,
          },
        },
      },
      orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }],
    },
    reviews: {
      include: {
        reviewedBy: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { reviewedAt: 'desc' as const },
      take: 5,
    },
  };

  private static toDate(value?: string | Date | null) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new AppError('Fecha invalida', 400);
    return date;
  }

  private static toNumber(value?: number | string | null) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed))
      throw new AppError('Identificador invalido', 400);
    return parsed;
  }

  private static toBoolean(value?: string | boolean) {
    if (typeof value === 'boolean') return value;
    return value === 'true';
  }

  private static async getDescendantUnitIds(unitId: string) {
    const units = await prisma.organizationalUnit.findMany({
      where: { isActive: true },
      select: { id: true, parentId: true },
    });
    const byParent = new Map<string | null, string[]>();
    units.forEach(unit => {
      const key = unit.parentId ?? null;
      byParent.set(key, [...(byParent.get(key) || []), unit.id]);
    });
    const ids = new Set<string>([unitId]);
    const visit = (parentId: string) => {
      (byParent.get(parentId) || []).forEach(childId => {
        if (ids.has(childId)) return;
        ids.add(childId);
        visit(childId);
      });
    };
    visit(unitId);
    return Array.from(ids);
  }

  private static async assertActiveMeetingContext(
    meetingId: string | null | undefined,
    unitId: string
  ) {
    if (!meetingId) return;
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { unitId: true, status: true, scope: true },
    });
    if (!meeting) throw new AppError('Reunion no encontrada', 404);
    if (meeting.status !== 'LIVE')
      throw new AppError(
        'Solo puede registrar compromisos o revisiones en una reunion en vivo',
        409
      );
    const allowedUnitIds =
      meeting.scope === 'DESCENDANTS'
        ? await this.getDescendantUnitIds(meeting.unitId)
        : [meeting.unitId];
    if (!allowedUnitIds.includes(unitId))
      throw new AppError(
        'La unidad no pertenece al alcance de la reunion',
        400
      );
  }

  private static defaultAssignees(data: CommitmentInput) {
    if (data.assignees !== undefined)
      return canonicalizeCommitmentAssignees(data.assignees);
    return [{ unitId: data.unitId, role: 'OWNER' as CommitmentAssigneeRole }];
  }

  private static defaultContexts(
    data: CommitmentInput
  ): CommitmentContextInput[] {
    if (data.contexts?.length) return data.contexts;
    if (data.projectId) {
      return [
        {
          targetType: 'PROJECT',
          unitId: data.unitId,
          projectId: data.projectId,
          isPrimary: true,
        },
      ];
    }
    return [
      {
        targetType: 'ORG_UNIT',
        unitId: data.unitId,
        isPrimary: true,
      },
    ];
  }

  private static async normalizeContexts(
    data: CommitmentInput | Partial<CommitmentInput>,
    fallbackUnitId: string,
    fallbackProjectId?: number | null
  ) {
    const sourceContexts =
      'title' in data
        ? this.defaultContexts(data as CommitmentInput)
        : data.contexts || [];
    const contexts: NormalizedContext[] = [];

    for (const context of sourceContexts) {
      const targetType = context.targetType;
      const unitId = context.unitId || fallbackUnitId;
      const projectId =
        this.toNumber(context.projectId) || fallbackProjectId || null;
      const stageId = this.toNumber(context.stageId);
      const levelId = this.toNumber(context.levelId);
      const subTaskId = this.toNumber(context.subTaskId);

      if (targetType === 'ORG_UNIT' && !unitId)
        throw new AppError('El contexto de unidad requiere unidad', 400);
      if (targetType === 'PROJECT' && !projectId)
        throw new AppError('El contexto de proyecto requiere proyecto', 400);
      if (targetType === 'STAGE' && !stageId)
        throw new AppError('El contexto de etapa requiere etapa', 400);
      if (targetType === 'LEVEL' && !levelId)
        throw new AppError('El contexto de nivel requiere nivel', 400);
      if (targetType === 'TASK' && !subTaskId)
        throw new AppError('El contexto de tarea requiere tarea', 400);

      const resolvedProjectId = await this.resolveContextProjectId({
        projectId,
        stageId,
        levelId,
        subTaskId,
      });
      if (resolvedProjectId)
        await this.assertProjectBelongsToUnit(unitId, resolvedProjectId);

      contexts.push({
        targetType,
        unitId,
        projectId: resolvedProjectId || projectId,
        stageId,
        levelId,
        subTaskId,
        includeChildren: Boolean(context.includeChildren),
        isPrimary: context.isPrimary !== false,
      });
    }

    return canonicalizeCommitmentContexts(contexts);
  }

  private static async resolveContextProjectId(context: {
    projectId?: number | null;
    stageId?: number | null;
    levelId?: number | null;
    subTaskId?: number | null;
  }) {
    if (context.subTaskId) {
      const task = await prisma.subTasks.findUnique({
        where: { id: context.subTaskId },
        select: {
          Levels: { select: { stages: { select: { projectId: true } } } },
        },
      });
      if (!task) throw new AppError('Tarea no encontrada', 404);
      return task.Levels.stages.projectId;
    }
    if (context.levelId) {
      const level = await prisma.levels.findUnique({
        where: { id: context.levelId },
        select: { stages: { select: { projectId: true } } },
      });
      if (!level) throw new AppError('Nivel no encontrado', 404);
      return level.stages.projectId;
    }
    if (context.stageId) {
      const stage = await prisma.stages.findUnique({
        where: { id: context.stageId },
        select: { projectId: true },
      });
      if (!stage) throw new AppError('Etapa no encontrada', 404);
      return stage.projectId;
    }
    return context.projectId || null;
  }

  private static contextCreateManyData(contexts: NormalizedContext[]) {
    return contexts.map((context, index) => ({
      targetType: context.targetType,
      unitId: context.unitId,
      projectId: context.projectId,
      stageId: context.stageId,
      levelId: context.levelId,
      subTaskId: context.subTaskId,
      includeChildren: context.includeChildren,
      isPrimary: index === 0 ? true : context.isPrimary,
    }));
  }

  private static async assertAssigneesBelongToUnit(
    unitId: string,
    assignees: CommitmentAssigneeInput[]
  ) {
    for (const assignee of assignees) {
      const targetCount =
        Number(Boolean(assignee.userId)) + Number(Boolean(assignee.unitId));
      if (targetCount !== 1)
        throw new AppError(
          'Cada encargado debe identificar un usuario o una unidad',
          400
        );
      if (assignee.unitId && assignee.unitId !== unitId)
        throw new AppError(
          'La unidad encargada debe coincidir con la unidad del compromiso',
          400
        );
    }

    const userIds = Array.from(
      new Set(
        assignees.flatMap(assignee =>
          assignee.userId ? [assignee.userId] : []
        )
      )
    );
    if (!userIds.length) return;

    const now = new Date();
    const memberships = await prisma.organizationalMembership.findMany({
      where: {
        unitId,
        userId: { in: userIds },
        user: { status: true },
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      select: { userId: true },
    });
    const activeUserIds = new Set(memberships.map(item => item.userId));
    if (userIds.some(userId => !activeUserIds.has(userId)))
      throw new AppError(
        'Los encargados deben ser miembros activos de la unidad',
        400
      );
  }

  private static async assertTechnicalContextsBelongToUnit(
    unitId: string,
    contexts: NormalizedContext[]
  ) {
    const technicalContexts = contexts.filter(context =>
      ['STAGE', 'LEVEL', 'TASK'].includes(context.targetType)
    );
    if (!technicalContexts.length) return;

    const stageIds = Array.from(
      new Set(
        technicalContexts.flatMap(context =>
          context.stageId ? [context.stageId] : []
        )
      )
    );
    if (
      technicalContexts.some(context => !context.stageId) ||
      stageIds.length !== 1
    )
      throw new AppError(
        'El contexto tecnico debe pertenecer a una sola etapa',
        400
      );

    const stageId = stageIds[0];
    const projectIds = Array.from(
      new Set(
        technicalContexts.flatMap(context =>
          context.projectId ? [context.projectId] : []
        )
      )
    );
    if (projectIds.length !== 1)
      throw new AppError(
        'El contexto tecnico debe pertenecer a un solo proyecto',
        400
      );

    const stageFocus = await prisma.orgUnitProjectStageFocus.findFirst({
      where: {
        unitId,
        projectId: projectIds[0],
        stageId,
        isCurrent: true,
        status: { not: 'INACTIVE' },
      },
      select: { id: true },
    });
    if (!stageFocus)
      throw new AppError('La etapa no esta asignada a esta unidad', 400);

    const levelIds = Array.from(
      new Set(
        technicalContexts.flatMap(context =>
          context.targetType === 'LEVEL' && context.levelId
            ? [context.levelId]
            : []
        )
      )
    );
    if (levelIds.length) {
      const levels = await prisma.levels.findMany({
        where: { id: { in: levelIds }, stagesId: stageId },
        select: { id: true },
      });
      if (levels.length !== levelIds.length)
        throw new AppError(
          'Uno o mas niveles no pertenecen a la etapa indicada',
          400
        );
    }

    const taskIds = Array.from(
      new Set(
        technicalContexts.flatMap(context =>
          context.targetType === 'TASK' && context.subTaskId
            ? [context.subTaskId]
            : []
        )
      )
    );
    if (taskIds.length) {
      const tasks = await prisma.subTasks.findMany({
        where: {
          id: { in: taskIds },
          Levels: { stagesId: stageId },
        },
        select: { id: true },
      });
      if (tasks.length !== taskIds.length)
        throw new AppError(
          'Una o mas tareas no pertenecen a la etapa indicada',
          400
        );
    }
  }

  public static async create(userInfo: UserType, data: CommitmentInput) {
    await MeetingPermissionService.assertCanManageUnitWork(
      userInfo,
      data?.unitId
    );
    if (!data?.unitId || !data.title)
      throw new AppError('Ingrese unidad y compromiso', 400);
    await this.assertProjectBelongsToUnit(data.unitId, data.projectId);
    const assigneeInput =
      data.assignees !== undefined
        ? data.assignees
        : [{ unitId: data.unitId, role: 'OWNER' as CommitmentAssigneeRole }];
    await this.assertAssigneesBelongToUnit(data.unitId, assigneeInput);
    const assignees = this.defaultAssignees(data);
    await this.assertActiveMeetingContext(data.meetingId, data.unitId);
    const contexts = await this.normalizeContexts(
      data,
      data.unitId,
      data.projectId
    );
    await this.assertTechnicalContextsBelongToUnit(data.unitId, contexts);
    return prisma.commitment.create({
      data: {
        unitId: data.unitId,
        projectId: data.projectId,
        meetingId: data.meetingId,
        title: data.title,
        description: data.description,
        dueDate: this.toDate(data.dueDate),
        status: data.status || 'PENDING',
        priority: data.priority || 'NORMAL',
        confirmationStatus: data.confirmationStatus || 'CONFIRMED',
        origin: data.origin || (data.meetingId ? 'MEETING' : 'MANUAL'),
        createdById: userInfo.id,
        proposedById: userInfo.id,
        confirmedById: userInfo.id,
        confirmedAt: new Date(),
        ...(assignees.length
          ? {
              assignees: {
                createMany: {
                  data: assignees.map(assignee => ({
                    userId: assignee.userId,
                    unitId: assignee.unitId,
                    role: assignee.role || 'OWNER',
                  })),
                },
              },
            }
          : {}),
        contexts: {
          createMany: { data: this.contextCreateManyData(contexts) },
        },
      },
      include: this.includeCommitment,
    });
  }

  public static async list(userInfo: UserType, query: CommitmentListQuery) {
    const includeChildren = this.toBoolean(query.includeChildren);
    let unitIds: string[] | undefined;
    if (query.unitId) {
      await MeetingPermissionService.assertCanReadUnit(userInfo, query.unitId);
      unitIds = includeChildren
        ? await this.getDescendantUnitIds(query.unitId)
        : [query.unitId];
    } else {
      MeetingPermissionService.assertModuleRole(userInfo, ['MOD']);
    }

    const contextWhere: Prisma.CommitmentContextWhereInput = {};
    if (query.targetType) contextWhere.targetType = query.targetType;
    if (unitIds) contextWhere.unitId = { in: unitIds };
    if (query.projectId) contextWhere.projectId = Number(query.projectId);
    if (query.stageId) contextWhere.stageId = Number(query.stageId);
    if (query.levelId) contextWhere.levelId = Number(query.levelId);
    if (query.subTaskId) contextWhere.subTaskId = Number(query.subTaskId);
    const hasContextFilter = Object.keys(contextWhere).length > 0;

    return prisma.commitment.findMany({
      where: {
        unitId: unitIds ? { in: unitIds } : undefined,
        projectId: query.projectId ? Number(query.projectId) : undefined,
        meetingId: query.meetingId,
        confirmationStatus: query.confirmationStatus,
        contexts: hasContextFilter ? { some: contextWhere } : undefined,
        reviews: query.reviewDecision
          ? { some: { decision: query.reviewDecision } }
          : undefined,
        assignees:
          query.assigneeUserId || query.assigneeUnitId
            ? {
                some: {
                  userId: query.assigneeUserId
                    ? Number(query.assigneeUserId)
                    : undefined,
                  unitId: query.assigneeUnitId,
                },
              }
            : undefined,
      },
      include: this.includeCommitment,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  public static async createProposal(
    userInfo: UserType,
    data: CommitmentInput
  ) {
    if (!data?.unitId || !data.title)
      throw new AppError('Ingrese unidad y compromiso', 400);
    await MeetingPermissionService.assertCanProposeInUnit(
      userInfo,
      data.unitId
    );
    await this.assertProjectBelongsToUnit(data.unitId, data.projectId);
    await this.assertActiveMeetingContext(data.meetingId, data.unitId);
    const contexts = await this.normalizeContexts(
      data,
      data.unitId,
      data.projectId
    );
    return prisma.commitment.create({
      data: {
        unitId: data.unitId,
        projectId: data.projectId,
        meetingId: data.meetingId,
        title: data.title,
        description: data.description,
        dueDate: this.toDate(data.dueDate),
        status: data.status || 'PENDING',
        priority: data.priority || 'NORMAL',
        confirmationStatus: 'PROPOSED',
        origin: data.origin || 'PRE_MEETING',
        createdById: userInfo.id,
        proposedById: userInfo.id,
        assignees: {
          createMany: {
            data: this.defaultAssignees(data).map(assignee => ({
              userId: assignee.userId,
              unitId: assignee.unitId,
              role: assignee.role || 'OWNER',
            })),
          },
        },
        contexts: {
          createMany: { data: this.contextCreateManyData(contexts) },
        },
      },
      include: this.includeCommitment,
    });
  }

  public static async update(
    userInfo: UserType,
    id: string,
    data: Partial<CommitmentInput>
  ) {
    const commitment = await prisma.commitment.findUnique({
      where: { id },
      select: {
        unitId: true,
        projectId: true,
        proposedById: true,
        confirmationStatus: true,
      },
    });
    if (!commitment) throw new AppError('Compromiso no encontrado', 404);
    const canManage =
      MeetingPermissionService.hasModuleRole(userInfo, ['MOD']) ||
      (await MeetingPermissionService.canManageUnitProjects(
        userInfo.id,
        commitment.unitId
      ));
    if (!canManage) {
      MeetingPermissionService.assertModuleRole(userInfo, ['MEMBER', 'USER']);
      if (
        commitment.proposedById !== userInfo.id ||
        commitment.confirmationStatus !== 'PROPOSED'
      )
        throw new AppError('Solo puede editar sus propuestas pendientes', 403);
    }
    const unitId = data.unitId || commitment.unitId;
    const projectId =
      data.projectId === undefined ? commitment.projectId : data.projectId;
    await this.assertProjectBelongsToUnit(unitId, projectId);
    if (data.meetingId !== undefined)
      await this.assertActiveMeetingContext(data.meetingId, unitId);
    const contexts = data.contexts
      ? await this.normalizeContexts(data, unitId, projectId)
      : undefined;
    if (data.assignees !== undefined)
      await this.assertAssigneesBelongToUnit(unitId, data.assignees);
    const assignees =
      data.assignees !== undefined
        ? canonicalizeCommitmentAssignees(data.assignees)
        : undefined;
    if (contexts)
      await this.assertTechnicalContextsBelongToUnit(unitId, contexts);
    const tx: Prisma.PrismaPromise<unknown>[] = [];
    tx.push(
      prisma.commitment.update({
        where: { id },
        data: {
          unitId: data.unitId,
          projectId: data.projectId,
          meetingId: data.meetingId,
          title: data.title,
          description: data.description,
          dueDate: this.toDate(data.dueDate),
          status: data.status,
          priority: data.priority,
          confirmationStatus: canManage ? data.confirmationStatus : undefined,
          origin: data.origin,
        },
      })
    );
    if (assignees) {
      tx.push(
        prisma.commitmentAssignee.deleteMany({ where: { commitmentId: id } })
      );
      if (assignees.length)
        tx.push(
          prisma.commitmentAssignee.createMany({
            data: assignees.map(assignee => ({
              commitmentId: id,
              userId: assignee.userId,
              unitId: assignee.unitId,
              role: assignee.role || 'OWNER',
            })),
          })
        );
    }
    if (contexts) {
      tx.push(
        prisma.commitmentContext.deleteMany({ where: { commitmentId: id } })
      );
      tx.push(
        prisma.commitmentContext.createMany({
          data: this.contextCreateManyData(contexts).map(context => ({
            commitmentId: id,
            ...context,
          })),
        })
      );
    }
    await prisma.$transaction(tx);
    return prisma.commitment.findUnique({
      where: { id },
      include: this.includeCommitment,
    });
  }

  public static async review(
    userInfo: UserType,
    id: string,
    data: {
      decision: CommitmentReviewDecision;
      comment?: string | null;
      contextId?: string | null;
      meetingId?: string | null;
    }
  ) {
    const commitment = await prisma.commitment.findUnique({
      where: { id },
      select: { unitId: true },
    });
    if (!commitment) throw new AppError('Compromiso no encontrado', 404);
    await MeetingPermissionService.assertCanManageUnitWork(
      userInfo,
      commitment.unitId
    );
    await this.assertActiveMeetingContext(data.meetingId, commitment.unitId);
    if (!['APPROVED', 'REJECTED', 'NOT_APPLICABLE'].includes(data.decision))
      throw new AppError('Decision de revision invalida', 400);
    if (data.contextId) {
      const context = await prisma.commitmentContext.findFirst({
        where: { id: data.contextId, commitmentId: id },
        select: { id: true },
      });
      if (!context)
        throw new AppError('El contexto no pertenece al compromiso', 400);
    }
    await prisma.commitmentReview.create({
      data: {
        commitmentId: id,
        contextId: data.contextId || null,
        meetingId: data.meetingId || null,
        decision: data.decision,
        comment: data.comment?.trim() || null,
        reviewedById: userInfo.id,
      },
    });
    return prisma.commitment.findUnique({
      where: { id },
      include: this.includeCommitment,
    });
  }

  public static async updateReviewComment(
    userInfo: UserType,
    id: string,
    data: { comment?: string | null; contextId?: string | null }
  ) {
    const commitment = await prisma.commitment.findUnique({
      where: { id },
      select: { unitId: true },
    });
    if (!commitment) throw new AppError('Compromiso no encontrado', 404);
    await MeetingPermissionService.assertCanManageUnitWork(
      userInfo,
      commitment.unitId
    );
    const review = await prisma.commitmentReview.findFirst({
      where: {
        commitmentId: id,
        contextId: data.contextId || undefined,
      },
      orderBy: { reviewedAt: 'desc' },
      select: { id: true },
    });
    if (!review)
      throw new AppError('Primero seleccione una decision de revision', 400);
    await prisma.commitmentReview.update({
      where: { id: review.id },
      data: {
        comment: data.comment?.trim() || null,
        reviewedById: userInfo.id,
        reviewedAt: new Date(),
      },
    });
    return prisma.commitment.findUnique({
      where: { id },
      include: this.includeCommitment,
    });
  }

  public static async updateStatus(
    userInfo: UserType,
    id: string,
    status: CommitmentStatus
  ) {
    await MeetingPermissionService.assertCanUpdateCommitmentStatus(
      userInfo,
      id
    );
    return prisma.commitment.update({
      where: { id },
      data: { status },
      include: this.includeCommitment,
    });
  }

  public static async confirm(
    userInfo: UserType,
    id: string,
    confirmationStatus: CommitmentConfirmationStatus = 'CONFIRMED'
  ) {
    const commitment = await prisma.commitment.findUnique({
      where: { id },
      select: { unitId: true },
    });
    if (!commitment) throw new AppError('Compromiso no encontrado', 404);
    await MeetingPermissionService.assertCanManageUnitWork(
      userInfo,
      commitment.unitId
    );
    if (!['CONFIRMED', 'REJECTED'].includes(confirmationStatus))
      throw new AppError('Estado de confirmacion invalido', 400);
    return prisma.commitment.update({
      where: { id },
      data: {
        confirmationStatus,
        confirmedById: userInfo.id,
        confirmedAt: new Date(),
      },
      include: this.includeCommitment,
    });
  }

  public static async attachMeeting(
    userInfo: UserType,
    id: string,
    meetingId?: string | null
  ) {
    const commitment = await prisma.commitment.findUnique({
      where: { id },
      select: { unitId: true },
    });
    if (!commitment) throw new AppError('Compromiso no encontrado', 404);
    await MeetingPermissionService.assertCanManageUnitWork(
      userInfo,
      commitment.unitId
    );
    if (meetingId) {
      await this.assertActiveMeetingContext(meetingId, commitment.unitId);
    }
    return prisma.commitment.update({
      where: { id },
      data: { meetingId },
      include: this.includeCommitment,
    });
  }

  public static async delete(userInfo: UserType, id: string) {
    const commitment = await prisma.commitment.findUnique({
      where: { id },
      select: { unitId: true, proposedById: true, confirmationStatus: true },
    });
    if (!commitment) throw new AppError('Compromiso no encontrado', 404);
    const canManage =
      MeetingPermissionService.hasModuleRole(userInfo, ['MOD']) ||
      (await MeetingPermissionService.canManageUnitProjects(
        userInfo.id,
        commitment.unitId
      ));
    if (!canManage) {
      MeetingPermissionService.assertModuleRole(userInfo, ['MEMBER', 'USER']);
      if (
        commitment.proposedById !== userInfo.id ||
        commitment.confirmationStatus !== 'PROPOSED'
      )
        throw new AppError(
          'Solo puede eliminar sus propuestas pendientes',
          403
        );
    }
    return prisma.commitment.delete({ where: { id }, select: { id: true } });
  }

  private static async assertProjectBelongsToUnit(
    unitId?: string,
    projectId?: number | null
  ) {
    if (!unitId || !projectId) return;
    const focus = await prisma.orgUnitProjectFocus.findFirst({
      where: {
        unitId,
        projectId,
        isCurrent: true,
        status: { not: 'INACTIVE' },
      },
      select: { id: true },
    });
    if (!focus)
      throw new AppError('El proyecto no pertenece a esta unidad', 400);
  }
}

export default CommitmentsServices;

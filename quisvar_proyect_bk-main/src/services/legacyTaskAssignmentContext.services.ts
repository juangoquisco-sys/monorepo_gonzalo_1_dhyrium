import { prisma } from '../utils/prisma.server';
import AppError from '../utils/appError';

const userSelect = {
  id: true,
  email: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
      dni: true,
      description: true,
      job: true,
    },
  },
} as const;

const activeMembershipWhere = () => {
  const now = new Date();
  return {
    startDate: { lte: now },
    OR: [{ endDate: null }, { endDate: { gte: now } }],
  };
};

class LegacyTaskAssignmentContextService {
  static async forTechnicalTask(taskId: number) {
    const task = await prisma.subTasks.findUnique({
      where: { id: taskId },
      select: { Levels: { select: { stagesId: true } } },
    });
    if (!task) throw new AppError('Tarea no encontrada', 404);
    return this.forStage(task.Levels.stagesId);
  }

  static async forBasicTask(taskId: number) {
    const task = await prisma.basicTasks.findUnique({
      where: { id: taskId },
      select: { Levels: { select: { stagesId: true } } },
    });
    if (!task) throw new AppError('Tarea basica no encontrada', 404);
    return this.forStage(task.Levels.stagesId);
  }

  static async forStage(stageId: number) {
    const currentFocus = await prisma.orgUnitProjectStageFocus.findFirst({
      where: {
        stageId,
        isCurrent: true,
        status: { not: 'INACTIVE' },
        unit: { isActive: true },
      },
      include: {
        unit: {
          select: { id: true, name: true, type: true, codemap: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (currentFocus) {
      const memberships = await prisma.organizationalMembership.findMany({
        where: {
          unitId: currentFocus.unitId,
          user: { status: true },
          ...activeMembershipWhere(),
        },
        select: {
          userId: true,
          canManageUnitProjects: true,
          isUnitLead: true,
          role: true,
          user: { select: userSelect },
        },
        orderBy: [
          { canManageUnitProjects: 'desc' },
          { isUnitLead: 'desc' },
          { role: 'asc' },
        ],
      });
      const members = memberships.map(membership => membership.user);
      const evaluators = memberships
        .filter(membership => membership.canManageUnitProjects)
        .map(membership => membership.user);
      const allActiveUsers = await prisma.users.findMany({
        where: { status: true },
        select: userSelect,
        orderBy: [
          { profile: { lastName: 'asc' } },
          { profile: { firstName: 'asc' } },
        ],
      });

      return {
        source: 'UNIT' as const,
        migrationRequired: false,
        unit: currentFocus.unit,
        members,
        evaluators,
        allActiveUsers,
      };
    }

    const stage = await prisma.stages.findUnique({
      where: { id: stageId },
      select: {
        group: {
          select: {
            id: true,
            name: true,
            groups: {
              where: { active: true, users: { status: true } },
              select: {
                mod: true,
                users: { select: userSelect },
              },
              orderBy: { mod: 'desc' },
            },
          },
        },
      },
    });
    if (!stage) throw new AppError('Etapa no encontrada', 404);

    const legacyMembers = stage.group?.groups ?? [];
    const members = legacyMembers.map(membership => membership.users);
    const evaluators = legacyMembers
      .filter(membership => membership.mod)
      .map(membership => membership.users);
    const allActiveUsers = await prisma.users.findMany({
      where: { status: true },
      select: userSelect,
      orderBy: [
        { profile: { lastName: 'asc' } },
        { profile: { firstName: 'asc' } },
      ],
    });

    return {
      source: 'LEGACY_GROUP' as const,
      migrationRequired: true,
      unit: null,
      legacyGroup: stage.group
        ? { id: stage.group.id, name: stage.group.name }
        : null,
      members,
      evaluators,
      allActiveUsers,
    };
  }

  static async defaultEvaluatorForStage(stageId: number) {
    const context = await this.forStage(stageId);
    const userId = context.evaluators[0]?.id;
    return userId ? { connect: { id: userId } } : undefined;
  }
}

export default LegacyTaskAssignmentContextService;

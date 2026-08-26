import type { SubTasks, TaskRole } from '@prisma/client';

import type { FileMessagePick } from '@/types/types';
import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import { summarizePreLiquidation } from './liquidations.domain';
import {
  asLiquidationDatabase,
  type LiquidationDatabase,
} from './liquidations.database';
import type { CreateLiquidationBody } from './liquidations.schema';
import { resolveStageLiquidationScope } from './stageLiquidationScope.service';

interface PreLiquidationTaskRecord {
  id: number;
  name: string;
  item: string | null;
  status: SubTasks['status'];
  updatedAt: Date;
  reviewedAt: Date;
  days: number;
  price: unknown;
  Levels: {
    id: number;
    stages: {
      id: number;
      name: string;
      projectId: number;
      project: {
        id: number;
        name: string | null;
        contract: { cui: string };
      };
    };
  };
  users: Array<{
    id: number;
    userId: number;
    percentage: number;
    assignedAt: Date;
    finishedAt: Date | null;
    updatedAt: Date;
  }>;
}

interface CreateLiquidationCommand extends CreateLiquidationBody {
  senderId: number;
  files: FileMessagePick[];
}

type StageSummaryDatabase = Pick<LiquidationDatabase, 'subTasks'>;

class LiquidationsService {
  static async eligibleStages(userId: number) {
    const stages = await prisma.stages.findMany({
      where: {
        levels: {
          some: {
            subTasks: {
              some: {
                status: 'DONE',
                users: { some: { userId, percentage: { gt: 0 } } },
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        project: {
          select: {
            id: true,
            name: true,
            contract: { select: { cui: true } },
          },
        },
        levels: {
          where: {
            subTasks: {
              some: {
                status: 'DONE',
                users: { some: { userId, percentage: { gt: 0 } } },
              },
            },
          },
          select: { id: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const summaries = await this.stageSummaryMap(
      prisma,
      stages.map(stage => stage.id)
    );

    return stages
      .filter(
        stage => summaries[stage.id]?.stageStatus === 'CONFORMITY_GRANTED'
      )
      .map(({ levels, ...stage }) => ({
        ...stage,
        eligibleLevelCount: levels.length,
      }));
  }

  static async preLiquidationStages(
    userId: number,
    {
      isModerator = false,
      projectId,
      stageId,
    }: { isModerator?: boolean; projectId?: number; stageId?: number }
  ) {
    const participantFilter = {
      users: { some: { userId, percentage: { gt: 0 } } },
    };
    const stages = await prisma.stages.findMany({
      where: {
        id: stageId,
        projectId,
        levels: {
          some: {
            subTasks: {
              some: isModerator
                ? { users: { some: { percentage: { gt: 0 } } } }
                : participantFilter,
            },
          },
        },
        ...(isModerator
          ? {
              OR: [
                { levels: { some: { subTasks: { some: participantFilter } } } },
                {
                  group: {
                    groups: { some: { userId, mod: true, active: true } },
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        project: {
          select: {
            id: true,
            name: true,
            contract: { select: { cui: true } },
          },
        },
        levels: {
          select: { subTasks: { select: { status: true } } },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });

    return stages.map(stage => {
      const tasks = stage.levels.flatMap(level => level.subTasks);
      const summary = summarizePreLiquidation(tasks);
      return {
        id: stage.id,
        name: stage.name,
        updatedAt: stage.updatedAt,
        project: stage.project,
        totalTasks: tasks.length,
        ...summary,
        isEligibleForLiquidation: summary.stageStatus === 'CONFORMITY_GRANTED',
      };
    });
  }

  static async preLiquidationStageTasks(
    userId: number,
    stageId: number,
    { isModerator = false }: { isModerator?: boolean }
  ) {
    const tasks = (await prisma.subTasks.findMany({
      where: {
        Levels: { stagesId: stageId },
        ...(isModerator
          ? {}
          : { users: { some: { userId, percentage: { gt: 0 } } } }),
      },
      select: {
        id: true,
        name: true,
        item: true,
        status: true,
        updatedAt: true,
        reviewedAt: true,
        days: true,
        price: true,
        Levels: {
          select: {
            id: true,
            stages: {
              select: {
                id: true,
                name: true,
                projectId: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                    contract: { select: { cui: true } },
                  },
                },
              },
            },
          },
        },
        users: {
          where: isModerator
            ? { percentage: { gt: 0 } }
            : { userId, percentage: { gt: 0 } },
          select: {
            id: true,
            userId: true,
            percentage: true,
            assignedAt: true,
            finishedAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: [{ index: 'asc' }, { id: 'asc' }],
    })) as PreLiquidationTaskRecord[];

    if (tasks.length === 0) {
      throw new AppError(
        'No se encontraron tareas para esta etapa.',
        404,
        'LIQUIDATION_TASKS_NOT_FOUND'
      );
    }

    const stageTasks = await prisma.subTasks.findMany({
      where: { Levels: { stagesId: stageId } },
      select: { status: true },
    });
    const stage = tasks[0].Levels.stages;
    const summary = summarizePreLiquidation(stageTasks);

    return {
      stage: {
        id: stage.id,
        name: stage.name,
        projectId: stage.projectId,
        projectName: stage.project.name,
        cui: stage.project.contract.cui,
      },
      summary: {
        totalTasks: stageTasks.length,
        ...summary,
        isEligibleForLiquidation: summary.stageStatus === 'CONFORMITY_GRANTED',
      },
      tasks: tasks.map(task => ({
        id: task.id,
        name: task.name,
        item: task.item,
        status: task.status,
        updatedAt: task.updatedAt,
        reviewedAt: task.reviewedAt,
        days: task.days,
        price: Number(task.price),
        levelId: task.Levels.id,
        stageId: task.Levels.stages.id,
        participationPercentage: task.users.reduce(
          (sum, current) => sum + current.percentage,
          0
        ),
        assignedAt: task.users[0]?.assignedAt ?? null,
        finishedAt:
          task.users.find(current => current.finishedAt)?.finishedAt ?? null,
      })),
    };
  }

  static async grantStageConformity(stageId: number, userId: number) {
    return prisma.$transaction(
      async transaction => {
        const stage = await transaction.stages.findUnique({
          where: { id: stageId },
          select: { id: true, name: true },
        });
        if (!stage) {
          throw new AppError('Etapa no encontrada', 404, 'STAGE_NOT_FOUND');
        }

        const tasks = await transaction.subTasks.findMany({
          where: { Levels: { stagesId: stageId } },
          select: { id: true, status: true },
        });
        const summary = summarizePreLiquidation(tasks);
        if (!summary.canGrantConformity) {
          throw new AppError(
            tasks.length === 0
              ? 'La etapa no tiene tareas listas para conformidad.'
              : 'Aun existen subtareas pendientes dentro de la etapa.',
            409,
            'STAGE_NOT_READY_FOR_CONFORMITY'
          );
        }

        const reviewedIds = tasks
          .filter(task => task.status === 'REVIEWED')
          .map(task => task.id);
        if (reviewedIds.length > 0) {
          await transaction.subTasks.updateMany({
            where: { id: { in: reviewedIds } },
            data: { status: 'DONE', reviewedAt: new Date() },
          });
        }

        return {
          stageId: stage.id,
          stageName: stage.name,
          grantedBy: userId,
          grantedAt: new Date().toISOString(),
          updatedTasks: reviewedIds.length,
          status: 'CONFORMITY_GRANTED' as const,
        };
      },
      { isolationLevel: 'Serializable' }
    );
  }

  static async preview(userId: number, stageId: number) {
    await this.ensureStageReady(prisma, stageId);
    return resolveStageLiquidationScope(prisma, userId, stageId);
  }

  static async createRequest(command: CreateLiquidationCommand) {
    return prisma.$transaction(
      async transaction => {
        const office = await transaction.office.findFirst({
          where: { name: { contains: 'GENERAL', mode: 'insensitive' } },
          select: { id: true },
        });
        if (!office) {
          throw new AppError(
            'No se encontro la oficina GERENCIA GENERAL.',
            404,
            'GENERAL_MANAGEMENT_OFFICE_NOT_FOUND'
          );
        }

        const membership = await transaction.userToOffice.count({
          where: { usersId: command.senderId },
        });
        if (membership === 0) {
          throw new AppError(
            'El usuario no pertenece a ninguna oficina.',
            403,
            'LIQUIDATION_USER_WITHOUT_OFFICE'
          );
        }

        const liquidationDatabase = asLiquidationDatabase(transaction);
        await this.ensureStageReady(liquidationDatabase, command.stageId);
        const resolution = await resolveStageLiquidationScope(
          liquidationDatabase,
          command.senderId,
          command.stageId
        );
        if (resolution.grossAmount <= 0) {
          throw new AppError(
            'La liquidacion no tiene monto liquidable.',
            409,
            'EMPTY_LIQUIDATION'
          );
        }

        const { startOfYear, endOfYear, currentYear } = this.yearRange();
        const count = await transaction.reports.count({
          where: {
            userId: command.senderId,
            type: 'LIQUIDACION',
            createdAt: { gte: startOfYear, lte: endOfYear },
          },
        });
        const number = String(count + 1).padStart(3, '0');
        const report = await transaction.reports.create({
          data: {
            name: `Reporte de LIQUIDACION N° ${number} - ${currentYear}`,
            type: 'LIQUIDACION',
            subprice: resolution.grossAmount,
            price: resolution.grossAmount,
            percentage: 100,
            userId: command.senderId,
            initialDate: new Date(),
            untilDate: new Date(),
            officeId: office.id,
            liquidationScopeType: resolution.scopeType,
            liquidationStageId: command.stageId,
            liquidationScopeSnapshot: resolution.snapshot,
          },
        });

        const paymessage = await transaction.payMessages.create({
          data: {
            title: command.title,
            header: command.header,
            description: command.description,
            type: 'INFORME',
            office: { connect: { id: office.id } },
            report: { connect: { id: report.id } },
            users: {
              create: {
                userId: command.senderId,
                userInit: true,
                status: true,
              },
            },
            files: {
              createMany: {
                data: command.files.map(file => ({
                  name: file.name,
                  path: file.path,
                  originalname: file.originalname,
                  attempt: file.attempt ?? '',
                })),
              },
            },
            historyOfficesIds: [...new Set([office.id, 1])],
          },
        });

        return { report, paymessage, preview: resolution };
      },
      { isolationLevel: 'Serializable' }
    );
  }

  static async unamortizedAdvances({
    actorId,
    userId,
    canManagePayroll,
  }: {
    actorId: number;
    userId: number;
    canManagePayroll: boolean;
  }) {
    if (actorId !== userId && !canManagePayroll) {
      throw new AppError(
        'No tiene permiso para consultar los adelantos de este usuario.',
        403,
        'LIQUIDATION_ADVANCE_FORBIDDEN'
      );
    }

    return prisma.reports.findMany({
      where: {
        userId,
        type: 'ADELANTO',
        isAmortized: false,
        paymessage: { status: { in: ['PAGADO', 'FINALIZADO'] } },
      },
      select: {
        id: true,
        name: true,
        price: true,
        subprice: true,
        percentage: true,
        initialDate: true,
        untilDate: true,
        createdAt: true,
        paymessage: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private static yearRange(date = new Date()) {
    const currentYear = date.getFullYear();
    return {
      currentYear,
      startOfYear: new Date(currentYear, 0, 1),
      endOfYear: new Date(currentYear, 11, 31, 23, 59, 59, 999),
    };
  }

  private static async ensureStageReady(
    database: StageSummaryDatabase,
    stageId: number
  ) {
    const summaries = await this.stageSummaryMap(database, [stageId]);
    if (summaries[stageId]?.stageStatus !== 'CONFORMITY_GRANTED') {
      throw new AppError(
        'La etapa aun no tiene conformidad completa. No se puede liquidar.',
        409,
        'STAGE_NOT_READY_FOR_LIQUIDATION'
      );
    }
  }

  private static async stageSummaryMap(
    database: StageSummaryDatabase,
    stageIds: number[]
  ) {
    if (stageIds.length === 0) return {};
    const statuses = await database.subTasks.findMany({
      where: { Levels: { stagesId: { in: stageIds } } },
      select: {
        status: true,
        Levels: { select: { stagesId: true } },
      },
    });
    const grouped = statuses.reduce<
      Record<number, Array<{ status: TaskRole }>>
    >((result, task) => {
      const stageId = task.Levels.stagesId;
      result[stageId] ??= [];
      result[stageId].push({ status: task.status });
      return result;
    }, {});

    return Object.fromEntries(
      Object.entries(grouped).map(([stageId, tasks]) => [
        Number(stageId),
        summarizePreLiquidation(tasks),
      ])
    ) as Record<number, ReturnType<typeof summarizePreLiquidation>>;
  }
}

export default LiquidationsService;

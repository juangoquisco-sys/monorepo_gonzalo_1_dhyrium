import type { LiquidationScopeType, Prisma } from '@prisma/client';

import AppError from '@/utils/appError';
import {
  calculateTaskLiquidationAmount,
  roundCurrency,
} from './liquidations.domain';
import type { LiquidationDatabase } from './liquidations.database';

export interface LiquidationScopeItem {
  subTaskId: number;
  stageId: number;
  levelId: number;
  taskName: string;
  item: string | null;
  finishedAt: Date | null;
  sourceSubTaskOnUserIds: number[];
  participationPercentage: number;
  taskBaseAmount: number;
  userGrossAmount: number;
}

export interface LiquidationScopeResolution {
  scopeType: LiquidationScopeType;
  scopeRefId: number;
  userId: number;
  grossAmount: number;
  items: LiquidationScopeItem[];
  snapshot: Prisma.JsonObject;
}

export const resolveStageLiquidationScope = async (
  database: Pick<LiquidationDatabase, 'stages' | 'subTasks'>,
  userId: number,
  stageId: number
): Promise<LiquidationScopeResolution> => {
  const stage = await database.stages.findUnique({
    where: { id: stageId },
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
  });

  if (!stage) {
    throw new AppError('No se encontro la etapa', 404, 'STAGE_NOT_FOUND');
  }

  const tasks = await database.subTasks.findMany({
    where: {
      status: 'DONE',
      Levels: { stagesId: stage.id },
      users: { some: { userId, percentage: { gt: 0 } } },
    },
    select: {
      id: true,
      name: true,
      item: true,
      days: true,
      price: true,
      updatedAt: true,
      Levels: {
        select: {
          id: true,
          stages: { select: { id: true, monthlyPrice: true } },
        },
      },
      users: {
        where: { userId, percentage: { gt: 0 } },
        select: {
          id: true,
          percentage: true,
          finishedAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: [{ index: 'asc' }, { id: 'asc' }],
  });

  const items = tasks.map(task => {
    const participationPercentage = task.users.reduce(
      (sum, userTask) => sum + userTask.percentage,
      0
    );

    if (participationPercentage <= 0 || participationPercentage > 100) {
      throw new AppError(
        `La participacion de la tarea ${task.id} debe estar entre 1% y 100%.`,
        409,
        'INVALID_LIQUIDATION_PARTICIPATION'
      );
    }

    const { taskBaseAmount, userGrossAmount } = calculateTaskLiquidationAmount({
      taskPrice: Number(task.price),
      days: task.days,
      monthlyPrice: task.Levels.stages.monthlyPrice,
      participationPercentage,
    });
    const finishedAt =
      task.users.find(userTask => userTask.finishedAt)?.finishedAt ??
      task.users[0]?.updatedAt ??
      task.updatedAt;

    return {
      subTaskId: task.id,
      stageId: task.Levels.stages.id,
      levelId: task.Levels.id,
      taskName: task.name,
      item: task.item,
      finishedAt,
      sourceSubTaskOnUserIds: task.users.map(userTask => userTask.id),
      participationPercentage,
      taskBaseAmount,
      userGrossAmount,
    };
  });

  const grossAmount = roundCurrency(
    items.reduce((sum, item) => sum + item.userGrossAmount, 0)
  );
  const snapshotItems = items.map(({ finishedAt, ...item }) => ({
    ...item,
    finishedAt: finishedAt.toISOString(),
  }));

  return {
    scopeType: 'STAGE',
    scopeRefId: stage.id,
    userId,
    grossAmount,
    items,
    snapshot: {
      scopeType: 'STAGE',
      stageId: stage.id,
      stageName: stage.name,
      projectId: stage.projectId,
      projectName: stage.project.name,
      cui: stage.project.contract.cui,
      generatedAt: new Date().toISOString(),
      grossAmount,
      items: snapshotItems as unknown as Prisma.JsonArray,
    },
  };
};

import type { TaskRole } from '@prisma/client';

export type PreLiquidationStageStatus =
  | 'IN_PROGRESS'
  | 'READY_FOR_CONFORMITY'
  | 'CONFORMITY_GRANTED';

export interface PreLiquidationSummary {
  reviewedTasks: number;
  doneTasks: number;
  pendingTasks: number;
  canGrantConformity: boolean;
  stageStatus: PreLiquidationStageStatus;
}

export const roundCurrency = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const summarizePreLiquidation = (
  tasks: ReadonlyArray<{ status: TaskRole }>
): PreLiquidationSummary => {
  const reviewedTasks = tasks.filter(task => task.status === 'REVIEWED').length;
  const doneTasks = tasks.filter(task => task.status === 'DONE').length;
  const pendingTasks = tasks.filter(
    task => !['REVIEWED', 'DONE'].includes(task.status)
  ).length;
  const canGrantConformity = tasks.length > 0 && pendingTasks === 0;

  let stageStatus: PreLiquidationStageStatus = 'IN_PROGRESS';
  if (tasks.length > 0 && doneTasks === tasks.length) {
    stageStatus = 'CONFORMITY_GRANTED';
  } else if (canGrantConformity) {
    stageStatus = 'READY_FOR_CONFORMITY';
  }

  return {
    reviewedTasks,
    doneTasks,
    pendingTasks,
    canGrantConformity,
    stageStatus,
  };
};

export const calculateTaskLiquidationAmount = ({
  taskPrice,
  days,
  monthlyPrice,
  participationPercentage,
}: {
  taskPrice: number;
  days: number;
  monthlyPrice: number;
  participationPercentage: number;
}) => {
  const taskBaseAmount =
    taskPrice > 0
      ? roundCurrency(taskPrice)
      : roundCurrency(days * (monthlyPrice / 30));
  const userGrossAmount = roundCurrency(
    taskBaseAmount * (participationPercentage / 100)
  );

  return { taskBaseAmount, userGrossAmount };
};

export const calculateLiquidationNet = (
  grossAmount: number,
  advances: ReadonlyArray<number>
) => {
  const amortizedAmount = roundCurrency(
    advances.reduce((total, amount) => total + amount, 0)
  );
  return {
    amortizedAmount,
    netAmount: roundCurrency(grossAmount - amortizedAmount),
  };
};

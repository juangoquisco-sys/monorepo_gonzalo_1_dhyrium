import type { Level } from '@/types/types';
import type {
  Commitment,
  CommitmentContext,
} from '../../types/officeMeetings.types';

export type CommitmentTechnicalSelection = {
  projectId: number | null;
  stageId: number | null;
  projectName?: string | null;
  stageName?: string | null;
  levelIds: number[];
  taskIds: number[];
};

export type CommitmentContextPayload = {
  targetType: CommitmentContext['targetType'];
  unitId?: string | null;
  projectId?: number | null;
  stageId?: number | null;
  levelId?: number | null;
  subTaskId?: number | null;
  includeChildren?: boolean;
  isPrimary?: boolean;
};

export const emptyTechnicalSelection = (): CommitmentTechnicalSelection => ({
  projectId: null,
  stageId: null,
  projectName: null,
  stageName: null,
  levelIds: [],
  taskIds: [],
});

const uniqueSortedNumbers = (values: number[]) =>
  Array.from(new Set(values)).sort((first, second) => first - second);

export const collectTaskIds = (level?: Level | null): number[] => {
  if (!level) return [];
  return uniqueSortedNumbers([
    ...(level.subTasks ?? []).map(task => task.id),
    ...(level.nextLevel ?? []).flatMap(child => collectTaskIds(child)),
  ]);
};

export const findLevelById = (
  level: Level | null | undefined,
  levelId: number
): Level | null => {
  if (!level) return null;
  if (level.id === levelId) return level;
  for (const child of level.nextLevel ?? []) {
    const match = findLevelById(child, levelId);
    if (match) return match;
  }
  return null;
};

export const collectLevelIdsContainingTask = (
  level: Level | null | undefined,
  taskId: number
): number[] => {
  if (!level) return [];
  const directMatch = (level.subTasks ?? []).some(task => task.id === taskId);
  const childMatches = (level.nextLevel ?? []).flatMap(child =>
    collectLevelIdsContainingTask(child, taskId)
  );
  return directMatch || childMatches.length
    ? uniqueSortedNumbers([level.id, ...childMatches])
    : [];
};

export const toggleLevelInSelection = (
  tree: Level | null | undefined,
  selection: CommitmentTechnicalSelection,
  levelId: number
): CommitmentTechnicalSelection => {
  const level = findLevelById(tree, levelId);
  if (!level) return selection;

  const levelIds = new Set(selection.levelIds);
  const taskIds = new Set(selection.taskIds);
  const descendantTaskIds = collectTaskIds(level);
  const shouldRemove =
    levelIds.has(levelId) ||
    (descendantTaskIds.length > 0 &&
      descendantTaskIds.every(taskId => taskIds.has(taskId)));

  if (shouldRemove) {
    levelIds.delete(levelId);
    descendantTaskIds.forEach(taskId => taskIds.delete(taskId));
  } else {
    levelIds.add(levelId);
    descendantTaskIds.forEach(taskId => taskIds.add(taskId));
  }

  return {
    ...selection,
    levelIds: uniqueSortedNumbers(Array.from(levelIds)),
    taskIds: uniqueSortedNumbers(Array.from(taskIds)),
  };
};

export const toggleTaskInSelection = (
  tree: Level | null | undefined,
  selection: CommitmentTechnicalSelection,
  taskId: number
): CommitmentTechnicalSelection => {
  const levelIds = new Set(selection.levelIds);
  const taskIds = new Set(selection.taskIds);
  if (taskIds.has(taskId)) {
    taskIds.delete(taskId);
    collectLevelIdsContainingTask(tree, taskId).forEach(levelId =>
      levelIds.delete(levelId)
    );
  } else {
    taskIds.add(taskId);
  }

  return {
    ...selection,
    levelIds: uniqueSortedNumbers(Array.from(levelIds)),
    taskIds: uniqueSortedNumbers(Array.from(taskIds)),
  };
};

export const technicalSelectionFromCommitment = (
  commitment: Commitment
): CommitmentTechnicalSelection => {
  const technicalContexts = (commitment.contexts ?? []).filter(context =>
    ['LEVEL', 'TASK'].includes(context.targetType)
  );
  const primary =
    technicalContexts.find(context => context.isPrimary) ||
    technicalContexts[0];

  return {
    projectId:
      primary?.projectId ??
      primary?.stage?.projectId ??
      commitment.projectId ??
      null,
    stageId: primary?.stageId ?? primary?.stage?.id ?? null,
    projectName:
      primary?.project?.contract?.projectShortName ||
      primary?.project?.name ||
      commitment.project?.name ||
      null,
    stageName: primary?.stage?.name || null,
    levelIds: uniqueSortedNumbers(
      technicalContexts.flatMap(context =>
        context.targetType === 'LEVEL' && context.levelId
          ? [context.levelId]
          : []
      )
    ),
    taskIds: uniqueSortedNumbers(
      technicalContexts.flatMap(context =>
        context.targetType === 'TASK' && context.subTaskId
          ? [context.subTaskId]
          : []
      )
    ),
  };
};

export const buildCommitmentContexts = (
  unitId: string,
  selection: CommitmentTechnicalSelection
): CommitmentContextPayload[] => {
  if (
    !selection.projectId ||
    !selection.stageId ||
    (!selection.levelIds.length && !selection.taskIds.length)
  ) {
    return [
      {
        targetType: 'ORG_UNIT',
        unitId,
        includeChildren: false,
        isPrimary: true,
      },
    ];
  }

  const contexts: CommitmentContextPayload[] = [
    ...uniqueSortedNumbers(selection.levelIds).map(levelId => ({
      targetType: 'LEVEL' as const,
      unitId,
      projectId: selection.projectId,
      stageId: selection.stageId,
      levelId,
      includeChildren: true,
    })),
    ...uniqueSortedNumbers(selection.taskIds).map(subTaskId => ({
      targetType: 'TASK' as const,
      unitId,
      projectId: selection.projectId,
      stageId: selection.stageId,
      subTaskId,
      includeChildren: false,
    })),
  ];

  return contexts.map((context, index) => ({
    ...context,
    isPrimary: index === 0,
  }));
};

export const getTechnicalContextSummary = (commitment: Commitment) => {
  const contexts = commitment.contexts ?? [];
  const levelCount = contexts.filter(
    context => context.targetType === 'LEVEL'
  ).length;
  const taskCount = contexts.filter(
    context => context.targetType === 'TASK'
  ).length;
  if (!levelCount && !taskCount) return 'Agregar contexto';

  const primary =
    contexts.find(
      context =>
        context.isPrimary && ['LEVEL', 'TASK'].includes(context.targetType)
    ) ||
    contexts.find(context => ['LEVEL', 'TASK'].includes(context.targetType));
  const stageName = primary?.stage?.name || 'Etapa';
  const parts = [
    stageName,
    levelCount ? `${levelCount} ${levelCount === 1 ? 'nivel' : 'niveles'}` : '',
    taskCount ? `${taskCount} ${taskCount === 1 ? 'tarea' : 'tareas'}` : '',
  ].filter(Boolean);
  return parts.join(' · ');
};

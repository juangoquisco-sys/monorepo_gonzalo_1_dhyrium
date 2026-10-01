import type { prisma } from '@/utils/prisma.server';

export type IndexedTask = { id: number; index: number };
export type RequestedTaskPosition = { id: number; index: number };

const TASK_ORDER_LOCK = {
  basic: 1,
  technical: 2,
} as const;

type TaskOrderingTransaction = Pick<
  typeof prisma,
  '$executeRaw' | 'subTasks' | 'basicTasks'
>;

export const orderTaskIds = (tasks: IndexedTask[]) =>
  [...tasks]
    .sort((left, right) => left.index - right.index || left.id - right.id)
    .map(task => task.id);

export const insertTaskId = (
  orderedIds: number[],
  newId: number,
  anchorId: number,
  placement: 'upper' | 'lower'
) => {
  const anchorIndex = orderedIds.indexOf(anchorId);
  if (anchorIndex < 0) throw new Error('La tarea de referencia no existe');
  const insertionIndex = anchorIndex + (placement === 'lower' ? 1 : 0);
  const result = [...orderedIds];
  result.splice(insertionIndex, 0, newId);
  return result;
};

export const requestedTaskIds = (
  currentIds: number[],
  requested: RequestedTaskPosition[]
) => {
  const expectedIds = new Set(currentIds);
  const requestedIds = new Set(requested.map(task => task.id));
  const expectedPositions = requested.map((_, index) => index + 1);
  const actualPositions = requested
    .map(task => task.index)
    .sort((left, right) => left - right);

  const isComplete =
    requested.length === currentIds.length &&
    requestedIds.size === currentIds.length &&
    currentIds.every(id => requestedIds.has(id));
  const isContiguous = expectedPositions.every(
    (position, index) => actualPositions[index] === position
  );

  if (!isComplete || !isContiguous)
    throw new Error('El orden debe incluir todas las tareas una sola vez');

  return [...requested]
    .sort((left, right) => left.index - right.index)
    .map(task => task.id)
    .filter(id => expectedIds.has(id));
};

export const lockTaskOrder = async (
  transaction: TaskOrderingTransaction,
  kind: keyof typeof TASK_ORDER_LOCK,
  levelId: number
) => {
  await transaction.$executeRaw`
    SELECT pg_advisory_xact_lock(
      ${TASK_ORDER_LOCK[kind]}::int,
      ${levelId}::int
    )
  `;
};

export const writeSubTaskOrder = async (
  transaction: TaskOrderingTransaction,
  orderedIds: number[]
) => {
  for (const [position, id] of orderedIds.entries())
    await transaction.subTasks.update({
      where: { id },
      data: { index: position + 1 },
    });
};

export const writeBasicTaskOrder = async (
  transaction: TaskOrderingTransaction,
  orderedIds: number[]
) => {
  for (const [position, id] of orderedIds.entries())
    await transaction.basicTasks.update({
      where: { id },
      data: { index: position + 1 },
    });
};

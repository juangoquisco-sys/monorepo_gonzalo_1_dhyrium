import type { BasicResourceTargetInput } from './basicResources.schema';

export type BasicResourceTargetGraph = {
  levels: { id: number; levelList: number[] }[];
  tasks: { id: number; levelsId: number }[];
};

const targetKey = (target: BasicResourceTargetInput) =>
  target.levelId ? `level:${target.levelId}` : `task:${target.subTaskId}`;

export const normalizeBasicResourceTargets = (
  targets: BasicResourceTargetInput[],
  graph: BasicResourceTargetGraph
) => {
  const canonicalTargets = new Map<string, BasicResourceTargetInput>();
  targets.forEach(target => {
    const key = targetKey(target);
    const current = canonicalTargets.get(key);
    canonicalTargets.set(key, {
      ...target,
      includeDescendants: Boolean(
        target.levelId &&
          (target.includeDescendants || current?.includeDescendants)
      ),
    });
  });

  const inheritedLevelIds = new Set(
    Array.from(canonicalTargets.values())
      .filter(target => target.levelId && target.includeDescendants)
      .map(target => target.levelId as number)
  );
  const levelById = new Map(graph.levels.map(level => [level.id, level]));

  const levelHasInheritedAncestor = (levelId: number) =>
    levelById
      .get(levelId)
      ?.levelList.some(ancestorId => inheritedLevelIds.has(ancestorId)) ||
    false;

  return Array.from(canonicalTargets.values()).filter(target => {
    if (target.levelId) return !levelHasInheritedAncestor(target.levelId);
    const task = graph.tasks.find(
      candidate => candidate.id === target.subTaskId
    );
    return (
      !task ||
      (!inheritedLevelIds.has(task.levelsId) &&
        !levelHasInheritedAncestor(task.levelsId))
    );
  });
};

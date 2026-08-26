import type { Level } from '@/types/types';

export const getIdsSubTasksRecursive = (data: Level, ids: number[] = []) => {
  if (data.subTasks) {
    data.subTasks.forEach(subTask => {
      ids.push(subTask.id);
    });
  } else if (data.nextLevel) {
    data.nextLevel.forEach(nivel => {
      ids = getIdsSubTasksRecursive(nivel, ids);
    });
  }
  return ids;
};

export const findTaskPath = (
  level: Level,
  taskId: number,
  path: number[] = []
): null | number[] => {
  if (level.nextLevel) {
    for (let lvl of level.nextLevel) {
      const currentPath = [...path, lvl.id];
      if (lvl.subTasks) {
        for (let task of lvl.subTasks) {
          if (task.id === taskId) {
            return currentPath;
          }
        }
      }
      const nestedPath = findTaskPath(lvl, taskId, currentPath);
      if (nestedPath) {
        return nestedPath;
      }
    }
  }
  return null;
};

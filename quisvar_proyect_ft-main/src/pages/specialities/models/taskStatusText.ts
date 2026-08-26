import type { TaskStatus } from '../pages/project/models/definitiosProject';

export const STATUS_TEXT: Record<TaskStatus, string> = {
  UNRESOLVED: 'POR HACER',
  PROCESS: 'HACIENDO',
  INREVIEW: 'EN REVISIÓN',
  DENIED: 'POR CORREGIR',
  REVIEWED: 'REVISADO',
  DONE: 'HECHO',
  LIQUIDATION: 'LIQUIDADO',
};

export type TaskStatusValue = keyof typeof STATUS_TEXT;

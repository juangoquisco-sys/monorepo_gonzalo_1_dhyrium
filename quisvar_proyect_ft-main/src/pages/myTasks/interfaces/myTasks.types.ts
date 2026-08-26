import type { UserProfile } from '@/types/types';
import type { TaskStatus } from '../../specialities/pages/project/models/definitiosProject';

export interface ProjectTask<T> {
  id: number;
  projectId: number;
  name: string;
  tasks: T[];
}
export interface ResProjectTask<T> {
  data: ProjectTask<T>[];
  total: number;
}
export interface MyTask {
  id: number;
  groupId?: string;
  finishedAt: Date | null;
  updatedAt: Date | null;
  assignedAt: Date;
  percentage: number;
  price: number;
  taskInfo: TaskInfo;
  projectName?: string;
  stageId: number;
  projectId: number;
}

export interface ModTask {
  id: number;
  projectName?: string;
  stageId: number;
  projectId: number;
  status: TaskStatus;
  days: number;
  typeItem: string;
  index: number;
  updatedAt: Date;
  name: string;
  item: string;
  percentage: number;
  price: number;
  user: UserProfile;
}

export interface TaskInfo {
  item: string;
  id: number;
  name: string;
  status: TaskStatus;
  days: number;
  price: number;
  index: number;
  typeItem: string;
  updatedAt: string;
  moderator: UserProfile;
}

export interface ProjectFiler {
  id: number;
  name: string;
  stages: StageFilter[];
}
export interface StageFilter {
  id: number;
  name: string;
}

import { Files, SubTasks } from '@prisma/client';
import { DateOptions, PaginationOptions } from '@/types/types';

export interface UpperOrLowerParams {
  type: 'upper' | 'lower';
}

// ----------------------- TaskList --------------------------

export interface TaskListParams extends PaginationOptions, DateOptions {
  project?: number;
  stage?: number;
  status?: SubTasks['status'];
  salaryAdvance?: boolean;
  all?: boolean;
}

//----------------------- AtrributesMergeFilters --------------------------
export interface ParamsTask {
  status?: SubTasks['status'];
  equal?: boolean;
  type?: Files['type'];
  includeFiles?: boolean;
  includeLatestFeedbackFiles?: boolean;
  reviewFiles?: boolean;
  includeUsers?: boolean;
  endsWith?: string;
}
export interface ParamsMergePdfs {
  createFiles?: boolean;
  createCover?: boolean;
}

export interface AtrributesMergeFilters extends ParamsTask, ParamsMergePdfs {
  sourceDir: string;
  itemLevel?: string;
}

export interface PathAtributtes {
  rootId: number;
  rootLevel: number;
  item: string;
  path: string;
}
//---------------------------------------------------------------------------
export type ItemsToReduce<K> = Record<string, K>;

export interface SortingListType {
  id: SubTasks['id'];
  index: number;
}

export interface UpdateTaskDays {
  id: SubTasks['id'];
  days: number;
  price: number;
}
export interface UpdateTaskPrices {
  id: SubTasks['id'];
  price: number;
}

//------------------ Pricing -------------------------
export interface PricingListType {
  cost?: number;
  bachelor: number;
  professional: number;
  intern: number;
  graduate: number;
}
//------------------ Files -------------------------

export interface FilesType {
  dir: string;
  type: Files['type'];
  originalname?: string;
  subTasksId: number;
  name: string;
  author: string | null;
}

export interface FileParams {
  status: Files['type'];
}

//_------------------------------------------------------
export interface ProjectTask<T> {
  id: number;
  projectId?: number;
  budget?: number;
  name: string | null;
  cui?: string | null;
  tasks: T[];
  // info: K | null;
}

export interface ProjectInfo {
  cui: string;
  mod: string;
}

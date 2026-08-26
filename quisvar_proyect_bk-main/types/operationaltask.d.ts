import { OperationalFiles, OperationalTasks } from '@prisma/client';
import { DateOptions, PaginationOptions } from '@/types/types';

export type OperationalTasksForm = Pick<
  OperationalTasks,
  | 'name'
  | 'additionalInfo'
  | 'endTime'
  | 'startTime'
  | 'createdAt'
  | 'projectName'
  | 'description'
  | 'price'
  | 'userId'
  | 'time'
  | 'order'
>;

export type OperationFilesType = Pick<
  OperationalFiles,
  'dir' | 'author' | 'originalname' | 'name'
>;

export interface OperationalUpdatePosition {
  id: number;
  date: string;
  order: number;
}

export interface WeekDayInterface<k> {
  id: number;
  date: Date;
  tasks: k[];
  title: string;
  isActive: boolean;
}

export interface OptFilterUserTask<k = Date>
  extends PaginationOptions,
    DateOptions {
  currentDate: Date | k;
  sort: 'asc' | 'desc';
}

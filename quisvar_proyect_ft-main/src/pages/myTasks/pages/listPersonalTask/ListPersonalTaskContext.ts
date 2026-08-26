import { createContext } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';

import type { PaginationTable } from '@/types/types';
import type { MyTask } from '../../interfaces/myTasks.types';
import type { TypeStatus } from './interface/listPersonalTask.types';

interface ListPersonalTaskContextProps {
  handleSelectDataGlobal: (task: MyTask[]) => void;
  selectTasks: MyTask[];
  handleRowSelection: OnChangeFn<RowSelectionState>;
  rowSelection: RowSelectionState;
  handleDeleteSelectGlobal: (id: number) => void;
  query: {
    salaryAdvance: keyof typeof TypeStatus;
    project: string;
    stage: string;
    status: string;
    initialDate: string;
    untilDate: string;
  };
  handleResetSelectGlobal: () => void;
  handleSetSearchParams: (value: string, key: string) => void;
  projectTasksQuery: UseQueryResult<
    {
      total: number;
      tasks: MyTask[];
    },
    Error
  >;
  getProjectTaskPagination: (data: PaginationTable) => Promise<void>;
}

export const ListPersonalTaskContext = createContext(
  {} as ListPersonalTaskContextProps
);

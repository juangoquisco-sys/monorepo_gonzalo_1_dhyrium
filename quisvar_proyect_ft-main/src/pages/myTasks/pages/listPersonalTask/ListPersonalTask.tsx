import './listpersonalTask.css';

import { useState } from 'react';

import { TypeStatus } from './interface/listPersonalTask.types';
import HeaderPersonalTask from './components/headerPersonalTask/HeaderPersonalTask';
import TablePersonalTask from './components/tablePersonalTask/TablePersonalTask';
import TasksSelectView from './views/tasksSelectView/TasksSelectView';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import CardAddCollaborator from './views/cardAddCollaborator/CardAddCollaborator';
import { transformUniqueData } from '@/utils/tools';
import type { MyTask } from '../../interfaces/myTasks.types';
import useProjectTasks from '../../hooks/useProjectTasks';
import { ListPersonalTaskContext } from './ListPersonalTaskContext';

export const ListPersonalTask = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const { taskId } = useParams();
  const { projectTasksQuery, getProjectTaskPagination } =
    useProjectTasks<MyTask>('technical');

  const handleRowSelection: OnChangeFn<RowSelectionState> = values => {
    setRowSelection(values);
  };
  const [selectTasks, setSelectTasks] = useState<MyTask[]>([]);
  const handleSelectDataGlobal = (task: MyTask[]) => {
    const tasks = [...selectTasks, ...task];
    const uniqueTasks = transformUniqueData(tasks);
    const filteredTasks = uniqueTasks.filter(task => rowSelection[task.id]);
    setSelectTasks(filteredTasks);
  };

  const handleDeleteSelectGlobal = (id: number) => {
    const { [id]: _, ...resRowSelection } = rowSelection;
    setRowSelection(resRowSelection);
  };
  const handleResetSelectGlobal = () => {
    setRowSelection({});
    setSelectTasks([]);
  };

  const handleSetSearchParams = (value: string, key: string) => {
    if (key === 'project') {
      searchParams.delete('stage');
      searchParams.delete('status');
    }
    value ? searchParams.set(key, value) : searchParams.delete(key);
    setSearchParams(searchParams);
  };
  const query = {
    salaryAdvance: (searchParams.get('salaryAdvance') ??
      '') as keyof typeof TypeStatus,
    project: searchParams.get('project') ?? '',
    stage: searchParams.get('stage') ?? '',
    status: searchParams.get('status') ?? '',
    initialDate: searchParams.get('initialDate') ?? '',
    untilDate: searchParams.get('untilDate') ?? '',
  };

  return (
    <ListPersonalTaskContext.Provider
      value={{
        handleSelectDataGlobal,
        selectTasks,
        query,
        handleSetSearchParams,
        handleRowSelection,
        rowSelection,
        handleDeleteSelectGlobal,
        handleResetSelectGlobal,
        projectTasksQuery,
        getProjectTaskPagination,
      }}
    >
      <div className="listPersonalTask">
        {/* <GeneralTitle firstTitle="MIS TAREAS" fontSize={1.3} /> */}
        <div
          className={`listPersonalTask-container ${
            taskId && 'task-card-route'
          }`}
        >
          <div className="listPersonalTask-contain-principal">
            <HeaderPersonalTask />
            <TablePersonalTask />
          </div>
          {query.salaryAdvance && <TasksSelectView />}
        </div>
        <CardAddCollaborator />
        <Outlet />
      </div>
    </ListPersonalTaskContext.Provider>
  );
};

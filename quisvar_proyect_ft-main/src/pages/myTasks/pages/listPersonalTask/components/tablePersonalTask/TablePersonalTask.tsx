import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { formatDateTimeUtc } from '@/utils/dayjsSpanish';
import './tablePersonalTask.css';
import { StatusText } from '../../../../../specialities/pages/project/components/statusText/StatusText';
import Button from '@/components/button/Button';
import IndeterminateCheckbox from '@/components/indeterminateCheckbox/IndeterminateCheckbox';
import IndeterminateCheckboxAll from '@/components/indeterminateCheckbox/IndeterminateCheckboxAll';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import Table from '@/components/table/Table';
import TableHead from '@/components/table/TableHead';
import TableNoData from '@/components/table/TableNoData';
import TablePagination from '@/components/table/TablePagination';
import TableTr from '@/components/table/TableTr';
import { useSearchParams } from 'react-router-dom';
import { Fragment, useContext, useEffect, useState } from 'react';
import type { PaginationTable } from '@/types/types';
import { ListPersonalTaskContext } from '../../ListPersonalTaskContext';
import ProjectNameTr from '@/pages/myTasks/components/projectNameTr/ProjectNameTr';
import {
  PiUserListFill,
  PiArrowSquareOutFill,
  PiEyeBold,
} from 'react-icons/pi';
import {
  changeStatusTask$,
  isOpenCardAddCollaborator$,
} from '@/services/sharingSubject';
import { formatAmountMoneyPEN, getFullName } from '@/utils/tools';
import useNavigateWithParams from '@/hooks/useNavigateWithParams';
import type { MyTask } from '../../../../interfaces/myTasks.types';
import { handleProjectNavigate } from '../../../../tools/projectNavigation';

const TablePersonalTask = () => {
  // const navigate = useNavigate();
  const navigateWithParams = useNavigateWithParams();
  const {
    handleSelectDataGlobal,
    rowSelection,
    handleRowSelection,
    query,
    projectTasksQuery,
    getProjectTaskPagination,
  } = useContext(ListPersonalTaskContext);

  // const { taskId } = useParams();

  const [searchParams] = useSearchParams();

  const [pagination, setPagination] = useState<PaginationTable>({
    pageIndex: +(searchParams.get('page') ?? 0),
    pageSize: +(searchParams.get('limit') ?? 50),
  });

  useEffect(() => {
    getProjectTaskPagination(pagination);
  }, [pagination]);

  useEffect(() => {
    if (!handleSelectDataGlobal) return;
    const dataSelection = table
      .getSelectedRowModel()
      .rows.map(({ original }) => original);
    handleSelectDataGlobal(dataSelection);
  }, [rowSelection]);

  useEffect(() => {
    const subscription = changeStatusTask$.getSubject.subscribe(() =>
      projectTasksQuery.refetch()
    );
    return () => subscription.unsubscribe();
  }, []);

  const handleTaskNavigate = (taskId: number) =>
    navigateWithParams(`tarea/${taskId}`);

  const columnHelper = createColumnHelper<MyTask>();

  const columns = [
    ...(query.salaryAdvance
      ? [
          columnHelper.display({
            id: 'select',

            cell: ({ row }) => (
              <IndeterminateCheckbox
                key={row.original.id}
                checked={row.getIsSelected()}
                disabled={!row.getCanSelect()}
                indeterminate={row.getIsSomeSelected()}
                onChange={row.getToggleSelectedHandler()}
              />
            ),
            meta: {
              sticky: 'left',
            },
          }),
        ]
      : []),
    columnHelper.accessor('taskInfo.updatedAt', {
      header: 'ÚLTIMA MODIFICACIÓN',
      cell: ({ getValue }) =>
        getValue() ? formatDateTimeUtc(getValue()) : '---',
    }),
    columnHelper.accessor('assignedAt', {
      header: 'ASIGNACIÓN',
      cell: ({ getValue }) =>
        getValue() ? formatDateTimeUtc(getValue()) : '---',
    }),
    columnHelper.accessor('taskInfo', {
      id: 'TAREA',
      header: 'TAREA',
      cell: ({ getValue }) => (
        <div className="tablePersonalTask-task-name text-ellipsis">
          {getValue().item} {getValue().name}
        </div>
      ),
      enableGrouping: true,
    }),
    columnHelper.accessor('taskInfo', {
      header: 'EVALUADOR',
      id: 'EVALUADOR',
      cell: ({ getValue }) => (
        <div className="tablePersonalTask-evaluator text-ellipsis">
          {getFullName(getValue().moderator)}
        </div>
      ),
    }),
    columnHelper.accessor('taskInfo', {
      header: 'DIAS',
      id: 'DIAS',
      cell: info => info.getValue().days + ' dias',
    }),
    ...(query.salaryAdvance
      ? [
          columnHelper.accessor('taskInfo', {
            header: 'COSTO DEL ITEM',
            id: 'PRICE',
            cell: ({ getValue }) => formatAmountMoneyPEN(getValue().price),
          }),
          columnHelper.accessor('percentage', {
            header: '% AVANCE',
            cell: info => info.getValue() + '%',
          }),
          columnHelper.accessor('percentage', {
            header: 'CORRESPONDE',
            id: 'CORRESPONDE',
            cell: ({ getValue, row: { original } }) =>
              formatAmountMoneyPEN(
                +original.taskInfo.price * (+getValue() / 100)
              ),
          }),
        ]
      : [
          columnHelper.accessor('percentage', {
            header: '% AVANCE',
            cell: info => info.getValue() + '%',
          }),
        ]),
    columnHelper.accessor('taskInfo.status', {
      header: 'ESTADO',
      id: 'ESTADO',
      cell: ({ getValue }) => (
        <div style={{ display: 'inline-block' }}>
          <StatusText status={getValue()} />
        </div>
      ),
    }),

    columnHelper.accessor('groupId', {
      header: 'ACCIÓN',
      cell: ({ getValue, row: { original } }) => (
        <div className="tablePersonalTask-actions">
          {query.salaryAdvance && (
            <Button
              onClick={() => handleViewColaborator(original)}
              leftIcon={<PiUserListFill size={14} color="#fff" />}
              style={{ padding: '0.2rem' }}
              color={getValue() ? 'secondary' : 'gray'}
              disabled={!!getValue()}
              size="xxs"
            />
          )}
          {!query.salaryAdvance && (
            <PiEyeBold
              cursor="pointer"
              onClick={() => handleTaskNavigate(original.taskInfo.id)}
              size={18}
            />
          )}
          <PiArrowSquareOutFill
            size={18}
            cursor="pointer"
            onClick={() =>
              handleProjectNavigate(
                original.projectId,
                original.stageId,
                original.taskInfo.id
              )
            }
          />
        </div>
      ),
    }),
  ];
  const handleViewColaborator = (task: MyTask) => {
    isOpenCardAddCollaborator$.setSubject = {
      isOpen: true,
      task,
      onReloadList: () => () => projectTasksQuery.refetch(),
    };
  };
  const getRowId = (originalRow: MyTask) => originalRow.id.toString();

  const table = useReactTable({
    data: projectTasksQuery.data?.tasks ?? [],
    columns,
    rowCount: projectTasksQuery.data?.total,
    state: {
      pagination,
      rowSelection,
    },
    getRowId,
    enableRowSelection: true,
    onRowSelectionChange: handleRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <>
      <div className="tablePersonalTask-container">
        {query.salaryAdvance && (
          <IndeterminateCheckboxAll
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        )}
        {projectTasksQuery.data?.tasks ? (
          projectTasksQuery.data.tasks.length > 0 ? (
            <Table table={table}>
              {table.getRowModel().rows.map(row => (
                <Fragment key={row.id}>
                  {row.original.projectName && (
                    <TableHead
                      position="relative"
                      trUp={
                        <ProjectNameTr projectName={row.original.projectName} />
                      }
                    />
                  )}
                  <tbody>
                    <TableTr row={row} backgroundColor="#fff" />
                  </tbody>
                </Fragment>
              ))}
            </Table>
          ) : (
            <TableNoData />
          )
        ) : (
          <LoaderForComponent />
        )}
      </div>
      <TablePagination
        isLoading={projectTasksQuery.isFetching}
        table={table}
        total={projectTasksQuery.data?.total || 0}
        pagination={pagination}
      />
    </>
  );
};

export default TablePersonalTask;

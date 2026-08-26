import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import './tableTaskForReview.css';
import Button from '@/components/button/Button';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import Table from '@/components/table/Table';
import TableHead from '@/components/table/TableHead';
import TableNoData from '@/components/table/TableNoData';
import TablePagination from '@/components/table/TablePagination';
import TableTr from '@/components/table/TableTr';
import useProjectTasks from '../../../../hooks/useProjectTasks';
import type { ModTask } from '../../../../interfaces/myTasks.types';
import { formatDateTimeUtc } from '@/utils/dayjsSpanish';
import { StatusText } from '../../../../../specialities/pages/project/components/statusText/StatusText';
import {
  PiArrowClockwiseBold,
  PiArrowSquareOutFill,
  PiEyeBold,
} from 'react-icons/pi';
import useNavigateWithParams from '@/hooks/useNavigateWithParams';
import { Fragment, useEffect, useState } from 'react';
import type { PaginationTable } from '@/types/types';
import { useSearchParams } from 'react-router-dom';
import ProjectNameTr from '@/pages/myTasks/components/projectNameTr/ProjectNameTr';
import { getFullName } from '@/utils/tools';
import { handleProjectNavigate } from '../../../../tools/projectNavigation';
import { changeStatusTask$ } from '@/services/sharingSubject';

const TableTaskForReview = () => {
  const [searchParams] = useSearchParams();

  const { projectTasksQuery, getProjectTaskPagination } =
    useProjectTasks<ModTask>('evaluator');
  const navigateWithParams = useNavigateWithParams();

  useEffect(() => {
    const subscription = changeStatusTask$.getSubject.subscribe(() =>
      projectTasksQuery.refetch()
    );
    return () => subscription.unsubscribe();
  }, []);

  const [pagination, setPagination] = useState<PaginationTable>({
    pageIndex: +(searchParams.get('page') ?? 0),
    pageSize: +(searchParams.get('limit') ?? 50),
  });

  useEffect(() => {
    getProjectTaskPagination(pagination);
  }, [pagination]);
  const handleTaskNavigate = (taskId: number) =>
    navigateWithParams(`tarea/${taskId}`);

  const columnHelper = createColumnHelper<ModTask>();

  const columns = [
    columnHelper.accessor('updatedAt', {
      header: 'ÚLTIMA MODIFICACIÓN',
      cell: ({ getValue }) =>
        getValue() ? formatDateTimeUtc(getValue()) : '---',
    }),
    columnHelper.accessor(({ name, item }) => `${item} ${name}`, {
      id: 'TAREA',
      header: 'TAREA',
      cell: ({ getValue }) => (
        <div className="tableTaskForReview-task-name text-ellipsis">
          {getValue()}
        </div>
      ),
      enableGrouping: true,
    }),
    columnHelper.accessor('user', {
      header: 'ENCARGADO',
      id: 'EVALUADOR',
      cell: ({ getValue }) => (
        <div className="tableTaskForReview-evaluator text-ellipsis">
          {getFullName(getValue())}
        </div>
      ),
    }),
    columnHelper.accessor('days', {
      header: 'DIAS',
      id: 'DIAS',
      cell: info => info.getValue() + ' dias',
    }),
    columnHelper.accessor('percentage', {
      header: '%',
      cell: info => info.getValue() + '%',
    }),
    columnHelper.accessor('status', {
      header: 'ESTADO',
      id: 'ESTADO',
      cell: ({ getValue }) => (
        <div style={{ display: 'inline-block' }}>
          <StatusText status={getValue()} />
        </div>
      ),
    }),

    columnHelper.accessor('id', {
      header: 'ACCIÓN',
      cell: ({ row: { original }, getValue }) => (
        <div className="tableTaskForReview-actions">
          <PiEyeBold
            cursor="pointer"
            onClick={() => handleTaskNavigate(getValue())}
            size={18}
          />
          <PiArrowSquareOutFill
            size={18}
            cursor="pointer"
            onClick={() =>
              handleProjectNavigate(
                original.projectId,
                original.stageId,
                original.id
              )
            }
          />
        </div>
      ),
    }),
  ];
  const table = useReactTable({
    data: projectTasksQuery.data?.tasks ?? [],
    columns,
    rowCount: projectTasksQuery.data?.total,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <>
      <div className="tableTaskForReview-container">
        <Button
          leftIcon={<PiArrowClockwiseBold size={17} />}
          color="gray"
          size="xxs"
          onClick={() => projectTasksQuery.refetch()}
          borderRadius={10}
          position="right"
        />
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

export default TableTaskForReview;

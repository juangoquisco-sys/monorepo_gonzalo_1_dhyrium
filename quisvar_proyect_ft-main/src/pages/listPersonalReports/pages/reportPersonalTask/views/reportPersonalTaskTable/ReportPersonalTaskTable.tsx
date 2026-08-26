import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { ReportingTask } from '../../../../interface/report.types';
import { formatDateUtc } from '@/utils/dayjsSpanish';
import DivFlex from '@/components/divFlex/DivFlex';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import Table from '@/components/table/Table';
import TableHead from '@/components/table/TableHead';
import TableTr from '@/components/table/TableTr';
import {
  Fragment,
  useContext,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CellAmount,
  CellDay,
  CellPercentage,
} from '@/components/table/component/TableCells';
import { PiArrowSquareOutFill, PiEyeBold } from 'react-icons/pi';
import { formatTwoDecimals } from '@/utils/tools';
import { InputFocusProvider } from '@/context/InputFocusContext';
import ProjectNameTr from '@/pages/myTasks/components/projectNameTr/ProjectNameTr';
import { PersonalReportContext } from '../../../../context/PersonalReportContext';
import TaskCheckCell from '../../components/taskCheckCell/TaskCheckCell';
import { handleProjectNavigate } from '../../../../../myTasks/tools/projectNavigation';
import './reportPersonalTaskTable.css';

interface ReportPersonalTaskTableProps {
  tasks: ReportingTask[] | null;
  setTasks: Dispatch<SetStateAction<ReportingTask[] | null>>;
  isAdministrative?: boolean;
}

const ReportPersonalTaskTable = ({
  tasks,
  setTasks,
  isAdministrative = false,
}: ReportPersonalTaskTableProps) => {
  const navigate = useNavigate();

  const { editValues, noViewActionsRow, noViewSidebar } = useContext(
    PersonalReportContext
  );

  const handleTaskNavigate = (taskId: number) => {
    navigate(`tarea/${taskId}`, { state: { viewHistory: noViewSidebar } });
  };

  const columnHelper = createColumnHelper<ReportingTask>();
  const columns = [
    columnHelper.accessor(({ item, taskInfo }) => `${item} ${taskInfo.name}`, {
      header: 'TAREA',
      cell: ({ getValue }) => (
        <div className="tablePersonalTask-task-name text-ellipsis">
          {getValue()}
        </div>
      ),
    }),
    columnHelper.accessor(({ taskInfo }) => taskInfo.days, {
      id: 'taskInfo_days',
      header: 'DIAS',
      cell: CellDay,
    }),
    columnHelper.accessor(({ taskInfo }) => taskInfo.price, {
      id: 'taskInfo_price',
      header: 'COSTO DEL ITEM',
      cell: CellAmount,
    }),
    columnHelper.accessor('assignedAt', {
      header: 'FECHA DE INICIO',
      cell: ({ getValue }) => formatDateUtc(getValue()),
    }),
    columnHelper.accessor('finishedAt', {
      header: 'FECHA DE TÉRMINO',
      cell: ({ getValue }) => formatDateUtc(getValue()),
    }),
    columnHelper.accessor('percentage', {
      id: 'percentage',
      header: '% AVANCE',
      cell: CellPercentage,
    }),
    columnHelper.accessor(
      ({ taskInfo, percentage }) => taskInfo.price * (percentage / 100),
      {
        header: 'COSTO FINAL',
        id: 'price',
        cell: CellAmount,
      }
    ),

    ...(!noViewActionsRow
      ? [
          columnHelper.accessor('taskId', {
            header: 'ACCIÓN',
            cell: ({ getValue, row: { original } }) => (
              <DivFlex gap={0.7}>
                <PiEyeBold
                  cursor="pointer"
                  size={18}
                  onClick={() => handleTaskNavigate(getValue())}
                />
                <PiArrowSquareOutFill
                  onClick={() =>
                    handleProjectNavigate(
                      original.projectId,
                      original.stageId,
                      original.taskId
                    )
                  }
                  cursor="pointer"
                  size={18}
                />
              </DivFlex>
            ),
          }),
        ]
      : []),
    ...(editValues
      ? [
          columnHelper.accessor('isAuthorized', {
            header: () => '',
            cell: TaskCheckCell,
          }),
        ]
      : []),
  ];

  const table = useReactTable({
    data: tasks ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      editedRows: editValues,
      updateData: (rowIndex, columnId, value) => {
        const valueTransform = Number(value);
        setTasks(old =>
          old!.map((row, index) => {
            if (index !== rowIndex) return row;
            const [columnName, subColumnName] = columnId.split('_');
            if (columnName === 'isAuthorized') {
              return { ...row, [columnName]: value as boolean };
            }
            let updatedRow = {
              ...row,
              [columnName]: valueTransform,
              taskInfo: {
                ...row.taskInfo,
                ...(subColumnName && { [subColumnName]: valueTransform }),
              },
            };
            if (columnName === 'percentage') {
              updatedRow.price = formatTwoDecimals(
                updatedRow.taskInfo.price * (valueTransform / 100)
              );
            } else if (columnName === 'price') {
              const priceReport =
                valueTransform / (updatedRow.percentage / 100);
              updatedRow.taskInfo = {
                ...updatedRow.taskInfo,
                price: formatTwoDecimals(
                  valueTransform / (updatedRow.percentage / 100)
                ),
                days: formatTwoDecimals(
                  priceReport / updatedRow.taskInfo.initialCost
                ),
              };
            } else if (subColumnName === 'price') {
              updatedRow.price = formatTwoDecimals(
                valueTransform * (updatedRow.percentage / 100)
              );
              updatedRow.taskInfo.days = formatTwoDecimals(
                valueTransform / updatedRow.taskInfo.initialCost
              );
            } else if (subColumnName === 'days') {
              updatedRow.price = formatTwoDecimals(
                updatedRow.taskInfo.initialCost *
                  valueTransform *
                  (updatedRow.percentage / 100)
              );
              updatedRow.taskInfo.price = formatTwoDecimals(
                valueTransform * updatedRow.taskInfo.initialCost
              );
            }
            return updatedRow;
          })
        );
      },
    },
  });

  return (
    <InputFocusProvider
      colNumber={columns.length}
      className="reportPersonalTaskView-table"
    >
      {tasks ? (
        <Table table={table}>
          {table.getRowModel().rows.map(row => (
            <Fragment key={row.id}>
              {row.original.projectName && (
                <TableHead
                  position="relative"
                  trUp={
                    <ProjectNameTr
                      projectName={row.original.projectName}
                      stagePrice={
                        editValues && !isAdministrative
                          ? row.original.stagePrice
                          : undefined
                      }
                    />
                  }
                />
              )}
              <tbody>
                <tr>
                  <td
                    colSpan={columns.length}
                    className="reportPersonalTaskView-table-parentLevels"
                    dangerouslySetInnerHTML={{
                      __html:
                        row.original.parentLevels?.join(
                          ' &nbsp;&nbsp;&nbsp; ⇨ &nbsp;&nbsp;&nbsp; '
                        ) ?? '',
                    }}
                  />
                </tr>
                <TableTr row={row} backgroundColor="#fff" />
              </tbody>
            </Fragment>
          ))}
        </Table>
      ) : (
        <LoaderForComponent />
      )}
    </InputFocusProvider>
  );
};

export default ReportPersonalTaskTable;

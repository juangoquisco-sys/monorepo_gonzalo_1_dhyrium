import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import type { DayKanban, TaskItems } from '../../../../interface/report.types';
import './reportKanbanTask.css';
import { MdRemoveRedEye } from 'react-icons/md';
import Table from '@/components/table/Table';
import TableBody from '@/components/table/TableBody';
import TableHead from '@/components/table/TableHead';
import { formatDateWeekdayUtc } from '@/utils/dayjsSpanish';
import { isOpenCardViewWidget$ } from '@/services/sharingSubject';
import useRole from '@/hooks/useRole';
interface RepostTableProps {
  tasks: DayKanban[];
}
const ReportKanbanTable = ({ tasks }: RepostTableProps) => {
  const { hasAccess } = useRole('MOD', 'mis-tareas');

  const columns: ColumnDef<DayKanban>[] = [
    {
      header: 'FECHA',
      cell: info => (
        <div style={{ width: '6.5rem' }}>
          {formatDateWeekdayUtc(info.row.original.date)}
        </div>
      ),
    },
    {
      header: 'ITEM',
      cell: info => (
        <div
          style={{ width: '100%', textAlign: 'center' }}
          className="rkt-cell-content"
        >
          {info.row.original.tasks.map((task, index) => (
            <div key={task.id} className="rkt-task-name">
              {index + 1}
            </div>
          ))}
        </div>
      ),
    },
    {
      header: 'TAREA',
      cell: info => (
        <div style={{ width: '20rem' }} className="rkt-cell-content">
          {info.row.original.tasks.map(task => (
            <div key={task.id} className="rkt-task-name">
              {task.name}
            </div>
          ))}
        </div>
      ),
    },
    {
      header: 'PROYECTO',
      cell: info => (
        <div style={{ width: '4rem' }} className="rkt-cell-content">
          {info.row.original.tasks.map(task => (
            <div key={task.id} className="rkt-project-content ">
              <h1 className="kw-project-text ">
                {task.projectName ?? 'Sin proyecto'}
              </h1>
            </div>
          ))}
        </div>
      ),
    },
    {
      header: 'VER TAREA',
      cell: info => (
        <div
          style={{ width: '100%', textAlign: 'center' }}
          className="rkt-cell-content"
        >
          {info.row.original.tasks.map(task => (
            <div key={task.id} className="rkt-task-name">
              <MdRemoveRedEye
                onClick={() => handleViewDetails(task)}
                className="rkt-eye"
              />
            </div>
          ))}
        </div>
      ),
    },
    ...(hasAccess
      ? ([
          {
            header: 'VALIDAR',
            cell: info => (
              <div
                style={{ width: '100%', textAlign: 'center' }}
                className="rkt-cell-content"
              >
                {info.row.original.tasks.map(task => (
                  <div key={task.id} className="rkt-task-name">
                    <input type="checkbox" onClick={() => {}} />
                  </div>
                ))}
              </div>
            ),
          },
        ] as ColumnDef<DayKanban>[])
      : []),
  ];
  const table = useReactTable({
    data: tasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const handleViewDetails = (task: TaskItems) => {
    isOpenCardViewWidget$.setSubject = {
      isOpen: true,
      task,
    };
  };
  return (
    <div className="rkt-table-container">
      <Table table={table}>
        <TableHead />
        <TableBody />
      </Table>
    </div>
  );
};

export default ReportKanbanTable;

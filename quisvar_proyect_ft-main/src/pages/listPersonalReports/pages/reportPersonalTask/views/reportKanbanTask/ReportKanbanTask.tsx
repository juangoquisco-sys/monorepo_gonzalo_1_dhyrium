import { formatDayMonthTimeUtc } from '@/utils/dayjsSpanish';
import CardViewWidget from '../../../../../kanbanTask/views/cardViewWidget/CardViewWidget';
import type { TaskKanban } from '../../../../interface/report.types';
import ReportKanbanTable from './ReportKanbanTable';
import './reportKanbanTask.css';

interface ReportKanbanTaskProps {
  tasks: TaskKanban[];
}
const ReportKanbanTask = ({ tasks }: ReportKanbanTaskProps) => {
  return (
    <div className="rkt-main">
      {tasks
        .filter(task => task.days.some(day => day.tasks.length > 0))
        .map(task => (
          <div key={task.id} className="rkt-container">
            <h1 className="rkt-title">
              {'Semana del ' +
                formatDayMonthTimeUtc(task.initialDateWeek) +
                ' al ' +
                formatDayMonthTimeUtc(task.finalDateWeek)}
            </h1>
            <ReportKanbanTable
              tasks={task.days.filter(day => day.tasks.length)}
            />
          </div>
        ))}
      <CardViewWidget />
    </div>
  );
};

export default ReportKanbanTask;

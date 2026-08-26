import './mytaskcard.css';
import type { SubtaskIncludes } from '@/types/types';
import { _date } from '@/utils/formatDate';
import { useNavigate } from 'react-router-dom';

interface TaskCardProps {
  subTask: SubtaskIncludes;
}

const MyTaskCard = ({ subTask }: TaskCardProps) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    const { id: stageId, projectId } = subTask.Levels.stages;
    navigate(
      `../especialidades/proyecto/${projectId}/etapa/${stageId}/presupuestos/tarea/${subTask.id}`
    );
  };

  return (
    <div className={`my-task-class`}>
      <div className="my-task-content">
        <span
          className={`my-icon-card ${
            subTask.status === 'DONE'
              ? 'my-icon-card-done'
              : subTask.status === 'PROCESS'
              ? 'my-icon-card-process'
              : 'my-icon-card-denied'
          }`}
        >
          <img
            src={
              subTask.status === 'DONE'
                ? 'svg/task_done.svg'
                : subTask.status === 'PROCESS'
                ? 'svg/icon_list_task.svg'
                : 'svg/task_unresolved.svg'
            }
          />
        </span>
        <span>
          {subTask.item} {subTask.name}
        </span>
        <span>S/.{subTask.price}</span>
        <h3>Fecha: {`${subTask.createdAt && _date(subTask.createdAt)}`}</h3>
        <span
          className={`task-text ${
            subTask.status === 'DONE'
              ? 'my-icon-card-done-color'
              : subTask.status === 'PROCESS'
              ? 'my-icon-card-process-color'
              : 'my-icon-card-denied-color'
          }`}
        >
          {subTask.status === 'DENIED' && 'CORREGIR'}
          {subTask.status === 'PROCESS' && 'EN PROCESO'}
          {subTask.status === 'INREVIEW' && 'POR REVISAR'}
          {subTask.status === 'DONE' && 'HECHO'}
        </span>
        <span onClick={handleNavigate}>
          <b>Ver más</b>
        </span>
      </div>
    </div>
  );
};

export default MyTaskCard;

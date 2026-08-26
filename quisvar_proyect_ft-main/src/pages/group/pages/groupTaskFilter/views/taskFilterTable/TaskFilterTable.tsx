import { NavLink } from 'react-router-dom';
import type { DayTasks } from '../../../../types/types.response';
import './taskFilterTable.css';
import StatusText from '@/pages/specialities/components/taskStatusText/TaskStatusText';
// const URL = window.location.origin;
import { formatDateTimeUtc, formatDayMonthTimeUtc } from '@/utils/dayjsSpanish';
import { useDispatch } from 'react-redux';
import { setModAuthProject } from '@/store/slices/modAuthProject.slice';
import { useEffect } from 'react';
import type { TaskStatusValue } from '@/pages/specialities/models/taskStatusText';
interface TaskFilterProps {
  data: DayTasks;
}
const TaskFilterTable = ({ data }: TaskFilterProps) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setModAuthProject(true));
    return () => {
      dispatch(setModAuthProject(false));
    };
  }, [data]);

  return (
    <div className="tft-main">
      <div className="tft-sticky">
        <h1 className="tft-title">
          {data?.day + ' ' + formatDayMonthTimeUtc(data.date)}
        </h1>
        <div className="tft-header">
          <h2 className="tft-htitle">ULTIMA MODIFICACION</h2>
          <h2 className="tft-htitle">PROYECTO</h2>
          <h2 className="tft-htitle">ETAPA</h2>
          <h2 className="tft-htitle">TAREA</h2>
          <h2 className="tft-htitle">USUARIO</h2>
          <h2 className="tft-htitle">DIAS</h2>
          <h2 className="tft-htitle">ESTADO</h2>
        </div>
      </div>
      {data.tasks &&
        data.tasks.map((task, index) => (
          <NavLink
            className={({ isActive }) =>
              `tft-body pointer ${isActive && 'levelSubtask-content-active'}`
            }
            key={index}
            to={`tarea/${task.subTask}`}
          >
            <h2 className="tft-htitle">{formatDateTimeUtc(task.updatedAt)}</h2>
            <h2 className="tft-htitle">{task.project}</h2>
            <h2 className="tft-htitle">{task.stage}</h2>
            <h2 className="tft-htitle" style={{ textAlign: 'left' }}>
              {(task.item || '  ') + ' ' + task.name}
            </h2>
            <h2 className="tft-htitle">
              {task.user
                ? task.user.firstName + ' ' + task.user.lastName
                : 'No asignado'}
            </h2>
            <h2 className="tft-htitle">{task.days}</h2>
            <h2 className="tft-htitle">
              <StatusText status={task.status as TaskStatusValue} />
            </h2>
          </NavLink>
        ))}
    </div>
  );
};

export default TaskFilterTable;

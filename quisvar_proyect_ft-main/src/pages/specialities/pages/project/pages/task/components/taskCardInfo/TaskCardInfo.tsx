import { useContext, useEffect, type ReactNode } from 'react';
import { TaskContext } from '../taskCard/TaskCard';
import { PiCalendarDots, PiHourglassMedium, PiPercent } from 'react-icons/pi';
import StatusText from '@/pages/specialities/components/taskStatusText/TaskStatusText';
import './taskCardInfo.css';
import dayjsSpanish, { formatFullDateUtc } from '@/utils/dayjsSpanish';
import { formatTwoDecimals } from '@/utils/tools';
import { changeStatusTask$ } from '@/services/sharingSubject';

interface DataTaskInfo {
  icon: ReactNode;
  label: string;
  value: string;
}

const TaskCardInfo = () => {
  const { task } = useContext(TaskContext);

  const assignedUser = task.users?.ACTIVE?.[0].assignedAt;
  const finishDate = dayjsSpanish(assignedUser).add(task.days, 'day');
  const calculateBetweenDates = (
    initDate: Date,
    finishDate: dayjsSpanish.Dayjs
  ) => {
    const beetweenDays = dayjsSpanish(finishDate).diff(initDate, 'hour');
    const beetweenDaysBase10 = beetweenDays / 24;
    return beetweenDaysBase10.toFixed(1);
  };

  const beetweenDays = calculateBetweenDates(new Date(), finishDate);

  useEffect(() => {
    changeStatusTask$.setSubject = {};
  }, [task.status]);

  const data: (DataTaskInfo | ReactNode)[][] = [
    [
      {
        icon: <PiHourglassMedium />,
        label: 'Dias restantes',
        value: assignedUser
          ? `${formatTwoDecimals(beetweenDays)}  ${
              +beetweenDays === 1 ? 'dia' : 'dias'
            }`
          : '---',
      },
      <StatusText status={task.status} />,
    ],
    [
      {
        icon: <PiPercent />,
        label: 'Porcentaje de avance',
        value: assignedUser && task.percentage ? task.percentage + '%' : '---',
      },
      {
        icon: <PiHourglassMedium />,
        label: 'Total de días',
        value: `${formatTwoDecimals(task.days)} ${
          task.days === 1 ? 'dia' : 'dias'
        }`,
      },
    ],
    [
      {
        icon: <PiCalendarDots />,
        label: 'Fecha de inicio',
        value: assignedUser ? formatFullDateUtc(assignedUser) : '---',
      },
    ],
  ];
  const isDataTaskInfo = (
    item: DataTaskInfo | ReactNode
  ): item is DataTaskInfo =>
    typeof item === 'object' &&
    item !== null &&
    'icon' in item &&
    'label' in item &&
    'value' in item;

  return (
    <div className="taskCardInfo">
      {data.map((row, i) => (
        <div
          key={i}
          className="taskCardInfo-row"
          style={{ gridTemplateColumns: `2fr 1fr` }}
        >
          {row.map((item, i) =>
            isDataTaskInfo(item) ? (
              <div className="taskCardInfo-column" key={i}>
                <span className="taskCardInfo-column-value">{item.value}</span>
                <span className="taskCardInfo-column-label">
                  {item.icon} {item.label}
                </span>
              </div>
            ) : (
              <div className="taskCardInfo-column-status" key={i}>
                {item}
              </div>
            )
          )}
        </div>
      ))}
    </div>
  );
};

export default TaskCardInfo;

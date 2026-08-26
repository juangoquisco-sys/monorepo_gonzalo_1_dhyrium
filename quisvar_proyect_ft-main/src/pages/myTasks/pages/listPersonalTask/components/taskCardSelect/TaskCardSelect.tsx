import { COLOR_CSS } from '@/utils/cssData';
import { IoCheckmarkCircleOutline, IoTrash } from 'react-icons/io5';
import './taskCardSelect.css';
import { useContext } from 'react';
import { ListPersonalTaskContext } from '../../ListPersonalTaskContext';
import type { MyTask } from '../../../../interfaces/myTasks.types';
import { formatAmountMoneyPEN } from '@/utils/tools';
interface TaskCardSelectProps {
  task: MyTask;
}
const TaskCardSelect = ({ task }: TaskCardSelectProps) => {
  const { handleDeleteSelectGlobal } = useContext(ListPersonalTaskContext);
  return (
    <div className="taskCardSelect">
      <div className="taskCardSelect-container">
        <IoCheckmarkCircleOutline color={COLOR_CSS.primary} size={21} />
        <div className="taskCardSelect-info">
          <span className="taskCardSelect-info-item">{task.taskInfo.item}</span>
          <span className="taskCardSelect-info-name">{task.taskInfo.name}</span>
        </div>
      </div>
      <div className="taskCardSelect-footer">
        <span className="taskCardSelect-price">
          {formatAmountMoneyPEN(task.taskInfo.price * (task.percentage / 100))}
        </span>

        <IoTrash
          color={COLOR_CSS.danger}
          size={18}
          cursor={'pointer'}
          onClick={() => handleDeleteSelectGlobal(task.id)}
        />
      </div>
    </div>
  );
};

export default TaskCardSelect;

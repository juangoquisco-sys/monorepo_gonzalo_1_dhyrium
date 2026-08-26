import './taskStatusText.css';
import {
  STATUS_TEXT,
  type TaskStatusValue,
} from '@/pages/specialities/models/taskStatusText';

export interface TaskStatusTextProps {
  status: TaskStatusValue;
  onClick?: () => void;
}

const TaskStatusText = ({ status, onClick }: TaskStatusTextProps) => {
  return (
    <div
      onClick={onClick}
      className={`statusText  ${status} ${onClick && 'statusText-cursor'}`}
    >
      {STATUS_TEXT[status]}
    </div>
  );
};

export default TaskStatusText;

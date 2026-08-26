import { FeedbackType } from '../../../../models/definitiosProject';
import './taskStatusFeedback.css';

const STATUS: Record<FeedbackType, string> = {
  [FeedbackType.ACCEPTED]: 'Validado',
  [FeedbackType.REJECTED]: 'Rechazado',
  [FeedbackType.HOLDING]: 'En espera',
};
interface TaskStatusFeedbackPros {
  type: FeedbackType;
  className?: string;
}
const TaskStatusFeedback = ({ type, className }: TaskStatusFeedbackPros) => {
  return (
    <span
      className={`taskStatusFeedback-header-status taskStatusFeedback-${type} ${className}`}
    >
      {STATUS[type]}
    </span>
  );
};

export default TaskStatusFeedback;

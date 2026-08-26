import { useContext } from 'react';
import IconProfile from '@/components/iconProfile/IconProfile';
import TextArea from '@/components/textArea/TextArea';
import { TaskContext } from '../taskCard/TaskCard';
import './taskFeedbackInfo.css';
import dayjsSpanish from '@/utils/dayjsSpanish';
import TaskStatusFeedback from '../taskStatusFeedback/TaskStatusFeedback';

const TaskFeedbackInfo = () => {
  const { task } = useContext(TaskContext);
  const { lastFeedback } = task;
  if (!lastFeedback.comment || !lastFeedback.reviewer) return <></>;
  const reviewer = JSON.parse(lastFeedback.reviewer) as {
    fullname: string;
    dni: string;
  };
  return (
    <div className="taskFeedbackInfo">
      <div className="taskFeedbackInfo-header">
        <span className="taskFeedbackInfo-header-user">
          <IconProfile dni={reviewer.dni} size={1.3} />
          {reviewer.fullname}
          <span className="taskFeedbackInfo-header-date">
            {dayjsSpanish(lastFeedback.createdAt).format(
              'ddd DD/MM/YY [a las] HH:mm'
            )}
          </span>
        </span>
        <TaskStatusFeedback type={lastFeedback.type} />
      </div>
      <TextArea
        style={{ resize: 'unset' }}
        value={lastFeedback.comment}
        disabled
      />
    </div>
  );
};

export default TaskFeedbackInfo;

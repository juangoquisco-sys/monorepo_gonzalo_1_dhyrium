import IconProfile from '@/components/iconProfile/IconProfile';
import TextArea from '@/components/textArea/TextArea';
import './taskHistoryItem.css';
import { formatDayDateTimeUtc } from '@/utils/dayjsSpanish';
import { PiPaperPlaneRightBold } from 'react-icons/pi';
import { IoCheckmarkSharp, IoClose } from 'react-icons/io5';

import SubtaskFile from '../subtaskFiles/SubtaskFile';
import TaskStatusFeedback from '../taskStatusFeedback/TaskStatusFeedback';
import { FeedbackType } from '../../../../models/definitiosProject';
import type { FileTask } from '@/types/types';
interface TaskHistoryItemProps {
  createdAt: Date | string;
  className?: string;
  comment?: string;
  percentage?: number;
  user: {
    fullname: string;
    dni: string;
  };
  files?: FileTask[];
  mode: 'evaluator' | 'technical';
  status?: FeedbackType;
}

const TaskHistoryItem = ({
  // feedBack,
  className,
  createdAt,
  user,
  mode,
  percentage,
  files,
  comment = '',
  status,
}: TaskHistoryItemProps) => {
  const Icon =
    mode === 'technical'
      ? PiPaperPlaneRightBold
      : status === FeedbackType.REJECTED
      ? IoClose
      : IoCheckmarkSharp;
  return (
    <div className={`taskHistoryItem ${className}`}>
      <div className="taskHistoryItem-info">
        <span className="taskHistoryItem-date">
          {formatDayDateTimeUtc(createdAt)}
        </span>
        <div className="taskHistoryItem-icon-content">
          <div className="taskHistoryItem-icon">
            <Icon size={21} />
          </div>
          <div className="taskHistoryItem-line" />
        </div>
        <div className="taskHistoryItem-user">
          <IconProfile dni={user?.dni} size={1.3} />
          <h4 className="taskHistoryItem-fullname">{user?.fullname}</h4>
          <h5 className="taskHistoryItem-deliverable">
            {mode === 'technical'
              ? 'envió entregable al '
              : 'revisó el entregable'}
            {mode === 'technical' && (
              <span className="taskHistoryItem-percentage">{percentage}%</span>
            )}
          </h5>
        </div>
        {mode === 'evaluator' && status && (
          <TaskStatusFeedback
            type={status}
            className="taskHistoryItem-status"
          />
        )}
      </div>
      <div className="taskHistoryItem-info taskHistoryItem-info--align ">
        <span style={{ minWidth: '8rem' }} />
        <div className="taskHistoryItem-line-content">
          <div className="taskHistoryItem-line" />
        </div>

        {mode === 'technical' && files && (
          <div className="taskHistoryItem-files-content">
            <SubtaskFile files={files} />
          </div>
        )}
        {mode === 'evaluator' && (
          <div className="taskHistoryItem-files-content">
            <TextArea style={{ resize: 'unset' }} value={comment} disabled />
          </div>
        )}
      </div>

      {/* <div className="taskHistoryItem-line" /> */}
    </div>
  );
};

export default TaskHistoryItem;

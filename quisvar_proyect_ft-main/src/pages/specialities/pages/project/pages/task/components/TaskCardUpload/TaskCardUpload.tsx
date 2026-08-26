import { HiOutlinePaperClip } from 'react-icons/hi2';
import SubtaskFile from '../subtaskFiles/SubtaskFile';
import SubtaskUploadFiles from '../subtaskUploadFiles/SubtaskUploadFiles';
import { useContext } from 'react';
import { TaskContext } from '../taskCard/TaskCard';
import './taskCardUploadModels.css';
import { COLOR_CSS } from '@/utils/cssData';
import type { FileType } from '@/types/types';
import { TaskPermission } from '../../../../models/definitiosProject';
import { TbFiles } from 'react-icons/tb';

interface TaskCardUploadProps {
  typeFile: FileType;
  uploadHeight?: number;
  reverse?: boolean;
  label?: string;
}

const TaskCardUpload = ({
  typeFile,
  uploadHeight,
  reverse = false,
  label,
}: TaskCardUploadProps) => {
  const { task, hasPermission } = useContext(TaskContext);

  const TYPE = {
    MODEL: {
      Icon: HiOutlinePaperClip,
      hasPermissions: hasPermission(TaskPermission.DELETE_UPLOAD_MODELS),
    },
    UPLOADS: {
      Icon: TbFiles,
      hasPermissions: false,
    },
    REVIEW: {
      Icon: TbFiles,
      hasPermissions: hasPermission(TaskPermission.DELETE_UPLOAD_DELIVERABLES),
    },
  };

  const { hasPermissions, Icon } = TYPE[typeFile];

  const contetFile = [
    task?.files ? (
      <SubtaskFile
        key={1}
        files={task.files[typeFile]}
        showDeleteBtn={hasPermissions}
      />
    ) : null,
    hasPermissions ? (
      <SubtaskUploadFiles
        key={2}
        taskId={task.id}
        type={typeFile}
        height={uploadHeight}
      />
    ) : null,
  ];

  reverse && contetFile.reverse();

  return (
    <div className="TaskCardUpload">
      {label && (
        <h2 className="task-label">
          <Icon size={21} color={COLOR_CSS.secondary} />
          {label}
        </h2>
      )}

      {contetFile.map(contetFile => contetFile)}
    </div>
  );
};

export default TaskCardUpload;

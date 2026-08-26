import { useContext, type CSSProperties, type ChangeEvent } from 'react';
import { axiosInstance } from '@/services/axiosInstance';
import './subtaskUploadFiles.css';
import type { FileType } from '@/types/types';
import { MdPostAdd } from 'react-icons/md';
import { COLOR_CSS } from '@/utils/cssData';
import { TaskContext } from '../taskCard/TaskCard';
import useEmitWithLoader from '@/hooks/useEmitWithLoader';

interface SubtaskUploadFilesProps {
  type: FileType;
  taskId: number;
  addFiles?: (values: File[]) => void;
  className?: string;
  height?: number;
}

const SubtaskUploadFiles = ({
  taskId,
  type,
  addFiles,
  className,
  height,
}: SubtaskUploadFilesProps) => {
  const { emitWithLoader } = useEmitWithLoader();
  const { service, stageId } = useContext(TaskContext);
  const style: CSSProperties = { height };
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = e.target.files;
    if (type === 'REVIEW' && addFiles) {
      const newFiles = Array.from(files);
      addFiles(newFiles);
      e.target.value = '';
      return;
    }
    const formdata = new FormData();
    for (const file of files) {
      formdata.append('files', file);
    }
    const query = {
      status: type,
    };
    const params = new URLSearchParams(query);
    e.target.value = '';
    await axiosInstance.post(`${service.uploadFile}/${taskId}`, formdata, {
      params,
    });
    emitWithLoader(service.loadTask, { taskId, stageId });
  };

  return (
    <div className={`subtaskUploadFiles-area ${className}`} style={style}>
      <input
        type="file"
        multiple
        onChange={handleFileChange}
        className="subtaskUploadFiles-input"
      />
      <MdPostAdd
        color={COLOR_CSS.gray}
        size={23}
        className="subtaskUploadFiles-icon"
      />
    </div>
  );
};

export default SubtaskUploadFiles;

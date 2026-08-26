import { useContext, type CSSProperties } from 'react';
import { axiosInstance } from '@/services/axiosInstance';
import type { FileTask } from '@/types/types';
import { SocketContext } from '@/context/SocketContex';
// import { useSelector } from 'react-redux';
// import type { RootState } from '../../../../../../../../store';
import './SubtaskFile.css';
import { downloadHref } from '@/utils/tools';
import TaskFileTemplate from './TaskFileTemplate';
import {
  getTaskFileUrl,
  isEditableWordFile,
} from '../../services/taskFile.service';
interface SubtaskFileProps {
  files: FileTask[];
  // typeFile?: FileType;
  showDeleteBtn?: boolean;
  className?: string;
  direction?: CSSProperties['flexDirection'];
  onOpenEditable?: (file: FileTask) => void;
  // showDeleteBtnByUserAuth?: boolean;
}

const iconForExtension = {
  xlsx: 'excel-icon',
  pdf: 'pdf-icon',
  docx: 'word-icon',
  dwg: 'autocad-icon',
  default: 'file-download',
};
const SubtaskFile = ({
  files,
  // typeFile = 'MODEL',
  showDeleteBtn,
  className = '',
  direction = 'row',
  onOpenEditable,
}: // showDeleteBtnByUserAuth,
SubtaskFileProps) => {
  // const { id: userSessionId } = useSelector(
  //   (state: RootState) => state.userSession
  // );
  const socket = useContext(SocketContext);

  const deleteFile = (id: number) => {
    axiosInstance
      .delete(`/files/remove/${id}`)
      .then(res => socket.emit('client:update-task', res.data));
  };

  const getIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || 'default';
    const getExtencion = iconForExtension[ext as keyof typeof iconForExtension];
    return getExtencion || 'file-download';
  };

  const handleLink = (file: FileTask) => {
    if (onOpenEditable && isEditableWordFile(file)) {
      onOpenEditable(file);
      return;
    }

    downloadHref(getTaskFileUrl(file), file.name, true);
  };

  const containStyle: CSSProperties = {
    flexDirection: direction,
  };

  return (
    <div className={` subtaskFile ${className}`} style={containStyle}>
      {files?.map(file => (
        <TaskFileTemplate
          name={file.originalname}
          key={file.id}
          onDeleteFile={() => deleteFile(file.id)}
          onClick={() => handleLink(file)}
          icon={getIcon(file.name)}
          showDeleteBtn={showDeleteBtn}
          actionLabel={
            onOpenEditable && isEditableWordFile(file)
              ? `Revisar compatibilidad de ${file.originalname} en Dhyrium Writer`
              : `Descargar ${file.originalname}`
          }
        />
      ))}
    </div>
  );
};

export default SubtaskFile;

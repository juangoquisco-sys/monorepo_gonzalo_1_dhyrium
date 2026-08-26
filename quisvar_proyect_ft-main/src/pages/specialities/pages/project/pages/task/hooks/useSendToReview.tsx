import { useContext, useState } from 'react';
import { axiosInstance } from '@/services/axiosInstance';
import useEmitWithLoader from '@/hooks/useEmitWithLoader';
import { TaskContext } from '../components/taskCard/TaskCard';
import { SnackbarUtilities } from '@/utils/SnackbarManager';

const useSendToReview = () => {
  const { percentage, task, service, stageId } = useContext(TaskContext);
  const { emitWithLoader } = useEmitWithLoader();
  const [reviewFiles, setReviewFiles] = useState<File[]>([]);
  const sendToReview = async () => {
    if (!reviewFiles.length)
      return SnackbarUtilities.warning(
        'Asegurese de subir un archivo como minimo'
      );
    if (+percentage <= 0)
      return SnackbarUtilities.warning(
        'Porcentaje no puede ser menor o igual a 0'
      );
    const formdata = new FormData();
    const userOnTaskId = task.users.ACTIVE![0].id;
    reviewFiles.forEach(file => formdata.append('files', file));
    formdata.append(
      'percentage',
      String(percentage - task.percentageWithoutActive)
    );
    formdata.append('userOnTaskId', String(userOnTaskId));
    await axiosInstance.post(`${service.feedbackTask}/${task.id}`, formdata);
    setReviewFiles([]);
    emitWithLoader(service.loadTask, { taskId: task.id, stageId });
  };
  return { sendToReview, setReviewFiles, reviewFiles };
};

export default useSendToReview;

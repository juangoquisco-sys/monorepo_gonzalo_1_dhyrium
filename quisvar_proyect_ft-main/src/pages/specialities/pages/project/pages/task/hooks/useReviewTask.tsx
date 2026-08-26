import { useContext, useEffect, useState, type ChangeEvent } from 'react';
import {
  FeedbackType,
  TaskPermission,
} from '../../../models/definitiosProject';
import useEmitWithLoader from '@/hooks/useEmitWithLoader';
import { TaskContext } from '../components/taskCard/TaskCard';
import { SnackbarUtilities } from '@/utils/SnackbarManager';

const useReviewTask = () => {
  const { task, percentage, service, stageId, hasPermission } =
    useContext(TaskContext);
  const [feedback, setFeedback] = useState('');
  const { emitWithLoader } = useEmitWithLoader();
  useEffect(() => {
    if (!task?.lastFeedback) return;
    setFeedback(task.lastFeedback.comment);
  }, [task]);

  const onChangeFeedBack = ({ target }: ChangeEvent<HTMLTextAreaElement>) => {
    setFeedback(target.value);
  };
  const reviewTask = async (type: FeedbackType) => {
    if (+percentage <= 0)
      return SnackbarUtilities.warning(
        'Porcentaje no puede ser menor o igual a 0'
      );
    if (
      type === FeedbackType.REJECTED &&
      !feedback &&
      hasPermission(TaskPermission.VIEW_INPUT_FEEDBACK)
    ) {
      return SnackbarUtilities.warning('Comentario requerido');
    }

    const { lastFeedback, users } = task;
    const userOnTaskId = users.ACTIVE![0].id;
    const body = {
      percentage: percentage - task.percentageWithoutActive,
      userOnTaskId,
      comment: feedback,
      type,
      id: lastFeedback.id,
    };

    await emitWithLoader(
      service.reviewTask,
      { taskId: task.id, stageId },
      body
    );
    setFeedback('');
  };
  return { reviewTask, feedback, onChangeFeedBack };
};

export default useReviewTask;

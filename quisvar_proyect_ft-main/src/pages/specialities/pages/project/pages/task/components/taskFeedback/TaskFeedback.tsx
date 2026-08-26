import { useContext, type ChangeEvent } from 'react';
import IconAction from '@/components/iconAction/IconAction';
import TextArea from '@/components/textArea/TextArea';
import './taskFeedback.css';
import { BiSave } from 'react-icons/bi';
import { COLOR_CSS } from '@/utils/cssData';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { axiosInstance } from '@/services/axiosInstance';
import { TaskContext } from '../taskCard/TaskCard';

interface TaskFeedbackProps {
  feedback: string;
  onChangeFeedBack: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}

const TaskFeedback = ({ feedback, onChangeFeedBack }: TaskFeedbackProps) => {
  const { task } = useContext(TaskContext);

  const saveFeedback = async () => {
    const body = {
      comment: feedback,
    };
    await axiosInstance.patch(
      `/feedbacks/feedback/${task.lastFeedback.id}`,
      body
    );

    SnackbarUtilities.success('Comentario guardado');
  };

  return (
    <div className="taskFeedback">
      <TextArea
        placeholder="Añadir comentario"
        style={{ resize: 'vertical' }}
        value={feedback ?? ''}
        onChange={onChangeFeedBack}
      />
      <IconAction
        IconComponent={<BiSave size={21} color={COLOR_CSS.secondary} />}
        top={0}
        onClick={saveFeedback}
      />
    </div>
  );
};

export default TaskFeedback;

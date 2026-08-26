import useListHistory from '../../hooks/useListHistory';
import './taskHistory.css';
import { PiClipboardTextBold } from 'react-icons/pi';
import { COLOR_CSS } from '@/utils/cssData';
import TaskHistoryItem from '../taskHistoryItem/TaskHistoryItem';
import LoaderOnly from '@/components/loaderOnly/LoaderOnly';
import LoaderText from '@/components/loaderText/LoaderText';

const TaskHistory = () => {
  const { listTaskHistoryQuery } = useListHistory();

  const getUserParse = (user: string) => {
    const userParse = JSON.parse(user) as {
      fullname: string;
      dni: string;
    };
    return userParse;
  };

  return (
    <div className="taskHistory">
      <h2 className="task-label">
        <PiClipboardTextBold
          color={COLOR_CSS.secondary}
          size={21}
          cursor={'pointer'}
        />
        Toda la actividad
        {listTaskHistoryQuery.isFetching && (
          <LoaderOnly position="absolute" right={0.9} />
        )}
      </h2>
      {listTaskHistoryQuery.isLoading && (
        <LoaderText text="Cargando..." style={{ height: '100%' }} />
      )}

      {listTaskHistoryQuery.data?.length === 0 && (
        <div className="taskHistory-void">No hay historial</div>
      )}
      <div className="taskHistory-items scroll-slim">
        {listTaskHistoryQuery.data?.map(feedback => (
          <div key={feedback.id}>
            {feedback.reviewer && (
              <TaskHistoryItem
                createdAt={feedback.updatedAt}
                user={getUserParse(feedback.reviewer)}
                comment={feedback.comment}
                status={feedback.type}
                mode={'evaluator'}
              />
            )}
            <TaskHistoryItem
              createdAt={feedback.createdAt}
              files={feedback.files}
              user={getUserParse(feedback.author)}
              percentage={feedback.percentage}
              mode={'technical'}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskHistory;

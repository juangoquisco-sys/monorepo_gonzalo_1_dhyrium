import { useContext } from 'react';
import { TaskContext } from '../taskCard/TaskCard';
import './taskCardHeader.css';
import { COLOR_CSS } from '@/utils/cssData';
import {
  PiClipboardTextBold,
  PiClockCounterClockwiseBold,
} from 'react-icons/pi';

import {
  TaskPermission,
  TaskStatus,
} from '../../../../models/definitiosProject';
import useEmitWithLoader from '@/hooks/useEmitWithLoader';
import { isOpenButtonDelete$ } from '@/services/sharingSubject';
import { AppButton } from '@/components/app-ui/app-button';
interface TaskCardHeaderProps {
  showTitle?: boolean;
  showActions?: boolean;
}

const TaskCardHeader = ({
  showTitle = true,
  showActions = true,
}: TaskCardHeaderProps) => {
  const { service } = useContext(TaskContext);

  const { task, hasPermission, handleViewHistory } = useContext(TaskContext);
  const { emitWithLoader } = useEmitWithLoader();

  const restoreTask = () => {
    isOpenButtonDelete$.setSubject = {
      isOpen: true,
      alertText: '¿ESTAS SEGURO DE REESTABLECER ESTA TAREA?',
      function: () => emitWithLoader(service.resetTask, task.id),
    };
  };

  return (
    <div className="TaskCardHeader">
      {showTitle && (
        <h4 className="TaskCardHeader-title">
          Título de la tarea:{' '}
          <span className="TaskCardHeader-title-span">
            {task.item} {task.name}
          </span>
        </h4>
      )}
      {showActions && task.status !== TaskStatus.UNRESOLVED && (
        <div className="TaskCardHeader-actions">
          <AppButton
            size="icon-xs"
            variant="ghost"
            aria-label="Mostrar u ocultar historial"
            title="Historial"
            onClick={handleViewHistory}
          >
            <PiClipboardTextBold color={COLOR_CSS.secondary} />
          </AppButton>
          {hasPermission(TaskPermission.RESET_TASK) && (
            <AppButton
              size="icon-xs"
              variant="ghost"
              aria-label="Restablecer tarea"
              title="Restablecer tarea"
              onClick={restoreTask}
            >
              <PiClockCounterClockwiseBold color={COLOR_CSS.danger} />
            </AppButton>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCardHeader;

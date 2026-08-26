import { useContext, useState } from 'react';
import useEmitWithLoader from '@/hooks/useEmitWithLoader';
import { TaskContext } from '../components/taskCard/TaskCard';
import { TaskStatus } from '../../../models/definitiosProject';

const useAssignUserTask = () => {
  const { task, service, stageId } = useContext(TaskContext);
  const { emitWithLoader } = useEmitWithLoader();

  const [assignedUser, setAssignedUser] = useState({
    evaluatorId: 0,
    technicalId: 0,
  });
  const onAssignUser = async (
    userId: number,
    typeUser: keyof typeof assignedUser
  ) => {
    const body = {
      userId,
      taskId: task.id,
    };
    if (typeUser === 'technicalId') {
      emitWithLoader(service.addUserTask, { ...body, stageId });
    }
    if (typeUser === 'evaluatorId') {
      emitWithLoader(service.addModTask, body);
    }
  };

  const onChangeAssignedUser = (
    value: number,
    typeUser: keyof typeof assignedUser
  ) => {
    if (task.status !== TaskStatus.UNRESOLVED && typeUser === 'technicalId') {
      const body = {
        userId: value,
        taskId: task.id,
        stageId,
      };
      emitWithLoader(service.changeUserTask, body);
    } else {
      setAssignedUser({ ...assignedUser, [typeUser]: value });
    }
  };

  const onChangeModerator = (
    value: number,
    typeUser: keyof typeof assignedUser,
    modId?: number
  ) => {
    if (!value && modId) {
      const body = {
        userId: modId,
        taskId: task.id,
      };
      emitWithLoader(service.removeModTask, body);
      return;
    }
    onAssignUser(value, typeUser);
  };

  return {
    onChangeAssignedUser,
    onAssignUser,
    assignedUser,
    onChangeModerator,
  };
};

export default useAssignUserTask;

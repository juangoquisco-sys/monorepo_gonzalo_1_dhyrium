import { useParams } from 'react-router-dom';
import './task.css';
import { useContext, useEffect, useState } from 'react';
import type { SubTask } from '@/types/types';
import TaskPrincipal from './View/taskPrincipal/TaskPrincipal';
import { SocketContext } from '@/context/SocketContex';
import IconAction from '@/components/iconAction/IconAction';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import TaskCard from './components/taskCard/TaskCard';
import useAbortableAxios from '@/hooks/useAbortableAxios';
import useGoBackRoute from '@/hooks/useGoBackRoute';
import { axiosInstance } from '@/services/axiosInstance';

export const Task = () => {
  const socket = useContext(SocketContext);
  const { axiosAbortable, abortRequest } = useAbortableAxios();
  const { taskId } = useParams();
  const [task, setTask] = useState<SubTask | null>(null);

  useEffect(() => {
    getTask();
    return () => {
      setTask(null);
      abortRequest();
    };
  }, [taskId]);

  useEffect(() => {
    socket.on('server:load-budget-task', (task: SubTask) => {
      setTask(task);
    });
    return () => {
      socket.off('server:load-budget-task');
    };
  }, [socket]);

  const getTask = async () => {
    const res = await axiosAbortable.get<SubTask>(`/subtasks/${taskId}`, {
      headers: { noLoader: true },
    });
    setTask(res.data);
    socket.emit('join', `budget-task-${taskId}`);
  };
  const goBack = useGoBackRoute('tarea');
  useEffect(() => {
    registerTaskVisited();
  }, [taskId]);

  const registerTaskVisited = () => {
    axiosInstance.post(`/subtasks/${taskId}/visit`, null, {
      headers: { noLoader: true },
    });
  };
  if (!task)
    return (
      <div className="task-loader">
        <LoaderForComponent />
      </div>
    );
  return (
    <div className="task">
      <IconAction icon="close" onClick={goBack} size={0.8} top={0} />
      <TaskCard task={task}>
        <TaskPrincipal />
      </TaskCard>
    </div>
  );
};

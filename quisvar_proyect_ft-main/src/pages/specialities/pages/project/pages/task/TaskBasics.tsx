import { useParams } from 'react-router-dom';
import './task.css';
import { useContext, useEffect, useState } from 'react';
import { axiosInstance } from '@/services/axiosInstance';
import { SocketContext } from '@/context/SocketContex';
import IconAction from '@/components/iconAction/IconAction';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import type { SubTask } from '@/types/types';
import TaskPrincipal from './View/taskPrincipal/TaskPrincipal';
import TaskCard from './components/taskCard/TaskCard';
import useGoBackRoute from '@/hooks/useGoBackRoute';

export const TaskBasics = () => {
  const socket = useContext(SocketContext);
  const { taskId } = useParams();
  const [task, setTask] = useState<SubTask | null>(null);

  useEffect(() => {
    getTask();
    return () => {
      setTask(null);
    };
  }, [taskId]);

  useEffect(() => {
    socket.on('server:load-basic-task', (task: SubTask) => {
      setTask(task);
    });
    return () => {
      socket.off('server:load-basic-task');
    };
  }, [socket]);

  const getTask = async () => {
    const res = await axiosInstance.get<SubTask>(`/basictasks/${taskId}`, {
      headers: { noLoader: true },
    });
    setTask(res.data);
    socket.emit('join', `basic-task-${taskId}`);
  };
  const goBack = useGoBackRoute('tarea');

  if (!task)
    return (
      <div className="task-loader">
        <LoaderForComponent />
      </div>
    );
  return (
    <div className="task">
      <IconAction icon="close" onClick={goBack} size={0.8} top={0} />
      <TaskCard task={task} taskKind="BASIC">
        <TaskPrincipal />
      </TaskCard>
    </div>
  );
};

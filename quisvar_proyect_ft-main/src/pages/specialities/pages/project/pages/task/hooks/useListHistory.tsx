import { axiosInstance } from '@/services/axiosInstance';
import { useQuery } from '@tanstack/react-query';
import type { Feedback } from '@/types/types';
import { useContext } from 'react';
import { TaskContext } from '../components/taskCard/TaskCard';

const useListHistory = () => {
  const { service, task } = useContext(TaskContext);
  const getTaskHistory = async (taskId: number) => {
    const res = await axiosInstance.get<Feedback[]>(
      `${service.getFeedbackTask}/${taskId}`,
      {
        headers: {
          noLoader: true,
        },
      }
    );
    return res.data;
  };
  const listTaskHistoryQuery = useQuery({
    queryKey: ['listTaskHistory', task.id],
    queryFn: () => getTaskHistory(task.id),
  });
  return { listTaskHistoryQuery };
};

export default useListHistory;

import { axiosInstance } from '@/services/axiosInstance';
import type { ProjectFiler, ResProjectTask } from '../interfaces/myTasks.types';

export const fetchListTask = async <T>(
  userId: number,
  searchParams: URLSearchParams,
  type: 'evaluator' | 'technical'
) => {
  const ulrReportType = {
    evaluator: 'report-mod',
    technical: 'report-user',
  };
  const { data } = await axiosInstance.get<ResProjectTask<T>>(
    `/subtasks/${ulrReportType[type]}/${userId}`,
    {
      params: searchParams,
      headers: {
        noLoader: true,
      },
    }
  );

  const { data: projectTasks, total } = data;

  const taskReduce = projectTasks.reduce((acc: T[], project) => {
    const [firstTask, ...resTasks] = project.tasks;
    acc?.push(
      {
        ...firstTask,
        projectName: project.name,
        stageId: project.id,
        projectId: project.projectId,
      },
      ...resTasks.map(task => ({
        ...task,
        stageId: project.id,
        projectId: project.projectId,
      }))
    );
    return acc;
  }, []);
  return { total, tasks: taskReduce };
};

export const fetchProjectsForFilter = async () => {
  const res = await axiosInstance.get<ProjectFiler[]>('/projects', {
    headers: {
      noLoader: true,
    },
  });
  return res.data;
};

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import type {
  Reporting,
  ReportingProject,
  ReportingTask,
} from '../../../interface/report.types';
import useAbortableAxios from '@/hooks/useAbortableAxios';
import { useEffect } from 'react';

const useReport = () => {
  const { abortRequest, axiosAbortable } = useAbortableAxios();
  const { reportId } = useParams();

  useEffect(() => {
    return () => {
      abortRequest();
    };
  }, []);

  const getReportingTask = async (reportId: string | undefined) => {
    if (!reportId) return;
    const { data: resData } = await axiosAbortable.get<Reporting>(
      `/reports/${reportId}?mods=true&userinfo=true`,
      {
        headers: {
          noLoader: true,
        },
      }
    );
    const { data } = resData;
    const dataReduce: ReportingTask[] = (data as ReportingProject[]).reduce(
      (acc: ReportingTask[], project) => {
        const [firstTask, ...resTasks] = project.tasks!;
        acc?.push(
          {
            ...firstTask,
            projectName: project.name,
            stagePrice: project.budget,
          },
          ...resTasks
        );
        return acc;
      },
      []
    );

    return {
      reporting: resData,
      tasks: dataReduce,
      footerData: {
        attendanceDiscount: resData.attendanceDiscount,
        licensesDiscount: resData.licensesDiscount,
        percentagePayment: resData.percentage,
        totalPartialPrice: resData.subprice,
      },
    };
  };

  const reportQuery = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => getReportingTask(reportId),
  });

  return {
    reportQuery,
    reporting: reportQuery.data?.reporting,
    tasks: reportQuery.data?.tasks,
    footerData: reportQuery.data?.footerData,
  };
};

export default useReport;

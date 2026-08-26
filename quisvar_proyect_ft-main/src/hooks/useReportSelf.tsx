import { useQuery } from '@tanstack/react-query';
import type {
  Report,
  ReportResponse,
} from '@/pages/listPersonalReports/interface/report.types';
import { axiosInstance } from '@/services/axiosInstance';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import { TypeStatus } from '@/pages/myTasks/pages/listPersonalTask/interface/listPersonalTask.types';

type Withoutpayments = 'yes' | 'no' | 'all';

const getMyReports = async (
  userId: number,
  withoutpayments: Withoutpayments,
  reportType?: TypeStatus
) => {
  const params = new URLSearchParams({
    ...(withoutpayments !== 'all' && {
      withoutpayments: String(withoutpayments === 'yes'),
    }),
    ...(reportType ? { type: reportType } : {}),
  });
  const { data } = await axiosInstance.get<ReportResponse[]>(
    `/reports/self/${userId}`,
    {
      params,
      headers: {
        noLoader: true,
      },
    }
  );
  const reports: Report[] = data.map(report => ({
    ...report,
    value: String(report.id),
    label: report.name,
  }));
  return reports;
};
const useReportSelf = (
  withoutpayments: Withoutpayments = 'all',
  reportType?: TypeStatus
) => {
  const userSession = useSelector((state: RootState) => state.userSession);
  const reportSelfQuery = useQuery({
    queryKey: ['reportSelf', userSession.id, withoutpayments, reportType],
    queryFn: () => getMyReports(userSession.id, withoutpayments, reportType),
  });
  return { reportSelfQuery };
};

export default useReportSelf;

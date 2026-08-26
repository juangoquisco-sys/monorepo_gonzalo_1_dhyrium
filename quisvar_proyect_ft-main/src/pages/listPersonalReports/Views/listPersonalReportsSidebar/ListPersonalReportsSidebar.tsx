import './listPersonalReportsSidebar.css';
import ReportCardSidbar from '../../components/reportCardSidbar/ReportCardSidbar';
import { NavLink } from 'react-router-dom';
import ButtonHeader from '@/components/buttonHeader/ButtonHeader';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import LoaderOnly from '@/components/loaderOnly/LoaderOnly';
import useReportSelf from '@/hooks/useReportSelf';
import { useState } from 'react';
import { TypeStatus } from '../../../myTasks/pages/listPersonalTask/interface/listPersonalTask.types';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/services/axiosInstance';

const ListPersonalReportsSidebar = () => {
  const { reportId } = useParams();
  const [manualSelection, setManualSelection] = useState<{
    reportId?: string;
    value: TypeStatus;
  } | null>(null);
  const activeReportTypeQuery = useQuery({
    queryKey: ['report-type', reportId],
    enabled: Boolean(reportId),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ type: TypeStatus }>(
        `/reports/${reportId}?mods=true`,
        { headers: { noLoader: true } }
      );
      return data.type;
    },
    staleTime: 60_000,
  });
  const options = [
    { label: 'Adelanto', value: TypeStatus.REVIEWED, id: 1 },
    { label: 'Mensual', value: TypeStatus.MONTH, id: 2 },
    { label: 'Liquidación', value: TypeStatus.APPROVED, id: 3 },
  ];
  const selectedReportType =
    manualSelection && manualSelection.reportId === reportId
      ? manualSelection.value
      : activeReportTypeQuery.data ?? TypeStatus.REVIEWED;
  const { reportSelfQuery } = useReportSelf('all', selectedReportType);
  return (
    <div className="listPersonalReportsSidebar">
      {reportSelfQuery.isFetching && (
        <LoaderOnly position="absolute" right={2} top={1.5} />
      )}
      <h2 className="listPersonalReportsSidebar-title">Mis Reportes</h2>
      <div className="listPersonalReportsSidebar-options">
        {options.map(({ label, value, id }) => (
          <ButtonHeader
            key={id}
            isActive={selectedReportType === value}
            text={label}
            onClick={() => setManualSelection({ reportId, value })}
          />
        ))}
      </div>
      <div className="listPersonalReportsSidebar-reports-items">
        {reportSelfQuery.isLoading && <LoaderForComponent color="#fff" />}
        {reportSelfQuery.data?.map(report => (
          <NavLink key={report.id} to={`${report.id}`}>
            {({ isActive }) => (
              <ReportCardSidbar
                report={report}
                isActive={isActive}
                onSave={() => reportSelfQuery.refetch()}
              />
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default ListPersonalReportsSidebar;

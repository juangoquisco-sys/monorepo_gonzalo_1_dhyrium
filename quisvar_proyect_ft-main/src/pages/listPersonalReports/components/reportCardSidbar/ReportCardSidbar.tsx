import { axiosInstance } from '@/services/axiosInstance';
import { isOpenButtonDelete$ } from '@/services/sharingSubject';
import type { Option } from '@/types/types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { COLOR_CSS } from '@/utils/cssData';
import {
  formatDayDateTimeUtc,
  formatFullDateRangeUtc,
} from '@/utils/dayjsSpanish';
import type { Report } from '../../interface/report.types';
import './reportCardSidbar.css';
import { PiNotebookDuotone } from 'react-icons/pi';
import AppContextMenu from '@/components/appContextMenu/AppContextMenu';
interface ReportCardSidbarProps {
  report: Report;
  isActive?: boolean;
  onSave?: () => void;
}
const ReportCardSidbar = ({
  report,
  isActive,
  onSave,
}: ReportCardSidbarProps) => {
  const handleDeleteContract = () =>
    axiosInstance.delete(`reports/${report.id}`).then(() => {
      SnackbarUtilities.success('El Reporte fue eliminado exitosamente');
      onSave?.();
    });

  const handleOpenButtonDelete = () => {
    isOpenButtonDelete$.setSubject = {
      isOpen: true,
      function: handleDeleteContract,
    };
  };
  const dataDots: Option[] = [
    {
      name: 'Eliminar',
      type: 'button',
      icon: 'trash-red',
      function: handleOpenButtonDelete,
    },
  ];

  return (
    <AppContextMenu
      data={dataDots}
      className={`reportCardSidbar ${isActive && 'reportCardSidbar-active'}`}
    >
      <PiNotebookDuotone color={COLOR_CSS.secondary} size={21} />
      <div className="reportCardSidbar-info">
        <span className="reportCardSidbar-info-created">
          Creado el {formatDayDateTimeUtc(report.createdAt)}
        </span>
        <span className="reportCardSidbar-info-name">
          {report.name}
          {' / '}
          {formatFullDateRangeUtc(report.initialDate, report.untilDate)}
        </span>
      </div>
    </AppContextMenu>
  );
};

export default ReportCardSidbar;

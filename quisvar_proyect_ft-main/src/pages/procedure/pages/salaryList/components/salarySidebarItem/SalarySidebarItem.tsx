import { axiosInstance } from '@/services/axiosInstance';
import { isOpenButtonDelete$ } from '@/services/sharingSubject';
import type { Option } from '@/types/types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { COLOR_CSS } from '@/utils/cssData';
import { formatDayDateTimeUtc } from '@/utils/dayjsSpanish';
import type { Payroll } from '../../../../interfaces/procedure.types';
import './salarySidebarItem.css';
import { PiCheckSquareOffsetBold, PiListPlus } from 'react-icons/pi';
import AppContextMenu from '@/components/appContextMenu/AppContextMenu';
import { NavLink } from 'react-router-dom';
import { TypePayroll } from '../../pages/interface/payroll.types';

interface SalarySidebarItemProps {
  salary: Payroll;
  handleNavigate?: () => void;
  onSave?: () => void;
}
const SalarySidebarItem = ({
  salary,
  handleNavigate,
  onSave,
}: SalarySidebarItemProps) => {
  const handleDeletePayroll = async () => {
    await axiosInstance.delete(`/payrolls/${salary.id}`);
    SnackbarUtilities.success('El Reporte fue eliminado exitosamente');
    onSave?.();
  };

  const handleOpenButtonDelete = () => {
    isOpenButtonDelete$.setSubject = {
      isOpen: true,
      function: handleDeletePayroll,
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
  return !handleNavigate ? (
    <>
      <NavLink
        key={salary.id}
        to={`${salary.id}?typePayroll=${TypePayroll.UNAPPROVED}`}
      >
        {({ isActive }) => (
          <AppContextMenu
            data={dataDots}
            className={`salarySidebarItem ${
              isActive && 'salarySidebarItem-active'
            } ${!handleNavigate && 'salarySidebarItem-pointer'} `}
          >
            <PiCheckSquareOffsetBold color={COLOR_CSS.secondary} size={21} />
            <div className="salarySidebarItem-info">
              <span className="salarySidebarItem-info-created">
                {formatDayDateTimeUtc(salary.createdAt)}
              </span>
              <span className="salarySidebarItem-info-name">{salary.name}</span>
            </div>
          </AppContextMenu>
        )}
      </NavLink>
    </>
  ) : (
    <div
      className={`salarySidebarItem  ${
        !handleNavigate && 'salarySidebarItem-pointer'
      } `}
    >
      <PiCheckSquareOffsetBold color={COLOR_CSS.secondary} size={21} />
      <div className="salarySidebarItem-info">
        <span className="salarySidebarItem-info-created">
          {formatDayDateTimeUtc(salary.createdAt)}
        </span>
        <span className="salarySidebarItem-info-name">{salary.name}</span>
      </div>

      <PiListPlus
        color={COLOR_CSS.grayTertiary}
        size={21}
        onClick={handleNavigate}
        cursor={'pointer'}
      />
    </div>
  );
};

export default SalarySidebarItem;

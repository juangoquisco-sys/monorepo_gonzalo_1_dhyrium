import { useState } from 'react';
import SelectPeriod from '@/components/selectPeriod/SelectPeriod';
import './sidebarTaskForReview.css';
import DatePickerCustom from '@/components/datePickerCustom/DatePickerCustom';
import DivFlex from '@/components/divFlex/DivFlex';
import IconAction from '@/components/iconAction/IconAction';
import IconProfile from '@/components/iconProfile/IconProfile';
import { BsCalendar2Week } from 'react-icons/bs';
import { COLOR_CSS } from '@/utils/cssData';
import SelectOfficeUser from '../selectOfficeUser/SelectOfficeUser';
import type {
  OfficeUser,
  OfficeUsersSelect,
  TaskForReviewQUery,
} from '../../interface/taskForReview.types';

interface SidebarTaskForReviewProps {
  handleSetSearchParams: (value: string, key: string) => void;
  query: TaskForReviewQUery;
}
const SidebarTaskForReview = ({
  handleSetSearchParams,
  query,
}: SidebarTaskForReviewProps) => {
  const [[startDate, endDate], setDateRange] = useState<
    [Date | null, Date | null]
  >([null, null]);
  const [officeSelect, setOfficeSelect] = useState<OfficeUsersSelect | null>(
    null
  );
  const handleFilterDateRange = (
    startDate: Date | '' | null,
    endDate: Date | '' | null
  ) => {
    handleSetSearchParams(startDate ? String(startDate) : '', 'initialDate');
    handleSetSearchParams(endDate ? String(endDate) : '', 'untilDate');
  };
  const onSetRangeDate = (dates: [Date | null, Date | null]) => {
    const [startDate, endDate] = dates;
    if (!startDate && !endDate) {
      handleFilterDateRange('', '');
    }
    if (startDate && endDate) {
      handleFilterDateRange(startDate, endDate);
    }
    setDateRange(dates);
  };

  const handlerUserSelect = (user: OfficeUser | null) => {
    handleSetSearchParams(user ? String(user.id) : '', 'userId');
  };

  return (
    <div className="sidebarTaskForReview">
      <div className="sidebarTaskForReview-header">
        <SelectPeriod onChange={onSetRangeDate} width="100%" />
        <DatePickerCustom
          fullWidth
          showIcon
          selectsRange
          startDate={startDate || undefined}
          endDate={endDate || undefined}
          onChange={onSetRangeDate}
          isClearable
          icon={<BsCalendar2Week size={15} color={COLOR_CSS.gray} />}
          placeholderText="Fecha inicio - Fecha fin"
        />
        <DivFlex justifyContent="space-between">
          <h3 className="sidebarTaskForReview-employees">Empleados</h3>
          <SelectOfficeUser onChange={setOfficeSelect} />
        </DivFlex>
      </div>
      <DivFlex flexDirection="column" overflow="auto">
        <div
          className={`sidebarTaskForReview-card-user ${
            !query?.userId && 'sidebarTaskForReview-card-user-selected'
          }`}
          onClick={() => handlerUserSelect(null)}
        >
          <IconAction icon="task-evaluator" size={3} position="none" />
          <span className="sidebarTaskForReview-name">Tareas a evaluar</span>
        </div>

        <div
          style={{
            overflowY: 'auto',
            height: '40rem',
          }}
        >
          {officeSelect?.users.map(user => (
            <div
              className={`sidebarTaskForReview-card-user ${
                query?.userId === String(user.id) &&
                'sidebarTaskForReview-card-user-selected'
              }`}
              key={user.dni}
              onClick={() => handlerUserSelect(user)}
            >
              <IconProfile dni={user.dni} size={2.7} />
              <DivFlex flexDirection="column" alignItems="flex-start" gap={0.1}>
                <span className="sidebarTaskForReview-name">
                  {user.firstName} {user.lastName}
                </span>
                <span className="sidebarTaskForReview-dni">
                  {' '}
                  DNI. {user.dni}
                </span>
              </DivFlex>
            </div>
          ))}
        </div>
      </DivFlex>
    </div>
  );
};

export default SidebarTaskForReview;

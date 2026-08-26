import Button from '@/components/button/Button';
import DatePickerCustom from '@/components/datePickerCustom/DatePickerCustom';
import IconAction from '@/components/iconAction/IconAction';
import Select from '@/components/select/Select';
import { COLOR_CSS } from '@/utils/cssData';
import { IoDocumentTextOutline } from 'react-icons/io5';
import './headerPersonalTask.css';
import { useContext, useState, type ChangeEvent } from 'react';
import { ListPersonalTaskContext } from '../../ListPersonalTaskContext';
import SelectPeriod from '@/components/selectPeriod/SelectPeriod';
import { BsCalendar2Week } from 'react-icons/bs';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { useLocation, useNavigate } from 'react-router-dom';
import { STATUS } from '../../../../constants/status.constants';
import useProjectForFilter from '../../../../hooks/useProjectForFilter';
import { PiArrowClockwiseBold } from 'react-icons/pi';
import { MoneyCalculator24Regular } from '@fluentui/react-icons';
import { RECAUDADOR_GRANDE_ROUTES } from '../../../recaudadorGrande/recaudadorGrande.constants';
const HeaderPersonalTask = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { projectForFilterQuery } = useProjectForFilter();
  const [[startDate, endDate], setDateRange] = useState<
    [Date | null, Date | null]
  >([null, null]);

  const { handleSetSearchParams, query, projectTasksQuery } = useContext(
    ListPersonalTaskContext
  );
  const handleFilter = ({ target }: ChangeEvent<HTMLSelectElement>) => {
    const { value, name } = target;
    handleSetSearchParams(value, name);
  };

  const handlePay = (type: 'APPROVED' | 'REVIEWED') => {
    if (!startDate || !endDate) {
      SnackbarUtilities.warning('Debes seleccionar un rango de fechas');
      return;
    }
    const currentPath = location.pathname;
    const regex = /\/tarea\/\d+/;
    if (regex.test(currentPath)) {
      return SnackbarUtilities.warning('Cierre la tarea que este revisando');
    }
    handleSetSearchParams(type, 'salaryAdvance');
  };

  const getStage = (id: number) => {
    const project = projectForFilterQuery.data?.find(
      project => project.id === id
    );
    if (!project) return [];
    return project.stages;
  };

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

  const onNavigateReports = () => navigate('/mis-reportes');
  return (
    <div className="headerPersonalTask">
      <div className="headerPersonalTask-date-filter">
        <SelectPeriod
          onChange={onSetRangeDate}
          disabled={!!query.salaryAdvance}
        />
        <DatePickerCustom
          showIcon
          selectsRange
          startDate={startDate || undefined}
          endDate={endDate || undefined}
          onChange={onSetRangeDate}
          isClearable
          icon={<BsCalendar2Week size={15} color={COLOR_CSS.gray} />}
          placeholderText="Fecha inicio - Fecha fin"
          disabled={!!query.salaryAdvance}
        />

        {/* {true && (
          <IoSearchCircleSharp
            size={35}
            color={COLOR_CSS.secondary}
            cursor={'pointer'}
            onClick={() => handleFilterDateRange(startDate, endDate)}
          />
        )} */}
        {/* <Button text="Actualizar" variant="outline" size="xxs" /> */}
      </div>

      <div className="headerPersonalTask-general-filter">
        <IconAction icon="filter" text="Filtrar" />
        <Select
          value={query.project}
          data={projectForFilterQuery.data}
          placeholder="Proyecto"
          onChange={handleFilter}
          name="project"
          extractValue={({ id }) => id}
          renderTextField={({ name }) => name}
          styleVariant="tertiary"
        />
        <Select
          value={query.stage}
          data={getStage(+query.project)}
          placeholder="Etapa"
          onChange={handleFilter}
          name="stage"
          extractValue={({ id }) => id}
          renderTextField={({ name }) => name}
          styleVariant="tertiary"
        />
        {!query.salaryAdvance && (
          <Select
            value={query.status}
            data={STATUS}
            placeholder="Estado"
            onChange={handleFilter}
            name="status"
            extractValue={({ id }) => id}
            renderTextField={({ name }) => name}
            styleVariant="tertiary"
          />
        )}
      </div>
      {!query.salaryAdvance && (
        <div className="headerPersonalTask-status-btns">
          <IoDocumentTextOutline
            color={COLOR_CSS.secondary}
            size={21}
            style={{ marginRight: '0.5rem' }}
            onClick={onNavigateReports}
            cursor={'pointer'}
          />
          <Button
            leftIcon={<PiArrowClockwiseBold size={17} />}
            color="gray"
            size="xxs"
            onClick={() => projectTasksQuery.refetch()}
            borderRadius={10}
          />
          <Button
            text="Adelanto"
            color="secondary"
            paddingInline={2}
            onClick={() => handlePay('REVIEWED')}
          />
          <Button
            text="Recaudador Grande"
            leftIcon={<MoneyCalculator24Regular />}
            color="success"
            paddingInline={2}
            onClick={() => navigate(RECAUDADOR_GRANDE_ROUTES.root)}
          />
        </div>
      )}
    </div>
  );
};

export default HeaderPersonalTask;

import { BsCalendar2Week } from 'react-icons/bs';
import Button from '@/components/button/Button';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import DatePickerCustom from '@/components/datePickerCustom/DatePickerCustom';
import Input from '@/components/Input/Input';
import Modal from '@/components/portal/Modal';
import SelectPeriod from '@/components/selectPeriod/SelectPeriod';
import useModalSubscription from '@/hooks/useModalSubscription';
import { isOpenCardAddReport$ } from '@/services/sharingSubject';
import './cardRegisterReport.css';
import { useState } from 'react';
import { COLOR_CSS } from '@/utils/cssData';
import PersonalSelectOffice from '../../pages/listPersonalTask/components/personalSelectOffices/PersonalSelectOffice';
import type { OptionSelect } from '@/types/option.types';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { axiosInstance } from '@/services/axiosInstance';
import { useNavigate } from 'react-router-dom';
const CardRegisterReport = () => {
  const [[startDate, endDate], setDateRange] = useState<
    [Date | null, Date | null]
  >([null, null]);
  const [amount, setAmount] = useState('0');
  const [officeId, setOfficeId] = useState<number | null>(null);
  const { userSession } = useSelector((state: RootState) => state);
  const navigate = useNavigate();

  const { onCloseModal, isOpenModal } =
    useModalSubscription(isOpenCardAddReport$);
  const onSetRangeDate = (dates: [Date | null, Date | null]) => {
    // if (!startDate && !endDate) {
    //   setDateRange([null, null]);
    //   // return;
    // }
    // if (startDate && endDate) {
    //   handleFilterDateRange(startDate, endDate);
    // }
    setDateRange(dates);
  };
  const handleSetOffice = (office: OptionSelect) => {
    setOfficeId(+office.value);
  };

  const handleConfirm = async () => {
    if (!startDate || !endDate) {
      return SnackbarUtilities.warning('Debes seleccionar un rango de fechas');
    }
    if (+amount <= 0) {
      return SnackbarUtilities.warning('El monto debe ser mayor a 0');
    }
    const body = {
      ids: [],
      totalPrice: +amount,
      userId: userSession.id,
      untilDate: endDate,
      initialDate: startDate,
      percentage: 100,
      type: 'MENSUAL',
      officeId,
    };
    const { data } = await axiosInstance.post('/reports', body);
    navigate(`/mis-reportes/${data.id}`);
  };

  const handleResetAndClose = () => {
    setAmount('0');
    setOfficeId(null);
    setDateRange([null, null]);
    onCloseModal();
  };
  return (
    <Modal size={20} isOpenProp={isOpenModal}>
      <CloseIcon
        onClick={handleResetAndClose}
        size={0.7}
        right={0.5}
        top={0.5}
      />
      <div className="cardRegisterReport">
        <h2 className="cardRegisterReport-title">Crear reporte</h2>
        <div className="cardRegisterReport-content">
          <Input
            isMoney
            width={8}
            label="COSTO MENSUAL"
            autoFocus
            value={amount}
            onChange={({ target }) => setAmount(target.value)}
            onBlur={() => setAmount(amount || '0')}
          />
          <SelectPeriod onChange={onSetRangeDate} />
          <DatePickerCustom
            showIcon
            selectsRange
            startDate={startDate || undefined}
            endDate={endDate || undefined}
            onChange={onSetRangeDate}
            isClearable
            icon={<BsCalendar2Week size={15} color={COLOR_CSS.gray} />}
            placeholderText="Fecha inicio - Fecha fin"
            // disabled={!!query.salaryAdvance}
          />
        </div>
        <div className="cardRegisterReport-footer">
          <PersonalSelectOffice onChange={handleSetOffice} isRelative />

          <div className="tasksSelectView-footer-btn">
            <Button
              textColor="gray"
              text="Cancelar"
              variant="ghost"
              onClick={handleResetAndClose}
            />
            <Button text="Confirmar" onClick={handleConfirm} />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CardRegisterReport;

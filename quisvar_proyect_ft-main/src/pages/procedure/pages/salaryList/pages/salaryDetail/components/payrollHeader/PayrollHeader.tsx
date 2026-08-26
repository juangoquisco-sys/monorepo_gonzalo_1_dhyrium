import { IoArrowBack } from 'react-icons/io5';
import Button from '@/components/button/Button';
import DivFlex from '@/components/divFlex/DivFlex';
import GeneralTitle from '@/components/generalTitle/GeneralTitle';
import './payrollHeader.css';
import { formatAmountMoneyPEN, isEmptyObject } from '@/utils/tools';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { useContext } from 'react';
import { PayrollContext } from '../../context/payrollContext';
import { useNavigate } from 'react-router-dom';
import { TypePayroll } from '../../../interface/payroll.types';
import { axiosInstance } from '@/services/axiosInstance';
import PayrollLock from '../payrollLock/PayrollLock';
import { generatePayRoll } from '../../../../excelGenerator/GeneratePayRoll';

const formatPayrollPeriodDate = (value?: string | null) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
};

const PayrollHeader = () => {
  const navigate = useNavigate();
  const { salary, typePayroll, rowSelection, payrollQuery } =
    useContext(PayrollContext);

  const onPayMail = () => {
    navigate('/tramites/tramite-de-pago');
  };

  const handleAprobatePayroll = async () => {
    if (isEmptyObject(rowSelection)) return;
    console.log('asdrowSelection', rowSelection, salary);
    const reportIds = salary?.offices.reduce((acc: number[], office) => {
      return [
        ...acc,
        ...office.payMessages
          .filter(paymessage => rowSelection[paymessage.id])
          .map(paymessage => paymessage.reports.map(report => report.id))
          .flat(),
      ];
    }, []);

    const body = {
      ids:
        reportIds?.map(id => {
          return { id };
        }) || [],
    };
    await axiosInstance.put(`/payrolls/step-payment`, body);
    SnackbarUtilities.success('Reportes aprobados');
    payrollQuery.refetch();
  };
  const handleGenerateExcel = () => {
    salary && generatePayRoll({ salary });
  };
  const payrollPeriod =
    salary?.periodStart && salary?.periodEnd
      ? `${formatPayrollPeriodDate(
          salary.periodStart
        )} - ${formatPayrollPeriodDate(salary.periodEnd)}`
      : null;
  return (
    <div className="salaryDetail-header">
      <div className="salaryDetail-header-options">
        <Button
          text="Atras"
          leftIcon={<IoArrowBack size={21} />}
          variant="ghost"
          onClick={onPayMail}
        />
        <div />
      </div>
      <div className="salaryDetail-title-container">
        <DivFlex autoWidth alignItems="flex-end">
          <GeneralTitle
            firstTitle={salary?.name ?? 'Cargando...'}
            fontSize={1.3}
          />
          <PayrollLock />
        </DivFlex>
        {payrollPeriod && (
          <div className="salaryDetail-period">
            <span>PERIODO DE PLANILLA</span>
            <strong>{payrollPeriod}</strong>
          </div>
        )}
        <div className="salaryDetail-buttons">
          <div className="salaryDetail-total-item">
            <span className="salaryDetail-total-label">MONTO TOTAL</span>
            <span className="salaryDetail-total-cost">
              {formatAmountMoneyPEN(salary?.total ?? 0)}
            </span>
          </div>
          <Button
            text="Generar"
            icon="excel-icon"
            size="xxs"
            color="grayLigth"
            textColor="secondary"
            disabled={!salary}
            onClick={handleGenerateExcel}
          />
          {typePayroll === TypePayroll.APPROVED && (
            <Button
              text="Aprobar tanda"
              color={isEmptyObject(rowSelection) ? 'gray' : 'primary'}
              disabled={isEmptyObject(rowSelection)}
              onClick={handleAprobatePayroll}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollHeader;

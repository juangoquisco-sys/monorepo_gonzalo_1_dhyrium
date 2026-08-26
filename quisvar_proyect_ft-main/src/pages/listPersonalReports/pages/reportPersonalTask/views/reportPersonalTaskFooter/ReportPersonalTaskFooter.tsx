import { useContext, useEffect, type ChangeEvent } from 'react';
import Input from '@/components/Input/Input';
import InputPercentage from '@/components/Input/InputPercentage';
import './reportPersonalTaskFooter.css';
import type { FooterData } from '../../../../interface/report.types';
import TaskSumValues from '../../components/taskSumValues/TaskSumValues';
import TaskSelectViewTotal from '../../../../../myTasks/pages/listPersonalTask/components/taskSelectViewTotal/TaskSelectViewTotal';
import { PersonalReportContext } from '../../../../context/PersonalReportContext';

interface ReportPersonalTaskFooterProps {
  totalPartialPrice: number;
  handleSetFinishAmount: (value: number) => void;
  footerData: FooterData;
  isAdministrative?: boolean;
  viewAttendance?: () => void;
  handleSetFooterData: (key: keyof FooterData, value: number | string) => void;
}

const ReportPersonalTaskFooter = ({
  totalPartialPrice,
  handleSetFinishAmount,
  footerData,
  handleSetFooterData,
  isAdministrative,
  viewAttendance,
}: ReportPersonalTaskFooterProps) => {
  const percentage = +footerData.percentagePayment;
  const { editValues } = useContext(PersonalReportContext);
  const advanceCost = totalPartialPrice * (percentage / 100);
  const totalDiscount =
    +footerData.attendanceDiscount +
    +footerData.licensesDiscount +
    +footerData.earlyPaymentDiscount;
  useEffect(() => {
    handleSetFinishAmount(advanceCost - totalDiscount);
  }, [percentage, totalPartialPrice, advanceCost, totalDiscount]);

  const handleSetValues = ({ target }: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = target;
    handleSetFooterData(name as keyof FooterData, value);
  };
  const onBlurSetValues = ({ target }: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = target;
    if (value) return;
    handleSetFooterData(name as keyof FooterData, '0');
  };

  return (
    <div className="reportPersonalTaskView-footer">
      <div className="reportPersonalTaskView-footer-container">
        <TaskSelectViewTotal
          cost={totalPartialPrice}
          label={isAdministrative ? 'MONTO MENSUAL' : 'COSTO PARCIAL'}
        >
          {isAdministrative && editValues && (
            <Input
              styleInput={3}
              value={footerData.totalPartialPrice}
              type="number"
              name="totalPartialPrice"
              width={7}
              autoFocus
              onChange={handleSetValues}
              onBlur={onBlurSetValues}
              isMoney
            />
          )}
        </TaskSelectViewTotal>
      </div>
      {!isAdministrative && (
        <div className="reportPersonalTaskView-footer-container">
          <TaskSelectViewTotal
            label="% de adelanto:"
            fontWeightLabel={400}
            colorLabel="dark"
          >
            <InputPercentage
              value={percentage}
              onChange={value =>
                handleSetFooterData('percentagePayment', value)
              }
              width={4}
              disabled={!editValues}
            />
          </TaskSelectViewTotal>
          <TaskSelectViewTotal
            cost={advanceCost}
            label="ADELANTO POR COSTO PARCIAL"
          />
        </div>
      )}

      <div className="reportPersonalTaskView-footer-container">
        <TaskSelectViewTotal
          cost={+footerData.earlyPaymentDiscount}
          label="ANTICIPO"
          onHover
          onClick={viewAttendance}
          colorCost="dangerLight"
          fontWeightCost={300}
        >
          {editValues && (
            <Input
              styleInput={3}
              value={footerData.earlyPaymentDiscount}
              type="number"
              name="earlyPaymentDiscount"
              width={4}
              autoFocus
              onChange={handleSetValues}
              onBlur={onBlurSetValues}
              isMoney
            />
          )}
        </TaskSelectViewTotal>
        <TaskSelectViewTotal
          cost={+footerData.attendanceDiscount}
          label="DESCUENTO ASISTENCIA"
          onHover
          onClick={viewAttendance}
          colorCost="dangerLight"
          fontWeightCost={300}
        >
          {editValues && (
            <Input
              styleInput={3}
              value={footerData.attendanceDiscount}
              type="number"
              name="attendanceDiscount"
              width={4}
              autoFocus
              onChange={handleSetValues}
              onBlur={onBlurSetValues}
              isMoney
            />
          )}
        </TaskSelectViewTotal>
        <TaskSelectViewTotal
          cost={+footerData.licensesDiscount}
          label="DESCUENTO SALIDAS"
          colorCost="dangerLight"
          fontWeightCost={300}
        >
          {editValues && (
            <Input
              styleInput={3}
              value={footerData.licensesDiscount}
              type="number"
              name="licensesDiscount"
              width={4}
              autoFocus
              onChange={handleSetValues}
              onBlur={onBlurSetValues}
              isMoney
            />
          )}
        </TaskSelectViewTotal>

        <TaskSelectViewTotal
          cost={totalDiscount}
          label="DSCT. TOTAL"
          colorLabel="dark"
          fontWeightLabel={400}
          colorCost="danger"
        />
      </div>
      <div className="reportPersonalTaskView-footer-container">
        {!isAdministrative && (
          <TaskSelectViewTotal
            label="SALDO"
            colorLabel="dark"
            fontWeightLabel={400}
          >
            <TaskSumValues
              firstValue={totalPartialPrice}
              secondValue={-advanceCost}
            />
          </TaskSelectViewTotal>
        )}
        <TaskSelectViewTotal
          label="LIQUIDO A PERCIBIR ADELANTO"
          colorLabel="dark"
          fontWeightLabel={400}
        >
          <TaskSumValues
            firstValue={advanceCost}
            secondValue={-totalDiscount}
          />
        </TaskSelectViewTotal>
      </div>
    </div>
  );
};

export default ReportPersonalTaskFooter;

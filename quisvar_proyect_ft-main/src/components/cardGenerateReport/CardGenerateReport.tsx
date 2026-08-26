import './CardGenerateReport.css';
import { isOpenCardGenerateReport$ } from '@/services/sharingSubject';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import Button from '../button/Button';
import Input from '../Input/Input';
import TextArea from '../textArea/TextArea';
import Modal from '../portal/Modal';
import CloseIcon from '../closeIcon/CloseIcon';
import { axiosInstance } from '@/services/axiosInstance';
import type { ReportForm } from '@/types/types';
import type { RootState } from '@/store/store.types';
import { useSelector } from 'react-redux';
import { useEffect, useRef, useState } from 'react';
import { Subscription } from 'rxjs';
import { getTimeOut } from '@/utils/formatDate';
import {
  validatePorcentage,
  validateWhiteSpace,
} from '@/utils/customValidatesForm';
import { excelReport } from '@/utils/generateExcel';
import { formatDateWeekdayUtc } from '@/utils/dayjsSpanish';

interface CardGenerateReportProps {
  employeeId?: number;
}
const CardGenerateReport = ({ employeeId }: CardGenerateReportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const handleIsOpen = useRef<Subscription>(new Subscription());

  useEffect(() => {
    handleIsOpen.current = isOpenCardGenerateReport$.getSubject.subscribe(
      value => setIsOpen(value)
    );
    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, []);

  const userId = useSelector((state: RootState) => state.userSession.id);
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<ReportForm>();

  const showModal = () => {
    reset({});
    setIsOpen(false);
  };
  const onSubmit: SubmitHandler<ReportForm> = async data => {
    const initialDate = formatDateWeekdayUtc(data.initialDate);
    const untilDate = formatDateWeekdayUtc(data.untilDate);
    const totalDays = getTimeOut(data.initialDate, data.untilDate) / 24;
    const idGenerate = employeeId ?? userId;
    const URL = `/reports/user/${idGenerate}?initial=${data.initialDate}&until=${data.untilDate}&status=DONE`;
    axiosInstance.get(URL).then(res => {
      const { projects } = res.data;
      const { firstName, lastName, dni, phone, degree } = res.data.user.profile;
      const infoData = {
        ...data,
        initialDate,
        untilDate,
        totalDays,
        firstName,
        lastName,
        dni,
        phone,
        degree,
      };
      excelReport(projects, infoData);
    });
  };

  return (
    <Modal size={50} isOpenProp={isOpen}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="card-generate-report"
        autoComplete="off"
      >
        <div className="report-title">
          <h2>Generar Reporte</h2>
        </div>
        <CloseIcon onClick={showModal} />
        <div className="col-input">
          <Input
            label="Fecha Inicio:"
            {...register('initialDate')}
            name="initialDate"
            type="date"
          />
          <Input
            label="Fecha Limite:"
            {...register('untilDate')}
            name="untilDate"
            type="date"
          />
          <Input
            label="Porcentaje de Adelanto:"
            {...register('porcentageValue', {
              required: 'Este campo es obligatorio',
              validate: { validateWhiteSpace, validatePorcentage },
              valueAsNumber: true,
            })}
            name="porcentageValue"
            type="number"
            placeholder="Porcentaje de Adelanto"
            errors={errors}
          />
        </div>

        <Input
          label="Concepto:"
          {...register('concept', {
            required: 'Este campo es obligatorio',
            validate: { validateWhiteSpace },
          })}
          name="concept"
          type="text"
          placeholder="Concepto"
          errors={errors}
        />

        <TextArea
          label="Titulo del Informe:"
          {...register('title', {
            required: 'Este campo es obligatorio',
            validate: { validateWhiteSpace },
          })}
          name="title"
          placeholder="Titulo del Informe"
          errors={errors}
        />
        <Button type="submit" text="Generar" />
      </form>
    </Modal>
  );
};

export default CardGenerateReport;

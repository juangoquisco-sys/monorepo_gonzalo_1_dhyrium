import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import './cardAddTraining.css';
import Input from '@/components/Input/Input';
import Button from '@/components/button/Button';
import Modal from '@/components/portal/Modal';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import type { TrainingSpecialty } from '@/types/types';
import { Subscription } from 'rxjs';
import { isOpenAddTraining$ } from '@/services/sharingSubject';
import { axiosInstance } from '@/services/axiosInstance';
import { _date } from '@/utils/formatDate';

interface CardAddTrainingProps {
  onSave?: () => void;
}

const CardAddTraining = ({ onSave }: CardAddTrainingProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [trainingListId, setTrainingListId] = useState<number>();
  const [trainingId, setTrainingId] = useState<number>();
  const [data, setData] = useState<TrainingSpecialty>();
  // const { infoId } = useParams();
  const handleIsOpen = useRef<Subscription>(new Subscription());
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    // watch,
    formState: { errors },
  } = useForm<TrainingSpecialty>();
  useEffect(() => {
    handleIsOpen.current = isOpenAddTraining$.getSubject.subscribe(value => {
      setIsOpen(value.isOpen);
      setTrainingListId(value.id);
      setTrainingId(value.recordId);
      setData(value.data);
    });
    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!data) return;
    setValue('institution', data.institution);
    setValue('hours', data.hours);
    setValue('level', data.level);
    setValue('issue', _date(data.issue as Date));
    setValue('startDate', _date(data.startDate as Date));
    setValue('untilDate', _date(data.untilDate as Date));
  }, [data, setValue]);

  const closeFunctions = () => {
    setIsOpen(false);
    reset({});
  };
  const onSubmit: SubmitHandler<TrainingSpecialty> = async data => {
    const files =
      data.trainingFile instanceof FileList ? data.trainingFile[0] : undefined;
    const issue = data.issue?.toString() ?? '';
    const startDate = data.startDate?.toString() ?? '';
    const untilDate = data.untilDate?.toString() ?? '';
    const TrainingSpecialistNameId = trainingListId?.toString() ?? '';
    const formData = new FormData();
    formData.append('institution', data.institution);
    formData.append('hours', data.hours);
    formData.append('level', data.level);
    formData.append('startDate', startDate);
    formData.append('untilDate', untilDate);
    formData.append('issue', issue);
    formData.append('TrainingSpecialistNameId', TrainingSpecialistNameId);
    if (files) formData.append('trainingFile', files);
    const headers = {
      'Content-type': 'multipart/form-data',
    };
    const request = trainingId
      ? axiosInstance.patch(`/trainingSpecialty/${trainingId}`, formData, {
          headers,
        })
      : axiosInstance.post(`/trainingSpecialty`, formData, { headers });
    request.then(() => {
      setIsOpen(false);
      reset({});
      onSave?.();
    });
  };
  return (
    <Modal size={50} isOpenProp={isOpen}>
      <form onSubmit={handleSubmit(onSubmit)} className="card-specialist">
        <CloseIcon onClick={closeFunctions} />
        <h1>{data ? 'Editar' : 'Registrar'} Capacitacion</h1>

        <div className="specialist-col">
          <Input
            label="Institucion"
            placeholder="Institucion"
            {...register('institution')}
            name="institution"
            errors={errors}
          />
        </div>

        <div className="specialist-col">
          <Input
            label="Desde"
            type="date"
            {...register('startDate')}
            name="startDate"
            errors={errors}
          />
          <Input
            label="Hasta"
            type="date"
            {...register('untilDate')}
            name="untilDate"
            errors={errors}
          />
          <Input
            label="Fecha de Emision"
            type="date"
            {...register('issue')}
            name="issue"
            errors={errors}
          />
        </div>
        <div className="specialist-col">
          <Input
            label="Horas"
            placeholder="Nº de horas"
            {...register('hours')}
            name="hours"
            errors={errors}
          />
          <label className="input-main">
            <span className="input-label">Nivel *</span>
            <select
              className="input-main-style-2"
              defaultValue=""
              {...register('level', { required: 'El nivel es obligatorio' })}
            >
              <option value="" disabled>
                Selecciona el nivel
              </option>
              <option value="BASICO">Básico</option>
              <option value="INTERMEDIO">Intermedio</option>
              <option value="AVANZADO">Avanzado</option>
              <option value="ESPECIALISTA">Especialista</option>
            </select>
          </label>
          <Input
            label="Documento"
            type="file"
            {...register('trainingFile')}
            name="trainingFile"
            errors={errors}
          />
        </div>
        <div className="add-tr-btn-area">
          <Button text="Guardar" type="submit" className="add-tr-btn" />
        </div>
      </form>
    </Modal>
  );
};

export default CardAddTraining;

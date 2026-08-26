import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import './cardAddExperience.css';
import Input from '@/components/Input/Input';
import Button from '@/components/button/Button';
import Modal from '@/components/portal/Modal';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import type { AreaSpecialty } from '@/types/types';
import { Subscription } from 'rxjs';
import { isOpenAddExperience$ } from '@/services/sharingSubject';
import { axiosInstance } from '@/services/axiosInstance';

interface CardExperienceProps {
  onSave?: () => void;
}

const CardAddExperience = ({ onSave }: CardExperienceProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasId, setHasId] = useState<number>();
  const [data, setData] = useState<AreaSpecialty>();

  const handleIsOpen = useRef<Subscription>(new Subscription());
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    // watch,
    formState: { errors },
  } = useForm<AreaSpecialty>();
  useEffect(() => {
    handleIsOpen.current = isOpenAddExperience$.getSubject.subscribe(value => {
      setIsOpen(value.isOpen);
      setHasId(value.id);
      setData(value.data);
    });
    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!data) return;
    setValue('institution', data.institution);
    setValue('startDate', data.startDate);
    setValue('untilDate', data.untilDate);
    // setValue('file', data.file);
  }, [data, setValue]);

  const closeFunctions = () => {
    setIsOpen(false);
    reset({});
  };
  const onSubmit: SubmitHandler<AreaSpecialty> = async data => {
    const files = data.file?.[0];

    const startDate = data.startDate.toString() ?? '';
    const untilDate = data.untilDate.toString() ?? '';
    const areaSpecialtyNameId = hasId?.toString() ?? '';
    const formData = new FormData();
    // formData.append('specialtyName', data.specialtyName);
    formData.append('institution', data.institution);
    formData.append('startDate', startDate);
    formData.append('untilDate', untilDate);
    formData.append('areaSpecialtyNameId', areaSpecialtyNameId);
    formData.append('file', files);
    const headers = {
      'Content-type': 'multipart/form-data',
    };
    axiosInstance.post(`/areaSpecialty`, formData, { headers }).then(() => {
      setIsOpen(false);
      reset({});
      onSave?.();
    });
  };
  return (
    <Modal size={50} isOpenProp={isOpen}>
      <form onSubmit={handleSubmit(onSubmit)} className="card-specialist">
        <CloseIcon onClick={closeFunctions} />
        <h1>{data ? 'Editar' : 'Registrar'} Experiencia</h1>

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
            label="Inicio"
            type="date"
            {...register('startDate')}
            name="startDate"
            errors={errors}
          />
          <Input
            label="Fin"
            type="date"
            {...register('untilDate')}
            name="untilDate"
            errors={errors}
          />
          <Input
            label="Documento"
            type="file"
            {...register('file')}
            name="file"
            errors={errors}
          />
        </div>
        <div className="add-ex-btn-area">
          <Button text="Guardar" type="submit" className="add-ex-btn" />
        </div>
      </form>
    </Modal>
  );
};

export default CardAddExperience;

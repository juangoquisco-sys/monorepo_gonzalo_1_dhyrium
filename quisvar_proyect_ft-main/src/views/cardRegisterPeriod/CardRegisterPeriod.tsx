import Button from '@/components/button/Button';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import Input from '@/components/Input/Input';
import Modal from '@/components/portal/Modal';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { axiosInstance } from '@/services/axiosInstance';
import { useEffect, useRef, useState } from 'react';
import { isOpenModalPeriod$ } from '@/services/sharingSubject';
import { Subscription } from 'rxjs';
import { formatDateUtcRHF, formatUTCDate } from '@/utils/dayjsSpanish';

interface Period {
  id?: number;
  initialDate: Date | string;
  untilDate: Date | string;
}
interface CardRegisterPeriodProps {
  onSave: () => void;
}

const CardRegisterPeriod = ({ onSave }: CardRegisterPeriodProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,

    formState: { errors },
  } = useForm<Period>();
  const handleIsOpen = useRef<Subscription>(new Subscription());

  const onSubmit: SubmitHandler<Period> = async ({
    initialDate,
    untilDate,
    id,
  }) => {
    const body = {
      initialDate: formatUTCDate(initialDate),
      untilDate: formatUTCDate(untilDate),
    };

    if (id) {
      await axiosInstance.put(`/phases/${id}`, body);
    } else {
      await axiosInstance.post('/phases', body);
    }
    closeFunctions();
    onSave();
  };

  useEffect(() => {
    handleIsOpen.current = isOpenModalPeriod$.getSubject.subscribe(
      ({ data, isOpen }) => {
        setIsOpen(isOpen);
        if (data) {
          reset({
            id: data.id,
            initialDate: formatDateUtcRHF(data.initialDate),
            untilDate: formatDateUtcRHF(data.untilDate),
          });
        } else {
          reset({});
        }
      }
    );
    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, []);

  const closeFunctions = () => {
    setIsOpen(false);
    reset({});
  };
  return (
    <Modal size={50} isOpenProp={isOpen}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="card-register"
        autoComplete="off"
      >
        <CloseIcon onClick={closeFunctions} />
        <h1>{watch('id') ? 'Editar periodo' : 'Registrar periodo'}</h1>
        <div className="col-input">
          <Input
            label="Fecha inicial"
            type="date"
            {...register('initialDate', {
              valueAsDate: true,
            })}
            errors={errors}
            name="initialDate"
          />
          <Input
            label="Fecha final"
            type="date"
            {...register('untilDate', {
              valueAsDate: true,
            })}
            errors={errors}
            name="untilDate"
          />
        </div>
        <Button text="Guardar" type="submit" position="center" />
      </form>
    </Modal>
  );
};

export default CardRegisterPeriod;

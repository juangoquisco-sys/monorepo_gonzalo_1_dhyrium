import { Subscription } from 'rxjs';
import Button from '@/components/button/Button';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import Input from '@/components/Input/Input';
import Modal from '@/components/portal/Modal';
import './cardAddProfession.css';
import { useEffect, useRef, useState } from 'react';
import { isOpenCardProfession$ } from '@/services/sharingSubject';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import type { Profession } from '@/types/types';
import {
  validateWhiteSpace,
  validateOnlyDecimals,
} from '@/utils/customValidatesForm';
import { axiosInstance } from '@/services/axiosInstance';

interface CardAddProfessionProps {
  onSave?: (data?: Profession) => void;
  onUsersUpdated?: () => void | Promise<void>;
}
const CardAddProfession = ({
  onSave,
  onUsersUpdated,
}: CardAddProfessionProps) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<Profession>();
  const [isOpen, setIsOpen] = useState(false);
  const handleIsOpen = useRef<Subscription>(new Subscription());
  useEffect(() => {
    handleIsOpen.current = isOpenCardProfession$.getSubject.subscribe(
      ({ isOpen, data }) => {
        setIsOpen(isOpen);
        if (data) {
          const { abrv, label, value, amount } = data;
          reset({
            abrv,
            label,
            value,
            amount,
          });
        }
      }
    );

    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, []);
  const onSubmit: SubmitHandler<Profession> = async ({
    abrv,
    label,
    value,
    amount,
  }) => {
    const body = {
      abrv,
      label,
      amount,
    };
    if (value) {
      await axiosInstance.patch(`/profession/${value}`, body);
      onSave?.();
    } else {
      const res = await axiosInstance.post<Profession>(`/profession`, body);
      onSave?.(res.data);
    }
    await onUsersUpdated?.();
    closeFunctions();
  };
  const closeFunctions = () => {
    setIsOpen(false);
    reset({});
  };
  return (
    <Modal size={50} isOpenProp={isOpen}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="card-register-users"
        autoComplete="off"
      >
        <CloseIcon onClick={closeFunctions} />
        <h1>{watch('value') ? 'Editar' : 'Agregar'} Profesión</h1>
        <div className="col-input">
          <Input
            label="Nombre:"
            {...register('label', {
              validate: { validateWhiteSpace },
            })}
            name="label"
            placeholder="Nombre..."
            errors={errors}
            type="text"
          />
          <Input
            label="Abreviatura:"
            {...register('abrv', {
              validate: { validateWhiteSpace },
            })}
            name="abrv"
            placeholder="Abreviatura..."
            errors={errors}
            type="text"
          />
          <Input
            label="Monto:"
            {...register('amount', {
              validate: { validateWhiteSpace, validateOnlyDecimals },
              valueAsNumber: true,
            })}
            name="amount"
            placeholder="Monto..."
            errors={errors}
          />
        </div>

        <Button text={watch('value') ? 'GUARDAR' : 'CREAR'} type="submit" />
      </form>
    </Modal>
  );
};

export default CardAddProfession;

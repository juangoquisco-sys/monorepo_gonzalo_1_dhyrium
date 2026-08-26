import { useEffect, useRef, useState } from 'react';
import Button from '@/components/button/Button';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import Input from '@/components/Input/Input';
import Modal from '@/components/portal/Modal';
import { validateWhiteSpace } from '@/utils/customValidatesForm';
import { Subscription } from 'rxjs';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { axiosInstance } from '@/services/axiosInstance';
import { isOpenCardOffice$ } from '@/services/sharingSubject';
import type { OfficeClass } from '@/types/types';

interface CardAddOfficeProps {
  onSave?: () => void;
  onUsersUpdated?: () => void | Promise<void>;
}

const CardAddOffice = ({ onSave, onUsersUpdated }: CardAddOfficeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<OfficeClass>();
  const handleIsOpen = useRef<Subscription>(new Subscription());
  useEffect(() => {
    handleIsOpen.current = isOpenCardOffice$.getSubject.subscribe(
      ({ isOpen, data }) => {
        setIsOpen(isOpen);
        if (data) {
          const { name, id } = data;
          reset({
            name,
            id,
          });
        }
      }
    );

    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, []);
  const onSubmit: SubmitHandler<OfficeClass> = async ({ name, id }) => {
    const body = {
      name,
    };

    if (id) {
      await axiosInstance.put(`/office/${id}`, body);
    } else {
      await axiosInstance.post(`/office`, body);
    }
    onSave?.();
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
        <h1>{watch('id') ? 'Editar' : 'Agregar'} oficina </h1>
        <div className="col-input">
          <Input
            label="Nombre:"
            {...register('name', {
              validate: { validateWhiteSpace },
            })}
            name="name"
            placeholder="Nombre..."
            errors={errors}
            type="text"
          />
        </div>
        <Button text={watch('id') ? 'GUARDAR' : 'CREAR'} type="submit" />
      </form>
    </Modal>
  );
};

export default CardAddOffice;

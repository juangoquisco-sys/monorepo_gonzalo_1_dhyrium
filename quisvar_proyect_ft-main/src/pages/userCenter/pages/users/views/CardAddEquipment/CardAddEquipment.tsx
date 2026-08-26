import { useEffect, useRef, useState } from 'react';
import './cardAddEquipment.css';
import { Subscription } from 'rxjs';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { isOpenCardAddEquipment$ } from '@/services/sharingSubject';
import type { WorkStation } from '@/types/types';
import { validateWhiteSpace } from '@/utils/customValidatesForm';
import { axiosInstance } from '@/services/axiosInstance';
import Button from '@/components/button/Button';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import Input from '@/components/Input/Input';
import Modal from '@/components/portal/Modal';
import TextArea from '@/components/textArea/TextArea';

interface CardAddEquipmentProps {
  onSave: () => void;
}
const CardAddEquipment = ({ onSave }: CardAddEquipmentProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<WorkStation>();
  const handleIsOpen = useRef<Subscription>(new Subscription());
  const {
    register,
    handleSubmit,
    // setValue,
    reset,
    // watch,
    formState: { errors },
  } = useForm<WorkStation>();
  useEffect(() => {
    handleIsOpen.current = isOpenCardAddEquipment$.getSubject.subscribe(
      value => {
        setIsOpen(value.isOpen);
        setData(value.data);

        if (value.data) {
          reset({
            name: value.data?.name.split(' ')[1],
            description: value.data?.description,
            total: value.data?.total,
            price: value.data?.price,
          });
        }
      }
    );
    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, [reset]);
  const onSubmit: SubmitHandler<WorkStation> = async values => {
    // console.log(data);
    if (!data) {
      const file = values.doc?.[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', `Remoto ${values.name}`);
      formData.append('total', values.total.toString());
      formData.append('price', values.price);
      formData.append('description', values.description);
      const headers = {
        'Content-type': 'multipart/form-data',
      };
      axiosInstance
        .post(`/workStation`, formData, { headers })
        .then(successfulShipment);
    } else {
      const newData = {
        name: `Remoto ${values.name}`,
        total: values.total,
        price: values.price,
        description: values.description,
      };
      axiosInstance
        .patch(`/workStation/${data.id}`, newData)
        .then(successfulShipment);
    }
  };
  const successfulShipment = () => {
    onSave?.();
    setIsOpen(false);
    reset();
  };
  const closeFunctions = () => {
    setIsOpen(false);
    // onClose?.();
    // setErrorPassword({});
    reset({});
  };
  return (
    <Modal size={50} isOpenProp={isOpen}>
      <form onSubmit={handleSubmit(onSubmit)} className="card-register-users">
        <CloseIcon onClick={closeFunctions} />
        <h1>Agregar Equipo</h1>
        <div className="col-input">
          <Input
            {...register('name', {
              validate: { validateWhiteSpace },
            })}
            placeholder="N° 000"
            label="Equipo (remoto) N°"
            errors={errors}
            type="number"
          />
          <Input
            {...register('total')}
            placeholder="#"
            label="Total de pantallas"
            errors={errors}
            type="number"
          />
        </div>
        <div className="col-input">
          <Input
            {...register('doc')}
            placeholder=""
            errors={errors}
            label="Documento"
            type="file"
          />
          <Input
            {...register('price', {
              validate: { validateWhiteSpace },
            })}
            placeholder="S/. 00.00"
            errors={errors}
            label="Precio S/."
            type="number"
          />
        </div>
        <TextArea
          {...register('description', {
            validate: { validateWhiteSpace },
          })}
          placeholder=""
          errors={errors}
          label="Description"
          className="card-equipment-description"
        />
        <div className="btn-build">
          <Button
            text={data ? 'GUARDAR' : 'CREAR'}
            className="btn-area"
            whileTap={{ scale: 0.9 }}
            type="submit"
          />
        </div>
      </form>
    </Modal>
  );
};

export default CardAddEquipment;

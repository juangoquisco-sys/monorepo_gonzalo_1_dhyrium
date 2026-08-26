import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Subscription } from 'rxjs';
import './cardConsortium.css';
import { isOpenCardConsortium$ } from '@/services/sharingSubject';
import Button from '@/components/button/Button';
import ButtonDelete from '@/components/button/ButtonDelete';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import Input from '@/components/Input/Input';
import Modal from '@/components/portal/Modal';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import type { ConsortiumType, ConsortiumTypeForm } from '@/types/types';
import { axiosInstance } from '@/services/axiosInstance';
import { normalizeFileName } from '@/utils/tools';
import { validateJPGExtension } from '@/utils/customValidatesForm';

type CardConsortiumProps = {
  onSave?: () => void;
};

const CardConsortium = ({ onSave }: CardConsortiumProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasId, setHasId] = useState<number>();
  const [data, setData] = useState<ConsortiumType>();
  const handleIsOpen = useRef<Subscription>(new Subscription());
  const {
    register,
    handleSubmit,
    // setValue,
    reset,
    // watch,
    formState: { errors },
  } = useForm<ConsortiumTypeForm>();
  const closeFunctions = () => {
    setHasId(undefined);
    setIsOpen(false);
    reset({});
    // onSave?.();
  };
  useEffect(() => {
    handleIsOpen.current = isOpenCardConsortium$.getSubject.subscribe(value => {
      setIsOpen(value.isOpen);
      setHasId(value.id);
    });
    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, []);
  const onSubmit: SubmitHandler<ConsortiumTypeForm> = values => {
    const headers = {
      'Content-type': 'multipart/form-data',
    };
    const img = values.img?.[0];
    const formData = new FormData();
    if (!hasId) {
      formData.append('img', img ?? '');
      formData.append('name', values.name);
      formData.append('manager', values.manager);
      axiosInstance.post(`/consortium`, formData, { headers }).then(() => {
        closeFunctions();
        onSave?.();
      });
    } else {
      const newData = {
        name: values.name,
        manager: values.manager,
      };
      axiosInstance.patch(`/consortium/${hasId}`, newData).then(() => {
        closeFunctions();
        onSave?.();
      });
    }
  };
  useEffect(() => {
    if (hasId) getConsortium();
  }, [hasId]);
  const getConsortium = () => {
    axiosInstance.get<ConsortiumType>(`/consortium/${hasId}`).then(res => {
      setData(res.data);
      reset({ name: res.data.name, manager: res.data.manager });
    });
  };
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const fileInput = event.target;
    const img = fileInput.files?.[0];
    const formData = new FormData();
    formData.append('img', img ?? '');
    const headers = {
      'Content-type': 'multipart/form-data',
    };
    axiosInstance
      .patch(`/consortium/img/${hasId}`, formData, { headers })
      .then(() => {
        getConsortium(), onSave?.();
      });
  };
  return (
    <Modal size={50} isOpenProp={isOpen}>
      <form onSubmit={handleSubmit(onSubmit)} className="card-company">
        <CloseIcon onClick={closeFunctions} />

        <h1>{hasId ? 'Actualizar ' : 'Registrar '}Consorcio</h1>
        <div className="company-col">
          <Input
            label="Consorcio"
            {...register('name', { required: true })}
            name="name"
            errors={errors}
          />
          <Input
            label="Representante"
            {...register('manager', { required: true })}
            name="manager"
            errors={errors}
          />
        </div>
        {hasId ? (
          data?.img ? (
            <div className="cc-img-area">
              <h4 className="cc-img-title">{normalizeFileName(data?.img)}</h4>
              <ButtonDelete
                icon="trash"
                className="role-delete-icon"
                url={`/consortium/img/${hasId}`}
                type="button"
                onSave={() => {
                  getConsortium(), onSave?.();
                }}
              />
            </div>
          ) : (
            <Input
              placeholder=""
              errors={errors}
              label="Imagen del consorcio (.jpg)"
              type="file"
              accept="image/jpeg, image/png, .svg"
              onChange={handleFileChange}
            />
          )
        ) : (
          <Input
            {...register('img', { validate: validateJPGExtension })}
            placeholder=""
            errors={errors}
            label="Imagen del consorcio (.jpg)"
            type="file"
          />
        )}
        <Button
          text="Guardar"
          type="submit"
          className="btn-area"
          variant="outline"
        />
      </form>
    </Modal>
  );
};

export default CardConsortium;

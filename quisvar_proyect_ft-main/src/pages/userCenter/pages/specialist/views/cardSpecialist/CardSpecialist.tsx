import { useEffect, useState } from 'react';
import './cardSpecialist.css';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import type { Profession, Specialists } from '@/types/types';
import { isOpenCardSpecialist$ } from '@/services/sharingSubject';

import Input from '@/components/Input/Input';
import Button from '@/components/button/Button';
import Modal from '@/components/portal/Modal';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import Select from '@/components/select/Select';
import { axiosInstance } from '@/services/axiosInstance';
import { DEGREE_DATA, TUITION } from '../../../users/models/dataUserRegister';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { capitalizeText } from '@/utils/tools';
import {
  validateDNI,
  validateOnlyNumbers,
  validateWhiteSpace,
} from '@/utils/customValidatesForm';
import { useNavigate } from 'react-router-dom';
import useModalSubscription from '@/hooks/useModalSubscription';
type CardSpecialistProps = {
  onSave?: () => void;
};

let apply: null | Function = null;
const CardSpecialist = ({ onSave }: CardSpecialistProps) => {
  const navigate = useNavigate();
  const [dataSpecialist, setDataSpecialist] = useState<Specialists | undefined>(
    undefined
  );
  const [professions, setProfessions] = useState<Profession[] | null>(null);
  const {
    register,
    handleSubmit,
    // setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<Specialists>();
  useEffect(() => {
    getProfession();
    return reset({});
  }, [dataSpecialist, reset]);
  const formattedDate = (value: string | Date | undefined) => {
    const parts = (value as string)?.split('T');
    return parts[0];
  };

  const { onCloseModal, isOpenModal } = useModalSubscription(
    isOpenCardSpecialist$,
    value => {
      setDataSpecialist(value.data);
      if (value.function) apply = value.function;
      if (value.data) {
        reset({
          ...value.data,
          inscriptionDate: formattedDate(value.data?.inscriptionDate),
        });
      }
    }
  );

  const getProfession = () => {
    // if (data) setValue('career', data.label);

    axiosInstance
      .get(`/profession`, {
        headers: {
          noLoader: true,
        },
      })
      .then(res => {
        setProfessions(res.data);
      });
  };
  const closeFunctions = () => {
    reset({});
    onCloseModal();
    // onSave?.();
  };
  const onSubmit: SubmitHandler<Specialists> = async data => {
    const cvFile = data.cvFile?.[0] as File;
    const agreementFile = data.agreementFile?.[0] as File;

    if (!dataSpecialist) {
      const formData = new FormData();
      formData.append('dni', data.dni);
      formData.append('firstName', data.firstName);
      formData.append('lastName', data.lastName);
      formData.append('phone', data.phone);
      formData.append('career', data.career);
      formData.append('degree', data.degree);
      formData.append('agreementFile', agreementFile);
      formData.append('cvFile', cvFile);
      formData.append('price', '3000');
      formData.append('tuition', data.tuition);
      formData.append('email', data.email);
      formData.append('inscription', data.inscription);
      formData.append('inscriptionDate', data.inscriptionDate.toString());
      const headers = {
        'Content-type': 'multipart/form-data',
      };
      axiosInstance.post(`/specialists`, formData, { headers }).then(() => {
        closeFunctions?.();
        onSave?.();
        reset({
          firstName: '',
          lastName: '',
        });
      });
    } else {
      const newData = {
        dni: data.dni,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        career: data.career,
        degree: data.degree,
        price: data.price,
        tuition: data.tuition,
        inscriptionDate: data.inscriptionDate.toString(),
        inscription: data.inscription,
        email: data.email,
      };
      axiosInstance
        .patch(`/specialists/${dataSpecialist.id}`, newData)
        .then(() => {
          closeFunctions?.();
          onSave?.();
          apply?.();
          navigate(`informacion/${dataSpecialist.id}`);
        });
    }
  };
  const searchUserForDNI = () => {
    const { dni } = watch();
    if (dni.length !== 8)
      return SnackbarUtilities.warning(
        'Asegurese de escribir los 8 digitos del DNI'
      );
    axiosInstance
      .get(
        `https://apiperu.dev/api/dni/${dni}?api_token=9a12c65ca41f46f89a08a564be455a611d07d54069b3454766309d35bcc35511`
      )
      .then(res => {
        if (!res.data.success) return SnackbarUtilities.error(res.data.message);
        const { apellido_paterno, apellido_materno, nombres } = res.data.data;
        reset({
          firstName: capitalizeText(nombres),
          lastName: `${capitalizeText(apellido_paterno)} ${capitalizeText(
            apellido_materno
          )}`,
        });
      });
  };
  return (
    <Modal size={50} isOpenProp={isOpenModal}>
      <form onSubmit={handleSubmit(onSubmit)} className="card-specialist">
        <CloseIcon onClick={() => closeFunctions()} />
        <h2>
          {dataSpecialist ? 'Editar Datos' : 'Registrar nuevo especialista'}
        </h2>

        <div className="specialist-col">
          <Input
            styleInput={4}
            {...register('dni', {
              required: true,
              validate: validateDNI,
            })}
            placeholder="N°"
            label="DNI"
            errors={errors}
            type="number"
            handleSearch={searchUserForDNI}
          />
          <Input
            styleInput={4}
            label="Nombres"
            {...register('firstName', { required: true })}
            name="firstName"
            errors={errors}
          />
          <Input
            styleInput={4}
            label="Apellidos"
            {...register('lastName', { required: true })}
            name="lastName"
            errors={errors}
          />
        </div>

        <div className="specialist-col">
          <Select
            label="Grado:"
            {...register('degree', {
              validate: { validateWhiteSpace },
            })}
            name="degree"
            data={DEGREE_DATA}
            extractValue={({ value }) => value}
            renderTextField={({ value }) => value}
            errors={errors}
          />
          {professions && (
            <Select
              label="Profesión:"
              {...register('career', {
                validate: { validateWhiteSpace },
              })}
              name="career"
              data={professions}
              extractValue={({ label }) => label}
              renderTextField={({ label }) => label}
              errors={errors}
            />
          )}
        </div>
        <div className="specialist-col">
          <Select
            label="Colegiatura"
            {...register('tuition', {
              validate: { validateWhiteSpace },
            })}
            name="tuition"
            data={TUITION}
            extractValue={({ value }) => value}
            renderTextField={({ value }) => value}
            errors={errors}
          />
          <Input
            styleInput={4}
            label="Nº de Inscripcion"
            {...register('inscription', { required: true })}
            name="inscription"
            errors={errors}
          />
          <Input
            styleInput={4}
            label="Fecha de inscripcion"
            {...register('inscriptionDate', { required: true })}
            name="inscriptionDate"
            type="date"
            errors={errors}
          />
        </div>
        <div className="specialist-col">
          {/* <Input styleInput={4} label="Areas de Especialidad" /> */}
          <Input
            styleInput={4}
            label="Celular"
            {...register('phone', {
              validate: validateOnlyNumbers,
            })}
            name="phone"
            minLength={9}
            maxLength={9}
            errors={errors}
          />
          <Input
            styleInput={4}
            label="Correo"
            {...register('email')}
            name="email"
            errors={errors}
          />
          {/* <Input styleInput={4}
            label="Tarifa"
            {...register('price')}
            name="price"
            errors={errors}
          /> */}
        </div>
        {/* <div className="specialist-col">
          <Input
            styleInput={4}
            label="Curriculum Vitae"
            type="file"
            {...register('cvFile')}
            name="cvFile"
            errors={errors}
          />
          <Input
            styleInput={4}
            label="Documento de Acuerdo"
            type="file"
            {...register('agreementFile')}
            name="agreementFile"
            errors={errors}
          />
        </div> */}
        <Button
          text={dataSpecialist ? 'Actualizar' : 'Guardar'}
          type="submit"
          position="center"
        />
      </form>
    </Modal>
  );
};

export default CardSpecialist;

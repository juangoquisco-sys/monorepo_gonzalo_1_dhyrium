import {
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { Subscription } from 'rxjs';
import './CardCompany.css';
import { isOpenCardCompany$ } from '@/services/sharingSubject';
import Input from '@/components/Input/Input';
import Modal from '@/components/portal/Modal';
import Button from '@/components/button/Button';
import ButtonDelete from '@/components/button/ButtonDelete';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import AdvancedSelect from '@/components/select/AdvancedSelect';
import { Controller, useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import type { Companies, CompaniesForm } from '@/types/types';
import { axiosInstance } from '@/services/axiosInstance';
import { normalizeFileName } from '@/utils/tools';
import { validateJPGExtension, validateRuc } from '@/utils/customValidatesForm';
import { SocketContext } from '@/context/SocketContex';
import { useCompanyUsers } from '@/hooks/useUserLookupOptions';

type CardCompanyProps = {
  onSave?: () => void;
};
const initial: CompaniesForm = {
  img: undefined,
  id: 0,
  name: '',
  ruc: '',
  color: '',
  phone: '',
  email: '',
  manager: '',
  address: '',
  departure: '',
  CCI: '',
  description: '',
  orderQuantity: 0,
};
const CardCompany = ({ onSave }: CardCompanyProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<Companies>();
  const [hasId, setHasId] = useState<number>();
  const socket = useContext(SocketContext);
  const { data: users = [] } = useCompanyUsers({ enabled: isOpen });
  const profileUsers = users.map(user => ({
    label: user.name,
    value: user.name,
  }));
  const handleIsOpen = useRef<Subscription>(new Subscription());
  const {
    register,
    handleSubmit,
    // setValue,
    reset,
    control,
    // watch,
    formState: { errors },
  } = useForm<CompaniesForm>();

  const formattedDate = (value: string) => {
    if (!value) return '';
    const parts = value.split('T');
    return parts[0];
  };
  const closeFunctions = () => {
    reset(initial);
    setHasId(undefined);
    setIsOpen(false);
    // onSave?.();
  };
  useEffect(() => {
    handleIsOpen.current = isOpenCardCompany$.getSubject.subscribe(value => {
      setIsOpen(value.isOpen);
      if (value.id) {
        setHasId(value.id);
        getCompany(value.id);
      }
    });
    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, []);
  const onSubmit: SubmitHandler<CompaniesForm> = values => {
    const headers = {
      'Content-type': 'multipart/form-data',
    };
    const img = values.img?.[0];
    const managerString = (values.manager as { label: string; value: string }[])
      ?.map(opt => opt.value)
      .join(', ');

    const formData = new FormData();
    if (!hasId) {
      formData.append('img', img ?? '');
      formData.append('name', values.name);
      formData.append('ruc', values.ruc);
      formData.append('manager', managerString);
      formData.append('address', values.address);
      formData.append('departure', values.departure);
      if (values.inscription) {
        formData.append('inscription', values.inscription.toString());
      }
      if (values.activities) {
        formData.append('activities', values.activities.toString());
      }
      if (values.phone) {
        formData.append('phone', values.phone);
      }
      if (values.email) {
        formData.append('email', values.email);
      }
      if (values.SEE) {
        formData.append('SEE', values.SEE.toString());
      }
      formData.append('CCI', values.CCI);
      formData.append('description', values.description);

      axiosInstance.post(`/companies`, formData, { headers }).then(() => {
        closeFunctions();
        onSave?.();
      });
    } else {
      const newData: Partial<Companies> = {
        name: values.name,
        manager: managerString,
        ruc: values.ruc,
        address: values.address,
        departure: values.departure,
      };
      if (values.inscription) {
        newData.inscription = values.inscription.toString();
      }

      if (values.activities) {
        newData.activities = values.activities.toString();
      }
      if (values.phone) {
        newData.phone = values.phone;
      }

      if (values.email) {
        newData.email = values.email;
      }

      if (values.SEE) {
        newData.SEE = values.SEE.toString();
      }
      console.log(values);
      axiosInstance.patch(`/companies/${hasId}`, newData).then(() => {
        closeFunctions();
        onSave?.();
        socket.emit('client:company-update');
      });
    }
  };

  // useEffect(() => {
  //   if (hasId) getCompany();
  // }, [hasId]);
  const getCompany = (id?: number) => {
    axiosInstance
      .get<Companies>(`/companies/information/${id || hasId}`)
      .then(res => {
        setData(res.data);
        console.log(res.data);
        const selectedValues = (res.data.manager as string)
          .split(',')
          .map(s => ({
            label: s.trim(),
            value: s.trim(),
          }));
        reset({
          name: res.data.name,
          manager: selectedValues as { label: string; value: string }[],
          ruc: res.data.ruc,
          address: res.data.address,
          description: res.data.description,
          departure: res.data.departure,
          email: res.data.email,
          phone: res.data.phone,
          activities: formattedDate(res.data.activities as string) || '',
          inscription: formattedDate(res.data.inscription as string) || '',
          SEE: formattedDate(res.data.SEE as string),
          CCI: res.data.CCI,
        });
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
      .patch(`/companies/img/${hasId}`, formData, { headers })
      .then(() => {
        getCompany(), onSave?.();
      });
  };

  return (
    <Modal size={50} isOpenProp={isOpen}>
      <form onSubmit={handleSubmit(onSubmit)} className="card-company">
        <CloseIcon onClick={closeFunctions} />
        <h1>Registrar empresa</h1>
        <div className="company-col">
          <Input
            label="Empresa"
            {...register('name', { required: true })}
            name="name"
            errors={errors}
          />
          <Input
            label="Ruc"
            type="number"
            {...register('ruc', { validate: validateRuc })}
            name="ruc"
            errors={errors}
          />
        </div>
        {/* <Input
          label="Gerente(s) de la empresa"
          {...register('manager', { required: true })}
          name="manager"
          errors={errors}
        /> */}
        <Controller
          control={control}
          name="manager"
          rules={{ required: true }}
          render={({ field }) => (
            // @ts-ignore
            <AdvancedSelect
              {...field}
              placeholder="Dirigido a"
              options={profileUsers || []}
              isClearable
              isMulti
              errors={errors}
            />
          )}
        />

        <div className="company-col">
          <Input
            label="Domicilio fiscal"
            {...register('address', { required: true })}
            name="address"
            errors={errors}
          />
          <Input
            label="Nº de partida registral"
            {...register('departure', { required: true })}
            name="departure"
            errors={errors}
          />
        </div>
        <div className="company-col">
          <Input
            label="Nº de celular"
            {...register('phone')}
            name="phone"
            errors={errors}
          />
          <Input
            label="Correo"
            {...register('email')}
            name="email"
            errors={errors}
          />
        </div>
        <div className="company-col">
          <Input
            label="Fecha de inscripcion"
            type="date"
            {...register('inscription')}
            name="inscription"
            errors={errors}
          />
          <Input
            label="Inicio de actividades"
            type="date"
            {...register('activities')}
            name="activities"
            errors={errors}
            onChange={e => console.log(e.target.value)}
          />
        </div>
        <div className="company-col">
          <Input
            label="S.E.E."
            type="date"
            {...register('SEE')}
            name="SEE"
            errors={errors}
          />
          <Input
            label="CCI"
            {...register('CCI', { required: true })}
            name="CCI"
            errors={errors}
          />
        </div>
        <div className="company-col">
          <Input
            label="Actividad economica"
            {...register('description')}
            name="description"
            errors={errors}
          />
          {hasId ? (
            data?.img ? (
              <div className="cc-img-area">
                <h4 className="cc-img-title">{normalizeFileName(data?.img)}</h4>
                <ButtonDelete
                  icon="trash"
                  className="role-delete-icon"
                  url={`/companies/img/${hasId}`}
                  type="button"
                  onSave={() => {
                    getCompany(), onSave?.();
                  }}
                />
              </div>
            ) : (
              <Input
                placeholder=""
                errors={errors}
                label="Imagen de la empresa"
                type="file"
                accept="image/jpeg, image/png, .svg"
                onChange={handleFileChange}
              />
            )
          ) : (
            <Input
              {...register('img', {
                validate: validateJPGExtension,
              })}
              name="img"
              placeholder=""
              errors={errors}
              label="Imagen de la empresa"
              type="file"
            />
          )}
        </div>
        <Button
          text="Guardar"
          color="lightPrimary"
          textColor="secondary"
          type="submit"
          className="btn-area"
        />
      </form>
    </Modal>
  );
};

export default CardCompany;

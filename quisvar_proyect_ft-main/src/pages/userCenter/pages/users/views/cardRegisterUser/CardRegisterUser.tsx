import './CardRegisterUser.css';
import { useEffect, useState, type ReactNode } from 'react';
import { axiosInstance } from '@/services/axiosInstance';
import {
  isOpenCardOffice$,
  isOpenCardProfession$,
  isOpenCardRegisterUser$,
} from '@/services/sharingSubject';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { UserType } from '@/types/userType';
import type {
  GeneralFile,
  RoleForm,
  Profession,
  Office,
  User,
} from '@/types/types';
import {
  validateEmail,
  validateWhiteSpace,
  validateDNI,
  validateOnlyNumbers,
  validateRuc,
  validateRepeatPassword,
} from '@/utils/customValidatesForm';
import { capitalizeText } from '@/utils/tools';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import AdvancedSelectCrud from '@/components/select/AdvancedSelectCrud';
import Button from '@/components/button/Button';
import { Button as AppButton } from '@/components/ui/button';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import Input from '@/components/Input/Input';
import Modal from '@/components/portal/Modal';
import Select from '@/components/select/Select';
import useJurisdiction from '@/hooks/useJurisdiction';
import useModalSubscription from '@/hooks/useModalSubscription';
import {
  DEGREE_DATA,
  GENDER,
  PAYROLL_CONTRACT_TYPE_DATA,
} from '../../models/dataUserRegister';
import type { OfficeSelect, UserForm } from '../../models/types';
import CarRegisterSwornDeclaration from '../carRegisterSwornDeclaration/CarRegisterSwornDeclaration';
import CardAddProfession from '../cardAddProfession/CardAddProfession';
import CardAddOffice from '../cardAddOffice/CardAddOffice';

interface CardRegisterUserProps {
  onSave?: () => void | Promise<void>;
  generalFiles: GeneralFile[] | null;
  /** Permite reutilizar la ficha en un DialogStack sin abrir el modal legado. */
  embedded?: boolean;
  user?: User;
  availableRoles?: RoleForm[] | null;
  onCancel?: () => void;
  /** Mantiene abierta la ficha embebida cuando se guarda desde un flujo compuesto. */
  closeAfterSave?: boolean;
  /** Evita montar el panel legado de declaración en flujos que lo muestran en una pestaña. */
  showSwornDeclaration?: boolean;
  /** Presenta la ficha existente en secciones compactas, sin cambiar sus datos ni guardado. */
  compact?: boolean;
}

type CompactSectionId =
  | 'identity'
  | 'assignment'
  | 'internal'
  | 'location'
  | 'payroll'
  | 'reference';

interface CompactUserSectionProps {
  id: CompactSectionId;
  title: string;
  children: ReactNode;
}

const COMPACT_PANEL_LAYOUT: Record<CompactSectionId, string> = {
  identity: 'xl:col-span-12',
  assignment: 'xl:col-span-12',
  internal: 'xl:col-span-6',
  location: 'xl:col-span-6',
  payroll: 'xl:col-span-6',
  reference: 'xl:col-span-6',
};

const CompactUserSection = ({
  id,
  title,
  children,
}: CompactUserSectionProps) => (
  <section
    className={`rounded-lg border border-border bg-background p-4 ${COMPACT_PANEL_LAYOUT[id]}`}
  >
    <h2 className="mb-4 text-sm font-semibold text-foreground">{title}</h2>
    {children}
  </section>
);

const CardRegisterUser = ({
  onSave,
  generalFiles,
  embedded = false,
  user: embeddedUser,
  availableRoles,
  onCancel,
  closeAfterSave = true,
  showSwornDeclaration = true,
  compact = false,
}: CardRegisterUserProps) => {
  const [offices, setOffices] = useState<null | OfficeSelect[]>(null);
  const [roles, setRoles] = useState<RoleForm[] | null>(null);
  const [professions, setProfessions] = useState<Profession[] | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<UserForm>();
  const {
    departaments,
    districts,
    provinces,
    handleGetDistricts,
    handleGetProvinces,
    setJurisdictionSelectData,
  } = useJurisdiction();

  const formatDateInput = (value?: string | null) => {
    if (!value) return '';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? ''
      : parsed.toISOString().slice(0, 10);
  };

  const payrollContractStartDate = watch('payrollContractStartDate');

  useEffect(() => {
    getProfession();
    getOffices();
  }, []);

  const getOffices = () => {
    const url = `/office?includeUsers=false`;
    axiosInstance.get<Office[]>(url).then(res => {
      const offices = res.data.map(el => ({
        value: String(el.id),
        id: el.id,
        label: el.name,
      }));
      setOffices(offices);
    });
  };
  const getProfession = (data?: Profession) => {
    if (data) setValue('job', data);
    axiosInstance.get(`/profession`).then(res => {
      setProfessions(res.data);
    });
  };

  const populateUserForm = (user: User) => {
    const userOffices = user.offices.map(({ office }) => ({
      value: String(office.id),
      id: office.id,
      label: office.name,
    }));
    const {
      profile,
      id,
      email,
      address,
      ruc,
      roleId,
      userType,
      payrollInfo,
    } = user;
    const { department, province, district } = profile;
    setJurisdictionSelectData(department, province);
    reset({
      id,
      email,
      address,
      ruc,
      department,
      province,
      district,
      description: profile.description,
      dni: profile.dni,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      degree: profile.degree,
      job: profile.job,
      addressRef: profile.addressRef,
      firstNameRef: profile.firstNameRef,
      lastNameRef: profile.lastNameRef,
      room: profile.room,
      userPc: profile.userPc,
      roleId,
      phoneRef: profile.phoneRef,
      gender: profile.gender,
      offices: userOffices,
      userType,
      payrollContractStartDate: formatDateInput(payrollInfo?.contractStartDate),
      payrollContractEndDate: formatDateInput(payrollInfo?.contractEndDate),
      payrollMonthlySalary:
        payrollInfo?.monthlySalary !== undefined &&
        payrollInfo?.monthlySalary !== null
          ? String(payrollInfo.monthlySalary)
          : '',
      payrollContractType: payrollInfo?.contractType ?? 'PLANILLA',
    });
  };

  const { onCloseModal, isOpenModal } = useModalSubscription(
    isOpenCardRegisterUser$,
    data => {
      const { user, roles } = data;
      setRoles(roles);
      if (user?.id) {
        populateUserForm(user);
      }
    }
  );

  useEffect(() => {
    if (!embedded) return;
    setRoles(availableRoles ?? null);
    if (embeddedUser) populateUserForm(embeddedUser);
  }, [availableRoles, embedded, embeddedUser]);

  const onSubmit: SubmitHandler<UserForm> = async data => {
    const { cv, declaration, id, offices, ...resData } = data;
    const officeIds = offices.map(office => office.id);
    const newData = { ...resData, job: resData.job.value, officeIds };
    if (id) {
      await axiosInstance.put(`/profile/${id}`, newData);
    } else {
      const fileCv = cv?.[0] as File;
      const fileDeclaration = declaration?.[0] as File;
      const { officeIds, ...body } = newData;
      const formData = new FormData();
      for (const [key, value] of Object.entries(body)) {
        if (value === undefined || value === null) continue;
        formData.append(key, String(value));
      }
      formData.append('fileUserCv', fileCv);
      formData.append('fileUserDeclaration', fileDeclaration);
      formData.append('officeIds', JSON.stringify(officeIds));
      await axiosInstance.post(`/users`, formData);
    }
    await successfulShipment();
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
          ...watch(),
          firstName: capitalizeText(nombres),
          lastName: `${capitalizeText(apellido_paterno)} ${capitalizeText(
            apellido_materno
          )}`,
        });
      });
  };
  const successfulShipment = async () => {
    await onSave?.();
    if (closeAfterSave) closeFunctions();
  };

  const closeFunctions = () => {
    if (embedded) onCancel?.();
    else onCloseModal();
    reset({ id: null });
  };

  const handleCreateProfession = (label: string) => {
    isOpenCardProfession$.setSubject = {
      isOpen: true,
      data: {
        value: '',
        abrv: '',
        label,
        amount: 0,
      },
    };
  };

  const handleCreateOffice = (label: string) => {
    const body = {
      name: label,
    };
    axiosInstance.post<Office>('/office', body).then(({ data }) => {
      const { offices } = watch();
      setValue('offices', [
        ...(offices ?? []),
        { id: data.id, label: data.name, value: String(data.id) },
      ]);
      getOffices();
    });
  };
  const handleEditProfession = ({ abrv, label, value, amount }: Profession) => {
    isOpenCardProfession$.setSubject = {
      isOpen: true,
      data: {
        abrv,
        label,
        value,
        amount,
      },
    };
  };
  const handleEditOffice = ({ label, id }: OfficeSelect) => {
    isOpenCardOffice$.setSubject = {
      isOpen: true,
      data: {
        id,
        name: label,
      },
    };
  };
  const userData = watch();
  const { id: userId } = userData;
  const compactMode = embedded && compact && Boolean(userId ?? embeddedUser?.id);

  const content = (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={`card-register-users${embedded ? ' is-embedded' : ''}${
          compactMode ? ' is-compact' : ''
        }`}
      >
        {!embedded && <CloseIcon onClick={closeFunctions} />}
        {!embedded && (
          <h1>
            {userId ? 'EDITAR DATOS DE USUARIO' : 'REGISTRO DE NUEVO USUARIO'}
          </h1>
        )}
        {compactMode ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <CompactUserSection
              id="identity"
              title="Datos principales"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Input
                  {...register('dni', {
                    required: true,
                    validate: validateDNI,
                  })}
                  placeholder="N°"
                  label="DNI"
                  errors={errors}
                  type="number"
                  handleSearch={!watch('id') ? searchUserForDNI : false}
                />
                <Input
                  {...register('firstName', { required: true })}
                  placeholder="Nombres"
                  label="Nombres"
                  errors={errors}
                />
                <Input
                  {...register('lastName', { required: true })}
                  placeholder="Apellidos"
                  errors={errors}
                  label="Apellidos"
                  autoComplete="on"
                />
                <Input
                  {...register('email', {
                    required: true,
                    validate: validateEmail,
                  })}
                  errors={errors}
                  placeholder="Correo"
                  label="Correo"
                  name="email"
                />
                <Input
                  {...register('phone', {
                    validate: validateOnlyNumbers,
                  })}
                  placeholder="Celular"
                  label="Celular"
                  type="number"
                  errors={errors}
                />
              </div>
            </CompactUserSection>

            <CompactUserSection
              id="assignment"
              title="Puesto y organización"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {offices && (
                  <AdvancedSelectCrud
                    defaultValue={watch('offices')}
                    control={control}
                    name="offices"
                    options={offices}
                    errors={errors}
                    styleVariant="primary"
                    label="Oficina"
                    isMulti
                    onCreateOption={handleCreateOffice}
                    onEditOption={handleEditOffice}
                    onSave={getOffices}
                    urlDelete={'/office'}
                  />
                )}
                <Input
                  {...register('description', {})}
                  placeholder="Cargo"
                  type="text"
                  errors={errors}
                  label="Cargo"
                />
                {professions && (
                  <AdvancedSelectCrud
                    control={control}
                    name="job"
                    options={professions}
                    errors={errors}
                    styleVariant="primary"
                    label="Profesión"
                    onCreateOption={handleCreateProfession}
                    onEditOption={handleEditProfession}
                    onSave={getProfession}
                    urlDelete={'/profession'}
                  />
                )}
                <Select
                  label="Grado"
                  {...register('degree', {
                    validate: { validateWhiteSpace },
                  })}
                  name="degree"
                  data={DEGREE_DATA}
                  extractValue={({ value }) => value}
                  renderTextField={({ value }) => value}
                  errors={errors}
                />
              </div>
            </CompactUserSection>

            <CompactUserSection
              id="internal"
              title="Acceso y opciones internas"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {roles && (
                  <Select
                    label="Rol del sistema"
                    {...register('roleId', {
                      validate: { validateWhiteSpace },
                      valueAsNumber: true,
                    })}
                    extractValue={({ id }) => id}
                    renderTextField={({ name }) => name}
                    data={roles}
                    errors={errors}
                  />
                )}
                <Select
                  label="Tipo de usuario"
                  {...register('userType', {
                    validate: { validateWhiteSpace },
                  })}
                  name="userType"
                  data={Object.values(UserType)}
                  extractValue={value => value}
                  renderTextField={value => value}
                  errors={errors}
                />
                <Select
                  label="Género"
                  {...register('gender', {
                    validate: { validateWhiteSpace },
                  })}
                  name="gender"
                  data={GENDER}
                  extractValue={({ abrv }) => abrv}
                  renderTextField={({ value }) => value}
                  errors={errors}
                />
                <Input
                  {...register('room')}
                  placeholder="Cuarto"
                  label="Cuarto"
                  type="text"
                />
                <Input
                  {...register('userPc')}
                  placeholder="Usuario (00)"
                  type="text"
                  errors={errors}
                  label="Usuario (00)"
                />
              </div>
            </CompactUserSection>

            <CompactUserSection
              id="location"
              title="Ubicación y datos tributarios"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Input
                  {...register('address', { required: true })}
                  name="address"
                  placeholder="Dirección"
                  label="Dirección"
                  errors={errors}
                  classNameMain="xl:col-span-2"
                />
                <Input
                  {...register('ruc', {
                    validate: { validateRuc },
                  })}
                  placeholder="RUC"
                  type="number"
                  errors={errors}
                  label="RUC"
                />
                <Select
                  label="Departamento"
                  {...register('department', {
                    validate: { validateWhiteSpace },
                    onChange: handleGetProvinces,
                  })}
                  name="department"
                  data={departaments}
                  extractValue={({ nombre_ubigeo }) => nombre_ubigeo}
                  renderTextField={({ nombre_ubigeo }) => nombre_ubigeo}
                  errors={errors}
                />
                <Select
                  label="Provincia"
                  {...register('province', {
                    validate: { validateWhiteSpace },
                    onChange: handleGetDistricts,
                  })}
                  name="province"
                  data={provinces}
                  extractValue={({ nombre_ubigeo }) => nombre_ubigeo}
                  renderTextField={({ nombre_ubigeo }) => nombre_ubigeo}
                  errors={errors}
                />
                <Select
                  label="Distrito"
                  {...register('district', {
                    validate: { validateWhiteSpace },
                  })}
                  name="district"
                  data={districts}
                  extractValue={({ nombre_ubigeo }) => nombre_ubigeo}
                  renderTextField={({ nombre_ubigeo }) => nombre_ubigeo}
                  errors={errors}
                />
              </div>
            </CompactUserSection>

            <CompactUserSection
              id="payroll"
              title="Planilla"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Input
                    {...register('payrollContractStartDate')}
                    type="date"
                    label="Inicio de contrato"
                    errors={errors}
                  />
                  <Input
                    {...register('payrollContractEndDate', {
                      validate: value => {
                        if (!value || !payrollContractStartDate) return true;
                        return (
                          value >= payrollContractStartDate ||
                          'El fin de contrato no puede ser menor al inicio'
                        );
                      },
                    })}
                    type="date"
                    label="Fin de contrato"
                    errors={errors}
                  />
                  <Input
                    {...register('payrollMonthlySalary', {
                      validate: value =>
                        !value ||
                        Number(String(value).replace(',', '.')) > 0 ||
                        'Ingrese un sueldo mensual mayor a 0',
                    })}
                    placeholder="Sueldo mensual"
                    type="number"
                    label="Sueldo mensual"
                    errors={errors}
                  />
                  <Select
                    label="Tipo de contrato"
                    {...register('payrollContractType')}
                    name="payrollContractType"
                    data={PAYROLL_CONTRACT_TYPE_DATA}
                    extractValue={({ value }) => value}
                    renderTextField={({ label }) => label}
                    errors={errors}
                  />
              </div>
            </CompactUserSection>

            <CompactUserSection
              id="reference"
              title="Contacto de referencia"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Input
                  {...register('firstNameRef')}
                  placeholder="Nombres"
                  label="Nombres"
                  errors={errors}
                />
                <Input
                  {...register('lastNameRef')}
                  placeholder="Apellidos"
                  errors={errors}
                  label="Apellidos"
                />
                <Input
                  {...register('addressRef')}
                  placeholder="Dirección"
                  label="Dirección"
                  errors={errors}
                />
                <Input
                  {...register('phoneRef', {
                    validate: validateOnlyNumbers,
                  })}
                  placeholder="Celular"
                  label="Celular"
                  type="number"
                  errors={errors}
                />
              </div>
            </CompactUserSection>
          </div>
        ) : (
          <>
        <fieldset>
          <legend className="card-register-title-info">
            Datos de Personales
          </legend>
          <div className="card-register-content">
            <div className="col-input">
              <Input
                {...register('dni', {
                  required: true,
                  validate: validateDNI,
                })}
                placeholder="N°"
                label="DNI"
                errors={errors}
                type="number"
                handleSearch={!watch('id') ? searchUserForDNI : false}
              />
              <Input
                {...register('firstName', { required: true })}
                placeholder="Nombres"
                label="Nombres:"
                errors={errors}
              />
              <Input
                {...register('lastName', { required: true })}
                placeholder="Apellidos"
                errors={errors}
                label="Apellidos:"
                autoComplete="on"
              />
              <Select
                label="Género:"
                {...register('gender', {
                  validate: { validateWhiteSpace },
                })}
                name="gender"
                data={GENDER}
                extractValue={({ abrv }) => abrv}
                renderTextField={({ value }) => value}
                errors={errors}
              />
            </div>
            {!userId && (
              <div className="col-input">
                <Input
                  {...register('password', {
                    required: true,
                  })}
                  name="password"
                  errors={errors}
                  placeholder="Contraseña"
                  type="password"
                  autoComplete="new-password"
                  label="Contraseña:"
                />

                <Input
                  {...register('confirmPassword', {
                    required: true,
                    validate: val =>
                      validateRepeatPassword(val, watch('password')),
                  })}
                  name="confirmPassword"
                  errors={errors}
                  placeholder="Confirmar contraseña"
                  type="password"
                  autoComplete="new-password"
                  label="Confirmar contraseña:"
                />
              </div>
            )}
            <div className="col-input">
              <Input
                {...register('email', {
                  required: true,
                  validate: validateEmail,
                })}
                errors={errors}
                placeholder="Correo"
                label="Correo:"
                name="email"
              />
              <Input
                {...register('address', { required: true })}
                name="address"
                placeholder="Dirección"
                label="Dirección:"
                errors={errors}
              />
              <Input
                {...register('phone', {
                  validate: validateOnlyNumbers,
                })}
                placeholder="Celular"
                label="Celular:"
                type="number"
                errors={errors}
              />

              <Input
                {...register('room')}
                placeholder="Cuarto:"
                label="Cuarto:"
                type="text"
              />
            </div>
            <div className="col-input">
              <Select
                label="Departamento:"
                {...register('department', {
                  validate: { validateWhiteSpace },
                  onChange: handleGetProvinces,
                })}
                name="department"
                data={departaments}
                extractValue={({ nombre_ubigeo }) => nombre_ubigeo}
                renderTextField={({ nombre_ubigeo }) => nombre_ubigeo}
                errors={errors}
              />
              <Select
                label="Provincia:"
                {...register('province', {
                  validate: { validateWhiteSpace },
                  onChange: handleGetDistricts,
                })}
                name="province"
                data={provinces}
                extractValue={({ nombre_ubigeo }) => nombre_ubigeo}
                renderTextField={({ nombre_ubigeo }) => nombre_ubigeo}
                errors={errors}
              />
              <Select
                label="Distrito:"
                {...register('district', {
                  validate: { validateWhiteSpace },
                })}
                name="district"
                data={districts}
                extractValue={({ nombre_ubigeo }) => nombre_ubigeo}
                renderTextField={({ nombre_ubigeo }) => nombre_ubigeo}
                errors={errors}
              />
              <Input
                {...register('userPc')}
                placeholder="Usuario(00)"
                type="text"
                errors={errors}
                label="Usuario(00):"
              />
            </div>
            {offices && (
              <AdvancedSelectCrud
                defaultValue={watch('offices')}
                control={control}
                name="offices"
                options={offices}
                errors={errors}
                styleVariant="primary"
                label="Oficina:"
                isMulti
                onCreateOption={handleCreateOffice}
                onEditOption={handleEditOffice}
                onSave={getOffices}
                urlDelete={'/office'}
              />
            )}
            <div className="col-input">
              <Input
                {...register('ruc', {
                  validate: { validateRuc },
                })}
                placeholder="ruc"
                type="number"
                errors={errors}
                label="RUC:"
              />
              {roles && (
                <Select
                  label="Rol:"
                  {...register('roleId', {
                    validate: { validateWhiteSpace },
                    valueAsNumber: true,
                  })}
                  extractValue={({ id }) => id}
                  renderTextField={({ name }) => name}
                  data={roles}
                  errors={errors}
                />
              )}
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
              <Select
                label="Tipo de usuario:"
                {...register('userType', {
                  validate: { validateWhiteSpace },
                })}
                name="userType"
                data={Object.values(UserType)}
                extractValue={value => value}
                renderTextField={value => value}
                errors={errors}
              />
            </div>
            <div className="col-input">
              {professions && (
                <AdvancedSelectCrud
                  control={control}
                  name="job"
                  options={professions}
                  errors={errors}
                  styleVariant="primary"
                  label="Profesión:"
                  onCreateOption={handleCreateProfession}
                  onEditOption={handleEditProfession}
                  onSave={getProfession}
                  urlDelete={'/profession'}
                />
              )}

              <Input
                {...register('description', {})}
                placeholder="cargo"
                type="text"
                errors={errors}
                label="Cargo:"
              />
            </div>
            <div className="card-register-payroll">
              <div className="card-register-payroll-header">
                <div>
                  <h2>Datos para planilla</h2>
                  <p>
                    Define vigencia contractual y sueldo mensual para cálculos y
                    validaciones de planilla.
                  </p>
                </div>
              </div>
              <div className="card-register-payroll-hint">
                <p>
                  Estos datos no activan ni desactivan al usuario; solo
                  alimentan cálculos y validaciones del módulo de planillas.
                </p>
              </div>
              <div className="col-input">
                <Input
                  {...register('payrollContractStartDate')}
                  type="date"
                  label="Inicio de contrato:"
                  errors={errors}
                />
                <Input
                  {...register('payrollContractEndDate', {
                    validate: value => {
                      if (!value || !payrollContractStartDate) return true;
                      return (
                        value >= payrollContractStartDate ||
                        'El fin de contrato no puede ser menor al inicio'
                      );
                    },
                  })}
                  type="date"
                  label="Fin de contrato:"
                  errors={errors}
                />
              </div>
              <div className="col-input">
                <Input
                  {...register('payrollMonthlySalary', {
                    validate: value =>
                      !value ||
                      Number(String(value).replace(',', '.')) > 0 ||
                      'Ingrese un sueldo mensual mayor a 0',
                  })}
                  placeholder="Sueldo mensual"
                  type="number"
                  label="Sueldo mensual:"
                  errors={errors}
                />
                <Select
                  label="Tipo de contrato:"
                  {...register('payrollContractType')}
                  name="payrollContractType"
                  data={PAYROLL_CONTRACT_TYPE_DATA}
                  extractValue={({ value }) => value}
                  renderTextField={({ label }) => label}
                  errors={errors}
                />
              </div>
            </div>
            {!userId && (
              <div className="col-input">
                <Input
                  type="file"
                  label="CV:"
                  placeholder="cv"
                  {...register('cv', { required: !!userData })}
                  errors={errors}
                />
                <Input
                  type="file"
                  label="Declaracion Jurada:"
                  placeholder="declaration"
                  {...register('declaration', { required: !!userData })}
                  errors={errors}
                />
              </div>
            )}
          </div>
        </fieldset>
        <fieldset>
          <legend className="card-register-title-info">
            Datos de Referencia
          </legend>
          <div className="card-register-content">
            <div className="col-input">
              <Input
                {...register('firstNameRef')}
                placeholder="Nombres"
                label="Nombres:"
                errors={errors}
              />
              <Input
                {...register('lastNameRef')}
                placeholder="Apellidos"
                errors={errors}
                label="Apellidos:"
              />
            </div>
            <div className="col-input">
              <Input
                {...register('addressRef')}
                placeholder="Dirección"
                label="Dirección:"
                errors={errors}
              />
              <Input
                {...register('phoneRef', {
                  validate: validateOnlyNumbers,
                })}
                placeholder="Celular"
                label="Celular:"
                type="number"
                errors={errors}
              />
            </div>
          </div>
        </fieldset>
          </>
        )}
        <div className="btn-build">
          {compactMode ? (
            <AppButton type="submit" size="lg" className="min-w-40">
              Guardar cambios
            </AppButton>
          ) : (
            <Button
              text={userId ? 'GUARDAR' : 'CREAR'}
              whileTap={{ scale: 0.9 }}
              type="submit"
            />
          )}
        </div>
      </form>
      {showSwornDeclaration && roles && (
        <CarRegisterSwornDeclaration
          generalFiles={generalFiles}
          userData={userData}
          roles={roles}
        />
      )}
      <CardAddProfession onSave={getProfession} onUsersUpdated={onSave} />
      <CardAddOffice onSave={getOffices} onUsersUpdated={onSave} />
    </>
  );

  if (embedded) return content;

  return <Modal size={50} isOpenProp={isOpenModal}>{content}</Modal>;
};

export default CardRegisterUser;

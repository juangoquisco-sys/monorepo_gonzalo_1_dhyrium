import Button from '@/components/button/Button';
import Input from '@/components/Input/Input';
import Select from '@/components/select/Select';
import './cardGenerateContract.css';
import ContractUserPdf from '../../pdfGenerator/contractUserPdf/ContractUserPdf';
import { useForm } from 'react-hook-form';
import { pdf } from '@react-pdf/renderer';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@/types/types';
import {
  DEGREE_DATA,
  PROFESSIONAL_SERVICE_LEVEL_DATA,
} from '../../models/dataUserRegister';
import type { ContractUser } from '../../models/types';
import { axiosInstance } from '@/services/axiosInstance';
import { isOpenAlertConfirm$, isOpenViewPdf$ } from '@/services/sharingSubject';
import { SnackbarUtilities } from '@/utils/SnackbarManager';

interface CardGenerateContractProps {
  user: User;
  onSave?: () => void;
  /** Shows the form inside the unified user editor instead of beside a dialog. */
  embedded?: boolean;
}

type UserDegree = User['profile']['degree'];
type ContractDraft = Partial<ContractUser>;

const parsePayrollDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parsePayrollAmount = (value?: string | number | null) => {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const calculateContractMonths = (
  startDate: Date | null,
  endDate: Date | null
) => {
  if (!startDate || !endDate || endDate < startDate) return undefined;
  return (
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth()) +
    1
  );
};

const getContractAmountByLevel = (
  degree: UserDegree,
  values: Partial<ContractUser>
) => {
  const degreeEvaluating =
    degree === 'Titulado' && !values.hasExperience ? 'Bachiller' : degree;
  const degreeSelect = DEGREE_DATA.find(el => el.value === degreeEvaluating);
  return degreeSelect?.cost[values.professionalLevel || 1] ?? 0;
};

const formatDateInput = (date?: Date | string) => {
  if (!date) return '';
  const dateValue = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(dateValue.getTime())) return '';
  return dateValue.toISOString().slice(0, 10);
};

const getContractFileName = (user: User, values: ContractUser) => {
  const contractNumber = String(values.numberContract || user.profile.id)
    .padStart(3, '0')
    .replace(/[^\w-]/g, '');
  const fullName = `${user.profile.firstName}-${user.profile.lastName}`
    .trim()
    .replace(/\s+/g, '-');
  return `Contrato-${contractNumber}-${fullName}`;
};

const getDraftStorageKey = (userId: number) => `contract-form-draft-${userId}`;

const getInitialValues = (user: User): ContractDraft => {
  const draft = localStorage.getItem(getDraftStorageKey(user.id));
  const payrollStartDate = parsePayrollDate(
    user.payrollInfo?.contractStartDate
  );
  const payrollEndDate = parsePayrollDate(user.payrollInfo?.contractEndDate);
  const payrollAmount = parsePayrollAmount(user.payrollInfo?.monthlySalary);
  const payrollMonths = calculateContractMonths(
    payrollStartDate,
    payrollEndDate
  );
  const baseValues: ContractDraft = {
    professionalLevel: 1,
    contractAmount:
      payrollAmount ||
      getContractAmountByLevel(user.profile.degree, {
        professionalLevel: 1,
        hasExperience: false,
      }),
    date: payrollStartDate ?? new Date(),
    month: payrollMonths,
    welcomeBonus: false,
    hasExperience: false,
  };

  if (!draft) return baseValues;

  try {
    const parsedDraft = JSON.parse(draft) as ContractDraft;
    return {
      ...baseValues,
      ...parsedDraft,
      date: parsedDraft.date ? new Date(parsedDraft.date) : baseValues.date,
    };
  } catch {
    return baseValues;
  }
};

const CardGenerateContract = ({
  user,
  onSave,
  embedded = false,
}: CardGenerateContractProps) => {
  const initialValues = useMemo(() => getInitialValues(user), [user]);
  const payrollDefaults = useMemo(() => {
    const payroll = user.payrollInfo;
    if (!payroll) return [];
    return [
      parsePayrollDate(payroll.contractStartDate) ? 'fecha de inicio' : null,
      parsePayrollAmount(payroll.monthlySalary) ? 'monto' : null,
      calculateContractMonths(
        parsePayrollDate(payroll.contractStartDate),
        parsePayrollDate(payroll.contractEndDate)
      )
        ? 'meses'
        : null,
    ].filter(Boolean);
  }, [user.payrollInfo]);
  const [draftStatus, setDraftStatus] = useState(
    localStorage.getItem(getDraftStorageKey(user.id))
      ? 'Borrador cargado'
      : 'Borrador listo'
  );
  const hasMounted = useRef(false);
  const { register, handleSubmit, watch, setValue, reset } =
    useForm<ContractUser>({
      defaultValues: initialValues,
    });

  const professionalLevel = watch('professionalLevel');
  const hasExperience = watch('hasExperience');

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    setValue(
      'contractAmount',
      getContractAmountByLevel(user.profile.degree, {
        professionalLevel,
        hasExperience,
      })
    );
  }, [hasExperience, professionalLevel, setValue, user.profile.degree]);

  useEffect(() => {
    const subscription = watch(values => {
      localStorage.setItem(
        getDraftStorageKey(user.id),
        JSON.stringify({
          ...values,
          date: formatDateInput(values.date),
        })
      );
      setDraftStatus('Borrador guardado');
    });
    return () => subscription.unsubscribe();
  }, [user.id, watch]);

  const getContractData = (values: ContractUser) => ({ ...values, ...user });

  const openContractPreview = async (values: ContractUser) => {
    const contractData = getContractData(values);
    const fileNamePdf = getContractFileName(user, values);
    isOpenViewPdf$.setSubject = {
      fileNamePdf,
      pdfComponentFunction: <ContractUserPdf data={contractData} />,
      isOpen: true,
    };
    setDraftStatus('Contrato generado para revision');
  };

  const uploadGeneratedContract = async (values: ContractUser) => {
    const fileNamePdf = getContractFileName(user, values);
    const contractPdf = <ContractUserPdf data={getContractData(values)} />;
    const pdfBlob = await pdf(contractPdf).toBlob();
    const pdfFile = new File([pdfBlob], `${fileNamePdf}.pdf`, {
      type: 'application/pdf',
    });
    const formdata = new FormData();
    formdata.append('fileUser', pdfFile);

    await axiosInstance.post(
      `/files/uploadFileUser/${user.id}?typeFile=contract`,
      formdata
    );
    onSave?.();
    setDraftStatus('Contrato guardado');
    SnackbarUtilities.success('Contrato generado y guardado correctamente');
  };

  const handleSaveContract = async (values: ContractUser) => {
    if (user.contract?.length) {
      isOpenAlertConfirm$.setSubject = {
        isOpen: true,
        title: 'Guardar nuevo contrato',
        description:
          'Este usuario ya tiene contratos guardados. Se agregara este PDF como un nuevo contrato al historial.',
        summaryItems: [
          {
            label: 'Contratos actuales',
            value: String(user.contract.length),
          },
          {
            label: 'Monto',
            value: `S/. ${values.contractAmount || 0}`,
          },
        ],
        confirmText: 'Guardar nuevo',
        cancelText: 'Cancelar',
        variant: 'info',
        onConfirm: () => uploadGeneratedContract(values),
      };
      return;
    }

    await uploadGeneratedContract(values);
  };

  const handleClearDraft = () => {
    localStorage.removeItem(getDraftStorageKey(user.id));
    reset(getInitialValues(user));
    setDraftStatus('Borrador limpio');
  };

  if (embedded) {
    return (
      <form className="cardGenerateContract cardGenerateContract--embedded">
        <div className="cardGenerateContract-context" role="status">
          <div className="cardGenerateContract-context-items">
            <span className="cardGenerateContract-context-item">
              <span>Estado</span>
              <strong>{draftStatus}</strong>
            </span>
            <span className="cardGenerateContract-context-item">
              <span>Planilla</span>
              <strong>
                {payrollDefaults.length > 0
                  ? `Sugeridos: ${payrollDefaults.join(', ')}`
                  : 'Sin datos para sugerir'}
              </strong>
            </span>
          </div>
          <button
            className="cardGenerateContract-clear"
            type="button"
            onClick={handleClearDraft}
          >
            Limpiar borrador
          </button>
        </div>

        <div className="cardGenerateContract-fields">
          <div className="cardGenerateContract-field">
            <label
              className="cardGenerateContract-subtitle"
              htmlFor="professionalLevel"
            >
              Nivel profesional
            </label>
            <Select
              {...register('professionalLevel', {
                valueAsNumber: true,
              })}
              id="professionalLevel"
              data={PROFESSIONAL_SERVICE_LEVEL_DATA}
              extractValue={({ id }) => id}
              renderTextField={({ value }) => value}
              styleVariant="secondary"
            />
          </div>
          <div className="cardGenerateContract-field">
            <label
              className="cardGenerateContract-subtitle"
              htmlFor="contractAmount"
            >
              Monto contractual
            </label>
            <Input
              {...register('contractAmount', {
                valueAsNumber: true,
                min: 1,
              })}
              type="number"
              placeholder="Monto contractual"
              styleInput={2}
              isMoney
            />
          </div>
          <div className="cardGenerateContract-field">
            <label className="cardGenerateContract-subtitle" htmlFor="date">
              Fecha
            </label>
            <Input
              {...register('date', {
                valueAsDate: true,
              })}
              type="date"
              placeholder="Fecha"
              styleInput={2}
              defaultValue={formatDateInput(initialValues.date)}
            />
          </div>
          <div className="cardGenerateContract-field">
            <label
              className="cardGenerateContract-subtitle"
              htmlFor="numberContract"
            >
              Número de contrato
            </label>
            <Input
              {...register('numberContract', {
                valueAsNumber: true,
              })}
              type="number"
              placeholder="Número de contrato"
              styleInput={2}
            />
          </div>
          <div className="cardGenerateContract-field">
            <label className="cardGenerateContract-subtitle" htmlFor="month">
              Número de meses
            </label>
            <Input
              {...register('month', {
                valueAsNumber: true,
              })}
              type="number"
              placeholder="Meses"
              styleInput={2}
            />
          </div>
          <div className="cardGenerateContract-field">
            <label
              className="cardGenerateContract-subtitle"
              htmlFor="projectNumber"
            >
              Número de proyectos
            </label>
            <Input
              {...register('projectNumber', {
                valueAsNumber: true,
              })}
              type="number"
              placeholder="Número de proyectos"
              styleInput={2}
            />
          </div>
        </div>

        <div className="cardGenerateContract-actions">
          <div className="cardGenerateContract-checks">
            <label className="cardGenerateContract-check-container">
              <input
                type="checkbox"
                {...register('welcomeBonus', {
                  value: false,
                })}
              />
              Bono de bienvenida
            </label>
            {user.profile.degree === 'Titulado' && (
              <label className="cardGenerateContract-check-container">
                <input
                  type="checkbox"
                  {...register('hasExperience', {
                    value: false,
                  })}
                />
                Tiene experiencia
              </label>
            )}
          </div>
          <div className="cardGenerateContract-action-buttons">
            <Button
              className="cardGenerateContract-action"
              icon="preview-pdf"
              text="Previsualizar"
              variant="outline"
              fontWeight={500}
              borderRadius={3}
              color="grayLigth"
              textColor="grayTertiary"
              borderColor="graySecondary"
              type="button"
              onClick={handleSubmit(openContractPreview)}
            />
            <Button
              className="cardGenerateContract-action"
              icon="save"
              text="Generar y guardar contrato"
              variant="outline"
              fontWeight={500}
              borderRadius={3}
              color="primary"
              textColor="primary"
              borderColor="primary"
              type="button"
              onClick={handleSubmit(handleSaveContract)}
            />
          </div>
        </div>
      </form>
    );
  }

  return (
    <form
      className={`cardGenerateContract${
        embedded ? ' cardGenerateContract--embedded' : ''
      }`}
    >
      <h2 className="cardGenerateContract-title">Generar Contrato </h2>
      {payrollDefaults.length > 0 && (
        <div className="cardGenerateContract-sync-note">
          Usa datos de planilla para sugerir {payrollDefaults.join(', ')}.
        </div>
      )}
      <div className="cardGenerateContract-status">
        <span>{draftStatus}</span>
        <button type="button" onClick={handleClearDraft}>
          Limpiar
        </button>
      </div>
      <h4 className="cardGenerateContract-subtitle">Nivel profesional:</h4>
      <Select
        {...register('professionalLevel', {
          valueAsNumber: true,
        })}
        data={PROFESSIONAL_SERVICE_LEVEL_DATA}
        extractValue={({ id }) => id}
        renderTextField={({ value }) => value}
        styleVariant="secondary"
      />
      <h4 className="cardGenerateContract-subtitle">Monto contractual:</h4>
      <Input
        {...register('contractAmount', {
          valueAsNumber: true,
          min: 1,
        })}
        type="number"
        placeholder="Monto contractual"
        styleInput={2}
        isMoney
      />
      <h4 className="cardGenerateContract-subtitle">Fecha:</h4>
      <Input
        {...register('date', {
          valueAsDate: true,
        })}
        type="date"
        placeholder="Fecha"
        styleInput={2}
        defaultValue={formatDateInput(initialValues.date)}
      />
      <h4 className="cardGenerateContract-subtitle">Number de Contrato:</h4>
      <Input
        {...register('numberContract', {
          valueAsNumber: true,
        })}
        type="number"
        placeholder="numero de contrato"
        styleInput={2}
      />
      <h4 className="cardGenerateContract-subtitle">Número de meses:</h4>

      <Input
        {...register('month', {
          valueAsNumber: true,
        })}
        type="number"
        placeholder="Meses"
        styleInput={2}
      />
      <h4 className="cardGenerateContract-subtitle">Número de proyectos:</h4>

      <Input
        {...register('projectNumber', {
          valueAsNumber: true,
        })}
        type="number"
        placeholder="Número de proyecto"
        styleInput={2}
      />

      <label className="cardGenerateContract-check-container">
        <input
          type="checkbox"
          {...register('welcomeBonus', {
            value: false,
          })}
        />
        Bono de bienvenida
      </label>
      {user.profile.degree === 'Titulado' && (
        <label className="cardGenerateContract-check-container">
          <input
            type="checkbox"
            {...register('hasExperience', {
              value: false,
            })}
          />
          Tiene experiencia
        </label>
      )}

      <Button
        icon="preview-pdf"
        text="Previsualizar"
        variant="outline"
        full
        fontWeight={500}
        borderRadius={3}
        color="grayLigth"
        textColor="grayTertiary"
        borderColor="graySecondary"
        type="button"
        onClick={handleSubmit(openContractPreview)}
      />
      <Button
        icon="save"
        text="Generar y guardar contrato"
        variant="outline"
        full
        fontWeight={500}
        borderRadius={3}
        color="primary"
        textColor="primary"
        borderColor="primary"
        type="button"
        onClick={handleSubmit(handleSaveContract)}
      />
    </form>
  );
};

export default CardGenerateContract;

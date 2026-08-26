import Input from '@/components/Input/Input';
import Select from '@/components/select/Select';
import TextArea from '@/components/textArea/TextArea';
import Button from '@/components/button/Button';
import Modal from '@/components/portal/Modal';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import { isOpenCardRegisteContract$ } from '@/services/sharingSubject';
import { actualDate } from '@/utils/formatDate';
import {
  validateCorrectTyping,
  validateWhiteSpace,
} from '@/utils/customValidatesForm';
import './cardRegisterContract.css';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import type { ContractForm, CoorpEntity } from '@/types/types';
import { Subscription } from 'rxjs';
import { axiosInstance } from '@/services/axiosInstance';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import useJurisdiction from '@/hooks/useJurisdiction';
import {
  CONTRACT_INDEX_DATA,
  CONTRACT_TYPE,
  DIFFICULTY_LEVEL,
} from '../../models/definitionsContract.models';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store/store.types';
import { getContractThunks } from '@/store/slices/contract.slice';

interface CardRegisterContractProps {
  onSave: () => void;
}

interface MefContractLookup {
  source: string;
  cui: string;
  registeredContract?: {
    id: number;
    cui: string;
    contractNumber: string;
    projectShortName?: string | null;
    projectName: string;
  } | null;
  snip?: string;
  projectName: string;
  projectShortName: string;
  municipality: string;
  department?: string;
  province?: string;
  district?: string;
  status?: string;
  situation?: string;
  updatedCost: number;
  suggestedAmount: number;
  suggestedContract: {
    contractNumber: string;
    contractor: string;
    amount: number;
    date: string;
  } | null;
  contracts: {
    contractNumber: string;
    contractor: string;
    amount: number;
    date: string;
  }[];
}

const moneyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  maximumFractionDigits: 2,
});

const toInputDate = (value?: string) => {
  if (!value) return null;
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const CardRegisterContract = ({ onSave }: CardRegisterContractProps) => {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isSearchingCui, setIsSearchingCui] = useState(false);
  const [cuiLookup, setCuiLookup] = useState<MefContractLookup | null>(null);
  const dispatch: AppDispatch = useDispatch();

  const [companies, setCompanies] = useState<null | CoorpEntity[]>(null);
  const {
    departaments,
    districts,
    provinces,
    handleGetDistricts,
    setJurisdictionSelectData,
    handleGetProvinces,
  } = useJurisdiction();
  const {
    handleSubmit,
    register,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContractForm>();

  const handleIsOpen = useRef<Subscription>(new Subscription());

  useEffect(() => {
    handleIsOpen.current = isOpenCardRegisteContract$.getSubject.subscribe(
      data => {
        const { contract } = data;
        setIsOpenModal(data.isOpen);
        if (contract) {
          setCuiLookup(null);
          setJurisdictionSelectData(contract.department, contract.province);
          const {
            id,
            createdAt,
            cui,
            department,
            difficulty,
            district,
            name,
            projectName,
            province,
            projectShortName,
            indexContract,
            contractNumber,
            companyId,
            consortiumId,
            type,
            amount,
            municipality,
          } = contract;
          reset({
            id,
            createdAt: createdAt ? actualDate(createdAt) : null,
            cui,
            department,
            difficulty,
            district,
            name,
            projectName,
            indexContract,
            province,
            projectShortName,
            contractNumber,
            type,
            amount,
            municipality,
            idCoorp: companyId
              ? 'companyId-' + companyId
              : 'consortiumId-' + consortiumId,
          });
        } else {
          setCuiLookup(null);
          reset({
            contractNumber: 'Contrato N° 00',
            municipality: 'Municipalidad de ',
          });
        }
      }
    );
    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, [reset, setJurisdictionSelectData]);

  useEffect(() => {
    getSpecialists();
  }, []);
  const getSpecialists = () => {
    axiosInstance.get('/consortium/both').then(el => setCompanies(el.data));
  };
  const onSubmit: SubmitHandler<ContractForm> = async data => {
    const { id, idCoorp, ...resData } = data;
    if (!id && cuiLookup?.registeredContract) {
      SnackbarUtilities.warning(
        `El CUI ${cuiLookup.cui} ya esta registrado. Abre el contrato existente para editarlo.`
      );
      return;
    }
    const [keyName, newIdCoorp] = idCoorp.split('-');
    const body = {
      ...resData,
      companyId: null,
      consortiumId: null,
      [keyName]: +newIdCoorp,
    };
    try {
      if (id) {
        await axiosInstance.patch(`contract/${id}`, body);
        dispatch(getContractThunks(String(id)));
      } else {
        body.indexContract = JSON.stringify(CONTRACT_INDEX_DATA);
        await axiosInstance.post('contract', body);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'No se pudo guardar el contrato.';
      SnackbarUtilities.error(message);
      return;
    }
    closeFunctions();
    onSave();
  };

  const closeFunctions = () => {
    reset({});
    setCuiLookup(null);
    setIsOpenModal(false);
  };

  const applyLookupToForm = (lookup: MefContractLookup) => {
    setValue('cui', lookup.cui);
    if (lookup.projectName) setValue('projectName', lookup.projectName);
    if (lookup.projectShortName)
      setValue('projectShortName', lookup.projectShortName);
    if (lookup.municipality) setValue('municipality', lookup.municipality);
    if (lookup.department) setValue('department', lookup.department);
    if (lookup.province) setValue('province', lookup.province);
    if (lookup.district) setValue('district', lookup.district);
    if (lookup.department && lookup.province) {
      setJurisdictionSelectData(lookup.department, lookup.province);
    }
    if (lookup.suggestedAmount) setValue('amount', lookup.suggestedAmount);
    if (lookup.suggestedContract?.contractNumber) {
      setValue('contractNumber', lookup.suggestedContract.contractNumber);
    }
    const contractDate = toInputDate(lookup.suggestedContract?.date);
    if (contractDate) setValue('createdAt', contractDate);
  };

  const searchContractByCui = async () => {
    const cui = String(watch('cui') || '').replace(/\D/g, '');
    if (!cui) {
      SnackbarUtilities.warning('Ingresa un CUI para buscar datos en MEF.');
      return;
    }
    setIsSearchingCui(true);
    try {
      const { data } = await axiosInstance.get<MefContractLookup>(
        `contract/lookup/cui/${cui}`
      );
      setCuiLookup(data);
      applyLookupToForm(data);
      if (data.registeredContract) {
        SnackbarUtilities.warning(
          `Datos MEF encontrados, pero el CUI ${data.cui} ya existe en contratos.`
        );
      } else {
        SnackbarUtilities.success('Datos MEF encontrados y aplicados.');
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'No se pudo consultar el CUI en MEF.';
      setCuiLookup(null);
      SnackbarUtilities.error(message);
    } finally {
      setIsSearchingCui(false);
    }
  };

  return (
    <Modal size={50} isOpenProp={isOpenModal}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="card-register"
        autoComplete="off"
      >
        <CloseIcon onClick={closeFunctions} />
        <h2>{watch('id') ? 'ACTUALIZAR CONTRATO' : 'REGISTRAR CONTRATO'}</h2>
        <hr />
        <div className="card-register-project-container-details">
          <div className="col-input">
            <Input
              label="Nombre de Contrato:"
              {...register('contractNumber', {
                validate: { validateWhiteSpace },
              })}
              name="contractNumber"
              type="text"
              placeholder="N° de Contrato"
              errors={errors}
            />
            <Input
              label="Nombre Corto del Proyecto:"
              {...register('projectShortName', {
                validate: { validateWhiteSpace, validateCorrectTyping },
              })}
              name="projectShortName"
              type="text"
              placeholder="Nombre Corto del Proyecto "
              errors={errors}
            />
            <Input
              label="Municipalidad:"
              {...register('municipality', {
                validate: { validateWhiteSpace, validateCorrectTyping },
              })}
              name="municipality"
              type="text"
              placeholder="Municipalidad"
              errors={errors}
            />
          </div>
          <div className="col-input">
            <TextArea
              label="Nombre Completo del Proyecto:"
              {...register('projectName', {
                validate: { validateWhiteSpace },
              })}
              name="projectName"
              placeholder="Nombre completo del Proyecto"
              errors={errors}
            />
          </div>
          <div className="col-input">
            {companies && (
              <Select
                label="Empresa o Consorcio :"
                {...register('idCoorp', {
                  validate: { validateWhiteSpace },
                })}
                name="idCoorp"
                data={companies}
                extractValue={({ newId }) => newId}
                renderTextField={({ name }) => name}
                errors={errors}
              />
            )}
          </div>
          <div className="col-input">
            <Input
              label="Nomenclatura:"
              {...register('name', {
                validate: { validateWhiteSpace },
              })}
              name="name"
              type="text"
              placeholder="Nomenclatura"
              errors={errors}
            />

            <Input
              label="CUI:"
              {...register('cui', {
                validate: { validateWhiteSpace },
              })}
              name="cui"
              placeholder="Ingresa CUI y presiona la lupa"
              handleSearch={searchContractByCui}
              disabled={isSearchingCui}
              errors={errors}
            />

            <Input
              label="Monto:"
              {...register('amount', {
                validate: { validateWhiteSpace },
                valueAsNumber: true,
              })}
              name="amount"
              placeholder="Monto"
              errors={errors}
            />
          </div>
          <div className="col-input">
            <Input
              label="Fecha de firma:"
              {...register('createdAt', {
                validate: { validateWhiteSpace },
                valueAsDate: true,
              })}
              name="createdAt"
              type="date"
              placeholder="Fecha de Inicio "
              errors={errors}
            />
            <Select
              label="Nivel:"
              {...register('difficulty', {
                validate: { validateWhiteSpace },
                valueAsNumber: true,
              })}
              name="difficulty"
              data={DIFFICULTY_LEVEL}
              extractValue={({ key }) => key}
              renderTextField={({ name }) => name}
              errors={errors}
            />
            <Select
              label="Tipo de contrato:"
              {...register('type', {
                validate: { validateWhiteSpace },
              })}
              name="type"
              data={CONTRACT_TYPE}
              extractValue={({ key }) => key}
              renderTextField={({ name }) => name}
              errors={errors}
            />
          </div>
          <div className="col-input">
            <Select
              label="Departamento:"
              {...register('department', {
                validate: { validateWhiteSpace },
              })}
              name="department"
              data={departaments}
              extractValue={({ nombre_ubigeo }) => nombre_ubigeo}
              renderTextField={({ nombre_ubigeo }) => nombre_ubigeo}
              onChange={handleGetProvinces}
              errors={errors}
            />
            <Select
              label="Provincia:"
              {...register('province', {
                validate: { validateWhiteSpace },
              })}
              name="province"
              data={provinces}
              onChange={handleGetDistricts}
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
          </div>
          <div className="col-input">
            <div className="contract-cui-helper">
              <div>
                <strong>
                  {isSearchingCui
                    ? 'Consultando datos del CUI...'
                    : 'Autocompletar con CUI'}
                </strong>
                <p>
                  Ingresa el CUI y usa la lupa para traer nombre del proyecto,
                  municipalidad, monto referencial y contratos SEACE
                  disponibles.
                </p>
              </div>
              {cuiLookup && (
                <div className="contract-cui-result">
                  <span>CUI {cuiLookup.cui}</span>
                  {cuiLookup.snip && <span>SNIP {cuiLookup.snip}</span>}
                  {cuiLookup.status && <span>{cuiLookup.status}</span>}
                  {cuiLookup.situation && <span>{cuiLookup.situation}</span>}
                </div>
              )}
            </div>
            {cuiLookup && (
              <div className="contract-cui-preview">
                {cuiLookup.registeredContract && (
                  <div className="contract-cui-duplicate">
                    <strong>Este CUI ya esta registrado.</strong>
                    <span>
                      {cuiLookup.registeredContract.projectShortName ||
                        cuiLookup.registeredContract.projectName ||
                        cuiLookup.registeredContract.contractNumber}
                    </span>
                    <small>
                      Para evitar duplicados, abre el contrato existente y
                      actualizalo desde ahi.
                    </small>
                  </div>
                )}
                <div>
                  <span className="contract-cui-preview-label">
                    Proyecto MEF
                  </span>
                  <strong>{cuiLookup.projectShortName}</strong>
                  <p>{cuiLookup.projectName}</p>
                </div>
                <div>
                  <span className="contract-cui-preview-label">
                    Monto sugerido
                  </span>
                  <strong>
                    {moneyFormatter.format(cuiLookup.suggestedAmount || 0)}
                  </strong>
                  <p>
                    {cuiLookup.suggestedContract
                      ? `Contrato SEACE: ${
                          cuiLookup.suggestedContract.contractNumber ||
                          'sin numero'
                        }`
                      : 'Sin contrato SEACE: se usa costo actualizado del proyecto.'}
                  </p>
                </div>
                {cuiLookup.contracts.length > 0 && (
                  <div className="contract-cui-preview-full">
                    <span className="contract-cui-preview-label">
                      Contratos SEACE encontrados
                    </span>
                    <div className="contract-cui-contract-list">
                      {cuiLookup.contracts.map((item, index) => (
                        <div
                          className="contract-cui-contract-item"
                          key={`${item.contractNumber}-${index}`}
                        >
                          <strong>
                            {item.contractNumber || 'Contrato sin numero'}
                          </strong>
                          <span>
                            {item.contractor || 'Contratista no indicado'}
                          </span>
                          <span>{moneyFormatter.format(item.amount || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Button
          type="submit"
          text={`${watch('id') ? 'Actualizar' : 'Registrar'}`}
          position="center"
        />
      </form>
    </Modal>
  );
};

export default CardRegisterContract;

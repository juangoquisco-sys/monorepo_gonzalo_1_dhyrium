import { useEffect, useState, type ChangeEvent } from 'react';
import { isOpenCardRegisteContract$ } from '@/services/sharingSubject';
import './contracts.css';
import { axiosInstance } from '@/services/axiosInstance';
import type { Contract } from '@/types/types';
import { Outlet, useSearchParams } from 'react-router-dom';
import { SidebarContractCard } from './components/sidebarContractCard/SidebarContractCard';
import CardObservations from './views/cardObservations/CardObservations';
import CardRegisterContract from './views/cardRegisterContract/CardRegisterContract';
import IconAction from '@/components/iconAction/IconAction';
import Input from '@/components/Input/Input';
import ResizableIcon from '@/components/resizableIcon/ResizableIcon';
import Select from '@/components/select/Select';

import {
  CONTRACT_TYPE,
  INIT_VALUES_FILTER_CONTRACT,
  STATUS_CONTRACT,
} from './models/definitionsContract.models';
import type { FilterContract } from './models/type.contracts';
import { YEAR_DATA } from '../../../specialities/models/definitionSpeciality';
import { getStatusContract } from './utils/tools';
import { excelContractReport } from './generateExcel/excelReportConctract';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import useFilterContract from './hooks/useFilterContract';
import useHideElement from '@/hooks/useHideElement';

let initialContract: Contract[] = [];
export const Contracts = () => {
  const { handleHideElements, hideElements } = useHideElement(1000);
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const { newfilterContract, handleSearchChange, searchTerm } =
    useFilterContract(contracts);

  const [filterContract, setFilterContract] = useState<FilterContract>(
    INIT_VALUES_FILTER_CONTRACT
  );
  const [params] = useSearchParams();

  const addContract = () => {
    isOpenCardRegisteContract$.setSubject = { isOpen: true };
  };

  useEffect(() => {
    getContracts();
    // const handleResize = () => {
    //   setIsSidebarHidden(window.innerWidth < 1000);
    // };
    // window.addEventListener('resize', handleResize);

    // return () => {
    //   window.removeEventListener('resize', handleResize);
    // };
  }, [params, filterContract.date, filterContract.type]);

  const getContracts = () => {
    const typeCompany = params.get('typeCompany');
    const id = params.get('idCompany');
    const { date, type } = filterContract;
    axiosInstance
      .get(
        `/contract/?${id ? `${typeCompany}=${id}` : ''}${
          date ? `&date=${date}` : ''
        }${type ? `&type=${type}` : ''}`
      )
      .then(res => {
        initialContract = res.data;
        setContracts(res.data);
      });
  };

  const handleFilterValues = ({ target }: ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = target;
    setFilterContract({ ...filterContract, status: '', [name]: value });
  };
  const handleFilterStatus = ({ target }: ChangeEvent<HTMLSelectElement>) => {
    const { value } = target;
    if (!value) return setContracts(initialContract);
    if (!contracts) return;
    const filterContracts = initialContract.filter(contract => {
      const colorStatus = getStatusContract(
        contract.createdAt,
        contract.phases,
        contract.indexContract
      );
      return colorStatus === value;
    });
    setFilterContract({ ...filterContract, status: value });

    setContracts(filterContracts);
  };

  const handleReport = () => {
    if (!contracts) return;
    excelContractReport(contracts);
  };
  // const handleHideElements = () => {
  //   setHideElements(prev => !prev);
  // };
  return (
    <div className="contracts">
      <PanelGroup direction="horizontal">
        <Panel
          defaultSize={20}
          order={1}
          className={`contracts-resizable ${
            hideElements && 'contracts-collapse'
          }`}
        >
          <div className="contracts-sidebar">
            <h2 className={`contracts-sidebar-tilte`}>
              14.CONTRATOS EN ACTIVIDAD
            </h2>
            <IconAction icon="file-excel" onClick={handleReport} />
            <Input
              type="text"
              placeholder="Buscar por CUI o nombre de contrato"
              styleInput={3}
              style={{ marginInline: '1.5rem' }}
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <div className={`contract-filters-contain`}>
              <Select
                value={filterContract.status}
                name="status"
                data={STATUS_CONTRACT}
                extractValue={({ key }) => key}
                renderTextField={({ name }) => name}
                placeholder="Estado"
                styleVariant="tertiary"
                onChange={handleFilterStatus}
              />
              <Select
                name="date"
                data={YEAR_DATA}
                extractValue={({ year }) => year}
                renderTextField={({ year }) => year}
                placeholder="Año"
                styleVariant="tertiary"
                onChange={handleFilterValues}
              />
              <Select
                name="type"
                data={CONTRACT_TYPE}
                extractValue={({ key }) => key}
                renderTextField={({ name }) => name}
                placeholder="Tipo"
                styleVariant="tertiary"
                onChange={handleFilterValues}
              />
            </div>

            <div className="contracts-sidebar-main">
              {newfilterContract?.map(agreement => (
                <SidebarContractCard
                  key={agreement.id}
                  contract={agreement}
                  onSave={getContracts}
                />
              ))}
            </div>
            <div className={`contracts-add-content `} onClick={addContract}>
              <span className="contracts-add-span">Añadir Contrato</span>
              <figure className="contracts-sideba-figure">
                <img src="/svg/plus.svg" alt="W3Schools" />
              </figure>
            </div>
          </div>
        </Panel>
        {!hideElements && <PanelResizeHandle />}
        <ResizableIcon
          handleHideElements={handleHideElements}
          hideElements={hideElements}
        />

        <Panel className="contracts-main" defaultSize={80} order={2}>
          <Outlet />
        </Panel>
      </PanelGroup>

      <CardRegisterContract onSave={getContracts} />
      <CardObservations />
    </div>
  );
};

export default Contracts;

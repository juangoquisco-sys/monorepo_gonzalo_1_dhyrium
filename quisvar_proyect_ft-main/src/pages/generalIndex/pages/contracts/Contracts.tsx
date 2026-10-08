import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { isOpenCardRegisteContract$ } from '@/services/sharingSubject';
import './contracts.css';
import { PublicEntitiesDirectory } from './components/publicEntitiesDirectory/PublicEntitiesDirectory';
import { axiosInstance } from '@/services/axiosInstance';
import type { Contract } from '@/types/types';
import { Outlet, useOutletContext, useSearchParams } from 'react-router-dom';
import type { CrmDhyriumOutletContext, CrmDhyriumTab } from '@/pages/generalIndex/GeneralIndex';
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

type CrmWorkspaceDefinition = {
  description: string;
  action: string;
  metrics: Array<{ label: string; value: string }>;
  columns: string[];
  rows: string[][];
};

const CRM_WORKSPACES: Record<Exclude<CrmDhyriumTab, 'Contratos'>, CrmWorkspaceDefinition> = {
  'Cartera comercial': {
    description: 'Centraliza clientes, empresas y cuentas comerciales.', action: 'Nuevo cliente',
    metrics: [{ label: 'Clientes', value: '128' }, { label: 'Cartera activa', value: 'S/ 2.4 M' }, { label: 'Por contactar', value: '16' }],
    columns: ['Cliente', 'RUC', 'Responsable', 'Estado'],
    rows: [['Municipalidad Provincial de Lima', '20131380951', 'María Quispe', 'Activo'], ['Gobierno Regional de Arequipa', '2049890572', 'Carlos Ramos', 'Prospecto'], ['Constructora Andina S.A.C.', '20578142619', 'Lucía Torres', 'Activo']],
  },
  Oportunidades: {
    description: 'Administra oportunidades y prioriza las próximas acciones.', action: 'Nueva oportunidad',
    metrics: [{ label: 'En evaluación', value: '12' }, { label: 'Propuesta enviada', value: '8' }, { label: 'Valor estimado', value: 'S/ 860 K' }],
    columns: ['Oportunidad', 'Cliente', 'Etapa', 'Valor'],
    rows: [['Mejoramiento vial urbano', 'Municipalidad de Puno', 'Evaluación', 'S/ 180,000'], ['Supervisión de obra', 'GORE Arequipa', 'Propuesta', 'S/ 245,000'], ['Expediente técnico', 'Municipalidad de Juliaca', 'Negociación', 'S/ 96,000']],
  },
  Seguimiento: {
    description: 'Organiza llamadas, reuniones y tareas comerciales pendientes.', action: 'Registrar actividad',
    metrics: [{ label: 'Para hoy', value: '7' }, { label: 'Esta semana', value: '19' }, { label: 'Completadas', value: '34' }],
    columns: ['Actividad', 'Relacionado con', 'Responsable', 'Fecha'],
    rows: [['Llamada de seguimiento', 'Mejoramiento vial urbano', 'María Quispe', 'Hoy · 10:00'], ['Enviar propuesta', 'Supervisión de obra', 'Carlos Ramos', 'Hoy · 15:30'], ['Reunión de coordinación', 'Expediente técnico', 'Lucía Torres', 'Mañana · 09:00']],
  },
  'Estadísticas': {
    description: 'Consulta el desempeño comercial y la evolución de la cartera.', action: 'Exportar reporte',
    metrics: [{ label: 'Conversión', value: '28%' }, { label: 'Ticket promedio', value: 'S/ 71 K' }, { label: 'Crecimiento', value: '+14.6%' }],
    columns: ['Indicador', 'Periodo actual', 'Periodo anterior', 'Variación'],
    rows: [['Oportunidades ganadas', '14', '11', '+27%'], ['Clientes nuevos', '9', '7', '+29%'], ['Monto contratado', 'S/ 726 K', 'S/ 634 K', '+14.5%']],
  },
  Documentos: {
    description: 'Mantén los documentos comerciales y contractuales centralizados.', action: 'Subir documento',
    metrics: [{ label: 'Documentos', value: '246' }, { label: 'Por revisar', value: '8' }, { label: 'Vigentes', value: '231' }],
    columns: ['Documento', 'Relacionado con', 'Actualización', 'Estado'],
    rows: [['Propuesta técnico económica', 'Mejoramiento vial urbano', 'Hoy · 09:12', 'Vigente'], ['Contrato de supervisión', 'GORE Arequipa', 'Ayer · 17:40', 'Vigente'], ['Ficha de cliente', 'Municipalidad de Juliaca', '12 Jun 2026', 'Por revisar']],
  },
};

const CARTERA_ENTITY_TABS = ['Entidades públicas', 'Entidades privadas', 'Personas naturales'] as const;
type CarteraEntityTab = (typeof CARTERA_ENTITY_TABS)[number];

const CARTERA_ENTITY_ROWS: Record<CarteraEntityTab, string[][]> = {
  'Entidades públicas': [
    ['Municipalidad Provincial de Lima', '20131380951', 'María Quispe', 'Activo'],
    ['Gobierno Regional de Arequipa', '2049890572', 'Carlos Ramos', 'Prospecto'],
    ['Municipalidad de Juliaca', '20161234567', 'Lucía Torres', 'Activo'],
  ],
  'Entidades privadas': [
    ['Constructora Andina S.A.C.', '20578142619', 'Rosa Mamani', 'Activo'],
    ['Inversiones del Sur E.I.R.L.', '20609345128', 'Jorge Huanca', 'Prospecto'],
    ['Servicios Técnicos Altiplano S.A.C.', '20487651239', 'Ana Flores', 'Activo'],
  ],
  'Personas naturales': [
    ['José Luis Condori', '43821765', 'María Quispe', 'Activo'],
    ['Roxana Huamán Quispe', '70918426', 'Carlos Ramos', 'Prospecto'],
    ['Miguel Ángel Apaza', '46280917', 'Lucía Torres', 'Activo'],
  ],
};

const CrmWorkspace = ({ section }: { section: Exclude<CrmDhyriumTab, 'Contratos'> }) => {
  const workspace = CRM_WORKSPACES[section];
  const [carteraEntityTab, setCarteraEntityTab] = useState<CarteraEntityTab>('Entidades públicas');
  const [carteraRows, setCarteraRows] = useState<Record<CarteraEntityTab, string[][]>>(CARTERA_ENTITY_ROWS);
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string[] | null>(null);
  const [clientForm, setClientForm] = useState({ name: '', identity: '', responsible: '' });
  const isCarteraComercial = section === 'Cartera comercial';
  const rows = isCarteraComercial ? carteraRows[carteraEntityTab] : workspace.rows;
  const columns = isCarteraComercial && carteraEntityTab === 'Personas naturales'
    ? ['Persona', 'DNI', 'Responsable', 'Estado']
    : workspace.columns;
  const identityLabel = carteraEntityTab === 'Personas naturales' ? 'DNI' : 'RUC';
  const openClientForm = () => { setClientForm({ name: '', identity: '', responsible: '' }); setIsClientFormOpen(true); };
  const saveClient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!clientForm.name.trim() || !clientForm.identity.trim() || !clientForm.responsible.trim()) return;
    const row = [clientForm.name.trim(), clientForm.identity.trim(), clientForm.responsible.trim(), 'Activo'];
    setCarteraRows(current => ({ ...current, [carteraEntityTab]: [...current[carteraEntityTab], row] }));
    setIsClientFormOpen(false);
    setSelectedEntity(row);
  };
  return <section className="crm-workspace">
    {isCarteraComercial && <nav className="crm-entity-tabs" aria-label="Tipo de entidad">
      {CARTERA_ENTITY_TABS.map(tab => <button key={tab} type="button" onClick={() => setCarteraEntityTab(tab)} className={tab === carteraEntityTab ? 'crm-entity-tab crm-entity-tab--active' : 'crm-entity-tab'}>{tab}</button>)}
    </nav>}
    {isCarteraComercial && carteraEntityTab === 'Entidades públicas' ? <PublicEntitiesDirectory /> : <>
    <header className="crm-workspace-header"><div><p>CRM DHYRIUM</p><h1>{section}</h1><span>{workspace.description}</span></div><button type="button" onClick={isCarteraComercial ? openClientForm : undefined}>{workspace.action}</button></header>
    <div className="crm-workspace-metrics">{workspace.metrics.map(metric => <article key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></article>)}</div>
    <section className="crm-workspace-table"><div className="crm-workspace-table-head">{columns.map(column => <span key={column}>{column}</span>)}</div>{rows.map(row => <div className="crm-workspace-table-row" key={row[0]}>{row.map((value, cellIndex) => <span key={columns[cellIndex]} className={cellIndex === 0 ? 'crm-workspace-primary' : ''}>{value}</span>)}<button type="button" onClick={isCarteraComercial ? () => setSelectedEntity(row) : undefined}>Ver</button></div>)}</section>
    {isCarteraComercial && isClientFormOpen && <div className="crm-client-dialog-backdrop" role="presentation"><form className="crm-client-dialog" onSubmit={saveClient}><div><p>CRM DHYRIUM</p><h2>Nuevo cliente</h2><span>Registra una entidad en {carteraEntityTab.toLowerCase()}.</span></div><label>{carteraEntityTab === 'Personas naturales' ? 'Nombres y apellidos' : 'Razón social'}<input autoFocus value={clientForm.name} onChange={event => setClientForm(current => ({ ...current, name: event.target.value }))} required /></label><label>{identityLabel}<input value={clientForm.identity} onChange={event => setClientForm(current => ({ ...current, identity: event.target.value }))} required /></label><label>Responsable<input value={clientForm.responsible} onChange={event => setClientForm(current => ({ ...current, responsible: event.target.value }))} required /></label><div className="crm-client-dialog-actions"><button type="button" onClick={() => setIsClientFormOpen(false)}>Cancelar</button><button type="submit">Guardar cliente</button></div></form></div>}
    {isCarteraComercial && selectedEntity && <div className="crm-client-dialog-backdrop" role="presentation"><section className="crm-client-dialog"><div><p>FICHA DE CLIENTE</p><h2>{selectedEntity[0]}</h2><span>Información registrada en la cartera comercial.</span></div><dl><div><dt>{identityLabel}</dt><dd>{selectedEntity[1]}</dd></div><div><dt>Responsable</dt><dd>{selectedEntity[2]}</dd></div><div><dt>Estado</dt><dd>{selectedEntity[3]}</dd></div></dl><div className="crm-client-dialog-actions"><button type="button" onClick={() => setSelectedEntity(null)}>Cerrar</button></div></section></div>}
    </>}
  </section>;
};

export const Contracts = () => {
  const { handleHideElements, hideElements } = useHideElement(1000);
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const { newfilterContract, handleSearchChange, searchTerm } =
    useFilterContract(contracts);

  const [filterContract, setFilterContract] = useState<FilterContract>(
    INIT_VALUES_FILTER_CONTRACT
  );
  const [params] = useSearchParams();
  const crmContext = useOutletContext<CrmDhyriumOutletContext | undefined>();
  const crmTab = crmContext?.crmTab ?? 'Contratos';

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
  if (crmTab !== 'Contratos') return <CrmWorkspace section={crmTab} />;
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

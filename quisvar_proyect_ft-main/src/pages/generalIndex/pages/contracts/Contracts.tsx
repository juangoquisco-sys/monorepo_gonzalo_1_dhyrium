import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Outlet, useOutletContext, useSearchParams } from 'react-router-dom';
import { Download, Filter, PanelLeftClose, PanelLeftOpen, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { isOpenCardRegisteContract$ } from '@/services/sharingSubject';
import { AppButton } from '@/components/app-ui/app-button';
import { AppInput } from '@/components/app-ui/app-input';
import { AppSelect } from '@/components/app-ui/app-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { PublicEntitiesDirectory } from './components/publicEntitiesDirectory/PublicEntitiesDirectory';
import type { CrmDhyriumOutletContext, CrmDhyriumTab } from '@/pages/generalIndex/GeneralIndex';
import CardObservations from './views/cardObservations/CardObservations';
import CardRegisterContract from './views/cardRegisterContract/CardRegisterContract';
import { SidebarContractCard } from './components/sidebarContractCard/SidebarContractCard';
import { CONTRACT_TYPE, STATUS_CONTRACT } from './models/definitionsContract.models';
import type { ContractStatus, ContractType } from './models/type.contracts';
import { getStatusContract } from './utils/tools';
import { excelContractReport } from './generateExcel/excelReportConctract';
import { contractQueryKey, type ContractOrganizationOption, useContractList, useContractOrganizationOptions } from './hooks/useContractList';
import './contracts.css';

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

/* Legacy contract workspace retained below as merge reference.
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
*/
const YEAR_STORAGE_KEY = 'dhyrium.contracts.last-year';
const SIDEBAR_STORAGE_KEY = 'dhyrium.contracts.sidebar';
const SIDEBAR_WIDTH_STORAGE_KEY = 'dhyrium.contracts.sidebar-width';
const statusLabels: Record<ContractStatus, string> = { red: 'Plazo vencido', skyBlue: 'En curso', yellow: 'Plazo inminente', grey: 'Bloqueado' };
const recentYears = () => Array.from({ length: 14 }, (_, i) => String(new Date().getFullYear() + 5 - i));

const useDebouncedValue = (value: string, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value.trim()), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debouncedValue;
};

const OrganizationFilter = ({ value, options, loading, onChange }: { value: string; options: ContractOrganizationOption[]; loading: boolean; onChange: (value: string) => void }) => {
  const [query, setQuery] = useState('');
  const selected = options.find(option => `${option.kind}:${option.id}` === value);
  const visible = options.filter(option => option.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
  return <Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="h-9 w-full justify-between font-normal"><span className="truncate">{selected?.name || 'Empresa o consorcio'}</span><Filter className="size-4 text-muted-foreground" /></Button></PopoverTrigger><PopoverContent align="start" className="w-[min(21rem,calc(100vw-2rem))] p-2"><Input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar organización..." className="mb-2 h-8" /><div className="max-h-64 overflow-y-auto"><button type="button" onClick={() => onChange('')} className="flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-sm hover:bg-muted">Todas las organizaciones {!value && <span aria-hidden>✓</span>}</button>{loading && <p className="px-2 py-3 text-sm text-muted-foreground">Cargando organizaciones…</p>}{!loading && visible.map(option => { const optionValue = `${option.kind}:${option.id}`; return <button type="button" key={optionValue} onClick={() => onChange(optionValue)} className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-muted"><span className="min-w-0 truncate">{option.name}</span><span className="shrink-0 text-xs text-muted-foreground">{option.contractCount}</span></button>; })}{!loading && !visible.length && <p className="px-2 py-3 text-sm text-muted-foreground">Sin organizaciones coincidentes.</p>}</div></PopoverContent></Popover>;
};

/* Legacy contract workspace continuation.
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
*/
export const Contracts = () => {
  const [params, setParams] = useSearchParams();
  const crmContext = useOutletContext<CrmDhyriumOutletContext | undefined>();
  const crmTab = crmContext?.crmTab ?? 'Contratos';
  const queryClient = useQueryClient();
  const sidebarElement = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => window.innerWidth >= 900 && localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'closed'
  );
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY)) || 360);
  const [searchInput, setSearchInput] = useState(() => params.get('q') || '');
  const debouncedSearch = useDebouncedValue(searchInput);
  const yearFromUrl = params.get('year') || '';
  const year = yearFromUrl || localStorage.getItem(YEAR_STORAGE_KEY) || '';
  const type = (params.get('type') || '') as ContractType | '';
  const status = (params.get('status') || '') as ContractStatus | '';
  const organization = params.get('organization') || '';
  const contractsQuery = useContractList({ query: debouncedSearch, year, type: type || undefined, organization });
  const organizationsQuery = useContractOrganizationOptions();

  useEffect(() => { const onResize = () => setIsMobile(window.innerWidth < 900); window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize); }, []);
  useEffect(() => setSearchInput(params.get('q') || ''), [params]);
  useEffect(() => { if (debouncedSearch === (params.get('q') || '')) return; const next = new URLSearchParams(params); if (debouncedSearch) next.set('q', debouncedSearch); else next.delete('q'); setParams(next, { replace: true }); }, [debouncedSearch, params, setParams]);
  useEffect(() => { const element = sidebarElement.current; if (!element || !isSidebarOpen || isMobile) return; const observer = new ResizeObserver(entries => { const width = Math.round(entries[0].contentRect.width); if (width >= 280 && width <= 560) { setSidebarWidth(width); localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(width)); } }); observer.observe(element); return () => observer.disconnect(); }, [isMobile, isSidebarOpen]);

  const updateParam = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next, { replace: true }); };
  const updateYear = (value: string) => { if (value) localStorage.setItem(YEAR_STORAGE_KEY, value); else localStorage.removeItem(YEAR_STORAGE_KEY); updateParam('year', value); };
  const toggleSidebar = () => { const next = !isSidebarOpen; setIsSidebarOpen(next); localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? 'open' : 'closed'); };
  const clearFilters = () => { localStorage.removeItem(YEAR_STORAGE_KEY); setSearchInput(''); setParams({}, { replace: true }); };
  const refreshContracts = () => void queryClient.invalidateQueries({ queryKey: contractQueryKey });
  const visibleContracts = useMemo(() => { const contracts = contractsQuery.data || []; return status ? contracts.filter(contract => getStatusContract(contract.createdAt, contract.phases, contract.indexContract) === status) : contracts; }, [contractsQuery.data, status]);
  const activeFilters = [year && `Año: ${year}`, type && `Tipo: ${CONTRACT_TYPE.find(item => item.key === type)?.name}`, status && `Estado: ${statusLabels[status]}`, organization && organizationsQuery.data?.find(item => `${item.kind}:${item.id}` === organization)?.name].filter(Boolean) as string[];

  const sidebarContent = <div className="contracts-workspace__sidebarContent"><div className="contracts-workspace__sidebarHeader"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Índice general</p><h1 className="text-base font-semibold text-foreground">Contratos</h1><p className="text-xs text-muted-foreground">{contractsQuery.isLoading ? 'Cargando…' : `${visibleContracts.length} contrato${visibleContracts.length === 1 ? '' : 's'}`}</p></div><div className="flex items-center gap-1"><Button type="button" variant="ghost" size="icon-sm" aria-label="Exportar contratos" onClick={() => excelContractReport(visibleContracts)} disabled={!visibleContracts.length}><Download /></Button>{!isMobile && <Button type="button" variant="ghost" size="icon-sm" aria-label="Ocultar panel de contratos" onClick={toggleSidebar}><PanelLeftClose /></Button>}</div></div><div className="space-y-2"><div className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><AppInput aria-label="Buscar contratos" value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="CUI, contrato o proyecto" className="h-9 pl-8 pr-8" />{searchInput && <Button type="button" variant="ghost" size="icon-xs" aria-label="Limpiar búsqueda" className="absolute right-1 top-1" onClick={() => setSearchInput('')}><X /></Button>}</div><div className="grid grid-cols-2 gap-2"><AppSelect name="year" aria-label="Año de registro" value={year} onChange={event => updateYear(event.target.value)} data={recentYears()} extractValue={item => item} renderTextField={item => item} placeholder="Año de registro" /><OrganizationFilter value={organization} options={organizationsQuery.data || []} loading={organizationsQuery.isLoading} onChange={value => updateParam('organization', value)} /></div><div className="grid grid-cols-2 gap-2"><AppSelect name="type" aria-label="Tipo de contrato" value={type} onChange={event => updateParam('type', event.target.value)} data={CONTRACT_TYPE} extractValue={item => item.key} renderTextField={item => item.name} placeholder="Tipo" /><AppSelect name="status" aria-label="Estado del contrato" value={status} onChange={event => updateParam('status', event.target.value)} data={STATUS_CONTRACT} extractValue={item => item.key} renderTextField={item => item.name} placeholder="Estado" /></div>{!!activeFilters.length && <div className="flex flex-wrap items-center gap-1"><SlidersHorizontal className="size-3.5 text-muted-foreground" />{activeFilters.map(filter => <Badge key={filter} variant="outline" className="max-w-full truncate">{filter}</Badge>)}<Button type="button" variant="ghost" size="xs" onClick={clearFilters}>Limpiar</Button></div>}</div><ScrollArea className="min-h-0 flex-1 pr-1">{contractsQuery.isLoading && <p className="px-2 py-8 text-center text-sm text-muted-foreground">Cargando contratos…</p>}{contractsQuery.isError && <div className="px-2 py-8 text-center"><p className="text-sm text-muted-foreground">No se pudieron cargar los contratos.</p><AppButton variant="outline" className="mt-2" onClick={() => contractsQuery.refetch()}>Reintentar</AppButton></div>}{!contractsQuery.isLoading && !contractsQuery.isError && !visibleContracts.length && <p className="px-2 py-8 text-center text-sm text-muted-foreground">No hay contratos que coincidan con estos filtros.</p>}{visibleContracts.map(contract => <SidebarContractCard key={contract.id} contract={contract} onSave={refreshContracts} statusLabel={statusLabels[getStatusContract(contract.createdAt, contract.phases, contract.indexContract) as ContractStatus]} />)}</ScrollArea><AppButton className="w-full" onClick={() => (isOpenCardRegisteContract$.setSubject = { isOpen: true })}><Plus />Añadir contrato</AppButton></div>;
  if (crmTab !== 'Contratos') return <CrmWorkspace section={crmTab} />;

  return <div className="contracts-workspace">{isMobile ? <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}><SheetContent side="left" className="flex w-[min(24rem,92vw)] flex-col p-4"><SheetTitle className="sr-only">Panel de contratos</SheetTitle>{sidebarContent}</SheetContent></Sheet> : isSidebarOpen && <aside ref={sidebarElement} className="contracts-workspace__sidebar" style={{ width: sidebarWidth }}>{sidebarContent}</aside>}<main className="contracts-workspace__main">{!isSidebarOpen && <Button type="button" variant="outline" size="sm" className="contracts-workspace__openButton" onClick={toggleSidebar}><PanelLeftOpen />{isMobile ? 'Contratos' : 'Mostrar contratos'}</Button>}<Outlet /></main><CardRegisterContract onSave={refreshContracts} /><CardObservations /></div>;
};

export default Contracts;

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Outlet, useSearchParams } from 'react-router-dom';
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
import CardObservations from './views/cardObservations/CardObservations';
import CardRegisterContract from './views/cardRegisterContract/CardRegisterContract';
import { SidebarContractCard } from './components/sidebarContractCard/SidebarContractCard';
import { CONTRACT_TYPE, STATUS_CONTRACT } from './models/definitionsContract.models';
import type { ContractStatus, ContractType } from './models/type.contracts';
import { getStatusContract } from './utils/tools';
import { excelContractReport } from './generateExcel/excelReportConctract';
import { contractQueryKey, type ContractOrganizationOption, useContractList, useContractOrganizationOptions } from './hooks/useContractList';
import './contracts.css';

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

export const Contracts = () => {
  const [params, setParams] = useSearchParams();
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
  return <div className="contracts-workspace">{isMobile ? <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}><SheetContent side="left" className="flex w-[min(24rem,92vw)] flex-col p-4"><SheetTitle className="sr-only">Panel de contratos</SheetTitle>{sidebarContent}</SheetContent></Sheet> : isSidebarOpen && <aside ref={sidebarElement} className="contracts-workspace__sidebar" style={{ width: sidebarWidth }}>{sidebarContent}</aside>}<main className="contracts-workspace__main">{!isSidebarOpen && <Button type="button" variant="outline" size="sm" className="contracts-workspace__openButton" onClick={toggleSidebar}><PanelLeftOpen />{isMobile ? 'Contratos' : 'Mostrar contratos'}</Button>}<Outlet /></main><CardRegisterContract onSave={refreshContracts} /><CardObservations /></div>;
};

export default Contracts;

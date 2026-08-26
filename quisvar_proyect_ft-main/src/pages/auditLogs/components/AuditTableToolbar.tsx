import { Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Table as ReactTable } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableDateRangeFilter } from '@/components/data-table/DataTableDateRangeFilter';
import {
  DataTableFacetedFilter,
  type DataTableFacetOption,
} from '@/components/data-table/DataTableFacetedFilter';
import { DataTableViewOptions } from '@/components/data-table/DataTableViewOptions';
import { useAuditLogUsers } from '@/hooks/useUserLookupOptions';
import type {
  AuditLogFilters,
  AuditLogItem,
  AuditMethod,
  AuditSeverity,
  AuditStatusGroup,
} from '../models/auditLogs.types';

const columnLabels: Record<string, string> = {
  createdAt: 'Fecha',
  user: 'Usuario',
  module: 'Modulo',
  method: 'Metodo',
  path: 'Accion/Ruta',
  statusCode: 'Status',
  responseTime: 'Tiempo',
  ipAddress: 'IP',
  severity: 'Severidad',
};

const methodOptions: DataTableFacetOption[] = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'DELETE', value: 'DELETE' },
];

const statusOptions: DataTableFacetOption[] = [
  { label: '2xx', value: '2xx' },
  { label: '3xx', value: '3xx' },
  { label: '4xx', value: '4xx' },
  { label: '5xx', value: '5xx' },
];

const severityOptions: DataTableFacetOption[] = [
  { label: 'Info', value: 'INFO' },
  { label: 'Exito', value: 'SUCCESS' },
  { label: 'Alerta', value: 'WARNING' },
  { label: 'Error', value: 'ERROR' },
  { label: 'Critico', value: 'CRITICAL' },
];

const defaultModules = [
  'Autenticación',
  'Centro de usuarios',
  'Trámites',
  'Cocina',
  'Mis reportes',
  'Especialidades',
  'Control asistencia',
  'Rotaciones',
  'Control puerta',
  'Empresas',
  'Grupos',
  'Índice general',
  'Tutoriales',
  'Metrados',
  'Auditoría',
  'General',
];

const hasValues = (values?: unknown[]) => Boolean(values?.length);

interface AuditTableToolbarProps {
  table: ReactTable<AuditLogItem>;
  filters: AuditLogFilters;
  modules: string[];
  isFetching: boolean;
  onFiltersChange: (filters: AuditLogFilters) => void;
}

export const AuditTableToolbar = ({
  table,
  filters,
  modules,
  isFetching,
  onFiltersChange,
}: AuditTableToolbarProps) => {
  const { data: users = [] } = useAuditLogUsers();
  const [searchValue, setSearchValue] = useState(filters.search || '');

  const moduleOptions = useMemo(
    () =>
      Array.from(new Set([...defaultModules, ...modules].filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
        .map(module => ({ label: module, value: module })),
    [modules]
  );

  const userOptions = useMemo(
    () =>
      users.map(user => ({
        label: user.label,
        value: String(user.id),
      })),
    [users]
  );

  const hasActiveFilters = Boolean(
    filters.search ||
      hasValues(filters.userId) ||
      hasValues(filters.method) ||
      hasValues(filters.module) ||
      hasValues(filters.severity) ||
      hasValues(filters.statusGroup) ||
      filters.from ||
      filters.to
  );

  useEffect(() => {
    setSearchValue(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextSearch = searchValue.trim() || undefined;
      if ((filters.search || undefined) === nextSearch) return;
      onFiltersChange({
        ...filters,
        search: nextSearch,
      });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [filters, onFiltersChange, searchValue]);

  const patchFilters = (patch: Partial<AuditLogFilters>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const clearFilters = () => {
    setSearchValue('');
    onFiltersChange({
      limit: filters.limit,
    });
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <Input
          value={searchValue}
          onChange={event => setSearchValue(event.target.value)}
          placeholder="Buscar logs..."
          className="h-9 w-full sm:w-72"
        />
        <DataTableFacetedFilter
          title="Modulo"
          values={filters.module}
          options={moduleOptions}
          onChange={values => patchFilters({ module: values })}
        />
        <DataTableFacetedFilter
          title="Metodo"
          values={filters.method}
          options={methodOptions}
          onChange={values =>
            patchFilters({ method: values as AuditMethod[] | undefined })
          }
        />
        <DataTableFacetedFilter
          title="Estado"
          values={filters.statusGroup}
          options={statusOptions}
          onChange={values =>
            patchFilters({
              statusGroup: values as AuditStatusGroup[] | undefined,
              statusCode: undefined,
            })
          }
        />
        <DataTableFacetedFilter
          title="Severidad"
          values={filters.severity}
          options={severityOptions}
          onChange={values =>
            patchFilters({ severity: values as AuditSeverity[] | undefined })
          }
        />
        <DataTableFacetedFilter
          title="Usuario"
          values={filters.userId?.map(String)}
          options={userOptions}
          searchable
          onChange={values =>
            patchFilters({ userId: values?.map(value => Number(value)) })
          }
        />
        <DataTableDateRangeFilter
          from={filters.from}
          to={filters.to}
          onChange={patchFilters}
        />
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-2"
            onClick={clearFilters}
          >
            <X className="size-4" />
            Limpiar
          </Button>
        )}
        {isFetching && (
          <div
            className="flex h-9 items-center gap-2 rounded-md border border-border bg-muted/50 px-3 text-sm font-medium text-muted-foreground"
            aria-live="polite"
          >
            <Loader2 className="size-4 animate-spin" />
            Consultando...
          </div>
        )}
      </div>

      <DataTableViewOptions table={table} columnLabels={columnLabels} />
    </div>
  );
};

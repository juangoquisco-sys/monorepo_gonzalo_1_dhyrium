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
import { useFrontendLogUsers } from '@/hooks/useUserLookupOptions';
import type {
  FrontendLogEvent,
  FrontendLogFilters,
  FrontendLogLevel,
  FrontendLogStatusGroup,
  FrontendLogType,
} from '../models';

const columnLabels: Record<string, string> = {
  createdAt: 'Fecha',
  user: 'Usuario',
  level: 'Nivel',
  type: 'Tipo',
  message: 'Mensaje',
  route: 'Ruta',
  apiStatus: 'API / Status',
  environment: 'Entorno',
  release: 'Release',
};

const typeOptions: DataTableFacetOption[] = [
  { label: 'React render', value: 'REACT_RENDER_ERROR' },
  { label: 'Window error', value: 'WINDOW_ERROR' },
  { label: 'Unhandled rejection', value: 'UNHANDLED_REJECTION' },
  { label: 'Resource error', value: 'RESOURCE_ERROR' },
  { label: 'API error', value: 'API_ERROR' },
  { label: 'Ruta 404', value: 'FRONTEND_ROUTE_404' },
  { label: 'Ruta sin permiso', value: 'FRONTEND_ROUTE_FORBIDDEN' },
  { label: 'Custom', value: 'CUSTOM' },
];

const levelOptions: DataTableFacetOption[] = [
  { label: 'Info', value: 'INFO' },
  { label: 'Alerta', value: 'WARNING' },
  { label: 'Error', value: 'ERROR' },
  { label: 'Critico', value: 'CRITICAL' },
];

const statusOptions: DataTableFacetOption[] = [
  { label: '2xx', value: '2xx' },
  { label: '3xx', value: '3xx' },
  { label: '4xx', value: '4xx' },
  { label: '5xx', value: '5xx' },
];

const environmentOptions: DataTableFacetOption[] = [
  { label: 'Produccion', value: 'production' },
  { label: 'Desarrollo', value: 'development' },
  { label: 'Preview', value: 'preview' },
  { label: 'Test', value: 'test' },
];

const hasValues = (values?: unknown[]) => Boolean(values?.length);

interface FrontendLogTableToolbarProps {
  table: ReactTable<FrontendLogEvent>;
  filters: FrontendLogFilters;
  isFetching: boolean;
  onFiltersChange: (filters: FrontendLogFilters) => void;
}

export const FrontendLogTableToolbar = ({
  table,
  filters,
  isFetching,
  onFiltersChange,
}: FrontendLogTableToolbarProps) => {
  const { data: users = [] } = useFrontendLogUsers();
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [releaseValue, setReleaseValue] = useState(filters.release || '');

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
      hasValues(filters.type) ||
      hasValues(filters.level) ||
      hasValues(filters.statusGroup) ||
      filters.environment ||
      filters.release ||
      filters.from ||
      filters.to
  );

  useEffect(() => {
    setSearchValue(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    setReleaseValue(filters.release || '');
  }, [filters.release]);

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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextRelease = releaseValue.trim() || undefined;
      if ((filters.release || undefined) === nextRelease) return;
      onFiltersChange({
        ...filters,
        release: nextRelease,
      });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [filters, onFiltersChange, releaseValue]);

  const patchFilters = (patch: Partial<FrontendLogFilters>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const clearFilters = () => {
    setSearchValue('');
    setReleaseValue('');
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
          placeholder="Buscar eventos..."
          className="h-9 w-full sm:w-72"
        />
        <DataTableFacetedFilter
          title="Tipo"
          values={filters.type}
          options={typeOptions}
          onChange={values =>
            patchFilters({ type: values as FrontendLogType[] | undefined })
          }
        />
        <DataTableFacetedFilter
          title="Nivel"
          values={filters.level}
          options={levelOptions}
          onChange={values =>
            patchFilters({ level: values as FrontendLogLevel[] | undefined })
          }
        />
        <DataTableFacetedFilter
          title="Estado"
          values={filters.statusGroup}
          options={statusOptions}
          onChange={values =>
            patchFilters({
              statusGroup: values as FrontendLogStatusGroup[] | undefined,
              statusCode: undefined,
            })
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
        <DataTableFacetedFilter
          title="Entorno"
          values={filters.environment ? [filters.environment] : undefined}
          options={environmentOptions}
          onChange={values =>
            patchFilters({ environment: values?.[values.length - 1] })
          }
        />
        <Input
          value={releaseValue}
          onChange={event => setReleaseValue(event.target.value)}
          placeholder="Release"
          className="h-9 w-full sm:w-36"
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

import { Copy, Loader2, MoreHorizontal, RefreshCw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type {
  ColumnDef,
  RowSelectionState,
  VisibilityState,
} from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DataTableColumnHeader } from '@/components/data-table/DataTableColumnHeader';
import { DataTableEmptyState } from '@/components/data-table/DataTableEmptyState';
import { DataTableLoadingRows } from '@/components/data-table/DataTableLoadingRows';
import { cn } from '@/lib/utils';
import type {
  AuditLogFilters,
  AuditLogItem,
  AuditLogsMeta,
  AuditSortBy,
  AuditSortDir,
  AuditTimeUnit,
} from '../models/auditLogs.types';
import {
  formatAuditDuration,
  formatAuditDurationMs,
} from '../utils/timeFormat';
import { copyTextToClipboard } from '@/utils/copyTextToClipboard';
import { formatAuditLogForCodex } from '../utils/copyAuditLog';
import { getAuditLogById } from '../services/auditLogs.service';
import { AuditSeverityBadge } from './AuditSeverityBadge';
import { AuditStatusBadge } from './AuditStatusBadge';
import { AuditTablePagination } from './AuditTablePagination';
import { AuditTableToolbar } from './AuditTableToolbar';

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const fullName = (log: AuditLogItem) => {
  if (!log.user) return 'Sistema';
  const firstName = log.user.profile?.firstName || '';
  const lastName = log.user.profile?.lastName || '';
  return `${firstName} ${lastName}`.trim() || log.user.email;
};

const methodVariant = (method: string) => {
  if (method === 'DELETE') return 'danger';
  if (['POST', 'PUT', 'PATCH'].includes(method)) return 'info';
  return 'outline';
};

interface AuditLogsTableProps {
  className?: string;
  logs: AuditLogItem[];
  meta?: AuditLogsMeta;
  filters: AuditLogFilters;
  modules: string[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  onRetry: () => void;
  onView: (id: number) => void;
  timeUnit: AuditTimeUnit;
  onTimeUnitChange: (unit: AuditTimeUnit) => void;
  onFiltersChange: (filters: AuditLogFilters) => void;
  onFirstPage: () => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
}

export const AuditLogsTable = ({
  className,
  logs,
  meta,
  filters,
  modules,
  isLoading,
  isFetching,
  isError,
  onRetry,
  onView,
  timeUnit,
  onTimeUnitChange,
  onFiltersChange,
  onFirstPage,
  onNextPage,
  onPreviousPage,
}: AuditLogsTableProps) => {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [copyingDetailId, setCopyingDetailId] = useState<number | null>(null);
  const isSyncing = isFetching && !isLoading;
  const activeSortBy = filters.sortBy || 'createdAt';
  const activeSortDir = filters.sortDir || 'desc';

  const copyDetail = useCallback(async (id: number) => {
    setCopyingDetailId(id);
    try {
      const detail = await getAuditLogById(id);
      await copyTextToClipboard(formatAuditLogForCodex(detail));
      SnackbarUtilities.success('Log copiado');
    } catch {
      SnackbarUtilities.error('No se pudo copiar el log');
    } finally {
      setCopyingDetailId(null);
    }
  }, []);

  const changeSort = useCallback(
    (sortBy: AuditSortBy, sortDir: AuditSortDir) => {
      setRowSelection({});
      onFiltersChange({
        ...filters,
        sortBy,
        sortDir,
        cursorCreatedAt: undefined,
        cursorId: undefined,
        cursorSortValue: undefined,
        direction: undefined,
      });
    },
    [filters, onFiltersChange]
  );

  const columns = useMemo<ColumnDef<AuditLogItem>[]>(
    () => [
      {
        id: 'select',
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={value =>
              table.toggleAllPageRowsSelected(Boolean(value))
            }
            aria-label="Seleccionar pagina"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={value => row.toggleSelected(Boolean(value))}
            aria-label="Seleccionar fila"
          />
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Fecha"
            sortKey="createdAt"
            activeSortBy={activeSortBy}
            sortDir={activeSortDir}
            onSortChange={sortDir => changeSort('createdAt', sortDir)}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'user',
        enableSorting: false,
        accessorFn: row => fullName(row),
        header: 'Usuario',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-secondary">
              {fullName(row.original)}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.user?.email || 'Sin usuario'}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'module',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Modulo" />
        ),
        cell: ({ row }) => row.original.module || 'General',
      },
      {
        accessorKey: 'method',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Metodo" />
        ),
        cell: ({ row }) => (
          <Badge variant={methodVariant(row.original.method)}>
            {row.original.method || 'N/D'}
          </Badge>
        ),
      },
      {
        accessorKey: 'path',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Accion/Ruta" />
        ),
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[26rem] truncate text-sm">
                {row.original.path || row.original.action}
              </span>
            </TooltipTrigger>
            <TooltipContent>{row.original.action}</TooltipContent>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'statusCode',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Status"
            sortKey="statusCode"
            activeSortBy={activeSortBy}
            sortDir={activeSortDir}
            onSortChange={sortDir => changeSort('statusCode', sortDir)}
          />
        ),
        cell: ({ row }) => (
          <AuditStatusBadge statusCode={row.original.statusCode} />
        ),
      },
      {
        accessorKey: 'responseTime',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Tiempo"
            sortKey="responseTime"
            activeSortBy={activeSortBy}
            sortDir={activeSortDir}
            onSortChange={sortDir => changeSort('responseTime', sortDir)}
            menuContent={
              <>
                <DropdownMenuLabel>Mostrar en</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={timeUnit}
                  onValueChange={value =>
                    onTimeUnitChange(value as AuditTimeUnit)
                  }
                >
                  <DropdownMenuRadioItem value="ms">
                    Milisegundos
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="s">
                    Segundos
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="min">
                    Minutos
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </>
            }
          />
        ),
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="whitespace-nowrap">
                {formatAuditDuration(row.original.responseTime, timeUnit)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {formatAuditDurationMs(row.original.responseTime)}
            </TooltipContent>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'ipAddress',
        header: 'IP',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.ipAddress || 'N/D'}
          </span>
        ),
      },
      {
        accessorKey: 'severity',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Severidad"
            sortKey="severity"
            activeSortBy={activeSortBy}
            sortDir={activeSortDir}
            onSortChange={sortDir => changeSort('severity', sortDir)}
          />
        ),
        cell: ({ row }) => (
          <AuditSeverityBadge severity={row.original.severity} />
        ),
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Abrir acciones"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(row.original.id)}>
                  Ver detalle
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={copyingDetailId === row.original.id}
                  onClick={() => copyDetail(row.original.id)}
                >
                  {copyingDetailId === row.original.id ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Copy className="size-4 text-muted-foreground" />
                  )}
                  Copiar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [
      activeSortBy,
      activeSortDir,
      changeSort,
      copyingDetailId,
      copyDetail,
      onTimeUnitChange,
      onView,
      timeUnit,
    ]
  );

  const table = useReactTable({
    data: logs,
    columns,
    state: {
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: 0,
        pageSize: filters.limit || 25,
      },
    },
    manualPagination: true,
    enableSorting: false,
    enableRowSelection: true,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
  });

  const changePageSize = (limit: number) => {
    setRowSelection({});
    onFiltersChange({ ...filters, limit });
  };

  return (
    <Card
      className={cn(
        'flex min-h-0 flex-1 flex-col rounded-md shadow-app-card',
        className
      )}
    >
      <CardHeader className="shrink-0 gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Logs registrados</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {logs.length} eventos en esta vista
              {Object.keys(rowSelection).length > 0 &&
                ` / ${Object.keys(rowSelection).length} seleccionados`}
            </p>
          </div>
          {isSyncing && (
            <div
              className="flex w-fit items-center gap-2 rounded-md border border-border bg-muted/60 px-3 py-2 text-sm font-medium text-muted-foreground"
              aria-live="polite"
            >
              <Loader2 className="size-4 animate-spin" />
              Consultando filtros...
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-fit gap-2"
            onClick={onRetry}
            disabled={isFetching}
          >
            <RefreshCw
              className={isFetching ? 'size-4 animate-spin' : 'size-4'}
            />
            Reintentar
          </Button>
        </div>
        <AuditTableToolbar
          table={table}
          filters={filters}
          modules={modules}
          isFetching={isFetching}
          onFiltersChange={onFiltersChange}
        />
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        {isError ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-muted/40 text-center">
            <strong className="text-secondary">
              No se pudieron cargar logs
            </strong>
            <Button type="button" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        ) : (
          <TooltipProvider>
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-border">
              {isSyncing && (
                <div className="absolute inset-x-0 top-0 z-10 h-1 overflow-hidden bg-muted">
                  <div className="h-full w-1/3 animate-[audit-table-progress_1s_ease-in-out_infinite] bg-primary" />
                </div>
              )}
              <div
                className={
                  isSyncing
                    ? 'h-full min-h-0 opacity-60 transition-opacity'
                    : 'h-full min-h-0 transition-opacity'
                }
                aria-busy={isFetching}
              >
                <Table
                  containerClassName="h-full min-h-0"
                  className="min-w-[1100px]"
                >
                  <TableHeader>
                    {table.getHeaderGroups().map(headerGroup => (
                      <TableRow
                        key={headerGroup.id}
                        className="bg-muted/60 hover:bg-muted/60"
                      >
                        {headerGroup.headers.map(header => (
                          <TableHead
                            key={header.id}
                            className="sticky top-0 z-20 whitespace-nowrap bg-muted/95 backdrop-blur"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <DataTableLoadingRows
                        table={table}
                        rowCount={filters.limit || 10}
                      />
                    )}

                    {!isLoading &&
                      table.getRowModel().rows.map(row => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && 'selected'}
                          className="data-[state=selected]:bg-muted/70"
                        >
                          {row.getVisibleCells().map(cell => (
                            <TableCell key={cell.id} className="align-middle">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}

                    {!isLoading && table.getRowModel().rows.length === 0 && (
                      <DataTableEmptyState table={table}>
                        No se encontraron logs
                      </DataTableEmptyState>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TooltipProvider>
        )}

        <div className="shrink-0">
          <AuditTablePagination
            meta={meta}
            isFetching={isFetching}
            onFirstPage={onFirstPage}
            onNextPage={onNextPage}
            onPreviousPage={onPreviousPage}
            onPageSizeChange={changePageSize}
          />
        </div>
      </CardContent>
    </Card>
  );
};

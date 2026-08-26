import { Loader2, MoreHorizontal, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  FrontendLogEvent,
  FrontendLogFilters,
  FrontendLogsMeta,
} from '../models';
import { FrontendLogTablePagination } from './FrontendLogTablePagination';
import { FrontendLogTableToolbar } from './FrontendLogTableToolbar';
import {
  formatDateTime,
  fullName,
  levelVariant,
  statusVariant,
  typeLabel,
} from './frontendLogFormat';

interface FrontendLogEventsTableProps {
  className?: string;
  events: FrontendLogEvent[];
  meta?: FrontendLogsMeta;
  filters: FrontendLogFilters;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  onRetry: () => void;
  onView: (id: number) => void;
  onFiltersChange: (filters: FrontendLogFilters) => void;
  onFirstPage: () => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
}

export const FrontendLogEventsTable = ({
  className,
  events,
  meta,
  filters,
  isLoading,
  isFetching,
  isError,
  onRetry,
  onView,
  onFiltersChange,
  onFirstPage,
  onNextPage,
  onPreviousPage,
}: FrontendLogEventsTableProps) => {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const isSyncing = isFetching && !isLoading;

  const columns = useMemo<ColumnDef<FrontendLogEvent>[]>(
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
          <DataTableColumnHeader column={column} title="Fecha" />
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
        accessorKey: 'level',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Nivel" />
        ),
        cell: ({ row }) => (
          <Badge variant={levelVariant(row.original.level)}>
            {row.original.level}
          </Badge>
        ),
      },
      {
        accessorKey: 'type',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Tipo" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline">{typeLabel(row.original.type)}</Badge>
        ),
      },
      {
        accessorKey: 'message',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Mensaje" />
        ),
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[28rem] truncate text-sm">
                {row.original.message}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-md">
              {row.original.message}
            </TooltipContent>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'route',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Ruta" />
        ),
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[22rem] truncate text-sm text-muted-foreground">
                {row.original.route || 'Sin ruta'}
              </span>
            </TooltipTrigger>
            <TooltipContent>{row.original.route || 'Sin ruta'}</TooltipContent>
          </Tooltip>
        ),
      },
      {
        id: 'apiStatus',
        enableSorting: false,
        header: 'API / Status',
        cell: ({ row }) => (
          <div className="grid min-w-0 gap-1">
            {row.original.statusCode ? (
              <Badge
                variant={statusVariant(row.original.statusCode)}
                className="w-fit"
              >
                {row.original.statusCode}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">Sin HTTP</span>
            )}
            {row.original.apiUrl && (
              <span className="max-w-[18rem] truncate text-xs text-muted-foreground">
                {row.original.apiMethod} {row.original.apiUrl}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'environment',
        header: 'Entorno',
        enableSorting: false,
        cell: ({ row }) => row.original.environment || 'N/D',
      },
      {
        accessorKey: 'release',
        header: 'Release',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.release || 'unknown'}
          </span>
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [onView]
  );

  const table = useReactTable({
    data: events,
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
            <CardTitle>Eventos frontend</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {events.length} eventos en esta vista
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
        <FrontendLogTableToolbar
          table={table}
          filters={filters}
          isFetching={isFetching}
          onFiltersChange={onFiltersChange}
        />
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        {isError ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-muted/40 text-center">
            <strong className="text-secondary">
              No se pudieron cargar eventos
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
                  className="min-w-[1200px]"
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
                        No se encontraron eventos
                      </DataTableEmptyState>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TooltipProvider>
        )}

        <div className="shrink-0">
          <FrontendLogTablePagination
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

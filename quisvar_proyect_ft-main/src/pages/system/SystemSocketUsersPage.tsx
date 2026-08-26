import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  Eye,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Router,
  X,
} from 'lucide-react';
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
import { AppPageShell } from '@/components/app-ui/app-page-shell';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import {
  DataTableFacetedFilter,
  type DataTableFacetOption,
} from '@/components/data-table/DataTableFacetedFilter';
import { DataTableLoadingRows } from '@/components/data-table/DataTableLoadingRows';
import { DataTableViewOptions } from '@/components/data-table/DataTableViewOptions';
import { SocketContext } from '@/context/SocketContex';
import type {
  SystemSocketUser,
  SystemSocketUsersFilters,
  SystemSocketUsersSortDir,
  SystemSocketUsersSortBy,
} from './systemSocketUsers.models';
import { useSystemHeaderAction } from './SystemHeaderActionContext';
import { useSystemSocketUsers } from './useSystemSocketUsers';

const SYSTEM_SOCKET_USERS_CHANGED_EVENT = 'server:system-socket-users-changed';

const INITIAL_FILTERS: SystemSocketUsersFilters = {
  page: 1,
  limit: 25,
  sortBy: 'lastConnectionAt',
  sortDir: 'desc',
};

const pageSizeOptions = [10, 25, 50, 100];

const columnLabels: Record<string, string> = {
  fullName: 'Usuario',
  roleName: 'Rol',
  offices: 'Oficinas',
  ips: 'IP',
  connections: 'Conexiones',
  connectedAt: 'Conectado desde',
  lastConnectionAt: 'Ultima conexion',
  rooms: 'Rooms',
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'N/D';
  return new Date(value).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const compactList = (values: string[], fallback = 'N/D') => {
  if (!values.length) return fallback;
  if (values.length <= 2) return values.join(', ');
  return `${values.slice(0, 2).join(', ')} +${values.length - 2}`;
};

const formatIpSummary = (ips: string[]) => {
  const uniqueIps = Array.from(
    new Set(ips.map(ip => ip.trim()).filter(Boolean))
  );
  if (uniqueIps.length === 0) return '-';
  if (uniqueIps.length === 1) return uniqueIps[0];
  return `${uniqueIps.length} IPs`;
};

const resetBlank = (value: string) => value.trim() || undefined;

const buildFacetOptions = (
  values: Array<string | null | undefined>,
  selected?: string
): DataTableFacetOption[] => {
  const counts = new Map<string, number>();
  values
    .map(value => value?.trim())
    .filter((value): value is string => Boolean(value))
    .forEach(value => counts.set(value, (counts.get(value) || 0) + 1));

  if (selected && !counts.has(selected)) {
    counts.set(selected, 0);
  }

  return Array.from(counts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([value, count]) => ({
      label: value,
      value,
      count,
    }));
};

const SummaryCard = ({
  title,
  value,
  detail,
}: {
  title: string;
  value: string | number;
  detail: string;
}) => (
  <Card className="rounded-md shadow-app-card">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-semibold text-secondary">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </CardContent>
  </Card>
);

const SystemSocketUsersPage = () => {
  const socket = useContext(SocketContext);
  const [filters, setFilters] =
    useState<SystemSocketUsersFilters>(INITIAL_FILTERS);
  const [searchValue, setSearchValue] = useState('');
  const [selectedUser, setSelectedUser] = useState<SystemSocketUser | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const {
    data: socketUsersData,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useSystemSocketUsers(filters);
  const rows = useMemo(() => socketUsersData?.data || [], [socketUsersData]);
  const meta = socketUsersData?.meta;
  const summary = socketUsersData?.summary;
  const isSyncing = isFetching && !isLoading;
  const hasActiveFilters = Boolean(
    filters.search ||
      filters.office ||
      filters.role ||
      filters.room ||
      filters.multiple
  );
  const officeOptions = useMemo(
    () =>
      buildFacetOptions(
        rows.flatMap(row => row.offices),
        filters.office
      ),
    [filters.office, rows]
  );
  const roleOptions = useMemo(
    () =>
      buildFacetOptions(
        rows.map(row => row.roleName),
        filters.role
      ),
    [filters.role, rows]
  );
  const roomOptions = useMemo(
    () =>
      buildFacetOptions(
        rows.flatMap(row => row.rooms),
        filters.room
      ),
    [filters.room, rows]
  );

  const patchFilters = useCallback(
    (patch: Partial<SystemSocketUsersFilters>) => {
      setRowSelection({});
      setFilters(current => ({
        ...current,
        ...patch,
        page: patch.page || 1,
      }));
    },
    []
  );

  const refreshSnapshot = useCallback(() => {
    void refetch();
  }, [refetch]);

  const changeSort = useCallback(
    (sortBy: SystemSocketUsersSortBy, sortDir: SystemSocketUsersSortDir) => {
      setFilters(current => ({
        ...current,
        sortBy,
        sortDir,
        page: 1,
      }));
    },
    []
  );

  const openDetail = useCallback((user: SystemSocketUser) => {
    setSelectedUser(user);
    setDetailOpen(true);
  }, []);

  const headerAction = useMemo(
    () => ({
      onClick: refreshSnapshot,
      isLoading: isFetching,
    }),
    [isFetching, refreshSnapshot]
  );

  useSystemHeaderAction(headerAction);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters(current => {
        const search = resetBlank(searchValue);
        if ((current.search || undefined) === search) return current;
        return { ...current, search, page: 1 };
      });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchValue]);

  useEffect(() => {
    const handleChanged = () => {
      refreshSnapshot();
    };
    socket.on(SYSTEM_SOCKET_USERS_CHANGED_EVENT, handleChanged);
    return () => {
      socket.off(SYSTEM_SOCKET_USERS_CHANGED_EVENT, handleChanged);
    };
  }, [refreshSnapshot, socket]);

  useEffect(() => {
    if (!selectedUser?.userId) return;
    const updatedUser = rows.find(row => row.userId === selectedUser.userId);
    if (updatedUser) setSelectedUser(updatedUser);
  }, [rows, selectedUser?.userId]);

  const columns = useMemo<ColumnDef<SystemSocketUser>[]>(
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
        accessorKey: 'fullName',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Usuario"
            sortKey="fullName"
            activeSortBy={filters.sortBy}
            sortDir={filters.sortDir}
            onSortChange={sortDir => changeSort('fullName', sortDir)}
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-secondary">
              {row.original.fullName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.email}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              DNI {row.original.dni || 'N/D'}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'roleName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Rol" />
        ),
        cell: ({ row }) => row.original.roleName || 'N/D',
      },
      {
        accessorKey: 'offices',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Oficinas" />
        ),
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[18rem] truncate">
                {compactList(row.original.offices)}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              {row.original.offices.join(', ') || 'N/D'}
            </TooltipContent>
          </Tooltip>
        ),
      },
      {
        accessorKey: 'ips',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="IP" />
        ),
        cell: ({ row }) => {
          const value = formatIpSummary(row.original.ips);
          const tooltipValue = row.original.ips.length
            ? row.original.ips.join(', ')
            : 'N/D';

          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block max-w-[8rem] truncate font-mono text-xs text-muted-foreground">
                  {value}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                {tooltipValue}
              </TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: 'connections',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Conexiones"
            className="justify-center"
            sortKey="connections"
            activeSortBy={filters.sortBy}
            sortDir={filters.sortDir}
            onSortChange={sortDir => changeSort('connections', sortDir)}
          />
        ),
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Badge variant={row.original.connections > 1 ? 'warning' : 'info'}>
              {row.original.connections}
            </Badge>
          </div>
        ),
      },
      {
        accessorKey: 'connectedAt',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Conectado desde"
            sortKey="connectedAt"
            activeSortBy={filters.sortBy}
            sortDir={filters.sortDir}
            onSortChange={sortDir => changeSort('connectedAt', sortDir)}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatDateTime(row.original.connectedAt)}
          </span>
        ),
      },
      {
        accessorKey: 'lastConnectionAt',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Ultima conexion"
            sortKey="lastConnectionAt"
            activeSortBy={filters.sortBy}
            sortDir={filters.sortDir}
            onSortChange={sortDir => changeSort('lastConnectionAt', sortDir)}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatDateTime(row.original.lastConnectionAt)}
          </span>
        ),
      },
      {
        accessorKey: 'rooms',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Rooms" />
        ),
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex max-w-[20rem] flex-wrap gap-1 overflow-hidden">
                {row.original.rooms.slice(0, 3).map(room => (
                  <Badge key={room} variant="outline">
                    {room}
                  </Badge>
                ))}
                {row.original.rooms.length > 3 && (
                  <Badge variant="secondary">
                    +{row.original.rooms.length - 3}
                  </Badge>
                )}
                {row.original.rooms.length === 0 && (
                  <span className="text-sm text-muted-foreground">N/D</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              {row.original.rooms.join(', ') || 'N/D'}
            </TooltipContent>
          </Tooltip>
        ),
      },
      {
        id: 'actions',
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
                <DropdownMenuItem onClick={() => openDetail(row.original)}>
                  <Eye className="size-4 text-muted-foreground" />
                  Ver detalle
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [changeSort, filters.sortBy, filters.sortDir, openDetail]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: (filters.page || 1) - 1,
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

  const hasPrevPage = (meta?.page || 1) > 1;
  const hasNextPage = Boolean(meta && meta.page < meta.totalPages);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AppPageShell className="min-h-0 flex-1 overflow-y-auto">
        <main className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col gap-4 p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="Usuarios conectados"
              value={summary?.totalUsers ?? 0}
              detail="Usuarios unicos con presencia online"
            />
            <SummaryCard
              title="Conexiones activas"
              value={summary?.totalConnections ?? 0}
              detail="Sockets autenticados en memoria"
            />
            <SummaryCard
              title="Multiples sesiones"
              value={summary?.usersWithMultipleConnections ?? 0}
              detail="Usuarios con mas de una conexion"
            />
          </div>

          <Card className="flex min-h-[calc(100dvh-15rem)] flex-1 flex-col rounded-md shadow-app-card">
            <CardHeader className="shrink-0 gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Usuarios conectados</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {rows.length} usuarios en esta vista
                    {Object.keys(rowSelection).length > 0 &&
                      ` / ${Object.keys(rowSelection).length} seleccionados`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isSyncing && (
                    <div
                      className="flex w-fit items-center gap-2 rounded-md border border-border bg-muted/60 px-3 py-2 text-sm font-medium text-muted-foreground"
                      aria-live="polite"
                    >
                      <Loader2 className="size-4 animate-spin" />
                      Actualizando snapshot...
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-fit gap-2"
                    onClick={refreshSnapshot}
                    disabled={isFetching}
                  >
                    <RefreshCw
                      className={isFetching ? 'size-4 animate-spin' : 'size-4'}
                    />
                    Reintentar
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <Input
                    value={searchValue}
                    onChange={event => setSearchValue(event.target.value)}
                    placeholder="Buscar usuarios..."
                    className="h-9 w-full sm:w-72"
                  />
                  <DataTableFacetedFilter
                    title="Oficina"
                    values={filters.office ? [filters.office] : undefined}
                    options={officeOptions}
                    searchable
                    onChange={values =>
                      patchFilters({
                        office: values?.[values.length - 1],
                      })
                    }
                  />
                  <DataTableFacetedFilter
                    title="Rol"
                    values={filters.role ? [filters.role] : undefined}
                    options={roleOptions}
                    searchable
                    onChange={values =>
                      patchFilters({
                        role: values?.[values.length - 1],
                      })
                    }
                  />
                  <DataTableFacetedFilter
                    title="Room"
                    values={filters.room ? [filters.room] : undefined}
                    options={roomOptions}
                    searchable
                    onChange={values =>
                      patchFilters({
                        room: values?.[values.length - 1],
                      })
                    }
                  />
                  <DataTableFacetedFilter
                    title="Conexiones"
                    values={filters.multiple ? ['multiple'] : undefined}
                    options={[
                      {
                        label: 'Solo multiples',
                        value: 'multiple',
                        count: summary?.usersWithMultipleConnections,
                      },
                    ]}
                    onChange={values =>
                      patchFilters({
                        multiple: values?.includes('multiple') || undefined,
                      })
                    }
                  />
                  {hasActiveFilters && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-2"
                      onClick={() => {
                        setSearchValue('');
                        setFilters(INITIAL_FILTERS);
                      }}
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

                <DataTableViewOptions
                  table={table}
                  columnLabels={columnLabels}
                />
              </div>
            </CardHeader>

            <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
              {isError ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-muted/40 text-center">
                  <strong className="text-secondary">
                    No se pudieron cargar usuarios conectados
                  </strong>
                  <Button type="button" onClick={refreshSnapshot}>
                    Reintentar
                  </Button>
                </div>
              ) : (
                <TooltipProvider>
                  <div className="relative min-h-0 flex-1 overflow-auto rounded-md border border-border">
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
                        containerClassName="min-h-full overflow-visible"
                        className="min-w-[1180px]"
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
                                  <TableCell
                                    key={cell.id}
                                    className="align-middle"
                                  >
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext()
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}

                          {!isLoading &&
                            table.getRowModel().rows.length === 0 && (
                              <DataTableEmptyState table={table}>
                                No hay usuarios conectados para esta vista
                              </DataTableEmptyState>
                            )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TooltipProvider>
              )}

              <div className="flex shrink-0 flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    value={String(filters.limit || 25)}
                    disabled={isFetching}
                    onValueChange={value =>
                      patchFilters({ limit: Number(value), page: 1 })
                    }
                  >
                    <SelectTrigger className="h-9 w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pageSizeOptions.map(option => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm font-medium text-foreground">
                    Filas por vista
                  </span>
                  <span className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                    Vista fijada: {formatDateTime(socketUsersData?.generatedAt)}
                  </span>
                  <span className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                    Pagina {meta?.page || 1} de {meta?.totalPages || 0}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={isFetching || !hasPrevPage}
                    onClick={() => patchFilters({ page: 1 })}
                  >
                    <ChevronsLeft className="size-4" />
                    Primera
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={isFetching || !hasPrevPage}
                    onClick={() =>
                      patchFilters({ page: (meta?.page || 1) - 1 })
                    }
                  >
                    <ChevronLeft className="size-4" />
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={isFetching || !hasNextPage}
                    onClick={() =>
                      patchFilters({ page: (meta?.page || 1) + 1 })
                    }
                  >
                    Siguiente
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </AppPageShell>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="flex w-full flex-col overflow-x-hidden overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{selectedUser?.fullName || 'Detalle'}</SheetTitle>
            <SheetDescription>
              {selectedUser?.email || 'Usuario conectado por Socket.IO'}
            </SheetDescription>
          </SheetHeader>

          {selectedUser && (
            <div className="grid min-w-0 gap-5">
              <div className="grid min-w-0 gap-3 rounded-md border border-border bg-muted/30 p-3">
                <DetailRow label="Usuario ID" value={selectedUser.userId} />
                <DetailRow label="DNI" value={selectedUser.dni || 'N/D'} />
                <DetailRow label="Rol" value={selectedUser.roleName || 'N/D'} />
                <DetailRow
                  label="Oficinas"
                  value={compactList(selectedUser.offices)}
                />
                <DetailRow
                  label="Conexiones"
                  value={selectedUser.connections}
                />
                <DetailRow
                  label="Conectado desde"
                  value={formatDateTime(selectedUser.connectedAt)}
                />
                <DetailRow
                  label="Ultima conexion"
                  value={formatDateTime(selectedUser.lastConnectionAt)}
                />
              </div>

              <div className="grid min-w-0 gap-2">
                <h3 className="text-sm font-semibold text-secondary">
                  Conexiones activas
                </h3>
                {(selectedUser.connectionDetails || []).map(connection => (
                  <div
                    key={connection.socketId}
                    className="grid min-w-0 gap-3 rounded-md border border-border p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="info">Socket</Badge>
                      <span className="max-w-[18rem] truncate font-mono text-xs text-muted-foreground">
                        {connection.socketId}
                      </span>
                    </div>
                    <DetailRow
                      label="ConnectedAt"
                      value={formatDateTime(connection.connectedAt)}
                    />
                    <DetailRow label="IP" value={connection.ip || 'N/D'} />
                    <div className="grid min-w-0 gap-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Rooms
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {connection.rooms.map(room => (
                          <Badge key={room} variant="outline">
                            <Router className="size-3" />
                            {room}
                          </Badge>
                        ))}
                        {connection.rooms.length === 0 && (
                          <span className="text-sm text-muted-foreground">
                            N/D
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid min-w-0 gap-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        User agent
                      </span>
                      <p className="min-w-0 max-w-full whitespace-normal break-all rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                        {connection.userAgent || 'N/D'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid min-w-0 gap-3 rounded-md border border-border bg-muted/30 p-3">
                <DetailList label="SocketIds" values={selectedUser.socketIds} />
                <DetailList label="Rooms" values={selectedUser.rooms} />
                <DetailList label="IPs" values={selectedUser.ips} />
                <DetailList
                  label="User agents"
                  values={selectedUser.userAgents}
                />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="grid min-w-0 gap-1">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <span className="min-w-0 break-words text-sm font-medium text-secondary">
      {value}
    </span>
  </div>
);

const DetailList = ({ label, values }: { label: string; values: string[] }) => (
  <div className="grid min-w-0 gap-1">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <div className="flex min-w-0 flex-wrap gap-1">
      {values.map(value => (
        <Badge
          key={value}
          variant="outline"
          className="max-w-full whitespace-normal"
        >
          <span className="min-w-0 whitespace-normal break-all">{value}</span>
        </Badge>
      ))}
      {values.length === 0 && (
        <span className="text-sm text-muted-foreground">N/D</span>
      )}
    </div>
  </div>
);

export default SystemSocketUsersPage;

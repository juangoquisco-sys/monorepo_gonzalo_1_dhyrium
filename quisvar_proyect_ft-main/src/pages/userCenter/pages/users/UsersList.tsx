import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import './userList.css';
import {
  Archive,
  FileText,
  Loader2,
  Plus,
  Printer,
  Settings2,
} from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type {
  ColumnDef,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import CardGenerateReport from '@/components/cardGenerateReport/CardGenerateReport';
import LegacyButton from '@/components/button/Button';
import {
  isOpenCardAddEquipment$,
  isOpenCardAssing$,
  isOpenCardFiles$,
  isOpenCardGenerateReport$,
  isOpenCardRegisterUser$,
} from '@/services/sharingSubject';
import type {
  Equipment as Equip,
  GeneralFile,
  RoleForm,
  User,
  WorkStation,
} from '@/types/types';
import type { RootState } from '@/store/store.types';
import { useSelector } from 'react-redux';
import { axiosInstance } from '@/services/axiosInstance';
import Equipment from './components/equipment/Equipment';
import CardAddEquipment from './views/CardAddEquipment/CardAddEquipment';
import CardAssign from './views/CardAssign/CardAssign';
import CardRegisterUser from './views/cardRegisterUser/CardRegisterUser';
import UserEditWorkspace from './views/userEditWorkspace/UserEditWorkspace';
import { getIconDefault } from '@/utils/tools';
import { openDialog } from '@/utils/dialog';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import useUserCenterUsers from './hooks/useUserCenterUsers';

type PayrollFilter =
  | 'all'
  | 'complete'
  | 'incomplete'
  | 'missing'
  | 'expired'
  | 'expiring';

const PAYROLL_FILTERS: { value: PayrollFilter; label: string }[] = [
  { value: 'all', label: 'Planilla: todos' },
  { value: 'complete', label: 'Datos completos' },
  { value: 'incomplete', label: 'Datos incompletos' },
  { value: 'missing', label: 'Sin datos' },
  { value: 'expired', label: 'Contrato vencido' },
  { value: 'expiring', label: 'Por vencer' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const COLUMN_LABELS: Record<string, string> = {
  select: 'Seleccion',
  user: 'Usuario',
  role: 'Rol de trabajo',
  profession: 'Profesion',
  phone: 'Celular',
  payroll: 'Planilla',
  status: 'Estado',
  edit: 'Editar',
  reports: 'Reportes',
};

const PAYROLL_STATE_TEXT: Record<PayrollFilter, string> = {
  all: 'Todos',
  complete: 'Completo',
  incomplete: 'Incompleto',
  missing: 'Sin datos',
  expired: 'Vencido',
  expiring: 'Por vencer',
};

const getPayrollState = (user: User): PayrollFilter => {
  const payroll = user.payrollInfo;
  if (!payroll) return 'missing';

  const hasStartDate = Boolean(payroll.contractStartDate);
  const hasSalary = Number(payroll.monthlySalary ?? 0) > 0;
  const hasContractType = Boolean(payroll.contractType);
  const endDate = payroll.contractEndDate
    ? new Date(payroll.contractEndDate)
    : null;

  if (endDate && !Number.isNaN(endDate.getTime())) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const warningDate = new Date(today);
    warningDate.setDate(warningDate.getDate() + 30);

    if (endDate < today) return 'expired';
    if (endDate <= warningDate) return 'expiring';
  }

  if (hasStartDate && hasSalary && hasContractType) return 'complete';
  return 'incomplete';
};

const getUserName = (user: User) =>
  `${user.profile.lastName} ${user.profile.firstName}`.trim();

const toFacetOptions = (values: Array<string | undefined | null>) =>
  Array.from(new Set(values.filter(Boolean) as string[]))
    .sort((a, b) => a.localeCompare(b))
    .map<DataTableFacetOption>(value => ({ label: value, value }));

const UsersList = () => {
  const {
    data: users,
    isLoading: isLoadingUsers,
    refetch: refreshUsers,
  } = useUserCenterUsers();
  const { id: userSessionId } = useSelector(
    (state: RootState) => state.userSession
  );
  const [isArchived, setIsArchived] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [payrollFilter, setPayrollFilter] = useState<PayrollFilter>('all');
  const [roleFilter, setRoleFilter] = useState<string[] | undefined>();
  const [professionFilter, setProfessionFilter] = useState<
    string[] | undefined
  >();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [printReportId, setPrintReportId] = useState<number>();
  const [workStations, setWorkStations] = useState<WorkStation[]>();
  const [roles, setRoles] = useState<RoleForm[] | null>(null);
  const [generalFiles, setGeneralFiles] = useState<GeneralFile[] | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      await getWorkStations();
      await getGeneralFiles();
      await getRoles();
    })();
  }, []);

  const getGeneralFiles = async () => {
    const response = await axiosInstance.get('/files/generalFiles');
    setGeneralFiles(response.data);
  };
  const getRoles = async () => {
    const response = await axiosInstance.get<RoleForm[]>('/role/form');
    setRoles(response.data);
  };
  const getUsers = useCallback(async () => {
    await refreshUsers();
  }, [refreshUsers]);
  const getWorkStations = async () => {
    const response = await axiosInstance.get('/workStation');
    setWorkStations(response.data);
  };

  const roleOptions = useMemo(
    () => toFacetOptions(users?.map(user => user.role?.name) || []),
    [users]
  );

  const professionOptions = useMemo(
    () => toFacetOptions(users?.map(user => user.profile.job?.label) || []),
    [users]
  );

  const filterList = useMemo(() => {
    if (!users) return [];
    const filteredByStatus = users.filter(user => user.status === isArchived);
    const filteredByPayroll =
      payrollFilter === 'all'
        ? filteredByStatus
        : filteredByStatus.filter(
            user => getPayrollState(user) === payrollFilter
          );

    const filteredByRole = roleFilter?.length
      ? filteredByPayroll.filter(user =>
          roleFilter.includes(user.role?.name || '')
        )
      : filteredByPayroll;
    const filteredByProfession = professionFilter?.length
      ? filteredByRole.filter(user =>
          professionFilter.includes(user.profile.job?.label || '')
        )
      : filteredByRole;

    if (!deferredSearchTerm) return filteredByProfession;
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase();
    const filterUser = ({ profile, role, userType }: User) => {
      const searchableText = [
        profile.lastName,
        profile.firstName,
        profile.dni,
        profile.phone,
        profile.job?.label,
        profile.description,
        role?.name,
        userType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    };

    return filteredByProfession.filter(filterUser);
  }, [
    deferredSearchTerm,
    isArchived,
    payrollFilter,
    professionFilter,
    roleFilter,
    users,
  ]);

  const addUser = () => {
    if (!roles) return;
    isOpenCardRegisterUser$.setSubject = { isOpen: true, roles };
  };

  const printReport = (value: number) => {
    setPrintReportId(value);
    isOpenCardGenerateReport$.setSubject = true;
  };
  const handleOpenCardFiles = () => {
    isOpenCardFiles$.setSubject = {
      isOpen: true,
      isAdmin: true,
    };
  };
  const handleOpenAddEquipment = (isOpen: boolean, data?: WorkStation) => {
    isOpenCardAddEquipment$.setSubject = {
      isOpen,
      data,
    };
  };
  const handleOpenAssing = (isOpen: boolean, id: number, data?: Equip) => {
    isOpenCardAssing$.setSubject = {
      isOpen,
      id,
      data,
    };
  };

  const clearFilters = () => {
    setSearchTerm('');
    setPayrollFilter('all');
    setRoleFilter(undefined);
    setProfessionFilter(undefined);
    setRowSelection({});
  };

  const editUser = useCallback(
    (user: User) => {
      if (!roles) return;
      const dialogHandle = openDialog({
        title: 'Editar usuario',
        width: 'min(100%, 112rem)',
        maxHeight: 'min(92vh, 72rem)',
        children: (
          <UserEditWorkspace
            user={user}
            roles={roles}
            generalFiles={generalFiles}
            onUsersRefresh={getUsers}
          />
        ),
      });

      if (!dialogHandle) {
        SnackbarUtilities.warning(
          'Cierre la ventana actual antes de editar otro usuario.'
        );
      }
    },
    [generalFiles, getUsers, roles]
  );

  const handleChangeStatus = useCallback(
    async (user: User) => {
      const nextStatus = !user.status;
      setUpdatingStatusId(user.id);
      try {
        await axiosInstance.patch(`users/${user.id}`, {
          status: nextStatus,
          id: user.id,
        });
        await axiosInstance.patch(`/attendanceGroup/disabled/${user.id}`, {
          status: nextStatus,
        });
        await refreshUsers();
        SnackbarUtilities.info(
          `Usuario ${user.profile.firstName} ${user.profile.lastName} ${
            user.status ? 'archivado' : 'activado'
          }`
        );
      } finally {
        setUpdatingStatusId(null);
      }
    },
    [refreshUsers]
  );

  const columns = useMemo<ColumnDef<User>[]>(
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
            aria-label="Seleccionar usuario"
          />
        ),
      },
      {
        id: 'user',
        accessorFn: user => `${user.profile.dni} ${getUserName(user)}`,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Usuario" />
        ),
        cell: ({ row }) => (
          <div className="user-cell">
            <figure className="user-profile-figure">
              <img
                src={getIconDefault(row.original.profile.dni)}
                alt={row.original.email}
              />
            </figure>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-primary">
                {row.original.profile.dni}
              </p>
              <p className="truncate text-sm font-bold text-secondary">
                {getUserName(row.original)}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {row.original.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'role',
        accessorFn: user => user.role?.name || 'Sin rol',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Rol de trabajo" />
        ),
        cell: ({ row }) => (
          <span className="font-semibold text-secondary">
            {row.original.role?.name || 'Sin rol'}
          </span>
        ),
      },
      {
        id: 'profession',
        accessorFn: user => user.profile.job?.label || 'Sin profesion',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Profesion" />
        ),
        cell: ({ row }) => (
          <span className="font-semibold">
            {row.original.profile.job?.label || 'Sin profesion'}
          </span>
        ),
      },
      {
        id: 'phone',
        accessorFn: user => user.profile.phone || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Celular" />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-semibold">
            {row.original.profile.phone || 'N/D'}
          </span>
        ),
      },
      {
        id: 'payroll',
        accessorFn: user => PAYROLL_STATE_TEXT[getPayrollState(user)],
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Planilla" />
        ),
        cell: ({ row }) => {
          const payrollState = getPayrollState(row.original);
          return (
            <span className={`payroll-status-chip is-${payrollState}`}>
              {PAYROLL_STATE_TEXT[payrollState]}
            </span>
          );
        },
      },
      {
        id: 'status',
        accessorFn: user => (user.status ? 'Activo' : 'Archivado'),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Estado" />
        ),
        cell: ({ row }) => {
          const isOwnUser = row.original.id === userSessionId;
          const isUpdating = updatingStatusId === row.original.id;
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="status-toggle-button"
                  disabled={isOwnUser || isUpdating}
                  onClick={() => handleChangeStatus(row.original)}
                  aria-label={
                    row.original.status ? 'Archivar usuario' : 'Activar usuario'
                  }
                >
                  {isUpdating ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <span
                      className="switch-status"
                      data-ison={Boolean(row.original.status)}
                    >
                      <span className="handle-statuts" />
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {isOwnUser
                  ? 'No puedes cambiar tu propio estado'
                  : row.original.status
                  ? 'Activo'
                  : 'Archivado'}
              </TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        id: 'edit',
        enableSorting: false,
        header: () => <span>Editar</span>,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!roles}
            onClick={() => editUser(row.original)}
            aria-label="Editar usuario y documentos"
          >
            <Settings2 className="size-4 text-primary" />
          </Button>
        ),
      },
      {
        id: 'reports',
        enableSorting: false,
        header: () => <span>Reportes</span>,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => printReport(row.original.id)}
            aria-label="Generar reporte"
          >
            <Printer className="size-4 text-primary" />
          </Button>
        ),
      },
    ],
    [
      editUser,
      handleChangeStatus,
      roles,
      updatingStatusId,
      userSessionId,
    ]
  );

  const table = useReactTable({
    data: filterList,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  useEffect(() => {
    table.setPageIndex(0);
  }, [
    deferredSearchTerm,
    isArchived,
    payrollFilter,
    professionFilter,
    roleFilter,
    table,
  ]);

  const hasActiveFilters = Boolean(
    searchTerm ||
      payrollFilter !== 'all' ||
      roleFilter?.length ||
      professionFilter?.length
  );
  const selectedCount = Object.keys(rowSelection).length;
  const isLoading = isLoadingUsers || !users || !roles;
  const pageRows = table.getRowModel().rows;

  return (
    <div className="content-list">
      <div className="user-list">
        <Card className="userList-card">
          <CardHeader className="userList-card-header">
            <div className="userList-heading">
              <div>
                <CardTitle>Usuarios internos</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {filterList.length} usuarios internos en esta vista
                  {selectedCount > 0 && ` / ${selectedCount} seleccionados`}
                </p>
              </div>
              <Badge
                variant={isArchived ? 'success' : 'secondary'}
                className="userList-status-badge"
              >
                {isArchived ? 'Activos' : 'Archivados'}
              </Badge>
            </div>

            <div className="userList-toolbar">
              <div className="userList-filters">
                <Input
                  type="text"
                  placeholder="Buscar por DNI, nombre, rol o celular..."
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  className="h-9 w-full sm:w-80"
                />
                <DataTableFacetedFilter
                  title="Rol"
                  values={roleFilter}
                  options={roleOptions}
                  searchable
                  onChange={setRoleFilter}
                />
                <DataTableFacetedFilter
                  title="Profesion"
                  values={professionFilter}
                  options={professionOptions}
                  searchable
                  onChange={setProfessionFilter}
                />
                <DataTableFacetedFilter
                  title="Planilla"
                  values={payrollFilter === 'all' ? undefined : [payrollFilter]}
                  options={PAYROLL_FILTERS.filter(
                    option => option.value !== 'all'
                  ).map(option => ({
                    label: option.label,
                    value: option.value,
                  }))}
                  onChange={values =>
                    setPayrollFilter((values?.[0] as PayrollFilter) || 'all')
                  }
                />
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    onClick={clearFilters}
                  >
                    Limpiar
                  </Button>
                )}
              </div>

              <div className="userList-actions">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2"
                  onClick={() => {
                    setIsArchived(!isArchived);
                    setRowSelection({});
                  }}
                >
                  <Archive className="size-4" />
                  {isArchived ? 'Ver archivados' : 'Ver activos'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2"
                  onClick={handleOpenCardFiles}
                >
                  <FileText className="size-4" />
                  Ver Directivas
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2"
                  onClick={addUser}
                  disabled={!roles}
                >
                  <Plus className="size-4" />
                  Agregar
                </Button>
                <DataTableViewOptions
                  table={table}
                  columnLabels={COLUMN_LABELS}
                  contentClassName="w-48"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="userList-card-content">
            <TooltipProvider>
              <div className="userList-table-frame">
                <Table
                  containerClassName="h-full min-h-0"
                  className="min-w-[1120px]"
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
                      <DataTableLoadingRows table={table} rowCount={8} />
                    )}

                    {!isLoading &&
                      pageRows.map(row => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && 'selected'}
                          className="data-[state=selected]:bg-muted/70"
                        >
                          {row.getVisibleCells().map(cell => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}

                    {!isLoading && pageRows.length === 0 && (
                      <DataTableEmptyState
                        table={table}
                        className="userList-empty-state"
                      >
                        No hay usuarios que coincidan con los filtros actuales.
                      </DataTableEmptyState>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TooltipProvider>

            <div className="userList-pagination">
              <div className="userList-page-size">
                <Select
                  value={String(table.getState().pagination.pageSize)}
                  onValueChange={value => table.setPageSize(Number(value))}
                >
                  <SelectTrigger className="h-9 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map(option => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm font-medium text-foreground">
                  Filas por vista
                </span>
              </div>
              <div className="userList-page-actions">
                <span className="text-sm text-muted-foreground">
                  Pagina {table.getState().pagination.pageIndex + 1} de{' '}
                  {table.getPageCount() || 1}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.setPageIndex(0)}
                >
                  Primera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="user-list-equipment">
        <div className="ule-header">
          <h4>Equipos</h4>
          <LegacyButton
            text="Agregar Equipo"
            icon="plus"
            onClick={() => handleOpenAddEquipment(true)}
            variant="outline"
          />
        </div>
        {workStations &&
          workStations.map(workStation => (
            <Equipment
              data={workStation}
              openCard={handleOpenAssing}
              key={workStation.id}
              handleEdit={handleOpenAssing}
              handleEditWS={handleOpenAddEquipment}
              onSave={() => getWorkStations()}
            />
          ))}
      </div>
      <CardAddEquipment onSave={getWorkStations} />
      <CardAssign onSave={getWorkStations} />
      <CardGenerateReport employeeId={printReportId} />
      <CardRegisterUser onSave={getUsers} generalFiles={generalFiles} />
    </div>
  );
};

export default UsersList;

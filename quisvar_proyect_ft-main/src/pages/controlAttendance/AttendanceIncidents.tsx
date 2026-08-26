import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Coins,
  FileWarning,
  Link,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { ATTENDANCE_STATUS_FINE_AMOUNTS } from '@/models/attendanceStatus';
import { AppBadge } from '@/components/app-ui/app-badge';
import { AppButton } from '@/components/app-ui/app-button';
import { AppInput } from '@/components/app-ui/app-input';
import { AppPageShell } from '@/components/app-ui/app-page-shell';
import { AppSelect } from '@/components/app-ui/app-select';
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTableRow,
} from '@/components/app-ui/app-table';
import type { RootState } from '@/store/store.types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { attendanceControlService } from './services';
import useAttendanceControlUsers from './hooks/useAttendanceControlUsers';
import type {
  AttendanceControlUserLookup,
  AttendanceIncident,
  AttendanceIncidentStatus,
} from './types';

type DateRange = {
  dateFrom: string;
  dateTo: string;
};

const statusVariant: Record<
  AttendanceIncidentStatus,
  | 'default'
  | 'secondary'
  | 'outline'
  | 'success'
  | 'warning'
  | 'info'
  | 'danger'
  | 'review'
> = {
  PUNTUAL: 'success',
  TARDE: 'warning',
  SIMPLE: 'review',
  GRAVE: 'danger',
  MUY_GRAVE: 'danger',
  PERMISO: 'info',
  SALIDA: 'secondary',
};

const incidentCosts = ATTENDANCE_STATUS_FINE_AMOUNTS;

const statusOrder: AttendanceIncidentStatus[] = [
  'SIMPLE',
  'PUNTUAL',
  'TARDE',
  'GRAVE',
  'MUY_GRAVE',
  'PERMISO',
  'SALIDA',
];

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const presetRange = (preset: 'week' | 'month'): DateRange => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (preset === 'week' ? 6 : 30));
  return {
    dateFrom: formatDateInput(start),
    dateTo: formatDateInput(end),
  };
};

const formatDateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(value))
    : '-';

const formatDateParts = (value?: string) => {
  if (!value) return { date: '-', time: '-' };
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat('es-PE', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat('es-PE', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date),
  };
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const fullName = (
  user?: {
    profile?: { firstName?: string; lastName?: string };
  } | null
) => {
  const profile = user?.profile;
  return `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
};

const incidentKey = (incident: AttendanceIncident) =>
  `${incident.usersId}:${incident.listId}`;

const EMPTY_ATTENDANCE_CONTROL_USERS: AttendanceControlUserLookup[] = [];

const initials = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase() || '--';

const AttendanceIncidents = () => {
  const userSession = useSelector((state: RootState) => state.userSession);
  const canViewAll = useMemo(() => {
    return userSession.role?.menuPoints.some(
      menuPoint =>
        menuPoint.route === 'control-asistencia' &&
        menuPoint.menu?.some(
          subMenu =>
            subMenu.route === 'incidencias' && subMenu.typeRol === 'MOD'
        )
    );
  }, [userSession.role]);
  const attendanceControlUsersQuery = useAttendanceControlUsers({
    enabled: Boolean(canViewAll),
  });
  const users =
    attendanceControlUsersQuery.data ?? EMPTY_ATTENDANCE_CONTROL_USERS;

  const activeUsers = useMemo(
    () =>
      users
        .filter(user => user.status)
        .sort((a, b) => fullName(a).localeCompare(fullName(b))),
    [users]
  );
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [range, setRange] = useState<DateRange>(() => presetRange('week'));
  const [incidents, setIncidents] = useState<AttendanceIncident[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const filteredUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return activeUsers.slice(0, 30);
    return activeUsers
      .filter(user => {
        const profile = user.profile;
        const text = [
          profile?.firstName,
          profile?.lastName,
          profile?.dni,
          user.email,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return text.includes(normalized);
      })
      .slice(0, 30);
  }, [activeUsers, search]);

  const originalSummary = useMemo(
    () =>
      incidents.reduce<Record<AttendanceIncidentStatus, number>>(
        (acc, incident) => {
          acc[incident.originalStatus] =
            (acc[incident.originalStatus] ?? 0) + 1;
          return acc;
        },
        {} as Record<AttendanceIncidentStatus, number>
      ),
    [incidents]
  );

  const effectiveSummary = useMemo(
    () =>
      incidents.reduce<Record<AttendanceIncidentStatus, number>>(
        (acc, incident) => {
          acc[incident.effectiveStatus] =
            (acc[incident.effectiveStatus] ?? 0) + 1;
          return acc;
        },
        {} as Record<AttendanceIncidentStatus, number>
      ),
    [incidents]
  );

  const reconciledCount = incidents.filter(
    incident => incident.originalStatus !== incident.effectiveStatus
  ).length;
  const estimatedFine = useMemo(
    () =>
      incidents.reduce(
        (total, incident) => total + incidentCosts[incident.effectiveStatus],
        0
      ),
    [incidents]
  );

  const summaryEntries = (summary: Record<AttendanceIncidentStatus, number>) =>
    statusOrder
      .map(status => ({ status, count: summary[status] ?? 0 }))
      .filter(item => item.count > 0);

  const loadData = async () => {
    if (!range.dateFrom || !range.dateTo) {
      SnackbarUtilities.warning('Seleccione un periodo');
      return;
    }
    setIsLoading(true);
    try {
      const data = await attendanceControlService.getIncidents({
        userId: canViewAll && selectedUserId ? +selectedUserId : undefined,
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
      });
      setIncidents(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, range.dateFrom, range.dateTo, canViewAll]);

  const handleRangeInput = ({ target }: ChangeEvent<HTMLInputElement>) => {
    setRange(prev => ({ ...prev, [target.name]: target.value }));
  };

  return (
    <AppPageShell className="px-5 py-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-2 border-b border-border pb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4" />
            <span>
              {canViewAll
                ? 'Consulta de incidencias del personal activo'
                : 'Consulta de tus incidencias personales'}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Incidencias
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Revisa tardanzas y faltas por periodo con estado original y estado
            efectivo después de reconciliaciones activas.
          </p>
        </header>

        <section className="grid gap-4 rounded-md border border-border bg-background p-4 shadow-app-panel lg:grid-cols-[1.2fr_1fr]">
          {canViewAll ? (
            <div className="grid gap-3">
              <AppInput
                label="Buscar usuario"
                placeholder="Nombre, DNI o email"
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
              <AppSelect
                label="Usuario activo"
                value={selectedUserId}
                data={filteredUsers}
                extractValue={user => user.id}
                renderTextField={user =>
                  `${fullName(user)}${
                    user.profile?.dni ? ` - ${user.profile.dni}` : ''
                  }`
                }
                onChange={event => setSelectedUserId(event.target.value)}
                placeholder="Todo el personal activo"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-md border border-border bg-muted/50 px-4 py-3">
              <UserRound className="size-5 text-primary" />
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {fullName(userSession) || userSession.email}
                </div>
                <div className="text-xs text-muted-foreground">
                  Solo se muestran tus incidencias.
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <AppButton
                type="button"
                variant="outline"
                onClick={() => setRange(presetRange('week'))}
              >
                Última semana
              </AppButton>
              <AppButton
                type="button"
                variant="outline"
                onClick={() => setRange(presetRange('month'))}
              >
                Último mes
              </AppButton>
              <AppButton type="button" variant="ghost" onClick={loadData}>
                <Search className="size-4" />
                Buscar
              </AppButton>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AppInput
                label="Desde"
                type="date"
                name="dateFrom"
                value={range.dateFrom}
                onChange={handleRangeInput}
              />
              <AppInput
                label="Hasta"
                type="date"
                name="dateTo"
                value={range.dateTo}
                onChange={handleRangeInput}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border border-border bg-background p-5 shadow-app-card">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <FileWarning className="size-4" />
              Incidencias
            </div>
            <div className="mt-2 text-3xl font-bold text-foreground">
              {incidents.length}
            </div>
          </div>
          <div className="rounded-md border border-border bg-background p-5 shadow-app-card">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <CheckCircle2 className="size-4" />
              Reconciliadas
            </div>
            <div className="mt-2 text-3xl font-bold text-foreground">
              {reconciledCount}
            </div>
          </div>
          <div className="rounded-md border border-border bg-background p-5 shadow-app-card">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <CalendarDays className="size-4" />
              Periodo
            </div>
            <div className="mt-4 text-sm font-bold text-foreground">
              {range.dateFrom} al {range.dateTo}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-md border border-border bg-background p-5 shadow-app-card">
            <div className="absolute -right-5 -top-5 size-16 rounded-full bg-success-muted" />
            <div className="relative flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Coins className="size-4" />
              Total Multas Estimado
            </div>
            <div className="relative mt-2 flex items-end gap-1 text-3xl font-bold text-foreground">
              <span className="text-xl text-muted-foreground">S/</span>
              {formatMoney(estimatedFine)}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="flex min-h-14 items-center justify-between gap-3 rounded-md border border-border bg-background px-5 py-3 shadow-app-card">
            <h2 className="text-base font-semibold text-foreground">
              Estado Original
            </h2>
            <div className="flex flex-wrap justify-end gap-2">
              {summaryEntries(originalSummary).map(({ status, count }) => (
                <AppBadge
                  key={status}
                  variant={statusVariant[status]}
                  className="px-3 py-1"
                >
                  {status}: {count}
                </AppBadge>
              ))}
              {!incidents.length && (
                <span className="text-sm text-muted-foreground">
                  Sin incidencias en el periodo
                </span>
              )}
            </div>
          </div>
          <div className="flex min-h-14 items-center justify-between gap-3 rounded-md border border-border bg-background px-5 py-3 shadow-app-card">
            <h2 className="text-base font-semibold text-foreground">
              Estado Efectivo
            </h2>
            <div className="flex flex-wrap justify-end gap-2">
              {summaryEntries(effectiveSummary).map(({ status, count }) => (
                <AppBadge
                  key={status}
                  variant={statusVariant[status]}
                  className="px-3 py-1"
                >
                  {status}: {count}
                </AppBadge>
              ))}
              {!incidents.length && (
                <span className="text-sm text-muted-foreground">
                  Sin incidencias en el periodo
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-md border border-border bg-background shadow-app-card">
          <div className="flex items-center justify-between gap-3 px-5 py-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Detalle de incidencias
              </h2>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? 'Cargando registros...'
                  : `${incidents.length} registro(s) encontrados`}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <AppTable className="min-w-[980px]">
              <AppTableHeader>
                <AppTableRow className="bg-muted/60">
                  <AppTableHead className="h-11 px-5 font-bold text-muted-foreground">
                    Fecha
                  </AppTableHead>
                  {canViewAll && (
                    <AppTableHead className="h-11 px-5 font-bold text-muted-foreground">
                      Usuario
                    </AppTableHead>
                  )}
                  <AppTableHead className="h-11 px-5 font-bold text-muted-foreground">
                    Lista
                  </AppTableHead>
                  <AppTableHead className="h-11 px-5 font-bold text-muted-foreground">
                    Original
                  </AppTableHead>
                  <AppTableHead className="h-11 px-5 font-bold text-muted-foreground">
                    Efectivo
                  </AppTableHead>
                  <AppTableHead className="h-11 px-5 font-bold text-muted-foreground">
                    Reconciliación
                  </AppTableHead>
                </AppTableRow>
              </AppTableHeader>
              <AppTableBody>
                {incidents.map(incident => {
                  const dateParts = formatDateParts(incident.assignedAt);
                  const reconciled =
                    incident.originalStatus !== incident.effectiveStatus;
                  const reconcilerName = fullName(
                    incident.reconciliation?.createdBy
                  );
                  return (
                    <AppTableRow
                      key={incidentKey(incident)}
                      className="border-border even:bg-muted/35 hover:bg-muted/50"
                    >
                      <AppTableCell className="px-5 py-4 align-top">
                        <div className="font-medium text-foreground">
                          {dateParts.date}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {dateParts.time}
                        </div>
                      </AppTableCell>
                      {canViewAll && (
                        <AppTableCell className="px-5 py-4 align-top">
                          <div className="max-w-56 font-bold leading-5 text-foreground">
                            {fullName(incident.user)}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {incident.user.profile?.dni ?? incident.user.email}
                          </div>
                        </AppTableCell>
                      )}
                      <AppTableCell className="px-5 py-4 align-top">
                        <div className="font-medium text-foreground">
                          {incident.list.title ?? 'Lista de asistencia'}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {incident.list.timer ?? '-'}
                        </div>
                      </AppTableCell>
                      <AppTableCell className="px-5 py-4 align-top">
                        <AppBadge
                          variant={statusVariant[incident.originalStatus]}
                          className={
                            reconciled ? 'line-through opacity-70' : undefined
                          }
                        >
                          {incident.originalStatus}
                        </AppBadge>
                      </AppTableCell>
                      <AppTableCell className="px-5 py-4 align-top">
                        <AppBadge
                          variant={statusVariant[incident.effectiveStatus]}
                        >
                          {incident.effectiveStatus}
                        </AppBadge>
                      </AppTableCell>
                      <AppTableCell className="px-5 py-4 align-top">
                        {incident.reconciliation ? (
                          <div className="flex min-w-64 items-start gap-3">
                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                              {initials(reconcilerName)}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-foreground">
                                {incident.reconciliation.reason}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                Por: {reconcilerName || 'usuario no disponible'}
                              </div>
                              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <Link className="size-3" />
                                {formatDateTime(
                                  incident.reconciliation.createdAt
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm italic text-muted-foreground">
                            Sin reconciliación
                          </span>
                        )}
                      </AppTableCell>
                    </AppTableRow>
                  );
                })}
                {!incidents.length && (
                  <AppTableRow>
                    <AppTableCell
                      colSpan={canViewAll ? 6 : 5}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No hay incidencias en el periodo seleccionado.
                    </AppTableCell>
                  </AppTableRow>
                )}
              </AppTableBody>
            </AppTable>
          </div>
        </section>
      </div>
    </AppPageShell>
  );
};

export default AttendanceIncidents;

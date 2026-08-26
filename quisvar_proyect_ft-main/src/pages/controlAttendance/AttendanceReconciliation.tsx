import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react';
import {
  FileSpreadsheet,
  Info,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import {
  ATTENDANCE_RECONCILABLE_STATUSES,
  ATTENDANCE_REPORT_STATUS_COLUMNS,
  ATTENDANCE_STATUS_FINE_AMOUNTS,
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_SHORT_LABELS,
} from '@/models/attendanceStatus';
import { AppBadge } from '@/components/app-ui/app-badge';
import { AppButton } from '@/components/app-ui/app-button';
import { AppInput } from '@/components/app-ui/app-input';
import { AppPageShell } from '@/components/app-ui/app-page-shell';
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTableRow,
} from '@/components/app-ui/app-table';
import AdvancedSelect from '@/components/select/AdvancedSelect';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { exportExcel } from '@/utils/excelGenerate/utils/excelTools';
import { attendanceControlService } from './services';
import useAttendanceControlUsers from './hooks/useAttendanceControlUsers';
import type {
  AttendanceControlUserLookup,
  AttendanceFineReportIncident,
  AttendanceFineReportResponse,
  AttendanceFineReportRow,
  AttendanceIncidentStatus,
} from './types';

type DateRange = {
  dateFrom: string;
  dateTo: string;
};

type AttendanceReconciliationProps = {
  initialRange?: DateRange;
  lockRange?: boolean;
  initialUserId?: number;
  lockUser?: boolean;
  embedded?: boolean;
  onSaved?: () => void;
  headerContext?: {
    eyebrow: string;
    title?: string;
    description?: string;
    periodLabel?: string;
    deadlineLabel?: string;
    responsibleLabel?: string;
  };
};

type NameableUser = {
  id?: number;
  email?: string | null;
  status?: boolean;
  profile?: {
    firstName?: string | null;
    lastName?: string | null;
    dni?: string | null;
    phone?: string | null;
  } | null;
};

type UserLookupOption = {
  value: string;
  label: string;
  user: NameableUser & { id: number };
};

const EMPTY_ATTENDANCE_CONTROL_USERS: AttendanceControlUserLookup[] = [];

type DraftAdjustment = {
  amount: string;
  reason: string;
};

type QuickFilter =
  | 'all'
  | 'withAmount'
  | 'withoutAmount'
  | 'withAdjustment'
  | 'faultsOnly'
  | 'lateOnly';

const statusLabels = ATTENDANCE_STATUS_LABELS;

const statusAbbreviations = ATTENDANCE_STATUS_SHORT_LABELS;

const statusColumns = ATTENDANCE_REPORT_STATUS_COLUMNS;

const statusVariant: Record<
  AttendanceIncidentStatus,
  'success' | 'warning' | 'review' | 'danger' | 'info' | 'secondary'
> = {
  PUNTUAL: 'success',
  TARDE: 'warning',
  SIMPLE: 'review',
  GRAVE: 'danger',
  MUY_GRAVE: 'danger',
  PERMISO: 'info',
  SALIDA: 'secondary',
};

const fineBaseAmount = ATTENDANCE_STATUS_FINE_AMOUNTS;

const quickFilters: { value: QuickFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'withAmount', label: 'Con monto' },
  { value: 'withoutAmount', label: 'Sin monto' },
  { value: 'withAdjustment', label: 'Con ajuste' },
  { value: 'faultsOnly', label: 'Solo faltas' },
  { value: 'lateOnly', label: 'Solo tardanzas' },
];

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const formatDateTimeWithWeekday = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('es-PE', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(value))
    : '-';

const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(value);

const formatRange = ({ dateFrom, dateTo }: DateRange) => {
  const format = (value: string) =>
    new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${value}T12:00:00`));
  return `${format(dateFrom)} - ${format(dateTo)}`;
};

const fullName = (user?: NameableUser | null) => {
  const profile = user?.profile;
  return (
    `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() ||
    user?.email ||
    'Sin usuario'
  );
};

const presetRange = (preset: 'week' | 'month'): DateRange => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (preset === 'week' ? 6 : 30));
  return {
    dateFrom: formatDateInput(start),
    dateTo: formatDateInput(end),
  };
};

const filenameSafe = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '');

const itemKey = (
  item: Pick<AttendanceFineReportIncident, 'usersId' | 'listId'>
) => `${item.usersId}:${item.listId}`;

const parseAmount = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const isAmountGreaterThanBase = (amount: number, base: number) =>
  amount > base + 0.001;

const Hint = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        className="inline-flex size-5 items-center justify-center rounded-full text-info hover:bg-info/10"
        aria-label={text}
      >
        <Info className="size-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent>{text}</TooltipContent>
  </Tooltip>
);

const amountTone = (row: AttendanceFineReportRow) => {
  if (row.finalAmount <= 0) return 'text-success';
  if (row.hasAdjustment) return 'text-warning';
  return 'text-danger';
};

const rowConciliationState = (row: AttendanceFineReportRow) => {
  if (row.hasAdjustment) {
    return {
      label: row.finalAmount > 0 ? 'Ajustado' : 'Conciliado',
      variant: 'info' as const,
    };
  }
  if (row.finalAmount > 0) {
    return {
      label: 'Penalizable',
      variant: 'danger' as const,
    };
  }
  return {
    label: 'Sin observación',
    variant: 'success' as const,
  };
};

const hasFaults = (row: AttendanceFineReportRow) =>
  (row.counts.SIMPLE ?? 0) +
    (row.counts.GRAVE ?? 0) +
    (row.counts.MUY_GRAVE ?? 0) >
  0;

const matchesQuickFilter = (
  row: AttendanceFineReportRow,
  filter: QuickFilter
) => {
  switch (filter) {
    case 'withAmount':
      return row.finalAmount > 0;
    case 'withoutAmount':
      return row.finalAmount <= 0;
    case 'withAdjustment':
      return row.hasAdjustment;
    case 'faultsOnly':
      return hasFaults(row);
    case 'lateOnly':
      return (row.counts.TARDE ?? 0) > 0;
    default:
      return true;
  }
};

const AttendanceReconciliation = ({
  initialRange,
  lockRange = false,
  initialUserId,
  lockUser = false,
  embedded = false,
  onSaved,
  headerContext,
}: AttendanceReconciliationProps) => {
  const attendanceControlUsersQuery = useAttendanceControlUsers({
    enabled: !embedded,
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

  const [range, setRange] = useState<DateRange>(
    () => initialRange ?? presetRange('week')
  );
  const [selectedUserId, setSelectedUserId] = useState(
    initialUserId ? String(initialUserId) : ''
  );
  const [search, setSearch] = useState('');
  const [sortAmount, setSortAmount] = useState<'normal' | 'asc' | 'desc'>(
    'normal'
  );
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [expandedUserId, setExpandedUserId] = useState('');
  const [report, setReport] = useState<AttendanceFineReportResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [totalDrafts, setTotalDrafts] = useState<
    Record<number, DraftAdjustment>
  >({});
  const [itemDrafts, setItemDrafts] = useState<
    Record<number, Record<string, DraftAdjustment>>
  >({});

  const userOptions = useMemo<UserLookupOption[]>(
    () =>
      activeUsers.map(user => ({
        value: String(user.id),
        label: `${fullName(user)}${
          user.profile?.dni ? ` - ${user.profile.dni}` : ''
        }`,
        user,
      })),
    [activeUsers]
  );

  const selectedUserOption =
    userOptions.find(option => option.value === selectedUserId) ?? null;

  const loadReport = async (
    overrides?: Partial<{
      range: DateRange;
      selectedUserId: string;
      search: string;
      sortAmount: 'normal' | 'asc' | 'desc';
    }>
  ) => {
    const activeRange = overrides?.range ?? range;
    const activeUserId = overrides?.selectedUserId ?? selectedUserId;
    const activeSearch = overrides?.search ?? search;
    const activeSort = overrides?.sortAmount ?? sortAmount;

    if (!activeRange.dateFrom || !activeRange.dateTo) {
      SnackbarUtilities.warning('Seleccione un periodo');
      return;
    }
    setIsLoading(true);
    try {
      const data = await attendanceControlService.getFineReport({
        dateFrom: activeRange.dateFrom,
        dateTo: activeRange.dateTo,
        userId: activeUserId ? +activeUserId : undefined,
        search: activeSearch.trim() || undefined,
        sortAmount: activeSort,
      });
      setReport(data);
      setExpandedUserId(prev =>
        prev && data.rows.some(row => row.user.id === +prev) ? prev : ''
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialRange) setRange(initialRange);
  }, [initialRange]);

  useEffect(() => {
    if (initialUserId) setSelectedUserId(String(initialUserId));
  }, [initialUserId]);

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.dateFrom, range.dateTo, sortAmount]);

  const handleRangeInput = ({ target }: ChangeEvent<HTMLInputElement>) => {
    setRange(prev => ({ ...prev, [target.name]: target.value }));
  };

  const handleUserLookupChange = (option: UserLookupOption | null) => {
    setSelectedUserId(option?.value ?? '');
    setExpandedUserId('');
  };

  const rows = report?.rows ?? [];
  const displayedRows = useMemo(
    () => rows.filter(row => matchesQuickFilter(row, quickFilter)),
    [quickFilter, rows]
  );
  const visibleSummary = useMemo(() => {
    const counts = statusColumns.reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<AttendanceIncidentStatus, number>);

    let calculatedAmount = 0;
    let finalAmount = 0;
    let adjustedAmount = 0;
    let totalRecords = 0;
    let adjustedUsers = 0;

    displayedRows.forEach(row => {
      statusColumns.forEach(status => {
        counts[status] += row.counts[status] ?? 0;
      });
      calculatedAmount += row.calculatedAmount;
      finalAmount += row.finalAmount;
      adjustedAmount += row.adjustedAmount;
      totalRecords += row.totalRecords;
      if (row.hasAdjustment) adjustedUsers += 1;
    });

    return {
      counts,
      calculatedAmount,
      finalAmount,
      adjustedAmount,
      totalRecords,
      adjustedUsers,
      usersCount: displayedRows.length,
    };
  }, [displayedRows]);

  const reportState = useMemo(() => {
    if (!displayedRows.length) return 'Sin datos';
    if (displayedRows.every(row => row.finalAmount <= 0 || row.hasAdjustment)) {
      return 'Conciliado';
    }
    if (displayedRows.some(row => row.hasAdjustment)) return 'En revisión';
    return 'Pendiente de revisión';
  }, [displayedRows]);

  const setTotalDraft = (
    userId: number,
    field: keyof DraftAdjustment,
    value: string
  ) => {
    setTotalDrafts(prev => ({
      ...prev,
      [userId]: {
        amount: prev[userId]?.amount ?? '',
        reason: prev[userId]?.reason ?? '',
        [field]: value,
      },
    }));
  };

  const setItemDraft = (
    userId: number,
    key: string,
    field: keyof DraftAdjustment,
    value: string
  ) => {
    setItemDrafts(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] ?? {}),
        [key]: {
          amount: prev[userId]?.[key]?.amount ?? '',
          reason: prev[userId]?.[key]?.reason ?? '',
          [field]: value,
        },
      },
    }));
  };

  const confirmAdjustments = async (row: AttendanceFineReportRow) => {
    const totalDraft = totalDrafts[row.user.id];
    const itemDraft = itemDrafts[row.user.id] ?? {};
    const totalAmount = totalDraft ? parseAmount(totalDraft.amount) : null;
    const hasTotalDraft =
      totalDraft?.amount.trim() || totalDraft?.reason.trim();
    const items: {
      usersId: number;
      listId: number;
      adjustedAmount: number;
      reason: string;
    }[] = [];

    for (const incident of row.incidents) {
      const draft = itemDraft[itemKey(incident)];
      if (!draft?.amount.trim() && !draft?.reason.trim()) continue;
      const adjustedAmount = parseAmount(draft.amount);
      if (adjustedAmount === null) {
        return SnackbarUtilities.warning(
          'Ingrese montos válidos en el detalle'
        );
      }
      if (isAmountGreaterThanBase(adjustedAmount, incident.calculatedAmount)) {
        return SnackbarUtilities.warning(
          `El ajuste de una incidencia no puede superar ${formatMoney(
            incident.calculatedAmount
          )}`
        );
      }
      if (!draft.reason.trim()) {
        return SnackbarUtilities.warning(
          'Ingrese el motivo de cada ajuste de detalle'
        );
      }
      items.push({
        usersId: incident.usersId,
        listId: incident.listId,
        adjustedAmount,
        reason: draft.reason.trim(),
      });
    }

    if (hasTotalDraft) {
      if (totalAmount === null) {
        return SnackbarUtilities.warning('Ingrese un monto total válido');
      }
      if (isAmountGreaterThanBase(totalAmount, row.calculatedAmount)) {
        return SnackbarUtilities.warning(
          `El ajuste total no puede superar ${formatMoney(
            row.calculatedAmount
          )}`
        );
      }
      if (!totalDraft?.reason.trim()) {
        return SnackbarUtilities.warning('Ingrese el motivo del ajuste total');
      }
    }
    if (!hasTotalDraft && !items.length) {
      return SnackbarUtilities.warning('No hay cambios para confirmar');
    }

    setSavingUserId(row.user.id);
    try {
      await attendanceControlService.upsertPenaltyAdjustments({
        userId: row.user.id,
        periodStart: range.dateFrom,
        periodEnd: range.dateTo,
        total:
          hasTotalDraft && totalDraft
            ? {
                adjustedAmount: totalAmount!,
                reason: totalDraft.reason.trim(),
              }
            : undefined,
        items,
      });
      SnackbarUtilities.success('Ajuste confirmado');
      setTotalDrafts(prev => ({
        ...prev,
        [row.user.id]: { amount: '', reason: '' },
      }));
      setItemDrafts(prev => ({ ...prev, [row.user.id]: {} }));
      await loadReport();
      onSaved?.();
    } catch (error) {
      if (error instanceof Error) SnackbarUtilities.warning(error.message);
      else SnackbarUtilities.error('No se pudo confirmar el ajuste');
    } finally {
      setSavingUserId(null);
    }
  };

  const clearAdjustments = async (row: AttendanceFineReportRow) => {
    setSavingUserId(row.user.id);
    try {
      await attendanceControlService.voidPenaltyAdjustments({
        userId: row.user.id,
        periodStart: range.dateFrom,
        periodEnd: range.dateTo,
        reason: 'Ajuste limpiado desde reporte de asistencia',
      });
      SnackbarUtilities.success('Ajuste limpiado');
      await loadReport();
      onSaved?.();
    } finally {
      setSavingUserId(null);
    }
  };

  const discardDrafts = (userId: number) => {
    setTotalDrafts(prev => ({ ...prev, [userId]: { amount: '', reason: '' } }));
    setItemDrafts(prev => ({ ...prev, [userId]: {} }));
  };

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reporte asistencia');
    sheet.columns = [
      { header: 'Usuario', key: 'user', width: 34 },
      { header: 'DNI', key: 'dni', width: 14 },
      { header: 'Celular', key: 'phone', width: 14 },
      ...statusColumns.map(status => ({
        header: statusAbbreviations[status],
        key: status,
        width: 10,
      })),
      { header: 'Estado', key: 'state', width: 18 },
      { header: 'Monto penalizable', key: 'finalAmount', width: 18 },
      { header: 'Monto calculado', key: 'calculatedAmount', width: 18 },
      { header: 'Ajustado', key: 'hasAdjustment', width: 12 },
    ];
    sheet.addRows(
      displayedRows.map(row => ({
        user: fullName(row.user),
        dni: row.user.profile?.dni ?? '',
        phone: row.user.profile?.phone ?? '',
        ...statusColumns.reduce<Record<string, number>>((acc, status) => {
          acc[status] = row.counts[status] ?? 0;
          return acc;
        }, {}),
        state: rowConciliationState(row).label,
        finalAmount: row.finalAmount,
        calculatedAmount: row.calculatedAmount,
        hasAdjustment: row.hasAdjustment ? 'Si' : 'No',
      }))
    );
    sheet.getRow(1).font = { bold: true };
    await exportExcel(
      `reporte-asistencia-${filenameSafe(formatRange(range))}.xlsx`,
      workbook
    );
  };

  const handlePrintReport = () => {
    const reportWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!reportWindow) {
      SnackbarUtilities.warning('No se pudo abrir la ventana de impresión');
      return;
    }
    const htmlRows = displayedRows
      .map(
        (row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${fullName(row.user)}</td>
            <td>${row.user.profile?.dni ?? '-'}</td>
            <td>${statusColumns
              .map(status => row.counts[status] ?? 0)
              .join('</td><td>')}</td>
            <td>${rowConciliationState(row).label}</td>
            <td>${formatMoney(row.finalAmount)}</td>
          </tr>`
      )
      .join('');
    reportWindow.document.write(`
      <html>
        <head>
          <title>Reporte de asistencia</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #001b4d; }
            h1 { text-align: center; font-size: 18px; margin-bottom: 18px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #1f2937; padding: 5px; }
            th { background: #eef2f7; }
            td:last-child { color: #d40000; font-weight: 700; text-align: right; }
          </style>
        </head>
        <body>
          <h1>REPORTE DE ASISTENCIA - ${formatRange(range).toUpperCase()}</h1>
          <table>
            <thead>
              <tr>
                <th>N°</th><th>Apellidos y nombres</th><th>DNI</th>
                ${statusColumns
                  .map(
                    status =>
                      `<th title="${statusLabels[status]}">${statusAbbreviations[status]}</th>`
                  )
                  .join('')}
                <th>Estado</th>
                <th>Monto penalizable</th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
          </table>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  const renderDetail = (row: AttendanceFineReportRow) => {
    const totalDraft = totalDrafts[row.user.id] ?? { amount: '', reason: '' };
    const itemDraft = itemDrafts[row.user.id] ?? {};
    const previewAmount = parseAmount(totalDraft.amount);
    const hasDraft =
      Boolean(totalDraft.amount.trim() || totalDraft.reason.trim()) ||
      Object.values(itemDraft).some(
        draft => draft.amount.trim() || draft.reason.trim()
      );

    return (
      <div className="rounded-md border border-info/30 bg-info/5 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Todas las incidencias
            </h3>
            <p className="text-xs text-muted-foreground">
              Ajuste montos con sustento. El registro original se conserva para
              auditoría.
            </p>
          </div>
          <AppBadge variant="info">{row.incidents.length} registros</AppBadge>
        </div>

        <div className="mb-3 grid gap-2 lg:grid-cols-4">
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Monto calculado
            </p>
            <strong>{formatMoney(row.calculatedAmount)}</strong>
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Monto confirmado
            </p>
            <strong className={amountTone(row)}>
              {formatMoney(row.finalAmount)}
            </strong>
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Vista previa
            </p>
            <strong>{formatMoney(previewAmount ?? row.finalAmount)}</strong>
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Estado
            </p>
            <strong>
              {row.hasAdjustment ? 'Ajuste confirmado' : 'Sin ajuste'}
            </strong>
          </div>
        </div>

        <div className="mb-3 grid gap-2 rounded-md border border-info/20 bg-background p-3 lg:grid-cols-[180px_minmax(240px,1fr)_auto_auto_auto]">
          <AppInput
            label="Ajustar total"
            type="number"
            min="0"
            max={row.calculatedAmount}
            step="0.01"
            placeholder="S/. 0.00"
            value={totalDraft.amount}
            onChange={event =>
              setTotalDraft(row.user.id, 'amount', event.target.value)
            }
          />
          <AppInput
            label="Motivo"
            placeholder="Ej. sustento aprobado"
            value={totalDraft.reason}
            onChange={event =>
              setTotalDraft(row.user.id, 'reason', event.target.value)
            }
          />
          <AppButton
            type="button"
            variant="outline"
            disabled={!hasDraft || savingUserId === row.user.id}
            onClick={() => discardDrafts(row.user.id)}
          >
            Descartar cambios
          </AppButton>
          <AppButton
            type="button"
            disabled={!hasDraft || savingUserId === row.user.id}
            onClick={() => confirmAdjustments(row)}
          >
            Confirmar ajuste
          </AppButton>
          <AppButton
            type="button"
            variant="outline"
            disabled={!row.hasAdjustment || savingUserId === row.user.id}
            onClick={() => clearAdjustments(row)}
          >
            Limpiar
          </AppButton>
        </div>

        <div className="max-h-[430px] overflow-auto rounded-md border border-border bg-background">
          <AppTable>
            <AppTableHeader>
              <AppTableRow>
                <AppTableHead>Fecha salida</AppTableHead>
                <AppTableHead>Lista</AppTableHead>
                <AppTableHead>Resultado</AppTableHead>
                <AppTableHead>Monto calculado</AppTableHead>
                <AppTableHead>Conciliación</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {row.incidents.map(incident => {
                const key = itemKey(incident);
                const draft = itemDraft[key] ?? {
                  amount: '',
                  reason: '',
                };
                return (
                  <AppTableRow key={key}>
                    <AppTableCell className="min-w-[170px]">
                      {formatDateTimeWithWeekday(incident.assignedAt)}
                    </AppTableCell>
                    <AppTableCell className="min-w-[220px]">
                      {incident.list?.title ?? 'Lista de asistencia'}
                    </AppTableCell>
                    <AppTableCell>
                      <AppBadge
                        variant={statusVariant[incident.effectiveStatus]}
                      >
                        {statusLabels[incident.effectiveStatus]}
                      </AppBadge>
                    </AppTableCell>
                    <AppTableCell>
                      {formatMoney(incident.calculatedAmount)}
                    </AppTableCell>
                    <AppTableCell>
                      <div className="grid min-w-[420px] gap-2 sm:grid-cols-[120px_minmax(180px,1fr)]">
                        <input
                          type="number"
                          min="0"
                          max={incident.calculatedAmount}
                          step="0.01"
                          className="h-9 rounded-md border border-border px-3 text-sm font-medium"
                          placeholder={incident.adjustedAmount.toFixed(2)}
                          value={draft.amount}
                          onChange={event =>
                            setItemDraft(
                              row.user.id,
                              key,
                              'amount',
                              event.target.value
                            )
                          }
                        />
                        <input
                          className="h-9 rounded-md border border-border px-3 text-sm font-medium"
                          placeholder={
                            incident.adjustment?.reason ?? 'Motivo del ajuste'
                          }
                          value={draft.reason}
                          onChange={event =>
                            setItemDraft(
                              row.user.id,
                              key,
                              'reason',
                              event.target.value
                            )
                          }
                        />
                      </div>
                    </AppTableCell>
                  </AppTableRow>
                );
              })}
            </AppTableBody>
          </AppTable>
        </div>
      </div>
    );
  };

  if (embedded) {
    const embeddedRow = displayedRows[0];
    return (
      <TooltipProvider delayDuration={150}>
        <div className="w-full">
          {isLoading && (
            <div className="p-4 text-sm text-muted-foreground">
              Cargando faltas...
            </div>
          )}
          {!isLoading && embeddedRow && renderDetail(embeddedRow)}
          {!isLoading && !embeddedRow && (
            <div className="rounded-md border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
              No hay faltas con multa para este usuario en el periodo de la
              planilla.
            </div>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <AppPageShell>
      <TooltipProvider delayDuration={150}>
        <div
          className={`mx-auto flex w-full max-w-[1600px] flex-col gap-4 ${
            embedded ? 'p-0' : 'p-4'
          }`}
        >
          {!embedded && (
            <section className="flex flex-wrap items-center gap-3 text-muted-foreground">
              <ShieldCheck className="size-4" />
              <span>Acceso habilitado por rotación o rol autorizado</span>
            </section>
          )}

          {!embedded && (
            <section>
              <h1 className="text-2xl font-bold text-foreground">
                {headerContext?.title ?? 'Conciliación de faltas'}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {headerContext?.description ??
                  'Revise el periodo, visualice incidencias y consolide montos penalizables sin modificar el registro original.'}
              </p>
              {headerContext?.periodLabel && (
                <p className="mt-1 text-xs text-info">
                  {headerContext.periodLabel}
                </p>
              )}
            </section>
          )}

          <section className="grid gap-4 rounded-md border border-border bg-background p-4 shadow-app-panel">
            <AdvancedSelect
              label="Buscar usuario"
              placeholder="Buscar por nombre, DNI o email"
              options={userOptions}
              value={selectedUserOption}
              onChange={option =>
                handleUserLookupChange(option as UserLookupOption | null)
              }
              isClearable={!lockUser}
              isDisabled={lockUser}
              noOptionsMessage={() => 'Sin usuarios'}
            />
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_150px_auto]">
              <AppInput
                label="Desde"
                type="date"
                name="dateFrom"
                value={range.dateFrom}
                onChange={handleRangeInput}
                disabled={lockRange}
              />
              <AppInput
                label="Hasta"
                type="date"
                name="dateTo"
                value={range.dateTo}
                onChange={handleRangeInput}
                disabled={lockRange}
              />
              <label className="grid gap-1 text-sm font-semibold text-foreground">
                Ordenar monto
                <select
                  className="h-10 rounded-md border border-border bg-background px-3"
                  value={sortAmount}
                  onChange={event =>
                    setSortAmount(
                      event.target.value as 'normal' | 'asc' | 'desc'
                    )
                  }
                >
                  <option value="normal">Normal</option>
                  <option value="desc">Mayor a menor</option>
                  <option value="asc">Menor a mayor</option>
                </select>
              </label>
              <div className="flex items-end gap-2">
                <AppButton
                  type="button"
                  onClick={() => void loadReport()}
                  disabled={isLoading}
                >
                  <Search className="size-4" />
                  Aplicar
                </AppButton>
                <AppButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const resetRange = initialRange ?? presetRange('week');
                    setSearch('');
                    setSelectedUserId(
                      initialUserId ? String(initialUserId) : ''
                    );
                    setSortAmount('normal');
                    setQuickFilter('all');
                    setRange(resetRange);
                    loadReport({
                      range: resetRange,
                      selectedUserId: initialUserId
                        ? String(initialUserId)
                        : '',
                      search: '',
                      sortAmount: 'normal',
                    });
                  }}
                >
                  <RotateCcw className="size-4" />
                  Limpiar
                </AppButton>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickFilters.map(filter => (
                <button
                  key={filter.value}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    quickFilter === filter.value
                      ? 'border-info bg-info-muted text-info'
                      : 'border-border bg-background text-muted-foreground hover:border-info/40 hover:text-info'
                  }`}
                  onClick={() => setQuickFilter(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-md border border-border bg-background p-3 shadow-app-panel">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Periodo consultado
              </p>
              <strong className="text-sm text-foreground">
                {formatRange(range)}
              </strong>
            </div>
            <div className="rounded-md border border-border bg-background p-3 shadow-app-panel">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Usuarios evaluados
              </p>
              <strong className="text-xl text-primary">
                {visibleSummary.usersCount}
              </strong>
            </div>
            <div className="rounded-md border border-danger/30 bg-danger-muted/50 p-3 shadow-app-panel">
              <p className="text-xs font-semibold uppercase text-danger">
                Monto penalizable
              </p>
              <strong className="text-xl text-danger">
                {formatMoney(visibleSummary.finalAmount)}
              </strong>
            </div>
            <div className="rounded-md border border-info/30 bg-info-muted/50 p-3 shadow-app-panel">
              <p className="text-xs font-semibold uppercase text-info">
                Monto ajustado
              </p>
              <strong className="text-xl text-info">
                {formatMoney(visibleSummary.adjustedAmount)}
              </strong>
            </div>
            <div className="rounded-md border border-border bg-background p-3 shadow-app-panel">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Estado del periodo
              </p>
              <strong className="text-sm text-foreground">{reportState}</strong>
            </div>
          </section>

          <section className="grid gap-3 xl:grid-cols-5">
            {ATTENDANCE_RECONCILABLE_STATUSES.map(status => (
              <div
                key={status}
                className="rounded-md border border-border bg-background p-3 shadow-app-panel"
                title={statusLabels[status]}
              >
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {statusLabels[status]}
                </p>
                <strong className="text-2xl text-primary">
                  {visibleSummary.counts[status] ?? 0}
                </strong>
                <p className="text-xs text-muted-foreground">
                  Base {formatMoney(fineBaseAmount[status])} · Est.{' '}
                  {formatMoney(
                    (visibleSummary.counts[status] ?? 0) *
                      fineBaseAmount[status]
                  )}
                </p>
              </div>
            ))}
          </section>

          <section className="rounded-md border border-border bg-background shadow-app-panel">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Reporte de asistencia
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isLoading
                    ? 'Cargando reporte...'
                    : `${visibleSummary.totalRecords} registros · ${
                        visibleSummary.usersCount
                      } usuarios · ${formatRange(range)}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AppBadge variant="danger">
                  Monto penalizable: {formatMoney(visibleSummary.finalAmount)}
                </AppBadge>
                <AppBadge variant="info">
                  Ajustado: {formatMoney(visibleSummary.adjustedAmount)}
                </AppBadge>
                <AppButton
                  type="button"
                  variant="outline"
                  onClick={handleExportExcel}
                  disabled={!displayedRows.length}
                >
                  <FileSpreadsheet className="size-4" />
                  Excel
                </AppButton>
                <AppButton
                  type="button"
                  variant="outline"
                  onClick={handlePrintReport}
                  disabled={!displayedRows.length}
                >
                  <Printer className="size-4" />
                  PDF
                </AppButton>
              </div>
            </div>

            <div className="overflow-x-auto">
              <AppTable>
                <AppTableHeader>
                  <AppTableRow>
                    <AppTableHead>N°</AppTableHead>
                    <AppTableHead>Apellidos y nombres</AppTableHead>
                    <AppTableHead>DNI</AppTableHead>
                    <AppTableHead>Celular</AppTableHead>
                    {statusColumns.map(status => (
                      <AppTableHead key={status}>
                        <span className="inline-flex items-center gap-1">
                          {statusAbbreviations[status]}
                          <Hint text={statusLabels[status]} />
                        </span>
                      </AppTableHead>
                    ))}
                    <AppTableHead>Estado</AppTableHead>
                    <AppTableHead>Monto penalizable</AppTableHead>
                    <AppTableHead>Detalle</AppTableHead>
                  </AppTableRow>
                </AppTableHeader>
                <AppTableBody>
                  {displayedRows.map((row, index) => {
                    const isExpanded = row.user.id === +expandedUserId;
                    const conciliationState = rowConciliationState(row);
                    return (
                      <Fragment key={row.user.id}>
                        <AppTableRow className={isExpanded ? 'bg-info/5' : ''}>
                          <AppTableCell>{index + 1}</AppTableCell>
                          <AppTableCell>
                            <div className="font-semibold text-foreground">
                              {fullName(row.user)}
                            </div>
                          </AppTableCell>
                          <AppTableCell>
                            {row.user.profile?.dni ?? '-'}
                          </AppTableCell>
                          <AppTableCell>
                            {row.user.profile?.phone ?? '-'}
                          </AppTableCell>
                          {statusColumns.map(status => (
                            <AppTableCell
                              key={status}
                              className="text-center font-semibold"
                              title={statusLabels[status]}
                            >
                              {row.counts[status] ?? 0}
                            </AppTableCell>
                          ))}
                          <AppTableCell>
                            <AppBadge variant={conciliationState.variant}>
                              {conciliationState.label}
                            </AppBadge>
                          </AppTableCell>
                          <AppTableCell>
                            <span
                              className={`font-bold ${amountTone(row)}`}
                              title={
                                row.hasAdjustment
                                  ? `Monto conciliado. Calculado: ${formatMoney(
                                      row.calculatedAmount
                                    )}`
                                  : 'Monto calculado sin ajustes'
                              }
                            >
                              {formatMoney(row.finalAmount)}
                            </span>
                          </AppTableCell>
                          <AppTableCell>
                            <AppButton
                              type="button"
                              variant="outline"
                              onClick={() =>
                                setExpandedUserId(
                                  isExpanded ? '' : String(row.user.id)
                                )
                              }
                            >
                              {isExpanded ? 'Ocultar' : 'Revisar'}
                            </AppButton>
                          </AppTableCell>
                        </AppTableRow>
                        {isExpanded && (
                          <AppTableRow>
                            <AppTableCell colSpan={14} className="p-3">
                              {renderDetail(row)}
                            </AppTableCell>
                          </AppTableRow>
                        )}
                      </Fragment>
                    );
                  })}
                  {!displayedRows.length && (
                    <AppTableRow>
                      <AppTableCell
                        colSpan={14}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No hay penalizaciones registradas para el periodo
                        seleccionado.
                      </AppTableCell>
                    </AppTableRow>
                  )}
                </AppTableBody>
              </AppTable>
            </div>
          </section>
        </div>
      </TooltipProvider>
    </AppPageShell>
  );
};

export default AttendanceReconciliation;

import { useSelector } from 'react-redux';
import useDebounceCallback from '@/hooks/useDebounceCallback';
import useRole from '@/hooks/useRole';
import './LicensePage.css';
import type { RootState } from '@/store/store.types';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { axiosInstance } from '@/services/axiosInstance';
import type { licenseList } from '@/types/types';
import { LicenseListHeader } from '../paymentProcessing/components/licenseHeader/LicenseListHeader';
import { LicenseListItem } from '../paymentProcessing/components/licenseList/LicenseListItem';
import { isOpenCardLicense$ } from '@/services/sharingSubject';
import CardLicense from './views/cardLicense/CardLicense';
import { SocketContext } from '@/context/SocketContex';
import Input from '@/components/Input/Input';
import {
  Document,
  Page,
  PDFDownloadLink,
  PDFViewer,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ATTENDANCE_STATUSES,
  ATTENDANCE_STATUS_FINE_AMOUNTS,
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_SHORT_LABELS,
} from '@/models/attendanceStatus';

type LicenseRes = {
  licenses: licenseList[];
  count: number;
};

type FineSummary = Partial<Record<NonNullable<licenseList['fine']>, number>>;

type LicensePenaltyAdjustmentDto = {
  id: string;
  scope: 'LICENSE' | 'USER_PERIOD';
  licenseId?: number | null;
  userId: number;
  originalFine?: licenseList['fine'] | null;
  originalAmount: number;
  adjustedAmount: number;
  reason: string;
  periodStart?: string | null;
  periodEnd?: string | null;
};

type LicenseFineReportRes = {
  rows: licenseList[];
  summary: FineSummary;
  count: number;
  adjustments?: {
    license?: Record<number, LicensePenaltyAdjustmentDto>;
    userPeriod?: Record<number, LicensePenaltyAdjustmentDto>;
  };
};

type ReportDetailFilter = NonNullable<licenseList['fine']> | 'ALL';

type ReportTotalOrder = 'default' | 'desc' | 'asc';

type ReportConciliationItemDraft = {
  amount: string;
  reason: string;
};

type ReportConciliationDraft = {
  totalAmount: string;
  totalReason: string;
  items: Record<number, ReportConciliationItemDraft>;
};

type ReportMatrixItem = {
  usersId: number;
  counts: FineSummary;
  total: number;
  name: string;
  dni?: string;
  phone?: string;
};

type LicenseFilters = {
  applicant: string;
  reviewerId: string;
  type: string;
  submittedDate: string;
  reason: string;
  status: string;
  startDate: string;
  arrival: string;
};

const STATUS_OPTIONS = [
  { value: 'PROCESO', label: 'Pendiente' },
  { value: 'ACEPTADO', label: 'Aprobado' },
  { value: 'ACTIVO', label: 'En curso' },
  { value: 'INACTIVO', label: 'Finalizado' },
  { value: 'DENEGADO', label: 'Rechazado' },
];

const TYPE_OPTIONS = [
  { value: 'SALIDA', label: 'Salida de campo' },
  { value: 'PERMISO', label: 'Licencia personal' },
];

const ARRIVAL_OPTIONS = [
  { value: 'SIN_REGISTRO', label: 'Sin registro' },
  { value: 'EARLY', label: 'Llegada anticipada' },
  { value: 'PUNTUAL', label: 'Puntual' },
  { value: 'TARDE', label: 'Tardanza' },
  { value: 'SIMPLE', label: 'Falta simple' },
  { value: 'GRAVE', label: 'Falta grave' },
  { value: 'MUY_GRAVE', label: 'Falta muy grave' },
  { value: 'NO_REGISTER', label: 'Ingreso no registrado' },
];

const FINE_OPTIONS: {
  value: NonNullable<licenseList['fine']>;
  label: string;
  className: string;
  amount: string;
  showSummary?: boolean;
}[] = [
  {
    value: 'PUNTUAL',
    label: 'Puntual',
    className: 'lp-report-punctual',
    amount: 'S/. 0.00',
  },
  {
    value: 'TARDE',
    label: 'Tardanza',
    className: 'lp-report-late',
    amount: 'S/. 0.50',
  },
  {
    value: 'SIMPLE',
    label: 'Falta simple',
    className: 'lp-report-simple',
    amount: 'S/. 10.00',
  },
  {
    value: 'GRAVE',
    label: 'Falta grave',
    className: 'lp-report-grave',
    amount: 'S/. 20.00',
  },
  {
    value: 'MUY_GRAVE',
    label: 'Falta muy grave',
    className: 'lp-report-critical',
    amount: 'S/. 80.00',
  },
  {
    value: 'PERMISO',
    label: 'Licencia o permiso',
    className: 'lp-report-permit',
    amount: 'S/. 0.00',
    showSummary: false,
  },
  {
    value: 'SALIDA',
    label: 'Salida de campo',
    className: 'lp-report-field',
    amount: 'S/. 0.00',
    showSummary: false,
  },
];
const REPORT_SUMMARY_OPTIONS = FINE_OPTIONS.filter(
  item => item.showSummary !== false
);

const REPORT_ABBREVIATIONS = ATTENDANCE_STATUSES.reduce<
  Record<NonNullable<licenseList['fine']>, { short: string; label: string }>
>((acc, status) => {
  acc[status] = {
    short: ATTENDANCE_STATUS_SHORT_LABELS[status],
    label: ATTENDANCE_STATUS_LABELS[status],
  };
  return acc;
}, {} as Record<NonNullable<licenseList['fine']>, { short: string; label: string }>);

const FINE_AMOUNT = ATTENDANCE_STATUS_FINE_AMOUNTS as Record<
  NonNullable<licenseList['fine']>,
  number
>;

const REPORT_DETAIL_SEVERITY_ORDER: Record<
  NonNullable<licenseList['fine']>,
  number
> = {
  MUY_GRAVE: 0,
  GRAVE: 1,
  SIMPLE: 2,
  TARDE: 3,
  PUNTUAL: 4,
  PERMISO: 5,
  SALIDA: 6,
};

const EMPTY_REPORT_CONCILIATION: ReportConciliationDraft = {
  totalAmount: '',
  totalReason: '',
  items: {},
};

const parseReportMoneyDraft = (value: string) => {
  const normalizedValue = value.trim().replace(',', '.');
  if (!normalizedValue) return null;
  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const hasReportConciliationValue = (draft: ReportConciliationDraft) =>
  parseReportMoneyDraft(draft.totalAmount) !== null ||
  draft.totalReason.trim() !== '' ||
  Object.values(draft.items).some(
    item => item.amount.trim() !== '' || item.reason.trim() !== ''
  );

const getReportRowAmount = (row: licenseList) =>
  row.fine ? FINE_AMOUNT[row.fine] ?? 0 : 0;

const isReportAmountGreaterThanBase = (amount: number, base: number) =>
  amount > base + 0.001;

const normalizeReportDetailType = (row: licenseList) => {
  const detailType = row.fine ?? row.type;
  return detailType && detailType in REPORT_ABBREVIATIONS
    ? (detailType as NonNullable<licenseList['fine']>)
    : 'SALIDA';
};

const getReportConciliatedAmount = (
  draft: ReportConciliationDraft,
  baseTotal: number,
  rows: licenseList[]
) => {
  const manualTotal = parseReportMoneyDraft(draft.totalAmount);
  const hasItemDrafts = Object.values(draft.items).some(
    item => item.amount.trim() !== '' || item.reason.trim() !== ''
  );
  const itemsTotal = rows.reduce((sum, row) => {
    const itemDraft = draft.items[row.id];
    const adjustedAmount = itemDraft?.amount
      ? parseReportMoneyDraft(itemDraft.amount)
      : null;
    return sum + (adjustedAmount ?? getReportRowAmount(row));
  }, 0);
  return manualTotal ?? (hasItemDrafts ? itemsTotal : baseTotal);
};

const REPORT_PAGE_SIZE = 20;
const LICENSE_PAGE_SIZE = 20;

const reportPdfStyles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 6,
    fontFamily: 'Helvetica',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  table: {
    borderTop: '1px solid #111',
    borderLeft: '1px solid #111',
  },
  row: {
    flexDirection: 'row',
    minHeight: 16,
  },
  headerCell: {
    justifyContent: 'center',
    padding: 3,
    borderRight: '1px solid #111',
    borderBottom: '1px solid #111',
    backgroundColor: '#f1f5fb',
    fontWeight: 700,
    textAlign: 'center',
  },
  cell: {
    justifyContent: 'center',
    padding: 3,
    borderRight: '1px solid #111',
    borderBottom: '1px solid #111',
    textAlign: 'center',
  },
  nameCell: {
    textAlign: 'left',
  },
  p: { backgroundColor: '#8ee5d1' },
  t: { backgroundColor: '#ffe26b' },
  f: { backgroundColor: '#ffb1b1' },
  g: { backgroundColor: '#ff7777' },
  m: { backgroundColor: '#ff5f5f' },
  l: { backgroundColor: '#82a7ff' },
  s: { backgroundColor: '#8c78d6', color: '#ffffff' },
  total: {
    color: '#d71920',
    fontWeight: 700,
  },
});

const reportPdfWidths = {
  item: '4%',
  name: '34%',
  dni: '10%',
  phone: '11%',
  code: '4.5%',
  total: '9.5%',
};

const ReportPdfDocument = ({
  data,
  period,
}: {
  data: ReportMatrixItem[];
  period: string;
}) => (
  <Document>
    <Page size="A4" orientation="portrait" style={reportPdfStyles.page}>
      <Text style={reportPdfStyles.title}>Reporte de salidas - {period}</Text>
      <View style={reportPdfStyles.table}>
        <View style={reportPdfStyles.row} fixed>
          <Text
            style={[
              reportPdfStyles.headerCell,
              { width: reportPdfWidths.item },
            ]}
          >
            N°
          </Text>
          <Text
            style={[
              reportPdfStyles.headerCell,
              { width: reportPdfWidths.name },
            ]}
          >
            Apellidos y nombres
          </Text>
          <Text
            style={[reportPdfStyles.headerCell, { width: reportPdfWidths.dni }]}
          >
            DNI
          </Text>
          <Text
            style={[
              reportPdfStyles.headerCell,
              { width: reportPdfWidths.phone },
            ]}
          >
            Celular
          </Text>
          <Text
            style={[
              reportPdfStyles.headerCell,
              { width: reportPdfWidths.code },
            ]}
          >
            P
          </Text>
          <Text
            style={[
              reportPdfStyles.headerCell,
              { width: reportPdfWidths.code },
            ]}
          >
            T
          </Text>
          <Text
            style={[
              reportPdfStyles.headerCell,
              { width: reportPdfWidths.code },
            ]}
          >
            F
          </Text>
          <Text
            style={[
              reportPdfStyles.headerCell,
              { width: reportPdfWidths.code },
            ]}
          >
            G
          </Text>
          <Text
            style={[
              reportPdfStyles.headerCell,
              { width: reportPdfWidths.code },
            ]}
          >
            M
          </Text>
          <Text
            style={[
              reportPdfStyles.headerCell,
              { width: reportPdfWidths.code },
            ]}
          >
            L
          </Text>
          <Text
            style={[
              reportPdfStyles.headerCell,
              { width: reportPdfWidths.code },
            ]}
          >
            S
          </Text>
          <Text
            style={[
              reportPdfStyles.headerCell,
              { width: reportPdfWidths.total },
            ]}
          >
            Monto penalizable
          </Text>
        </View>
        {data.map((item, index) => (
          <View style={reportPdfStyles.row} key={item.usersId} wrap={false}>
            <Text
              style={[reportPdfStyles.cell, { width: reportPdfWidths.item }]}
            >
              {index + 1}
            </Text>
            <Text
              style={[
                reportPdfStyles.cell,
                reportPdfStyles.nameCell,
                { width: reportPdfWidths.name },
              ]}
            >
              {item.name}
            </Text>
            <Text
              style={[reportPdfStyles.cell, { width: reportPdfWidths.dni }]}
            >
              {item.dni ?? '---'}
            </Text>
            <Text
              style={[reportPdfStyles.cell, { width: reportPdfWidths.phone }]}
            >
              {item.phone ?? '---'}
            </Text>
            <Text
              style={[
                reportPdfStyles.cell,
                reportPdfStyles.p,
                { width: reportPdfWidths.code },
              ]}
            >
              {item.counts.PUNTUAL ?? 0}
            </Text>
            <Text
              style={[
                reportPdfStyles.cell,
                reportPdfStyles.t,
                { width: reportPdfWidths.code },
              ]}
            >
              {item.counts.TARDE ?? 0}
            </Text>
            <Text
              style={[
                reportPdfStyles.cell,
                reportPdfStyles.f,
                { width: reportPdfWidths.code },
              ]}
            >
              {item.counts.SIMPLE ?? 0}
            </Text>
            <Text
              style={[
                reportPdfStyles.cell,
                reportPdfStyles.g,
                { width: reportPdfWidths.code },
              ]}
            >
              {item.counts.GRAVE ?? 0}
            </Text>
            <Text
              style={[
                reportPdfStyles.cell,
                reportPdfStyles.m,
                { width: reportPdfWidths.code },
              ]}
            >
              {item.counts.MUY_GRAVE ?? 0}
            </Text>
            <Text
              style={[
                reportPdfStyles.cell,
                reportPdfStyles.l,
                { width: reportPdfWidths.code },
              ]}
            >
              {item.counts.PERMISO ?? 0}
            </Text>
            <Text
              style={[
                reportPdfStyles.cell,
                reportPdfStyles.s,
                { width: reportPdfWidths.code },
              ]}
            >
              {item.counts.SALIDA ?? 0}
            </Text>
            <Text
              style={[
                reportPdfStyles.cell,
                reportPdfStyles.total,
                { width: reportPdfWidths.total },
              ]}
            >
              S/. {item.total.toFixed(2)}
            </Text>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

const getLocalDate = (value?: string) => {
  if (!value) return '';
  const GMT = 5 * 60 * 60 * 1000;
  return new Date(new Date(value).getTime() + GMT).toISOString().slice(0, 10);
};

const parseReason = (reason = '', type?: string) => {
  const separators = [' - Proyecto: ', ' - '];
  const separator = separators.find(item => reason.includes(item));
  if (separator) {
    const [motivo] = reason.split(separator);
    return motivo;
  }
  if (type === 'PERMISO' && reason) return 'Licencia personal';
  return reason || '---';
};

const getArrivalFilterValue = (license: licenseList) => {
  if (!license.checkout && license.fine === 'MUY_GRAVE') return 'NO_REGISTER';
  if (!license.checkout) return 'SIN_REGISTRO';
  const GMT = 5 * 60 * 60 * 1000;
  const checkoutDate = new Date(new Date(license.checkout).getTime() + GMT);
  const untilDate = new Date(new Date(license.untilDate).getTime() + GMT);
  if (checkoutDate.getTime() < untilDate.getTime()) return 'EARLY';
  const timeDifference = checkoutDate.getTime() - untilDate.getTime();
  if (timeDifference >= 20 * 60 * 1000) return 'MUY_GRAVE';
  if (timeDifference >= 15 * 60 * 1000) return 'GRAVE';
  if (timeDifference >= 10 * 60 * 1000) return 'SIMPLE';
  if (timeDifference >= 3 * 60 * 1000) return 'TARDE';
  return 'PUNTUAL';
};

const formatReportDateTime = (value?: string | Date | null) => {
  if (!value) return 'Sin registro';
  const GMT = 5 * 60 * 60 * 1000;
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(new Date(value).getTime() + GMT));
};

const getLicensePersonName = (
  person?: licenseList['user'] | licenseList['supervisor'] | null,
  fallback?: string
) => {
  if (!person?.profile) return fallback;
  const name = `${person.profile.firstName} ${person.profile.lastName}`.trim();

  return name || fallback;
};

const getLicenseApplicantName = (license: licenseList) =>
  getLicensePersonName(license.user, `Usuario ${license.usersId}`) ??
  `Usuario ${license.usersId}`;

export const LicensePage = () => {
  const { role, id } = useSelector((state: RootState) => state.userSession);
  const { hasAccess } = useRole('MOD', 'tramites', 'salidas');
  const [listLicense, setListLicense] = useState<licenseList[]>([]);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [skip, setSkip] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'requests' | 'report'>(
    'requests'
  );
  const [reportRows, setReportRows] = useState<licenseList[]>([]);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [reportPage, setReportPage] = useState(1);
  const [showReportPdf, setShowReportPdf] = useState(false);
  const [expandedReportUserId, setExpandedReportUserId] = useState<
    number | null
  >(null);
  const [reportDetailFine, setReportDetailFine] =
    useState<ReportDetailFilter>('ALL');
  const [reportTotalOrder, setReportTotalOrder] =
    useState<ReportTotalOrder>('default');
  const [reportConciliationDrafts, setReportConciliationDrafts] = useState<
    Record<number, ReportConciliationDraft>
  >({});
  const [reportAppliedConciliations, setReportAppliedConciliations] = useState<
    Record<number, ReportConciliationDraft>
  >({});
  const [savingReportConciliationUserId, setSavingReportConciliationUserId] =
    useState<number | null>(null);
  const [reportConciliationErrors, setReportConciliationErrors] = useState<
    Record<number, string>
  >({});
  const [filters, setFilters] = useState<LicenseFilters>({
    applicant: '',
    reviewerId: '',
    type: '',
    submittedDate: '',
    reason: '',
    status: '',
    startDate: '',
    arrival: '',
  });

  const socket = useContext(SocketContext);

  const verifyLicenses = useCallback(() => {
    axiosInstance
      .post('/license/expired')
      .then(() => console.log('Datos limpiados'));
  }, []);

  const getHistory = useCallback(
    (_page = 1, _pageSize = LICENSE_PAGE_SIZE, search?: string) => {
      const requestPage = Number.isFinite(_page) && _page > 0 ? _page : 1;
      const requestPageSize =
        Number.isFinite(_pageSize) && _pageSize > 0
          ? _pageSize
          : LICENSE_PAGE_SIZE;

      if (role && !hasAccess) {
        axiosInstance
          .get<LicenseRes>(`license/employee/${id}`, {
            params: {
              page: requestPage,
              pageSize: requestPageSize,
            },
          })
          .then(res => {
            setListLicense(res.data?.licenses ?? []);
            setTotal(res.data?.count ?? 0);
          });
      }
      if (hasAccess) {
        axiosInstance
          .get<LicenseRes>('license/status', {
            params: {
              page: requestPage,
              pageSize: requestPageSize,
              searchName: search || undefined,
            },
          })
          .then(res => {
            setListLicense(res.data?.licenses ?? []);
            setTotal(res.data?.count ?? 0);
          });
      }
    },
    [hasAccess, id, role]
  );

  const refreshCurrentLicenses = useCallback(() => {
    getHistory(page, LICENSE_PAGE_SIZE, searchTerm);
  }, [getHistory, page, searchTerm]);

  useEffect(() => {
    const refreshLicenses = () => {
      refreshCurrentLicenses();
      if (hasAccess) verifyLicenses();
    };

    socket.on('server:license-update', refreshLicenses);
    socket.on('server:gate-control-update', refreshLicenses);

    return () => {
      socket.off('server:license-update', refreshLicenses);
      socket.off('server:gate-control-update', refreshLicenses);
    };
  }, [socket, hasAccess, refreshCurrentLicenses, verifyLicenses]);

  useEffect(() => {
    refreshCurrentLicenses();
    if (hasAccess) verifyLicenses();
  }, [hasAccess, refreshCurrentLicenses, verifyLicenses]);

  const showCardReportData = (data: licenseList) => {
    isOpenCardLicense$.setSubject = {
      isOpen: true,
      data,
    };
  };
  const showCardReport = () => {
    isOpenCardLicense$.setSubject = {
      isOpen: true,
    };
  };
  const showCardReportFreeDay = () => {
    isOpenCardLicense$.setSubject = {
      isOpen: true,
      type: 'free',
    };
  };

  const handleNextPage = () => {
    if (listLicense.length === LICENSE_PAGE_SIZE && total > LICENSE_PAGE_SIZE) {
      setSkip(
        skip === 0 ? skip + LICENSE_PAGE_SIZE + 1 : skip + LICENSE_PAGE_SIZE
      );
      setPage(page + 1);
    }
  };
  const handlePreviusPage = () => {
    if (page - 1 > 0) {
      setSkip(skip - LICENSE_PAGE_SIZE);
      setPage(page - 1);
    }
  };
  const debounce = useDebounceCallback((value: string) => {
    setPage(1);
    setSkip(0);
    setSearchTerm(value);
  }, 500);
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFilters(prev => ({ ...prev, applicant: value }));
    debounce(value);
  };
  const handleFilterChange = (key: keyof LicenseFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  const clearFilters = () => {
    setFilters({
      applicant: '',
      reviewerId: '',
      type: '',
      submittedDate: '',
      reason: '',
      status: '',
      startDate: '',
      arrival: '',
    });
    setSearchTerm('');
    setPage(1);
    setSkip(0);
    getHistory(1, LICENSE_PAGE_SIZE, '');
  };
  const hydrateReportConciliations = useCallback(
    (
      rows: licenseList[],
      adjustments?: LicenseFineReportRes['adjustments']
    ) => {
      const next: Record<number, ReportConciliationDraft> = {};
      Object.values(adjustments?.userPeriod ?? {}).forEach(adjustment => {
        next[adjustment.userId] = {
          totalAmount: adjustment.adjustedAmount.toFixed(2),
          totalReason: adjustment.reason,
          items: next[adjustment.userId]?.items ?? {},
        };
      });
      Object.values(adjustments?.license ?? {}).forEach(adjustment => {
        if (!adjustment.licenseId) return;
        const row = rows.find(item => item.id === adjustment.licenseId);
        const userId = row?.usersId ?? adjustment.userId;
        const current = next[userId] ?? EMPTY_REPORT_CONCILIATION;
        next[userId] = {
          ...current,
          items: {
            ...current.items,
            [adjustment.licenseId]: {
              amount: adjustment.adjustedAmount.toFixed(2),
              reason: adjustment.reason,
            },
          },
        };
      });
      setReportAppliedConciliations(next);
      setReportConciliationDrafts(
        Object.fromEntries(
          Object.entries(next).map(([userId, draft]) => [
            userId,
            {
              totalAmount: draft.totalAmount,
              totalReason: draft.totalReason,
              items: { ...draft.items },
            },
          ])
        )
      );
    },
    []
  );
  const getFineReport = useCallback(() => {
    axiosInstance
      .get<LicenseFineReportRes>('license/report/fines', {
        params: {
          startDate: reportStartDate || undefined,
          endDate: reportEndDate || undefined,
        },
      })
      .then(res => {
        const rows = res.data?.rows ?? [];
        setReportRows(rows);
        setReportPage(1);
        setExpandedReportUserId(null);
        setReportDetailFine('ALL');
        hydrateReportConciliations(rows, res.data?.adjustments);
      });
  }, [hydrateReportConciliations, reportEndDate, reportStartDate]);

  useEffect(() => {
    if (hasAccess && activeView === 'report') getFineReport();
  }, [activeView, getFineReport, hasAccess]);

  const clearReportFilters = () => {
    setReportStartDate('');
    setReportEndDate('');
    setReportSearch('');
    setReportTotalOrder('default');
    axiosInstance
      .get<LicenseFineReportRes>('license/report/fines')
      .then(res => {
        const rows = res.data?.rows ?? [];
        setReportRows(rows);
        setReportPage(1);
        setExpandedReportUserId(null);
        setReportDetailFine('ALL');
        hydrateReportConciliations(rows, res.data?.adjustments);
      });
  };

  const reportMatrix = useMemo(() => {
    const grouped = new Map<number, ReportMatrixItem>();
    reportRows.forEach(row => {
      const current: ReportMatrixItem = grouped.get(row.usersId) ?? {
        usersId: row.usersId,
        counts: {},
        total: 0,
        name: getLicenseApplicantName(row),
        dni: row.user?.profile?.dni,
        phone: row.user?.profile?.phone ?? undefined,
      };
      if (row.fine) {
        current.counts[row.fine] = (current.counts[row.fine] ?? 0) + 1;
        current.total += FINE_AMOUNT[row.fine];
      }
      if (row.type === 'PERMISO') {
        current.counts.PERMISO = (current.counts.PERMISO ?? 0) + 1;
      }
      if (row.type === 'SALIDA') {
        current.counts.SALIDA = (current.counts.SALIDA ?? 0) + 1;
      }
      grouped.set(row.usersId, current);
    });
    return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [reportRows]);

  const filteredReportMatrix = useMemo(() => {
    const searchValue = reportSearch.trim().toLowerCase();
    const searchFiltered = !searchValue
      ? reportMatrix
      : reportMatrix.filter(item => {
          const dni = item.dni?.toLowerCase() ?? '';
          return (
            item.name.toLowerCase().includes(searchValue) ||
            dni.includes(searchValue)
          );
        });

    if (reportTotalOrder === 'default') return searchFiltered;

    const getSortableTotal = (item: ReportMatrixItem) => {
      const applied =
        reportAppliedConciliations[item.usersId] ?? EMPTY_REPORT_CONCILIATION;
      if (!hasReportConciliationValue(applied)) return item.total;
      const rows = reportRows.filter(row => row.usersId === item.usersId);
      return getReportConciliatedAmount(applied, item.total, rows);
    };

    return [...searchFiltered].sort((a, b) =>
      reportTotalOrder === 'desc'
        ? getSortableTotal(b) - getSortableTotal(a)
        : getSortableTotal(a) - getSortableTotal(b)
    );
  }, [
    reportAppliedConciliations,
    reportMatrix,
    reportRows,
    reportSearch,
    reportTotalOrder,
  ]);

  const filteredReportRows = useMemo(() => {
    const searchValue = reportSearch.trim().toLowerCase();
    if (!searchValue) return reportRows;
    return reportRows.filter(item => {
      const dni = item.user?.profile?.dni?.toLowerCase() ?? '';
      const name = getLicenseApplicantName(item).toLowerCase();
      return name.includes(searchValue) || dni.includes(searchValue);
    });
  }, [reportRows, reportSearch]);

  const visibleReportSummary = useMemo(() => {
    return filteredReportMatrix.reduce<FineSummary>((acc, item) => {
      REPORT_SUMMARY_OPTIONS.forEach(option => {
        acc[option.value] =
          (acc[option.value] ?? 0) + (item.counts[option.value] ?? 0);
      });
      return acc;
    }, {});
  }, [filteredReportMatrix]);

  const reportTotalPages = Math.max(
    1,
    Math.ceil(filteredReportMatrix.length / REPORT_PAGE_SIZE)
  );
  const reportFirstItem =
    filteredReportMatrix.length === 0
      ? 0
      : (reportPage - 1) * REPORT_PAGE_SIZE + 1;
  const reportLastItem = Math.min(
    reportPage * REPORT_PAGE_SIZE,
    filteredReportMatrix.length
  );
  const pagedReportMatrix = filteredReportMatrix.slice(
    (reportPage - 1) * REPORT_PAGE_SIZE,
    reportPage * REPORT_PAGE_SIZE
  );
  const getReportRowsByUser = useCallback(
    (userId: number, fine: ReportDetailFilter = 'ALL') =>
      filteredReportRows
        .filter(row => row.usersId === userId)
        .filter(row => {
          if (fine === 'ALL') return true;
          if (fine === 'PERMISO') return row.type === 'PERMISO';
          if (fine === 'SALIDA') return row.type === 'SALIDA';
          return row.fine === fine;
        })
        .sort((a, b) => {
          const aSeverity =
            REPORT_DETAIL_SEVERITY_ORDER[normalizeReportDetailType(a)];
          const bSeverity =
            REPORT_DETAIL_SEVERITY_ORDER[normalizeReportDetailType(b)];

          if (aSeverity !== bSeverity) return aSeverity - bSeverity;

          return (
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );
        }),
    [filteredReportRows]
  );

  const toggleReportDetail = (
    userId: number,
    fine: ReportDetailFilter = 'ALL'
  ) => {
    const isSameDetail =
      expandedReportUserId === userId && reportDetailFine === fine;
    setExpandedReportUserId(isSameDetail ? null : userId);
    setReportDetailFine(isSameDetail ? 'ALL' : fine);
  };

  const getReportDetailLabel = (fine: ReportDetailFilter) =>
    fine === 'ALL'
      ? 'Todas las incidencias'
      : REPORT_ABBREVIATIONS[fine]?.label ?? 'Incidencia';

  const getReportDraft = (userId: number) =>
    reportConciliationDrafts[userId] ?? EMPTY_REPORT_CONCILIATION;

  const getReportAppliedConciliation = (userId: number) =>
    reportAppliedConciliations[userId] ?? EMPTY_REPORT_CONCILIATION;

  const parseMoneyDraft = parseReportMoneyDraft;

  const updateReportTotalDraft = (
    userId: number,
    key: 'totalAmount' | 'totalReason',
    value: string
  ) => {
    setReportConciliationErrors(prev => {
      if (!prev[userId]) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setReportConciliationDrafts(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] ?? EMPTY_REPORT_CONCILIATION),
        [key]: value,
      },
    }));
  };

  const updateReportItemDraft = (
    userId: number,
    rowId: number,
    key: keyof ReportConciliationItemDraft,
    value: string
  ) => {
    setReportConciliationErrors(prev => {
      if (!prev[userId]) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setReportConciliationDrafts(prev => {
      const current = prev[userId] ?? EMPTY_REPORT_CONCILIATION;
      const currentItem = current.items[rowId] ?? { amount: '', reason: '' };
      return {
        ...prev,
        [userId]: {
          ...current,
          items: {
            ...current.items,
            [rowId]: {
              ...currentItem,
              [key]: value,
            },
          },
        },
      };
    });
  };

  const clearReportConciliation = async (userId: number) => {
    const licenseIds = getReportRowsByUser(userId).map(row => row.id);
    setSavingReportConciliationUserId(userId);
    try {
      await axiosInstance.patch('license/report/fines/adjustments/void', {
        userId,
        periodStart: reportStartDate || undefined,
        periodEnd: reportEndDate || undefined,
        licenseIds,
      });
      getFineReport();
    } finally {
      setSavingReportConciliationUserId(null);
    }
  };

  const hasReportConciliationDraft = hasReportConciliationValue;

  const getConciliationAmount = (
    draft: ReportConciliationDraft,
    baseTotal: number,
    rows: licenseList[]
  ) => getReportConciliatedAmount(draft, baseTotal, rows);

  const confirmReportConciliation = async (userId: number) => {
    const draft = getReportDraft(userId);
    if (!hasReportConciliationDraft(draft)) return;
    const userRows = reportRows.filter(row => row.usersId === userId);
    const baseTotal = userRows.reduce(
      (sum, row) => sum + getReportRowAmount(row),
      0
    );
    const totalAmount = parseMoneyDraft(draft.totalAmount);
    const totalReason = draft.totalReason.trim();
    if (draft.totalAmount.trim() && totalAmount === null) {
      setReportConciliationErrors(prev => ({
        ...prev,
        [userId]: 'Ingrese un monto total valido para guardar el ajuste.',
      }));
      return;
    }
    if (
      totalAmount !== null &&
      isReportAmountGreaterThanBase(totalAmount, baseTotal)
    ) {
      setReportConciliationErrors(prev => ({
        ...prev,
        [userId]: `El ajuste total no puede superar S/. ${baseTotal.toFixed(
          2
        )}.`,
      }));
      return;
    }
    if (totalAmount !== null && !totalReason) {
      setReportConciliationErrors(prev => ({
        ...prev,
        [userId]: 'Agregue el motivo del ajuste total antes de confirmar.',
      }));
      return;
    }
    const itemAdjustments = Object.entries(draft.items)
      .map(([licenseId, item]) => {
        const amount = parseMoneyDraft(item.amount);
        const reason = item.reason.trim();
        return {
          licenseId: Number(licenseId),
          adjustedAmount: amount,
          reason,
          hasInput: item.amount.trim() !== '' || reason !== '',
        };
      })
      .filter(item => item.hasInput);
    const invalidItem = itemAdjustments.some(
      item => item.adjustedAmount === null || !item.reason
    );
    if (totalAmount === null && invalidItem) {
      setReportConciliationErrors(prev => ({
        ...prev,
        [userId]:
          'Cada incidencia ajustada necesita un monto valido y su motivo.',
      }));
      return;
    }
    const excessiveItem = itemAdjustments.find(item => {
      if (item.adjustedAmount === null) return false;
      const row = userRows.find(row => row.id === item.licenseId);
      return row
        ? isReportAmountGreaterThanBase(
            item.adjustedAmount,
            getReportRowAmount(row)
          )
        : false;
    });
    if (totalAmount === null && excessiveItem) {
      const row = userRows.find(row => row.id === excessiveItem.licenseId);
      const baseAmount = row ? getReportRowAmount(row) : 0;
      setReportConciliationErrors(prev => ({
        ...prev,
        [userId]: `El ajuste de una incidencia no puede superar S/. ${baseAmount.toFixed(
          2
        )}.`,
      }));
      return;
    }
    setSavingReportConciliationUserId(userId);
    try {
      await axiosInstance.post('license/report/fines/adjustments', {
        userId,
        periodStart: reportStartDate || undefined,
        periodEnd: reportEndDate || undefined,
        total:
          totalAmount !== null
            ? { adjustedAmount: totalAmount, reason: totalReason }
            : undefined,
        items:
          totalAmount === null
            ? itemAdjustments.map(item => ({
                licenseId: item.licenseId,
                adjustedAmount: item.adjustedAmount,
                reason: item.reason,
              }))
            : undefined,
      });
      setReportConciliationErrors(prev => {
        if (!prev[userId]) return prev;
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      getFineReport();
    } finally {
      setSavingReportConciliationUserId(null);
    }
  };

  const discardReportDraft = (userId: number) => {
    const applied = reportAppliedConciliations[userId];
    setReportConciliationErrors(prev => {
      if (!prev[userId]) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setReportConciliationDrafts(prev => {
      const next = { ...prev };
      if (applied) {
        next[userId] = {
          totalAmount: applied.totalAmount,
          totalReason: applied.totalReason,
          items: { ...applied.items },
        };
      } else {
        delete next[userId];
      }
      return next;
    });
  };

  const getReportConciliationSummary = (
    userId: number,
    baseTotal: number,
    rows: licenseList[]
  ) => {
    const draft = getReportDraft(userId);
    const applied = getReportAppliedConciliation(userId);
    const hasDraft = hasReportConciliationDraft(draft);
    const hasApplied = hasReportConciliationDraft(applied);
    const previewAmount = hasDraft
      ? getConciliationAmount(draft, baseTotal, rows)
      : baseTotal;
    const finalAmount = hasApplied
      ? getConciliationAmount(applied, baseTotal, rows)
      : baseTotal;
    const hasPendingDraft =
      hasDraft && JSON.stringify(draft) !== JSON.stringify(applied);
    return {
      draft,
      applied,
      finalAmount,
      previewAmount,
      hasDraft,
      hasApplied,
      hasPendingDraft,
    };
  };

  const canReportGoBack = reportPage > 1;
  const canReportGoNext = reportPage < reportTotalPages;

  const reportPeriodLabel =
    reportStartDate || reportEndDate
      ? `${reportStartDate || 'Inicio'} al ${reportEndDate || 'Hoy'}`
      : 'Todos los registros';

  const reportPdfMatrix = filteredReportMatrix.map(item => {
    const rows = getReportRowsByUser(item.usersId);
    const summary = getReportConciliationSummary(
      item.usersId,
      item.total,
      rows
    );
    return {
      ...item,
      total: summary.hasApplied ? summary.finalAmount : item.total,
    };
  });

  const reviewerOptions = useMemo(() => {
    const reviewerIds = [
      ...new Set(
        listLicense
          .map(item => item.supervisorId)
          .filter((reviewerId): reviewerId is number => !!reviewerId)
      ),
    ];
    return reviewerIds.map(reviewerId => ({
      id: reviewerId,
      name:
        getLicensePersonName(
          listLicense.find(item => item.supervisorId === reviewerId)
            ?.supervisor,
          String(reviewerId)
        ) ?? String(reviewerId),
    }));
  }, [listLicense]);

  const reasonOptions = useMemo(() => {
    return [
      ...new Set(listLicense.map(item => parseReason(item.reason, item.type))),
    ].filter(reason => reason !== '---');
  }, [listLicense]);

  const filteredLicenses = useMemo(() => {
    const applicantValue = filters.applicant.trim().toLowerCase();
    return listLicense.filter(item => {
      const applicantName = getLicenseApplicantName(item).toLowerCase();
      const applicantMatches =
        !hasAccess || !applicantValue || applicantName.includes(applicantValue);
      const reviewerMatches =
        !filters.reviewerId ||
        String(item.supervisorId ?? '') === filters.reviewerId;
      const typeMatches = !filters.type || item.type === filters.type;
      const submittedDateMatches =
        !filters.submittedDate ||
        getLocalDate(item.createdAt) === filters.submittedDate;
      const reasonMatches =
        !filters.reason ||
        parseReason(item.reason, item.type) === filters.reason;
      const statusMatches = !filters.status || item.status === filters.status;
      const startDateMatches =
        !filters.startDate ||
        getLocalDate(item.startDate) === filters.startDate;
      const arrivalMatches =
        !filters.arrival || getArrivalFilterValue(item) === filters.arrival;

      return (
        applicantMatches &&
        reviewerMatches &&
        typeMatches &&
        submittedDateMatches &&
        reasonMatches &&
        statusMatches &&
        startDateMatches &&
        arrivalMatches
      );
    });
  }, [filters, hasAccess, listLicense]);
  const firstItem = total === 0 ? 0 : skip === 0 ? 1 : skip;
  const lastItem =
    total === 0
      ? 0
      : skip + total <= LICENSE_PAGE_SIZE
      ? total
      : listLicense.length === LICENSE_PAGE_SIZE
      ? LICENSE_PAGE_SIZE + (skip === 0 ? skip : skip - 1)
      : total;
  const canGoBack = page > 1;
  const canGoNext =
    listLicense.length === LICENSE_PAGE_SIZE &&
    total > LICENSE_PAGE_SIZE &&
    lastItem < total;

  return (
    <div className="lp-content">
      <div className="lp-access-container">
        <div
          className="lp-result-summary"
          title={
            activeView === 'report'
              ? 'Solicitudes con llegada o penalizacion dentro del reporte'
              : 'Solicitudes visibles con los filtros actuales'
          }
        >
          {activeView === 'report' ? (
            <>
              <span>{filteredReportRows.length}</span>
              <small>
                {filteredReportRows.length === 1
                  ? 'solicitud revisada'
                  : 'solicitudes revisadas'}
              </small>
              <em>{filteredReportMatrix.length} usuarios</em>
            </>
          ) : (
            <>
              <span>{filteredLicenses.length}</span>
              <small>
                {filteredLicenses.length === 1 ? 'resultado' : 'resultados'}
              </small>
            </>
          )}
        </div>
        {hasAccess && (
          <div className="lp-view-tabs" aria-label="Vista de salidas">
            <button
              type="button"
              className={activeView === 'requests' ? 'lp-view-active' : ''}
              onClick={() => setActiveView('requests')}
            >
              Solicitudes
            </button>
            <button
              type="button"
              className={activeView === 'report' ? 'lp-view-active' : ''}
              onClick={() => setActiveView('report')}
            >
              Reporte
            </button>
          </div>
        )}
        <div className="lp-access-btns ">
          <span className="lp-license" onClick={showCardReport}>
            <img className="lp-free-day-img" src="/svg/license-icon.svg" />
            Solicitar Salida
          </span>
          {role && role?.id <= 2 && (
            <span className="lp-license" onClick={showCardReportFreeDay}>
              <img className="lp-free-day-img" src="/svg/license-icon.svg" />
              Día libre
            </span>
          )}
        </div>
      </div>
      {activeView === 'requests' && (
        <>
          <LicenseListHeader isEmployee={!hasAccess} refresh={getHistory} />
          <div
            className={`lp-filter-panel ${
              hasAccess ? 'lp-filter-admin' : 'lp-filter-employee'
            }`}
          >
            <div
              className="lp-filter-info"
              title={
                hasAccess
                  ? 'Filtra solicitudes por columnas'
                  : 'Vista de tus solicitudes e historial personal'
              }
            >
              <span className="lp-filter-info-icon">i</span>
            </div>
            {hasAccess ? (
              <label className="lp-filter-field lp-filter-applicant">
                <span>Solicitante</span>
                <Input
                  type="text"
                  placeholder="Buscar por nombre"
                  value={filters.applicant}
                  onChange={handleSearchChange}
                />
              </label>
            ) : (
              <label className="lp-filter-field lp-filter-submitted">
                <span>Fecha envio</span>
                <Input
                  type="date"
                  value={filters.submittedDate}
                  onChange={event =>
                    handleFilterChange('submittedDate', event.target.value)
                  }
                />
              </label>
            )}
            <label className="lp-filter-field lp-filter-reviewer">
              <span>Revisado</span>
              <select
                value={filters.reviewerId}
                onChange={event =>
                  handleFilterChange('reviewerId', event.target.value)
                }
              >
                <option value="">Todos</option>
                {reviewerOptions.map(reviewer => (
                  <option key={reviewer.id} value={reviewer.id}>
                    {reviewer.name}
                  </option>
                ))}
              </select>
            </label>
            {!hasAccess && (
              <label className="lp-filter-field lp-filter-type">
                <span>Tipo</span>
                <select
                  value={filters.type}
                  onChange={event =>
                    handleFilterChange('type', event.target.value)
                  }
                >
                  <option value="">Todos</option>
                  {TYPE_OPTIONS.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="lp-filter-field lp-filter-reason">
              <span>Motivo</span>
              <select
                value={filters.reason}
                onChange={event =>
                  handleFilterChange('reason', event.target.value)
                }
              >
                <option value="">Todos</option>
                {reasonOptions.map(reason => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </label>
            <label className="lp-filter-field lp-filter-status">
              <span>Estado</span>
              <select
                value={filters.status}
                onChange={event =>
                  handleFilterChange('status', event.target.value)
                }
              >
                <option value="">Todos</option>
                {STATUS_OPTIONS.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="lp-filter-field lp-filter-start">
              <span>Salida</span>
              <Input
                type="date"
                value={filters.startDate}
                onChange={event =>
                  handleFilterChange('startDate', event.target.value)
                }
              />
            </label>
            <label className="lp-filter-field lp-filter-arrival">
              <span>Llegada</span>
              <select
                value={filters.arrival}
                onChange={event =>
                  handleFilterChange('arrival', event.target.value)
                }
              >
                <option value="">Todos</option>
                {ARRIVAL_OPTIONS.map(arrival => (
                  <option key={arrival.value} value={arrival.value}>
                    {arrival.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="lp-filter-reset"
              type="button"
              title="Limpiar filtros y recargar"
              onClick={clearFilters}
            >
              <img src="/svg/refresh.svg" alt="recargar" />
            </button>
          </div>
          <div className="lp-grid-container">
            {filteredLicenses.map((license, index) => (
              <LicenseListItem
                key={license.id}
                data={license}
                index={index + (skip === 0 ? skip : skip - 1)}
                isEmployee={!hasAccess as boolean}
                editData={() => showCardReportData(license)}
                onSave={getHistory}
              />
            ))}
          </div>
        </>
      )}
      {activeView === 'report' && hasAccess && (
        <div className="lp-report-view">
          <section className="lp-report-toolbar">
            <div>
              <h3>Reporte de llegadas y faltas</h3>
              <p>
                Consolidado del modulo Salidas por resultado de llegada y monto
                penalizable.
              </p>
            </div>
            <label title="Filtra el reporte por nombre o DNI del usuario">
              Buscar usuario
              <Input
                type="text"
                placeholder="Nombre o DNI"
                title="Escriba nombre o DNI para filtrar usuarios"
                value={reportSearch}
                onChange={event => {
                  setReportSearch(event.target.value);
                  setReportPage(1);
                  setExpandedReportUserId(null);
                }}
              />
            </label>
            <label title="Fecha inicial del reporte">
              Inicio
              <Input
                type="date"
                title="Seleccione la fecha inicial del reporte"
                value={reportStartDate}
                onChange={event => setReportStartDate(event.target.value)}
              />
            </label>
            <label title="Fecha final del reporte">
              Fin
              <Input
                type="date"
                title="Seleccione la fecha final del reporte"
                value={reportEndDate}
                onChange={event => setReportEndDate(event.target.value)}
              />
            </label>
            <label title="Ordena los usuarios por el monto penalizable calculado">
              Ordenar monto
              <select
                value={reportTotalOrder}
                onChange={event => {
                  setReportTotalOrder(event.target.value as ReportTotalOrder);
                  setReportPage(1);
                  setExpandedReportUserId(null);
                }}
              >
                <option value="default">Normal</option>
                <option value="desc">Mayor monto</option>
                <option value="asc">Menor monto</option>
              </select>
            </label>
            <button
              type="button"
              title="Aplicar filtros al reporte"
              onClick={getFineReport}
            >
              Aplicar
            </button>
            <button
              type="button"
              title="Limpiar filtros y volver a mostrar todos los registros"
              onClick={clearReportFilters}
            >
              Limpiar
            </button>
            <button
              type="button"
              title="Abrir una vista previa PDF con los filtros actuales"
              onClick={() => setShowReportPdf(true)}
              disabled={filteredReportMatrix.length === 0}
            >
              Vista previa PDF
            </button>
            <PDFDownloadLink
              document={
                <ReportPdfDocument
                  data={reportPdfMatrix}
                  period={reportPeriodLabel}
                />
              }
              fileName={`Reporte de salidas - ${reportPeriodLabel}.pdf`}
              className={`lp-report-download${
                filteredReportMatrix.length === 0
                  ? ' lp-report-download-disabled'
                  : ''
              }`}
            >
              Descargar PDF
            </PDFDownloadLink>
          </section>
          <section className="lp-report-summary-grid">
            {REPORT_SUMMARY_OPTIONS.map(item => (
              <article
                className={`lp-report-card ${item.className}`}
                key={item.value}
                title={`${item.label}: ${
                  visibleReportSummary[item.value] ?? 0
                } registros. Multa referencial ${item.amount}`}
              >
                <span>{item.label}</span>
                <strong>{visibleReportSummary[item.value] ?? 0}</strong>
                <small>{item.amount}</small>
              </article>
            ))}
          </section>
          <section className="lp-report-table">
            <div className="lp-report-excel-title">
              Reporte de salidas - {reportPeriodLabel}
            </div>
            <div className="lp-report-row lp-report-head">
              <span>N°</span>
              <span>Apellidos y nombres</span>
              <span>DNI</span>
              <span>Celular</span>
              <span title={REPORT_ABBREVIATIONS.PUNTUAL.label}>
                {REPORT_ABBREVIATIONS.PUNTUAL.short}
              </span>
              <span title={REPORT_ABBREVIATIONS.TARDE.label}>
                {REPORT_ABBREVIATIONS.TARDE.short}
              </span>
              <span title={REPORT_ABBREVIATIONS.SIMPLE.label}>
                {REPORT_ABBREVIATIONS.SIMPLE.short}
              </span>
              <span title={REPORT_ABBREVIATIONS.GRAVE.label}>
                {REPORT_ABBREVIATIONS.GRAVE.short}
              </span>
              <span title={REPORT_ABBREVIATIONS.MUY_GRAVE.label}>
                {REPORT_ABBREVIATIONS.MUY_GRAVE.short}
              </span>
              <span title={REPORT_ABBREVIATIONS.PERMISO.label}>
                {REPORT_ABBREVIATIONS.PERMISO.short}
              </span>
              <span title={REPORT_ABBREVIATIONS.SALIDA.label}>
                {REPORT_ABBREVIATIONS.SALIDA.short}
              </span>
              <span title="Monto penalizable calculado para planilla">
                Monto penalizable
              </span>
              <span title="Ver el detalle de incidencias del usuario">
                Detalle
              </span>
            </div>
            {pagedReportMatrix.map((item, index) => {
              const punctualCount = item.counts.PUNTUAL ?? 0;
              const lateCount = item.counts.TARDE ?? 0;
              const simpleCount = item.counts.SIMPLE ?? 0;
              const graveCount = item.counts.GRAVE ?? 0;
              const criticalCount = item.counts.MUY_GRAVE ?? 0;
              const permitCount = item.counts.PERMISO ?? 0;
              const fieldCount = item.counts.SALIDA ?? 0;
              const allUserReportRows = getReportRowsByUser(item.usersId);
              const detailRows = getReportRowsByUser(
                item.usersId,
                reportDetailFine
              );
              const conciliationSummary = getReportConciliationSummary(
                item.usersId,
                item.total,
                allUserReportRows
              );
              const displayTotal = conciliationSummary.hasApplied
                ? conciliationSummary.finalAmount
                : item.total;
              const conciliationError = reportConciliationErrors[item.usersId];
              const totalToneClass =
                conciliationSummary.hasApplied && displayTotal > 0
                  ? 'lp-report-total-conciliated'
                  : displayTotal === 0
                  ? 'lp-report-total-zero'
                  : '';
              const totalTooltip = conciliationSummary.hasApplied
                ? `Monto conciliado confirmado: S/. ${conciliationSummary.finalAmount.toFixed(
                    2
                  )}. Monto penalizable original: S/. ${item.total.toFixed(2)}`
                : `Monto penalizable: S/. ${item.total.toFixed(2)}`;
              const isExpanded = expandedReportUserId === item.usersId;
              const detailToneClass =
                reportDetailFine === 'ALL'
                  ? 'lp-report-detail-panel-all'
                  : `lp-report-detail-panel-${reportDetailFine
                      .toLowerCase()
                      .replace('_', '-')}`;
              return (
                <div className="lp-report-user-block" key={item.usersId}>
                  <div className="lp-report-row">
                    <span>{reportFirstItem + index}</span>
                    <span title={item.name}>{item.name}</span>
                    <span>{item.dni ?? '---'}</span>
                    <span>{item.phone ?? '---'}</span>
                    <button
                      className="lp-report-cell-button lp-report-col-p"
                      type="button"
                      title={`${REPORT_ABBREVIATIONS.PUNTUAL.label}: ${punctualCount}. Ver detalle filtrado.`}
                      disabled={punctualCount === 0}
                      onClick={() =>
                        toggleReportDetail(item.usersId, 'PUNTUAL')
                      }
                    >
                      {punctualCount}
                    </button>
                    <button
                      className="lp-report-cell-button lp-report-col-t"
                      type="button"
                      title={`${REPORT_ABBREVIATIONS.TARDE.label}: ${lateCount}. Ver detalle filtrado.`}
                      disabled={lateCount === 0}
                      onClick={() => toggleReportDetail(item.usersId, 'TARDE')}
                    >
                      {lateCount}
                    </button>
                    <button
                      className="lp-report-cell-button lp-report-col-f"
                      type="button"
                      title={`${REPORT_ABBREVIATIONS.SIMPLE.label}: ${simpleCount}. Ver detalle filtrado.`}
                      disabled={simpleCount === 0}
                      onClick={() => toggleReportDetail(item.usersId, 'SIMPLE')}
                    >
                      {simpleCount}
                    </button>
                    <button
                      className="lp-report-cell-button lp-report-col-g"
                      type="button"
                      title={`${REPORT_ABBREVIATIONS.GRAVE.label}: ${graveCount}. Ver detalle filtrado.`}
                      disabled={graveCount === 0}
                      onClick={() => toggleReportDetail(item.usersId, 'GRAVE')}
                    >
                      {graveCount}
                    </button>
                    <button
                      className="lp-report-cell-button lp-report-col-m"
                      type="button"
                      title={`${REPORT_ABBREVIATIONS.MUY_GRAVE.label}: ${criticalCount}. Ver detalle filtrado.`}
                      disabled={criticalCount === 0}
                      onClick={() =>
                        toggleReportDetail(item.usersId, 'MUY_GRAVE')
                      }
                    >
                      {criticalCount}
                    </button>
                    <button
                      className="lp-report-cell-button lp-report-col-l"
                      type="button"
                      title={`${REPORT_ABBREVIATIONS.PERMISO.label}: ${permitCount}. Ver detalle filtrado.`}
                      disabled={permitCount === 0}
                      onClick={() =>
                        toggleReportDetail(item.usersId, 'PERMISO')
                      }
                    >
                      {permitCount}
                    </button>
                    <button
                      className="lp-report-cell-button lp-report-col-s"
                      type="button"
                      title={`${REPORT_ABBREVIATIONS.SALIDA.label}: ${fieldCount}. Ver detalle filtrado.`}
                      disabled={fieldCount === 0}
                      onClick={() => toggleReportDetail(item.usersId, 'SALIDA')}
                    >
                      {fieldCount}
                    </button>
                    <span
                      className={`lp-report-total ${
                        conciliationSummary.hasApplied
                          ? 'lp-report-total-adjusted'
                          : ''
                      } ${totalToneClass}`}
                      title={totalTooltip}
                    >
                      S/. {displayTotal.toFixed(2)}
                    </span>
                    <span>
                      <button
                        className="lp-report-detail-btn"
                        type="button"
                        title="Ver todas las incidencias de este usuario"
                        onClick={() => toggleReportDetail(item.usersId)}
                      >
                        {isExpanded && reportDetailFine === 'ALL'
                          ? 'Ocultar'
                          : 'Revisar'}
                      </button>
                    </span>
                  </div>
                  {isExpanded && (
                    <div
                      className={`lp-report-detail-panel ${detailToneClass}`}
                    >
                      <div className="lp-report-detail-title">
                        <strong>
                          {getReportDetailLabel(reportDetailFine)}
                        </strong>
                        <span>{detailRows.length} registros encontrados</span>
                      </div>
                      <div className="lp-report-conciliation">
                        <div className="lp-report-conciliation-summary">
                          <div>
                            <span>Monto penalizable</span>
                            <strong>S/. {item.total.toFixed(2)}</strong>
                          </div>
                          <div>
                            <span>
                              {conciliationSummary.hasApplied
                                ? 'Monto conciliado'
                                : 'Monto actual'}
                            </span>
                            <strong>
                              S/. {conciliationSummary.finalAmount.toFixed(2)}
                            </strong>
                          </div>
                          <div>
                            <span>Vista previa</span>
                            <strong>
                              S/. {conciliationSummary.previewAmount.toFixed(2)}
                            </strong>
                          </div>
                          <div>
                            <span>Estado</span>
                            <strong>
                              {conciliationSummary.hasPendingDraft
                                ? 'Cambios sin confirmar'
                                : conciliationSummary.hasApplied
                                ? 'Ajuste confirmado'
                                : 'Sin ajustes'}
                            </strong>
                          </div>
                        </div>
                        <div className="lp-report-conciliation-controls">
                          <label title="Monto final libre para este usuario">
                            Ajustar total
                            <input
                              type="number"
                              min="0"
                              max={item.total}
                              step="0.01"
                              placeholder="S/. 0.00"
                              value={conciliationSummary.draft.totalAmount}
                              onChange={event =>
                                updateReportTotalDraft(
                                  item.usersId,
                                  'totalAmount',
                                  event.target.value
                                )
                              }
                            />
                          </label>
                          <label title="Motivo administrativo del ajuste total">
                            Motivo
                            <input
                              type="text"
                              placeholder="Ej. sustento aprobado"
                              value={conciliationSummary.draft.totalReason}
                              onChange={event =>
                                updateReportTotalDraft(
                                  item.usersId,
                                  'totalReason',
                                  event.target.value
                                )
                              }
                            />
                          </label>
                          <button
                            type="button"
                            title="Volver al ultimo ajuste confirmado"
                            onClick={() => discardReportDraft(item.usersId)}
                            disabled={
                              !conciliationSummary.hasPendingDraft ||
                              savingReportConciliationUserId === item.usersId
                            }
                          >
                            Descartar cambios
                          </button>
                          <button
                            type="button"
                            title="Guardar oficialmente este ajuste para planilla"
                            onClick={() =>
                              confirmReportConciliation(item.usersId)
                            }
                            disabled={
                              !conciliationSummary.hasPendingDraft ||
                              savingReportConciliationUserId === item.usersId
                            }
                          >
                            {savingReportConciliationUserId === item.usersId
                              ? 'Guardando...'
                              : 'Confirmar ajuste'}
                          </button>
                          <button
                            type="button"
                            title="Anular el ajuste confirmado de este usuario"
                            onClick={() =>
                              clearReportConciliation(item.usersId)
                            }
                            disabled={
                              savingReportConciliationUserId === item.usersId ||
                              (!conciliationSummary.hasDraft &&
                                !conciliationSummary.hasApplied)
                            }
                          >
                            Limpiar
                          </button>
                        </div>
                        {conciliationError && (
                          <Alert
                            variant="warning"
                            className="lp-report-conciliation-alert"
                          >
                            <CircleAlert aria-hidden="true" />
                            <div>
                              <AlertTitle>Falta completar el ajuste</AlertTitle>
                              <AlertDescription>
                                {conciliationError}
                              </AlertDescription>
                            </div>
                          </Alert>
                        )}
                      </div>
                      <div className="lp-report-detail-grid">
                        <span>Fecha salida</span>
                        <span>Retorno previsto</span>
                        <span>Llegada real</span>
                        <span>Motivo</span>
                        <span>Resultado</span>
                        <span>Monto calculado</span>
                        <span>Conciliacion</span>
                        {detailRows.map(row => {
                          const detailType = normalizeReportDetailType(row);
                          const fineInfo = REPORT_ABBREVIATIONS[detailType];
                          const detailChipClass = `lp-report-detail-chip-${detailType
                            .toLowerCase()
                            .replace('_', '-')}`;
                          const detailAmount = row.fine
                            ? FINE_AMOUNT[row.fine] ?? 0
                            : 0;
                          const itemDraft = conciliationSummary.draft.items[
                            row.id
                          ] ?? {
                            amount: '',
                            reason: '',
                          };
                          return (
                            <div className="lp-report-detail-row" key={row.id}>
                              <span>{formatReportDateTime(row.startDate)}</span>
                              <span>{formatReportDateTime(row.untilDate)}</span>
                              <span>{formatReportDateTime(row.checkout)}</span>
                              <span title={row.reason ?? '---'}>
                                {parseReason(row.reason ?? '', row.type)}
                              </span>
                              <span>
                                <strong
                                  className={`lp-report-detail-chip ${detailChipClass}`}
                                >
                                  {fineInfo?.label ??
                                    (row.type === 'PERMISO'
                                      ? REPORT_ABBREVIATIONS.PERMISO.label
                                      : REPORT_ABBREVIATIONS.SALIDA.label)}
                                </strong>
                              </span>
                              <span
                                className={
                                  detailAmount > 0
                                    ? 'lp-report-detail-amount-danger'
                                    : 'lp-report-detail-amount'
                                }
                              >
                                S/. {detailAmount.toFixed(2)}
                              </span>
                              <span className="lp-report-detail-adjust">
                                <div>
                                  <input
                                    type="number"
                                    min="0"
                                    max={detailAmount}
                                    step="0.01"
                                    placeholder={detailAmount.toFixed(2)}
                                    value={itemDraft.amount}
                                    title="Monto final para esta incidencia"
                                    onChange={event =>
                                      updateReportItemDraft(
                                        item.usersId,
                                        row.id,
                                        'amount',
                                        event.target.value
                                      )
                                    }
                                  />
                                  <input
                                    type="text"
                                    placeholder="Motivo del ajuste"
                                    value={itemDraft.reason}
                                    title="Motivo del ajuste de esta incidencia"
                                    onChange={event =>
                                      updateReportItemDraft(
                                        item.usersId,
                                        row.id,
                                        'reason',
                                        event.target.value
                                      )
                                    }
                                  />
                                </div>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {detailRows.length === 0 && (
                        <div className="lp-report-detail-empty">
                          No hay registros para este filtro.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredReportMatrix.length === 0 && (
              <div className="lp-report-empty">
                No hay penalizaciones registradas para el periodo seleccionado.
              </div>
            )}
          </section>
          {filteredReportMatrix.length > REPORT_PAGE_SIZE && (
            <div
              className="lp-pagination lp-report-pagination"
              aria-label="Paginacion del reporte de salidas"
            >
              <button
                className="lp-pagination-btn"
                type="button"
                title="Pagina anterior"
                disabled={!canReportGoBack}
                onClick={() => setReportPage(prev => Math.max(prev - 1, 1))}
              >
                ‹
              </button>
              <span className="lp-pagination-title">
                <strong>
                  {reportFirstItem}-{reportLastItem}
                </strong>
                <span>de {filteredReportMatrix.length}</span>
              </span>
              <button
                className="lp-pagination-btn"
                type="button"
                title="Pagina siguiente"
                disabled={!canReportGoNext}
                onClick={() =>
                  setReportPage(prev => Math.min(prev + 1, reportTotalPages))
                }
              >
                ›
              </button>
            </div>
          )}
          {showReportPdf && (
            <div className="lp-report-pdf-modal">
              <div className="lp-report-pdf-dialog">
                <div className="lp-report-pdf-header">
                  <PDFDownloadLink
                    document={
                      <ReportPdfDocument
                        data={reportPdfMatrix}
                        period={reportPeriodLabel}
                      />
                    }
                    fileName={`Reporte de salidas - ${reportPeriodLabel}.pdf`}
                  >
                    Descargar pdf
                  </PDFDownloadLink>
                  <button
                    type="button"
                    title="Cerrar vista previa"
                    onClick={() => setShowReportPdf(false)}
                  >
                    ×
                  </button>
                </div>
                <PDFViewer className="lp-report-pdf-viewer">
                  <ReportPdfDocument
                    data={reportPdfMatrix}
                    period={reportPeriodLabel}
                  />
                </PDFViewer>
              </div>
            </div>
          )}
        </div>
      )}
      <CardLicense onSave={refreshCurrentLicenses} />
      {activeView === 'requests' && (
        <div className="lp-pagination" aria-label="Paginacion de salidas">
          <button
            className="lp-pagination-btn"
            type="button"
            title="Pagina anterior"
            disabled={!canGoBack}
            onClick={handlePreviusPage}
          >
            ‹
          </button>
          <span className="lp-pagination-title">
            <strong>
              {firstItem}-{lastItem}
            </strong>
            <span>de {total}</span>
          </span>
          <button
            className="lp-pagination-btn"
            type="button"
            title="Pagina siguiente"
            disabled={!canGoNext}
            onClick={handleNextPage}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};

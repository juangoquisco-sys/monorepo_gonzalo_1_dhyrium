import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileCheck2,
  History,
  ListChecks,
  LogOut,
  MessageCircle,
  Package,
  Plus,
  ShoppingBag,
  SlidersHorizontal,
  Search,
  Send,
  ShieldCheck,
  Store,
  Utensils,
  UploadCloud,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useSelector } from 'react-redux';
import { SocketContext } from '@/context/SocketContex';
import type { RootState } from '@/store/store.types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import type {
  GatePass,
  GateFineReport,
  GateFineReportRow,
  GateFineResult,
  GateFineSortAmount,
  GateRankingRow,
  GateReviewRequest,
  GateRuntimeStatus,
  GateSummary,
  GateUser,
} from './models/gateControl.types';
import {
  approvePendingGateLicense,
  approveGateReviewRequest,
  approvePendingGatePassReviews,
  createGatePass,
  createSelfServiceGatePass,
  directGatePenaltyAdjustment,
  getActiveGatePasses,
  getAuthorizedGateLicenses,
  getGatePassHistory,
  getGateFineReport,
  getGatePenaltyAdjustmentCandidates,
  getGateReviewRequests,
  getGateSummary,
  getGateTardinessRanking,
  getPendingGateLicenses,
  getMyActiveGatePasses,
  getMyGatePassHistory,
  markGatePassReturn,
  rejectGateReviewRequest,
  rejectPendingGatePassReviews,
  searchGateUsers,
  submitGateReviewRequest,
  upsertGateFineAdjustment,
  voidGateFineAdjustment,
} from './services/gateControl.service';

type GateControlView =
  | 'monitor'
  | 'regularizaciones'
  | 'historial'
  | 'mi-control';
type EvidenceMode = 'whatsapp' | 'file';

interface ReviewCase {
  passId: string;
  pass?: GatePass;
  user?: GateUser | null;
  requests: GateReviewRequest[];
  exitRequest?: GateReviewRequest;
  returnRequest?: GateReviewRequest;
  penaltyRequest?: GateReviewRequest;
}

interface GateControlProps {
  view: GateControlView;
}

const statusLabels: Record<GateRuntimeStatus, string> = {
  ACTIVE: 'Activo',
  NEAR_DUE: 'Por vencer',
  LATE: 'Tarde',
  RETURNED: 'Retornado',
  CANCELLED: 'Cancelado',
  PENDING_EXIT_REVIEW: 'Salida en revision',
  PENDING_RETURN_REVIEW: 'Llegada en revision',
  PENDING_REVIEW: 'Pendiente',
};

const selfServiceStatusText: Partial<Record<GateRuntimeStatus, string>> = {
  PENDING_REVIEW: 'Solicitud enviada, esperando revision del controlador',
  PENDING_EXIT_REVIEW: 'Salida enviada, esperando revision del controlador',
  PENDING_RETURN_REVIEW: 'Llegada enviada, esperando revision del controlador',
  RETURNED: 'Llegada registrada',
};

const gateFineLabels: Record<GateFineResult, string> = {
  PUNTUAL: 'Puntual',
  TARDE: 'Tardanza',
  SIMPLE: 'Falta simple',
  GRAVE: 'Falta grave',
  MUY_GRAVE: 'Falta muy grave',
};

const gateFineShortLabels: Record<GateFineResult, string> = {
  PUNTUAL: 'P',
  TARDE: 'T',
  SIMPLE: 'F',
  GRAVE: 'G',
  MUY_GRAVE: 'M',
};

const gateFineBaseAmounts: Record<GateFineResult, number> = {
  PUNTUAL: 0,
  TARDE: 0.5,
  SIMPLE: 2,
  GRAVE: 5,
  MUY_GRAVE: 10,
};

const gateFineOrder: GateFineResult[] = [
  'PUNTUAL',
  'TARDE',
  'SIMPLE',
  'GRAVE',
  'MUY_GRAVE',
];

const toMoneyNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value: unknown = 0) =>
  `S/. ${toMoneyNumber(value).toFixed(2)}`;

const fineSummaryCount = (
  report: GateFineReport | null,
  result: GateFineResult
) => toMoneyNumber(report?.summary?.[result]);

const fullName = (user?: GateUser | null) =>
  user?.profile
    ? `${user.profile.firstName} ${user.profile.lastName}`
    : user?.email || 'Usuario';

const initials = (user?: GateUser | null) => {
  const name = fullName(user);
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
};

const formatTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--';

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '---';

const formatLongDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '---';

const formatPenaltyDuration = (totalMinutes = 0) => {
  if (totalMinutes <= 0) return '0 min';
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [
    days ? `${days} d` : '',
    hours ? `${hours} h` : '',
    minutes ? `${minutes} min` : '',
  ].filter(Boolean);
  return parts.join(' ');
};

const remainingLabel = (pass: GatePass) => {
  if (!pass.dueAt || pass.actualReturnAt) return '--';
  const diff = new Date(pass.dueAt).getTime() - Date.now();
  const sign = diff < 0 ? '-' : '';
  const abs = Math.abs(diff);
  const minutes = Math.floor(abs / 60000);
  const seconds = Math.floor((abs % 60000) / 1000);
  return `${sign}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
    2,
    '0'
  )}`;
};

const nowLocalInput = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const controllerWhatsapp = '51922995272';
const quickReasons = [
  { label: 'Ir a la tienda', icon: Store },
  { label: 'Ir a recoger algo', icon: Package },
  { label: 'Comprar comida', icon: Utensils },
];

const GateControl = ({ view }: GateControlProps) => {
  const socket = useContext(SocketContext);
  const userSession = useSelector((state: RootState) => state.userSession);
  const [tick, setTick] = useState(Date.now());
  const [activePasses, setActivePasses] = useState<GatePass[]>([]);
  const [pendingLicenses, setPendingLicenses] = useState<GatePass[]>([]);
  const [authorizedLicenses, setAuthorizedLicenses] = useState<GatePass[]>([]);
  const [isPendingLicensesOpen, setIsPendingLicensesOpen] = useState(false);
  const [isAuthorizedLicensesOpen, setIsAuthorizedLicensesOpen] =
    useState(false);
  const [summary, setSummary] = useState<GateSummary | null>(null);
  const [ranking, setRanking] = useState<GateRankingRow[]>([]);
  const [reviewRequests, setReviewRequests] = useState<GateReviewRequest[]>([]);
  const [adjustablePasses, setAdjustablePasses] = useState<GatePass[]>([]);
  const [hasSearchedAdjustments, setHasSearchedAdjustments] = useState(false);
  const [history, setHistory] = useState<GatePass[]>([]);
  const [myPassHistory, setMyPassHistory] = useState<GatePass[]>([]);
  const [isMyHistoryOpen, setIsMyHistoryOpen] = useState(false);
  const [dismissedLatestPassId, setDismissedLatestPassId] = useState('');
  const [highlightedUserIndex, setHighlightedUserIndex] = useState(-1);
  const [query, setQuery] = useState('');
  const [userResults, setUserResults] = useState<GateUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<GateUser | null>(null);
  const [minutes, setMinutes] = useState(10);
  const [reason, setReason] = useState(quickReasons[0].label);
  const [isCustomReason, setIsCustomReason] = useState(false);
  const [fineReport, setFineReport] = useState<GateFineReport | null>(null);
  const [fineSearch, setFineSearch] = useState('');
  const [fineDateFrom, setFineDateFrom] = useState('');
  const [fineDateTo, setFineDateTo] = useState('');
  const [fineSortAmount, setFineSortAmount] =
    useState<GateFineSortAmount>('normal');
  const [expandedFineUserId, setExpandedFineUserId] = useState<number | null>(
    null
  );
  const [fineSavingUserId, setFineSavingUserId] = useState<number | null>(null);
  const [fineAdjustmentDrafts, setFineAdjustmentDrafts] = useState<
    Record<number, { amount: string; reason: string }>
  >({});
  const [adjustSearch, setAdjustSearch] = useState('');
  const [isAdjustmentPanelOpen, setIsAdjustmentPanelOpen] = useState(false);
  const [adjustPassId, setAdjustPassId] = useState('');
  const [adjustMinutes, setAdjustMinutes] = useState(1);
  const [adjustReason, setAdjustReason] = useState('');
  const [selfClaimedAt, setSelfClaimedAt] = useState(nowLocalInput());
  const [selfNote, setSelfNote] = useState('');
  const [selfFiles, setSelfFiles] = useState<File[]>([]);
  const [evidenceMode, setEvidenceMode] = useState<EvidenceMode>('whatsapp');
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [selfFeedback, setSelfFeedback] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [selectedPassId, setSelectedPassId] = useState('');

  const myActivePass = useMemo(
    () => activePasses.find(pass => pass.userId === userSession.id),
    [activePasses, userSession.id]
  );
  const historyMetrics = useMemo(() => {
    const returned = history.filter(pass => pass.status === 'RETURNED').length;
    const withPenalty = history.filter(pass => pass.finalPenaltyMinutes > 0);
    const totalPenaltyMinutes = withPenalty.reduce(
      (total, pass) => total + pass.finalPenaltyMinutes,
      0
    );
    return {
      total: history.length,
      returned,
      withPenalty: withPenalty.length,
      totalPenaltyMinutes,
    };
  }, [history]);
  const selectedAdjustPass = useMemo(
    () => adjustablePasses.find(pass => pass.id === adjustPassId),
    [adjustPassId, adjustablePasses]
  );
  const reviewCases = useMemo<ReviewCase[]>(() => {
    const grouped = reviewRequests.reduce<Record<string, ReviewCase>>(
      (accumulator, request) => {
        const passId = request.gatePassId;
        if (!accumulator[passId]) {
          accumulator[passId] = {
            passId,
            pass: request.gatePass,
            user: request.gatePass?.user,
            requests: [],
          };
        }
        accumulator[passId].requests.push(request);
        if (request.type === 'EXIT_REGULARIZATION') {
          accumulator[passId].exitRequest = request;
        }
        if (request.type === 'RETURN_REGULARIZATION') {
          accumulator[passId].returnRequest = request;
        }
        if (request.type === 'PENALTY_REDUCTION') {
          accumulator[passId].penaltyRequest = request;
        }
        return accumulator;
      },
      {}
    );
    return Object.values(grouped);
  }, [reviewRequests]);
  const hasPendingReturnRequest = Boolean(
    myActivePass?.reviewRequests?.some(
      request =>
        request.type === 'RETURN_REGULARIZATION' && request.status === 'PENDING'
    )
  );
  const latestOwnPass = myPassHistory[0] || null;
  const showLatestConfirmation = Boolean(
    latestOwnPass &&
      latestOwnPass.status === 'RETURNED' &&
      latestOwnPass.id !== dismissedLatestPassId &&
      (!myActivePass || latestOwnPass.id !== myActivePass.id)
  );

  const refreshMonitor = async () => {
    const [active, pending, authorized, currentSummary, currentRanking] =
      await Promise.all([
        getActiveGatePasses(),
        getPendingGateLicenses(),
        getAuthorizedGateLicenses(),
        getGateSummary(),
        getGateTardinessRanking(),
      ]);
    setActivePasses(active);
    setPendingLicenses(pending);
    setAuthorizedLicenses(authorized);
    setSummary(currentSummary);
    setRanking(currentRanking);
  };

  const refreshMyControl = async () => {
    const [active, ownHistory] = await Promise.all([
      getMyActiveGatePasses(),
      getMyGatePassHistory(),
    ]);
    setActivePasses(active);
    setMyPassHistory(ownHistory);
  };

  const refreshReviews = async () => {
    const requests = await getGateReviewRequests('PENDING');
    setReviewRequests(requests);
  };

  const refreshHistory = async () => {
    const [currentHistory, currentRanking, currentReport] = await Promise.all([
      getGatePassHistory({ search: fineSearch }),
      getGateTardinessRanking(),
      getGateFineReport({
        search: fineSearch,
        dateFrom: fineDateFrom,
        dateTo: fineDateTo,
        sortAmount: fineSortAmount,
      }),
    ]);
    setHistory(currentHistory);
    setRanking(currentRanking);
    setFineReport(currentReport);
  };

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (view === 'monitor') refreshMonitor();
    if (view === 'mi-control') refreshMyControl();
    if (view === 'regularizaciones') refreshReviews();
    if (view === 'historial') refreshHistory();
  }, [view]);

  useEffect(() => {
    if (view !== 'monitor') return;
    const refreshTimer = window.setInterval(() => {
      refreshMonitor();
    }, 30000);
    return () => window.clearInterval(refreshTimer);
  }, [view]);

  useEffect(() => {
    if (!socket?.on) return;

    const refreshBySocket = () => {
      if (view === 'monitor') refreshMonitor();
      if (view === 'mi-control') refreshMyControl();
      if (view === 'regularizaciones') refreshReviews();
      if (view === 'historial') refreshHistory();
      setSelfFeedback(null);
    };

    socket.on('server:gate-control-update', refreshBySocket);
    socket.on('server:license-update', refreshBySocket);
    return () => {
      socket.off('server:gate-control-update', refreshBySocket);
      socket.off('server:license-update', refreshBySocket);
    };
  }, [socket, view]);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      if (query.trim().length < 2) {
        setUserResults([]);
        setHighlightedUserIndex(-1);
        return;
      }
      const results = await searchGateUsers(query);
      setUserResults(results);
      setHighlightedUserIndex(results.length ? 0 : -1);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const selectGateUser = (user: GateUser) => {
    setSelectedUser(user);
    setQuery(fullName(user));
    setUserResults([]);
    setHighlightedUserIndex(-1);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!userResults.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedUserIndex(current =>
        current < userResults.length - 1 ? current + 1 : 0
      );
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedUserIndex(current =>
        current > 0 ? current - 1 : userResults.length - 1
      );
    }

    if (event.key === 'Enter' && highlightedUserIndex >= 0) {
      event.preventDefault();
      selectGateUser(userResults[highlightedUserIndex]);
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setUserResults([]);
      setHighlightedUserIndex(-1);
    }
  };

  const submitQuickPass = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedUser) {
      SnackbarUtilities.warning('Selecciona un usuario');
      return;
    }
    await createGatePass({
      userId: selectedUser.id,
      requestedMinutes: minutes,
      reason,
    });
    setSelectedUser(null);
    setQuery('');
    setReason(quickReasons[0].label);
    setHighlightedUserIndex(-1);
    await refreshMonitor();
  };

  const returnPass = async (passId: string) => {
    await markGatePassReturn(passId);
    await refreshMonitor();
  };

  const approvePendingLicense = async (pass: GatePass) => {
    if (!pass.licenseId) return;
    await approvePendingGateLicense(pass.licenseId);
    SnackbarUtilities.success('Solicitud autorizada desde Control de puerta');
    await refreshMonitor();
  };

  const resetEvidence = () => {
    setSelfNote('');
    setSelfFiles([]);
    setWhatsappSent(false);
    setEvidenceMode('whatsapp');
  };

  const whatsappUrl = (action: 'salida' | 'llegada') => {
    const passLabel = myActivePass
      ? `Salida ${formatTime(myActivePass.actualExitAt)} por ${
          myActivePass.requestedMinutes
        } min.`
      : `Permiso de ${minutes} min.`;
    const text = [
      `Hola Ing. Armando, soy ${fullName(userSession)}.`,
      `Estoy enviando evidencia de mi ${action} para Control de puerta.`,
      passLabel,
      selfNote ? `Motivo: ${selfNote}` : '',
    ]
      .filter(Boolean)
      .join(' ');
    return `https://wa.me/${controllerWhatsapp}?text=${encodeURIComponent(
      text
    )}`;
  };

  const openWhatsAppEvidence = (action: 'salida' | 'llegada') => {
    window.open(whatsappUrl(action), '_blank', 'noopener,noreferrer');
  };

  const evidenceTextNote = (fallback: string) =>
    evidenceMode === 'whatsapp'
      ? `Evidencia enviada por WhatsApp. ${fallback}`.trim()
      : fallback;

  const assertEvidenceReady = () => {
    if (evidenceMode === 'whatsapp' && !whatsappSent) {
      SnackbarUtilities.warning(
        'Confirma que enviaste la evidencia por WhatsApp'
      );
      return false;
    }
    if (evidenceMode === 'file' && !selfFiles.length) {
      SnackbarUtilities.warning('Adjunta una evidencia o usa WhatsApp');
      return false;
    }
    return true;
  };

  const submitReturnEvidence = async (event: FormEvent) => {
    event.preventDefault();
    const passId = selectedPassId || myActivePass?.id;
    if (!passId) {
      SnackbarUtilities.warning('No hay salida activa para regularizar');
      return;
    }
    if (hasPendingReturnRequest) {
      SnackbarUtilities.info('Tu llegada ya fue enviada para revision');
      return;
    }
    if (!assertEvidenceReady()) return;
    await submitGateReviewRequest(passId, {
      type: 'RETURN_REGULARIZATION',
      claimedEventAt: selfClaimedAt,
      reason: selfNote,
      textNote: evidenceTextNote(
        selfNote || 'Llegada declarada por el usuario'
      ),
      evidenceType: 'WHATSAPP_SCREENSHOT',
      files: evidenceMode === 'file' ? selfFiles : [],
    });
    resetEvidence();
    setSelectedPassId('');
    setSelfFeedback({
      title: 'Llegada enviada',
      description:
        'Tu solicitud de marcado de llegada fue enviada y queda pendiente de revision.',
    });
    await refreshMyControl();
  };

  const submitSelfExit = async (event: FormEvent) => {
    event.preventDefault();
    if (myActivePass) {
      SnackbarUtilities.warning('Ya tienes una salida activa');
      return;
    }
    if (!assertEvidenceReady()) return;
    await createSelfServiceGatePass({
      userId: userSession.id,
      requestedMinutes: minutes,
      reason: reason || 'Auto-registro sin controlador',
      claimedExitAt: nowLocalInput(),
      textNote: evidenceTextNote(selfNote || 'Salida declarada por el usuario'),
      evidenceType: 'WHATSAPP_SCREENSHOT',
      files: evidenceMode === 'file' ? selfFiles : [],
    });
    setReason('');
    setIsCustomReason(false);
    resetEvidence();
    setSelfFeedback({
      title: 'Salida enviada',
      description:
        'Tu auto-registro de salida fue enviado y queda pendiente de revision.',
    });
    await refreshMyControl();
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    setSelfFiles(Array.from(event.target.files || []));
  };

  const review = async (
    request: GateReviewRequest,
    decision: 'approve' | 'reject'
  ) => {
    const input = window.prompt(
      decision === 'approve'
        ? 'Notas de aprobacion o minutos a descontar si aplica'
        : 'Motivo de rechazo'
    );
    if (decision === 'approve') {
      const minutesToReduce =
        request.type === 'PENALTY_REDUCTION'
          ? Number(input || request.requestedReductionMinutes || 0)
          : undefined;
      await approveGateReviewRequest(request.id, {
        approvedReductionMinutes: minutesToReduce,
        reviewNotes: request.type === 'PENALTY_REDUCTION' ? '' : input || '',
      });
    } else {
      await rejectGateReviewRequest(request.id, { reviewNotes: input || '' });
    }
    await refreshReviews();
  };

  const reviewCase = async (
    item: ReviewCase,
    decision: 'approve' | 'reject'
  ) => {
    if (item.exitRequest || item.returnRequest) {
      const input = window.prompt(
        decision === 'approve'
          ? 'Notas de aprobacion del caso'
          : 'Motivo de rechazo del caso'
      );
      if (decision === 'approve') {
        await approvePendingGatePassReviews(item.passId, {
          reviewNotes: input || '',
        });
      } else {
        await rejectPendingGatePassReviews(item.passId, {
          reviewNotes: input || '',
        });
      }
      await refreshReviews();
      return;
    }

    if (item.penaltyRequest) {
      await review(item.penaltyRequest, decision);
    }
  };

  const submitDirectAdjustment = async (event: FormEvent) => {
    event.preventDefault();
    if (!adjustPassId) {
      SnackbarUtilities.warning('Selecciona una salida con penalidad');
      return;
    }
    if (!adjustReason.trim()) {
      SnackbarUtilities.warning('Registra el motivo del ajuste');
      return;
    }
    await directGatePenaltyAdjustment(adjustPassId, {
      reductionMinutes: adjustMinutes,
      reason: adjustReason,
    });
    setAdjustPassId('');
    setAdjustMinutes(1);
    setAdjustReason('');
    setIsAdjustmentPanelOpen(false);
    await refreshReviews();
  };

  const searchAdjustablePasses = async (event?: FormEvent) => {
    event?.preventDefault();
    setAdjustPassId('');
    setAdjustablePasses(await getGatePenaltyAdjustmentCandidates(adjustSearch));
    setHasSearchedAdjustments(true);
  };

  const fineDraftFor = (row: GateFineReportRow) =>
    fineAdjustmentDrafts[row.userId] || {
      amount: toMoneyNumber(row.adjustedAmount).toFixed(2),
      reason: row.adjustment?.reason || '',
    };

  const updateFineDraft = (
    row: GateFineReportRow,
    patch: Partial<{ amount: string; reason: string }>
  ) => {
    setFineAdjustmentDrafts(current => ({
      ...current,
      [row.userId]: {
        ...fineDraftFor(row),
        ...patch,
      },
    }));
  };

  const clearFineDraft = (userId: number) => {
    setFineAdjustmentDrafts(current => {
      const next = { ...current };
      delete next[userId];
      return next;
    });
  };

  const fineDraftState = (row: GateFineReportRow) => {
    const draft = fineDraftFor(row);
    const adjustedAmount = Number(draft.amount);
    const currentAmount = toMoneyNumber(row.adjustedAmount);
    const hasValidAmount = Number.isFinite(adjustedAmount);
    const hasAmountChange =
      hasValidAmount && Math.abs(adjustedAmount - currentAmount) > 0.009;
    const hasReasonChange =
      !!row.adjustment && draft.reason.trim() !== (row.adjustment.reason || '');
    return {
      draft,
      adjustedAmount,
      hasValidAmount,
      hasPendingChanges: hasAmountChange || hasReasonChange,
      previewAmount: hasValidAmount ? adjustedAmount : currentAmount,
    };
  };

  const applyFineFilters = async (event?: FormEvent) => {
    event?.preventDefault();
    const [report, currentHistory, currentRanking] = await Promise.all([
      getGateFineReport({
        search: fineSearch,
        dateFrom: fineDateFrom,
        dateTo: fineDateTo,
        sortAmount: fineSortAmount,
      }),
      getGatePassHistory({ search: fineSearch }),
      getGateTardinessRanking(),
    ]);
    setFineReport(report);
    setHistory(currentHistory);
    setRanking(currentRanking);
  };

  const resetFineFilters = async () => {
    setFineSearch('');
    setFineDateFrom('');
    setFineDateTo('');
    setFineSortAmount('normal');
    const [report, currentHistory, currentRanking] = await Promise.all([
      getGateFineReport({ sortAmount: 'normal' }),
      getGatePassHistory({ search: '' }),
      getGateTardinessRanking(),
    ]);
    setFineReport(report);
    setHistory(currentHistory);
    setRanking(currentRanking);
  };

  const confirmFineAdjustment = async (row: GateFineReportRow) => {
    const { draft, adjustedAmount, hasValidAmount, hasPendingChanges } =
      fineDraftState(row);
    if (!hasValidAmount || adjustedAmount < 0) {
      SnackbarUtilities.warning('Ingrese un monto valido');
      return;
    }
    if (adjustedAmount > toMoneyNumber(row.calculatedAmount)) {
      SnackbarUtilities.warning(
        'El monto conciliado no puede superar el monto calculado'
      );
      return;
    }
    if (!hasPendingChanges) {
      SnackbarUtilities.warning('No hay cambios para confirmar');
      return;
    }
    if (!draft.reason.trim()) {
      SnackbarUtilities.warning('Ingrese el motivo del ajuste');
      return;
    }
    setFineSavingUserId(row.userId);
    try {
      await upsertGateFineAdjustment({
        userId: row.userId,
        periodStart: fineDateFrom || null,
        periodEnd: fineDateTo || null,
        adjustedAmount,
        reason: draft.reason.trim(),
      });
      clearFineDraft(row.userId);
      SnackbarUtilities.success('Ajuste confirmado');
      await applyFineFilters();
    } catch (error) {
      if (error instanceof Error) SnackbarUtilities.warning(error.message);
      else SnackbarUtilities.error('No se pudo confirmar el ajuste');
    } finally {
      setFineSavingUserId(null);
    }
  };

  const voidFineAdjustment = async (row: GateFineReportRow) => {
    if (!row.adjustment) {
      clearFineDraft(row.userId);
      return;
    }
    setFineSavingUserId(row.userId);
    try {
      await voidGateFineAdjustment({
        adjustmentId: row.adjustment.id,
        reason: 'Ajuste retirado desde reporte de Control de puerta',
      });
      clearFineDraft(row.userId);
      SnackbarUtilities.success('Ajuste retirado');
      await applyFineFilters();
    } catch (error) {
      if (error instanceof Error) SnackbarUtilities.warning(error.message);
      else SnackbarUtilities.error('No se pudo retirar el ajuste');
    } finally {
      setFineSavingUserId(null);
    }
  };

  const monitorPasses = activePasses.map(pass => ({
    ...pass,
    _remaining: tick ? remainingLabel(pass) : remainingLabel(pass),
  }));

  const reviewCaseTitle = (item: ReviewCase) => {
    if (item.exitRequest && item.returnRequest)
      return 'Salida y llegada por validar';
    if (item.exitRequest) return 'Salida por validar';
    if (item.returnRequest) return 'Llegada por validar';
    return 'Reduccion de penalidad por validar';
  };

  const evidenceLabel = (request?: GateReviewRequest) => {
    if (!request) return 'Sin evidencia';
    if (
      request.evidences?.some(
        evidence => evidence.type === 'WHATSAPP_SCREENSHOT'
      )
    ) {
      return 'WhatsApp';
    }
    if (request.evidences?.some(evidence => evidence.filePath))
      return 'Archivo';
    if (request.evidences?.some(evidence => evidence.textNote)) return 'Nota';
    return 'Sin evidencia';
  };

  const renderReviewStep = (label: string, request?: GateReviewRequest) => (
    <div className="gateControl-reviewStep">
      <span>{label}</span>
      {request ? (
        <>
          <strong>{formatDateTime(request.claimedEventAt)}</strong>
          <small>
            {request.reason || request.evidences?.[0]?.textNote || 'Sin motivo'}
          </small>
          <em>{evidenceLabel(request)}</em>
        </>
      ) : (
        <>
          <strong>Pendiente</strong>
          <small>Sin solicitud registrada</small>
          <em>---</em>
        </>
      )}
    </div>
  );

  const renderEvidenceControls = (action: 'salida' | 'llegada') => (
    <div className="gateControl-evidenceBox">
      <div className="gateControl-evidenceModes">
        <button
          type="button"
          className={evidenceMode === 'whatsapp' ? 'is-selected' : ''}
          onClick={() => setEvidenceMode('whatsapp')}
        >
          <MessageCircle size={17} />
          WhatsApp
        </button>
        <button
          type="button"
          className={evidenceMode === 'file' ? 'is-selected' : ''}
          onClick={() => setEvidenceMode('file')}
        >
          <UploadCloud size={17} />
          Subir archivo
        </button>
      </div>
      {evidenceMode === 'whatsapp' ? (
        <div className="gateControl-whatsappEvidence">
          <button type="button" onClick={() => openWhatsAppEvidence(action)}>
            <Send size={17} />
            1. Enviar foto al WhatsApp
          </button>
          <label>
            <input
              type="checkbox"
              checked={whatsappSent}
              onChange={event => setWhatsappSent(event.target.checked)}
            />
            2. Confirmo que ya la envie
          </label>
        </div>
      ) : (
        <label>
          Evidencia
          <input type="file" multiple onChange={handleFiles} />
        </label>
      )}
    </div>
  );

  const ownPassResultText = (pass: GatePass) => {
    if (pass.status === 'RETURNED') {
      return pass.finalPenaltyMinutes > 0
        ? `${pass.finalPenaltyMinutes} min de tardanza`
        : 'Llegada puntual';
    }
    if (pass.status === 'CANCELLED') return 'Salida rechazada';
    return statusLabels[pass.runtimeStatus];
  };

  const latestPenaltyText = (pass: GatePass) =>
    pass.finalPenaltyMinutes > 0
      ? `${pass.finalPenaltyMinutes} min tardanza`
      : 'Llegada puntual';

  const movementSource = (pass: GatePass) =>
    pass.source === 'SELF_SERVICE' ? 'Mi Control' : 'Controlador';

  const historyStatusClass = (pass: GatePass) =>
    `gateControl-historyStatus gateControl-historyStatus--${pass.status.toLowerCase()}`;

  const monitorReasonIcon = (value?: string | null) => {
    const item = quickReasons.find(reasonItem => reasonItem.label === value);
    return item ? item.icon : ShoppingBag;
  };

  if (view === 'regularizaciones') {
    return (
      <main className="gateControl">
        <section className="gateControl-heading">
          <div>
            <span>Revision</span>
            <h2>Regularizaciones pendientes</h2>
          </div>
          <div className="gateControl-headingActions">
            <button
              onClick={() => setIsAdjustmentPanelOpen(true)}
              className="gateControl-secondaryAction"
            >
              <SlidersHorizontal size={17} />
              Ajuste directo
            </button>
            <button onClick={refreshReviews} className="gateControl-iconBtn">
              <FileCheck2 size={18} />
            </button>
          </div>
        </section>
        <section
          className={`gateControl-sidePanel ${
            isAdjustmentPanelOpen ? 'is-open' : ''
          }`}
          aria-hidden={!isAdjustmentPanelOpen}
        >
          <button
            type="button"
            className="gateControl-sidePanelBackdrop"
            onClick={() => setIsAdjustmentPanelOpen(false)}
          />
          <aside className="gateControl-sidePanelBody">
            <div className="gateControl-sidePanelTop">
              <div>
                <span>Ajuste directo</span>
                <h3>Reducir penalidad con sustento</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustmentPanelOpen(false)}
              >
                Cerrar
              </button>
            </div>
            <p className="gateControl-sidePanelHint">
              Busca una salida retornada con penalidad, selecciona el registro y
              deja el motivo del ajuste. Quedara auditado.
            </p>
            <form
              className="gateControl-adjustSearch"
              onSubmit={searchAdjustablePasses}
            >
              <label>
                Buscar persona
                <span>
                  Nombre, DNI o email. Solo muestra salidas cerradas con
                  penalidad.
                </span>
                <div>
                  <Search size={18} />
                  <input
                    value={adjustSearch}
                    onChange={event => setAdjustSearch(event.target.value)}
                    placeholder="Ej. Diego, 73520253"
                  />
                </div>
              </label>
              <button type="submit">Buscar salidas</button>
            </form>

            <div className="gateControl-adjustResults">
              {adjustablePasses.map(pass => {
                const currentPenalty =
                  pass.finalPenaltyMinutes || pass.originalPenaltyMinutes;
                return (
                  <button
                    key={pass.id}
                    type="button"
                    className={adjustPassId === pass.id ? 'is-selected' : ''}
                    onClick={() => {
                      setAdjustPassId(pass.id);
                      setAdjustMinutes(
                        Math.min(adjustMinutes, currentPenalty) || 1
                      );
                    }}
                  >
                    <strong>{fullName(pass.user)}</strong>
                    <span>
                      Retorno {formatDateTime(pass.actualReturnAt)} / salida{' '}
                      {formatTime(pass.actualExitAt)}
                    </span>
                    <small>
                      Penalidad actual: {currentPenalty} min
                      {pass.originalPenaltyMinutes !== pass.finalPenaltyMinutes
                        ? ` / original: ${pass.originalPenaltyMinutes} min`
                        : ''}
                    </small>
                  </button>
                );
              })}
              {hasSearchedAdjustments && !adjustablePasses.length && (
                <div className="gateControl-adjustEmpty">
                  No se encontraron salidas retornadas con penalidad para esa
                  busqueda.
                </div>
              )}
            </div>

            <form
              className="gateControl-adjustForm"
              onSubmit={submitDirectAdjustment}
            >
              <div className="gateControl-selectedPenalty">
                <span>Salida seleccionada</span>
                <strong>
                  {selectedAdjustPass
                    ? fullName(selectedAdjustPass.user)
                    : 'Selecciona una salida de la lista'}
                </strong>
                <small>
                  {selectedAdjustPass
                    ? `${
                        selectedAdjustPass.finalPenaltyMinutes ||
                        selectedAdjustPass.originalPenaltyMinutes
                      } min de penalidad actual`
                    : 'La reduccion se aplicara solo despues de elegir una salida.'}
                </small>
              </div>
              <label>
                Minutos
                <input
                  type="number"
                  min={1}
                  max={
                    selectedAdjustPass
                      ? selectedAdjustPass.finalPenaltyMinutes ||
                        selectedAdjustPass.originalPenaltyMinutes
                      : undefined
                  }
                  value={adjustMinutes}
                  onChange={event => setAdjustMinutes(+event.target.value)}
                />
              </label>
              <label className="gateControl-adjustReason">
                Motivo
                <input
                  value={adjustReason}
                  onChange={event => setAdjustReason(event.target.value)}
                  placeholder="Sustento del encargado"
                />
              </label>
              <button
                className="gateControl-primary"
                disabled={!selectedAdjustPass}
              >
                Reducir penalidad
              </button>
            </form>
          </aside>
        </section>
        <section className="gateControl-list">
          {reviewCases.map(item => (
            <article key={item.passId} className="gateControl-reviewCase">
              <div className="gateControl-reviewCaseHeader">
                <div>
                  <strong>{fullName(item.user)}</strong>
                  <span>{reviewCaseTitle(item)}</span>
                  <small>
                    {item.pass?.requestedMinutes || '--'} min permitidos /{' '}
                    {item.pass?.reason || 'Sin motivo general'}
                  </small>
                </div>
                <div className="gateControl-actions">
                  <button onClick={() => reviewCase(item, 'approve')}>
                    {item.exitRequest || item.returnRequest
                      ? 'Aprobar todo'
                      : 'Aprobar'}
                  </button>
                  <button onClick={() => reviewCase(item, 'reject')}>
                    {item.exitRequest || item.returnRequest
                      ? 'Rechazar todo'
                      : 'Rechazar'}
                  </button>
                </div>
              </div>
              <div className="gateControl-reviewTimeline">
                {item.penaltyRequest ? (
                  <div className="gateControl-reviewStep">
                    <span>Ajuste solicitado</span>
                    <strong>
                      {item.penaltyRequest.requestedReductionMinutes || 0} min
                    </strong>
                    <small>{item.penaltyRequest.reason || 'Sin motivo'}</small>
                    <em>{evidenceLabel(item.penaltyRequest)}</em>
                  </div>
                ) : (
                  <>
                    {renderReviewStep('Salida declarada', item.exitRequest)}
                    {renderReviewStep('Llegada declarada', item.returnRequest)}
                  </>
                )}
              </div>
            </article>
          ))}
          {!reviewCases.length && (
            <div className="gateControl-empty">
              No hay solicitudes pendientes.
            </div>
          )}
        </section>
      </main>
    );
  }

  if (view === 'historial') {
    return (
      <main className="gateControl gateControl-historyPage">
        <section className="gateControl-heading">
          <div>
            <span>Reporte</span>
            <h2>Reporte de control de puerta</h2>
          </div>
        </section>
        <section className="gateControl-fineReport">
          <div className="gateControl-fineReportTop">
            <div>
              <span>Reporte</span>
              <h3>Penalizaciones, historial y conciliacion</h3>
              <p>
                Consolidado monetario e historial de salidas cortas. Los ajustes
                no cambian el movimiento original.
              </p>
            </div>
            <form
              className="gateControl-fineFilters"
              onSubmit={applyFineFilters}
            >
              <label>
                Buscar usuario
                <input
                  value={fineSearch}
                  onChange={event => setFineSearch(event.target.value)}
                  placeholder="Nombre o DNI"
                />
              </label>
              <label>
                Inicio
                <input
                  type="date"
                  value={fineDateFrom}
                  onChange={event => setFineDateFrom(event.target.value)}
                />
              </label>
              <label>
                Fin
                <input
                  type="date"
                  value={fineDateTo}
                  onChange={event => setFineDateTo(event.target.value)}
                />
              </label>
              <label>
                Ordenar monto
                <select
                  value={fineSortAmount}
                  onChange={event =>
                    setFineSortAmount(event.target.value as GateFineSortAmount)
                  }
                >
                  <option value="normal">Normal</option>
                  <option value="desc">Mayor monto</option>
                  <option value="asc">Menor monto</option>
                </select>
              </label>
              <button type="submit" className="gateControl-primaryButton">
                Aplicar
              </button>
              <button
                type="button"
                className="gateControl-outlineButton"
                onClick={resetFineFilters}
              >
                Limpiar
              </button>
            </form>
          </div>

          <div className="gateControl-fineSummary">
            <article>
              <span>Movimientos revisados</span>
              <strong>{fineReport?.totalRecords || 0}</strong>
            </article>
            <article>
              <span>Usuarios evaluados</span>
              <strong>{fineReport?.usersCount || 0}</strong>
            </article>
            <article className="gateControl-fineSummary--danger">
              <span>Monto calculado</span>
              <strong>
                {formatMoney(fineReport?.summary.calculatedAmount || 0)}
              </strong>
            </article>
            <article className="gateControl-fineSummary--adjusted">
              <span>Monto confirmado</span>
              <strong>
                {formatMoney(fineReport?.summary.adjustedAmount || 0)}
              </strong>
            </article>
          </div>

          <div className="gateControl-fineCards">
            {gateFineOrder.map(result => (
              <article
                key={result}
                className={`gateControl-fineCard gateControl-fineCard--${result.toLowerCase()}`}
                title={`${gateFineLabels[result]} - Base ${formatMoney(
                  gateFineBaseAmounts[result]
                )}`}
              >
                <span>{gateFineLabels[result]}</span>
                <strong>{fineSummaryCount(fineReport, result)}</strong>
                <small>Base {formatMoney(gateFineBaseAmounts[result])}</small>
              </article>
            ))}
          </div>

          <div className="gateControl-fineTableWrap">
            <table className="gateControl-fineTable">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Apellidos y nombres</th>
                  <th>DNI</th>
                  <th>Celular</th>
                  {gateFineOrder.map(result => (
                    <th key={result} title={gateFineLabels[result]}>
                      {gateFineShortLabels[result]}
                    </th>
                  ))}
                  <th>Monto penalizable</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {(fineReport?.rows || []).map((row, index) => {
                  const isOpen = expandedFineUserId === row.userId;
                  const fineState = fineDraftState(row);
                  const { draft } = fineState;
                  const isSavingFine = fineSavingUserId === row.userId;
                  const calculatedAmount = toMoneyNumber(row.calculatedAmount);
                  const adjustedAmount = toMoneyNumber(row.adjustedAmount);
                  const hasAdjustedAmount =
                    Math.abs(adjustedAmount - calculatedAmount) > 0.009;
                  return (
                    <Fragment key={row.userId}>
                      <tr key={row.userId}>
                        <td>{index + 1}</td>
                        <td>{fullName(row.user)}</td>
                        <td>{row.user?.profile?.dni || '---'}</td>
                        <td>{row.user?.profile?.phone || '---'}</td>
                        {gateFineOrder.map(result => (
                          <td
                            key={result}
                            className={`gateControl-fineCount gateControl-fineCount--${result.toLowerCase()}`}
                            title={gateFineLabels[result]}
                          >
                            {row.counts[result]}
                          </td>
                        ))}
                        <td
                          className={
                            hasAdjustedAmount
                              ? 'gateControl-fineAmount gateControl-fineAmount--adjusted'
                              : adjustedAmount > 0
                              ? 'gateControl-fineAmount gateControl-fineAmount--danger'
                              : 'gateControl-fineAmount gateControl-fineAmount--zero'
                          }
                          title={
                            hasAdjustedAmount
                              ? `Calculado ${formatMoney(
                                  calculatedAmount
                                )} / confirmado ${formatMoney(
                                  row.adjustedAmount
                                )}`
                              : 'Monto confirmado'
                          }
                        >
                          {formatMoney(row.adjustedAmount)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="gateControl-detailButton"
                            onClick={() =>
                              setExpandedFineUserId(isOpen ? null : row.userId)
                            }
                          >
                            {isOpen ? 'Ocultar' : 'Revisar'}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="gateControl-fineDetailRow">
                          <td colSpan={11}>
                            <div className="gateControl-fineDetail">
                              <div className="gateControl-fineDetailSummary">
                                <article>
                                  <span>Monto calculado</span>
                                  <strong>
                                    {formatMoney(row.calculatedAmount)}
                                  </strong>
                                </article>
                                <article>
                                  <span>Monto confirmado</span>
                                  <strong>
                                    {formatMoney(row.adjustedAmount)}
                                  </strong>
                                </article>
                                <article>
                                  <span>Vista previa</span>
                                  <strong
                                    className={
                                      fineState.hasPendingChanges
                                        ? 'gateControl-finePreview--pending'
                                        : ''
                                    }
                                  >
                                    {formatMoney(fineState.previewAmount)}
                                  </strong>
                                </article>
                                <article>
                                  <span>Estado</span>
                                  <strong>
                                    {fineState.hasPendingChanges
                                      ? 'Cambios sin confirmar'
                                      : row.hasAdjustment
                                      ? 'Ajuste confirmado'
                                      : 'Sin ajuste'}
                                  </strong>
                                </article>
                              </div>
                              <p className="gateControl-fineDetailHint">
                                El monto confirmado nunca puede superar el monto
                                calculado. Use el motivo para dejar sustento de
                                auditoria.
                              </p>
                              <div className="gateControl-fineAdjustment">
                                <label>
                                  Ajustar total
                                  <input
                                    type="number"
                                    min="0"
                                    max={calculatedAmount}
                                    step="0.01"
                                    value={draft.amount}
                                    onChange={event =>
                                      updateFineDraft(row, {
                                        amount: event.target.value,
                                      })
                                    }
                                    onBlur={event => {
                                      const value = Number(event.target.value);
                                      if (
                                        Number.isFinite(value) &&
                                        value > calculatedAmount
                                      ) {
                                        updateFineDraft(row, {
                                          amount: calculatedAmount.toFixed(2),
                                        });
                                        SnackbarUtilities.warning(
                                          'El monto se ajusto al maximo permitido'
                                        );
                                      }
                                    }}
                                  />
                                </label>
                                <label>
                                  Motivo
                                  <input
                                    value={draft.reason}
                                    onChange={event =>
                                      updateFineDraft(row, {
                                        reason: event.target.value,
                                      })
                                    }
                                    placeholder="Sustento del ajuste"
                                  />
                                </label>
                                <button
                                  type="button"
                                  className="gateControl-primaryButton"
                                  onClick={() => confirmFineAdjustment(row)}
                                  disabled={
                                    isSavingFine || !fineState.hasPendingChanges
                                  }
                                >
                                  {isSavingFine
                                    ? 'Guardando...'
                                    : 'Guardar ajuste'}
                                </button>
                                <button
                                  type="button"
                                  className="gateControl-outlineButton"
                                  onClick={() => clearFineDraft(row.userId)}
                                  disabled={isSavingFine}
                                >
                                  Descartar cambios
                                </button>
                                <button
                                  type="button"
                                  className="gateControl-outlineButton gateControl-outlineButton--danger"
                                  onClick={() => voidFineAdjustment(row)}
                                  disabled={isSavingFine || !row.adjustment}
                                >
                                  Limpiar
                                </button>
                              </div>
                              <div className="gateControl-fineDetailTableWrap">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Fecha salida</th>
                                      <th>Retorno previsto</th>
                                      <th>Llegada real</th>
                                      <th>Motivo</th>
                                      <th>Resultado</th>
                                      <th>Tiempo</th>
                                      <th>Monto</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.details.map(detail => (
                                      <tr key={detail.passId}>
                                        <td>{formatDateTime(detail.exitAt)}</td>
                                        <td>{formatDateTime(detail.dueAt)}</td>
                                        <td>
                                          {formatDateTime(detail.returnAt)}
                                        </td>
                                        <td>{detail.reason || 'Sin motivo'}</td>
                                        <td>
                                          <span
                                            className={`gateControl-fineBadge gateControl-fineBadge--${detail.result.toLowerCase()}`}
                                          >
                                            {gateFineLabels[detail.result]}
                                          </span>
                                        </td>
                                        <td
                                          title={`${detail.penaltyMinutes} minutos penalizables`}
                                        >
                                          {formatPenaltyDuration(
                                            detail.penaltyMinutes
                                          )}
                                        </td>
                                        <td>{formatMoney(detail.amount)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {!(fineReport?.rows || []).length && (
                  <tr>
                    <td colSpan={11}>
                      <div className="gateControl-historyEmpty">
                        No hay penalizaciones registradas para el filtro actual.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="gateControl-historySummary">
          <article>
            <span>Movimientos vistos</span>
            <strong>{historyMetrics.total}</strong>
          </article>
          <article>
            <span>Retornados</span>
            <strong>{historyMetrics.returned}</strong>
          </article>
          <article className="gateControl-historySummary--warning">
            <span>Con penalidad</span>
            <strong>{historyMetrics.withPenalty}</strong>
          </article>
          <article className="gateControl-historySummary--danger">
            <span>Tiempo penalizable</span>
            <strong title={`${historyMetrics.totalPenaltyMinutes} minutos`}>
              {formatPenaltyDuration(historyMetrics.totalPenaltyMinutes)}
            </strong>
          </article>
        </section>
        <section className="gateControl-historyLayout">
          <aside className="gateControl-historyCard gateControl-historyRanking">
            <div className="gateControl-historyCardHeader">
              <div>
                <BarChart3 size={17} />
                <h3>Ranking de tardanzas</h3>
              </div>
            </div>
            <div className="gateControl-rankingList">
              {ranking.slice(0, 5).map((row, index) => (
                <article key={row.userId} className="gateControl-rankingRow">
                  <span className="gateControl-rankingPlace">{index + 1}</span>
                  <div>
                    <strong>{fullName(row.user)}</strong>
                    <em
                      title={`${row.finalPenaltyMinutes} minutos penalizables`}
                    >
                      {formatPenaltyDuration(row.finalPenaltyMinutes)} penalidad
                    </em>
                    <small>
                      {row.reducedPenaltyMinutes > 0
                        ? `Penalidad reducida en ${formatPenaltyDuration(
                            row.reducedPenaltyMinutes
                          )}`
                        : `${row.passesCount} salida(s) con incidencia`}
                      {row.forgiven ? ' / perdonado' : ''}
                    </small>
                  </div>
                </article>
              ))}
              {!ranking.length && (
                <div className="gateControl-historyEmpty">
                  No hay usuarios con penalidades registradas.
                </div>
              )}
              {ranking.length > 0 && ranking.length < 5 && (
                <div className="gateControl-historyEmpty gateControl-historyEmpty--soft">
                  No hay mas usuarios con penalidades registradas.
                </div>
              )}
            </div>
          </aside>

          <section className="gateControl-historyCard gateControl-movementsCard">
            <div className="gateControl-historyCardHeader">
              <div>
                <ListChecks size={17} />
                <h3>Ultimos movimientos</h3>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setFineSearch('');
                  const [currentHistory, currentRanking, report] =
                    await Promise.all([
                      getGatePassHistory({ search: '' }),
                      getGateTardinessRanking(),
                      getGateFineReport({
                        dateFrom: fineDateFrom,
                        dateTo: fineDateTo,
                        sortAmount: fineSortAmount,
                      }),
                    ]);
                  setHistory(currentHistory);
                  setRanking(currentRanking);
                  setFineReport(report);
                }}
              >
                Ver todos
              </button>
            </div>
            <div className="gateControl-movementList">
              {history.map(pass => (
                <article key={pass.id} className="gateControl-movementRow">
                  <span className="gateControl-avatar">
                    {initials(pass.user)}
                  </span>
                  <div className="gateControl-movementPerson">
                    <strong>{fullName(pass.user)}</strong>
                    <div>
                      <span className={historyStatusClass(pass)}>
                        {statusLabels[pass.runtimeStatus]}
                      </span>
                      <small>{movementSource(pass)}</small>
                      {pass.finalPenaltyMinutes > 0 && (
                        <small
                          className="gateControl-movementPenalty"
                          title={`${pass.finalPenaltyMinutes} minutos penalizables`}
                        >
                          {formatPenaltyDuration(pass.finalPenaltyMinutes)}
                        </small>
                      )}
                    </div>
                  </div>
                  <div className="gateControl-movementTime">
                    <strong>
                      {formatTime(pass.actualExitAt)} <span>{'->'}</span>{' '}
                      {formatTime(pass.actualReturnAt)}
                    </strong>
                    <small>
                      {formatLongDate(pass.actualReturnAt || pass.actualExitAt)}
                    </small>
                  </div>
                </article>
              ))}
              {!history.length && (
                <div className="gateControl-historyEmpty">
                  No hay movimientos para la busqueda actual.
                </div>
              )}
            </div>
          </section>
        </section>
      </main>
    );
  }

  if (view === 'mi-control') {
    return (
      <main className="gateControl gateControl--mobile gateControl-selfPage">
        <section className="gateControl-heading gateControl-selfHeading">
          <div>
            <span>Mi control</span>
            <h2>Salida rapida</h2>
          </div>
          <button
            type="button"
            className="gateControl-selfHistoryBtn"
            onClick={() => setIsMyHistoryOpen(value => !value)}
          >
            {isMyHistoryOpen ? <X size={19} /> : <History size={19} />}
          </button>
        </section>
        {isMyHistoryOpen && (
          <section className="gateControl-myHistoryPanel">
            <div className="gateControl-myHistoryTop">
              <History size={17} />
              <strong>Historial de salidas</strong>
            </div>
            {myPassHistory.map(pass => (
              <article key={pass.id}>
                <div>
                  <strong>{ownPassResultText(pass)}</strong>
                  <span>{pass.reason || 'Sin motivo'}</span>
                </div>
                <small>
                  {formatTime(pass.actualExitAt)} -{' '}
                  {formatTime(pass.actualReturnAt)}
                </small>
              </article>
            ))}
            {!myPassHistory.length && (
              <p>No tienes salidas registradas todavia.</p>
            )}
          </section>
        )}
        {selfFeedback && (
          <section className="gateControl-selfFeedback">
            <CheckCircle2 size={22} />
            <div>
              <strong>{selfFeedback.title}</strong>
              <span>{selfFeedback.description}</span>
            </div>
            <button type="button" onClick={() => setSelfFeedback(null)}>
              Cerrar
            </button>
          </section>
        )}
        {showLatestConfirmation && latestOwnPass && (
          <section className="gateControl-confirmedPass">
            <CheckCircle2 size={22} />
            <div>
              <strong>Llegada confirmada</strong>
              <span>El controlador marco tu retorno en puerta.</span>
              <div className="gateControl-confirmedSummary">
                <small>Resumen ultima salida</small>
                <strong>
                  {formatTime(latestOwnPass.actualExitAt)}
                  <span>{' -> '}</span>
                  {formatTime(latestOwnPass.actualReturnAt)}
                </strong>
                <em>
                  <ShoppingBag size={14} />
                  {latestOwnPass.reason || 'Sin motivo'} -{' '}
                  {latestPenaltyText(latestOwnPass)}
                </em>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDismissedLatestPassId(latestOwnPass.id)}
            >
              <X size={18} />
            </button>
          </section>
        )}
        {myActivePass && (
          <article className="gateControl-activeSelf">
            <span>
              {myActivePass.source === 'CONTROLLER'
                ? 'Permiso activo registrado por controlador'
                : selfServiceStatusText[myActivePass.runtimeStatus] ||
                  'Solicitud de salida enviada'}
            </span>
            <strong>{remainingLabel(myActivePass)}</strong>
            <small>
              {myActivePass.reason || 'Sin motivo'} / salida{' '}
              {formatTime(myActivePass.actualExitAt)}
            </small>
          </article>
        )}
        {myActivePass ? (
          hasPendingReturnRequest ||
          myActivePass.status === 'PENDING_RETURN_REVIEW' ? (
            <section className="gateControl-selfDone">
              <CheckCircle2 size={28} />
              <div>
                <strong>Llegada enviada para revision</strong>
                <span>
                  El controlador vera esta llegada junto con la salida asociada.
                </span>
              </div>
            </section>
          ) : (
            <form
              className="gateControl-form gateControl-flowCard"
              onSubmit={submitReturnEvidence}
            >
              <div>
                <span>Paso final</span>
                <h3>Ya llegue</h3>
                <small>
                  Si el controlador no esta, envia tu evidencia y queda
                  pendiente de aprobacion.
                </small>
              </div>
              <label>
                Hora declarada
                <input
                  type="datetime-local"
                  value={selfClaimedAt}
                  onChange={event => setSelfClaimedAt(event.target.value)}
                />
              </label>
              <label>
                Sustento
                <textarea
                  value={selfNote}
                  onChange={event => setSelfNote(event.target.value)}
                  placeholder="Ej. llegue a tiempo pero no habia controlador"
                />
              </label>
              {renderEvidenceControls('llegada')}
              <button className="gateControl-primary">Enviar llegada</button>
            </form>
          )
        ) : (
          <form className="gateControl-selfFlow" onSubmit={submitSelfExit}>
            <section className="gateControl-selfStep">
              <div className="gateControl-stepTitle">
                <span>1</span>
                <strong>Cuanto tiempo necesitas?</strong>
              </div>
              <div className="gateControl-durationCards">
                {[5, 10].map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMinutes(value)}
                    className={minutes === value ? 'is-selected' : ''}
                  >
                    <Clock size={23} />
                    <strong>{value} minutos</strong>
                  </button>
                ))}
              </div>
            </section>

            <section className="gateControl-selfStep">
              <div className="gateControl-stepTitle">
                <span>2</span>
                <strong>Motivo de salida</strong>
              </div>
              <div className="gateControl-reasonChips">
                {quickReasons.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      className={reason === item.label ? 'is-selected' : ''}
                      onClick={() => {
                        setReason(item.label);
                        setIsCustomReason(false);
                      }}
                    >
                      <Icon size={16} />
                      {item.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={isCustomReason ? 'is-selected' : ''}
                  onClick={() => {
                    setReason('');
                    setIsCustomReason(true);
                  }}
                >
                  <Plus size={16} />
                  Otro
                </button>
              </div>
              {isCustomReason && (
                <input
                  className="gateControl-otherReason"
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                  placeholder="Escribe el motivo"
                />
              )}
            </section>

            <section className="gateControl-evidenceNotice">
              <div>
                <AlertCircle size={18} />
                <div>
                  <strong>Controlador no presente</strong>
                  <span>Adjunta evidencia para que tu salida sea valida.</span>
                </div>
              </div>
              {renderEvidenceControls('salida')}
            </section>

            <div className="gateControl-selfFooter">
              <button className="gateControl-primary">
                <LogOut size={18} />
                Registrar mi salida
              </button>
            </div>
          </form>
        )}
      </main>
    );
  }

  return (
    <main className="gateControl gateControl-monitorPage">
      <section className="gateControl-heading gateControl-monitorHeading">
        <div>
          <span>Command center</span>
          <h2>
            Monitor de puerta
            <em />
          </h2>
        </div>
        <button onClick={refreshMonitor} className="gateControl-controllerMode">
          <ShieldCheck size={18} />
          Modo Controlador
        </button>
      </section>

      <section className="gateControl-monitorSummary">
        <article>
          <div>
            <span>Salidas hoy</span>
            <LogOut size={18} />
          </div>
          <strong>{summary?.todayPasses || 0}</strong>
        </article>
        <article className="is-outside">
          <div>
            <span>Personas fuera</span>
            <Users size={18} />
          </div>
          <strong>{summary?.outside || 0}</strong>
        </article>
        <article className="is-review">
          <div>
            <span>En revision</span>
            <FileCheck2 size={18} />
          </div>
          <strong>{summary?.pendingReviews || 0}</strong>
        </article>
        <article className="is-late">
          <div>
            <span>Tardanzas hoy</span>
            <History size={18} />
          </div>
          <strong>{summary?.lateReturns || 0}</strong>
        </article>
      </section>

      <form className="gateControl-monitorCreate" onSubmit={submitQuickPass}>
        <div className="gateControl-monitorCreateTop">
          <div className="gateControl-search">
            <Search size={20} />
            <input
              value={query}
              onChange={event => {
                setSelectedUser(null);
                setQuery(event.target.value);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar por DNI, Nombre o Email..."
            />
            {userResults.length > 0 && (
              <div className="gateControl-results">
                {userResults.map((user, index) => (
                  <button
                    type="button"
                    key={user.id}
                    className={
                      highlightedUserIndex === index ? 'is-highlighted' : ''
                    }
                    onMouseEnter={() => setHighlightedUserIndex(index)}
                    onClick={() => selectGateUser(user)}
                  >
                    <strong>{fullName(user)}</strong>
                    <span>{user.profile?.dni || user.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="gateControl-monitorPresets">
            {[5, 10].map(value => (
              <button
                key={value}
                type="button"
                onClick={() => setMinutes(value)}
                className={minutes === value ? 'is-selected' : ''}
              >
                {value} min
              </button>
            ))}
          </div>
          <button className="gateControl-primary gateControl-monitorAuthorize">
            <CheckCircle2 size={18} />
            Autorizar
          </button>
        </div>
        <div className="gateControl-monitorReasons">
          <span>Motivo:</span>
          {quickReasons.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className={reason === item.label ? 'is-selected' : ''}
                onClick={() => setReason(item.label)}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
          <label>
            <Plus size={15} />
            <input
              value={
                quickReasons.some(item => item.label === reason) ? '' : reason
              }
              onChange={event => setReason(event.target.value)}
              placeholder="Escribir otro..."
            />
          </label>
        </div>
      </form>

      <section className="gateControl-monitorSectionTitle gateControl-monitorSectionTitle--pending">
        <button
          type="button"
          className="gateControl-pendingToggle"
          aria-expanded={isPendingLicensesOpen}
          onClick={() => setIsPendingLicensesOpen(value => !value)}
        >
          <div>
            <div className="gateControl-pendingToggleTitle">
              <h3>Salidas pendientes</h3>
              <span>{pendingLicenses.length}</span>
            </div>
            <small>
              {pendingLicenses.length
                ? 'Solicitudes cercanas a su hora de salida'
                : 'Sin solicitudes por autorizar'}
            </small>
          </div>
          <ChevronDown
            size={18}
            className={isPendingLicensesOpen ? 'is-open' : ''}
          />
        </button>
      </section>

      {isPendingLicensesOpen && (
        <section className="gateControl-list gateControl-monitorList gateControl-monitorPendingList">
          {pendingLicenses.map(pass => (
            <article
              key={pass.id}
              className="gateControl-pendingRow"
              title="Solicitud pendiente en Salidas. Autorizar desde puerta aprueba la solicitud original."
            >
              <span className="gateControl-pendingAvatar">
                {initials(pass.user)}
              </span>
              <div className="gateControl-pendingInfo">
                <strong>{fullName(pass.user)}</strong>
                <div>
                  {(() => {
                    const Icon = monitorReasonIcon(pass.reason);
                    return (
                      <em>
                        <Icon size={12} />
                        {pass.reason || 'Sin motivo'}
                      </em>
                    );
                  })()}
                  <span className="gateControl-pendingLicenseBadge">
                    <FileCheck2 size={12} />
                    Pendiente en Salidas
                  </span>
                </div>
              </div>
              <div className="gateControl-pendingTimes">
                <span>Salida</span>
                <strong>{formatTime(pass.actualExitAt)}</strong>
                {pass.dueAt && <small>Retorno {formatTime(pass.dueAt)}</small>}
              </div>
              <button
                type="button"
                className="gateControl-monitorApprove gateControl-monitorApprove--compact"
                onClick={() => approvePendingLicense(pass)}
              >
                <CheckCircle2 size={16} />
                Autorizar
              </button>
            </article>
          ))}
          {!pendingLicenses.length && (
            <div className="gateControl-empty gateControl-empty--compact">
              No hay solicitudes pendientes cercanas.
            </div>
          )}
        </section>
      )}

      <section className="gateControl-monitorSectionTitle gateControl-monitorSectionTitle--pending">
        <button
          type="button"
          className="gateControl-pendingToggle gateControl-pendingToggle--authorized"
          aria-expanded={isAuthorizedLicensesOpen}
          onClick={() => setIsAuthorizedLicensesOpen(value => !value)}
        >
          <div>
            <div className="gateControl-pendingToggleTitle">
              <h3>Salidas autorizadas</h3>
              <span>{authorizedLicenses.length}</span>
            </div>
            <small>
              {authorizedLicenses.length
                ? 'Permisos aprobados que aun no inician'
                : 'Sin salidas autorizadas pendientes'}
            </small>
          </div>
          <ChevronDown
            size={18}
            className={isAuthorizedLicensesOpen ? 'is-open' : ''}
          />
        </button>
      </section>

      {isAuthorizedLicensesOpen && (
        <section className="gateControl-list gateControl-monitorList gateControl-monitorPendingList">
          {authorizedLicenses.map(pass => (
            <article
              key={pass.id}
              className="gateControl-pendingRow gateControl-pendingRow--authorized"
              title="Solicitud aprobada en Salidas. Pasara a Salidas en curso cuando llegue su hora programada."
            >
              <span className="gateControl-pendingAvatar gateControl-pendingAvatar--authorized">
                {initials(pass.user)}
              </span>
              <div className="gateControl-pendingInfo">
                <strong>{fullName(pass.user)}</strong>
                <div>
                  {(() => {
                    const Icon = monitorReasonIcon(pass.reason);
                    return (
                      <em>
                        <Icon size={12} />
                        {pass.reason || 'Sin motivo'}
                      </em>
                    );
                  })()}
                  <span className="gateControl-authorizedLicenseBadge">
                    <FileCheck2 size={12} />
                    Autorizada en Salidas
                  </span>
                </div>
              </div>
              <div className="gateControl-pendingTimes">
                <span>Salida</span>
                <strong>{formatTime(pass.actualExitAt)}</strong>
                {pass.dueAt && <small>Retorno {formatTime(pass.dueAt)}</small>}
              </div>
              <div className="gateControl-authorizedState">Por activarse</div>
            </article>
          ))}
          {!authorizedLicenses.length && (
            <div className="gateControl-empty gateControl-empty--compact">
              No hay salidas autorizadas pendientes.
            </div>
          )}
        </section>
      )}

      <section className="gateControl-monitorSectionTitle">
        <h3>Salidas en curso</h3>
        <span>{monitorPasses.length}</span>
      </section>

      <section className="gateControl-list gateControl-monitorList">
        {monitorPasses.map(pass => (
          <article
            key={pass.id}
            className={`gateControl-monitorRow gateControl-monitorRow--${
              pass.runtimeStatus
            } ${pass.licenseId ? 'gateControl-monitorRow--license' : ''}`}
            title={
              pass.licenseId
                ? 'Permiso aprobado en Salidas. Al marcar llegada se cerrara tambien en el modulo Salidas.'
                : 'Permiso rapido registrado desde Control de puerta.'
            }
          >
            <span className="gateControl-monitorAvatar">
              {initials(pass.user)}
            </span>
            <div className="gateControl-monitorPerson">
              <strong>{fullName(pass.user)}</strong>
              <div>
                {(() => {
                  const Icon = monitorReasonIcon(pass.reason);
                  return (
                    <em>
                      <Icon size={13} />
                      {pass.reason || 'Sin motivo'}
                    </em>
                  );
                })()}
                {pass.licenseId && (
                  <span className="gateControl-licenseBadge">
                    <FileCheck2 size={12} />
                    Desde Salidas
                  </span>
                )}
                <small>
                  Salida {formatTime(pass.actualExitAt)}
                  {pass.dueAt && (
                    <>
                      {' '}
                      <span className="gateControl-monitorMetaDot">•</span>{' '}
                      Retorno {formatTime(pass.dueAt)}
                    </>
                  )}{' '}
                  ({pass.requestedMinutes} min)
                </small>
              </div>
            </div>
            <div className="gateControl-monitorTimer">
              <span>
                {pass.runtimeStatus === 'LATE'
                  ? 'Tiempo excedido'
                  : 'Tiempo restante'}
              </span>
              <strong>{remainingLabel(pass)}</strong>
            </div>
            <button
              className="gateControl-monitorReturn"
              disabled={
                !['ACTIVE', 'PENDING_EXIT_REVIEW'].includes(pass.status)
              }
              onClick={() => returnPass(pass.id)}
            >
              <UserCheck size={18} />
              {pass.status === 'PENDING_EXIT_REVIEW'
                ? 'Confirmar llegada'
                : 'Marcar llegada'}
            </button>
          </article>
        ))}
        {!monitorPasses.length && (
          <div className="gateControl-empty">No hay personas fuera.</div>
        )}
      </section>
    </main>
  );
};

export default GateControl;

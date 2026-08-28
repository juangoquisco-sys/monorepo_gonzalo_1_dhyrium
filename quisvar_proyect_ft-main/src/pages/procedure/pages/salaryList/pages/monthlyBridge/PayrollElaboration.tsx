import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import type { ChangeEvent } from 'react';
import {
  FiChevronDown,
  FiChevronUp,
  FiDownload,
  FiEye,
  FiFileText,
  FiSearch,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import { PiArrowSquareOutFill, PiStampBold } from 'react-icons/pi';
import Button from '@/components/button/Button';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import TableNoData from '@/components/table/TableNoData';
import { axiosInstance } from '@/services/axiosInstance';
import { downloadBlob, formatAmountMoneyPEN } from '@/utils/tools';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { isOpenButtonDelete$ } from '@/services/sharingSubject';
import type {
  Office,
  PayMessages,
  PayrollResponse,
  Report,
  UserProfile,
} from '../interface/payroll.types';
import { handleProjectNavigate } from '../../../../../myTasks/tools/projectNavigation';
import AttendanceReconciliation from '../../../../../controlAttendance/AttendanceReconciliation';
import {
  ATTENDANCE_STATUS_FINE_AMOUNTS,
  ATTENDANCE_STATUS_LABELS,
} from '@/models/attendanceStatus';
import type { AttendanceStatus } from '@/models/attendanceStatus';
import { getPayrollUserFullName } from './payrollProfile.utils';
import './payrollMayBridge.css';

interface EvidenceTask {
  id: number;
  subTaskOnUserId?: number;
  name?: string;
  item?: string;
  status?: string;
  percentage?: number;
  price?: number;
  days?: number;
  taskInfo?: { name?: string };
}

interface EvidenceLevel {
  id: number;
  name?: string;
  item?: string;
  parentLevels?: string[];
  tasks: EvidenceTask[];
}

interface EvidenceStage {
  id: number;
  name: string;
  projectId?: number;
  levels: EvidenceLevel[];
}

interface EvidenceResponse {
  id: number;
  subprice: number;
  price: number;
  attendanceDiscount: number;
  licensesDiscount: number;
  earlyPaymentDiscount: number;
  percentage: number;
  isAuthorized: boolean;
  data: EvidenceStage[];
}

interface AdministrativeEvidenceTask {
  id: number;
  item: string;
  assignedAt: string;
  percentage: number;
  task: { name: string; status: string };
  project?: { name?: string | null };
  stage?: { name?: string | null };
  level?: { name?: string | null };
}

interface AdministrativeEvidenceResponse {
  data: AdministrativeEvidenceTask[];
}

type ReportEvidenceResult =
  | { kind: 'technical'; response: EvidenceResponse }
  | { kind: 'administrative'; response: AdministrativeEvidenceResponse };

interface WorkspaceLinkResponse {
  ok: boolean;
  unitId?: string;
  projectId: number;
  stageId: number;
  levelId: number;
  taskId: number;
  focusId?: string | null;
}

type PenaltyKind = 'attendance' | 'licenses';

interface PenaltyBucket {
  calculatedAmount: number;
  finalAmount: number;
  adjustedAmount: number;
  pendingCount: number;
  hasAdjustment: boolean;
}

interface PayrollPenaltySummaryItem {
  userId: number;
  attendance: PenaltyBucket;
  licenses: PenaltyBucket;
  totalAmount: number;
  calculatedAmount: number;
  adjustedAmount: number;
}

interface PayrollPenaltySummaryResponse {
  payrollId: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  hasPeriod: boolean;
  users: PayrollPenaltySummaryItem[];
}

type LicenseFineStatus = AttendanceStatus;

interface LicenseFineRow {
  id: number;
  usersId: number;
  reason?: string | null;
  type: 'PERMISO' | 'SALIDA';
  status: string;
  fine?: LicenseFineStatus | null;
  startDate: string;
  untilDate: string;
  checkout?: string | null;
}

interface LicensePenaltyAdjustment {
  id: string;
  scope: 'LICENSE' | 'USER_PERIOD';
  licenseId?: number | null;
  userId: number;
  adjustedAmount: number;
  reason: string;
}

interface LicenseFineReportResponse {
  rows: LicenseFineRow[];
  adjustments: {
    license: Record<number, LicensePenaltyAdjustment>;
    userPeriod: Record<number, LicensePenaltyAdjustment>;
  };
}

interface PayrollPenaltyUser {
  id: number;
  profile: UserProfile;
}

interface PenaltyPanelState {
  user: PayrollPenaltyUser;
  paymessage: PayMessages;
  tab: PenaltyKind;
}

const formatPayrollPeriodDate = (value?: string | null) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
};

const limaDateInputValue = (value?: string | Date | null) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const limaOffset = 5 * 60 * 60 * 1000;
  return new Date(date.getTime() - limaOffset).toISOString().slice(0, 10);
};

const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const reportDiscount = (report: Report) =>
  Number(report.attendanceDiscount || 0) +
  Number(report.licensesDiscount || 0) +
  Number(report.earlyPaymentDiscount || 0);
const reportRequestedAmount = (report: Report) =>
  Number(report.subprice || report.price || 0);
const reportPaymentBase = (report: Report) =>
  Math.max(Number(report.price || 0) + reportDiscount(report), 0) ||
  reportRequestedAmount(report);

const fineAmount = ATTENDANCE_STATUS_FINE_AMOUNTS;

const fineLabel: Record<LicenseFineStatus, string> = ATTENDANCE_STATUS_LABELS;

const evidenceTasks = (data?: EvidenceStage[]) =>
  (data || []).flatMap(stage =>
    stage.levels.flatMap(level =>
      level.tasks.map(task => ({
        ...task,
        stage,
        level,
      }))
    )
  );

const isAdministrativeReport = (report: Report) =>
  report.name.toLowerCase().includes('administrativo') ||
  (!report.task?.length &&
    (Boolean(report.basictask?.length) ||
      Boolean(report.operationalTasks?.length)));

const ReportEvidence = ({
  reportId,
  payrollId,
  preferredUnitId,
  report,
  onSaved,
}: {
  reportId: number;
  payrollId: number;
  preferredUnitId?: string;
  report: Report;
  onSaved: () => void;
}) => {
  const navigate = useNavigate();
  const isAdministrative = isAdministrativeReport(report);
  const [navigatingTaskId, setNavigatingTaskId] = useState<number | null>(null);
  const [taskAmounts, setTaskAmounts] = useState<Record<number, string>>({});
  const evidenceQuery = useQuery({
    queryKey: ['payrollElaborationEvidence', reportId, isAdministrative],
    queryFn: async (): Promise<ReportEvidenceResult> => {
      const requestConfig = {
        params: {
          mods: true,
          userinfo: true,
          evidence: isAdministrative ? 'administrative' : 'technical',
        },
        headers: { noLoader: true },
      };
      if (isAdministrative) {
        const { data } =
          await axiosInstance.get<AdministrativeEvidenceResponse>(
            `/reports/${reportId}`,
            requestConfig
          );
        return { kind: 'administrative', response: data };
      }
      const { data } = await axiosInstance.get<EvidenceResponse>(
        `/reports/${reportId}`,
        requestConfig
      );
      return { kind: 'technical', response: data };
    },
  });

  const technicalEvidence =
    evidenceQuery.data?.kind === 'technical'
      ? evidenceQuery.data.response
      : undefined;

  const tasks = useMemo(
    () => evidenceTasks(technicalEvidence?.data),
    [technicalEvidence?.data]
  );

  const elaboratedSubtotal = useMemo(
    () =>
      tasks.reduce((total, task) => {
        const key = task.subTaskOnUserId || task.id;
        const currentValue = taskAmounts[key];
        return total + Number(currentValue ?? task.price ?? 0);
      }, 0),
    [taskAmounts, tasks]
  );

  const elaboratedTotal = Math.max(
    elaboratedSubtotal - reportDiscount(report),
    0
  );

  const saveValuationMutation = useMutation({
    mutationFn: async () => {
      const ids = tasks.flatMap(task => {
        if (!task.subTaskOnUserId) return [];
        const key = task.subTaskOnUserId;
        const price = Number(taskAmounts[key] ?? task.price ?? 0);
        return [
          {
            id: task.subTaskOnUserId,
            percentage: Number(task.percentage ?? 100),
            price,
            days: Number(task.days || 0),
            priceTask: price,
          },
        ];
      });
      const { data } = await axiosInstance.put(
        `/reports/update-items/${reportId}`,
        {
          subtotal: elaboratedSubtotal,
          total: elaboratedTotal,
          licensesDiscount: Number(report.licensesDiscount || 0),
          attendanceDiscount: Number(report.attendanceDiscount || 0),
          earlyPaymentDiscount: Number(report.earlyPaymentDiscount || 0),
          percentagePayment: Number(report.percentage || 100),
          isAuthorized: report.isAuthorized,
          preserveRequestedAmount: true,
          ids,
        },
        { headers: { noLoader: true } }
      );
      return data;
    },
    onSuccess: () => {
      SnackbarUtilities.success('Valorización actualizada');
      evidenceQuery.refetch();
      onSaved();
    },
  });

  const handleTaskAmountChange = (
    task: EvidenceTask,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const key = task.subTaskOnUserId || task.id;
    setTaskAmounts(current => ({ ...current, [key]: event.target.value }));
  };

  const handleTaskPreview = (taskId: number) => {
    navigate(
      `/centro-de-usuarios/planillas/${payrollId}/elaboracion/tarea/${taskId}`
    );
  };

  const handleWorkspaceTaskNavigate = async ({
    stage,
    level,
    task,
  }: {
    stage: EvidenceStage;
    level: EvidenceLevel;
    task: EvidenceTask;
  }) => {
    setNavigatingTaskId(task.id);
    try {
      const { data } = await axiosInstance.get<WorkspaceLinkResponse>(
        `/payrolls/monthly-bridge/tasks/${task.id}/workspace-link`,
        {
          params: { preferredUnitId },
          headers: { noLoader: true },
        }
      );

      if (data.ok && data.unitId) {
        const params = new URLSearchParams({
          tab: 'proyectos',
          phase: 'trabajo-tecnico',
          unitId: data.unitId,
          projectId: String(data.projectId),
          stageId: String(data.stageId),
          levelId: String(data.levelId || level.id),
          taskId: String(data.taskId),
          openTask: '1',
        });
        if (data.focusId) params.set('focusId', data.focusId);
        navigate(`/grupos/oficinas/workspace?${params.toString()}`);
        return;
      }

      SnackbarUtilities.warning(
        'No se encontro una unidad de organigrama para esta tarea. Se abrira la vista legacy.'
      );
      if (stage.projectId)
        handleProjectNavigate(stage.projectId, stage.id, task.id);
    } catch {
      SnackbarUtilities.warning(
        'No se pudo abrir en Oficinas y reuniones. Se abrira la vista legacy.'
      );
      if (stage.projectId)
        handleProjectNavigate(stage.projectId, stage.id, task.id);
    } finally {
      setNavigatingTaskId(null);
    }
  };

  if (evidenceQuery.isLoading) return <LoaderForComponent />;
  if (isAdministrative) {
    const adminTasks =
      evidenceQuery.data?.kind === 'administrative'
        ? evidenceQuery.data.response.data
        : [];
    return (
      <div className="payrollElaboration-evidence payrollElaboration-adminEvidence">
        <div className="payrollElaboration-valuationSummary">
          <span>
            Solicitado/ref.{' '}
            {formatAmountMoneyPEN(reportRequestedAmount(report))}
          </span>
          <strong>
            Base administrativa{' '}
            {formatAmountMoneyPEN(reportPaymentBase(report))}
          </strong>
          <strong>
            Total a pagar{' '}
            {formatAmountMoneyPEN(
              Math.max(reportPaymentBase(report) - reportDiscount(report), 0)
            )}
          </strong>
        </div>
        {!adminTasks.length && (
          <section className="payrollSelfSubmission-adminEmpty">
            Este informe administrativo no tiene tareas del periodo adjuntas.
          </section>
        )}
        {adminTasks.map(task => (
          <article key={task.id} className="payrollElaboration-adminTask">
            <div>
              <strong>
                {task.item} {task.task.name}
              </strong>
              <span>
                {task.project?.name || 'Sin proyecto'} ·{' '}
                {task.stage?.name || 'Sin etapa'} ·{' '}
                {task.level?.name || 'Sin nivel'}
              </span>
            </div>
            <small>
              {formatPayrollPeriodDate(task.assignedAt)} ·{' '}
              {task.percentage || 0}% · {task.task.status}
            </small>
          </article>
        ))}
      </div>
    );
  }
  if (!technicalEvidence?.data.length) return <TableNoData />;

  return (
    <div className="payrollElaboration-evidence">
      <div className="payrollElaboration-valuationSummary">
        <span>
          Solicitado/ref. {formatAmountMoneyPEN(reportRequestedAmount(report))}
        </span>
        <strong>Suma tareas {formatAmountMoneyPEN(elaboratedSubtotal)}</strong>
        <strong>Total a pagar {formatAmountMoneyPEN(elaboratedTotal)}</strong>
      </div>
      {technicalEvidence.data.map(stage => (
        <section key={stage.id} className="payrollMayBridge-stage">
          <h2>{stage.name}</h2>
          {stage.levels.map(level => (
            <div key={level.id} className="payrollMayBridge-level">
              <h3>{level.parentLevels?.join(' / ') || level.name}</h3>
              {level.tasks.map(task => (
                <div
                  key={task.subTaskOnUserId || task.id}
                  className="payrollElaboration-task"
                >
                  <span>
                    {task.item} {task.taskInfo?.name || task.name}
                  </span>
                  <label className="payrollElaboration-taskAmount">
                    <span>S/.</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        taskAmounts[task.subTaskOnUserId || task.id] ??
                        String(Number(task.price || 0).toFixed(2))
                      }
                      disabled={
                        report.isAuthorized || saveValuationMutation.isPending
                      }
                      onChange={event => handleTaskAmountChange(task, event)}
                      onBlur={() => saveValuationMutation.mutate()}
                      onFocus={event => event.target.select()}
                      aria-label={`Monto de ${task.item} ${
                        task.taskInfo?.name || task.name
                      }`}
                    />
                  </label>
                  <small>
                    {task.percentage ?? 0}% - {task.status || 'SIN ESTADO'}
                  </small>
                  <div className="payrollElaboration-taskActions">
                    <button
                      type="button"
                      onClick={() => handleTaskPreview(task.id)}
                      title="Ver tarea"
                      aria-label={`Ver tarea ${task.item} ${
                        task.taskInfo?.name || task.name
                      }`}
                    >
                      <FiEye size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleWorkspaceTaskNavigate({ stage, level, task })
                      }
                      disabled={navigatingTaskId === task.id}
                      title="Abrir en Oficinas y reuniones"
                      aria-label={`Abrir en Oficinas y reuniones la tarea ${
                        task.item
                      } ${task.taskInfo?.name || task.name}`}
                    >
                      <PiArrowSquareOutFill size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
};

const PayrollElaboration = () => {
  const { salaryId, taskId } = useParams();
  const navigate = useNavigate();
  const activePayrollId = Number(salaryId || 0);
  const [expandedReports, setExpandedReports] = useState<
    Record<number, boolean>
  >({});
  const [fineValues, setFineValues] = useState<Record<number, string>>({});
  const [baseValues, setBaseValues] = useState<Record<number, string>>({});
  const [penaltyPanel, setPenaltyPanel] = useState<PenaltyPanelState | null>(
    null
  );
  const [orgUnitId, setOrgUnitId] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const payrollQuery = useQuery({
    queryKey: ['payrollElaboration', activePayrollId],
    queryFn: async () => {
      const { data } = await axiosInstance.get<PayrollResponse>(
        `/payrolls/${activePayrollId}`,
        {
          params: { isAuthorizedGrop: false, paymessageStatus: 'PROCESO' },
          headers: { noLoader: true },
        }
      );
      return data;
    },
    enabled: Boolean(activePayrollId),
  });

  const salary = payrollQuery.data;
  const payrollPeriodRange = useMemo(() => {
    if (!salary?.periodStart || !salary?.periodEnd) return null;
    return {
      dateFrom: limaDateInputValue(salary.periodStart),
      dateTo: limaDateInputValue(salary.periodEnd),
    };
  }, [salary?.periodEnd, salary?.periodStart]);
  const payrollUserIds = useMemo(() => {
    const ids = new Set<number>();
    salary?.offices.forEach(office =>
      office.payMessages.forEach(paymessage => {
        const userId = paymessage.userInit?.user?.id;
        if (userId) ids.add(userId);
      })
    );
    return Array.from(ids);
  }, [salary?.offices]);

  const orgUnitOptions = useMemo(
    () =>
      (salary?.offices || []).map(office => ({
        id: String(office.id),
        name: office.name,
        count: office.payMessages.length,
      })),
    [salary?.offices]
  );

  const filteredOffices = useMemo(() => {
    const search = normalizeSearch(userSearch);
    return (salary?.offices || [])
      .filter(office => !orgUnitId || String(office.id) === orgUnitId)
      .map(office => ({
        ...office,
        payMessages: office.payMessages.filter(paymessage => {
          if (!search) return true;
          const profile = paymessage.userInit?.user?.profile;
          const fullName = profile
            ? normalizeSearch(getPayrollUserFullName({ profile }))
            : '';
          const dni = normalizeSearch(profile?.dni || '');
          const header = normalizeSearch(paymessage.header || '');
          return (
            fullName.includes(search) ||
            dni.includes(search) ||
            header.includes(search)
          );
        }),
      }))
      .filter(office => office.payMessages.length);
  }, [orgUnitId, salary?.offices, userSearch]);

  const visibleReports = useMemo(
    () =>
      filteredOffices.reduce(
        (total, office) =>
          total +
          office.payMessages.reduce(
            (officeTotal, paymessage) =>
              officeTotal + paymessage.reports.length,
            0
          ),
        0
      ),
    [filteredOffices]
  );

  const penaltySummaryQuery = useQuery({
    queryKey: [
      'payrollElaborationPenaltySummary',
      activePayrollId,
      payrollUserIds,
    ],
    queryFn: async () => {
      const { data } = await axiosInstance.get<PayrollPenaltySummaryResponse>(
        `/payrolls/${activePayrollId}/penalties/summary`,
        {
          params: { userIds: payrollUserIds.join(',') },
          headers: { noLoader: true },
        }
      );
      return data;
    },
    enabled: Boolean(activePayrollId && payrollUserIds.length),
  });

  const getZipFilename = (headers: Record<string, unknown>) => {
    const disposition = headers['content-disposition'];
    if (typeof disposition === 'string') {
      const match = disposition.match(/filename="?([^"]+)"?/i);
      if (match?.[1]) return match[1];
    }
    return `evidencias-planilla-${Date.now()}.zip`;
  };

  const fetchReportSubTaskIds = async (reportId: number) => {
    const { data } = await axiosInstance.get<EvidenceResponse>(
      `/reports/${reportId}`,
      {
        params: { mods: true, userinfo: true, evidence: 'technical' },
        headers: { noLoader: true },
      }
    );
    return evidenceTasks(data.data)
      .map(task => task.subTaskOnUserId)
      .filter((id): id is number => Boolean(id));
  };

  const downloadZipMutation = useMutation({
    mutationFn: async (paymessage: PayMessages) => {
      const reportIds = paymessage.reports.map(report => report.id);
      const nestedTaskIds = await Promise.all(
        reportIds.map(fetchReportSubTaskIds)
      );
      const subTaskOnUserIds = Array.from(new Set(nestedTaskIds.flat()));
      if (!subTaskOnUserIds.length) {
        throw new Error(
          'Este usuario no tiene tareas técnicas con archivos para comprimir'
        );
      }
      const response = await axiosInstance.post<Blob>(
        '/payrolls/monthly-bridge/download-zip',
        { subTaskOnUserIds },
        {
          responseType: 'blob',
          headers: { noLoader: true },
        }
      );
      return {
        blob: response.data,
        filename: getZipFilename(response.headers as Record<string, unknown>),
      };
    },
    onSuccess: ({ blob, filename }) => {
      downloadBlob(blob, filename);
      SnackbarUtilities.success('ZIP generado correctamente');
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error ? error.message : 'No se pudo descargar el ZIP'
      );
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({
      report,
      subtotal,
      attendanceDiscount,
    }: {
      report: Report;
      subtotal?: number;
      attendanceDiscount?: number;
    }) => {
      const nextSubtotal = subtotal ?? reportPaymentBase(report);
      const nextAttendanceDiscount =
        attendanceDiscount ?? Number(report.attendanceDiscount || 0);
      const total = Math.max(
        nextSubtotal -
          nextAttendanceDiscount -
          Number(report.licensesDiscount || 0) -
          Number(report.earlyPaymentDiscount || 0),
        0
      );
      const { data } = await axiosInstance.put(
        `/reports/update-items/${report.id}`,
        {
          subtotal: nextSubtotal,
          total,
          licensesDiscount: Number(report.licensesDiscount || 0),
          attendanceDiscount: nextAttendanceDiscount,
          earlyPaymentDiscount: Number(report.earlyPaymentDiscount || 0),
          percentagePayment: Number(report.percentage || 100),
          isAuthorized: report.isAuthorized,
          preserveRequestedAmount: true,
        },
        { headers: { noLoader: true } }
      );
      return data;
    },
    onSuccess: () => {
      SnackbarUtilities.success('Informe actualizado');
      payrollQuery.refetch();
    },
    onError: () => SnackbarUtilities.error('No se pudo guardar el informe'),
  });

  const authorizeReportMutation = useMutation({
    mutationFn: async ({
      reportId,
      isAuthorized,
    }: {
      reportId: number;
      isAuthorized: boolean;
    }) => {
      const { data } = await axiosInstance.put(
        `/payrolls/step-authorized-items/${reportId}`,
        { isAuthorized },
        { headers: { noLoader: true } }
      );
      return data;
    },
    onSuccess: () => payrollQuery.refetch(),
    onError: () =>
      SnackbarUtilities.error('No se pudo actualizar la conformidad'),
  });

  const authorizeGroupMutation = useMutation({
    mutationFn: async (office: Office) => {
      const { data } = await axiosInstance.put(
        '/payrolls/step-authorized-group',
        { officeId: office.id, payrollId: activePayrollId },
        { headers: { noLoader: true } }
      );
      return data;
    },
    onSuccess: () => {
      SnackbarUtilities.success('Conformidad aprobada');
      payrollQuery.refetch();
    },
    onError: () =>
      SnackbarUtilities.error(
        'Revise que todos los reportes tengan conformidad'
      ),
  });

  const returnToRequestsMutation = useMutation({
    mutationFn: async (paymessageId: number) => {
      const { data } = await axiosInstance.put(
        `/payrolls/${activePayrollId}/paymessages/return-to-requests`,
        { paymessageIds: [paymessageId] },
        { headers: { noLoader: true } }
      );
      return data;
    },
    onSuccess: () => {
      SnackbarUtilities.success('Trámite regresado a solicitudes');
      payrollQuery.refetch();
    },
    onError: () => SnackbarUtilities.error('No se pudo regresar el trámite'),
  });

  const deleteReport = async (reportId: number) => {
    await axiosInstance.delete(`/payrolls/remove-report/${reportId}`, {
      headers: { noLoader: true },
    });
    SnackbarUtilities.success('Reporte eliminado de la planilla');
    payrollQuery.refetch();
  };

  const openDeleteReport = (reportId: number) => {
    isOpenButtonDelete$.setSubject = {
      isOpen: true,
      function: () => deleteReport(reportId),
    };
  };

  const handleFineBlur = (report: Report, fallbackValue?: number) => {
    const rawValue =
      fineValues[report.id] ??
      (fallbackValue !== undefined ? String(fallbackValue) : undefined);
    if (rawValue === undefined) return;
    const nextValue = Number(rawValue || 0);
    if (Number.isNaN(nextValue)) return;
    if (nextValue === Number(report.attendanceDiscount || 0)) return;
    updateReportMutation.mutate({ report, attendanceDiscount: nextValue });
  };

  const handleBaseBlur = (report: Report) => {
    const rawValue = baseValues[report.id];
    if (rawValue === undefined) return;
    const nextValue = Number(rawValue || 0);
    if (Number.isNaN(nextValue) || nextValue <= 0) return;
    if (nextValue === reportPaymentBase(report)) return;
    updateReportMutation.mutate({ report, subtotal: nextValue });
  };

  const getPenaltySummary = (userId: number) =>
    penaltySummaryQuery.data?.users.find(item => item.userId === userId);

  const openPenaltyPanel = (
    paymessage: PayMessages,
    user: PayrollPenaltyUser,
    tab: PenaltyKind
  ) => {
    if (!penaltySummaryQuery.data?.hasPeriod || !payrollPeriodRange) {
      SnackbarUtilities.warning(
        'Configure primero el periodo de la planilla para revisar multas'
      );
      return;
    }
    setPenaltyPanel({ paymessage, user, tab });
  };

  const applyPenaltyDiscount = (paymessage: PayMessages, amount?: number) => {
    const report = paymessage.reports[0];
    const userId = paymessage.userInit?.user?.id;
    if (!report || !userId) {
      SnackbarUtilities.warning(
        'Este trámite no tiene informe para aplicar multa'
      );
      return;
    }
    if (report.isAuthorized) {
      SnackbarUtilities.warning('El informe ya tiene conformidad');
      return;
    }
    const total = amount ?? getPenaltySummary(userId)?.totalAmount ?? 0;
    setFineValues(current => ({ ...current, [report.id]: total.toFixed(2) }));
    updateReportMutation.mutate({ report, attendanceDiscount: total });
  };

  const refreshAndApplyPenaltyDiscount = async (
    paymessage: PayMessages,
    userId: number,
    fallbackAmount?: number
  ) => {
    const result = await penaltySummaryQuery.refetch();
    const total =
      result.data?.users.find(item => item.userId === userId)?.totalAmount ??
      fallbackAmount;

    if (total === undefined) return;
    applyPenaltyDiscount(paymessage, total);
  };

  const openReport = (report: Report) => {
    navigate(`/mis-reportes/${report.id}`, {
      state: {
        editValues: !report.isAuthorized,
        noViewSidebar: true,
        navigatePayroll: true,
        technicalEvidence: report.type === 'MENSUAL',
      },
    });
  };

  const closeTaskModal = () => {
    navigate(`/centro-de-usuarios/planillas/${activePayrollId}/elaboracion`, {
      replace: true,
    });
  };

  const payrollPeriod =
    salary?.periodStart && salary?.periodEnd
      ? `${formatPayrollPeriodDate(
          salary.periodStart
        )} - ${formatPayrollPeriodDate(salary.periodEnd)}`
      : 'Sin periodo configurado';

  return (
    <div className="payrollMayBridge payrollElaboration">
      <section className="payrollMayBridge-unitFilter payrollElaboration-unitFilter">
        <div className="payrollMayBridge-unitFilterText">
          <select
            className="payrollMayBridge-unitTitleSelect"
            value={orgUnitId}
            onChange={event => setOrgUnitId(event.target.value)}
            aria-label="Unidad visible"
          >
            <option value="">Todas las unidades</option>
            {orgUnitOptions.map(unit => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.count})
              </option>
            ))}
          </select>
          <p>Periodo de planilla: {payrollPeriod}</p>
        </div>
        <strong className="payrollElaboration-totalAmount">
          {formatAmountMoneyPEN(salary?.total || 0)}
        </strong>
      </section>

      <section className="payrollMayBridge-searchSummary">
        <label className="payrollMayBridge-searchBox">
          <FiSearch size={16} />
          <input
            type="search"
            value={userSearch}
            onChange={event => setUserSearch(event.target.value)}
            placeholder="Nombre o DNI"
          />
        </label>
      </section>

      <section className="payrollMayBridge-summary">
        <span>{filteredOffices.length || 0} oficinas visibles</span>
        <span>
          {filteredOffices.reduce(
            (total, office) => total + office.payMessages.length,
            0
          )}{' '}
          trámites visibles
        </span>
        <span>{visibleReports} informes visibles</span>
        <span>{formatAmountMoneyPEN(salary?.spending || 0)} pendiente</span>
      </section>

      {payrollQuery.isLoading && <LoaderForComponent />}
      {!payrollQuery.isLoading && !salary?.offices.length && <TableNoData />}
      {!payrollQuery.isLoading &&
        Boolean(salary?.offices.length) &&
        !filteredOffices.length && <TableNoData />}

      <div className="payrollMayBridge-users">
        {filteredOffices.map(office => {
          const officeReady = office.payMessages.every(paymessage =>
            paymessage.reports.every(report => report.isAuthorized)
          );
          return (
            <section key={office.id} className="payrollMayBridge-officeGroup">
              <header className="payrollMayBridge-officeGroupHeader">
                <h2>{office.name}</h2>
                <span>
                  {office.payMessages.length} trámites ·{' '}
                  {office.payMessages.reduce(
                    (total, item) => total + item.reports.length,
                    0
                  )}{' '}
                  informes
                </span>
                <Button
                  text="Dar conformidad"
                  leftIcon={<PiStampBold />}
                  color={officeReady ? 'secondary' : 'gray'}
                  variant={officeReady ? 'outline' : 'solid'}
                  disabled={!officeReady || authorizeGroupMutation.isPending}
                  onClick={() => authorizeGroupMutation.mutate(office)}
                />
              </header>
              {office.payMessages.map(paymessage => {
                const user = paymessage.userInit?.user;
                const penalty = user ? getPenaltySummary(user.id) : undefined;
                const hasTechnicalReports = paymessage.reports.some(
                  report => !isAdministrativeReport(report)
                );
                return (
                  <article
                    key={paymessage.id}
                    className="payrollMayBridge-user"
                  >
                    <div className="payrollMayBridge-userHeader">
                      <div className="payrollElaboration-person">
                        <strong>
                          {user
                            ? getPayrollUserFullName({
                                profile: user.profile,
                              })
                            : 'Sin tramitante'}
                        </strong>
                        <span>{paymessage.header}</span>
                      </div>
                      <span>{paymessage.reports.length} informes</span>
                      <button
                        type="button"
                        className="payrollMayBridge-downloadZip"
                        disabled={
                          downloadZipMutation.isPending || !hasTechnicalReports
                        }
                        onClick={() => downloadZipMutation.mutate(paymessage)}
                        title="Descargar ZIP de evidencias del usuario"
                      >
                        <FiDownload size={16} />
                        ZIP
                      </button>
                      {user && (
                        <div className="payrollMayBridge-penalties">
                          <button
                            type="button"
                            onClick={() =>
                              openPenaltyPanel(paymessage, user, 'attendance')
                            }
                            title="Revisar multas de asistencia"
                            disabled={penaltySummaryQuery.isFetching}
                          >
                            Asist.{' '}
                            <strong>
                              {formatAmountMoneyPEN(
                                penalty?.attendance.finalAmount || 0
                              )}
                            </strong>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              openPenaltyPanel(paymessage, user, 'licenses')
                            }
                            title="Revisar multas de salidas"
                            disabled={penaltySummaryQuery.isFetching}
                          >
                            Salidas{' '}
                            <strong>
                              {formatAmountMoneyPEN(
                                penalty?.licenses.finalAmount || 0
                              )}
                            </strong>
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        className="payrollElaboration-returnRequest"
                        disabled={returnToRequestsMutation.isPending}
                        onClick={() =>
                          returnToRequestsMutation.mutate(paymessage.id)
                        }
                        title="Regresar a solicitudes"
                      >
                        Regresar
                      </button>
                    </div>
                    <div className="payrollElaboration-reports">
                      {paymessage.reports.map(report => {
                        const isExpanded = !!expandedReports[report.id];
                        const isAdministrative = isAdministrativeReport(report);
                        const base =
                          baseValues[report.id] !== undefined
                            ? Number(baseValues[report.id] || 0)
                            : reportPaymentBase(report);
                        const requestedAmount = reportRequestedAmount(report);
                        const savedDiscount = Number(
                          report.attendanceDiscount || 0
                        );
                        const combinedPenalty = penalty?.totalAmount || 0;
                        const discount =
                          fineValues[report.id] !== undefined
                            ? Number(fineValues[report.id] || 0)
                            : savedDiscount || combinedPenalty;
                        const net = Math.max(
                          base -
                            discount -
                            Number(report.licensesDiscount || 0) -
                            Number(report.earlyPaymentDiscount || 0),
                          0
                        );
                        return (
                          <section
                            key={report.id}
                            className="payrollElaboration-report"
                          >
                            <header>
                              <button
                                type="button"
                                className="payrollMayBridge-toggleTasks"
                                onClick={() =>
                                  setExpandedReports(current => ({
                                    ...current,
                                    [report.id]: !isExpanded,
                                  }))
                                }
                              >
                                {isExpanded ? (
                                  <FiChevronUp size={18} />
                                ) : (
                                  <FiChevronDown size={18} />
                                )}
                                <span>
                                  {isExpanded
                                    ? 'Ocultar'
                                    : isAdministrative
                                    ? 'Ver evidencia'
                                    : 'Ver tareas'}
                                </span>
                              </button>
                              <button
                                type="button"
                                className="payrollElaboration-reportTitle"
                                onClick={() => openReport(report)}
                              >
                                <FiFileText size={16} />
                                <b
                                  className={`payrollElaboration-reportKind ${
                                    isAdministrative
                                      ? 'is-admin'
                                      : 'is-technical'
                                  }`}
                                >
                                  {isAdministrative ? 'Admin' : 'Técnico'}
                                </b>
                                <span>{report.name}</span>
                              </button>
                              <label className="payrollElaboration-fine">
                                Base de pago
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  disabled={report.isAuthorized}
                                  value={
                                    baseValues[report.id] ??
                                    String(reportPaymentBase(report))
                                  }
                                  onChange={event =>
                                    setBaseValues(current => ({
                                      ...current,
                                      [report.id]: event.target.value,
                                    }))
                                  }
                                  onBlur={() => handleBaseBlur(report)}
                                />
                              </label>
                              <label className="payrollElaboration-fine payrollElaboration-finePenalty">
                                Multa total
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={report.isAuthorized}
                                  value={
                                    fineValues[report.id] ??
                                    String(savedDiscount || combinedPenalty)
                                  }
                                  onChange={event =>
                                    setFineValues(current => ({
                                      ...current,
                                      [report.id]: event.target.value,
                                    }))
                                  }
                                  onBlur={() =>
                                    handleFineBlur(report, discount)
                                  }
                                />
                              </label>
                              <div className="payrollElaboration-amounts">
                                <span>
                                  Solicitado/ref.{' '}
                                  {formatAmountMoneyPEN(requestedAmount)}
                                </span>
                                <strong>
                                  A pagar {formatAmountMoneyPEN(net)}
                                </strong>
                              </div>
                              <button
                                type="button"
                                className="payrollElaboration-iconButton"
                                onClick={() => openReport(report)}
                                title="Editar informe"
                              >
                                <FiEye size={16} />
                              </button>
                              <button
                                type="button"
                                className="payrollElaboration-delete"
                                onClick={() => openDeleteReport(report.id)}
                                disabled={report.isAuthorized}
                                title="Eliminar reporte"
                              >
                                <FiTrash2 size={16} />
                              </button>
                              <label className="payrollElaboration-check">
                                <input
                                  type="checkbox"
                                  checked={report.isAuthorized}
                                  disabled={authorizeReportMutation.isPending}
                                  onChange={event =>
                                    authorizeReportMutation.mutate({
                                      reportId: report.id,
                                      isAuthorized: event.target.checked,
                                    })
                                  }
                                />
                                Conformidad
                              </label>
                            </header>
                            {isExpanded && (
                              <ReportEvidence
                                reportId={report.id}
                                payrollId={activePayrollId}
                                preferredUnitId={
                                  office.source === 'ORG_UNIT'
                                    ? String(office.id)
                                    : undefined
                                }
                                report={report}
                                onSaved={() => payrollQuery.refetch()}
                              />
                            )}
                          </section>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
      {penaltyPanel && payrollPeriodRange && (
        <div
          className="payrollMayBridge-penaltyBackdrop"
          onClick={() => setPenaltyPanel(null)}
        >
          <aside
            className="payrollMayBridge-penaltyPanel"
            onClick={event => event.stopPropagation()}
          >
            <header className="payrollMayBridge-penaltyHeader">
              <div>
                <span>Multas de planilla</span>
                <h2>
                  {getPayrollUserFullName({
                    profile: penaltyPanel.user.profile,
                  })}
                </h2>
                <p>
                  Periodo {payrollPeriodRange.dateFrom} al{' '}
                  {payrollPeriodRange.dateTo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPenaltyPanel(null)}
                aria-label="Cerrar multas"
                title="Cerrar"
              >
                <FiX size={20} />
              </button>
            </header>
            <div className="payrollMayBridge-penaltyTabs">
              <button
                type="button"
                className={penaltyPanel.tab === 'attendance' ? 'active' : ''}
                onClick={() =>
                  setPenaltyPanel(current =>
                    current ? { ...current, tab: 'attendance' } : current
                  )
                }
              >
                Asistencia
              </button>
              <button
                type="button"
                className={penaltyPanel.tab === 'licenses' ? 'active' : ''}
                onClick={() =>
                  setPenaltyPanel(current =>
                    current ? { ...current, tab: 'licenses' } : current
                  )
                }
              >
                Salidas
              </button>
              <button
                type="button"
                className="payrollMayBridge-penaltyApplyTotal"
                onClick={() => applyPenaltyDiscount(penaltyPanel.paymessage)}
              >
                Aplicar total{' '}
                {formatAmountMoneyPEN(
                  getPenaltySummary(penaltyPanel.user.id)?.totalAmount || 0
                )}
              </button>
            </div>
            <div className="payrollMayBridge-penaltyContent">
              {penaltyPanel.tab === 'attendance' ? (
                <AttendanceReconciliation
                  embedded
                  initialUserId={penaltyPanel.user.id}
                  lockUser
                  initialRange={payrollPeriodRange}
                  lockRange
                  onSaved={() =>
                    refreshAndApplyPenaltyDiscount(
                      penaltyPanel.paymessage,
                      penaltyPanel.user.id
                    )
                  }
                />
              ) : (
                <LicensePenaltyPanel
                  user={penaltyPanel.user}
                  period={payrollPeriodRange}
                  onSaved={() =>
                    refreshAndApplyPenaltyDiscount(
                      penaltyPanel.paymessage,
                      penaltyPanel.user.id
                    )
                  }
                  onApply={amount =>
                    refreshAndApplyPenaltyDiscount(
                      penaltyPanel.paymessage,
                      penaltyPanel.user.id,
                      amount
                    )
                  }
                />
              )}
            </div>
          </aside>
        </div>
      )}
      {taskId && (
        <div
          className="payrollMayBridge-taskModalBackdrop"
          onClick={closeTaskModal}
        >
          <div
            className="payrollMayBridge-taskModalPanel"
            onClick={event => event.stopPropagation()}
          >
            <Outlet context={{ officeId: 0 }} />
          </div>
        </div>
      )}
    </div>
  );
};

const formatPenaltyDateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('es-PE', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(value))
    : 'Sin registro';

const licenseRowAmount = (row: LicenseFineRow) =>
  row.fine ? fineAmount[row.fine] ?? 0 : 0;

const LicensePenaltyPanel = ({
  user,
  period,
  onSaved,
  onApply,
}: {
  user: PayrollPenaltyUser;
  period: { dateFrom: string; dateTo: string };
  onSaved: () => void;
  onApply: (amount: number) => void;
}) => {
  const [totalAmount, setTotalAmount] = useState('');
  const [totalReason, setTotalReason] = useState('');
  const [itemDrafts, setItemDrafts] = useState<
    Record<number, { amount: string; reason: string }>
  >({});

  const reportQuery = useQuery({
    queryKey: ['payrollElaborationLicensePenaltyPanel', user.id, period],
    queryFn: async () => {
      const { data } = await axiosInstance.get<LicenseFineReportResponse>(
        '/license/report/fines',
        {
          params: {
            startDate: period.dateFrom,
            endDate: period.dateTo,
            usersId: user.id,
          },
          headers: { noLoader: true },
        }
      );
      return data;
    },
  });

  useEffect(() => {
    const adjustment = reportQuery.data?.adjustments?.userPeriod?.[user.id];
    setTotalAmount(adjustment ? adjustment.adjustedAmount.toFixed(2) : '');
    setTotalReason(adjustment?.reason || '');
    const nextItems: Record<number, { amount: string; reason: string }> = {};
    Object.values(reportQuery.data?.adjustments?.license || {}).forEach(
      item => {
        if (!item.licenseId) return;
        nextItems[item.licenseId] = {
          amount: item.adjustedAmount.toFixed(2),
          reason: item.reason,
        };
      }
    );
    setItemDrafts(nextItems);
  }, [
    reportQuery.data?.adjustments?.license,
    reportQuery.data?.adjustments?.userPeriod,
    user.id,
  ]);

  const rows = reportQuery.data?.rows || [];
  const calculatedAmount = rows.reduce(
    (total, row) => total + licenseRowAmount(row),
    0
  );
  const itemAdjustedAmount = rows.reduce((total, row) => {
    const item = itemDrafts[row.id];
    const parsed = Number(item?.amount || '');
    return total + (Number.isFinite(parsed) ? parsed : licenseRowAmount(row));
  }, 0);
  const finalAmount =
    totalAmount.trim() && Number.isFinite(Number(totalAmount))
      ? Number(totalAmount)
      : itemAdjustedAmount;

  const updateItemDraft = (
    rowId: number,
    field: 'amount' | 'reason',
    value: string
  ) => {
    setItemDrafts(current => ({
      ...current,
      [rowId]: {
        amount: current[rowId]?.amount || '',
        reason: current[rowId]?.reason || '',
        [field]: value,
      },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsedTotal = totalAmount.trim() ? Number(totalAmount) : null;
      const hasTotal = parsedTotal !== null || totalReason.trim();
      if (hasTotal) {
        if (
          parsedTotal === null ||
          !Number.isFinite(parsedTotal) ||
          parsedTotal < 0
        ) {
          throw new Error('Ingrese un monto total valido');
        }
        if (!totalReason.trim())
          throw new Error('Ingrese el motivo del ajuste');
      }
      const items = Object.entries(itemDrafts)
        .map(([licenseId, draft]) => ({
          licenseId: Number(licenseId),
          adjustedAmount: Number(draft.amount),
          reason: draft.reason.trim(),
          hasInput: Boolean(draft.amount.trim() || draft.reason.trim()),
        }))
        .filter(item => item.hasInput);
      if (!hasTotal) {
        const invalid = items.some(
          item =>
            !Number.isFinite(item.adjustedAmount) ||
            item.adjustedAmount < 0 ||
            !item.reason
        );
        if (invalid) {
          throw new Error(
            'Complete monto y motivo en cada incidencia ajustada'
          );
        }
      }
      if (!hasTotal && !items.length)
        throw new Error('No hay cambios para guardar');
      await axiosInstance.post('/license/report/fines/adjustments', {
        userId: user.id,
        periodStart: period.dateFrom,
        periodEnd: period.dateTo,
        total:
          hasTotal && parsedTotal !== null
            ? { adjustedAmount: parsedTotal, reason: totalReason.trim() }
            : undefined,
        items: hasTotal
          ? undefined
          : items.map(item => ({
              licenseId: item.licenseId,
              adjustedAmount: item.adjustedAmount,
              reason: item.reason,
            })),
      });
    },
    onSuccess: async () => {
      SnackbarUtilities.success('Ajuste de salidas guardado');
      await reportQuery.refetch();
      onSaved();
    },
    onError: error => {
      SnackbarUtilities.warning(
        error instanceof Error ? error.message : 'No se pudo guardar el ajuste'
      );
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.patch('/license/report/fines/adjustments/void', {
        userId: user.id,
        periodStart: period.dateFrom,
        periodEnd: period.dateTo,
        licenseIds: rows.map(row => row.id),
      });
    },
    onSuccess: async () => {
      SnackbarUtilities.success('Ajuste de salidas limpiado');
      setTotalAmount('');
      setTotalReason('');
      setItemDrafts({});
      await reportQuery.refetch();
      onSaved();
    },
  });

  return (
    <div className="payrollMayBridge-licensePanel">
      <div className="payrollMayBridge-licenseSummary">
        <div>
          <span>Monto calculado</span>
          <strong>{formatAmountMoneyPEN(calculatedAmount)}</strong>
        </div>
        <div>
          <span>Monto confirmado</span>
          <strong>{formatAmountMoneyPEN(finalAmount)}</strong>
        </div>
        <div>
          <span>Registros</span>
          <strong>{rows.length}</strong>
        </div>
        <button type="button" onClick={() => onApply(finalAmount)}>
          Aplicar {formatAmountMoneyPEN(finalAmount)}
        </button>
      </div>

      <div className="payrollMayBridge-licenseAdjust">
        <label>
          Ajustar total
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder={calculatedAmount.toFixed(2)}
            value={totalAmount}
            onChange={event => setTotalAmount(event.target.value)}
          />
        </label>
        <label>
          Motivo
          <input
            type="text"
            placeholder="Ej. sustento aprobado"
            value={totalReason}
            onChange={event => setTotalReason(event.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          Confirmar ajuste
        </button>
        <button
          type="button"
          onClick={() => clearMutation.mutate()}
          disabled={clearMutation.isPending}
        >
          Limpiar
        </button>
      </div>

      <div className="payrollMayBridge-licenseRows">
        {reportQuery.isLoading && <LoaderForComponent />}
        {!reportQuery.isLoading && !rows.length && (
          <div className="payrollMayBridge-licenseEmpty">
            No hay salidas con multa para este periodo.
          </div>
        )}
        {rows.map(row => {
          const draft = itemDrafts[row.id] || { amount: '', reason: '' };
          const label = row.fine
            ? fineLabel[row.fine]
            : row.type === 'PERMISO'
            ? 'Permiso'
            : 'Salida';
          const amount = licenseRowAmount(row);
          return (
            <div key={row.id} className="payrollMayBridge-licenseRow">
              <div>
                <strong>{formatPenaltyDateTime(row.startDate)}</strong>
                <span>{formatPenaltyDateTime(row.untilDate)}</span>
              </div>
              <div>
                <strong>{label}</strong>
                <span>{row.reason || 'Sin motivo'}</span>
              </div>
              <strong
                className={amount > 0 ? 'payrollMayBridge-dangerAmount' : ''}
              >
                {formatAmountMoneyPEN(amount)}
              </strong>
              <label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={amount.toFixed(2)}
                  value={draft.amount}
                  onChange={event =>
                    updateItemDraft(row.id, 'amount', event.target.value)
                  }
                />
              </label>
              <label>
                <input
                  type="text"
                  placeholder="Motivo del ajuste"
                  value={draft.reason}
                  onChange={event =>
                    updateItemDraft(row.id, 'reason', event.target.value)
                  }
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PayrollElaboration;

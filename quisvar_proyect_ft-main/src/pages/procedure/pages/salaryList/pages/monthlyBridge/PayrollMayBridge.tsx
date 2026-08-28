import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import Button from '@/components/button/Button';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import TableNoData from '@/components/table/TableNoData';
import {
  FiChevronDown,
  FiChevronUp,
  FiDownload,
  FiFileText,
  FiSearch,
  FiX,
} from 'react-icons/fi';
import { PiArrowSquareOutFill, PiEyeBold } from 'react-icons/pi';
import AttendanceReconciliation from '../../../../../controlAttendance/AttendanceReconciliation';
import {
  ATTENDANCE_STATUS_FINE_AMOUNTS,
  ATTENDANCE_STATUS_LABELS,
} from '@/models/attendanceStatus';
import type { AttendanceStatus } from '@/models/attendanceStatus';
import useProjectForFilter from '../../../../../myTasks/hooks/useProjectForFilter';
import { handleProjectNavigate } from '../../../../../myTasks/tools/projectNavigation';
import usePayrollList from '../../../../hooks/usePayrollList';
import { URL, axiosInstance } from '@/services/axiosInstance';
import { downloadBlob, formatAmountMoneyPEN } from '@/utils/tools';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { getPayrollUserFullName } from './payrollProfile.utils';
import './payrollMayBridge.css';

interface BridgeTask {
  id: number;
  subTaskOnUserId: number;
  name: string;
  item: string;
  status: string;
  percentage: number;
  price?: number;
  days: number;
  parentLevels?: string[];
}

interface BridgeLevel {
  id: number;
  name: string;
  item: string;
  parentLevels: string[];
  tasks: BridgeTask[];
}

interface BridgeStage {
  id: number;
  name: string;
  projectId: number;
  projectName?: string | null;
  cui?: string | null;
  levels: BridgeLevel[];
}

interface BridgeOffice {
  id: string;
  name: string;
  type: string;
}

interface BridgeUser {
  id: number;
  contract?: string[] | null;
  offices?: BridgeOffice[];
  profile: {
    firstName: string;
    lastName: string;
    dni: string;
    degree?: string;
    job?: string;
  };
  totalTasks: number;
  stages: BridgeStage[];
}

interface BridgeCandidatesResponse {
  totalUsers: number;
  totalTasks: number;
  users: BridgeUser[];
}

interface BridgeCreateResponse {
  payrollId: number;
  created: {
    userId: number;
    reportId: number;
    paymessageId: number;
    amount: number;
  }[];
}

type PenaltyKind = 'attendance' | 'licenses';

interface PayrollPenaltySummaryItem {
  userId: number;
  attendance: PenaltyBucket;
  licenses: PenaltyBucket;
  totalAmount: number;
  calculatedAmount: number;
  adjustedAmount: number;
}

interface PenaltyBucket {
  calculatedAmount: number;
  finalAmount: number;
  adjustedAmount: number;
  pendingCount: number;
  hasAdjustment: boolean;
}

interface PayrollPenaltySummaryResponse {
  payrollId: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  hasPeriod: boolean;
  users: PayrollPenaltySummaryItem[];
}

interface WorkspaceLinkResponse {
  ok: boolean;
  unitId?: string;
  unitName?: string;
  projectId: number;
  stageId: number;
  levelId: number;
  taskId: number;
  focusId?: string | null;
  reason?: string;
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

const dateInputValue = (date: Date) => date.toISOString().slice(0, 10);

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

const defaultUploadStart = () => '2026-06-22';

const fineAmount = ATTENDANCE_STATUS_FINE_AMOUNTS;

const fineLabel: Record<LicenseFineStatus, string> = ATTENDANCE_STATUS_LABELS;

type BridgeStatusFilter =
  | 'ALL'
  | 'INREVIEW'
  | 'REVIEWED'
  | 'APPROVED'
  | 'PAYABLE';

const toLimaBoundary = (date: string, edge: 'start' | 'end') => {
  const time = edge === 'start' ? '00:00:00.000' : '23:59:59.999';
  return `${date}T${time}-05:00`;
};

const PayrollMayBridge = () => {
  const navigate = useNavigate();
  const { salaryId, taskId } = useParams();
  const { projectForFilterQuery } = useProjectForFilter();
  const { usePayrollListQuery, latestPayroll } = usePayrollList({
    status: true,
  });
  const activePayrollId = Number(salaryId || 0);
  const [uploadStart, setUploadStart] = useState(defaultUploadStart);
  const [uploadEnd, setUploadEnd] = useState(dateInputValue(new Date()));
  const [status, setStatus] = useState<BridgeStatusFilter>('ALL');
  const [projectId, setProjectId] = useState('');
  const [stageId, setStageId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [orgUnitId, setOrgUnitId] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Record<number, boolean>>(
    {}
  );
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [taskAmounts, setTaskAmounts] = useState<Record<number, string>>({});
  const [expandedUsers, setExpandedUsers] = useState<Record<number, boolean>>(
    {}
  );
  const [contractPreview, setContractPreview] = useState<{
    url: string;
    filename: string;
    userName: string;
  } | null>(null);
  const [penaltyPanel, setPenaltyPanel] = useState<{
    user: BridgeUser;
    tab: PenaltyKind;
  } | null>(null);
  const [appliedDiscounts, setAppliedDiscounts] = useState<
    Record<number, number>
  >({});
  const [navigatingTaskId, setNavigatingTaskId] = useState<number | null>(null);

  const activePayroll = useMemo(
    () =>
      usePayrollListQuery.data?.find(
        payroll => payroll.id === activePayrollId
      ) || latestPayroll,
    [activePayrollId, latestPayroll, usePayrollListQuery.data]
  );
  const payrollPeriod = useMemo(() => {
    const dateFrom = limaDateInputValue(activePayroll?.periodStart);
    const dateTo = limaDateInputValue(activePayroll?.periodEnd);
    return dateFrom && dateTo ? { dateFrom, dateTo } : null;
  }, [activePayroll?.periodEnd, activePayroll?.periodStart]);

  useEffect(() => {
    if (salaryId || usePayrollListQuery.isLoading || !latestPayroll) return;
    navigate(`/centro-de-usuarios/planillas/${latestPayroll.id}/elaboracion`, {
      replace: true,
    });
  }, [latestPayroll, navigate, salaryId, usePayrollListQuery.isLoading]);

  const candidatesQuery = useQuery({
    queryKey: [
      'payrollMayBridgeCandidates',
      uploadStart,
      uploadEnd,
      status,
      projectId,
      stageId,
    ],
    queryFn: async () => {
      const params = {
        uploadStart: toLimaBoundary(uploadStart, 'start'),
        uploadEnd: toLimaBoundary(uploadEnd, 'end'),
        status,
        projectId: projectId || undefined,
        stageId: stageId || undefined,
      };
      const { data } = await axiosInstance.get<BridgeCandidatesResponse>(
        '/payrolls/monthly-bridge/candidates',
        { params, headers: { noLoader: true } }
      );
      return data;
    },
    enabled: Boolean(uploadStart && uploadEnd),
  });

  const candidateUserIds = useMemo(
    () => (candidatesQuery.data?.users || []).map(user => user.id),
    [candidatesQuery.data?.users]
  );

  const penaltySummaryQuery = useQuery({
    queryKey: ['payrollPenaltySummary', activePayrollId, candidateUserIds],
    queryFn: async () => {
      const { data } = await axiosInstance.get<PayrollPenaltySummaryResponse>(
        `/payrolls/${activePayrollId}/penalties/summary`,
        {
          params: { userIds: candidateUserIds.join(',') },
          headers: { noLoader: true },
        }
      );
      return data;
    },
    enabled: Boolean(activePayrollId && candidateUserIds.length),
  });

  useEffect(() => {
    const users = candidatesQuery.data?.users || [];
    if (!users.length) return;

    setTaskAmounts(current => {
      const next = { ...current };
      users.forEach(user => {
        user.stages.forEach(stage => {
          stage.levels.forEach(level => {
            level.tasks.forEach(task => {
              const suggestedAmount = Number(task.price || 0);
              if (
                suggestedAmount > 0 &&
                (next[task.subTaskOnUserId] === undefined ||
                  next[task.subTaskOnUserId] === '')
              ) {
                next[task.subTaskOnUserId] = suggestedAmount.toFixed(2);
              }
            });
          });
        });
      });
      return next;
    });

    setAmounts(current => {
      const next = { ...current };
      users.forEach(user => {
        const suggestedTotal = user.stages.reduce((stageTotal, stage) => {
          return (
            stageTotal +
            stage.levels.reduce((levelTotal, level) => {
              return (
                levelTotal +
                level.tasks.reduce(
                  (taskTotal, task) => taskTotal + Number(task.price || 0),
                  0
                )
              );
            }, 0)
          );
        }, 0);
        if (
          suggestedTotal > 0 &&
          (next[user.id] === undefined || next[user.id] === '')
        ) {
          next[user.id] = suggestedTotal.toFixed(2);
        }
      });
      return next;
    });
  }, [candidatesQuery.data?.users]);

  const selectedCount = useMemo(
    () => Object.values(selectedTasks).filter(Boolean).length,
    [selectedTasks]
  );

  const userSearchFilteredUsers = useMemo(() => {
    const users = candidatesQuery.data?.users || [];
    const search = normalizeSearch(userSearch);
    if (!search) return users;
    return users.filter(user => {
      const fullName = normalizeSearch(
        getPayrollUserFullName({ profile: user.profile })
      );
      const dni = normalizeSearch(user.profile?.dni || '');
      return fullName.includes(search) || dni.includes(search);
    });
  }, [candidatesQuery.data?.users, userSearch]);

  const orgUnitOptions = useMemo(() => {
    const options = new Map<string, BridgeOffice & { totalUsers: number }>();
    userSearchFilteredUsers.forEach(user => {
      const offices = user.offices?.length
        ? user.offices
        : [
            {
              id: 'without-org-unit',
              name: 'Sin unidad en organigrama',
              type: 'SIN_UNIDAD',
            },
          ];
      offices.forEach(office => {
        const current = options.get(office.id);
        if (current) {
          current.totalUsers += 1;
          return;
        }
        options.set(office.id, { ...office, totalUsers: 1 });
      });
    });
    return Array.from(options.values()).sort((first, second) =>
      first.name.localeCompare(second.name)
    );
  }, [userSearchFilteredUsers]);

  const filteredUsers = useMemo(() => {
    if (!orgUnitId) return userSearchFilteredUsers;
    return userSearchFilteredUsers.filter(user => {
      const offices = user.offices?.length
        ? user.offices
        : [
            {
              id: 'without-org-unit',
              name: 'Sin unidad en organigrama',
              type: 'SIN_UNIDAD',
            },
          ];
      return offices.some(office => office.id === orgUnitId);
    });
  }, [orgUnitId, userSearchFilteredUsers]);

  const groupedUsers = useMemo(() => {
    const groups = new Map<
      string,
      { id: string; name: string; users: BridgeUser[]; totalTasks: number }
    >();
    filteredUsers.forEach(user => {
      const userOffices = user.offices?.length
        ? user.offices
        : [
            {
              id: 'without-org-unit',
              name: 'Sin unidad en organigrama',
              type: 'SIN_UNIDAD',
            },
          ];
      const offices = orgUnitId
        ? userOffices.filter(office => office.id === orgUnitId)
        : userOffices;
      offices.forEach(office => {
        let current = groups.get(office.id);
        if (!current) {
          current = {
            id: office.id,
            name: office.name,
            users: [],
            totalTasks: 0,
          };
          groups.set(office.id, current);
        }
        current.users.push(user);
        current.totalTasks += user.totalTasks;
      });
    });
    return Array.from(groups.values()).sort((first, second) =>
      first.name.localeCompare(second.name)
    );
  }, [filteredUsers, orgUnitId]);

  const visibleUserNumbers = useMemo(() => {
    const numbers = new Map<string, number>();
    let sequence = 1;
    groupedUsers.forEach(group => {
      group.users.forEach(user => {
        numbers.set(`${group.id}-${user.id}`, sequence);
        sequence += 1;
      });
    });
    return numbers;
  }, [groupedUsers]);

  const visibleTaskIds = useMemo(
    () =>
      Array.from(
        new Set(
          filteredUsers.flatMap(user =>
            user.stages.flatMap(stage =>
              stage.levels.flatMap(level =>
                level.tasks.map(task => task.subTaskOnUserId)
              )
            )
          )
        )
      ),
    [filteredUsers]
  );

  const visibleTaskCount = useMemo(
    () => visibleTaskIds.length,
    [visibleTaskIds]
  );

  const selectedAmount = useMemo(() => {
    return (candidatesQuery.data?.users || []).reduce((total, user) => {
      const hasSelectedTask = user.stages.some(stage =>
        stage.levels.some(level =>
          level.tasks.some(task => selectedTasks[task.subTaskOnUserId])
        )
      );
      return hasSelectedTask ? total + Number(amounts[user.id] || 0) : total;
    }, 0);
  }, [amounts, candidatesQuery.data?.users, selectedTasks]);

  const getZipFilename = (headers: Record<string, unknown>) => {
    const fileNameHeader = headers['file-name'] || headers['File-Name'];
    if (typeof fileNameHeader === 'string') return fileNameHeader;
    const disposition = headers['content-disposition'];
    if (typeof disposition === 'string') {
      const match = disposition.match(/filename="?([^"]+)"?/i);
      if (match?.[1]) return match[1];
    }
    return `evidencias-puente-mayo-${Date.now()}.zip`;
  };

  const downloadZipMutation = useMutation({
    mutationFn: async (subTaskOnUserIds: number[]) => {
      if (!subTaskOnUserIds.length) {
        throw new Error('Seleccione al menos una tarea');
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

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activePayrollId) {
        throw new Error('Seleccione una planilla activa');
      }
      const items = (candidatesQuery.data?.users || [])
        .map(user => {
          const subTaskOnUserIds = user.stages.flatMap(stage =>
            stage.levels.flatMap(level =>
              level.tasks
                .filter(task => selectedTasks[task.subTaskOnUserId])
                .map(task => task.subTaskOnUserId)
            )
          );
          const penalty = penaltySummaryQuery.data?.users.find(
            item => item.userId === user.id
          );
          return {
            userId: user.id,
            amount: Number(amounts[user.id] || 0),
            discountAmount: Number(
              appliedDiscounts[user.id] || penalty?.totalAmount || 0
            ),
            subTaskOnUserIds,
          };
        })
        .filter(item => item.subTaskOnUserIds.length > 0);
      if (!items.length) throw new Error('Seleccione al menos una tarea');
      if (items.some(item => item.amount <= 0)) {
        throw new Error(
          'Cada usuario seleccionado debe tener un monto mayor a 0'
        );
      }
      const { data } = await axiosInstance.post<BridgeCreateResponse>(
        '/payrolls/monthly-bridge',
        {
          payrollId: activePayrollId,
          periodStart: payrollPeriod
            ? `${payrollPeriod.dateFrom}T00:00:00.000-05:00`
            : '2026-05-01T00:00:00.000-05:00',
          periodEnd: payrollPeriod
            ? `${payrollPeriod.dateTo}T23:59:59.999-05:00`
            : '2026-05-31T23:59:59.999-05:00',
          items,
        }
      );
      return data;
    },
    onSuccess: data => {
      SnackbarUtilities.success('Informes agregados a planilla');
      navigate(`/centro-de-usuarios/planillas/${data.payrollId}/elaboracion`);
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error ? error.message : 'No se pudo crear la planilla'
      );
    },
  });

  const getStages = () => {
    const project = projectForFilterQuery.data?.find(
      project => project.id === Number(projectId)
    );
    return project?.stages || [];
  };

  const getUserTaskIds = (user: BridgeUser) =>
    user.stages.flatMap(stage =>
      stage.levels.flatMap(level =>
        level.tasks.map(task => task.subTaskOnUserId)
      )
    );

  const taskAmountTotalForUser = (
    user: BridgeUser,
    nextSelectedTasks = selectedTasks,
    nextTaskAmounts = taskAmounts
  ) => {
    const userTaskIds = getUserTaskIds(user);
    const hasTaskAmount = userTaskIds.some(
      taskId => nextTaskAmounts[taskId] !== undefined
    );
    if (!hasTaskAmount) return null;
    return userTaskIds.reduce((total, taskId) => {
      if (!nextSelectedTasks[taskId]) return total;
      return total + Number(nextTaskAmounts[taskId] || 0);
    }, 0);
  };

  const syncUserAmountFromTasks = (
    user: BridgeUser,
    nextSelectedTasks = selectedTasks,
    nextTaskAmounts = taskAmounts
  ) => {
    const total = taskAmountTotalForUser(
      user,
      nextSelectedTasks,
      nextTaskAmounts
    );
    if (total === null) return;
    setAmounts(current => ({ ...current, [user.id]: total.toFixed(2) }));
  };

  const toggleTask = (user: BridgeUser, taskId: number) => {
    setSelectedTasks(current => {
      const next = { ...current, [taskId]: !current[taskId] };
      syncUserAmountFromTasks(user, next);
      return next;
    });
  };

  const toggleUser = (user: BridgeUser, checked: boolean) => {
    const userTaskIds = getUserTaskIds(user);
    setSelectedTasks(current => {
      const next = { ...current };
      userTaskIds.forEach(taskId => {
        next[taskId] = checked;
      });
      syncUserAmountFromTasks(user, next);
      return next;
    });
  };

  const handleAmount = (
    userId: number,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    setAmounts(current => ({ ...current, [userId]: event.target.value }));
  };

  const handleTaskAmount = (
    user: BridgeUser,
    taskId: number,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    const shouldSelect = Number(value || 0) > 0;
    const nextTaskAmounts = { ...taskAmounts, [taskId]: value };
    const nextSelectedTasks = shouldSelect
      ? { ...selectedTasks, [taskId]: true }
      : selectedTasks;
    setTaskAmounts(nextTaskAmounts);
    if (shouldSelect) setSelectedTasks(nextSelectedTasks);
    syncUserAmountFromTasks(user, nextSelectedTasks, nextTaskAmounts);
  };

  const toggleExpandedUser = (userId: number, fallbackValue: boolean) => {
    setExpandedUsers(current => ({
      ...current,
      [userId]: !(current[userId] ?? fallbackValue),
    }));
  };

  const handleDownloadSelectedZip = () => {
    downloadZipMutation.mutate(visibleTaskIds);
  };

  const handleTaskPreview = (taskId: number) => {
    navigate(
      `/centro-de-usuarios/planillas/${activePayrollId}/elaboracion/tarea/${taskId}`
    );
  };

  const handleWorkspaceTaskNavigate = async ({
    groupId,
    stage,
    level,
    task,
  }: {
    groupId: string;
    stage: BridgeStage;
    level: BridgeLevel;
    task: BridgeTask;
  }) => {
    setNavigatingTaskId(task.id);
    try {
      const preferredUnitId =
        groupId && groupId !== 'without-org-unit' ? groupId : undefined;
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
      handleProjectNavigate(stage.projectId, stage.id, task.id);
    } catch {
      SnackbarUtilities.warning(
        'No se pudo abrir en Oficinas y reuniones. Se abrira la vista legacy.'
      );
      handleProjectNavigate(stage.projectId, stage.id, task.id);
    } finally {
      setNavigatingTaskId(null);
    }
  };

  const handleContractPreview = (user: BridgeUser) => {
    const contract = user.contract?.filter(Boolean).at(-1);
    if (!contract) {
      SnackbarUtilities.warning('Este usuario no tiene contrato registrado');
      return;
    }
    const userName = getPayrollUserFullName({ profile: user.profile });
    setContractPreview({
      url: `${URL}/file-user/contract/${encodeURIComponent(contract)}`,
      filename: contract,
      userName,
    });
  };

  const getPenaltySummary = (userId: number) =>
    penaltySummaryQuery.data?.users.find(item => item.userId === userId);

  const openPenaltyPanel = (user: BridgeUser, tab: PenaltyKind) => {
    if (!penaltySummaryQuery.data?.hasPeriod || !payrollPeriod) {
      SnackbarUtilities.warning(
        'Configure primero el periodo de la planilla para revisar multas'
      );
      return;
    }
    setPenaltyPanel({ user, tab });
  };

  const applyPenaltyDiscount = (userId: number, amount?: number) => {
    const total = amount ?? getPenaltySummary(userId)?.totalAmount ?? 0;
    setAppliedDiscounts(current => ({ ...current, [userId]: total }));
    SnackbarUtilities.success('Multa aplicada al usuario');
  };

  return (
    <div className="payrollMayBridge">
      <header className="payrollMayBridge-header">
        <div>
          <h1>Elaboración de planilla</h1>
        </div>
        <div className="payrollMayBridge-headerActions">
          <button
            type="button"
            className="payrollMayBridge-downloadZip"
            disabled={!visibleTaskIds.length || downloadZipMutation.isPending}
            onClick={handleDownloadSelectedZip}
            title="Descargar ZIP de todas las tareas visibles"
          >
            <FiDownload size={16} />
            {downloadZipMutation.isPending ? 'Generando...' : 'Descargar ZIP'}
          </button>
          <Button
            text="Crear informes y agregar a planilla"
            color="secondary"
            disabled={!selectedCount || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          />
        </div>
      </header>

      <section className="payrollMayBridge-unitFilter">
        <div className="payrollMayBridge-unitFilterText">
          <span>Unidades / oficinas</span>
          <select
            className="payrollMayBridge-unitTitleSelect"
            value={orgUnitId}
            onChange={event => setOrgUnitId(event.target.value)}
            aria-label="Unidad visible"
          >
            <option value="">Todas las unidades</option>
            {orgUnitOptions.map(unit => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.totalUsers})
              </option>
            ))}
          </select>
          <p>
            Filtra la elaboracion por unidad del organigrama sin cambiar las
            fechas de subida ni el flujo de planilla.
          </p>
        </div>
        <div className="payrollMayBridge-filters">
          <label>
            Subida desde
            <input
              type="date"
              value={uploadStart}
              onChange={event => setUploadStart(event.target.value)}
            />
          </label>
          <label>
            Subida hasta
            <input
              type="date"
              value={uploadEnd}
              onChange={event => setUploadEnd(event.target.value)}
            />
          </label>
          <label>
            Estado
            <select
              value={status}
              onChange={event =>
                setStatus(event.target.value as BridgeStatusFilter)
              }
            >
              <option value="ALL">Todas</option>
              <option value="INREVIEW">En revision</option>
              <option value="REVIEWED">Revisado</option>
              <option value="APPROVED">Aprobado</option>
              <option value="PAYABLE">Revisado y aprobado</option>
            </select>
          </label>
          <label>
            Proyecto
            <select
              value={projectId}
              onChange={event => {
                setProjectId(event.target.value);
                setStageId('');
              }}
            >
              <option value="">Todos</option>
              {projectForFilterQuery.data?.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Etapa
            <select
              value={stageId}
              onChange={event => setStageId(event.target.value)}
            >
              <option value="">Todas</option>
              {getStages().map(stage => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="payrollMayBridge-searchSummary">
        <label
          className="payrollMayBridge-userSearch"
          aria-label="Buscar usuario"
        >
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
        <span>{filteredUsers.length} usuarios visibles</span>
        <span>{visibleTaskCount} tareas visibles</span>
        <span>{groupedUsers.length} oficinas</span>
        <span>{selectedCount} tareas seleccionadas</span>
        <strong>{formatAmountMoneyPEN(selectedAmount)}</strong>
      </section>

      {candidatesQuery.isLoading && <LoaderForComponent />}
      {!candidatesQuery.isLoading && !filteredUsers.length && <TableNoData />}
      <div className="payrollMayBridge-users">
        {groupedUsers.map(group => (
          <section key={group.id} className="payrollMayBridge-officeGroup">
            <header className="payrollMayBridge-officeGroupHeader">
              <h2>{group.name}</h2>
              <span>
                {group.users.length} usuarios · {group.totalTasks} tareas
              </span>
            </header>
            {group.users.map((user, index) => {
              const visibleNumber =
                visibleUserNumbers.get(`${group.id}-${user.id}`) || index + 1;
              const userTaskIds = getUserTaskIds(user);
              const everySelected = userTaskIds.every(
                taskId => selectedTasks[taskId]
              );
              const defaultExpanded =
                groupedUsers[0]?.id === group.id && index === 0;
              const isExpanded = expandedUsers[user.id] ?? defaultExpanded;
              const penalty = getPenaltySummary(user.id);
              const appliedDiscount = Number(appliedDiscounts[user.id] || 0);
              const baseAmount = Number(amounts[user.id] || 0);
              const discountAmount = Number(
                appliedDiscount || penalty?.totalAmount || 0
              );
              const netAmount = Math.max(baseAmount - discountAmount, 0);
              return (
                <article
                  key={`${group.id}-${user.id}`}
                  className="payrollMayBridge-user"
                >
                  <div className="payrollMayBridge-userHeader">
                    <label className="payrollMayBridge-userCheck">
                      <input
                        type="checkbox"
                        checked={everySelected}
                        onChange={event =>
                          toggleUser(user, event.target.checked)
                        }
                      />
                      <span className="payrollMayBridge-userNumber">
                        {visibleNumber}.
                      </span>
                      <span>
                        {getPayrollUserFullName({ profile: user.profile })}
                      </span>
                    </label>
                    <span>DNI {user.profile?.dni || '---'}</span>
                    <span>{user.totalTasks} tareas</span>
                    <button
                      type="button"
                      className="payrollMayBridge-downloadUser"
                      disabled={
                        !userTaskIds.length || downloadZipMutation.isPending
                      }
                      onClick={() => downloadZipMutation.mutate(userTaskIds)}
                      title="Descargar ZIP de todas las tareas del usuario"
                    >
                      <FiDownload size={15} />
                      ZIP
                    </button>
                    <button
                      type="button"
                      className="payrollMayBridge-contractButton"
                      onClick={() => handleContractPreview(user)}
                      title="Ver ultimo contrato del usuario"
                      aria-label={`Ver contrato de ${getPayrollUserFullName({
                        profile: user.profile,
                      })}`}
                    >
                      <FiFileText size={16} />
                    </button>
                    <div className="payrollMayBridge-penalties">
                      <button
                        type="button"
                        onClick={() => openPenaltyPanel(user, 'attendance')}
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
                        onClick={() => openPenaltyPanel(user, 'licenses')}
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
                      {appliedDiscount > 0 && (
                        <span title="Multa aplicada al crear el informe">
                          Aplicado {formatAmountMoneyPEN(appliedDiscount)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="payrollMayBridge-toggleTasks"
                      onClick={() =>
                        toggleExpandedUser(user.id, defaultExpanded)
                      }
                      aria-expanded={isExpanded}
                      aria-label={
                        isExpanded
                          ? 'Ocultar tareas del usuario'
                          : 'Ver tareas del usuario'
                      }
                      title={isExpanded ? 'Ocultar tareas' : 'Ver tareas'}
                    >
                      {isExpanded ? (
                        <FiChevronUp size={18} />
                      ) : (
                        <FiChevronDown size={18} />
                      )}
                      <span>{isExpanded ? 'Ocultar' : 'Ver tareas'}</span>
                    </button>
                    <label className="payrollMayBridge-amount">
                      Monto Mayo
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amounts[user.id] || ''}
                        onChange={event => handleAmount(user.id, event)}
                        placeholder="0.00"
                      />
                      <span className="payrollMayBridge-netAmount">
                        Total final {formatAmountMoneyPEN(netAmount)}
                      </span>
                    </label>
                  </div>
                  {isExpanded && (
                    <div className="payrollMayBridge-stageList">
                      {user.stages.map(stage => (
                        <section
                          key={stage.id}
                          className="payrollMayBridge-stage"
                        >
                          <h2>{stage.name}</h2>
                          {stage.levels.map(level => (
                            <div
                              key={level.id}
                              className="payrollMayBridge-level"
                            >
                              <h3>
                                {level.parentLevels.join(' / ') || level.name}
                              </h3>
                              {level.tasks.map(task => (
                                <div
                                  key={task.subTaskOnUserId}
                                  className="payrollMayBridge-task"
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      !!selectedTasks[task.subTaskOnUserId]
                                    }
                                    onChange={() =>
                                      toggleTask(user, task.subTaskOnUserId)
                                    }
                                  />
                                  <span>
                                    {task.item} {task.name}
                                  </span>
                                  <label className="payrollMayBridge-taskAmount">
                                    <span>S/.</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={
                                        taskAmounts[task.subTaskOnUserId] || ''
                                      }
                                      onChange={event =>
                                        handleTaskAmount(
                                          user,
                                          task.subTaskOnUserId,
                                          event
                                        )
                                      }
                                      placeholder={
                                        task.price ? String(task.price) : '0.00'
                                      }
                                      aria-label={`Valorizacion de ${task.item} ${task.name}`}
                                    />
                                  </label>
                                  <small>
                                    {task.percentage}% - {task.status}
                                  </small>
                                  <div className="payrollMayBridge-taskActions">
                                    <button
                                      type="button"
                                      onClick={() => handleTaskPreview(task.id)}
                                      title="Ver tarea"
                                      aria-label={`Ver tarea ${task.item} ${task.name}`}
                                    >
                                      <PiEyeBold size={18} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleWorkspaceTaskNavigate({
                                          groupId: group.id,
                                          stage,
                                          level,
                                          task,
                                        })
                                      }
                                      disabled={navigatingTaskId === task.id}
                                      title="Abrir en Oficinas y reuniones"
                                      aria-label={`Abrir en Oficinas y reuniones la tarea ${task.item} ${task.name}`}
                                    >
                                      <PiArrowSquareOutFill size={18} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </section>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        ))}
      </div>
      {taskId && (
        <div className="payrollMayBridge-taskModalBackdrop">
          <div className="payrollMayBridge-taskModalPanel">
            <Outlet />
          </div>
        </div>
      )}
      {contractPreview && (
        <div className="payrollMayBridge-contractBackdrop">
          <div className="payrollMayBridge-contractDialog">
            <header className="payrollMayBridge-contractHeader">
              <div>
                <h2>Contrato de {contractPreview.userName}</h2>
                <span>{contractPreview.filename}</span>
              </div>
              <button
                type="button"
                onClick={() => setContractPreview(null)}
                aria-label="Cerrar contrato"
                title="Cerrar"
              >
                <FiX size={20} />
              </button>
            </header>
            <object
              data={contractPreview.url}
              type="application/pdf"
              className="payrollMayBridge-contractViewer"
            >
              <div className="payrollMayBridge-contractFallback">
                No se pudo previsualizar el contrato.
                <a href={contractPreview.url} target="_blank" rel="noreferrer">
                  Abrir en una pestaña nueva
                </a>
              </div>
            </object>
          </div>
        </div>
      )}
      {penaltyPanel && payrollPeriod && (
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
                  Periodo {payrollPeriod.dateFrom} al {payrollPeriod.dateTo}
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
                onClick={() => applyPenaltyDiscount(penaltyPanel.user.id)}
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
                  initialRange={payrollPeriod}
                  lockRange
                  onSaved={() => penaltySummaryQuery.refetch()}
                />
              ) : (
                <LicensePenaltyPanel
                  user={penaltyPanel.user}
                  period={payrollPeriod}
                  onSaved={() => penaltySummaryQuery.refetch()}
                  onApply={amount =>
                    applyPenaltyDiscount(penaltyPanel.user.id, amount)
                  }
                />
              )}
            </div>
          </aside>
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
  user: BridgeUser;
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
    queryKey: ['licensePenaltyPanel', user.id, period],
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

export default PayrollMayBridge;

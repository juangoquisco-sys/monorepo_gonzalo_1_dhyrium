import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FiEye,
  FiPaperclip,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiX,
} from 'react-icons/fi';
import Button from '@/components/button/Button';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import TableNoData from '@/components/table/TableNoData';
import { URL, axiosInstance } from '@/services/axiosInstance';
import { formatAmountMoneyPEN } from '@/utils/tools';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import './payrollMayBridge.css';

interface SelfPayroll {
  id: number;
  name: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  contractMonthlySalary?: number;
}

interface SelfTask {
  id: number;
  subTaskOnUserId: number;
  name: string;
  item: string;
  status: string;
  percentage: number;
  price?: number;
  assignedAt?: string;
  updatedAt?: string;
}

interface SelfLevel {
  id: number;
  parentLevels?: string[];
  tasks: SelfTask[];
}

interface SelfStage {
  id: number;
  name: string;
  projectId: number;
  projectName?: string | null;
  levels: SelfLevel[];
}

interface SelfTasksResponse {
  totalTasks: number;
  stages: SelfStage[];
}

interface SelfAttachment {
  id: number;
  name: string;
  path: string;
  originalname?: string | null;
  createdAt?: string;
}

interface SelfSubmissionResponse {
  payroll: SelfPayroll;
  reports: {
    id: number;
    name: string;
    price: number;
    subprice: number;
    paymessageId?: number | null;
    task: { id: number }[];
    basictask?: { id: number }[];
    operationalTasks?: { id: number }[];
    createdAt: string;
    payroll?: SelfPayroll | null;
    paymessage?: {
      id: number;
      status: string;
      files?: SelfAttachment[];
    } | null;
  }[];
}

interface SelfSubmissionHistoryResponse {
  reports: (SelfSubmissionResponse['reports'][number] & {
    payroll?: SelfPayroll | null;
  })[];
}

interface SelfSubmissionGroup {
  key: string;
  paymessageId?: number | null;
  title: string;
  status?: string;
  files: SelfAttachment[];
  reports: SelfSubmissionResponse['reports'];
  total: number;
}

interface AdministrativeTaskPreview {
  id: number;
  item: string;
  assignedAt: string;
  finishedAt?: string | null;
  percentage: number;
  task: {
    name: string;
    status: string;
  };
  project?: { name?: string | null };
  stage?: { name?: string | null };
  level?: { name?: string | null };
}

interface AdministrativePreviewResponse {
  payroll: SelfPayroll;
  periodStart: string;
  periodEnd: string;
  contractMonthlySalary?: number;
  totalTasks: number;
  tasks: AdministrativeTaskPreview[];
  existingReport?: {
    id: number;
    name: string;
    price: number;
    subprice: number;
    paymessageId?: number | null;
    basictask: { id: number }[];
    operationalTasks?: { id: number }[];
    createdAt: string;
  } | null;
}

const dateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const payrollPeriodInputValue = (value?: string | null) => {
  if (!value) return null;

  const dateOnly = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (dateOnly) return dateOnly;

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime())
    ? null
    : dateInputValue(parsedDate);
};

const toLimaBoundary = (date: string, edge: 'start' | 'end') => {
  const time = edge === 'start' ? '00:00:00.000' : '23:59:59.999';
  return `${date}T${time}-05:00`;
};

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(value))
    : '';

const administrativeStatusLabel = (status?: string) => {
  const normalized = (status || '').toUpperCase();
  const labels: Record<string, string> = {
    UNRESOLVED: 'Pendiente',
    PROCESS: 'En proceso',
    REVIEWED: 'Revisado',
    APPROVED: 'Aprobado',
  };

  return labels[normalized] || normalized || 'Sin estado';
};

const administrativeStatusClass = (status?: string) =>
  (status || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-');

const PayrollSelfSubmission = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'technical' | 'administrative'>(
    'technical'
  );
  const [uploadStart, setUploadStart] = useState('2026-06-22');
  const [uploadEnd, setUploadEnd] = useState(dateInputValue(new Date()));
  const [projectId, setProjectId] = useState('');
  const [stageId, setStageId] = useState('');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Record<number, boolean>>(
    {}
  );
  const [amount, setAmount] = useState('');
  const [administrativeAmount, setAdministrativeAmount] = useState('');
  const [attachmentTarget, setAttachmentTarget] = useState<{
    paymessageId: number;
    title: string;
  } | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  const activePayrollQuery = useQuery({
    queryKey: ['payrollSelfActivePayroll'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<SelfPayroll>(
        '/payrolls/self-submission/active-payroll',
        { headers: { noLoader: true } }
      );
      return data;
    },
  });

  const tasksQuery = useQuery({
    queryKey: [
      'payrollSelfTechnicalTasks',
      uploadStart,
      uploadEnd,
      projectId,
      stageId,
      status,
    ],
    queryFn: async () => {
      const { data } = await axiosInstance.get<SelfTasksResponse>(
        '/payrolls/self-submission/technical-tasks',
        {
          params: {
            uploadStart: toLimaBoundary(uploadStart, 'start'),
            uploadEnd: toLimaBoundary(uploadEnd, 'end'),
            projectId: projectId || undefined,
            stageId: stageId || undefined,
            status,
          },
          headers: { noLoader: true },
        }
      );
      return data;
    },
    enabled: activePayrollQuery.isSuccess,
  });

  const submissionsQuery = useQuery({
    queryKey: ['payrollSelfSubmissions'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<SelfSubmissionResponse>(
        '/payrolls/self-submission/submissions',
        { headers: { noLoader: true } }
      );
      return data;
    },
    enabled: activePayrollQuery.isSuccess,
  });

  const historyQuery = useQuery({
    queryKey: ['payrollSelfSubmissionHistory'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<SelfSubmissionHistoryResponse>(
        '/payrolls/self-submission/history',
        { headers: { noLoader: true } }
      );
      return data;
    },
    enabled: activePayrollQuery.isSuccess,
  });

  const administrativePreviewQuery = useQuery({
    queryKey: ['payrollSelfAdministrativePreview'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<AdministrativePreviewResponse>(
        '/payrolls/self-submission/administrative-preview',
        { headers: { noLoader: true } }
      );
      return data;
    },
    enabled: activePayrollQuery.isSuccess,
  });

  const attachmentsQuery = useQuery({
    queryKey: [
      'payrollSelfSubmissionAttachments',
      attachmentTarget?.paymessageId,
    ],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{
        paymessageId: number;
        files: SelfAttachment[];
      }>(
        `/payrolls/self-submission/paymessages/${attachmentTarget?.paymessageId}/attachments`,
        { headers: { noLoader: true } }
      );
      return data;
    },
    enabled: Boolean(attachmentTarget?.paymessageId),
  });

  useEffect(() => {
    const periodStart = payrollPeriodInputValue(
      activePayrollQuery.data?.periodStart
    );
    const periodEnd = payrollPeriodInputValue(
      activePayrollQuery.data?.periodEnd
    );

    if (!periodStart || !periodEnd) return;

    setUploadStart(periodStart);
    setUploadEnd(periodEnd);
  }, [
    activePayrollQuery.data?.id,
    activePayrollQuery.data?.periodStart,
    activePayrollQuery.data?.periodEnd,
  ]);

  useEffect(() => {
    const contractAmount = Number(
      activePayrollQuery.data?.contractMonthlySalary || 0
    );
    if (contractAmount > 0) {
      setAmount(current => current || String(contractAmount));
      setAdministrativeAmount(current => current || String(contractAmount));
    }
  }, [activePayrollQuery.data?.contractMonthlySalary]);

  useEffect(() => {
    const contractAmount = Number(
      administrativePreviewQuery.data?.contractMonthlySalary || 0
    );
    if (contractAmount > 0) {
      setAdministrativeAmount(current => current || String(contractAmount));
    }
  }, [administrativePreviewQuery.data?.contractMonthlySalary]);

  const projectOptions = useMemo(() => {
    const map = new Map<number, string>();
    (tasksQuery.data?.stages || []).forEach(stage => {
      if (stage.projectId)
        map.set(stage.projectId, stage.projectName || stage.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasksQuery.data?.stages]);

  const stageOptions = useMemo(
    () =>
      (tasksQuery.data?.stages || [])
        .filter(stage => !projectId || stage.projectId === Number(projectId))
        .map(stage => ({ id: stage.id, name: stage.name })),
    [projectId, tasksQuery.data?.stages]
  );

  const visibleStages = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (tasksQuery.data?.stages || [])
      .filter(stage => !projectId || stage.projectId === Number(projectId))
      .filter(stage => !stageId || stage.id === Number(stageId))
      .map(stage => ({
        ...stage,
        levels: stage.levels
          .map(level => ({
            ...level,
            tasks: level.tasks.filter(task => {
              if (!needle) return true;
              return `${task.item} ${task.name}`.toLowerCase().includes(needle);
            }),
          }))
          .filter(level => level.tasks.length),
      }))
      .filter(stage => stage.levels.length);
  }, [projectId, search, stageId, tasksQuery.data?.stages]);

  const visibleTaskIds = useMemo(
    () =>
      visibleStages.flatMap(stage =>
        stage.levels.flatMap(level =>
          level.tasks.map(task => task.subTaskOnUserId)
        )
      ),
    [visibleStages]
  );

  const selectedTaskIds = useMemo(
    () =>
      Object.entries(selectedTasks)
        .filter(([, selected]) => selected)
        .map(([id]) => Number(id)),
    [selectedTasks]
  );

  const pendingReports = submissionsQuery.data?.reports || [];
  const historyReports = historyQuery.data?.reports || [];

  const reportTaskCount = (report: SelfSubmissionResponse['reports'][number]) =>
    report.task.length ||
    report.basictask?.length ||
    report.operationalTasks?.length ||
    0;

  const reportAmount = (report: SelfSubmissionResponse['reports'][number]) =>
    Number(report.price || report.subprice || 0);

  const pendingTotal = pendingReports.reduce(
    (total, report) => total + reportAmount(report),
    0
  );

  const groupedReports = (reports: SelfSubmissionResponse['reports']) => {
    const map = new Map<string, SelfSubmissionGroup>();
    reports.forEach(report => {
      const key = report.paymessageId
        ? `paymessage-${report.paymessageId}`
        : `report-${report.id}`;
      const current: SelfSubmissionGroup = map.get(key) || {
        key,
        paymessageId: report.paymessageId,
        title: report.payroll?.name || 'En esta planilla',
        status: report.paymessage?.status,
        files: report.paymessage?.files || [],
        reports: [],
        total: 0,
      };
      current.reports.push(report);
      current.total += reportAmount(report);
      if ((report.paymessage?.files || []).length > current.files.length) {
        current.files = report.paymessage?.files || [];
      }
      map.set(key, current);
    });
    return Array.from(map.values());
  };

  const pendingGroups = groupedReports(pendingReports);
  const historyGroups = groupedReports(historyReports);

  const fileUrl = (file: SelfAttachment) => {
    const cleanPath = file.path
      .replace(/\\/g, '/')
      .replace(/^public\/?/, '')
      .replace(/^\/+/, '');
    return `${URL}/file-user/${cleanPath}/${file.name}`;
  };

  const openAttachmentManager = (
    group: ReturnType<typeof groupedReports>[number]
  ) => {
    if (!group.paymessageId) {
      SnackbarUtilities.error('Este reporte no tiene tramite asociado');
      return;
    }
    setAttachmentTarget({
      paymessageId: group.paymessageId,
      title: group.title,
    });
    setAttachmentFiles([]);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.post(
        '/payrolls/self-submission/technical',
        {
          amount: Number(amount || 0),
          subTaskOnUserIds: selectedTaskIds,
        }
      );
      return data;
    },
    onSuccess: () => {
      SnackbarUtilities.success('Solicitud enviada a planilla');
      setSelectedTasks({});
      setAmount(String(activePayrollQuery.data?.contractMonthlySalary || ''));
      tasksQuery.refetch();
      submissionsQuery.refetch();
    },
    onError: () => SnackbarUtilities.error('No se pudo crear la solicitud'),
  });

  const createAdministrativeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.post(
        '/payrolls/self-submission/administrative',
        {
          amount: Number(administrativeAmount || 0),
        }
      );
      return data;
    },
    onSuccess: () => {
      SnackbarUtilities.success('Solicitud administrativa enviada a planilla');
      setAdministrativeAmount(
        String(
          administrativePreviewQuery.data?.contractMonthlySalary ||
            activePayrollQuery.data?.contractMonthlySalary ||
            ''
        )
      );
      administrativePreviewQuery.refetch();
      submissionsQuery.refetch();
    },
    onError: () =>
      SnackbarUtilities.error('No se pudo crear la solicitud administrativa'),
  });

  const removeMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const { data } = await axiosInstance.delete(
        `/payrolls/self-submission/reports/${reportId}`,
        { headers: { noLoader: true } }
      );
      return data;
    },
    onSuccess: () => {
      SnackbarUtilities.success('Solicitud retirada');
      tasksQuery.refetch();
      submissionsQuery.refetch();
    },
    onError: () => SnackbarUtilities.error('No se pudo retirar la solicitud'),
  });

  const refreshAttachmentData = () => {
    queryClient.invalidateQueries({
      queryKey: ['payrollSelfSubmissionAttachments'],
    });
    submissionsQuery.refetch();
    historyQuery.refetch();
  };

  const uploadAttachmentsMutation = useMutation({
    mutationFn: async () => {
      if (!attachmentTarget?.paymessageId || !attachmentFiles.length)
        return null;
      const formData = new FormData();
      attachmentFiles.forEach(file => formData.append('fileMail', file));
      const { data } = await axiosInstance.post(
        `/payrolls/self-submission/paymessages/${attachmentTarget.paymessageId}/attachments`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return data;
    },
    onSuccess: () => {
      SnackbarUtilities.success('Archivos agregados');
      setAttachmentFiles([]);
      refreshAttachmentData();
    },
    onError: () => SnackbarUtilities.error('No se pudieron subir los archivos'),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (fileId: number) => {
      if (!attachmentTarget?.paymessageId) return null;
      const { data } = await axiosInstance.delete(
        `/payrolls/self-submission/paymessages/${attachmentTarget.paymessageId}/attachments/${fileId}`,
        { headers: { noLoader: true } }
      );
      return data;
    },
    onSuccess: () => {
      SnackbarUtilities.success('Archivo eliminado');
      refreshAttachmentData();
    },
    onError: () => SnackbarUtilities.error('No se pudo eliminar el archivo'),
  });

  const toggleVisible = (checked: boolean) => {
    setSelectedTasks(current => {
      const next = { ...current };
      visibleTaskIds.forEach(id => {
        next[id] = checked;
      });
      return next;
    });
  };

  const payroll = activePayrollQuery.data;
  const administrativePreview = administrativePreviewQuery.data;
  const selectedCount =
    activeTab === 'technical'
      ? `${selectedTaskIds.length} tareas seleccionadas`
      : `${administrativePreview?.totalTasks || 0} tareas administrativas`;

  const reportKind = (report: SelfSubmissionResponse['reports'][number]) =>
    report.name.toLowerCase().includes('administrativo') ||
    (!report.task.length &&
      ((report.basictask?.length || 0) > 0 ||
        (report.operationalTasks?.length || 0) > 0))
      ? 'Administrativo'
      : 'Técnico';

  const openReport = (reportId: number) => {
    navigate(`/mis-reportes/${reportId}`, {
      state: {
        noViewSidebar: true,
        navigatePayroll: true,
        technicalEvidence: true,
      },
    });
  };

  return (
    <div className="payrollMayBridge payrollSelfSubmission">
      <section className="payrollSelfSubmission-target">
        <div>
          <span>Planilla destino</span>
          <strong>{payroll?.name || 'Sin planilla activa'}</strong>
          {payroll?.periodStart && payroll.periodEnd && (
            <p>
              Periodo {formatDate(payroll.periodStart)} -{' '}
              {formatDate(payroll.periodEnd)}
            </p>
          )}
        </div>
        <strong>{selectedCount}</strong>
      </section>

      {activePayrollQuery.isError && (
        <section className="payrollSelfSubmission-blocked">
          Primero debe crearse la planilla del periodo.
        </section>
      )}

      <div className="payrollSelfSubmission-workbench">
        <main className="payrollSelfSubmission-main">
          <section
            className="payrollSelfSubmission-tabs"
            aria-label="Tipo de solicitud"
          >
            <button
              type="button"
              className={activeTab === 'technical' ? 'is-active' : ''}
              onClick={() => setActiveTab('technical')}
            >
              Técnicas
            </button>
            <button
              type="button"
              className={activeTab === 'administrative' ? 'is-active' : ''}
              onClick={() => setActiveTab('administrative')}
            >
              Administrativas
            </button>
          </section>

          {activeTab === 'technical' && (
            <>
              <section className="payrollSelfSubmission-filters">
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
                    {projectOptions.map(project => (
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
                    {stageOptions.map(stage => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Estado
                  <select
                    value={status}
                    onChange={event => setStatus(event.target.value)}
                  >
                    <option value="ALL">Todos</option>
                    <option value="INREVIEW">En revisión</option>
                    <option value="REVIEWED">Revisado</option>
                    <option value="APPROVED">Aprobado</option>
                    <option value="PAYABLE">Revisado y aprobado</option>
                  </select>
                </label>
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
              </section>

              <section className="payrollMayBridge-searchSummary">
                <label className="payrollMayBridge-searchBox">
                  <FiSearch size={16} />
                  <input
                    type="search"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Buscar tarea"
                  />
                </label>
              </section>

              <section className="payrollSelfSubmission-cart">
                <button type="button" onClick={() => toggleVisible(true)}>
                  Seleccionar todo visible
                </button>
                <button type="button" onClick={() => toggleVisible(false)}>
                  Deseleccionar visible
                </button>
                <span>{selectedTaskIds.length} tareas en el carrito</span>
              </section>

              {tasksQuery.isLoading && <LoaderForComponent />}
              {!tasksQuery.isLoading && !visibleStages.length && (
                <TableNoData />
              )}

              <div className="payrollSelfSubmission-stages">
                {visibleStages.map(stage => (
                  <section key={stage.id} className="payrollMayBridge-stage">
                    <h2>{stage.name}</h2>
                    {stage.levels.map(level => (
                      <div key={level.id} className="payrollMayBridge-level">
                        <h3>{level.parentLevels?.join(' / ')}</h3>
                        {level.tasks.map(task => (
                          <label
                            key={task.subTaskOnUserId}
                            className="payrollSelfSubmission-task"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(
                                selectedTasks[task.subTaskOnUserId]
                              )}
                              onChange={event =>
                                setSelectedTasks(current => ({
                                  ...current,
                                  [task.subTaskOnUserId]: event.target.checked,
                                }))
                              }
                            />
                            <span>
                              {task.item} {task.name}
                            </span>
                            <small>
                              {task.percentage || 0}% · {task.status}
                            </small>
                          </label>
                        ))}
                      </div>
                    ))}
                  </section>
                ))}
              </div>
            </>
          )}

          {activeTab === 'administrative' && (
            <section className="payrollSelfSubmission-admin">
              <div className="payrollSelfSubmission-adminPanel">
                <div>
                  <span>Periodo administrativo</span>
                  <strong>
                    {formatDate(administrativePreview?.periodStart)} -{' '}
                    {formatDate(administrativePreview?.periodEnd)}
                  </strong>
                  <p>
                    Se adjuntarán automáticamente las tareas administrativas
                    registradas dentro del periodo de la planilla.
                  </p>
                </div>
                <label>
                  Monto solicitado
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={administrativeAmount}
                    onChange={event =>
                      setAdministrativeAmount(event.target.value)
                    }
                    placeholder="S/. 0.00"
                  />
                </label>
                <Button
                  text="Enviar solicitud administrativa"
                  color="secondary"
                  disabled={
                    !payroll ||
                    Number(administrativeAmount || 0) <= 0 ||
                    createAdministrativeMutation.isPending ||
                    Boolean(administrativePreview?.existingReport)
                  }
                  onClick={() => createAdministrativeMutation.mutate()}
                />
              </div>
              {administrativePreview?.existingReport && (
                <p className="payrollSelfSubmission-adminNotice">
                  Ya existe una solicitud administrativa pendiente para esta
                  planilla.
                </p>
              )}
              {administrativePreviewQuery.isLoading && <LoaderForComponent />}
              {!administrativePreviewQuery.isLoading &&
                !administrativePreview?.tasks.length && (
                  <section className="payrollSelfSubmission-adminEmpty">
                    No hay tareas administrativas registradas en este periodo.
                    Aun así puedes enviar la solicitud con el monto
                    correspondiente.
                  </section>
                )}
              {!!administrativePreview?.tasks.length && (
                <section className="payrollSelfSubmission-adminTaskList">
                  <header className="payrollSelfSubmission-adminTaskListHeader">
                    <div>
                      <strong>Tareas administrativas del periodo</strong>
                      <span>
                        Evidencias que se adjuntarán a la solicitud
                        administrativa.
                      </span>
                    </div>
                    <b>{administrativePreview.totalTasks} tareas</b>
                  </header>
                  <div className="payrollSelfSubmission-adminTaskRows">
                    {administrativePreview.tasks.map(task => (
                      <article
                        key={task.id}
                        className="payrollSelfSubmission-adminTaskRow"
                      >
                        <div className="payrollSelfSubmission-adminTaskDate">
                          <strong>{formatDate(task.assignedAt)}</strong>
                          <span>Registro</span>
                        </div>
                        <div className="payrollSelfSubmission-adminTaskMain">
                          <div className="payrollSelfSubmission-adminTaskTitle">
                            <b>{task.item}</b>
                            <strong>{task.task.name}</strong>
                          </div>
                          <p>{task.level?.name || 'Sin detalle registrado'}</p>
                        </div>
                        <div className="payrollSelfSubmission-adminTaskMeta">
                          <span>{task.project?.name || 'Administrativo'}</span>
                          <small>
                            {task.stage?.name || 'Tareas administrativas'}
                          </small>
                        </div>
                        <div className="payrollSelfSubmission-adminTaskState">
                          <span
                            className={`payrollSelfSubmission-adminTaskBadge is-${administrativeStatusClass(
                              task.task.status
                            )}`}
                          >
                            {administrativeStatusLabel(task.task.status)}
                          </span>
                          <small>{task.percentage || 0}%</small>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </section>
          )}
        </main>

        <aside className="payrollSelfSubmission-sidePanel">
          <section className="payrollSelfSubmission-cartPanel">
            <div className="payrollSelfSubmission-sideHeader">
              <span>Carrito actual</span>
              <strong>{selectedTaskIds.length} tareas</strong>
            </div>
            <p>
              Selecciona las tareas que quieres enviar a la planilla activa. Si
              te equivocas, puedes retirar la solicitud mientras siga en
              recepción.
            </p>
            <label>
              Monto solicitado
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={event => setAmount(event.target.value)}
                placeholder="S/. 0.00"
              />
            </label>
            <Button
              text="Enviar solicitud a planilla"
              color="secondary"
              disabled={
                activeTab !== 'technical' ||
                !payroll ||
                !selectedTaskIds.length ||
                Number(amount || 0) <= 0 ||
                createMutation.isPending
              }
              onClick={() => createMutation.mutate()}
            />
          </section>

          <section className="payrollSelfSubmission-sideSection">
            <div className="payrollSelfSubmission-sideHeader">
              <span>En esta planilla</span>
              <strong>{formatAmountMoneyPEN(pendingTotal)}</strong>
            </div>
            {!pendingGroups.length && (
              <p className="payrollSelfSubmission-sideEmpty">
                Todavía no tienes solicitudes enviadas a esta planilla.
              </p>
            )}
            {pendingGroups.map(group => (
              <article
                key={group.key}
                className="payrollSelfSubmission-sideReport"
              >
                <header className="payrollSelfSubmission-reportGroupHeader">
                  <div>
                    <span>Trámite de planilla</span>
                    <strong>{formatAmountMoneyPEN(group.total)}</strong>
                  </div>
                  <button
                    type="button"
                    className="payrollSelfSubmission-attachmentButton"
                    onClick={() => openAttachmentManager(group)}
                    disabled={!group.paymessageId}
                  >
                    <FiPaperclip size={14} />
                    Adjuntos {group.files.length}
                  </button>
                </header>
                {group.reports.map(report => (
                  <div
                    key={report.id}
                    className="payrollSelfSubmission-reportItem"
                  >
                    <div>
                      <b className="payrollSelfSubmission-reportKind">
                        {reportKind(report)}
                      </b>
                      <strong>{report.name}</strong>
                      <span>
                        {reportTaskCount(report)} tareas ·{' '}
                        {formatAmountMoneyPEN(reportAmount(report))}
                      </span>
                    </div>
                    <div className="payrollSelfSubmission-sideActions">
                      <button
                        type="button"
                        onClick={() => openReport(report.id)}
                      >
                        <FiEye size={14} />
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMutation.mutate(report.id)}
                        disabled={removeMutation.isPending}
                      >
                        <FiTrash2 size={14} />
                        Retirar
                      </button>
                    </div>
                  </div>
                ))}
              </article>
            ))}
          </section>

          <section className="payrollSelfSubmission-sideSection">
            <div className="payrollSelfSubmission-sideHeader">
              <span>Reportes anteriores</span>
              <strong>{historyGroups.length}</strong>
            </div>
            {!historyGroups.length && (
              <p className="payrollSelfSubmission-sideEmpty">
                Aún no hay reportes anteriores para mostrar.
              </p>
            )}
            {historyGroups.map(group => (
              <article
                key={group.key}
                className="payrollSelfSubmission-historyGroup"
              >
                <header className="payrollSelfSubmission-reportGroupHeader">
                  <div>
                    <strong>{group.title}</strong>
                    <span>
                      {group.status || 'Sin estado'} ·{' '}
                      {formatAmountMoneyPEN(group.total)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="payrollSelfSubmission-attachmentButton"
                    onClick={() => openAttachmentManager(group)}
                    disabled={!group.paymessageId}
                  >
                    <FiPaperclip size={14} />
                    {group.files.length}
                  </button>
                </header>
                {group.reports.map(report => (
                  <div
                    key={report.id}
                    className="payrollSelfSubmission-historyReport"
                  >
                    <div>
                      <span>{report.name}</span>
                      <small>
                        {reportKind(report)} ·{' '}
                        {formatAmountMoneyPEN(reportAmount(report))}
                      </small>
                    </div>
                    <button type="button" onClick={() => openReport(report.id)}>
                      <FiEye size={14} />
                    </button>
                  </div>
                ))}
              </article>
            ))}
          </section>
        </aside>
      </div>
      {attachmentTarget && (
        <div
          className="payrollSelfSubmission-attachmentOverlay"
          onClick={() => setAttachmentTarget(null)}
        >
          <section
            className="payrollSelfSubmission-attachmentPanel"
            onClick={event => event.stopPropagation()}
          >
            <header>
              <div>
                <span>Adjuntos del trámite</span>
                <strong>{attachmentTarget.title}</strong>
              </div>
              <button type="button" onClick={() => setAttachmentTarget(null)}>
                <FiX size={18} />
              </button>
            </header>
            <label className="payrollSelfSubmission-uploadBox">
              <FiUpload size={18} />
              <span>
                {attachmentFiles.length
                  ? `${attachmentFiles.length} archivo(s) listo(s)`
                  : 'Seleccionar archivos'}
              </span>
              <input
                type="file"
                multiple
                onChange={event =>
                  setAttachmentFiles(Array.from(event.target.files || []))
                }
              />
            </label>
            <Button
              text="Subir adjuntos"
              color="secondary"
              disabled={
                !attachmentFiles.length || uploadAttachmentsMutation.isPending
              }
              onClick={() => uploadAttachmentsMutation.mutate()}
            />
            <div className="payrollSelfSubmission-attachmentList">
              {attachmentsQuery.isLoading && <LoaderForComponent />}
              {!attachmentsQuery.isLoading &&
                !(attachmentsQuery.data?.files || []).length && (
                  <p className="payrollSelfSubmission-sideEmpty">
                    Este trámite aún no tiene adjuntos.
                  </p>
                )}
              {(attachmentsQuery.data?.files || []).map(file => (
                <article key={file.id}>
                  <button
                    type="button"
                    onClick={() => window.open(fileUrl(file), '_blank')}
                  >
                    <FiPaperclip size={14} />
                    <span>{file.originalname || file.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAttachmentMutation.mutate(file.id)}
                    disabled={deleteAttachmentMutation.isPending}
                  >
                    <FiTrash2 size={14} />
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default PayrollSelfSubmission;

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Edit3,
  FileText,
  FilePlus2,
  FolderKanban,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import Button from '@/components/button/Button';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import useRole from '@/hooks/useRole';
import type { RootState } from '@/store/store.types';
import {
  createProgressReport,
  deleteProgressReportDraft,
  getOfficeProjectModerators,
  getProgressReportsWorkspace,
  getReportIndexTemplates,
  updateProgressReport,
} from '../../services/officeMeetings.service';
import {
  getMeetingUnitProjects,
  getMeetingUnitsOverview,
} from '../../services/meetingUnitProjects.service';
import type {
  ProgressReport,
  ProgressReportPayload,
} from '../../types/officeMeetings.types';
import type { MeetingProjectFocus } from '../../types/meetingUnitProjects.types';
import { OfficeUnitTreeSelect } from '../../components/OfficeUnitTreeSelect';
import './progressReportsWorkspace.css';

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'short',
      }).format(new Date(value))
    : 'Sin fecha';

const getProjectLabel = (projectFocus: MeetingProjectFocus) =>
  projectFocus.project.contract.projectShortName ||
  projectFocus.project.contract.projectName ||
  projectFocus.project.name ||
  'Proyecto';

const ProgressReportsWorkspace = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionUserId = useSelector((state: RootState) => state.userSession.id);
  const { hasAccess: isModuleMod } = useRole('MOD', 'grupos');
  const [newReportOpen, setNewReportOpen] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [presenterType, setPresenterType] = useState<'USER' | 'TEAM' | 'GROUP'>(
    'USER'
  );
  const [participantUserIds, setParticipantUserIds] = useState<number[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [newReportTitle, setNewReportTitle] = useState('');
  const [editingDraftId, setEditingDraftId] = useState('');
  const [editingDraftTitle, setEditingDraftTitle] = useState('');

  const workspaceQuery = useQuery({
    queryKey: ['progress-reports', 'workspace'],
    queryFn: getProgressReportsWorkspace,
  });

  const unitsQuery = useQuery({
    queryKey: ['meeting-units', 'overview'],
    queryFn: getMeetingUnitsOverview,
  });

  const projectsQuery = useQuery({
    queryKey: ['meeting-unit-projects', selectedUnitId],
    queryFn: () => getMeetingUnitProjects(selectedUnitId),
    enabled: !!selectedUnitId,
  });

  const membersQuery = useQuery({
    queryKey: ['office-project-moderators', selectedUnitId],
    queryFn: () => getOfficeProjectModerators(selectedUnitId),
    enabled: !!selectedUnitId,
  });

  const indexTemplatesQuery = useQuery({
    queryKey: ['report-index-templates', selectedUnitId],
    queryFn: () => getReportIndexTemplates({ unitId: selectedUnitId }),
    enabled: !!selectedUnitId,
  });

  const createReportMutation = useMutation({
    mutationFn: (payload: ProgressReportPayload) =>
      createProgressReport(payload),
    onSuccess: report => {
      queryClient.invalidateQueries({ queryKey: ['progress-reports'] });
      setNewReportOpen(false);
      navigate(`/grupos/informes/${report.id}`);
    },
  });

  const renameDraftMutation = useMutation({
    mutationFn: ({ reportId, title }: { reportId: string; title: string }) =>
      updateProgressReport(reportId, { title }),
    onSuccess: () => {
      setEditingDraftId('');
      setEditingDraftTitle('');
      queryClient.invalidateQueries({ queryKey: ['progress-reports'] });
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: deleteProgressReportDraft,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress-reports'] });
    },
  });

  if (workspaceQuery.isLoading) return <LoaderForComponent />;

  const workspace = workspaceQuery.data;
  const pending = workspace?.pending ?? [];
  const drafts = workspace?.drafts ?? [];
  const ready = workspace?.ready ?? [];
  const teamOrGroup = workspace?.teamOrGroup ?? [];
  const units = unitsQuery.data?.data ?? [];
  const unitProjects = (projectsQuery.data ?? []) as MeetingProjectFocus[];
  const selectedProject = unitProjects.find(
    project => String(project.projectId) === selectedProjectId
  );
  const members = membersQuery.data?.memberships ?? [];
  const canCreateGroup =
    isModuleMod || Boolean(membersQuery.data?.canManageCurrentUnit);

  const buildDefaultItems = (projectFocus: MeetingProjectFocus) =>
    projectFocus.project.stages.length
      ? projectFocus.project.stages.map(stage => ({
          name: stage.name,
          source: 'CUSTOM' as const,
          status: stage.status
            ? ('COMPLETED' as const)
            : ('IN_PROGRESS' as const),
          progress: stage.status ? 100 : 0,
          observations: '',
        }))
      : [
          {
            name: 'Avance general del proyecto',
            source: 'PROJECT_ONLY' as const,
            status: 'IN_PROGRESS' as const,
            progress: 0,
            observations: '',
          },
        ];

  const createFromProject = (projectFocus: MeetingProjectFocus) => {
    createReportMutation.mutate({
      unitId: projectFocus.unitId,
      projectId: projectFocus.projectId,
      title: `Borrador - ${getProjectLabel(projectFocus)}`,
      presenterType: 'USER',
      overallProgress: 0,
      items: buildDefaultItems(projectFocus),
    });
  };

  const createFromModal = () => {
    if (!selectedUnitId || !selectedProject) return;
    createReportMutation.mutate({
      unitId: selectedUnitId,
      projectId: selectedProject.projectId,
      title:
        newReportTitle.trim() ||
        `Borrador - ${getProjectLabel(selectedProject)}`,
      presenterType,
      presenterUserId: presenterType === 'USER' ? sessionUserId : null,
      participantUserIds: presenterType === 'TEAM' ? participantUserIds : [],
      templateId: selectedTemplateId || null,
      overallProgress: 0,
      items: selectedTemplateId
        ? undefined
        : buildDefaultItems(selectedProject),
    });
  };

  const startRenameDraft = (report: ProgressReport) => {
    setEditingDraftId(report.id);
    setEditingDraftTitle(report.title ?? '');
  };

  const saveRenameDraft = (report: ProgressReport) => {
    renameDraftMutation.mutate({
      reportId: report.id,
      title: editingDraftTitle,
    });
  };

  const toggleParticipant = (userId: number) => {
    setParticipantUserIds(current =>
      current.includes(userId)
        ? current.filter(currentId => currentId !== userId)
        : [...current, userId]
    );
  };

  const renderReportRow = (report: ProgressReport, action: string) => (
    <article className="prw-reportRow" key={report.id}>
      <span className="prw-icon">
        <FolderKanban size={18} />
      </span>
      <div>
        <strong>{report.project.name}</strong>
        <small>
          {report.unit.name} / actualizado {formatDate(report.updatedAt)}
        </small>
      </div>
      <span className={`prw-status is-${report.status.toLowerCase()}`}>
        {report.status === 'READY' ? 'Listo' : 'Borrador'}
      </span>
      <Button
        text={action}
        color="primary"
        onClick={() => navigate(`/grupos/informes/${report.id}`)}
      />
    </article>
  );

  return (
    <main className="prw-page">
      <header className="prw-header">
        <div>
          <p>Mi espacio de trabajo</p>
          <h1>Mis informes de avance</h1>
          <span>Prepara tus avances por proyecto antes de una reunion.</span>
        </div>
        <Button
          text="Nuevo informe"
          color="primary"
          leftIcon={<FilePlus2 size={16} />}
          onClick={() => setNewReportOpen(true)}
        />
      </header>

      <section className="prw-layout">
        <div className="prw-main">
          <section>
            <div className="prw-sectionTitle">
              <h2>Informes pendientes de preparar</h2>
              <b>{pending.length} acciones requeridas</b>
            </div>
            <div className="prw-list">
              {pending.map(({ unit, projectFocus }) => (
                <article
                  className="prw-reportRow"
                  key={`${unit.id}-${projectFocus.projectId}`}
                >
                  <span className="prw-icon">
                    <FolderKanban size={18} />
                  </span>
                  <div>
                    <strong>{projectFocus.project.name}</strong>
                    <small>
                      {unit.name} / {getProjectLabel(projectFocus)} / informe
                      faltante
                    </small>
                  </div>
                  <Button
                    text="Iniciar informe"
                    color="primary"
                    disabled={createReportMutation.isPending}
                    onClick={() => createFromProject(projectFocus)}
                  />
                </article>
              ))}
              {!pending.length && (
                <p className="prw-empty">No tienes informes pendientes.</p>
              )}
            </div>
          </section>

          <section>
            <div className="prw-sectionTitle">
              <h2>Borradores personales</h2>
            </div>
            <div className="prw-draftGrid">
              {drafts.map(report => (
                <article className="prw-draftCard" key={report.id}>
                  <div className="prw-draftTop">
                    <span>Borrador</span>
                    <div>
                      <button
                        type="button"
                        title="Renombrar borrador"
                        onClick={() => startRenameDraft(report)}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        title="Eliminar borrador"
                        disabled={deleteDraftMutation.isPending}
                        onClick={() => {
                          if (
                            window.confirm('Eliminar este borrador de informe?')
                          ) {
                            deleteDraftMutation.mutate(report.id);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <small>Guardado {formatDate(report.updatedAt)}</small>
                  {editingDraftId === report.id ? (
                    <div className="prw-renameDraft">
                      <input
                        autoFocus
                        value={editingDraftTitle}
                        onChange={event =>
                          setEditingDraftTitle(event.target.value)
                        }
                        placeholder="Nombre del borrador"
                      />
                      <button
                        type="button"
                        disabled={renameDraftMutation.isPending}
                        onClick={() => saveRenameDraft(report)}
                      >
                        Guardar
                      </button>
                    </div>
                  ) : (
                    <strong>{report.title || 'Borrador sin nombre'}</strong>
                  )}
                  <small>Proyecto: {report.project.name}</small>
                  <div className="prw-progress">
                    <i style={{ width: `${report.overallProgress}%` }} />
                  </div>
                  <b>{report.overallProgress}%</b>
                  <Button
                    text="Continuar preparación"
                    color="grayLigth"
                    textColor="secondary"
                    full
                    onClick={() => navigate(`/grupos/informes/${report.id}`)}
                  />
                </article>
              ))}
              {!drafts.length && (
                <p className="prw-empty">No hay borradores en progreso.</p>
              )}
            </div>
          </section>

          <section>
            <div className="prw-sectionTitle">
              <h2>Equipo y oficina</h2>
              <b>{teamOrGroup.length} informes</b>
            </div>
            <div className="prw-list">
              {teamOrGroup.map(report => renderReportRow(report, 'Abrir'))}
              {!teamOrGroup.length && (
                <p className="prw-empty">
                  No hay informes de equipo u oficina todavia.
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="prw-side">
          <section className="prw-stats">
            <div className="prw-statsIcon">
              <Target size={22} />
            </div>
            <span>Salud de preparación</span>
            <strong>{workspace?.stats.completionRate ?? 0}%</strong>
            <div className="prw-progress is-light">
              <i
                style={{ width: `${workspace?.stats.completionRate ?? 0}%` }}
              />
            </div>
            <div className="prw-statGrid">
              <p>
                <b>{workspace?.stats.ready ?? 0}</b>
                listos
              </p>
              <p>
                <b>{workspace?.stats.drafts ?? 0}</b>
                borradores
              </p>
            </div>
          </section>

          <section className="prw-ready">
            <div className="prw-readyTitle">
              <CheckCircle2 size={16} />
              <h2>Listos para reunion</h2>
            </div>
            {ready.slice(0, 4).map(report => (
              <button
                type="button"
                key={report.id}
                onClick={() => navigate(`/grupos/informes/${report.id}`)}
              >
                <FileText size={16} />
                <span>
                  <strong>{report.project.name}</strong>
                  <small>Finalizado {formatDate(report.updatedAt)}</small>
                </span>
              </button>
            ))}
            {!ready.length && (
              <p className="prw-empty">Todavia no hay informes listos.</p>
            )}
          </section>

          <section className="prw-ready">
            <div className="prw-readyTitle">
              <BarChart3 size={16} />
              <h2>Resumen</h2>
            </div>
            <button type="button">
              <Clock3 size={16} />
              <span>
                <strong>{workspace?.stats.pending ?? 0} pendientes</strong>
                <small>Proyectos activos sin informe propio</small>
              </span>
            </button>
          </section>
        </aside>
      </section>

      {newReportOpen && (
        <div className="prw-modalBackdrop" role="presentation">
          <section className="prw-modal" role="dialog" aria-modal="true">
            <header>
              <div>
                <h2>Nuevo informe</h2>
                <p>Elige oficina, proyecto, presentador e indice inicial.</p>
              </div>
              <button type="button" onClick={() => setNewReportOpen(false)}>
                <X size={18} />
              </button>
            </header>

            <label>
              Nombre del borrador
              <input
                value={newReportTitle}
                onChange={event => setNewReportTitle(event.target.value)}
                placeholder="Ej. Revision semanal de estructuras"
              />
            </label>

            <label>
              Oficina
              <OfficeUnitTreeSelect
                units={units}
                value={selectedUnitId}
                onValueChange={value => {
                  setSelectedUnitId(value);
                  setSelectedProjectId('');
                  setSelectedTemplateId('');
                  setParticipantUserIds([]);
                  setPresenterType('USER');
                }}
                placeholder="Seleccionar oficina"
              />
            </label>

            <label>
              Proyecto activo
              <select
                value={selectedProjectId}
                onChange={event => setSelectedProjectId(event.target.value)}
                disabled={!selectedUnitId}
              >
                <option value="">Seleccionar proyecto</option>
                {unitProjects.map(projectFocus => (
                  <option value={projectFocus.projectId} key={projectFocus.id}>
                    {getProjectLabel(projectFocus)}
                  </option>
                ))}
              </select>
            </label>

            <section>
              <h3>Presentador</h3>
              <div className="prw-typeGrid">
                {(['USER', 'TEAM', 'GROUP'] as const).map(type => (
                  <button
                    type="button"
                    key={type}
                    className={presenterType === type ? 'is-active' : ''}
                    disabled={type === 'GROUP' && !canCreateGroup}
                    onClick={() => setPresenterType(type)}
                  >
                    {type === 'USER'
                      ? 'Persona'
                      : type === 'TEAM'
                      ? 'Equipo'
                      : 'Oficina'}
                  </button>
                ))}
              </div>
            </section>

            {presenterType === 'TEAM' && (
              <section>
                <h3>Integrantes</h3>
                <div className="prw-memberPicker">
                  {members.map(member => {
                    const profile = member.user.profile;
                    const fullName = profile
                      ? `${profile.firstName} ${profile.lastName}`
                      : member.user.email || `Usuario ${member.userId}`;
                    return (
                      <label key={member.id}>
                        <input
                          type="checkbox"
                          checked={participantUserIds.includes(member.userId)}
                          onChange={() => toggleParticipant(member.userId)}
                        />
                        {fullName}
                      </label>
                    );
                  })}
                </div>
              </section>
            )}

            <label>
              Indice inicial
              <select
                value={selectedTemplateId}
                onChange={event => setSelectedTemplateId(event.target.value)}
                disabled={!selectedUnitId}
              >
                <option value="">Sin indice, usar etapas del proyecto</option>
                {(indexTemplatesQuery.data ?? []).map(template => (
                  <option value={template.id} key={template.id}>
                    {template.name} ({template.scope})
                  </option>
                ))}
              </select>
            </label>

            <footer>
              <Button
                text="Crear informe"
                color="primary"
                full
                disabled={
                  !selectedUnitId ||
                  !selectedProjectId ||
                  createReportMutation.isPending ||
                  (presenterType === 'TEAM' && participantUserIds.length < 2)
                }
                onClick={createFromModal}
              />
            </footer>
          </section>
        </div>
      )}
    </main>
  );
};

export default ProgressReportsWorkspace;

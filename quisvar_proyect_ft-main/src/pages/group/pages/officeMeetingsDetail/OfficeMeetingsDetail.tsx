import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  FolderPlus,
  FolderKanban,
  Plus,
  Play,
  Search,
  ShieldCheck,
  UserMinus,
  UserPlus,
  X,
  Users,
} from 'lucide-react';
import { AppBadge } from '@/components/app-ui/app-badge';
import { AppButton } from '@/components/app-ui/app-button';
import Button from '@/components/button/Button';
import Input from '@/components/Input/Input';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import useRole from '@/hooks/useRole';
import {
  addOfficeMember,
  createMeeting,
  getMeetingExternalContacts,
  getMeetingUnitDashboard,
  getOfficeMemberCandidates,
  getOfficeProjectModerators,
  removeOfficeMember,
  startMeeting,
} from '../../services/officeMeetings.service';
import { getMeetingUnitsOverview } from '../../services/meetingUnitProjects.service';
import type {
  MeetingExternalContact,
  OfficeMemberCandidate,
  OfficeMemberRole,
  OfficeProjectModerator,
} from '../../types/officeMeetings.types';
import type { MeetingProjectFocus } from '../../types/meetingUnitProjects.types';
import './officeMeetingsDetail.css';

const memberRoles: OfficeMemberRole[] = [
  'JEFE',
  'COORDINADOR',
  'ESPECIALISTA',
  'ASISTENTE',
  'APOYO',
  'GERENTE',
];

const getPersonName = (
  person?: OfficeProjectModerator['user'] | OfficeMemberCandidate | null
) => {
  const profile = person?.profile;
  const name = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
  return name || person?.email || 'Usuario sin nombre';
};

const toDateTimeLocal = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const formatMeetingDateForTitle = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date
    .toLocaleString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(',', '');
};

const formatMeetingTime = (value?: string | null) => {
  if (!value) return 'Sin hora';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin hora';
  return date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMeetingDay = (value?: string | null) => {
  if (!value) return { month: '--', day: '--' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { month: '--', day: '--' };
  return {
    month: date
      .toLocaleDateString('es-PE', { month: 'short' })
      .replace('.', '')
      .toUpperCase(),
    day: date.toLocaleDateString('es-PE', { day: '2-digit' }),
  };
};

const buildDefaultMeetingTitle = (unitName: string, scheduledAt: string) => {
  const formatted = formatMeetingDateForTitle(scheduledAt);
  return formatted ? `${unitName} - ${formatted}` : `${unitName} - Reunion`;
};

const toDisplayTitle = (value: string) =>
  value
    .toLocaleLowerCase('es-PE')
    .replace(/(^|\s)(\S)/g, match => match.toLocaleUpperCase('es-PE'));

const OfficeMeetingsDetail = () => {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [showMemberManager, setShowMemberManager] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingTitleTouched, setMeetingTitleTouched] = useState(false);
  const [meetingScheduledAt, setMeetingScheduledAt] = useState(
    toDateTimeLocal(new Date())
  );
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
  const [agendaTopics, setAgendaTopics] = useState<string[]>([
    'Agenda general',
  ]);
  const [invitedSearch, setInvitedSearch] = useState('');
  const [selectedInvitedUsers, setSelectedInvitedUsers] = useState<
    OfficeMemberCandidate[]
  >([]);
  const [externalSearch, setExternalSearch] = useState('');
  const [selectedExternalContacts, setSelectedExternalContacts] = useState<
    MeetingExternalContact[]
  >([]);
  const [externalGuestName, setExternalGuestName] = useState('');
  const [externalGuestPosition, setExternalGuestPosition] = useState('');
  const [externalGuestOrganization, setExternalGuestOrganization] =
    useState('');
  const [externalGuestPhone, setExternalGuestPhone] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] =
    useState<OfficeMemberCandidate | null>(null);
  const [memberRole, setMemberRole] =
    useState<OfficeMemberRole>('ESPECIALISTA');
  const [grantLocalMod, setGrantLocalMod] = useState(false);
  const { hasAccess: isModuleMod } = useRole('MOD', 'grupos');
  const { hasAccess: isModuleMember } = useRole('MEMBER', 'grupos');
  const { hasAccess: isModuleUser } = useRole('USER', 'grupos');

  const overviewQuery = useQuery({
    queryKey: ['office-meetings', 'overview'],
    queryFn: getMeetingUnitsOverview,
  });

  const dashboardQuery = useQuery({
    queryKey: ['office-meetings', 'dashboard', unitId],
    queryFn: () => getMeetingUnitDashboard(unitId!),
    enabled: !!unitId,
  });

  const moderatorsQuery = useQuery({
    queryKey: ['office-project-moderators', unitId],
    queryFn: () => getOfficeProjectModerators(unitId!),
    enabled: !!unitId,
  });

  const memberCandidatesQuery = useQuery({
    queryKey: ['office-member-candidates', unitId, memberSearch],
    queryFn: () => getOfficeMemberCandidates(unitId!, memberSearch),
    enabled: !!unitId && showMemberManager,
  });

  const invitedUserCandidatesQuery = useQuery({
    queryKey: ['office-invited-user-candidates', unitId, invitedSearch],
    queryFn: () => getOfficeMemberCandidates(unitId!, invitedSearch),
    enabled: !!unitId && showNewMeeting,
  });

  const externalContactsQuery = useQuery({
    queryKey: ['meeting-external-contacts', externalSearch],
    queryFn: () => getMeetingExternalContacts(externalSearch),
    enabled: showNewMeeting,
  });

  const selectedUnit = useMemo(
    () => overviewQuery.data?.data.find(unit => unit.id === unitId),
    [overviewQuery.data, unitId]
  );

  const dashboard = dashboardQuery.data;
  const projects = dashboard?.projects ?? [];
  const unitName = dashboard?.unit?.name ?? selectedUnit?.name ?? 'Oficina';
  const displayUnitName = toDisplayTitle(unitName);
  const officeMembers = moderatorsQuery.data?.memberships ?? [];
  const recentMeetings = dashboard?.meetings ?? [];
  const latestReports = dashboard?.reports ?? [];
  const openCommitments = dashboard?.commitments ?? [];
  const canManageOffice =
    isModuleMod || Boolean(moderatorsQuery.data?.canManageCurrentUnit);

  useEffect(() => {
    if (!showNewMeeting) return;
    const defaultDate = toDateTimeLocal(new Date());
    setMeetingScheduledAt(defaultDate);
    setMeetingTitle(buildDefaultMeetingTitle(unitName, defaultDate));
    setMeetingTitleTouched(false);
    setSelectedProjectIds(
      projects
        .filter(projectFocus => projectFocus.status === 'ACTIVE')
        .map(projectFocus => projectFocus.projectId)
    );
  }, [showNewMeeting, unitName, projects]);

  useEffect(() => {
    if (!showNewMeeting || meetingTitleTouched) return;
    setMeetingTitle(buildDefaultMeetingTitle(unitName, meetingScheduledAt));
  }, [meetingScheduledAt, meetingTitleTouched, showNewMeeting, unitName]);

  const dueMilestonesCount = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    return projects.reduce((count, projectFocus) => {
      const milestones = projectFocus.project.contract.milestones ?? [];
      return (
        count +
        milestones.filter(milestone => {
          if (!milestone.dueDate || milestone.status === 'COMPLETED')
            return false;
          const dueDate = new Date(milestone.dueDate);
          return dueDate >= today && dueDate <= nextWeek;
        }).length
      );
    }, 0);
  }, [projects]);

  const createMeetingMutation = useMutation({
    mutationFn: async (mode: 'DRAFT' | 'LIVE') => {
      const participants = [
        ...(dashboard?.unit?.memberships ?? []).map(membership => ({
          userId: membership.user.id,
          status: 'PRESENT' as const,
          origin: 'UNIT_MEMBER' as const,
        })),
        ...selectedInvitedUsers.map(user => ({
          userId: user.id,
          status: 'PRESENT' as const,
          origin: 'INVITED' as const,
        })),
        ...selectedExternalContacts.map(contact => ({
          externalContactId: contact.id,
          status: 'PRESENT' as const,
          origin: 'INVITED' as const,
        })),
        ...(externalGuestName.trim()
          ? [
              {
                status: 'PRESENT' as const,
                origin: 'INVITED' as const,
                externalContact: {
                  name: externalGuestName,
                  position: externalGuestPosition,
                  organization: externalGuestOrganization,
                  phone: externalGuestPhone,
                },
              },
            ]
          : []),
      ];
      const createdMeeting = await createMeeting({
        unitId: unitId!,
        title:
          meetingTitle.trim() ||
          buildDefaultMeetingTitle(unitName, meetingScheduledAt),
        scheduledAt: new Date(meetingScheduledAt).toISOString(),
        projectIds: selectedProjectIds,
        agendaItems: agendaTopics
          .filter(topic => topic.trim())
          .map((topic, index) => ({
            title: topic.trim(),
            scope: 'GENERAL' as const,
            order: index,
          })),
        participants,
      });
      if (mode === 'LIVE') {
        return startMeeting(createdMeeting.id);
      }
      return createdMeeting;
    },
    onSuccess: meeting => {
      queryClient.invalidateQueries({
        queryKey: ['office-meetings', 'dashboard', unitId],
      });
      setShowNewMeeting(false);
      setInvitedSearch('');
      setSelectedInvitedUsers([]);
      setExternalSearch('');
      setSelectedExternalContacts([]);
      setExternalGuestName('');
      setExternalGuestPosition('');
      setExternalGuestOrganization('');
      setExternalGuestPhone('');
      setAgendaTopics(['Agenda general']);
      setMeetingTitleTouched(false);
      navigate(`/grupos/reuniones/${meeting.id}`);
    },
  });

  const invalidateMembers = () => {
    queryClient.invalidateQueries({
      queryKey: ['office-meetings', 'dashboard', unitId],
    });
    queryClient.invalidateQueries({
      queryKey: ['office-project-moderators', unitId],
    });
    queryClient.invalidateQueries({
      queryKey: ['office-member-candidates', unitId],
    });
    queryClient.invalidateQueries({
      queryKey: ['office-meetings', 'overview'],
    });
  };

  const addMemberMutation = useMutation({
    mutationFn: () =>
      addOfficeMember(unitId!, {
        userId: selectedCandidate!.id,
        role: memberRole,
        isPrimary: false,
        canManageUnitProjects: isModuleMod && grantLocalMod,
      }),
    onSuccess: () => {
      setSelectedCandidate(null);
      setMemberSearch('');
      setGrantLocalMod(false);
      invalidateMembers();
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (membershipId: string) =>
      removeOfficeMember(unitId!, membershipId),
    onSuccess: invalidateMembers,
  });

  const toggleProject = (projectId: number) => {
    setSelectedProjectIds(current =>
      current.includes(projectId)
        ? current.filter(id => id !== projectId)
        : [...current, projectId]
    );
  };

  const toggleInvitedUser = (user: OfficeMemberCandidate) => {
    setSelectedInvitedUsers(current =>
      current.some(item => item.id === user.id)
        ? current.filter(item => item.id !== user.id)
        : [...current, user]
    );
  };

  const toggleExternalContact = (contact: MeetingExternalContact) => {
    setSelectedExternalContacts(current =>
      current.some(item => item.id === contact.id)
        ? current.filter(item => item.id !== contact.id)
        : [...current, contact]
    );
  };

  const getInitials = (
    person?: OfficeProjectModerator['user'] | OfficeMemberCandidate | null
  ) => {
    const profile = person?.profile;
    const first = profile?.firstName?.[0] ?? '';
    const last = profile?.lastName?.[0] ?? '';
    return `${first}${last}` || getPersonName(person).slice(0, 2).toUpperCase();
  };

  const renderProjectCard = (
    projectFocus: MeetingProjectFocus,
    index: number
  ) => {
    const selected = selectedProjectIds.includes(projectFocus.projectId);
    return (
      <button
        type="button"
        className={`omd-projectPick ${selected ? 'is-selected' : ''}`}
        key={`meeting-project-pick-${projectFocus.projectId}-${index}`}
        onClick={() => toggleProject(projectFocus.projectId)}
      >
        <span className="omd-projectPickIcon">
          <FolderKanban size={18} />
        </span>
        <span className="omd-projectPickText">
          <strong>{projectFocus.project.name}</strong>
          <small>
            {projectFocus.project.contract.projectShortName ||
              projectFocus.project.contract.projectName}{' '}
            / {projectFocus.project.contract.municipality || 'Sin ubicacion'}
          </small>
        </span>
        <span className="omd-projectPickCheck">
          {selected && <CheckCircle2 size={18} />}
        </span>
      </button>
    );
  };

  if (dashboardQuery.isLoading) return <LoaderForComponent />;

  return (
    <main className="omd-page">
      <header className="omd-header">
        <div className="omd-heading">
          <nav className="omd-breadcrumb" aria-label="Ruta de oficina">
            <button type="button" onClick={() => navigate('/grupos')}>
              <ArrowLeft size={16} />
            </button>
            <button type="button" onClick={() => navigate('/grupos')}>
              Todas las oficinas
            </button>
            <span>/</span>
            <strong>Oficina</strong>
          </nav>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {displayUnitName}
            </h1>
          </div>
        </div>
        <div className="omd-actions">
          {canManageOffice && (
            <AppButton
              type="button"
              size="lg"
              onClick={() => setShowNewMeeting(true)}
            >
              <Plus size={16} />
              Nueva reunion
            </AppButton>
          )}
        </div>
      </header>

      <nav className="omd-tabs" aria-label="Secciones de oficina">
        <button type="button" className="is-active">
          Resumen
        </button>
        <button type="button" onClick={() => navigate('/grupos/calendario')}>
          Calendario
          <AppBadge variant="info">Nuevo</AppBadge>
        </button>
        <button
          type="button"
          onClick={() => navigate(`/grupos/proyectos-oficina?unitId=${unitId}`)}
        >
          Proyectos
        </button>
        <button type="button" onClick={() => setShowMemberManager(true)}>
          Miembros
        </button>
      </nav>

      <section className="omd-metrics">
        <article>
          <FolderKanban size={19} />
          <span>Proyectos activos</span>
          <strong>{projects.length}</strong>
        </article>
        <article>
          <ClipboardCheck size={19} />
          <span>Compromisos abiertos</span>
          <strong>{openCommitments.length}</strong>
        </article>
        <article>
          <CalendarDays size={19} />
          <span>Reuniones (mes)</span>
          <strong>{recentMeetings.length}</strong>
        </article>
        <article>
          <Users size={19} />
          <span>Miembros</span>
          <strong>{officeMembers.length}</strong>
        </article>
      </section>

      <section className="omd-grid">
        <div className="omd-mainColumn">
          <article className="omd-panel omd-projects">
            <div className="omd-panelHeader">
              <h2 className="text-base font-semibold text-slate-900">
                Proyectos activos
              </h2>
              {canManageOffice ? (
                <button
                  type="button"
                  className="omd-headerAction"
                  onClick={() =>
                    navigate(`/grupos/proyectos-oficina?unitId=${unitId}`)
                  }
                >
                  <FolderPlus size={16} />
                  Administrar
                </button>
              ) : (
                <FolderKanban size={17} />
              )}
            </div>
            {projects.map((projectFocus, index) => (
              <div
                className="omd-projectRow"
                key={`office-project-${projectFocus.projectId}-${index}`}
              >
                <div>
                  <strong>{projectFocus.project.name}</strong>
                  <span>CUI: {projectFocus.project.contract.cui}</span>
                </div>
                <AppBadge variant="success">{projectFocus.status}</AppBadge>
              </div>
            ))}
            {!projects.length && (
              <p className="omd-empty">
                Aun no hay proyectos activos marcados.
              </p>
            )}
          </article>

          <article className="omd-panel omd-recentMeetings">
            <div className="omd-panelHeader">
              <h2 className="text-base font-semibold text-slate-900">
                Reuniones recientes
              </h2>
            </div>
            {recentMeetings.map((meeting: any) => {
              const meetingDate = formatMeetingDay(meeting.scheduledAt);
              return (
                <button
                  type="button"
                  className="omd-meetingRow"
                  key={meeting.id}
                  onClick={() => navigate(`/grupos/reuniones/${meeting.id}`)}
                >
                  <span className="omd-dateTile">
                    <small>{meetingDate.month}</small>
                    <strong>{meetingDate.day}</strong>
                  </span>
                  <span>
                    <strong>{meeting.title}</strong>
                    <small>{formatMeetingTime(meeting.scheduledAt)}</small>
                  </span>
                  <AppBadge variant="review">{meeting.status}</AppBadge>
                </button>
              );
            })}
            {!recentMeetings.length && (
              <p className="omd-empty">Sin reuniones registradas.</p>
            )}
          </article>

          <article className="omd-panel omd-emptyCommitments">
            {!openCommitments.length ? (
              <div className="omd-emptyState">
                <span>
                  <CheckCircle2 size={23} />
                </span>
                <strong>Sin compromisos abiertos</strong>
                <p>
                  Excelente trabajo. La oficina no tiene tareas pendientes
                  atrasadas.
                </p>
              </div>
            ) : (
              <>
                <div className="omd-panelHeader">
                  <h2 className="text-base font-semibold text-slate-900">
                    Compromisos abiertos
                  </h2>
                </div>
                {openCommitments.map((commitment: any) => (
                  <div className="omd-listRow" key={commitment.id}>
                    <strong>{commitment.title}</strong>
                    <span>
                      {commitment.project?.name || 'General'} /{' '}
                      {commitment.status}
                    </span>
                  </div>
                ))}
              </>
            )}
          </article>
        </div>

        <aside className="omd-sideColumn">
          <article className="omd-panel omd-membersPanel">
            <div className="omd-panelHeader">
              <h2 className="text-base font-semibold text-slate-900">
                Miembros
              </h2>
              {canManageOffice ? (
                <button
                  type="button"
                  className="omd-linkAction"
                  onClick={() => setShowMemberManager(true)}
                >
                  Gestionar
                </button>
              ) : (
                <Users size={17} />
              )}
            </div>
            <div className="omd-memberPreviewList">
              {officeMembers.slice(0, 6).map(member => (
                <div className="omd-memberPreview" key={member.id}>
                  <span>{getInitials(member.user)}</span>
                  <div>
                    <strong>{getPersonName(member.user)}</strong>
                    <small>
                      {member.role}
                      {member.canManageUnitProjects ? ' / MOD oficina' : ''}
                    </small>
                  </div>
                </div>
              ))}
            </div>
            {!officeMembers.length && (
              <p className="omd-empty">
                Esta oficina aun no tiene miembros activos.
              </p>
            )}
          </article>

          <article className="omd-panel omd-reportsPanel">
            <div className="omd-panelHeader">
              <h2 className="text-base font-semibold text-slate-900">
                Ultimos informes
              </h2>
              {(isModuleMod || isModuleMember || isModuleUser) && (
                <FileText size={17} />
              )}
            </div>
            {latestReports.map((report: any) => (
              <div className="omd-reportRow" key={report.id}>
                <span>
                  <strong>{report.project?.name}</strong>
                  <small>{report.status}</small>
                </span>
                <b>{report.overallProgress}%</b>
              </div>
            ))}
            {!latestReports.length && (
              <p className="omd-empty">Sin informes preparados todavia.</p>
            )}
          </article>
        </aside>
      </section>

      {showNewMeeting && (
        <div className="omd-modalLayer">
          <button
            type="button"
            aria-label="Cerrar nueva reunion"
            className="omd-modalBackdrop"
            onClick={() => setShowNewMeeting(false)}
          />
          <aside className="omd-newMeetingPanel">
            <header className="omd-newMeetingHeader">
              <div>
                <h2>New Meeting</h2>
                <p>Configure session for {unitName}</p>
              </div>
              <button type="button" onClick={() => setShowNewMeeting(false)}>
                <X size={20} />
              </button>
            </header>

            <div className="omd-newMeetingBody">
              <label className="omd-field">
                <span>Titulo de la reunion</span>
                <input
                  value={meetingTitle}
                  onChange={event => {
                    setMeetingTitleTouched(true);
                    setMeetingTitle(event.target.value);
                  }}
                  placeholder={buildDefaultMeetingTitle(
                    unitName,
                    meetingScheduledAt
                  )}
                />
              </label>

              <label className="omd-field">
                <span>Fecha y hora</span>
                <input
                  type="datetime-local"
                  value={meetingScheduledAt}
                  onChange={event => setMeetingScheduledAt(event.target.value)}
                />
              </label>

              <section className="omd-topicSection">
                <div className="omd-topicHeader">
                  <span>Proyectos a tratar (opcional)</span>
                  <b>{selectedProjectIds.length} selected</b>
                </div>
                <div className="omd-topicList">
                  {projects.map(renderProjectCard)}
                  {!projects.length && (
                    <p className="omd-empty">
                      No hay proyectos enlazados a esta oficina.
                    </p>
                  )}
                </div>
              </section>

              <section className="omd-topicSection">
                <div className="omd-topicHeader">
                  <span>Temas de agenda general</span>
                  <button
                    type="button"
                    onClick={() => setAgendaTopics(current => [...current, ''])}
                  >
                    + Tema
                  </button>
                </div>
                <div className="omd-agendaInputs">
                  {agendaTopics.map((topic, index) => (
                    <label key={index}>
                      <span>Tema {index + 1}</span>
                      <input
                        value={topic}
                        onChange={event =>
                          setAgendaTopics(current =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? event.target.value : item
                            )
                          )
                        }
                        placeholder="Ej. Nuevas reglas administrativas"
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="omd-topicSection">
                <div className="omd-topicHeader">
                  <span>Asistentes invitados</span>
                  <b>
                    {selectedInvitedUsers.length +
                      selectedExternalContacts.length +
                      (externalGuestName.trim() ? 1 : 0)}{' '}
                    invitados
                  </b>
                </div>

                <div className="omd-guestBlock">
                  <label className="omd-memberSearch">
                    <Search size={15} />
                    <Input
                      value={invitedSearch}
                      onChange={event => setInvitedSearch(event.target.value)}
                      placeholder="Buscar usuario fuera de esta unidad"
                    />
                  </label>
                  <div className="omd-chipList">
                    {selectedInvitedUsers.map(user => (
                      <button
                        type="button"
                        key={user.id}
                        onClick={() => toggleInvitedUser(user)}
                      >
                        Invitado: {getPersonName(user)}
                      </button>
                    ))}
                  </div>
                  <div className="omd-candidateList is-compact">
                    {(invitedUserCandidatesQuery.data ?? [])
                      .slice(0, 5)
                      .map(user => (
                        <button
                          type="button"
                          className={`omd-candidate ${
                            selectedInvitedUsers.some(
                              item => item.id === user.id
                            )
                              ? 'is-selected'
                              : ''
                          }`}
                          key={user.id}
                          onClick={() => toggleInvitedUser(user)}
                        >
                          <span className="omd-memberAvatar">
                            {getPersonName(user).slice(0, 1).toUpperCase()}
                          </span>
                          <div>
                            <strong>{getPersonName(user)}</strong>
                            <small>
                              {user.profile?.job || user.email || 'Usuario'}
                            </small>
                          </div>
                          {selectedInvitedUsers.some(
                            item => item.id === user.id
                          ) && <CheckCircle2 size={17} />}
                        </button>
                      ))}
                  </div>
                </div>

                <div className="omd-guestBlock">
                  <label className="omd-memberSearch">
                    <Search size={15} />
                    <Input
                      value={externalSearch}
                      onChange={event => setExternalSearch(event.target.value)}
                      placeholder="Buscar contacto externo reutilizable"
                    />
                  </label>
                  <div className="omd-chipList">
                    {selectedExternalContacts.map(contact => (
                      <button
                        type="button"
                        key={contact.id}
                        onClick={() => toggleExternalContact(contact)}
                      >
                        Externo: {contact.name}
                      </button>
                    ))}
                  </div>
                  <div className="omd-candidateList is-compact">
                    {(externalContactsQuery.data ?? [])
                      .slice(0, 5)
                      .map(contact => (
                        <button
                          type="button"
                          className={`omd-candidate ${
                            selectedExternalContacts.some(
                              item => item.id === contact.id
                            )
                              ? 'is-selected'
                              : ''
                          }`}
                          key={contact.id}
                          onClick={() => toggleExternalContact(contact)}
                        >
                          <span className="omd-memberAvatar">
                            {contact.name.slice(0, 1).toUpperCase()}
                          </span>
                          <div>
                            <strong>{contact.name}</strong>
                            <small>
                              {[contact.position, contact.organization]
                                .filter(Boolean)
                                .join(' / ') || 'Contacto externo'}
                            </small>
                          </div>
                          {selectedExternalContacts.some(
                            item => item.id === contact.id
                          ) && <CheckCircle2 size={17} />}
                        </button>
                      ))}
                  </div>
                </div>

                <div className="omd-externalInline">
                  <strong>Crear externo rapido</strong>
                  <input
                    value={externalGuestName}
                    onChange={event => setExternalGuestName(event.target.value)}
                    placeholder="Nombre completo"
                  />
                  <input
                    value={externalGuestPosition}
                    onChange={event =>
                      setExternalGuestPosition(event.target.value)
                    }
                    placeholder="Cargo"
                  />
                  <input
                    value={externalGuestOrganization}
                    onChange={event =>
                      setExternalGuestOrganization(event.target.value)
                    }
                    placeholder="Institucion"
                  />
                  <input
                    value={externalGuestPhone}
                    onChange={event =>
                      setExternalGuestPhone(event.target.value)
                    }
                    placeholder="Telefono opcional"
                  />
                </div>
              </section>

              <section className="omd-checklist">
                <div>
                  <Clock size={15} />
                  <strong>Pre-meeting Checklist</strong>
                </div>
                <ul>
                  <li>
                    {dashboard?.commitments.length ?? 0} compromisos siguen
                    pendientes de reuniones previas.
                  </li>
                  <li>
                    {dueMilestonesCount} hitos vencen o requieren atencion esta
                    semana.
                  </li>
                  <li>
                    {dashboard?.unit?.memberships?.length ?? 0} miembros seran
                    precargados en asistencia.
                  </li>
                </ul>
              </section>
            </div>

            <footer className="omd-newMeetingFooter">
              <Button
                text="Start Meeting Now"
                color="primary"
                leftIcon={<Play size={17} fill="currentColor" />}
                full
                size="sm"
                disabled={
                  createMeetingMutation.isPending ||
                  (!selectedProjectIds.length &&
                    !agendaTopics.some(topic => topic.trim()))
                }
                onClick={() => createMeetingMutation.mutate('LIVE')}
              />
              <Button
                text="Draft / Save"
                color="grayLigth"
                textColor="secondary"
                size="sm"
                disabled={createMeetingMutation.isPending}
                onClick={() => createMeetingMutation.mutate('DRAFT')}
              />
            </footer>
          </aside>
        </div>
      )}

      {showMemberManager && (
        <div className="omd-modalLayer">
          <button
            type="button"
            aria-label="Cerrar gestion de miembros"
            className="omd-modalBackdrop"
            onClick={() => setShowMemberManager(false)}
          />
          <aside className="omd-memberManager">
            <header className="omd-newMeetingHeader">
              <div>
                <h2>Gestionar miembros</h2>
                <p>{unitName}</p>
              </div>
              <button type="button" onClick={() => setShowMemberManager(false)}>
                <X size={20} />
              </button>
            </header>

            <div className="omd-memberManagerBody">
              <section className="omd-memberSection">
                <div className="omd-memberSectionTitle">
                  <Users size={16} />
                  <strong>Miembros actuales</strong>
                </div>
                <div className="omd-memberList">
                  {officeMembers.map(member => (
                    <div className="omd-memberRow" key={member.id}>
                      <span className="omd-memberAvatar">
                        {getPersonName(member.user).slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <strong>{getPersonName(member.user)}</strong>
                        <small>
                          {member.role}
                          {member.canManageUnitProjects ? ' / MOD oficina' : ''}
                        </small>
                      </div>
                      {canManageOffice && (
                        <button
                          type="button"
                          title="Quitar de la oficina"
                          disabled={removeMemberMutation.isPending}
                          onClick={() => removeMemberMutation.mutate(member.id)}
                        >
                          <UserMinus size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {canManageOffice && (
                <section className="omd-memberSection">
                  <div className="omd-memberSectionTitle">
                    <UserPlus size={16} />
                    <strong>Agregar miembro</strong>
                  </div>

                  <label className="omd-memberSearch">
                    <Search size={15} />
                    <Input
                      value={memberSearch}
                      onChange={event => {
                        setMemberSearch(event.target.value);
                        setSelectedCandidate(null);
                      }}
                      placeholder="Buscar por nombre, DNI, cargo o correo"
                    />
                  </label>

                  <div className="omd-candidateList">
                    {(memberCandidatesQuery.data ?? []).map(candidate => (
                      <button
                        type="button"
                        className={`omd-candidate ${
                          selectedCandidate?.id === candidate.id
                            ? 'is-selected'
                            : ''
                        }`}
                        key={candidate.id}
                        onClick={() => setSelectedCandidate(candidate)}
                      >
                        <span className="omd-memberAvatar">
                          {getPersonName(candidate).slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <strong>{getPersonName(candidate)}</strong>
                          <small>
                            {candidate.profile?.job ||
                              candidate.email ||
                              'Sin cargo'}
                          </small>
                        </div>
                        {selectedCandidate?.id === candidate.id && (
                          <CheckCircle2 size={17} />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="omd-addMemberControls">
                    <label>
                      <span>Rol en oficina</span>
                      <select
                        value={memberRole}
                        onChange={event =>
                          setMemberRole(event.target.value as OfficeMemberRole)
                        }
                      >
                        {memberRoles.map(role => (
                          <option value={role} key={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </label>

                    {isModuleMod && (
                      <label className="omd-localModToggle">
                        <input
                          type="checkbox"
                          checked={grantLocalMod}
                          onChange={event =>
                            setGrantLocalMod(event.target.checked)
                          }
                        />
                        <span>
                          <ShieldCheck size={15} />
                          Dar MOD de oficina
                        </span>
                      </label>
                    )}
                  </div>

                  <Button
                    text="Agregar a la oficina"
                    color="primary"
                    full
                    disabled={!selectedCandidate || addMemberMutation.isPending}
                    onClick={() => addMemberMutation.mutate()}
                  />
                </section>
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
};

export default OfficeMeetingsDetail;

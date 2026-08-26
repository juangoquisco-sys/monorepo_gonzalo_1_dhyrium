import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  MessageSquareText,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Target,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { AppBadge } from '@/components/app-ui/app-badge';
import { AppButton } from '@/components/app-ui/app-button';
import { AppInput } from '@/components/app-ui/app-input';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import useRole from '@/hooks/useRole';
import {
  addMeetingAgendaItem,
  addMeetingParticipants,
  confirmCommitment,
  createCommitment,
  createCommitmentProposal,
  deleteCommitment,
  endMeeting,
  getCommitments,
  getMeeting,
  getMeetings,
  getMeetingExternalContacts,
  getMeetingParticipantCandidates,
  getOfficeProjectModerators,
  removeMeetingParticipant,
  resumeMeeting,
  updateMeetingAgendaItem,
  updateCommitment,
  updateCommitmentStatus,
  updateMeetingAttendance,
  updateMeetingMinutes,
  updateMeetingProjectMinutes,
  updateMeetingScope,
} from '../../services/officeMeetings.service';
import type {
  CommitmentTargetType,
  Commitment,
  MeetingExternalContact,
  MeetingHistoryItem,
  MeetingAgendaItem,
  MeetingParticipant,
  MeetingParticipantStatus,
  MeetingScope,
  MeetingWorkspaceView,
  OfficeMemberCandidate,
} from '../../types/officeMeetings.types';
import type { MeetingProjectFocus } from '../../types/meetingUnitProjects.types';
import CommitmentsBoardWorkspace from '../commitmentsBoardWorkspace/CommitmentsBoardWorkspace';
import TechnicalOfficeProjectsWorkspace from '../technicalOfficeProjectsWorkspace/TechnicalOfficeProjectsWorkspace';
import './meetingWorkspace.css';

type CommitmentCreatePayload = Parameters<typeof createCommitment>[0];

const reportStatusLabel: Record<string, string> = {
  DRAFT: 'Borrador',
  READY: 'Listo',
  PRESENTED: 'Presentado',
  ARCHIVED: 'Archivado',
};

const itemStatusLabel: Record<string, string> = {
  NOT_STARTED: 'Sin iniciar',
  IN_PROGRESS: 'En avance',
  IN_REVIEW: 'En revision',
  WAITING_ASITEC: 'En ASITEC',
  COMPLETED: 'Completado',
  BLOCKED: 'Bloqueado',
};

const sourceLabel: Record<string, string> = {
  PROJECT_ONLY: 'Proyecto',
  ASITEC: 'ASITEC',
  REUSABLE_TEMPLATE: 'Plantilla',
  CUSTOM: 'Personalizado',
};

const attendanceLabel: Record<string, string> = {
  PRESENT: 'Presente',
  LATE: 'Tarde',
  ABSENT: 'Ausente',
  EXCUSED: 'Justificado',
};

const commitmentStatusLabel: Record<string, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En avance',
  DONE: 'Cumplido',
  BLOCKED: 'Pospuesto',
  CANCELLED: 'Cancelado',
};

const getCommitmentContextLabel = (commitment: Commitment) => {
  const context =
    commitment.contexts?.find(item => item.isPrimary) ||
    commitment.contexts?.[0];
  return (
    context?.subTask?.name ||
    context?.level?.name ||
    context?.stage?.name ||
    context?.project?.name ||
    commitment.project?.name ||
    context?.unit?.name ||
    commitment.unit?.name ||
    'Reunion'
  );
};

const toDateInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const dateInputToIso = (value?: string | null) =>
  value ? new Date(`${value}T12:00:00`).toISOString() : null;

const formatDateShort = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const isOverdue = (value?: string | null, status?: string) => {
  if (!value || status === 'DONE' || status === 'CANCELLED') return false;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return false;
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const inlineMarkdown = (value: string) =>
  escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');

const renderMarkdown = (value: string) => {
  const lines = value.split('\n');
  const html: string[] = [];
  let listOpen = false;
  const closeList = () => {
    if (listOpen) {
      html.push('</ul>');
      listOpen = false;
    }
  };
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      html.push('<br />');
      return;
    }
    if (trimmed.startsWith('### ')) {
      closeList();
      html.push(`<h4>${inlineMarkdown(trimmed.slice(4))}</h4>`);
      return;
    }
    if (trimmed.startsWith('## ')) {
      closeList();
      html.push(`<h3>${inlineMarkdown(trimmed.slice(3))}</h3>`);
      return;
    }
    if (trimmed.startsWith('# ')) {
      closeList();
      html.push(`<h2>${inlineMarkdown(trimmed.slice(2))}</h2>`);
      return;
    }
    if (trimmed.startsWith('- ')) {
      if (!listOpen) {
        html.push('<ul>');
        listOpen = true;
      }
      html.push(`<li>${inlineMarkdown(trimmed.slice(2))}</li>`);
      return;
    }
    if (trimmed.startsWith('> ')) {
      closeList();
      html.push(`<blockquote>${inlineMarkdown(trimmed.slice(2))}</blockquote>`);
      return;
    }
    closeList();
    html.push(`<p>${inlineMarkdown(trimmed)}</p>`);
  });
  closeList();
  return html.join('');
};

const MarkdownEditor = ({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  compact,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  compact?: boolean;
}) => {
  const [preview, setPreview] = useState(false);
  return (
    <div className={`mw-mdEditor ${compact ? 'is-compact' : ''}`}>
      <div className="mw-mdHeader">
        <span>{label}</span>
        <button type="button" onClick={() => setPreview(current => !current)}>
          <Eye size={14} />
          {preview ? 'Editar' : 'Vista MD'}
        </button>
      </div>
      {preview ? (
        <div
          className="mw-mdPreview"
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(value || '_Sin contenido todavia._'),
          }}
        />
      ) : (
        <textarea
          value={value}
          onChange={event => onChange(event.target.value)}
          disabled={disabled}
          placeholder={placeholder}
        />
      )}
      <small>
        Usa # titulos, - listas, **negrita**, `codigo` y &gt; citas.
      </small>
    </div>
  );
};

const getPersonName = (user?: any) => {
  const profile = user?.profile;
  const fullName = `${profile?.firstName ?? ''} ${
    profile?.lastName ?? ''
  }`.trim();
  return fullName || 'Sin nombre';
};

const getParticipantName = (participant?: MeetingParticipant) => {
  if (!participant) return 'Sin nombre';
  if (participant.displayName) return participant.displayName;
  if (participant.participantType === 'EXTERNAL')
    return participant.externalContact?.name || 'Invitado externo';
  return getPersonName(participant.user);
};

const getParticipantMeta = (participant?: MeetingParticipant) => {
  if (!participant) return '';
  const position =
    participant.position || participant.externalContact?.position;
  const organization =
    participant.organization || participant.externalContact?.organization;
  return [position, organization].filter(Boolean).join(' / ');
};

type MeetingWorkspaceTab =
  | 'main'
  | 'commitments'
  | 'projectMinutes'
  | 'membersProjects';

type MeetingOperationalView =
  | 'units'
  | 'technical-tree'
  | 'members'
  | 'projects-members';

const meetingViewTabs: {
  value: MeetingWorkspaceView;
  operationalView: MeetingOperationalView;
  label: string;
  icon: typeof ClipboardList;
}[] = [
  {
    value: 'UNITS',
    operationalView: 'units',
    label: 'Unidades',
    icon: ClipboardList,
  },
  {
    value: 'TECHNICAL_TREE',
    operationalView: 'technical-tree',
    label: 'Árbol técnico',
    icon: BriefcaseBusiness,
  },
  {
    value: 'MEMBERS',
    operationalView: 'members',
    label: 'Miembros',
    icon: UsersRound,
  },
  {
    value: 'PROJECTS_MEMBERS',
    operationalView: 'projects-members',
    label: 'Proyectos + miembros',
    icon: Target,
  },
];

const defaultMeetingViews = meetingViewTabs.map(tab => tab.value);

type QuickCommitmentContextDraft = {
  key: string;
  targetType: CommitmentTargetType;
  label: string;
  meta?: string;
  unitId?: string | null;
  projectId?: number | null;
  stageId?: number | null;
  levelId?: number | null;
  subTaskId?: number | null;
  includeChildren?: boolean;
  isPrimary?: boolean;
};

type OfficeReviewMember = {
  id: number;
  name: string;
  meta: string;
  participant: MeetingParticipant;
  user: NonNullable<MeetingParticipant['user']>;
};

type OfficeReviewTask = {
  kind: 'REPORT_ITEM' | 'COMMITMENT';
  id: string;
  title: string;
  status: string;
  progress?: number | null;
  source?: string | null;
  dueDate?: string | null;
  report?: any;
  commitment?: any;
};

type OfficeReviewProject = {
  focus: MeetingProjectFocus;
  projectId: number;
  name: string;
  cui: string;
  members: (OfficeReviewMember & {
    commitments: any[];
    reports: any[];
    tasks: OfficeReviewTask[];
    overdue: boolean;
  })[];
  reports: any[];
  commitments: any[];
  openCommitments: any[];
  overdue: boolean;
  recentItems: number;
};

const getProjectName = (focus?: MeetingProjectFocus | any) =>
  focus?.project?.contract?.projectShortName ||
  focus?.project?.name ||
  focus?.project?.contract?.projectName ||
  'Proyecto sin nombre';

const getProjectCui = (focus?: MeetingProjectFocus | any) =>
  focus?.project?.contract?.cui ? `CUI ${focus.project.contract.cui}` : '';

const getCommitmentAssigneeUserIds = (commitment: any) =>
  (commitment?.assignees ?? [])
    .map((assignee: any) => assignee.user?.id || assignee.userId)
    .filter(Boolean);

const getReportUserIds = (report: any) => {
  const ids = [
    report?.presenterUserId,
    report?.presenter?.id,
    ...(report?.participants ?? []).map(
      (participant: any) => participant.userId || participant.user?.id
    ),
  ].filter(Boolean);
  return Array.from(new Set(ids));
};

const MeetingWorkspace = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [activeAgendaId, setActiveAgendaId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MeetingWorkspaceTab>('main');
  const [officeProjectFilter, setOfficeProjectFilter] = useState('ALL');
  const [officeMemberFilter, setOfficeMemberFilter] = useState('ALL');
  const [officeStatusFilter, setOfficeStatusFilter] = useState('RECENT');
  const [commitmentText, setCommitmentText] = useState('');
  const [commitmentDescription, setCommitmentDescription] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);
  const [assignWholeGroup, setAssignWholeGroup] = useState(false);
  const [deadlinePreset, setDeadlinePreset] = useState<
    'TODAY' | 'TOMORROW' | 'WEEK' | 'CUSTOM' | 'FREE'
  >('TOMORROW');
  const [customDueDate, setCustomDueDate] = useState('');
  const [showParticipantManager, setShowParticipantManager] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [externalSearch, setExternalSearch] = useState('');
  const [selectedUserGuests, setSelectedUserGuests] = useState<
    OfficeMemberCandidate[]
  >([]);
  const [selectedExternalGuests, setSelectedExternalGuests] = useState<
    MeetingExternalContact[]
  >([]);
  const [externalGuestName, setExternalGuestName] = useState('');
  const [externalGuestPosition, setExternalGuestPosition] = useState('');
  const [externalGuestOrganization, setExternalGuestOrganization] =
    useState('');
  const [generalMinutesDraft, setGeneralMinutesDraft] = useState('');
  const [projectMinutesDraft, setProjectMinutesDraft] = useState('');
  const [agendaMinutesDraft, setAgendaMinutesDraft] = useState('');
  const [newAgendaTitle, setNewAgendaTitle] = useState('');
  const [editingCommitmentId, setEditingCommitmentId] = useState<string | null>(
    null
  );
  const [editCommitmentTitle, setEditCommitmentTitle] = useState('');
  const [editCommitmentDate, setEditCommitmentDate] = useState('');
  const [postponingCommitmentId, setPostponingCommitmentId] = useState<
    string | null
  >(null);
  const [showCommitmentComposer, setShowCommitmentComposer] = useState(false);
  const [sessionPanelOpen, setSessionPanelOpen] = useState(false);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [showMeetingHistory, setShowMeetingHistory] = useState(false);
  const [showMeetingCommitmentCart, setShowMeetingCommitmentCart] =
    useState(false);
  const [resumeReason, setResumeReason] = useState('');
  const requestedOperationalView = searchParams.get('view');
  const operationalView: MeetingOperationalView =
    requestedOperationalView === 'technical-tree' ||
    requestedOperationalView === 'members' ||
    requestedOperationalView === 'projects-members'
      ? requestedOperationalView
      : 'units';
  const notesPanelOpen = searchParams.get('panel') === 'notes';
  const commitmentTextRef = useRef<HTMLTextAreaElement>(null);
  const generalMinutesRef = useRef<HTMLDivElement>(null);
  const [postponeDate, setPostponeDate] = useState('');
  const [postponeReason, setPostponeReason] = useState('');
  const [quickCommitmentOpen, setQuickCommitmentOpen] = useState(false);
  const [quickCommitmentTitle, setQuickCommitmentTitle] = useState('');
  const [quickCommitmentDescription, setQuickCommitmentDescription] =
    useState('');
  const [quickCommitmentDueDate, setQuickCommitmentDueDate] = useState('');
  const [quickCommitmentPriority, setQuickCommitmentPriority] = useState<
    'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  >('NORMAL');
  const [quickCommitmentAssignee, setQuickCommitmentAssignee] = useState('');
  const [quickCommitmentProjectId, setQuickCommitmentProjectId] = useState<
    number | null
  >(null);
  const [quickCommitmentContexts, setQuickCommitmentContexts] = useState<
    QuickCommitmentContextDraft[]
  >([]);
  const { hasAccess: isModuleMod } = useRole('MOD', 'grupos');
  const { hasAccess: isModuleMember } = useRole('MEMBER', 'grupos');
  const { hasAccess: isModuleUser } = useRole('USER', 'grupos');

  const meetingQuery = useQuery({
    queryKey: ['office-meetings', 'meeting', meetingId],
    queryFn: () => getMeeting(meetingId!),
    enabled: !!meetingId,
  });

  const meeting = meetingQuery.data;
  const meetingScope: 'self' | 'descendants' =
    meeting?.scope === 'SELF' ? 'self' : 'descendants';
  const visibleMeetingViews = meeting?.visibleViews?.length
    ? (meeting.visibleViews as MeetingWorkspaceView[])
    : defaultMeetingViews;
  const availableMeetingTabs = meetingViewTabs.filter(tab =>
    visibleMeetingViews.includes(tab.value)
  );
  const meetingCommitmentsQuery = useQuery({
    queryKey: ['meeting-session-commitments', meetingId],
    queryFn: () => getCommitments({ meetingId: meetingId! }),
    enabled: Boolean(meetingId),
    refetchInterval: meeting?.status === 'LIVE' ? 30_000 : false,
  });
  const meetingCommitments = useMemo(
    () =>
      [...(meetingCommitmentsQuery.data ?? [])].sort(
        (first, second) =>
          new Date(second.createdAt || 0).getTime() -
          new Date(first.createdAt || 0).getTime()
      ),
    [meetingCommitmentsQuery.data]
  );
  const moderatorsQuery = useQuery({
    queryKey: ['office-project-moderators', meeting?.unitId],
    queryFn: () => getOfficeProjectModerators(meeting!.unitId),
    enabled: !!meeting?.unitId,
  });

  const candidateQuery = useQuery({
    queryKey: ['meeting-participant-candidates', meetingId, candidateSearch],
    queryFn: () => getMeetingParticipantCandidates(meetingId!, candidateSearch),
    enabled: !!meetingId && showParticipantManager,
  });

  const externalContactsQuery = useQuery({
    queryKey: ['meeting-external-contacts', externalSearch],
    queryFn: () => getMeetingExternalContacts(externalSearch),
    enabled: showParticipantManager,
  });

  const meetingHistoryQuery = useQuery({
    queryKey: ['office-meetings', 'history', meeting?.unitId],
    queryFn: () => getMeetings({ unitId: meeting!.unitId }),
    enabled: showMeetingHistory && !!meeting?.unitId,
  });

  const agendaItems = useMemo<MeetingAgendaItem[]>(
    () => meeting?.agendaItems ?? [],
    [meeting?.agendaItems]
  );

  const activeAgenda = useMemo(
    () => agendaItems.find(item => item.id === activeAgendaId) || null,
    [agendaItems, activeAgendaId]
  );

  const generalAgendaItems = useMemo(
    () =>
      agendaItems.filter(item => item.scope !== 'PROJECT' && !item.projectId),
    [agendaItems]
  );

  const activeProject = useMemo(() => {
    if (!meeting?.projects?.length) return null;
    const agendaProjectId = activeAgenda?.projectId || activeProjectId;
    if (!agendaProjectId) return null;
    return (
      meeting.projects.find(
        (item: any) => item.projectId === agendaProjectId
      ) || null
    );
  }, [meeting, activeAgenda?.projectId, activeProjectId]);

  const activeReports = useMemo(
    () =>
      (meeting?.reports ?? []).filter(
        (report: any) => report.projectId === activeProject?.projectId
      ),
    [meeting?.reports, activeProject?.projectId]
  );

  const activeCommitments = useMemo(
    () =>
      (meeting?.commitments ?? []).filter((commitment: any) =>
        activeProject
          ? commitment.projectId === activeProject.projectId
          : !commitment.projectId
      ),
    [meeting?.commitments, activeProject?.projectId]
  );

  const officialActiveCommitments = useMemo(
    () =>
      activeCommitments.filter(
        (commitment: any) => commitment.confirmationStatus !== 'PROPOSED'
      ),
    [activeCommitments]
  );

  const pendingCommitments = useMemo(
    () =>
      officialActiveCommitments.filter(
        (commitment: any) => !['DONE', 'CANCELLED'].includes(commitment.status)
      ),
    [officialActiveCommitments]
  );

  const completedCommitments = useMemo(
    () =>
      officialActiveCommitments.filter(
        (commitment: any) => commitment.status === 'DONE'
      ),
    [officialActiveCommitments]
  );

  const proposedCommitments = useMemo(
    () =>
      (meeting?.commitments ?? []).filter(
        (commitment: any) => commitment.confirmationStatus === 'PROPOSED'
      ),
    [meeting?.commitments]
  );

  const officeReviewMembers = useMemo<OfficeReviewMember[]>(
    () =>
      (meeting?.participants ?? [])
        .filter(
          (participant: MeetingParticipant) =>
            participant.participantType === 'USER' && participant.user
        )
        .map((participant: MeetingParticipant) => ({
          id: participant.user!.id,
          name: getParticipantName(participant),
          meta:
            getParticipantMeta(participant) || participant.user?.email || '',
          participant,
          user: participant.user,
        })),
    [meeting?.participants]
  );

  const officeReviewProjects = useMemo<OfficeReviewProject[]>(() => {
    const allMembers = officeReviewMembers;
    return ((meeting?.projects ?? []) as MeetingProjectFocus[]).map(
      projectFocus => {
        const projectCommitments = (meeting?.commitments ?? []).filter(
          (commitment: any) => commitment.projectId === projectFocus.projectId
        );
        const projectReports = (meeting?.reports ?? []).filter(
          (report: any) => report.projectId === projectFocus.projectId
        );

        const memberIds = new Set<number>();
        projectCommitments.forEach((commitment: any) =>
          getCommitmentAssigneeUserIds(commitment).forEach((id: number) =>
            memberIds.add(id)
          )
        );
        projectReports.forEach((report: any) =>
          getReportUserIds(report).forEach((id: number) => memberIds.add(id))
        );

        const members = allMembers
          .filter(
            (member: OfficeReviewMember) =>
              !memberIds.size || memberIds.has(member.id)
          )
          .map((member: OfficeReviewMember) => {
            const commitments = projectCommitments.filter((commitment: any) => {
              const assigneeIds = getCommitmentAssigneeUserIds(commitment);
              return !assigneeIds.length || assigneeIds.includes(member.id);
            });
            const reports = projectReports.filter((report: any) =>
              getReportUserIds(report).includes(member.id)
            );
            const reportTasks = reports.flatMap((report: any) =>
              (report.items ?? []).map((item: any) => ({
                kind: 'REPORT_ITEM' as const,
                id: item.id || `${report.id}-${item.name}`,
                title: item.name,
                status: item.status,
                progress: item.progress,
                source: item.source,
                report,
              }))
            );
            const commitmentTasks = commitments.map((commitment: any) => ({
              kind: 'COMMITMENT' as const,
              id: commitment.id,
              title: commitment.title,
              status: commitment.status,
              dueDate: commitment.dueDate,
              commitment,
            }));
            return {
              ...member,
              commitments,
              reports,
              tasks: [...commitmentTasks, ...reportTasks],
              overdue: commitments.some((commitment: any) =>
                isOverdue(commitment.dueDate, commitment.status)
              ),
            };
          })
          .filter(
            (member: OfficeReviewProject['members'][number]) =>
              member.tasks.length || member.commitments.length
          );

        const openCommitments = projectCommitments.filter(
          (commitment: any) =>
            !['DONE', 'CANCELLED'].includes(commitment.status)
        );

        return {
          focus: projectFocus,
          projectId: projectFocus.projectId,
          name: getProjectName(projectFocus),
          cui: getProjectCui(projectFocus),
          members,
          reports: projectReports,
          commitments: projectCommitments,
          openCommitments,
          overdue: openCommitments.some((commitment: any) =>
            isOverdue(commitment.dueDate, commitment.status)
          ),
          recentItems: projectReports.reduce(
            (sum: number, report: any) => sum + (report.items?.length ?? 0),
            0
          ),
        };
      }
    );
  }, [
    meeting?.commitments,
    meeting?.projects,
    meeting?.reports,
    officeReviewMembers,
  ]);

  const filteredOfficeReviewProjects = useMemo<OfficeReviewProject[]>(() => {
    return officeReviewProjects
      .filter((project: OfficeReviewProject) =>
        officeProjectFilter === 'ALL'
          ? true
          : String(project.projectId) === officeProjectFilter
      )
      .map(project => ({
        ...project,
        members: project.members.filter(
          (member: OfficeReviewProject['members'][number]) =>
            officeMemberFilter === 'ALL'
              ? true
              : String(member.id) === officeMemberFilter
        ),
      }))
      .filter((project: OfficeReviewProject) => {
        if (!project.members.length) return false;
        if (officeStatusFilter === 'OVERDUE') return project.overdue;
        if (officeStatusFilter === 'WITHOUT_PROGRESS')
          return !project.reports.length && !project.recentItems;
        return true;
      });
  }, [
    officeMemberFilter,
    officeProjectFilter,
    officeReviewProjects,
    officeStatusFilter,
  ]);

  const activeProjectMinute = useMemo(
    () =>
      activeProject?.minutes?.find((minute: any) => minute.scope === 'PROJECT')
        ?.content,
    [activeProject]
  );

  const generalMinute = meeting?.minutes?.find(
    (minute: any) => minute.scope === 'GENERAL'
  )?.content;

  useEffect(() => {
    setGeneralMinutesDraft(generalMinute || '');
  }, [generalMinute]);

  useEffect(() => {
    setProjectMinutesDraft(activeProjectMinute || '');
  }, [activeProjectMinute]);

  useEffect(() => {
    setAgendaMinutesDraft(activeAgenda?.minutes || '');
  }, [activeAgenda?.id, activeAgenda?.minutes]);

  const participantUsers = useMemo(
    () =>
      (meeting?.participants ?? [])
        .filter(
          (participant: MeetingParticipant) =>
            participant.participantType === 'USER'
        )
        .map((participant: MeetingParticipant) => participant.user)
        .filter(Boolean),
    [meeting?.participants]
  );
  const canManageParticipants =
    isModuleMod || Boolean(moderatorsQuery.data?.canManageCurrentUnit);
  const canWritePersonalProposal =
    canManageParticipants || isModuleMod || isModuleMember || isModuleUser;

  useEffect(() => {
    if (!meeting) return;
    const defaultView =
      meetingViewTabs.find(tab => tab.value === meeting.defaultView)
        ?.operationalView ??
      availableMeetingTabs[0]?.operationalView ??
      'units';
    if (
      !availableMeetingTabs.some(tab => tab.operationalView === operationalView)
    ) {
      const params = new URLSearchParams(searchParams);
      params.set('view', defaultView);
      params.set('scope', meetingScope);
      setSearchParams(params, { replace: true });
      return;
    }
    if (searchParams.get('scope') !== meetingScope) {
      const params = new URLSearchParams(searchParams);
      params.set('scope', meetingScope);
      setSearchParams(params, { replace: true });
    }
  }, [
    availableMeetingTabs,
    meeting,
    meetingScope,
    operationalView,
    searchParams,
    setSearchParams,
  ]);

  const updateMeetingScopeMutation = useMutation({
    mutationFn: (scope: MeetingScope) => updateMeetingScope(meetingId!, scope),
    onSuccess: updatedMeeting => {
      queryClient.setQueryData(
        ['office-meetings', 'meeting', meetingId],
        updatedMeeting
      );
      queryClient.invalidateQueries({
        queryKey: ['office-meetings', 'meeting', meetingId],
      });
    },
  });

  const statusText = meeting?.status === 'LIVE' ? 'En vivo' : meeting?.status;
  const isMeetingEnded = meeting?.status === 'ENDED';
  const requiresResumeReason = useMemo(() => {
    if (!meeting?.endedAt) return true;
    return Date.now() - new Date(meeting.endedAt).getTime() > 15 * 60 * 1000;
  }, [meeting?.endedAt]);

  const focusGeneralMinutes = () => {
    setMeetingPanel('notes');
    setSessionPanelOpen(false);
  };

  const setMeetingPanel = (panel?: 'notes' | 'attendance' | 'history') => {
    const params = new URLSearchParams(searchParams);
    if (panel) params.set('panel', panel);
    else params.delete('panel');
    setSearchParams(params, { replace: true });
  };

  const openMeetingWorkView = (view: MeetingOperationalView) => {
    const params = new URLSearchParams(searchParams);
    params.set('view', view);
    params.set('scope', meetingScope);
    params.delete('panel');
    setSearchParams(params, { replace: true });
    setSessionPanelOpen(false);
  };

  const getDueDate = () => {
    if (deadlinePreset === 'FREE') return null;
    if (deadlinePreset === 'CUSTOM') return dateInputToIso(customDueDate);
    const dueDate = new Date();
    if (deadlinePreset === 'TOMORROW') dueDate.setDate(dueDate.getDate() + 1);
    if (deadlinePreset === 'WEEK') dueDate.setDate(dueDate.getDate() + 7);
    return dueDate.toISOString();
  };

  const createCommitmentMutation = useMutation({
    mutationFn: () => {
      const payload: CommitmentCreatePayload = {
        unitId: meeting.unitId,
        projectId: activeProject?.projectId || null,
        meetingId: meeting.id,
        title: commitmentText.trim(),
        description: commitmentDescription.trim() || null,
        dueDate: getDueDate(),
        assignees: assignWholeGroup
          ? [{ unitId: meeting.unitId, role: 'OWNER' }]
          : selectedAssignees.map(userId => ({ userId, role: 'OWNER' })),
      };
      return canManageParticipants
        ? createCommitment(payload)
        : createCommitmentProposal(payload);
    },
    onSuccess: () => {
      setCommitmentText('');
      setCommitmentDescription('');
      setSelectedAssignees([]);
      setAssignWholeGroup(false);
      setCustomDueDate('');
      setShowCommitmentComposer(false);
      queryClient.invalidateQueries({
        queryKey: ['office-meetings', 'meeting', meetingId],
      });
      queryClient.invalidateQueries({
        queryKey: ['meeting-session-commitments', meetingId],
      });
    },
  });

  const quickCommitmentMutation = useMutation({
    mutationFn: () => {
      const assignees =
        quickCommitmentAssignee === 'UNIT'
          ? [{ unitId: meeting.unitId, role: 'OWNER' as const }]
          : quickCommitmentAssignee
          ? [
              {
                userId: Number(quickCommitmentAssignee),
                role: 'OWNER' as const,
              },
            ]
          : [];
      const basePayload = {
        unitId: meeting.unitId,
        projectId: quickCommitmentProjectId,
        meetingId: meeting.id,
        title: quickCommitmentTitle.trim(),
        description: quickCommitmentDescription.trim() || null,
        dueDate: dateInputToIso(quickCommitmentDueDate),
        assignees,
      };
      if (!canManageParticipants) {
        return createCommitmentProposal(basePayload);
      }
      return createCommitment({
        ...basePayload,
        priority: quickCommitmentPriority,
        contexts: quickCommitmentContexts.map((context, index) => ({
          targetType: context.targetType,
          unitId: context.unitId,
          projectId: context.projectId,
          stageId: context.stageId,
          levelId: context.levelId,
          subTaskId: context.subTaskId,
          includeChildren: context.includeChildren,
          isPrimary: index === 0,
        })),
      });
    },
    onSuccess: () => {
      setQuickCommitmentOpen(false);
      setQuickCommitmentTitle('');
      setQuickCommitmentDescription('');
      setQuickCommitmentDueDate('');
      setQuickCommitmentPriority('NORMAL');
      setQuickCommitmentAssignee('');
      setQuickCommitmentProjectId(null);
      setQuickCommitmentContexts([]);
      queryClient.invalidateQueries({
        queryKey: ['office-meetings', 'meeting', meetingId],
      });
      queryClient.invalidateQueries({
        queryKey: ['meeting-session-commitments', meetingId],
      });
    },
  });

  const saveGeneralMinutesMutation = useMutation({
    mutationFn: () => updateMeetingMinutes(meetingId!, generalMinutesDraft),
    onSuccess: data => {
      queryClient.setQueryData(['office-meetings', 'meeting', meetingId], data);
    },
  });

  const saveProjectMinutesMutation = useMutation({
    mutationFn: () =>
      updateMeetingProjectMinutes(
        meetingId!,
        activeProject!.projectId,
        projectMinutesDraft
      ),
    onSuccess: data => {
      queryClient.setQueryData(['office-meetings', 'meeting', meetingId], data);
    },
  });

  const saveAgendaMinutesMutation = useMutation({
    mutationFn: () =>
      updateMeetingAgendaItem(meetingId!, activeAgenda!.id, {
        minutes: agendaMinutesDraft,
        status: agendaMinutesDraft.trim() ? 'REVIEWED' : 'OPEN',
      }),
    onSuccess: data => {
      queryClient.setQueryData(['office-meetings', 'meeting', meetingId], data);
    },
  });

  const addAgendaItemMutation = useMutation({
    mutationFn: () =>
      addMeetingAgendaItem(meetingId!, {
        title: newAgendaTitle.trim(),
        scope: 'GENERAL',
        order: agendaItems.length,
      }),
    onSuccess: data => {
      setNewAgendaTitle('');
      queryClient.setQueryData(['office-meetings', 'meeting', meetingId], data);
    },
  });

  const confirmCommitmentMutation = useMutation({
    mutationFn: (payload: { id: string; status: 'CONFIRMED' | 'REJECTED' }) =>
      confirmCommitment(payload.id, payload.status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['office-meetings', 'meeting', meetingId],
      });
    },
  });

  const updateCommitmentMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      title?: string;
      description?: string | null;
      dueDate?: string | null;
      status?: any;
    }) => updateCommitment(payload.id, payload),
    onSuccess: () => {
      setEditingCommitmentId(null);
      setPostponingCommitmentId(null);
      setEditCommitmentTitle('');
      setEditCommitmentDate('');
      setPostponeDate('');
      setPostponeReason('');
      queryClient.invalidateQueries({
        queryKey: ['office-meetings', 'meeting', meetingId],
      });
    },
  });

  const updateCommitmentStatusMutation = useMutation({
    mutationFn: (payload: { id: string; status: any }) =>
      updateCommitmentStatus(payload.id, payload.status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['office-meetings', 'meeting', meetingId],
      });
    },
  });

  const deleteCommitmentMutation = useMutation({
    mutationFn: (id: string) => deleteCommitment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['office-meetings', 'meeting', meetingId],
      });
    },
  });

  const endMeetingMutation = useMutation({
    mutationFn: () => endMeeting(meetingId!),
    onSuccess: data => {
      setShowEndConfirmation(false);
      queryClient.setQueryData(['office-meetings', 'meeting', meetingId], data);
      queryClient.invalidateQueries({ queryKey: ['office-meetings'] });
    },
  });

  const resumeMeetingMutation = useMutation({
    mutationFn: () =>
      resumeMeeting(meetingId!, resumeReason.trim() || undefined),
    onSuccess: data => {
      setResumeReason('');
      setShowResumeDialog(false);
      setSessionPanelOpen(false);
      queryClient.setQueryData(['office-meetings', 'meeting', meetingId], data);
      queryClient.invalidateQueries({ queryKey: ['office-meetings'] });
    },
  });

  const updateParticipantMutation = useMutation({
    mutationFn: (payload: { id: string; status: MeetingParticipantStatus }) =>
      updateMeetingAttendance(meetingId!, [
        { id: payload.id, status: payload.status },
      ]),
    onSuccess: data => {
      queryClient.setQueryData(['office-meetings', 'meeting', meetingId], data);
    },
  });

  const addParticipantsMutation = useMutation({
    mutationFn: () =>
      addMeetingParticipants(meetingId!, [
        ...selectedUserGuests.map(user => ({
          userId: user.id,
          status: 'PRESENT' as MeetingParticipantStatus,
          origin: 'INVITED' as const,
        })),
        ...selectedExternalGuests.map(contact => ({
          externalContactId: contact.id,
          status: 'PRESENT' as MeetingParticipantStatus,
          origin: 'INVITED' as const,
        })),
        ...(externalGuestName.trim()
          ? [
              {
                status: 'PRESENT' as MeetingParticipantStatus,
                origin: 'INVITED' as const,
                externalContact: {
                  name: externalGuestName,
                  position: externalGuestPosition,
                  organization: externalGuestOrganization,
                },
              },
            ]
          : []),
      ]),
    onSuccess: data => {
      setSelectedUserGuests([]);
      setSelectedExternalGuests([]);
      setExternalGuestName('');
      setExternalGuestPosition('');
      setExternalGuestOrganization('');
      queryClient.setQueryData(['office-meetings', 'meeting', meetingId], data);
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: (participantId: string) =>
      removeMeetingParticipant(meetingId!, participantId),
    onSuccess: data => {
      queryClient.setQueryData(['office-meetings', 'meeting', meetingId], data);
    },
  });

  const canCreateCommitment =
    canWritePersonalProposal &&
    !!meeting &&
    !!commitmentText.trim() &&
    (deadlinePreset !== 'CUSTOM' || !!customDueDate) &&
    (assignWholeGroup || selectedAssignees.length > 0);

  const toggleAssignee = (userId: number) => {
    setAssignWholeGroup(false);
    setSelectedAssignees(current =>
      current.includes(userId)
        ? current.filter(id => id !== userId)
        : [...current, userId]
    );
  };

  const toggleUserGuest = (user: OfficeMemberCandidate) => {
    setSelectedUserGuests(current =>
      current.some(item => item.id === user.id)
        ? current.filter(item => item.id !== user.id)
        : [...current, user]
    );
  };

  const toggleExternalGuest = (contact: MeetingExternalContact) => {
    setSelectedExternalGuests(current =>
      current.some(item => item.id === contact.id)
        ? current.filter(item => item.id !== contact.id)
        : [...current, contact]
    );
  };

  const getInitials = (user?: any) => {
    const profile = user?.profile;
    const first = profile?.firstName?.[0] ?? '';
    const last = profile?.lastName?.[0] ?? '';
    return `${first}${last}` || '?';
  };

  const getParticipantInitials = (participant?: MeetingParticipant) => {
    if (!participant) return '?';
    if (participant.participantType === 'EXTERNAL') {
      return getParticipantName(participant).slice(0, 2).toUpperCase();
    }
    return getInitials(participant.user);
  };

  const getCommitmentAssigneeText = (commitment: any) => {
    if (!commitment.assignees?.length) return 'Sin responsables';
    return commitment.assignees
      .map((assignee: any) => {
        if (assignee.unit) return `Todo el grupo: ${assignee.unit.name}`;
        if (assignee.user) return getPersonName(assignee.user);
        return 'Responsable';
      })
      .join(', ');
  };

  const startEditingCommitment = (commitment: any) => {
    setEditingCommitmentId(commitment.id);
    setEditCommitmentTitle(commitment.title || '');
    setEditCommitmentDate(toDateInput(commitment.dueDate));
    setPostponingCommitmentId(null);
  };

  const startPostponingCommitment = (commitment: any) => {
    setPostponingCommitmentId(commitment.id);
    setPostponeDate(toDateInput(commitment.dueDate));
    setPostponeReason('');
    setEditingCommitmentId(null);
  };

  const saveCommitmentEdit = (commitment: any) => {
    updateCommitmentMutation.mutate({
      id: commitment.id,
      title: editCommitmentTitle.trim(),
      dueDate: dateInputToIso(editCommitmentDate),
    });
  };

  const saveCommitmentPostpone = (commitment: any) => {
    const previousDescription = commitment.description?.trim();
    const reason = postponeReason.trim();
    updateCommitmentMutation.mutate({
      id: commitment.id,
      status: 'BLOCKED',
      dueDate: dateInputToIso(postponeDate),
      description: [
        previousDescription,
        reason ? `Justificacion de posposicion: ${reason}` : null,
      ]
        .filter(Boolean)
        .join('\n\n'),
    });
  };

  const buildProjectContexts = (projectFocus: MeetingProjectFocus) => {
    const stageContexts =
      projectFocus.stageFocus?.slice(0, 3).map((stageFocus: any) => ({
        key: `stage-${stageFocus.stageId}`,
        targetType: 'STAGE' as CommitmentTargetType,
        label: stageFocus.stage?.name || `Etapa ${stageFocus.stageId}`,
        meta: getProjectName(projectFocus),
        projectId: projectFocus.projectId,
        stageId: stageFocus.stageId,
        includeChildren: true,
      })) ?? [];
    if (stageContexts.length) return stageContexts;
    return [
      {
        key: `project-${projectFocus.projectId}`,
        targetType: 'PROJECT' as CommitmentTargetType,
        label: getProjectName(projectFocus),
        meta: getProjectCui(projectFocus) || 'Proyecto completo',
        projectId: projectFocus.projectId,
        includeChildren: true,
      },
    ];
  };

  const openQuickCommitment = ({
    title,
    projectFocus,
    memberId,
    contexts,
  }: {
    title: string;
    projectFocus: MeetingProjectFocus;
    memberId?: number;
    contexts?: QuickCommitmentContextDraft[];
  }) => {
    const due = new Date();
    due.setDate(due.getDate() + 7);
    setQuickCommitmentTitle(title);
    setQuickCommitmentDescription('');
    setQuickCommitmentDueDate(due.toISOString().slice(0, 10));
    setQuickCommitmentPriority('NORMAL');
    setQuickCommitmentAssignee(memberId ? String(memberId) : '');
    setQuickCommitmentProjectId(projectFocus?.projectId ?? null);
    setQuickCommitmentContexts(
      contexts?.length ? contexts : buildProjectContexts(projectFocus)
    );
    setQuickCommitmentOpen(true);
  };

  const removeQuickContext = (key: string) => {
    setQuickCommitmentContexts(current =>
      current.filter(context => context.key !== key)
    );
  };

  const addProjectContextToQuickCommitment = () => {
    const project = officeReviewProjects.find(
      (item: OfficeReviewProject) => item.projectId === quickCommitmentProjectId
    );
    if (!project) return;
    const existingKeys = new Set(
      quickCommitmentContexts.map(context => context.key)
    );
    const next = buildProjectContexts(project.focus).find(
      (context: QuickCommitmentContextDraft) => !existingKeys.has(context.key)
    );
    if (!next) return;
    setQuickCommitmentContexts(current => [...current, next]);
  };

  const canCreateQuickCommitment =
    canWritePersonalProposal &&
    !!meeting &&
    !!quickCommitmentTitle.trim() &&
    !!quickCommitmentAssignee &&
    (!!quickCommitmentContexts.length || !canManageParticipants);

  if (meetingQuery.isLoading) return <LoaderForComponent />;

  return (
    <main className="mw-page">
      <header className="mw-header">
        <div className="mw-title">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="mw-titleLine">
              <h1>{meeting?.title}</h1>
              <AppBadge
                variant={meeting?.status === 'LIVE' ? 'danger' : 'review'}
                className="mw-statusBadge"
              >
                <span />
                {statusText}
              </AppBadge>
            </div>
            <span>{meeting?.unit?.name}</span>
          </div>
        </div>
        <div className="mw-actions">
          <div className="mw-scopeToggle" aria-label="Alcance de la reunión">
            <button
              type="button"
              className={meetingScope === 'self' ? 'is-active' : ''}
              disabled={
                !canManageParticipants || updateMeetingScopeMutation.isPending
              }
              onClick={() => updateMeetingScopeMutation.mutate('SELF')}
            >
              Solo oficina
            </button>
            <button
              type="button"
              className={meetingScope === 'descendants' ? 'is-active' : ''}
              disabled={
                !canManageParticipants || updateMeetingScopeMutation.isPending
              }
              onClick={() => updateMeetingScopeMutation.mutate('DESCENDANTS')}
            >
              Con suboficinas
            </button>
          </div>
          <AppButton
            type="button"
            variant="outline"
            size="lg"
            onClick={focusGeneralMinutes}
            title="Notas y minutas"
          >
            <MessageSquareText size={16} />
            Notas
          </AppButton>
          <AppButton
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setShowParticipantManager(true)}
            title="Asistencia"
          >
            <UsersRound size={16} />
            Asistencia
          </AppButton>
        </div>
      </header>

      <nav className="mw-operationalTabs" aria-label="Vistas de la reunion">
        {availableMeetingTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              type="button"
              className={
                operationalView === tab.operationalView ? 'is-active' : ''
              }
              onClick={() => openMeetingWorkView(tab.operationalView)}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <section className="mw-operationalContent">
        {meeting && operationalView === 'technical-tree' ? (
          <TechnicalOfficeProjectsWorkspace
            embedded
            meetingId={meeting.id}
            unitId={meeting.unitId}
            scope={meetingScope}
          />
        ) : (
          <CommitmentsBoardWorkspace
            embedded
            unitId={meeting?.unitId}
            scope={meetingScope}
            meetingId={meeting?.id}
            hideViewTabs
            viewMode={
              operationalView === 'members'
                ? 'membersCommitments'
                : operationalView === 'projects-members'
                ? 'projectsMembers'
                : 'units'
            }
          />
        )}
      </section>

      {showMeetingCommitmentCart && (
        <div className="mw-modalLayer">
          <button
            type="button"
            className="mw-modalBackdrop"
            aria-label="Cerrar compromisos de la reunion"
            onClick={() => setShowMeetingCommitmentCart(false)}
          />
          <aside
            className="mw-commitmentCart"
            aria-label="Compromisos de esta reunion"
          >
            <header className="mw-participantHeader">
              <div>
                <h2>Compromisos de esta reunion</h2>
                <p>
                  {meetingCommitments.length} vinculados a {meeting?.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMeetingCommitmentCart(false)}
              >
                <X size={18} />
              </button>
            </header>
            <div className="mw-commitmentCartBody">
              {meetingCommitmentsQuery.isLoading && (
                <p className="mw-commitmentCartEmpty">
                  Cargando compromisos...
                </p>
              )}
              {!meetingCommitmentsQuery.isLoading &&
                !meetingCommitments.length && (
                  <p className="mw-commitmentCartEmpty">
                    Aun no hay compromisos agregados a esta reunion.
                  </p>
                )}
              {meetingCommitments.map(commitment => (
                <article className="mw-commitmentCartItem" key={commitment.id}>
                  <div className="mw-commitmentCartItemHeader">
                    <span>CMP-{commitment.id.slice(0, 6).toUpperCase()}</span>
                    <small className={`is-${commitment.status.toLowerCase()}`}>
                      {commitmentStatusLabel[commitment.status] ||
                        commitment.status}
                    </small>
                  </div>
                  <strong>{commitment.title}</strong>
                  <p>{getCommitmentContextLabel(commitment)}</p>
                  <div className="mw-commitmentCartMeta">
                    <span>{getCommitmentAssigneeText(commitment)}</span>
                    <span>{formatDateShort(commitment.dueDate)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMeetingCommitmentCart(false);
                      openMeetingWorkView('units');
                    }}
                  >
                    Ver en tablero
                  </button>
                </article>
              ))}
            </div>
            <footer className="mw-commitmentCartFooter">
              <span>
                {
                  meetingCommitments.filter(
                    commitment =>
                      !['DONE', 'CANCELLED'].includes(commitment.status)
                  ).length
                }{' '}
                pendientes
              </span>
              <span>
                {
                  meetingCommitments.filter(
                    commitment => commitment.status === 'DONE'
                  ).length
                }{' '}
                cumplidos
              </span>
            </footer>
          </aside>
        </div>
      )}

      {notesPanelOpen && (
        <div className="mw-modalLayer">
          <button
            type="button"
            className="mw-modalBackdrop"
            aria-label="Cerrar notas"
            onClick={() => setMeetingPanel()}
          />
          <aside className="mw-notesPanel" aria-label="Notas de la reunion">
            <header className="mw-participantHeader">
              <div>
                <h2>Notas y minuta general</h2>
                <p>{meeting?.unit?.name}</p>
              </div>
              <button type="button" onClick={() => setMeetingPanel()}>
                <X size={18} />
              </button>
            </header>
            <div className="mw-notesPanelBody">
              <MarkdownEditor
                label="Notas generales de la reunion"
                value={generalMinutesDraft}
                onChange={setGeneralMinutesDraft}
                disabled={!canManageParticipants}
                placeholder="Decisiones, acuerdos, bloqueos o comentarios generales..."
              />
            </div>
            {canManageParticipants && (
              <footer className="mw-notesPanelFooter">
                <AppButton
                  type="button"
                  disabled={saveGeneralMinutesMutation.isPending}
                  onClick={() => saveGeneralMinutesMutation.mutate()}
                >
                  <Save size={15} />
                  {saveGeneralMinutesMutation.isPending
                    ? 'Guardando...'
                    : 'Guardar notas'}
                </AppButton>
              </footer>
            )}
          </aside>
        </div>
      )}

      {meeting && (meeting.status === 'LIVE' || isMeetingEnded) && (
        <aside
          className={`mw-sessionController ${
            sessionPanelOpen ? 'is-open' : ''
          }`}
          aria-label="Controles de la reunion"
        >
          <div className="mw-sessionTrigger">
            <button
              type="button"
              className="mw-sessionToggle"
              onClick={() => setSessionPanelOpen(current => !current)}
              aria-expanded={sessionPanelOpen}
            >
              <span
                className={meeting.status === 'LIVE' ? 'is-live' : 'is-ended'}
              />
              <strong>
                {meeting.status === 'LIVE' ? 'En vivo' : 'Detenida'}
              </strong>
            </button>
            <button
              type="button"
              className="mw-sessionCommitmentsButton"
              onClick={() => setShowMeetingCommitmentCart(true)}
              aria-label={`Ver ${meetingCommitments.length} compromisos de esta reunion`}
            >
              <small>{meetingCommitments.length} compromisos</small>
              <ClipboardList size={16} />
            </button>
          </div>
          {sessionPanelOpen && (
            <div className="mw-sessionPanel">
              <div className="mw-sessionPanelHeader">
                <div>
                  <strong>Controles de reunion</strong>
                  <span>{meeting.unit?.name}</span>
                </div>
                <button
                  type="button"
                  title="Cerrar controles"
                  onClick={() => setSessionPanelOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mw-sessionActions">
                <button
                  type="button"
                  onClick={() => openMeetingWorkView('units')}
                >
                  <ClipboardList size={16} />
                  Unidades
                </button>
                <button
                  type="button"
                  onClick={() => openMeetingWorkView('technical-tree')}
                >
                  <BriefcaseBusiness size={16} />
                  Arbol tecnico
                </button>
                <button
                  type="button"
                  onClick={() => openMeetingWorkView('members')}
                >
                  <UsersRound size={16} />
                  Miembros
                </button>
                <button
                  type="button"
                  onClick={() => openMeetingWorkView('projects-members')}
                >
                  <Target size={16} />
                  Proyectos + miembros
                </button>
                <button type="button" onClick={focusGeneralMinutes}>
                  <MessageSquareText size={16} />
                  Anotar en minuta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowParticipantManager(true);
                    setSessionPanelOpen(false);
                  }}
                >
                  <UsersRound size={16} />
                  Ver asistencia
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMeetingHistory(true);
                    setSessionPanelOpen(false);
                  }}
                >
                  <RotateCcw size={16} />
                  Reuniones anteriores
                </button>
                {canManageParticipants && meeting.status === 'LIVE' && (
                  <button
                    type="button"
                    className="is-danger"
                    onClick={() => {
                      setShowEndConfirmation(true);
                      setSessionPanelOpen(false);
                    }}
                  >
                    <CheckCircle2 size={16} />
                    Finalizar reunion
                  </button>
                )}
                {canManageParticipants && isMeetingEnded && (
                  <button
                    type="button"
                    className="is-primary"
                    onClick={() => {
                      setShowResumeDialog(true);
                      setSessionPanelOpen(false);
                    }}
                  >
                    <RotateCcw size={16} />
                    Continuar reunion
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>
      )}

      {false && (
        <section className="mw-layout">
          <aside className="mw-left">
            <article className="mw-card">
              <div className="mw-cardTitle">
                <h2>Asistencia ({meeting?.participants?.length ?? 0})</h2>
                {canManageParticipants ? (
                  <button
                    type="button"
                    className="mw-cardAction"
                    onClick={() => setShowParticipantManager(true)}
                  >
                    <UserPlus size={15} />
                    Gestionar
                  </button>
                ) : (
                  <UsersRound size={15} />
                )}
              </div>
              <div className="mw-attendanceStack">
                {(meeting?.participants ?? [])
                  .slice(0, 5)
                  .map((participant: MeetingParticipant, index: number) => (
                    <button
                      type="button"
                      className="mw-attendanceAvatar"
                      title={`${getParticipantName(participant)} - ${
                        attendanceLabel[participant.status] ||
                        participant.status
                      }`}
                      key={`attendance-${participant.id}-${index}`}
                      onClick={() =>
                        canManageParticipants && setShowParticipantManager(true)
                      }
                    >
                      {getParticipantInitials(participant)}
                    </button>
                  ))}
                {(meeting?.participants?.length ?? 0) > 5 && (
                  <span className="mw-attendanceAvatar is-count">
                    +{(meeting?.participants?.length ?? 0) - 5}
                  </span>
                )}
              </div>
              {!meeting?.participants?.length && (
                <p className="mw-empty">Sin asistentes registrados.</p>
              )}
            </article>

            <article className="mw-card">
              <div className="mw-cardTitle">
                <h2>Agenda</h2>
                <ClipboardList size={15} />
              </div>
              <button
                type="button"
                className={`mw-agendaItem ${
                  !activeProject && !activeAgenda ? 'is-active' : ''
                }`}
                onClick={() => {
                  setActiveAgendaId(null);
                  setActiveProjectId(null);
                  setActiveTab('main');
                }}
              >
                <span>Agenda general</span>
                <small>Vista general</small>
              </button>
              {agendaItems.map((item, index) => (
                <button
                  type="button"
                  key={`agenda-${item.id}-${index}`}
                  className={`mw-agendaItem ${
                    activeAgenda?.id === item.id ? 'is-active' : ''
                  }`}
                  onClick={() => {
                    setActiveAgendaId(item.id);
                    setActiveProjectId(item.projectId || null);
                    setActiveTab('main');
                  }}
                >
                  <span>{item.title}</span>
                  <small>
                    {item.scope === 'PROJECT' ? 'Proyecto' : 'General'}
                  </small>
                </button>
              ))}
              {!generalAgendaItems.length && (
                <p className="mw-empty">
                  Sin temas administrativos registrados.
                </p>
              )}
              {canManageParticipants && (
                <div className="mw-agendaQuickAdd">
                  <AppInput
                    value={newAgendaTitle}
                    onChange={event => setNewAgendaTitle(event.target.value)}
                    placeholder="Agregar tema administrativo"
                    aria-label="Agregar tema administrativo"
                  />
                  <button
                    type="button"
                    disabled={
                      !newAgendaTitle.trim() || addAgendaItemMutation.isPending
                    }
                    onClick={() => addAgendaItemMutation.mutate()}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </article>

            <article className="mw-card">
              <div className="mw-cardTitle">
                <h2>Proyectos seleccionados</h2>
                <Target size={15} />
              </div>
              {(meeting?.projects ?? []).map((project: any, index: number) => (
                <button
                  type="button"
                  key={`project-${project.id}-${index}`}
                  className={`mw-project ${
                    activeProject?.id === project.id ? 'is-active' : ''
                  }`}
                  onClick={() => {
                    setActiveProjectId(project.projectId);
                    const projectAgenda = agendaItems.find(
                      item => item.projectId === project.projectId
                    );
                    setActiveAgendaId(projectAgenda?.id || null);
                    setActiveTab('main');
                  }}
                >
                  <Target size={16} />
                  <span>
                    {project.project?.name}
                    <small>
                      {
                        (meeting?.reports ?? []).filter(
                          (report: any) =>
                            report.projectId === project.projectId
                        ).length
                      }{' '}
                      informes
                    </small>
                  </span>
                </button>
              ))}
            </article>
          </aside>

          <section className="mw-center">
            <article className="mw-projectHeader" aria-label="Contexto activo">
              <div className="mw-projectBadge">
                {activeProject ? (
                  <BriefcaseBusiness size={23} />
                ) : (
                  <ClipboardList size={23} />
                )}
              </div>
              <div className="mw-projectInfo">
                <h2>
                  {activeProject?.project?.name ||
                    activeAgenda?.title ||
                    'Agenda general'}
                </h2>
                <span>
                  {activeProject
                    ? 'Revision de informes y compromisos del proyecto'
                    : meeting?.unit?.name}
                </span>
              </div>
              <div className="mw-projectProgress">
                <small>
                  {activeProject ? 'Informes preparados' : 'Temas abiertos'}
                </small>
                <strong>{activeReports.length}</strong>
              </div>
            </article>

            <article className="mw-tabs" aria-label="Contexto del proyecto">
              <button
                type="button"
                className={activeTab === 'main' ? 'is-active' : ''}
                onClick={() => setActiveTab('main')}
              >
                <FileText size={16} />
                {activeProject
                  ? 'Informes preparados'
                  : activeAgenda
                  ? 'Minuta del tema'
                  : 'Temas de agenda'}
                <b>
                  {activeProject
                    ? activeReports.length
                    : generalAgendaItems.length}
                </b>
              </button>
              <button
                type="button"
                className={activeTab === 'commitments' ? 'is-active' : ''}
                onClick={() => setActiveTab('commitments')}
              >
                <CheckCircle2 size={16} />
                Compromisos
                <b>{pendingCommitments.length}</b>
              </button>
              <button
                type="button"
                className={activeTab === 'membersProjects' ? 'is-active' : ''}
                onClick={() => {
                  setActiveAgendaId(null);
                  setActiveProjectId(null);
                  setActiveTab('membersProjects');
                }}
              >
                <UsersRound size={16} />
                Miembros + Proyectos
                <b>{filteredOfficeReviewProjects.length}</b>
              </button>
              {activeProject && (
                <button
                  type="button"
                  className={activeTab === 'projectMinutes' ? 'is-active' : ''}
                  onClick={() => setActiveTab('projectMinutes')}
                >
                  <ClipboardList size={16} />
                  Minuta del proyecto
                </button>
              )}
            </article>

            <article className="mw-card">
              <div className="mw-sectionHeader">
                <h2>
                  {activeTab === 'commitments'
                    ? activeProject
                      ? 'Compromisos del proyecto'
                      : 'Compromisos generales'
                    : activeTab === 'membersProjects'
                    ? 'Proyectos activos y responsables'
                    : activeTab === 'projectMinutes'
                    ? 'Minuta del proyecto'
                    : activeProject
                    ? 'Presentaciones de avance'
                    : 'Tema administrativo'}
                </h2>
                {activeTab === 'main' && isModuleMod && activeProject && (
                  <button type="button">
                    <Plus size={15} />
                    Anadir actualizacion
                  </button>
                )}
                {activeTab === 'commitments' && canWritePersonalProposal && (
                  <AppButton
                    type="button"
                    size="lg"
                    onClick={() =>
                      setShowCommitmentComposer(current => !current)
                    }
                  >
                    {showCommitmentComposer ? (
                      <RotateCcw size={15} />
                    ) : (
                      <Plus size={15} />
                    )}
                    {showCommitmentComposer ? 'Cancelar' : 'Crear Compromiso'}
                  </AppButton>
                )}
              </div>
              {activeTab === 'membersProjects' && (
                <div className="mw-officeReview">
                  <div className="mw-officeReviewFilters">
                    <label>
                      Proyecto
                      <select
                        value={officeProjectFilter}
                        onChange={event =>
                          setOfficeProjectFilter(event.target.value)
                        }
                      >
                        <option value="ALL">Todos los proyectos activos</option>
                        {officeReviewProjects.map(project => (
                          <option
                            value={String(project.projectId)}
                            key={`office-project-filter-${project.projectId}`}
                          >
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Miembro
                      <select
                        value={officeMemberFilter}
                        onChange={event =>
                          setOfficeMemberFilter(event.target.value)
                        }
                      >
                        <option value="ALL">Todos los miembros</option>
                        {officeReviewMembers.map(member => (
                          <option
                            value={String(member.id)}
                            key={`office-member-filter-${member.id}`}
                          >
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Estado
                      <select
                        value={officeStatusFilter}
                        onChange={event =>
                          setOfficeStatusFilter(event.target.value)
                        }
                      >
                        <option value="RECENT">Actividad reciente</option>
                        <option value="OVERDUE">Con vencidos</option>
                        <option value="WITHOUT_PROGRESS">Sin avance</option>
                        <option value="ALL">Todo</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setOfficeProjectFilter('ALL');
                        setOfficeMemberFilter('ALL');
                        setOfficeStatusFilter('RECENT');
                      }}
                    >
                      Limpiar
                    </button>
                  </div>

                  <div className="mw-officeReviewStats">
                    <span>
                      <b>{officeReviewMembers.length}</b>
                      Miembros
                    </span>
                    <span>
                      <b>{officeReviewProjects.length}</b>
                      Proyectos
                    </span>
                    <span>
                      <b>
                        {officeReviewProjects.reduce(
                          (sum, project) =>
                            sum + project.openCommitments.length,
                          0
                        )}
                      </b>
                      Compromisos abiertos
                    </span>
                    <span>
                      <b>
                        {
                          officeReviewProjects.filter(
                            project => project.overdue
                          ).length
                        }
                      </b>
                      Alertas
                    </span>
                  </div>

                  <div className="mw-projectReviewList">
                    {filteredOfficeReviewProjects.map(project => (
                      <article
                        className="mw-projectReviewCard"
                        key={`office-review-project-${project.projectId}`}
                      >
                        <header className="mw-projectReviewHeader">
                          <div>
                            <h3>{project.name}</h3>
                            <p>
                              {[
                                project.cui,
                                `${project.members.length} miembros`,
                              ]
                                .filter(Boolean)
                                .join(' / ')}
                            </p>
                          </div>
                          <div className="mw-projectReviewBadges">
                            <span>{project.recentItems} tareas/informes</span>
                            <span>
                              {project.openCommitments.length} compromisos
                            </span>
                            {project.overdue && <em>Vencidos</em>}
                            {canWritePersonalProposal && (
                              <button
                                type="button"
                                onClick={() =>
                                  openQuickCommitment({
                                    title: `Cerrar pendientes de ${project.name}`,
                                    projectFocus: project.focus,
                                    contexts: buildProjectContexts(
                                      project.focus
                                    ),
                                  })
                                }
                              >
                                <Plus size={14} />
                                Compromiso
                              </button>
                            )}
                          </div>
                        </header>
                        <div className="mw-projectMemberList">
                          {project.members.map(member => (
                            <details
                              className="mw-memberReview"
                              key={`project-${project.projectId}-member-${member.id}`}
                              open={officeMemberFilter !== 'ALL'}
                            >
                              <summary>
                                <span className="mw-memberAvatar">
                                  {getInitials(member.user)}
                                </span>
                                <span>
                                  <strong>{member.name}</strong>
                                  <small>
                                    {member.meta || 'Miembro de la reunion'}
                                  </small>
                                </span>
                                <b>{member.tasks.length}</b>
                              </summary>
                              <div className="mw-memberTaskList">
                                {member.tasks.map((task: any) => (
                                  <div
                                    className="mw-memberTaskRow"
                                    key={`task-${project.projectId}-${member.id}-${task.kind}-${task.id}`}
                                  >
                                    <div>
                                      <strong>{task.title}</strong>
                                      <small>
                                        {task.kind === 'COMMITMENT'
                                          ? `Compromiso / ${
                                              commitmentStatusLabel[
                                                task.status
                                              ] || task.status
                                            }`
                                          : `${
                                              itemStatusLabel[task.status] ||
                                              task.status ||
                                              'Informe'
                                            } / avance ${task.progress ?? 0}%`}
                                      </small>
                                    </div>
                                    <span
                                      className={
                                        task.kind === 'COMMITMENT' &&
                                        isOverdue(task.dueDate, task.status)
                                          ? 'is-overdue'
                                          : ''
                                      }
                                    >
                                      {task.kind === 'COMMITMENT'
                                        ? formatDateShort(task.dueDate)
                                        : sourceLabel[task.source] ||
                                          task.source ||
                                          'Proyecto'}
                                    </span>
                                    {canWritePersonalProposal && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openQuickCommitment({
                                            title:
                                              task.kind === 'COMMITMENT'
                                                ? task.title
                                                : `Completar ${task.title}`,
                                            projectFocus: project.focus,
                                            memberId: member.id,
                                            contexts:
                                              task.kind === 'COMMITMENT' &&
                                              task.commitment?.contexts?.length
                                                ? task.commitment.contexts.map(
                                                    (context: any) => ({
                                                      key:
                                                        context.id ||
                                                        `${context.targetType}-${context.projectId}-${context.stageId}-${context.levelId}-${context.subTaskId}`,
                                                      targetType:
                                                        context.targetType,
                                                      label:
                                                        context.subTask?.name ||
                                                        context.level?.name ||
                                                        context.stage?.name ||
                                                        project.name,
                                                      meta:
                                                        context.subTask?.item ||
                                                        context.level?.item ||
                                                        getProjectCui(
                                                          project.focus
                                                        ),
                                                      unitId: context.unitId,
                                                      projectId:
                                                        context.projectId,
                                                      stageId: context.stageId,
                                                      levelId: context.levelId,
                                                      subTaskId:
                                                        context.subTaskId,
                                                      includeChildren:
                                                        context.includeChildren,
                                                    })
                                                  )
                                                : buildProjectContexts(
                                                    project.focus
                                                  ).slice(0, 1),
                                          })
                                        }
                                      >
                                        <Plus size={14} />
                                        Nuevo
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {!member.tasks.length && (
                                  <p className="mw-empty">
                                    Sin tareas visibles para este miembro.
                                  </p>
                                )}
                                {canWritePersonalProposal && (
                                  <button
                                    type="button"
                                    className="mw-memberCommitmentButton"
                                    onClick={() =>
                                      openQuickCommitment({
                                        title: `Compromiso de ${member.name} en ${project.name}`,
                                        projectFocus: project.focus,
                                        memberId: member.id,
                                      })
                                    }
                                  >
                                    <Plus size={14} />
                                    Crear compromiso para este miembro
                                  </button>
                                )}
                              </div>
                            </details>
                          ))}
                        </div>
                      </article>
                    ))}
                    {!filteredOfficeReviewProjects.length && (
                      <p className="mw-empty">
                        No hay proyectos o miembros con los filtros actuales.
                      </p>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'commitments' && (
                <div className="mw-commitmentPanel">
                  {showCommitmentComposer && canWritePersonalProposal && (
                    <article className="mw-newCommitment mw-commitmentComposer">
                      <div className="mw-commitmentComposerHeader">
                        <div>
                          <h3>Nuevo Compromiso</h3>
                          <p>
                            Se asociara automaticamente a "
                            {activeProject?.project?.name ||
                              meeting?.unit?.name ||
                              ''}
                            ".
                          </p>
                        </div>
                      </div>

                      <label className="mw-textareaField">
                        <span>Que compromiso se esta tomando? *</span>
                        <textarea
                          ref={commitmentTextRef}
                          placeholder="Describe la tarea o acuerdo..."
                          aria-label="Descripcion del compromiso"
                          value={commitmentText}
                          onChange={event =>
                            setCommitmentText(event.target.value)
                          }
                        />
                      </label>

                      <AppInput
                        label="Detalle opcional"
                        containerClassName="mw-field"
                        value={commitmentDescription}
                        onChange={event =>
                          setCommitmentDescription(event.target.value)
                        }
                        placeholder="Bloqueo, alcance o comentario breve"
                      />

                      <div className="mw-commitmentComposerGrid">
                        <div className="mw-deadline">
                          <span>Fecha limite</span>
                          <button
                            type="button"
                            className={
                              deadlinePreset === 'TODAY' ? 'is-active' : ''
                            }
                            onClick={() => setDeadlinePreset('TODAY')}
                          >
                            Hoy
                          </button>
                          <button
                            type="button"
                            className={
                              deadlinePreset === 'TOMORROW' ? 'is-active' : ''
                            }
                            onClick={() => setDeadlinePreset('TOMORROW')}
                          >
                            Manana
                          </button>
                          <button
                            type="button"
                            className={
                              deadlinePreset === 'WEEK' ? 'is-active' : ''
                            }
                            onClick={() => setDeadlinePreset('WEEK')}
                          >
                            1 semana
                          </button>
                          <button
                            type="button"
                            className={
                              deadlinePreset === 'CUSTOM' ? 'is-active' : ''
                            }
                            onClick={() => setDeadlinePreset('CUSTOM')}
                          >
                            <CalendarDays size={14} />
                            Fecha
                          </button>
                          <button
                            type="button"
                            className={
                              deadlinePreset === 'FREE' ? 'is-active' : ''
                            }
                            onClick={() => setDeadlinePreset('FREE')}
                          >
                            Libre
                          </button>
                          {deadlinePreset === 'CUSTOM' && (
                            <input
                              type="date"
                              value={customDueDate}
                              onChange={event =>
                                setCustomDueDate(event.target.value)
                              }
                              aria-label="Fecha limite personalizada"
                            />
                          )}
                        </div>

                        <div className="mw-assignees">
                          <span>Responsables</span>
                          <div className="mw-assigneeList">
                            {participantUsers.map(
                              (user: any, index: number) => (
                                <button
                                  type="button"
                                  key={`assignee-${user.id}-${index}`}
                                  title={getPersonName(user)}
                                  className={
                                    selectedAssignees.includes(user.id)
                                      ? 'is-selected'
                                      : ''
                                  }
                                  onClick={() => toggleAssignee(user.id)}
                                >
                                  {getInitials(user)}
                                </button>
                              )
                            )}
                            <button
                              type="button"
                              className={`mw-groupAssignee ${
                                assignWholeGroup ? 'is-selected' : ''
                              }`}
                              onClick={() => {
                                setAssignWholeGroup(value => !value);
                                setSelectedAssignees([]);
                              }}
                            >
                              Todo el grupo
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mw-commitmentComposerActions">
                        <AppButton
                          type="button"
                          variant="ghost"
                          onClick={() => setShowCommitmentComposer(false)}
                        >
                          Cancelar
                        </AppButton>
                        <AppButton
                          type="button"
                          variant="secondary"
                          disabled={
                            !canCreateCommitment ||
                            createCommitmentMutation.isPending
                          }
                          onClick={() => createCommitmentMutation.mutate()}
                        >
                          {createCommitmentMutation.isPending
                            ? 'Guardando...'
                            : 'Guardar Compromiso'}
                        </AppButton>
                      </div>
                    </article>
                  )}
                  {pendingCommitments.map((commitment: any, index: number) => (
                    <div
                      className="mw-commitmentRow"
                      key={`pending-${commitment.id}-${index}`}
                    >
                      <div className="mw-commitmentRowMain">
                        <CheckCircle2 size={17} />
                        <div>
                          {editingCommitmentId === commitment.id ? (
                            <input
                              value={editCommitmentTitle}
                              onChange={event =>
                                setEditCommitmentTitle(event.target.value)
                              }
                              aria-label="Editar compromiso"
                            />
                          ) : (
                            <strong>{commitment.title}</strong>
                          )}
                          <span>
                            {commitmentStatusLabel[commitment.status] ||
                              commitment.status}{' '}
                            / {getCommitmentAssigneeText(commitment)}
                          </span>
                          <div className="mw-commitmentDates">
                            <span>
                              <CalendarDays size={13} />
                              Creado: {formatDateShort(commitment.createdAt)}
                            </span>
                            <span
                              className={
                                isOverdue(commitment.dueDate, commitment.status)
                                  ? 'is-overdue'
                                  : ''
                              }
                            >
                              <CalendarDays size={13} />
                              Limite: {formatDateShort(commitment.dueDate)}
                              {isOverdue(commitment.dueDate, commitment.status)
                                ? ' / vencido'
                                : ''}
                            </span>
                          </div>
                          {commitment.description && (
                            <p>{commitment.description}</p>
                          )}
                        </div>
                      </div>

                      {editingCommitmentId === commitment.id && (
                        <div className="mw-commitmentInlineForm">
                          <label>
                            Fecha limite
                            <input
                              type="date"
                              value={editCommitmentDate}
                              onChange={event =>
                                setEditCommitmentDate(event.target.value)
                              }
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => saveCommitmentEdit(commitment)}
                            disabled={!editCommitmentTitle.trim()}
                          >
                            <Save size={14} />
                            Guardar
                          </button>
                        </div>
                      )}

                      {postponingCommitmentId === commitment.id && (
                        <div className="mw-commitmentInlineForm is-wide">
                          <label>
                            Nueva fecha
                            <input
                              type="date"
                              value={postponeDate}
                              onChange={event =>
                                setPostponeDate(event.target.value)
                              }
                            />
                          </label>
                          <label>
                            Motivo / justificacion
                            <textarea
                              value={postponeReason}
                              onChange={event =>
                                setPostponeReason(event.target.value)
                              }
                              placeholder="Ej. Falta informacion municipal para cerrar el punto..."
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => saveCommitmentPostpone(commitment)}
                            disabled={!postponeDate || !postponeReason.trim()}
                          >
                            <RotateCcw size={14} />
                            Posponer
                          </button>
                        </div>
                      )}

                      {canManageParticipants && (
                        <div className="mw-commitmentActions">
                          <button
                            type="button"
                            onClick={() =>
                              updateCommitmentStatusMutation.mutate({
                                id: commitment.id,
                                status: 'DONE',
                              })
                            }
                          >
                            <CheckCircle2 size={14} />
                            Cumplido
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              startPostponingCommitment(commitment)
                            }
                          >
                            <CalendarDays size={14} />
                            Posponer
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditingCommitment(commitment)}
                          >
                            <Pencil size={14} />
                            Editar
                          </button>
                          <button
                            type="button"
                            className="is-danger"
                            onClick={() =>
                              deleteCommitmentMutation.mutate(commitment.id)
                            }
                          >
                            <Trash2 size={14} />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {!pendingCommitments.length && (
                    <div className="mw-commitmentEmpty">
                      <span>
                        <CheckCircle2 size={22} />
                      </span>
                      <strong>Sin compromisos pendientes</strong>
                      <p>
                        No hay tareas activas{' '}
                        {activeProject ? 'para este proyecto.' : 'generales.'}
                      </p>
                      {canWritePersonalProposal && (
                        <button
                          type="button"
                          onClick={() => setShowCommitmentComposer(true)}
                        >
                          Anadir uno nuevo
                        </button>
                      )}
                    </div>
                  )}
                  {!!completedCommitments.length && (
                    <section className="mw-completedCommitments">
                      <div className="mw-completedHeader">
                        <CheckCircle2 size={16} />
                        <h3>Cumplidos</h3>
                        <b>{completedCommitments.length}</b>
                      </div>
                      {completedCommitments.map(
                        (commitment: any, index: number) => (
                          <div
                            className="mw-commitmentRow is-completed"
                            key={`completed-${commitment.id}-${index}`}
                          >
                            <div className="mw-commitmentRowMain">
                              <CheckCircle2 size={17} />
                              <div>
                                <strong>{commitment.title}</strong>
                                <span>
                                  {commitmentStatusLabel[commitment.status]} /{' '}
                                  {getCommitmentAssigneeText(commitment)}
                                </span>
                                <div className="mw-commitmentDates">
                                  <span>
                                    <CalendarDays size={13} />
                                    Creado:{' '}
                                    {formatDateShort(commitment.createdAt)}
                                  </span>
                                  <span>
                                    <CalendarDays size={13} />
                                    Limite:{' '}
                                    {formatDateShort(commitment.dueDate)}
                                  </span>
                                </div>
                                {commitment.description && (
                                  <p>{commitment.description}</p>
                                )}
                              </div>
                            </div>
                            {canManageParticipants && (
                              <div className="mw-commitmentActions">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCommitmentStatusMutation.mutate({
                                      id: commitment.id,
                                      status: 'PENDING',
                                    })
                                  }
                                >
                                  <RotateCcw size={14} />
                                  Reabrir
                                </button>
                                <button
                                  type="button"
                                  className="is-danger"
                                  onClick={() =>
                                    deleteCommitmentMutation.mutate(
                                      commitment.id
                                    )
                                  }
                                >
                                  <Trash2 size={14} />
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </section>
                  )}
                </div>
              )}
              {activeTab === 'projectMinutes' && activeProject && (
                <div className="mw-minuteEditor">
                  <MarkdownEditor
                    label="Minuta del proyecto"
                    value={projectMinutesDraft}
                    onChange={setProjectMinutesDraft}
                    disabled={!canManageParticipants}
                    placeholder="Acuerdos especificos del proyecto seleccionado..."
                  />
                  {canManageParticipants && (
                    <AppButton
                      type="button"
                      disabled={saveProjectMinutesMutation.isPending}
                      onClick={() => saveProjectMinutesMutation.mutate()}
                    >
                      <Save size={15} />
                      {saveProjectMinutesMutation.isPending
                        ? 'Guardando...'
                        : 'Guardar minuta del proyecto'}
                    </AppButton>
                  )}
                </div>
              )}
              {activeTab === 'main' && !activeProject && activeAgenda && (
                <div className="mw-minuteEditor">
                  <MarkdownEditor
                    label="Minuta del tema"
                    value={agendaMinutesDraft}
                    onChange={setAgendaMinutesDraft}
                    placeholder="Acuerdos, reglas administrativas o puntos revisados..."
                    disabled={!canManageParticipants}
                  />
                  {canManageParticipants && (
                    <AppButton
                      type="button"
                      disabled={
                        !activeAgenda || saveAgendaMinutesMutation.isPending
                      }
                      onClick={() => saveAgendaMinutesMutation.mutate()}
                    >
                      <Save size={15} />
                      {saveAgendaMinutesMutation.isPending
                        ? 'Guardando...'
                        : 'Guardar minuta de agenda'}
                    </AppButton>
                  )}
                </div>
              )}
              {activeTab === 'main' && !activeProject && !activeAgenda && (
                <div className="mw-agendaOverview">
                  <div>
                    <h3>Agenda general de la reunion</h3>
                    <p>
                      Selecciona un tema administrativo para redactar su minuta
                      o agrega uno nuevo. Las notas globales de la reunion viven
                      en el panel derecho.
                    </p>
                  </div>
                  {canManageParticipants && (
                    <div className="mw-agendaComposer">
                      <AppInput
                        value={newAgendaTitle}
                        onChange={event =>
                          setNewAgendaTitle(event.target.value)
                        }
                        placeholder="Ej. Nueva regla administrativa"
                      />
                      <AppButton
                        type="button"
                        disabled={
                          !newAgendaTitle.trim() ||
                          addAgendaItemMutation.isPending
                        }
                        onClick={() => addAgendaItemMutation.mutate()}
                      >
                        <Plus size={15} />
                        {addAgendaItemMutation.isPending
                          ? 'Agregando...'
                          : 'Agregar tema'}
                      </AppButton>
                    </div>
                  )}
                  <div className="mw-agendaList">
                    {generalAgendaItems.map((item, index) => (
                      <button
                        type="button"
                        key={`general-agenda-${item.id}-${index}`}
                        onClick={() => {
                          setActiveAgendaId(item.id);
                          setActiveProjectId(null);
                          setActiveTab('main');
                        }}
                      >
                        <ClipboardList size={15} />
                        <span>{item.title}</span>
                        <small>
                          {item.status === 'REVIEWED' ? 'Revisado' : 'Abierto'}
                        </small>
                      </button>
                    ))}
                    {!generalAgendaItems.length && (
                      <p className="mw-empty">
                        Aun no hay temas administrativos.
                      </p>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'main' &&
                activeProject &&
                activeReports.map((report: any, index: number) => (
                  <div
                    className="mw-report"
                    key={`report-${report.id}-${index}`}
                  >
                    <div className="mw-reportHeader">
                      <div className="mw-avatar">
                        {report.presenterType === 'GROUP' ? 'G' : 'P'}
                      </div>
                      <div>
                        <strong>
                          {report.presenterLabel ||
                            getPersonName(report.presenter || report.createdBy)}
                        </strong>
                        <span>
                          {report.presenterType === 'GROUP'
                            ? 'Informe grupal'
                            : report.presenterType === 'TEAM'
                            ? 'Informe de equipo'
                            : 'Informe individual'}{' '}
                          /{' '}
                          {new Date(report.updatedAt).toLocaleDateString(
                            'es-PE'
                          )}
                        </span>
                      </div>
                      <div className="mw-overall">
                        <small>Avance general</small>
                        <b>{report.overallProgress}%</b>
                      </div>
                    </div>
                    <div className="mw-reportGrid mw-reportGridHead">
                      <span>Item / etapa</span>
                      <span>Fuente</span>
                      <span>Avance</span>
                      <span>Estado</span>
                    </div>
                    {report.items?.map((item: any, itemIndex: number) => (
                      <div
                        className="mw-reportGrid"
                        key={`report-item-${report.id}-${item.id}-${itemIndex}`}
                      >
                        <strong>{item.name}</strong>
                        <em>{sourceLabel[item.source] || item.source}</em>
                        <div className="mw-progressCell">
                          <span>
                            <i style={{ width: `${item.progress ?? 0}%` }} />
                          </span>
                          <b>{item.progress}%</b>
                        </div>
                        <small>
                          {itemStatusLabel[item.status] || item.status}
                        </small>
                      </div>
                    ))}
                    <div className="mw-reportFooter">
                      <span>
                        {reportStatusLabel[report.status] || report.status}
                      </span>
                      {report.observations && <p>{report.observations}</p>}
                    </div>
                  </div>
                ))}
              {activeTab === 'main' &&
                activeProject &&
                !activeReports.length && (
                  <p className="mw-empty">
                    Sin informes listos o borradores para este proyecto.
                  </p>
                )}
            </article>
          </section>

          <aside className="mw-right">
            {false && canWritePersonalProposal && (
              <article className="mw-card mw-newCommitment">
                <AppButton
                  type="button"
                  className="mw-createCommitment"
                  disabled={createCommitmentMutation.isPending}
                  onClick={() => {
                    if (canCreateCommitment) {
                      createCommitmentMutation.mutate();
                      return;
                    }
                    commitmentTextRef.current?.focus();
                  }}
                >
                  <Plus size={16} />
                  {createCommitmentMutation.isPending
                    ? 'Guardando...'
                    : canManageParticipants
                    ? 'Crear Compromiso'
                    : 'Enviar propuesta'}
                </AppButton>
                <p className="mw-commitmentContext">
                  Se asociara a "
                  {activeProject?.project?.name || meeting?.unit?.name || ''}"
                </p>
                <h2>Detalle del compromiso</h2>
                <AppInput
                  label="Contexto"
                  containerClassName="mw-field"
                  value={
                    activeProject?.project?.name || meeting?.unit?.name || ''
                  }
                  readOnly
                  aria-label="Proyecto del compromiso"
                />
                <textarea
                  ref={commitmentTextRef}
                  placeholder={
                    canManageParticipants
                      ? 'Que compromiso se esta tomando?'
                      : 'Propón un compromiso para revisar en la reunion...'
                  }
                  aria-label="Descripcion del compromiso"
                  value={commitmentText}
                  onChange={event => setCommitmentText(event.target.value)}
                />
                <AppInput
                  label="Detalle opcional"
                  containerClassName="mw-field"
                  value={commitmentDescription}
                  onChange={event =>
                    setCommitmentDescription(event.target.value)
                  }
                  placeholder="Bloqueo, alcance o comentario breve"
                />
                <div className="mw-deadline">
                  <span>Fecha limite</span>
                  <button
                    type="button"
                    className={deadlinePreset === 'TODAY' ? 'is-active' : ''}
                    onClick={() => setDeadlinePreset('TODAY')}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    className={deadlinePreset === 'TOMORROW' ? 'is-active' : ''}
                    onClick={() => setDeadlinePreset('TOMORROW')}
                  >
                    Manana
                  </button>
                  <button
                    type="button"
                    className={deadlinePreset === 'WEEK' ? 'is-active' : ''}
                    onClick={() => setDeadlinePreset('WEEK')}
                  >
                    1 semana
                  </button>
                  <button
                    type="button"
                    className={deadlinePreset === 'CUSTOM' ? 'is-active' : ''}
                    onClick={() => setDeadlinePreset('CUSTOM')}
                  >
                    Fecha
                  </button>
                  <button
                    type="button"
                    className={deadlinePreset === 'FREE' ? 'is-active' : ''}
                    onClick={() => setDeadlinePreset('FREE')}
                  >
                    Libre
                  </button>
                  {deadlinePreset === 'CUSTOM' && (
                    <input
                      type="date"
                      value={customDueDate}
                      onChange={event => setCustomDueDate(event.target.value)}
                      aria-label="Fecha limite personalizada"
                    />
                  )}
                </div>
                <div className="mw-assignees">
                  <span>Responsables</span>
                  <div className="mw-assigneeList">
                    {participantUsers.map((user: any, index: number) => (
                      <button
                        type="button"
                        key={`assignee-${user.id}-${index}`}
                        title={getPersonName(user)}
                        className={
                          selectedAssignees.includes(user.id)
                            ? 'is-selected'
                            : ''
                        }
                        onClick={() => toggleAssignee(user.id)}
                      >
                        {getInitials(user)}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`mw-groupAssignee ${
                        assignWholeGroup ? 'is-selected' : ''
                      }`}
                      onClick={() => {
                        setAssignWholeGroup(value => !value);
                        setSelectedAssignees([]);
                      }}
                    >
                      Todo el grupo
                    </button>
                  </div>
                </div>
              </article>
            )}

            {false && (
              <article className="mw-card">
                <div className="mw-cardTitle">
                  <h2>
                    {activeProject
                      ? 'Compromisos del proyecto'
                      : 'Compromisos generales'}
                  </h2>
                  <CheckCircle2 size={15} />
                </div>
                {pendingCommitments.map((commitment: any, index: number) => (
                  <div
                    className="mw-commitment"
                    key={`side-pending-${commitment.id}-${index}`}
                  >
                    <CheckCircle2 size={16} />
                    <div>
                      <strong>{commitment.title}</strong>
                      <span>
                        {commitment.status} /{' '}
                        {getCommitmentAssigneeText(commitment)}
                      </span>
                    </div>
                  </div>
                ))}
                {!pendingCommitments.length && (
                  <p className="mw-empty">
                    Sin compromisos pendientes{' '}
                    {activeProject ? 'para este proyecto' : 'generales'}.
                  </p>
                )}
              </article>
            )}

            {!!proposedCommitments.length && (
              <article className="mw-card">
                <div className="mw-cardTitle">
                  <h2>Propuestas de compromiso</h2>
                  <ClipboardList size={15} />
                </div>
                {proposedCommitments.map((commitment: any, index: number) => (
                  <div
                    className="mw-proposal"
                    key={`proposal-${commitment.id}-${index}`}
                  >
                    <div>
                      <strong>{commitment.title}</strong>
                      <span>
                        {commitment.project?.name || 'General'} /{' '}
                        {getCommitmentAssigneeText(commitment)}
                      </span>
                    </div>
                    {canManageParticipants && (
                      <div className="mw-proposalActions">
                        <button
                          type="button"
                          onClick={() =>
                            confirmCommitmentMutation.mutate({
                              id: commitment.id,
                              status: 'CONFIRMED',
                            })
                          }
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() =>
                            confirmCommitmentMutation.mutate({
                              id: commitment.id,
                              status: 'REJECTED',
                            })
                          }
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </article>
            )}

            <article className="mw-card" ref={generalMinutesRef}>
              <div className="mw-cardTitle">
                <h2>Notas generales</h2>
                <MessageSquareText size={15} />
              </div>
              <div className="mw-minuteEditor is-compact">
                <MarkdownEditor
                  label="Notas globales de la reunion"
                  value={generalMinutesDraft}
                  onChange={setGeneralMinutesDraft}
                  disabled={!canManageParticipants}
                  placeholder="Decisiones generales, acuerdos administrativos o comentarios globales..."
                  compact
                />
                {canManageParticipants && (
                  <AppButton
                    type="button"
                    disabled={saveGeneralMinutesMutation.isPending}
                    onClick={() => saveGeneralMinutesMutation.mutate()}
                  >
                    <Save size={15} />
                    {saveGeneralMinutesMutation.isPending
                      ? 'Guardando...'
                      : 'Guardar minuta general'}
                  </AppButton>
                )}
              </div>
            </article>

            {activeProject && (
              <article className="mw-card">
                <div className="mw-cardTitle">
                  <h2>Minuta del proyecto</h2>
                  <ClipboardList size={15} />
                </div>
                <div className="mw-minuteEditor is-compact">
                  <MarkdownEditor
                    label="Minuta del proyecto activo"
                    value={projectMinutesDraft}
                    onChange={setProjectMinutesDraft}
                    disabled={!canManageParticipants}
                    placeholder="Acuerdos especificos del proyecto seleccionado..."
                    compact
                  />
                  {canManageParticipants && (
                    <AppButton
                      type="button"
                      disabled={saveProjectMinutesMutation.isPending}
                      onClick={() => saveProjectMinutesMutation.mutate()}
                    >
                      <Save size={15} />
                      {saveProjectMinutesMutation.isPending
                        ? 'Guardando...'
                        : 'Guardar minuta del proyecto'}
                    </AppButton>
                  )}
                </div>
              </article>
            )}
          </aside>
        </section>
      )}

      {quickCommitmentOpen && (
        <div className="mw-modalLayer">
          <button
            type="button"
            className="mw-modalBackdrop"
            aria-label="Cerrar nuevo compromiso"
            onClick={() => setQuickCommitmentOpen(false)}
          />
          <aside className="mw-quickCommitmentPanel">
            <header className="mw-participantHeader">
              <div>
                <h2>Nuevo compromiso</h2>
                <p>Creado desde Proyectos + Miembros</p>
              </div>
              <button
                type="button"
                onClick={() => setQuickCommitmentOpen(false)}
              >
                <X size={18} />
              </button>
            </header>

            <section className="mw-quickCommitmentBody">
              <label>
                Titulo
                <input
                  value={quickCommitmentTitle}
                  onChange={event =>
                    setQuickCommitmentTitle(event.target.value)
                  }
                  placeholder="Compromiso acordado"
                />
              </label>

              <label>
                Descripcion
                <textarea
                  value={quickCommitmentDescription}
                  onChange={event =>
                    setQuickCommitmentDescription(event.target.value)
                  }
                  placeholder="Detalle, bloqueo o criterio de cumplimiento"
                />
              </label>

              <div className="mw-quickCommitmentGrid">
                <label>
                  Responsable
                  <select
                    value={quickCommitmentAssignee}
                    onChange={event =>
                      setQuickCommitmentAssignee(event.target.value)
                    }
                  >
                    <option value="">Seleccionar responsable</option>
                    <option value="UNIT">Toda la unidad</option>
                    {officeReviewMembers.map(member => (
                      <option
                        value={String(member.id)}
                        key={`quick-assignee-${member.id}`}
                      >
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Fecha limite
                  <input
                    type="date"
                    value={quickCommitmentDueDate}
                    onChange={event =>
                      setQuickCommitmentDueDate(event.target.value)
                    }
                  />
                </label>
                <label>
                  Prioridad
                  <select
                    value={quickCommitmentPriority}
                    onChange={event =>
                      setQuickCommitmentPriority(
                        event.target.value as typeof quickCommitmentPriority
                      )
                    }
                    disabled={!canManageParticipants}
                  >
                    <option value="LOW">Baja</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </label>
              </div>

              <article className="mw-contextEditor">
                <div className="mw-contextEditorHeader">
                  <div>
                    <strong>Alcances</strong>
                    <small>
                      Cada fila se guardara como CommitmentContext cuando tengas
                      permisos para crear compromisos confirmados.
                    </small>
                  </div>
                  <button
                    type="button"
                    disabled={!quickCommitmentProjectId}
                    onClick={addProjectContextToQuickCommitment}
                  >
                    <Plus size={14} />
                    Agregar alcance
                  </button>
                </div>

                <div className="mw-contextList">
                  {quickCommitmentContexts.map(context => (
                    <div
                      className="mw-contextItem"
                      key={`quick-context-${context.key}`}
                    >
                      <b>{context.targetType}</b>
                      <span>
                        <strong>{context.label}</strong>
                        <small>{context.meta || 'Alcance tecnico'}</small>
                      </span>
                      <label>
                        <input
                          type="checkbox"
                          checked={!!context.includeChildren}
                          onChange={event =>
                            setQuickCommitmentContexts(current =>
                              current.map(item =>
                                item.key === context.key
                                  ? {
                                      ...item,
                                      includeChildren: event.target.checked,
                                    }
                                  : item
                              )
                            )
                          }
                        />
                        Hijos
                      </label>
                      <button
                        type="button"
                        onClick={() => removeQuickContext(context.key)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {!quickCommitmentContexts.length && (
                    <p className="mw-empty">
                      Sin alcances seleccionados. Agrega un proyecto, etapa,
                      nivel o tarea.
                    </p>
                  )}
                </div>
              </article>
            </section>

            <footer className="mw-participantFooter">
              <AppButton
                type="button"
                variant="ghost"
                onClick={() => setQuickCommitmentOpen(false)}
              >
                Cancelar
              </AppButton>
              <AppButton
                type="button"
                className="mw-participantSubmit"
                disabled={
                  !canCreateQuickCommitment || quickCommitmentMutation.isPending
                }
                onClick={() => quickCommitmentMutation.mutate()}
              >
                <Plus size={15} />
                {quickCommitmentMutation.isPending
                  ? 'Creando...'
                  : canManageParticipants
                  ? 'Crear compromiso'
                  : 'Enviar propuesta'}
              </AppButton>
            </footer>
          </aside>
        </div>
      )}

      {showEndConfirmation && (
        <div className="mw-modalLayer">
          <button
            type="button"
            className="mw-modalBackdrop"
            aria-label="Cancelar finalizacion de reunion"
            onClick={() => setShowEndConfirmation(false)}
          />
          <section className="mw-sessionDialog" role="dialog" aria-modal="true">
            <header>
              <div>
                <span>CIERRE DE REUNION</span>
                <h2>Finalizar esta reunion</h2>
              </div>
              <button
                type="button"
                title="Cerrar"
                onClick={() => setShowEndConfirmation(false)}
              >
                <X size={18} />
              </button>
            </header>
            <div className="mw-sessionDialogBody">
              <p>
                Se conservaran las minutas, asistentes y compromisos
                registrados. La reunion podra continuarse con el mismo
                identificador.
              </p>
              <div className="mw-sessionSummary">
                <span>{meeting?.participants?.length ?? 0} asistentes</span>
                <span>{meetingCommitments.length} compromisos</span>
                <span>{agendaItems.length} temas</span>
              </div>
            </div>
            <footer>
              <AppButton
                type="button"
                variant="outline"
                onClick={() => setShowEndConfirmation(false)}
              >
                Cancelar
              </AppButton>
              <AppButton
                type="button"
                variant="danger"
                disabled={endMeetingMutation.isPending}
                onClick={() => endMeetingMutation.mutate()}
              >
                <CheckCircle2 size={16} />
                {endMeetingMutation.isPending
                  ? 'Finalizando...'
                  : 'Finalizar reunion'}
              </AppButton>
            </footer>
          </section>
        </div>
      )}

      {showResumeDialog && (
        <div className="mw-modalLayer">
          <button
            type="button"
            className="mw-modalBackdrop"
            aria-label="Cancelar continuacion de reunion"
            onClick={() => setShowResumeDialog(false)}
          />
          <section className="mw-sessionDialog" role="dialog" aria-modal="true">
            <header>
              <div>
                <span>CONTINUAR REUNION</span>
                <h2>Se conservara la misma reunion</h2>
              </div>
              <button
                type="button"
                title="Cerrar"
                onClick={() => setShowResumeDialog(false)}
              >
                <X size={18} />
              </button>
            </header>
            <div className="mw-sessionDialogBody">
              <p>
                La bitacora registrara quien la continua y cuando. Los
                compromisos, minutas y futuras versiones del acta seguiran
                vinculados a esta reunion.
              </p>
              <label className="mw-sessionReason">
                Motivo {requiresResumeReason ? '(requerido)' : '(opcional)'}
                <textarea
                  value={resumeReason}
                  onChange={event => setResumeReason(event.target.value)}
                  placeholder={
                    requiresResumeReason
                      ? 'Indique por que se retoma la reunion'
                      : 'Opcional: indique por que se retoma'
                  }
                />
              </label>
              {resumeMeetingMutation.isError && (
                <p className="mw-sessionError">
                  {(resumeMeetingMutation.error as any)?.response?.data
                    ?.message || 'No se pudo continuar la reunion.'}
                </p>
              )}
            </div>
            <footer>
              <AppButton
                type="button"
                variant="outline"
                onClick={() => setShowResumeDialog(false)}
              >
                Cancelar
              </AppButton>
              <AppButton
                type="button"
                disabled={
                  resumeMeetingMutation.isPending ||
                  (requiresResumeReason && !resumeReason.trim())
                }
                onClick={() => resumeMeetingMutation.mutate()}
              >
                <RotateCcw size={16} />
                {resumeMeetingMutation.isPending
                  ? 'Continuando...'
                  : 'Continuar reunion'}
              </AppButton>
            </footer>
          </section>
        </div>
      )}

      {showMeetingHistory && (
        <div className="mw-modalLayer">
          <button
            type="button"
            className="mw-modalBackdrop"
            aria-label="Cerrar reuniones anteriores"
            onClick={() => setShowMeetingHistory(false)}
          />
          <section
            className="mw-sessionDialog mw-historyDialog"
            role="dialog"
            aria-modal="true"
          >
            <header>
              <div>
                <span>HISTORIAL DE UNIDAD</span>
                <h2>Reuniones anteriores</h2>
              </div>
              <button
                type="button"
                title="Cerrar"
                onClick={() => setShowMeetingHistory(false)}
              >
                <X size={18} />
              </button>
            </header>
            <div className="mw-historyList">
              {meetingHistoryQuery.isLoading && <p>Cargando reuniones...</p>}
              {!meetingHistoryQuery.isLoading &&
                (meetingHistoryQuery.data ?? [])
                  .filter((item: MeetingHistoryItem) => item.id !== meetingId)
                  .map((item: MeetingHistoryItem) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => navigate(`/grupos/reuniones/${item.id}`)}
                    >
                      <div>
                        <strong>{item.title}</strong>
                        <span>{formatDateShort(item.scheduledAt)}</span>
                      </div>
                      <small>
                        {item.status === 'ENDED' ? 'Finalizada' : item.status}
                        {' · '}
                        {item._count.commitments} compromisos
                      </small>
                    </button>
                  ))}
              {!meetingHistoryQuery.isLoading &&
                !(meetingHistoryQuery.data ?? []).filter(
                  (item: MeetingHistoryItem) => item.id !== meetingId
                ).length && (
                  <p>No hay otras reuniones registradas en esta unidad.</p>
                )}
            </div>
          </section>
        </div>
      )}

      {showParticipantManager && (
        <div className="mw-modalLayer">
          <button
            type="button"
            className="mw-modalBackdrop"
            aria-label="Cerrar gestion de asistentes"
            onClick={() => setShowParticipantManager(false)}
          />
          <aside className="mw-participantPanel">
            <header className="mw-participantHeader">
              <div>
                <h2>Gestionar asistentes</h2>
                <p>{meeting?.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowParticipantManager(false)}
              >
                <X size={18} />
              </button>
            </header>

            <section className="mw-participantBody">
              <article className="mw-participantSection">
                <h3>Asistencia actual</h3>
                {(meeting?.participants ?? []).map(
                  (participant: MeetingParticipant, index: number) => (
                    <div
                      className="mw-participantRow"
                      key={`participant-row-${participant.id}-${index}`}
                    >
                      <div>
                        <strong>{getParticipantName(participant)}</strong>
                        <small>
                          {participant.origin === 'UNIT_MEMBER'
                            ? 'Miembro'
                            : participant.participantType === 'EXTERNAL'
                            ? 'Externo'
                            : 'Invitado'}
                          {getParticipantMeta(participant)
                            ? ` / ${getParticipantMeta(participant)}`
                            : ''}
                        </small>
                      </div>
                      <select
                        value={participant.status}
                        disabled={updateParticipantMutation.isPending}
                        onChange={event =>
                          updateParticipantMutation.mutate({
                            id: participant.id,
                            status: event.target
                              .value as MeetingParticipantStatus,
                          })
                        }
                      >
                        {Object.entries(attendanceLabel).map(
                          ([value, label]) => (
                            <option value={value} key={value}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                      <button
                        type="button"
                        title="Quitar asistente"
                        disabled={removeParticipantMutation.isPending}
                        onClick={() =>
                          removeParticipantMutation.mutate(participant.id)
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )
                )}
              </article>

              <article className="mw-participantSection">
                <h3>Agregar usuario invitado</h3>
                <label className="mw-searchBox">
                  <Search size={15} />
                  <AppInput
                    value={candidateSearch}
                    onChange={event => setCandidateSearch(event.target.value)}
                    placeholder="Buscar usuario registrado"
                  />
                </label>
                <div className="mw-candidateList">
                  {(candidateQuery.data ?? [])
                    .slice(0, 6)
                    .map((user, index) => (
                      <button
                        type="button"
                        key={`candidate-${user.id}-${index}`}
                        className={
                          selectedUserGuests.some(item => item.id === user.id)
                            ? 'is-selected'
                            : ''
                        }
                        onClick={() => toggleUserGuest(user)}
                      >
                        <strong>{getPersonName(user)}</strong>
                        <small>
                          {user.profile?.job || user.email || 'Usuario'}
                        </small>
                      </button>
                    ))}
                </div>
              </article>

              <article className="mw-participantSection">
                <h3>Agregar externo</h3>
                <label className="mw-searchBox">
                  <Search size={15} />
                  <AppInput
                    value={externalSearch}
                    onChange={event => setExternalSearch(event.target.value)}
                    placeholder="Buscar contacto externo"
                  />
                </label>
                <div className="mw-candidateList">
                  {(externalContactsQuery.data ?? [])
                    .slice(0, 6)
                    .map((contact, index) => (
                      <button
                        type="button"
                        key={`external-${contact.id}-${index}`}
                        className={
                          selectedExternalGuests.some(
                            item => item.id === contact.id
                          )
                            ? 'is-selected'
                            : ''
                        }
                        onClick={() => toggleExternalGuest(contact)}
                      >
                        <strong>{contact.name}</strong>
                        <small>
                          {[contact.position, contact.organization]
                            .filter(Boolean)
                            .join(' / ') || 'Contacto externo'}
                        </small>
                      </button>
                    ))}
                </div>
                <div className="mw-externalInline">
                  <AppInput
                    value={externalGuestName}
                    onChange={event => setExternalGuestName(event.target.value)}
                    placeholder="Nuevo externo: nombre"
                  />
                  <AppInput
                    value={externalGuestPosition}
                    onChange={event =>
                      setExternalGuestPosition(event.target.value)
                    }
                    placeholder="Cargo"
                  />
                  <AppInput
                    value={externalGuestOrganization}
                    onChange={event =>
                      setExternalGuestOrganization(event.target.value)
                    }
                    placeholder="Institucion"
                  />
                </div>
              </article>
            </section>

            <footer className="mw-participantFooter">
              <AppButton
                type="button"
                className="mw-participantSubmit"
                disabled={
                  addParticipantsMutation.isPending ||
                  (!selectedUserGuests.length &&
                    !selectedExternalGuests.length &&
                    !externalGuestName.trim())
                }
                onClick={() => addParticipantsMutation.mutate()}
              >
                <UserPlus size={15} />
                Agregar asistentes
              </AppButton>
            </footer>
          </aside>
        </div>
      )}
    </main>
  );
};

export default MeetingWorkspace;

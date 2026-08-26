import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleSlash,
  Clock,
  Eye,
  Filter,
  FolderGit2,
  ListChecks,
  Plus,
  Search,
  Settings2,
  Trash2,
  Undo2,
  UserRound,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { AppButton } from '@/components/app-ui/app-button';
import { AppInput } from '@/components/app-ui/app-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import { isOpenAlertConfirm$ } from '@/services/sharingSubject';
import type { Level } from '@/types/types';
import {
  createCommitment,
  deleteCommitment,
  getCommitmentBoard,
  getMeetingUnitTechnicalProjects,
  getMeetingUnitTechnicalStageTree,
  getOfficeProjectModerators,
  reviewCommitment,
  updateCommitment,
  updateCommitmentReviewComment,
  updateCommitmentStatus,
} from '../../services/officeMeetings.service';
import type {
  Commitment,
  CommitmentBoardUnit,
  CommitmentReviewDecision,
} from '../../types/officeMeetings.types';
import type { MeetingProjectFocus } from '../../types/meetingUnitProjects.types';
import { CommitmentAssigneePopover } from './CommitmentAssigneePopover';
import { CommitmentContextDialog } from './CommitmentContextDialog';
import {
  buildCommitmentContexts,
  emptyTechnicalSelection,
  getTechnicalContextSummary,
  technicalSelectionFromCommitment,
  type CommitmentTechnicalSelection,
} from './commitmentContextSelection';
import {
  collectProjectTechnicalTasks,
  commitmentScopeLevels,
  commitmentScopeTasks,
  getCommitmentMemberIds,
  isUnlinkedTechnicalAdvance,
  taskParticipantIds,
  type ProjectTechnicalTask,
} from './projectMemberReview';
import './commitmentsBoardWorkspace.css';

type CreateDraft = {
  title: string;
  dueDate: string;
  comment: string;
  decision: '' | CommitmentReviewDecision;
  context: CommitmentTechnicalSelection;
  assigneeUserIds: number[];
  isActive: boolean;
};

type DetailDraft = {
  title: string;
  description: string;
  dueDate: string;
  status: Commitment['status'];
  priority: Commitment['priority'];
  comment: string;
  decision: '' | CommitmentReviewDecision;
};

type BoardViewMode = 'units' | 'projectsMembers' | 'membersCommitments';

type CompletedMode = 'recent' | 'all' | 'hidden';

type MemberCommitmentGroup = {
  userId: number;
  name: string;
  job?: string | null;
  commitments: Commitment[];
  openCount: number;
  overdueCount: number;
  completedRecentCount: number;
};

type ProjectCommitmentReviewItem = {
  commitment: Commitment;
  scopeLevels: { id: number; label: string }[];
  scopeTasks: ProjectTechnicalTask[];
};

type ProjectReviewMember = {
  userId: number | null;
  name: string;
  job?: string | null;
  commitments: ProjectCommitmentReviewItem[];
  unlinkedTasks: ProjectTechnicalTask[];
};

type ProjectStageReviewGroup = {
  unitId: string;
  stageId: number;
  stageName: string;
  tasks: ProjectTechnicalTask[];
  members: ProjectReviewMember[];
};

type ProjectReviewGroup = {
  reviewKey: string;
  focus: MeetingProjectFocus;
  projectId: number;
  projectName: string;
  cui?: string | null;
  stages: ProjectStageReviewGroup[];
  commitments: Commitment[];
};

type CommitmentsBoardWorkspaceProps = {
  unitId?: string;
  scope?: 'self' | 'descendants';
  embedded?: boolean;
  meetingId?: string | null;
  viewMode?: BoardViewMode;
  hideViewTabs?: boolean;
};

const emptyDraft = (): CreateDraft => ({
  title: '',
  dueDate: '',
  comment: '',
  decision: '',
  context: emptyTechnicalSelection(),
  assigneeUserIds: [],
  isActive: false,
});

const statusLabel: Record<Commitment['status'], string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En proceso',
  DONE: 'Cerrado',
  BLOCKED: 'Bloqueado',
  CANCELLED: 'Cancelado',
};

const priorityLabel: Record<Commitment['priority'], string> = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

const decisionLabel: Record<CommitmentReviewDecision, string> = {
  APPROVED: 'Si',
  REJECTED: 'No',
  NOT_APPLICABLE: 'No aplica',
};

const decisionOptions: CommitmentReviewDecision[] = [
  'APPROVED',
  'REJECTED',
  'NOT_APPLICABLE',
];

const getCommitmentKey = (commitment: Commitment) =>
  `CMP-${commitment.id.slice(0, 6).toUpperCase()}`;

const getPrimaryContext = (commitment: Commitment) =>
  commitment.contexts?.find(item => item.isPrimary) || commitment.contexts?.[0];

const formatDateInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const toIsoDate = (value: string) => {
  if (!value) return null;
  return new Date(`${value}T12:00:00`).toISOString();
};

const stopNativeUndoPropagation = (
  event: KeyboardEvent<HTMLTextAreaElement>
) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.stopPropagation();
  }
};

const getDetailDraft = (commitment: Commitment): DetailDraft => ({
  title: commitment.title,
  description: commitment.description || '',
  dueDate: formatDateInput(commitment.dueDate),
  status: commitment.status,
  priority: commitment.priority,
  comment: commitment.reviews?.[0]?.comment || '',
  decision: commitment.reviews?.[0]?.decision || '',
});

type CommitmentAssigneeUser = NonNullable<
  Commitment['assignees']
>[number]['user'];

const getPersonName = (user?: CommitmentAssigneeUser) => {
  const profile = user?.profile;
  const name = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
  return name || 'Usuario';
};

const getProfileName = (
  user?: {
    id: number;
    email?: string | null;
    profile?: { firstName: string; lastName: string; job?: unknown } | null;
  } | null
) => {
  const profile = user?.profile;
  const name = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
  return (
    name || user?.email || (user?.id ? `Usuario ${user.id}` : 'Sin responsable')
  );
};

const getJobText = (job?: unknown) => {
  if (!job) return null;
  if (typeof job === 'string') return job;
  if (typeof job === 'object' && 'name' in job) {
    const value = (job as { name?: unknown }).name;
    return typeof value === 'string' ? value : null;
  }
  return null;
};

const getProjectName = (focus: MeetingProjectFocus) =>
  focus.project.contract?.projectShortName ||
  focus.project.contract?.projectName ||
  focus.project.name ||
  `Proyecto ${focus.projectId}`;

const activeStageFocus = (focus: MeetingProjectFocus) =>
  (focus.stageFocus ?? []).filter(
    stageFocus => stageFocus.status !== 'INACTIVE' && stageFocus.isCurrent
  );

const taskStatusLabel = (status?: string) => {
  const labels: Record<string, string> = {
    UNRESOLVED: 'Sin resolver',
    PROCESS: 'En proceso',
    INREVIEW: 'En revision',
    REVIEWED: 'Revisado',
    DENIED: 'Observado',
    DONE: 'Completado',
    LIQUIDATION: 'Liquidacion',
  };
  return labels[status || ''] || status || 'Sin estado';
};

const commitmentMatchesStage = (
  commitment: Commitment,
  projectId: number,
  stageId: number
) => {
  const technicalContexts = (commitment.contexts ?? []).filter(context =>
    ['STAGE', 'LEVEL', 'TASK'].includes(context.targetType)
  );
  const contextsForProject = technicalContexts.filter(
    context => context.projectId === projectId
  );
  if (contextsForProject.length) {
    return contextsForProject.some(
      context => !context.stageId || context.stageId === stageId
    );
  }
  return commitment.projectId === projectId;
};

const getAssigneeText = (commitment: Commitment) => {
  if (!commitment.assignees?.length) return 'Sin responsable';
  return commitment.assignees
    .map(assignee =>
      assignee.user ? getPersonName(assignee.user) : assignee.unit?.name
    )
    .filter(Boolean)
    .join(', ');
};

const getAssigneeUserIds = (commitment: Commitment) =>
  Array.from(
    new Set(
      (commitment.assignees ?? []).flatMap(assignee =>
        assignee.user?.id ? [assignee.user.id] : []
      )
    )
  );

const getAssigneeNamesById = (commitment: Commitment) =>
  new Map(
    (commitment.assignees ?? []).flatMap(assignee =>
      assignee.user
        ? [[assignee.user.id, getPersonName(assignee.user)] as const]
        : []
    )
  );

const getDraftContextSummary = (selection: CommitmentTechnicalSelection) => {
  if (!selection.levelIds.length && !selection.taskIds.length) {
    return 'Agregar contexto';
  }
  const parts = [
    selection.stageName || 'Etapa',
    selection.levelIds.length
      ? `${selection.levelIds.length} ${
          selection.levelIds.length === 1 ? 'nivel' : 'niveles'
        }`
      : '',
    selection.taskIds.length
      ? `${selection.taskIds.length} ${
          selection.taskIds.length === 1 ? 'tarea' : 'tareas'
        }`
      : '',
  ].filter(Boolean);
  return parts.join(' · ');
};

const getContextLabel = (commitment: Commitment) => {
  const context = getPrimaryContext(commitment);
  if (!context) return commitment.project?.name || 'Unidad';
  if (context.targetType === 'ORG_UNIT') return context.unit?.name || 'Unidad';
  if (context.targetType === 'PROJECT')
    return (
      context.project?.contract?.projectShortName ||
      context.project?.name ||
      'Proyecto'
    );
  if (context.targetType === 'STAGE') return context.stage?.name || 'Etapa';
  if (context.targetType === 'LEVEL')
    return `${context.level?.item || ''} ${
      context.level?.name || 'Nivel'
    }`.trim();
  return context.subTask?.name || 'Tarea';
};

const getContextBadgeLabel = (commitment: Commitment) => {
  const context = getPrimaryContext(commitment);
  if (!context) return 'Contexto general';
  if (context.targetType === 'ORG_UNIT')
    return `Unidad: ${context.unit?.name || 'Sin nombre'}`;
  if (context.targetType === 'PROJECT')
    return `Proyecto: ${
      context.project?.contract?.projectShortName ||
      context.project?.name ||
      'Sin nombre'
    }`;
  if (context.targetType === 'STAGE') {
    const projectName =
      context.project?.contract?.projectShortName ||
      context.project?.name ||
      commitment.project?.name ||
      'Proyecto';
    return `Proyecto: ${projectName} / ${context.stage?.name || 'Sin etapa'}`;
  }
  if (context.targetType === 'LEVEL')
    return `Nivel: ${
      `${context.level?.item || ''} ${context.level?.name || ''}`.trim() ||
      'Sin nombre'
    }`;
  return `Tarea: ${context.subTask?.name || 'Sin nombre'}`;
};

const getCommitmentActivityDate = (commitment: Commitment) => {
  const value =
    commitment.reviews?.[0]?.reviewedAt ||
    commitment.updatedAt ||
    commitment.createdAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isRecentCompleted = (commitment: Commitment, days = 30) => {
  if (commitment.status !== 'DONE') return false;
  const activityDate = getCommitmentActivityDate(commitment);
  if (!activityDate) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return activityDate >= cutoff;
};

const isOverdueCommitment = (commitment: Commitment) => {
  if (
    !commitment.dueDate ||
    ['DONE', 'CANCELLED'].includes(commitment.status)
  ) {
    return false;
  }
  const dueDate = new Date(commitment.dueDate);
  if (Number.isNaN(dueDate.getTime())) return false;
  dueDate.setHours(23, 59, 59, 999);
  return dueDate < new Date();
};

const findBoardUnit = (
  units: CommitmentBoardUnit[],
  unitId?: string
): CommitmentBoardUnit | null => {
  if (!unitId) return null;
  for (const unit of units) {
    if (unit.id === unitId) return unit;
    const child = findBoardUnit(unit.children, unitId);
    if (child) return child;
  }
  return null;
};

const withoutChildren = (unit: CommitmentBoardUnit): CommitmentBoardUnit => ({
  ...unit,
  children: [],
});

const matchesSearch = (commitment: Commitment, search: string) => {
  const text = [
    commitment.title,
    commitment.description,
    commitment.project?.name,
    commitment.unit?.name,
    getAssigneeText(commitment),
    getContextLabel(commitment),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return text.includes(search.toLowerCase());
};

const CommitmentsBoardWorkspace = ({
  unitId,
  scope = 'descendants',
  embedded = false,
  meetingId,
  viewMode: controlledViewMode,
  hideViewTabs = false,
}: CommitmentsBoardWorkspaceProps = {}) => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const activeMeetingId =
    meetingId || searchParams.get('meetingId') || undefined;
  const boardQuery = useQuery({
    queryKey: ['commitment-board'],
    queryFn: getCommitmentBoard,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reviewFilter, setReviewFilter] = useState('');
  const [viewMode, setViewMode] = useState<BoardViewMode>('units');
  const [projectFilter, setProjectFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  const [completedMode, setCompletedMode] = useState<CompletedMode>('recent');
  const [showMembersWithoutCommitments, setShowMembersWithoutCommitments] =
    useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set()
  );
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(
    new Set()
  );
  const [drafts, setDrafts] = useState<Record<string, CreateDraft>>({});
  const [projectDraft, setProjectDraft] = useState<{
    unit: CommitmentBoardUnit;
    draft: CreateDraft;
  } | null>(null);
  const [memberDraft, setMemberDraft] = useState<{
    unit: CommitmentBoardUnit;
    memberName?: string;
    draft: CreateDraft;
  } | null>(null);
  const [reviewComments, setReviewComments] = useState<Record<string, string>>(
    {}
  );
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (controlledViewMode) {
      setViewMode(controlledViewMode);
      return;
    }
    const meetingView = searchParams.get('meetingView');
    if (
      meetingView === 'units' ||
      meetingView === 'projectsMembers' ||
      meetingView === 'membersCommitments'
    ) {
      setViewMode(meetingView);
    }
  }, [controlledViewMode, searchParams]);
  const [detailDraft, setDetailDraft] = useState<DetailDraft | null>(null);
  const reviewCommentTimers = useRef<Record<string, number>>({});
  const autoSavedReviewComments = useRef<Record<string, string>>({});

  const visibleUnits = useMemo(() => {
    const units = boardQuery.data?.units ?? [];
    const selectedUnit = findBoardUnit(units, unitId);
    if (!selectedUnit) return units;
    return [
      scope === 'descendants' ? selectedUnit : withoutChildren(selectedUnit),
    ];
  }, [boardQuery.data?.units, scope, unitId]);

  const effectiveUnit = visibleUnits[0] ?? null;
  const effectiveUnitId = unitId || effectiveUnit?.id || '';

  const allUnitIds = useMemo(() => {
    const ids: string[] = [];
    const collect = (unit: CommitmentBoardUnit) => {
      ids.push(unit.id);
      unit.children.forEach(collect);
    };
    visibleUnits.forEach(collect);
    return ids;
  }, [visibleUnits]);

  const unitsById = useMemo(() => {
    const map = new Map<string, CommitmentBoardUnit>();
    const collect = (unit: CommitmentBoardUnit) => {
      map.set(unit.id, unit);
      unit.children.forEach(collect);
    };
    visibleUnits.forEach(collect);
    return map;
  }, [visibleUnits]);

  useEffect(() => {
    if (!allUnitIds.length) return;
    setExpanded(current => {
      const next = new Set(current);
      let changed = false;
      allUnitIds.forEach(id => {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [allUnitIds]);

  const commitmentsById = useMemo(() => {
    const map = new Map<string, Commitment>();
    const collect = (unit: CommitmentBoardUnit) => {
      unit.commitments.forEach(commitment =>
        map.set(commitment.id, commitment)
      );
      unit.children.forEach(collect);
    };
    visibleUnits.forEach(collect);
    return map;
  }, [visibleUnits]);

  const allCommitments = useMemo(
    () => Array.from(commitmentsById.values()),
    [commitmentsById]
  );

  const technicalProjectsQuery = useQuery({
    queryKey: [
      'commitment-board',
      'technical-projects',
      effectiveUnitId,
      scope,
    ],
    queryFn: () =>
      getMeetingUnitTechnicalProjects(effectiveUnitId, {
        scope,
        includeInactive: false,
      }),
    enabled: viewMode === 'projectsMembers' && Boolean(effectiveUnitId),
  });

  const officeMembersQuery = useQuery({
    queryKey: ['commitment-board', 'office-members', effectiveUnitId],
    queryFn: () => getOfficeProjectModerators(effectiveUnitId),
    enabled:
      (viewMode === 'projectsMembers' || viewMode === 'membersCommitments') &&
      Boolean(effectiveUnitId),
  });

  const stageRefs = useMemo(
    () =>
      (technicalProjectsQuery.data ?? []).flatMap(focus =>
        activeStageFocus(focus).map(stageFocus => ({
          unitId: stageFocus.unitId || focus.unitId || effectiveUnitId,
          projectId: focus.projectId,
          projectName: getProjectName(focus),
          stageId: stageFocus.stageId,
          stageName: stageFocus.stage.name,
        }))
      ),
    [effectiveUnitId, technicalProjectsQuery.data]
  );

  const stageTreeQueries = useQueries({
    queries: stageRefs.map(stageRef => ({
      queryKey: [
        'commitment-board',
        'technical-stage-tree',
        stageRef.unitId,
        stageRef.projectId,
        stageRef.stageId,
      ],
      queryFn: () =>
        getMeetingUnitTechnicalStageTree({
          unitId: stageRef.unitId,
          projectId: stageRef.projectId,
          stageId: stageRef.stageId,
        }),
      enabled: viewMode === 'projectsMembers' && Boolean(stageRef.unitId),
    })),
  });

  const selectedCommitment = selectedCommitmentId
    ? commitmentsById.get(selectedCommitmentId) || null
    : null;

  const membersById = useMemo(() => {
    const map = new Map<
      number,
      { name: string; job?: string | null; userId: number }
    >();
    (officeMembersQuery.data?.memberships ?? []).forEach(membership => {
      map.set(membership.user.id, {
        userId: membership.user.id,
        name: getProfileName(membership.user),
        job:
          getJobText(membership.user.profile?.job) ||
          membership.user.email ||
          null,
      });
    });
    allCommitments.forEach(commitment => {
      (commitment.assignees ?? []).forEach(assignee => {
        if (!assignee.user?.id || map.has(assignee.user.id)) return;
        map.set(assignee.user.id, {
          userId: assignee.user.id,
          name: getProfileName(assignee.user),
          job: getJobText(assignee.user.profile?.job),
        });
      });
    });
    stageTreeQueries.forEach(query => {
      const collect = (level?: Level | null) => {
        if (!level) return;
        (level.participantSummary ?? []).forEach(participant => {
          if (map.has(participant.userId)) return;
          const name = `${participant.firstName ?? ''} ${
            participant.lastName ?? ''
          }`.trim();
          map.set(participant.userId, {
            userId: participant.userId,
            name: name || `Usuario ${participant.userId}`,
            job: null,
          });
        });
        (level.subTasks ?? []).forEach(task => {
          (task.meetingParticipants ?? []).forEach(participant => {
            if (!participant.user?.id || map.has(participant.user.id)) return;
            map.set(participant.user.id, {
              userId: participant.user.id,
              name: getProfileName(participant.user),
              job: getJobText(participant.user.profile?.job),
            });
          });
          (task.users?.ACTIVE ?? []).forEach(item => {
            if (!item.user?.id || map.has(item.user.id)) return;
            map.set(item.user.id, {
              userId: item.user.id,
              name: getProfileName(item.user),
              job: getJobText(item.user.profile?.job),
            });
          });
        });
        (level.nextLevel ?? []).forEach(collect);
      };
      collect(query.data);
    });
    return map;
  }, [allCommitments, officeMembersQuery.data?.memberships, stageTreeQueries]);

  const projectReviewGroups = useMemo<ProjectReviewGroup[]>(() => {
    const stageTreeByKey = new Map<string, Level>();
    stageTreeQueries.forEach((query, index) => {
      const stageRef = stageRefs[index];
      if (stageRef && query.data) {
        stageTreeByKey.set(
          `${stageRef.unitId}:${stageRef.projectId}:${stageRef.stageId}`,
          query.data
        );
      }
    });

    return (technicalProjectsQuery.data ?? [])
      .filter(focus => focus.status !== 'INACTIVE')
      .map(focus => {
        const projectCommitments = allCommitments.filter(commitment => {
          if (commitment.projectId === focus.projectId) return true;
          return (commitment.contexts ?? []).some(
            context => context.projectId === focus.projectId
          );
        });

        const stageGroups = activeStageFocus(focus).map(stageFocus => {
          const stageUnitId = stageFocus.unitId || focus.unitId;
          const tree = stageTreeByKey.get(
            `${stageUnitId}:${focus.projectId}:${stageFocus.stageId}`
          );
          const technicalTasks = collectProjectTechnicalTasks(tree, {
            projectId: focus.projectId,
            stageId: stageFocus.stageId,
            stageName: stageFocus.stage.name,
            statusLabel: taskStatusLabel,
          });
          const stageCommitments = projectCommitments.filter(commitment =>
            commitmentMatchesStage(
              commitment,
              focus.projectId,
              stageFocus.stageId
            )
          );
          const memberReviewMap = new Map<
            number | null,
            {
              commitments: ProjectCommitmentReviewItem[];
              unlinkedTasks: ProjectTechnicalTask[];
            }
          >();
          const ensureMember = (userId: number | null) => {
            const current = memberReviewMap.get(userId);
            if (current) return current;
            const next = { commitments: [], unlinkedTasks: [] };
            memberReviewMap.set(userId, next);
            return next;
          };

          stageCommitments.forEach(commitment => {
            const commitmentItem = {
              commitment,
              scopeLevels: commitmentScopeLevels(
                commitment,
                focus.projectId,
                stageFocus.stageId
              ),
              scopeTasks: commitmentScopeTasks(commitment, technicalTasks),
            };
            const memberIds = Array.from(
              new Set([
                ...getCommitmentMemberIds(commitment),
                ...commitmentItem.scopeTasks.flatMap(task =>
                  taskParticipantIds(task)
                ),
              ])
            );
            (memberIds.length ? memberIds : [null]).forEach(memberId => {
              ensureMember(memberId).commitments.push(commitmentItem);
            });
          });

          technicalTasks
            .filter(task => isUnlinkedTechnicalAdvance(task, stageCommitments))
            .forEach(task => {
              const memberIds = taskParticipantIds(task);
              (memberIds.length ? memberIds : [null]).forEach(memberId => {
                ensureMember(memberId).unlinkedTasks.push(task);
              });
            });

          const members = Array.from(memberReviewMap.entries())
            .map(([userId, memberReview]) => {
              const member = userId ? membersById.get(userId) : null;
              return {
                userId,
                name: member?.name || 'Sin responsable',
                job: member?.job || null,
                ...memberReview,
              };
            })
            .sort((first, second) => first.name.localeCompare(second.name));

          return {
            unitId: stageUnitId,
            stageId: stageFocus.stageId,
            stageName: stageFocus.stage.name,
            tasks: technicalTasks,
            members,
          };
        });

        return {
          reviewKey: focus.id || `${focus.unitId}:${focus.projectId}`,
          focus,
          projectId: focus.projectId,
          projectName: getProjectName(focus),
          cui: focus.project.contract?.cui,
          stages: stageGroups,
          commitments: projectCommitments,
        };
      });
  }, [
    allCommitments,
    membersById,
    stageRefs,
    stageTreeQueries,
    technicalProjectsQuery.data,
  ]);

  const filteredProjectReviewGroups = useMemo(
    () =>
      projectReviewGroups
        .filter(
          project =>
            projectFilter === 'all' ||
            String(project.projectId) === projectFilter
        )
        .map(project => ({
          ...project,
          stages: project.stages
            .map(stage => ({
              ...stage,
              members: stage.members
                .filter(
                  member =>
                    memberFilter === 'all' ||
                    String(member.userId ?? 'none') === memberFilter
                )
                .map(member => {
                  const matches = (values: string[]) =>
                    !search ||
                    values
                      .filter(Boolean)
                      .join(' ')
                      .toLowerCase()
                      .includes(search.toLowerCase());
                  return {
                    ...member,
                    commitments: member.commitments.filter(item => {
                      if (
                        statusFilter &&
                        item.commitment.status !== statusFilter
                      )
                        return false;
                      return matches([
                        project.projectName,
                        stage.stageName,
                        member.name,
                        item.commitment.title,
                        getCommitmentKey(item.commitment),
                        ...item.scopeTasks.flatMap(task => [
                          task.title,
                          task.code,
                        ]),
                      ]);
                    }),
                    unlinkedTasks: member.unlinkedTasks.filter(task => {
                      if (statusFilter && task.status !== statusFilter)
                        return false;
                      return matches([
                        project.projectName,
                        stage.stageName,
                        member.name,
                        task.title,
                        task.code,
                        task.statusLabel,
                      ]);
                    }),
                  };
                })
                .filter(
                  member =>
                    member.commitments.length || member.unlinkedTasks.length
                ),
            }))
            .filter(stage => stage.members.length),
        }))
        .filter(project => project.stages.length),
    [memberFilter, projectFilter, projectReviewGroups, search, statusFilter]
  );

  const memberCommitmentGroups = useMemo<MemberCommitmentGroup[]>(() => {
    const members = new Map<
      number,
      {
        userId: number;
        name: string;
        job?: string | null;
        commitments: Commitment[];
      }
    >();
    (officeMembersQuery.data?.memberships ?? []).forEach(membership => {
      members.set(membership.user.id, {
        userId: membership.user.id,
        name: getProfileName(membership.user),
        job:
          getJobText(membership.user.profile?.job) ||
          membership.user.email ||
          null,
        commitments: [],
      });
    });

    allCommitments.forEach(commitment => {
      getCommitmentMemberIds(commitment).forEach(userId => {
        const existing = members.get(userId);
        const assignee = commitment.assignees?.find(
          item => item.user?.id === userId
        )?.user;
        const member = existing ?? {
          userId,
          name: getProfileName(assignee),
          job: getJobText(assignee?.profile?.job),
          commitments: [],
        };
        member.commitments.push(commitment);
        members.set(userId, member);
      });
    });

    return Array.from(members.values())
      .map(member => {
        const commitments = member.commitments
          .filter(commitment => {
            if (statusFilter && commitment.status !== statusFilter)
              return false;
            if (completedMode === 'hidden' && commitment.status === 'DONE') {
              return false;
            }
            if (
              completedMode === 'recent' &&
              commitment.status === 'DONE' &&
              !isRecentCompleted(commitment)
            ) {
              return false;
            }
            if (commitment.status === 'CANCELLED' && !statusFilter)
              return false;
            if (search) {
              const text = [
                member.name,
                member.job,
                commitment.title,
                commitment.description,
                getCommitmentKey(commitment),
                getContextLabel(commitment),
              ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
              if (!text.includes(search.toLowerCase())) return false;
            }
            return true;
          })
          .sort((first, second) => {
            const firstOverdue = isOverdueCommitment(first) ? -1 : 0;
            const secondOverdue = isOverdueCommitment(second) ? -1 : 0;
            if (firstOverdue !== secondOverdue)
              return firstOverdue - secondOverdue;
            return (
              (first.dueDate ? new Date(first.dueDate).getTime() : Infinity) -
              (second.dueDate ? new Date(second.dueDate).getTime() : Infinity)
            );
          });
        return {
          ...member,
          commitments,
          openCount: commitments.filter(commitment =>
            ['PENDING', 'IN_PROGRESS', 'BLOCKED'].includes(commitment.status)
          ).length,
          overdueCount: commitments.filter(isOverdueCommitment).length,
          completedRecentCount: commitments.filter(commitment =>
            isRecentCompleted(commitment)
          ).length,
        };
      })
      .filter(
        member =>
          memberFilter === 'all' || String(member.userId) === memberFilter
      )
      .filter(
        member => showMembersWithoutCommitments || member.commitments.length
      )
      .sort((first, second) => {
        if (first.overdueCount !== second.overdueCount) {
          return second.overdueCount - first.overdueCount;
        }
        if (first.openCount !== second.openCount) {
          return second.openCount - first.openCount;
        }
        return first.name.localeCompare(second.name);
      });
  }, [
    allCommitments,
    completedMode,
    memberFilter,
    officeMembersQuery.data?.memberships,
    search,
    showMembersWithoutCommitments,
    statusFilter,
  ]);

  const unassignedMemberCommitments = useMemo(
    () =>
      allCommitments.filter(commitment => {
        if (getCommitmentMemberIds(commitment).length) return false;
        if (statusFilter && commitment.status !== statusFilter) return false;
        if (completedMode === 'hidden' && commitment.status === 'DONE')
          return false;
        if (
          completedMode === 'recent' &&
          commitment.status === 'DONE' &&
          !isRecentCompleted(commitment)
        ) {
          return false;
        }
        if (commitment.status === 'CANCELLED' && !statusFilter) return false;
        return !search || matchesSearch(commitment, search);
      }),
    [allCommitments, completedMode, search, statusFilter]
  );

  useEffect(() => {
    if (!selectedCommitment) {
      setDetailDraft(null);
      return;
    }
    setDetailDraft(getDetailDraft(selectedCommitment));
  }, [selectedCommitment]);

  const refreshBoard = () => {
    queryClient.invalidateQueries({ queryKey: ['commitment-board'] });
    if (activeMeetingId) {
      queryClient.invalidateQueries({
        queryKey: ['meeting-session-commitments', activeMeetingId],
      });
    }
  };

  const createMutation = useMutation({
    mutationFn: async ({
      unit,
      draft,
    }: {
      unit: CommitmentBoardUnit;
      draft: CreateDraft;
    }) => {
      const commitment = await createCommitment({
        unitId: unit.id,
        projectId: draft.context.projectId,
        meetingId: activeMeetingId,
        title: draft.title.trim(),
        description: draft.comment.trim() || null,
        dueDate: toIsoDate(draft.dueDate),
        contexts: buildCommitmentContexts(unit.id, draft.context),
        assignees: draft.assigneeUserIds.map(userId => ({
          userId,
          role: 'OWNER',
        })),
      });
      if (draft.decision) {
        await reviewCommitment(commitment.id, {
          decision: draft.decision,
          comment: draft.comment.trim() || null,
          meetingId: activeMeetingId,
        });
      }
      return commitment;
    },
    onSuccess: (_data, variables) => {
      setDrafts(current => ({
        ...current,
        [variables.unit.id]: { ...emptyDraft(), isActive: true },
      }));
      refreshBoard();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      commitmentId,
      payload,
    }: {
      commitmentId: string;
      payload: Parameters<typeof updateCommitment>[1];
    }) => updateCommitment(commitmentId, payload),
    onSuccess: refreshBoard,
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: Commitment['status'];
    }) => updateCommitmentStatus(id, status),
    onSuccess: refreshBoard,
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      decision,
      comment,
    }: {
      id: string;
      decision: CommitmentReviewDecision;
      comment?: string | null;
    }) =>
      reviewCommitment(id, { decision, comment, meetingId: activeMeetingId }),
    onSuccess: refreshBoard,
  });

  const reviewCommentMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string | null }) =>
      updateCommitmentReviewComment(id, { comment }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCommitment,
    onSuccess: () => {
      setSelectedCommitmentId(null);
      refreshBoard();
    },
  });

  const setUnitDraft = (unitId: string, patch: Partial<CreateDraft>) => {
    setDrafts(current => ({
      ...current,
      [unitId]: { ...(current[unitId] || emptyDraft()), ...patch },
    }));
  };

  const openProjectDraft = (input: {
    unitId?: string | null;
    projectId: number;
    projectName: string;
    stageId?: number | null;
    stageName?: string | null;
    levelId?: number | null;
    taskId?: number | null;
    title?: string;
    assigneeUserIds?: number[];
  }) => {
    const unit =
      (input.unitId ? unitsById.get(input.unitId) : null) || effectiveUnit;
    if (!unit) return;
    setProjectDraft({
      unit,
      draft: {
        ...emptyDraft(),
        isActive: true,
        title: input.title || '',
        context: {
          projectId: input.projectId,
          stageId: input.stageId ?? null,
          projectName: input.projectName,
          stageName: input.stageName ?? null,
          levelIds: input.levelId ? [input.levelId] : [],
          taskIds: input.taskId ? [input.taskId] : [],
        },
        assigneeUserIds: input.assigneeUserIds ?? [],
      },
    });
  };

  const updateProjectDraft = (patch: Partial<CreateDraft>) => {
    setProjectDraft(current =>
      current ? { ...current, draft: { ...current.draft, ...patch } } : current
    );
  };

  const persistReviewComment = (commitment: Commitment, comment: string) => {
    const latestDecision = commitment.reviews?.[0]?.decision;
    if (!latestDecision) return;
    const persisted =
      autoSavedReviewComments.current[commitment.id] ??
      commitment.reviews?.[0]?.comment ??
      '';
    if (comment === persisted) return;
    if (reviewCommentTimers.current[commitment.id]) {
      window.clearTimeout(reviewCommentTimers.current[commitment.id]);
    }
    autoSavedReviewComments.current[commitment.id] = comment;
    reviewCommentMutation.mutate({
      id: commitment.id,
      comment: comment.trim() || null,
    });
  };

  const scheduleReviewCommentSave = (
    commitment: Commitment,
    comment: string
  ) => {
    const latestDecision = commitment.reviews?.[0]?.decision;
    if (!latestDecision) return;
    const persisted =
      autoSavedReviewComments.current[commitment.id] ??
      commitment.reviews?.[0]?.comment ??
      '';
    if (comment === persisted) return;
    if (reviewCommentTimers.current[commitment.id]) {
      window.clearTimeout(reviewCommentTimers.current[commitment.id]);
    }
    reviewCommentTimers.current[commitment.id] = window.setTimeout(() => {
      persistReviewComment(commitment, comment);
    }, 850);
  };

  useEffect(
    () => () => {
      Object.values(reviewCommentTimers.current).forEach(timer =>
        window.clearTimeout(timer)
      );
    },
    []
  );

  const toggleUnit = (unitId: string) => {
    setExpanded(current => {
      const next = new Set(current);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const filterCommitments = (commitments: Commitment[]) =>
    commitments.filter(commitment => {
      if (search && !matchesSearch(commitment, search)) return false;
      if (statusFilter && commitment.status !== statusFilter) return false;
      const latestDecision = commitment.reviews?.[0]?.decision;
      if (reviewFilter && latestDecision !== reviewFilter) return false;
      return true;
    });

  const confirmDeleteCommitment = (commitment: Commitment) => {
    isOpenAlertConfirm$.setSubject = {
      isOpen: true,
      title: 'Eliminar compromiso',
      description:
        'Esta accion quitara el compromiso del tablero de la unidad.',
      summaryItems: [
        { label: 'Clave', value: getCommitmentKey(commitment) },
        { label: 'Compromiso', value: commitment.title },
      ],
      warningText: 'No se eliminara ninguna tarea o nivel tecnico relacionado.',
      confirmText: 'Eliminar compromiso',
      cancelText: 'Cancelar',
      variant: 'danger',
      onConfirm: () => deleteMutation.mutateAsync(commitment.id),
    };
  };

  const saveDetailDraft = () => {
    if (!selectedCommitment || !detailDraft) return;
    const title = detailDraft.title.trim();
    if (!title) return;

    const current = getDetailDraft(selectedCommitment);
    const payload: Parameters<typeof updateCommitment>[1] = {};
    if (title !== current.title) payload.title = title;
    if (detailDraft.description.trim() !== current.description) {
      payload.description = detailDraft.description.trim() || null;
    }
    const nextDueDate = toIsoDate(detailDraft.dueDate);
    const currentDueDate = selectedCommitment.dueDate
      ? toIsoDate(formatDateInput(selectedCommitment.dueDate))
      : null;
    if (nextDueDate !== currentDueDate) payload.dueDate = nextDueDate;
    if (detailDraft.priority !== current.priority) {
      payload.priority = detailDraft.priority;
    }

    if (Object.keys(payload).length) {
      updateMutation.mutate({
        commitmentId: selectedCommitment.id,
        payload,
      });
    }

    if (detailDraft.status !== current.status) {
      statusMutation.mutate({
        id: selectedCommitment.id,
        status: detailDraft.status,
      });
    }

    const commentChanged = detailDraft.comment.trim() !== current.comment;
    const decisionChanged = detailDraft.decision !== current.decision;
    if (detailDraft.decision && (commentChanged || decisionChanged)) {
      reviewMutation.mutate({
        id: selectedCommitment.id,
        decision: detailDraft.decision,
        comment: detailDraft.comment.trim() || null,
      });
    }
  };

  const renderReviewButtons = (
    commitment: Commitment,
    options?: {
      decision?: '' | CommitmentReviewDecision;
      onDecision?: (decision: CommitmentReviewDecision) => void;
      comment?: string;
      compact?: boolean;
    }
  ) => {
    const latestDecision =
      options?.decision ?? commitment.reviews?.[0]?.decision;
    const comment =
      options?.comment ??
      reviewComments[commitment.id] ??
      commitment.reviews?.[0]?.comment ??
      '';
    return (
      <div className={`cb-reviewCell ${options?.compact ? 'is-compact' : ''}`}>
        <div className="cb-reviewButtons" aria-label="Revision del compromiso">
          {decisionOptions.map(decision => (
            <button
              type="button"
              key={decision}
              className={`cb-reviewButton is-${decision.toLowerCase()} ${
                latestDecision === decision ? 'is-active' : ''
              }`}
              onClick={() => {
                if (options?.onDecision) {
                  options.onDecision(decision);
                  return;
                }
                reviewMutation.mutate({
                  id: commitment.id,
                  decision,
                  comment,
                });
              }}
            >
              {!options?.compact && decision === 'APPROVED' && (
                <CheckCircle2 size={14} />
              )}
              {!options?.compact && decision === 'REJECTED' && (
                <XCircle size={14} />
              )}
              {!options?.compact && decision === 'NOT_APPLICABLE' && (
                <CircleSlash size={14} />
              )}
              {decision === 'NOT_APPLICABLE' && options?.compact
                ? 'N/A'
                : decisionLabel[decision]}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderCommitmentRow = (commitment: Commitment) => (
    <div className="cb-row" key={commitment.id}>
      <span className="cb-key">{getCommitmentKey(commitment)}</span>
      <div className="cb-titleStack">
        <input
          className="cb-titleInput"
          defaultValue={commitment.title}
          onBlur={event => {
            const title = event.target.value.trim();
            if (title && title !== commitment.title) {
              updateMutation.mutate({
                commitmentId: commitment.id,
                payload: { title },
              });
            }
          }}
        />
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <CommitmentContextDialog
            unitId={commitment.unitId}
            value={technicalSelectionFromCommitment(commitment)}
            label={getTechnicalContextSummary(commitment)}
            disabled={updateMutation.isPending}
            onApply={selection =>
              updateMutation.mutate({
                commitmentId: commitment.id,
                payload: {
                  projectId: selection.projectId,
                  contexts: buildCommitmentContexts(
                    commitment.unitId,
                    selection
                  ),
                },
              })
            }
          />
          <CommitmentAssigneePopover
            unitId={commitment.unitId}
            value={getAssigneeUserIds(commitment)}
            fallbackNames={getAssigneeNamesById(commitment)}
            disabled={updateMutation.isPending}
            onApply={userIds =>
              updateMutation.mutate({
                commitmentId: commitment.id,
                payload: {
                  assignees: userIds.map(userId => ({
                    userId,
                    role: 'OWNER',
                  })),
                },
              })
            }
          />
        </div>
      </div>
      {renderReviewButtons(commitment, { compact: true })}
      <textarea
        className="cb-commentTextarea"
        value={
          reviewComments[commitment.id] ??
          commitment.reviews?.[0]?.comment ??
          ''
        }
        rows={5}
        placeholder="Comentario de control"
        onChange={event => {
          const comment = event.target.value;
          setReviewComments(current => ({
            ...current,
            [commitment.id]: comment,
          }));
          scheduleReviewCommentSave(commitment, comment);
        }}
        onBlur={event => persistReviewComment(commitment, event.target.value)}
        onKeyDown={stopNativeUndoPropagation}
      />
      <input
        type="date"
        className="cb-dateInput"
        defaultValue={formatDateInput(commitment.dueDate)}
        onBlur={event => {
          const next = toIsoDate(event.target.value);
          const current = commitment.dueDate
            ? toIsoDate(formatDateInput(commitment.dueDate))
            : null;
          if (next !== current) {
            updateMutation.mutate({
              commitmentId: commitment.id,
              payload: { dueDate: next },
            });
          }
        }}
      />
      <div className="cb-actions">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setSelectedCommitmentId(commitment.id)}
            >
              <Eye />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ver y editar detalle</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              onClick={() => confirmDeleteCommitment(commitment)}
            >
              <Trash2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Eliminar compromiso</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );

  const renderCreateRow = (unit: CommitmentBoardUnit) => {
    const draft = drafts[unit.id] || emptyDraft();
    const isSaving = createMutation.isPending;
    return draft.isActive ? (
      <div className="cb-row cb-createRow is-active">
        <span className="cb-key">Nuevo</span>
        <div className="cb-titleStack">
          <input
            autoFocus
            className="cb-titleInput"
            value={draft.title}
            placeholder="Escribir compromiso y presionar Enter"
            onChange={event =>
              setUnitDraft(unit.id, { title: event.target.value })
            }
            onKeyDown={event => {
              if (event.key === 'Escape') setUnitDraft(unit.id, emptyDraft());
              if (event.key === 'Enter' && draft.title.trim()) {
                event.preventDefault();
                createMutation.mutate({ unit, draft });
              }
            }}
          />
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <CommitmentContextDialog
              unitId={unit.id}
              value={draft.context}
              label={getDraftContextSummary(draft.context)}
              disabled={isSaving}
              onApply={context => setUnitDraft(unit.id, { context })}
            />
            <CommitmentAssigneePopover
              unitId={unit.id}
              value={draft.assigneeUserIds}
              disabled={isSaving}
              onApply={assigneeUserIds =>
                setUnitDraft(unit.id, { assigneeUserIds })
              }
            />
          </div>
        </div>
        <div className="cb-reviewCell">
          <div className="cb-reviewButtons">
            {decisionOptions.map(decision => (
              <button
                type="button"
                key={decision}
                className={`cb-reviewButton is-${decision.toLowerCase()} ${
                  draft.decision === decision ? 'is-active' : ''
                }`}
                onClick={() => setUnitDraft(unit.id, { decision })}
              >
                {decision === 'NOT_APPLICABLE'
                  ? 'N/A'
                  : decisionLabel[decision]}
              </button>
            ))}
          </div>
        </div>
        <textarea
          className="cb-commentTextarea"
          rows={5}
          value={draft.comment}
          placeholder="Comentario de control"
          onChange={event =>
            setUnitDraft(unit.id, { comment: event.target.value })
          }
          onKeyDown={event => {
            stopNativeUndoPropagation(event);
            if (event.key === 'Escape') setUnitDraft(unit.id, emptyDraft());
          }}
        />
        <input
          type="date"
          className="cb-dateInput"
          value={draft.dueDate}
          onChange={event =>
            setUnitDraft(unit.id, { dueDate: event.target.value })
          }
        />
        <div className="cb-actions">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setUnitDraft(unit.id, emptyDraft())}
              >
                <Undo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Deshacer fila nueva</TooltipContent>
          </Tooltip>
          <span className="cb-createHint">
            {isSaving ? 'Guardando...' : 'Enter'}
          </span>
        </div>
      </div>
    ) : (
      <button
        type="button"
        className="cb-addRow"
        onClick={() => setUnitDraft(unit.id, { isActive: true })}
      >
        <Plus size={16} />
        Crear compromiso
      </button>
    );
  };

  const renderUnit = (unit: CommitmentBoardUnit) => {
    const isOpen = expanded.has(unit.id);
    const filtered = filterCommitments(unit.commitments);
    const isGeneral = unit.name.toLowerCase().includes('gerencia general');
    return (
      <section
        className={`cb-unit ${isGeneral ? 'is-general' : ''}`}
        key={unit.id}
        style={{ '--unit-depth': unit.depth } as CSSProperties}
      >
        <header className="cb-unitHeader">
          <button type="button" onClick={() => toggleUnit(unit.id)}>
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <div>
            <span>{unit.codemap || unit.type}</span>
            <h2>{unit.name}</h2>
          </div>
          <div className="cb-counters">
            <b>{unit.metrics.pending}</b>
            <small>Pendientes</small>
            <b>{unit.metrics.inProgress}</b>
            <small>En proceso</small>
            <b>{unit.metrics.overdue}</b>
            <small>Vencidos</small>
          </div>
        </header>

        {isOpen && (
          <div className="cb-unitBody">
            <div className="cb-tableHeader">
              <span>Clave</span>
              <span>Compromiso / Contexto</span>
              <span>Revision (apto)</span>
              <span>Comentarios de control (vista amplia)</span>
              <span>Fecha limite</span>
              <span>Acciones</span>
            </div>
            {filtered.map(renderCommitmentRow)}
            {!filtered.length && (
              <p className="cb-empty">
                No hay compromisos visibles en esta unidad.
              </p>
            )}
            {renderCreateRow(unit)}
          </div>
        )}

        {isOpen && unit.children.map(renderUnit)}
      </section>
    );
  };

  const toggleProject = (projectKey: string) => {
    setExpandedProjects(current => {
      const next = new Set(current);
      if (next.has(projectKey)) next.delete(projectKey);
      else next.add(projectKey);
      return next;
    });
  };

  const toggleMember = (key: string) => {
    setExpandedMembers(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openMemberDraft = (input?: {
    userId?: number;
    memberName?: string;
  }) => {
    const unit =
      unitsById.get(effectiveUnitId) || visibleUnits[0] || effectiveUnit;
    if (!unit) return;
    setMemberDraft({
      unit,
      memberName: input?.memberName,
      draft: {
        ...emptyDraft(),
        assigneeUserIds: input?.userId ? [input.userId] : [],
      },
    });
  };

  const updateMemberDraft = (patch: Partial<CreateDraft>) => {
    setMemberDraft(current =>
      current ? { ...current, draft: { ...current.draft, ...patch } } : current
    );
  };

  const renderMemberCommitmentItem = (commitment: Commitment) => (
    <div className="cb-memberCommitmentItem" key={commitment.id}>
      <span className="cb-taskCode">{getCommitmentKey(commitment)}</span>
      <div className="cb-taskMain">
        <b>{commitment.title}</b>
        <small>
          {getContextLabel(commitment)}
          {commitment.reviews?.[0]?.comment
            ? ` · ${commitment.reviews[0].comment}`
            : ''}
        </small>
      </div>
      <div className="cb-memberCommitmentReview">
        {renderReviewButtons(commitment, { compact: true })}
      </div>
      <span
        className={`cb-memberDue ${
          isOverdueCommitment(commitment) ? 'is-overdue' : ''
        }`}
      >
        {commitment.dueDate
          ? new Intl.DateTimeFormat('es-PE', {
              day: '2-digit',
              month: 'short',
            }).format(new Date(commitment.dueDate))
          : 'Sin fecha'}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setSelectedCommitmentId(commitment.id)}
          >
            <Eye />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ver detalle</TooltipContent>
      </Tooltip>
    </div>
  );

  const renderMembersCommitmentsView = () => {
    if (!effectiveUnitId) {
      return (
        <div className="cb-emptyBoard">
          <Clock size={22} />
          Selecciona una unidad para ver sus miembros y compromisos.
        </div>
      );
    }

    if (officeMembersQuery.isLoading) return <LoaderForComponent />;

    if (officeMembersQuery.isError) {
      return (
        <div className="cb-error">
          <AlertCircle size={18} />
          No se pudieron cargar los miembros de esta oficina.
        </div>
      );
    }

    const openCount = memberCommitmentGroups.reduce(
      (total, member) => total + member.openCount,
      0
    );
    const overdueCount = memberCommitmentGroups.reduce(
      (total, member) => total + member.overdueCount,
      0
    );
    const completedRecentCount = memberCommitmentGroups.reduce(
      (total, member) => total + member.completedRecentCount,
      0
    );

    return (
      <section className="cb-membersReview">
        <div className="cb-projectReviewSummary">
          <span>
            <UsersRound size={15} />
            {memberCommitmentGroups.length} miembros
          </span>
          <span>
            <ListChecks size={15} />
            {openCount} abiertos
          </span>
          <span>
            <AlertCircle size={15} />
            {overdueCount} vencidos
          </span>
          <span>
            <CheckCircle2 size={15} />
            {completedRecentCount} cumplidos recientes
          </span>
          {unassignedMemberCommitments.length > 0 && (
            <span>
              <UserRound size={15} />
              {unassignedMemberCommitments.length} sin responsable
            </span>
          )}
        </div>

        <div className="cb-memberCommitmentList">
          {memberCommitmentGroups.map(member => {
            const memberKey = `commitments-${member.userId}`;
            const isOpen =
              expandedMembers.has(memberKey) ||
              memberFilter !== 'all' ||
              Boolean(search);
            const openCommitments = member.commitments.filter(
              commitment => commitment.status !== 'DONE'
            );
            const completedCommitments = member.commitments.filter(
              commitment => commitment.status === 'DONE'
            );
            return (
              <article className="cb-memberCard" key={member.userId}>
                <header className="cb-memberCommitmentHeader">
                  <button
                    type="button"
                    className="cb-memberHeader"
                    onClick={() => toggleMember(memberKey)}
                  >
                    {isOpen ? (
                      <ChevronDown size={15} />
                    ) : (
                      <ChevronRight size={15} />
                    )}
                    <span className="cb-memberAvatar">
                      <UserRound size={14} />
                    </span>
                    <span className="cb-memberName">
                      <b>{member.name}</b>
                      <small>{member.job || 'Miembro de la oficina'}</small>
                    </span>
                    <span className="cb-memberCounters">
                      <Badge variant="outline">
                        {member.openCount} abiertos
                      </Badge>
                      {member.overdueCount > 0 && (
                        <Badge variant="danger">
                          {member.overdueCount} vencidos
                        </Badge>
                      )}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      openMemberDraft({
                        userId: member.userId,
                        memberName: member.name,
                      })
                    }
                  >
                    <Plus size={14} />
                    Compromiso
                  </Button>
                </header>

                {isOpen && (
                  <div className="cb-memberCommitmentBody">
                    {!!openCommitments.length && (
                      <div className="cb-taskList">
                        {openCommitments.map(renderMemberCommitmentItem)}
                      </div>
                    )}
                    {!!completedCommitments.length && (
                      <details className="cb-completedBlock">
                        <summary>
                          Cumplidos{' '}
                          {completedMode === 'recent' ? 'recientes' : ''} (
                          {completedCommitments.length})
                        </summary>
                        <div className="cb-taskList">
                          {completedCommitments.map(renderMemberCommitmentItem)}
                        </div>
                      </details>
                    )}
                    {!member.commitments.length && (
                      <p className="cb-empty">Sin compromisos visibles.</p>
                    )}
                  </div>
                )}
              </article>
            );
          })}

          {!!unassignedMemberCommitments.length && memberFilter === 'all' && (
            <article className="cb-memberCard cb-unassignedGroup">
              <header className="cb-memberCommitmentHeader">
                <button
                  type="button"
                  className="cb-memberHeader"
                  onClick={() => toggleMember('commitments-unassigned')}
                >
                  {expandedMembers.has('commitments-unassigned') ? (
                    <ChevronDown size={15} />
                  ) : (
                    <ChevronRight size={15} />
                  )}
                  <span className="cb-memberAvatar">
                    <UserRound size={14} />
                  </span>
                  <span className="cb-memberName">
                    <b>Sin responsable</b>
                    <small>Acuerdos pendientes de asignacion</small>
                  </span>
                  <Badge variant="outline">
                    {unassignedMemberCommitments.length} compromisos
                  </Badge>
                </button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openMemberDraft()}
                >
                  <Plus size={14} />
                  Asignar
                </Button>
              </header>
              {expandedMembers.has('commitments-unassigned') && (
                <div className="cb-memberCommitmentBody cb-taskList">
                  {unassignedMemberCommitments.map(renderMemberCommitmentItem)}
                </div>
              )}
            </article>
          )}
        </div>

        {!memberCommitmentGroups.length &&
          !unassignedMemberCommitments.length && (
            <div className="cb-emptyBoard">
              <UsersRound size={22} />
              No hay compromisos visibles con los filtros actuales.
            </div>
          )}
      </section>
    );
  };

  const renderProjectTechnicalTask = ({
    task,
    project,
    stage,
    memberId,
    allowCommitmentCreate,
  }: {
    task: ProjectTechnicalTask;
    project: ProjectReviewGroup;
    stage: ProjectStageReviewGroup;
    memberId: number | null;
    allowCommitmentCreate: boolean;
  }) => {
    const participation = memberId
      ? task.participants.find(item => item.userId === memberId)
      : null;
    const participationLabel = participation
      ? participation.isPrimary
        ? participation.percentage
          ? `Principal · ${participation.percentage}%`
          : 'Responsable principal'
        : participation.percentage
        ? `Compartida · ${participation.percentage}%`
        : 'Participación compartida'
      : null;

    return (
      <div className="cb-taskRow" key={task.id}>
        <span className="cb-taskCode">{task.code}</span>
        <div className="cb-taskMain">
          <b>{task.title}</b>
          <small>
            Tarea técnica · {task.statusLabel}
            {participationLabel ? ` · ${participationLabel}` : ''}
          </small>
        </div>
        {typeof task.percentage === 'number' && (
          <span className="cb-taskProgress">
            {Math.round(task.percentage)}%
          </span>
        )}
        {allowCommitmentCreate ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              openProjectDraft({
                unitId: stage.unitId,
                projectId: project.projectId,
                projectName: project.projectName,
                stageId: stage.stageId,
                stageName: stage.stageName,
                levelId: task.levelId,
                taskId: task.taskId,
                title: `Avanzar ${task.title}`,
                assigneeUserIds: memberId ? [memberId] : [],
              })
            }
          >
            <Plus size={14} />
            Compromiso
          </Button>
        ) : (
          <span />
        )}
      </div>
    );
  };

  const renderProjectsMembersView = () => {
    const isLoading =
      technicalProjectsQuery.isLoading ||
      stageTreeQueries.some(query => query.isLoading);
    const hasError =
      technicalProjectsQuery.isError ||
      stageTreeQueries.some(query => query.isError);

    if (!effectiveUnitId) {
      return (
        <div className="cb-emptyBoard">
          <Clock size={22} />
          Selecciona una unidad para ver proyectos y miembros.
        </div>
      );
    }

    if (isLoading) return <LoaderForComponent />;

    if (hasError) {
      return (
        <div className="cb-error">
          <AlertCircle size={18} />
          No se pudieron cargar proyectos, etapas o tareas tecnicas.
        </div>
      );
    }

    return (
      <section className="cb-projectReview">
        <div className="cb-projectReviewSummary">
          <span>
            <FolderGit2 size={15} />
            {projectReviewGroups.length} proyectos activos
          </span>
          <span>
            <UsersRound size={15} />
            {membersById.size} miembros detectados
          </span>
          <span>
            <ListChecks size={15} />
            {projectReviewGroups.reduce(
              (total, project) =>
                total +
                project.stages.reduce(
                  (stageTotal, stage) => stageTotal + stage.tasks.length,
                  0
                ),
              0
            )}{' '}
            tareas técnicas
          </span>
        </div>

        <div className="cb-projectList">
          {filteredProjectReviewGroups.map(project => {
            const isProjectOpen =
              expandedProjects.has(project.reviewKey) ||
              projectFilter !== 'all' ||
              memberFilter !== 'all' ||
              Boolean(search);
            const taskCount = project.stages.reduce(
              (total, stage) => total + stage.tasks.length,
              0
            );
            const memberCount = new Set(
              project.stages.flatMap(stage =>
                stage.members.flatMap(member =>
                  member.userId ? [member.userId] : []
                )
              )
            ).size;

            return (
              <article className="cb-projectCard" key={project.reviewKey}>
                <header className="cb-projectHeader">
                  <button
                    type="button"
                    className="cb-projectToggle"
                    onClick={() => toggleProject(project.reviewKey)}
                  >
                    {isProjectOpen ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </button>
                  <div className="cb-projectTitle">
                    <span>
                      {project.cui ? `CUI ${project.cui}` : 'Proyecto'}
                    </span>
                    <h3>{project.projectName}</h3>
                  </div>
                  <div className="cb-projectMeta">
                    <Badge variant="outline">
                      {project.stages.length} etapas
                    </Badge>
                    <Badge variant="secondary">{memberCount} miembros</Badge>
                    <Badge variant="info">{taskCount} items</Badge>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      openProjectDraft({
                        unitId: project.focus.unitId,
                        projectId: project.projectId,
                        projectName: project.projectName,
                        title: '',
                      })
                    }
                  >
                    <Plus size={14} />
                    Compromiso
                  </Button>
                </header>

                {isProjectOpen && (
                  <div className="cb-stageList">
                    {project.stages.map(stage => (
                      <section
                        className="cb-stageCard"
                        key={`${project.reviewKey}-${stage.stageId}`}
                      >
                        <div className="cb-stageHeader">
                          <div>
                            <span>Etapa activa</span>
                            <h4>{stage.stageName}</h4>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openProjectDraft({
                                unitId: stage.unitId,
                                projectId: project.projectId,
                                projectName: project.projectName,
                                stageId: stage.stageId,
                                stageName: stage.stageName,
                              })
                            }
                          >
                            <Plus size={14} />
                            Por etapa
                          </Button>
                        </div>

                        <div className="cb-memberList">
                          {stage.members.map(member => {
                            const memberKey = `${project.reviewKey}-${
                              stage.stageId
                            }-${member.userId ?? 'none'}`;
                            const isMemberOpen =
                              expandedMembers.has(memberKey) ||
                              memberFilter !== 'all' ||
                              Boolean(search);
                            return (
                              <section
                                className="cb-memberCard"
                                key={memberKey}
                              >
                                <button
                                  type="button"
                                  className="cb-memberHeader"
                                  onClick={() => toggleMember(memberKey)}
                                >
                                  {isMemberOpen ? (
                                    <ChevronDown size={15} />
                                  ) : (
                                    <ChevronRight size={15} />
                                  )}
                                  <span className="cb-memberAvatar">
                                    <UserRound size={14} />
                                  </span>
                                  <span className="cb-memberName">
                                    <b>{member.name}</b>
                                    <small>
                                      {member.job || 'Miembro del proyecto'}
                                    </small>
                                  </span>
                                  <Badge variant="outline">
                                    {member.commitments.length} compromisos
                                  </Badge>
                                  <Badge variant="secondary">
                                    {member.unlinkedTasks.length} avances
                                  </Badge>
                                </button>

                                {isMemberOpen && (
                                  <div className="cb-memberWorkBody">
                                    {!!member.commitments.length && (
                                      <div className="cb-linkedCommitmentList">
                                        {member.commitments.map(item => {
                                          const commitmentKey = `scope-${
                                            project.reviewKey
                                          }-${stage.stageId}-${
                                            member.userId ?? 'none'
                                          }-${item.commitment.id}`;
                                          const isCommitmentOpen =
                                            expandedMembers.has(
                                              commitmentKey
                                            ) || Boolean(search);
                                          return (
                                            <section
                                              className="cb-linkedCommitment"
                                              key={item.commitment.id}
                                            >
                                              <div className="cb-linkedCommitmentHeader">
                                                <button
                                                  type="button"
                                                  className="cb-linkedCommitmentToggle"
                                                  onClick={() =>
                                                    toggleMember(commitmentKey)
                                                  }
                                                >
                                                  {isCommitmentOpen ? (
                                                    <ChevronDown size={15} />
                                                  ) : (
                                                    <ChevronRight size={15} />
                                                  )}
                                                  <span className="cb-taskCode">
                                                    {getCommitmentKey(
                                                      item.commitment
                                                    )}
                                                  </span>
                                                  <span className="cb-taskMain">
                                                    <b>
                                                      {item.commitment.title}
                                                    </b>
                                                    <small>
                                                      Compromiso ·{' '}
                                                      {
                                                        statusLabel[
                                                          item.commitment.status
                                                        ]
                                                      }
                                                      {item.scopeLevels.length
                                                        ? ` · ${item.scopeLevels.length} niveles`
                                                        : ''}
                                                      {item.scopeTasks.length
                                                        ? ` · ${item.scopeTasks.length} tareas vinculadas`
                                                        : ' · Sin tareas técnicas vinculadas'}
                                                    </small>
                                                  </span>
                                                </button>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon-sm"
                                                  onClick={() =>
                                                    setSelectedCommitmentId(
                                                      item.commitment.id
                                                    )
                                                  }
                                                  aria-label={`Ver ${item.commitment.title}`}
                                                >
                                                  <Eye size={15} />
                                                </Button>
                                              </div>
                                              {isCommitmentOpen && (
                                                <div className="cb-linkedCommitmentScope">
                                                  {!!item.scopeLevels
                                                    .length && (
                                                    <div className="cb-scopeLevels">
                                                      <span>
                                                        Niveles vinculados
                                                      </span>
                                                      <div>
                                                        {item.scopeLevels.map(
                                                          level => (
                                                            <Badge
                                                              key={level.id}
                                                              variant="outline"
                                                            >
                                                              {level.label}
                                                            </Badge>
                                                          )
                                                        )}
                                                      </div>
                                                    </div>
                                                  )}
                                                  {item.scopeTasks.length ? (
                                                    item.scopeTasks.map(task =>
                                                      renderProjectTechnicalTask(
                                                        {
                                                          task,
                                                          project,
                                                          stage,
                                                          memberId:
                                                            member.userId,
                                                          allowCommitmentCreate:
                                                            false,
                                                        }
                                                      )
                                                    )
                                                  ) : (
                                                    <p className="cb-empty">
                                                      Este compromiso no tiene
                                                      niveles o tareas técnicas
                                                      vinculadas.
                                                    </p>
                                                  )}
                                                </div>
                                              )}
                                            </section>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {!!member.unlinkedTasks.length && (
                                      <details
                                        className="cb-unlinkedAdvances"
                                        open
                                      >
                                        <summary>
                                          Avances técnicos sin compromiso
                                          vinculado (
                                          {member.unlinkedTasks.length})
                                        </summary>
                                        <div className="cb-taskList">
                                          {member.unlinkedTasks.map(task =>
                                            renderProjectTechnicalTask({
                                              task,
                                              project,
                                              stage,
                                              memberId: member.userId,
                                              allowCommitmentCreate: true,
                                            })
                                          )}
                                        </div>
                                      </details>
                                    )}
                                  </div>
                                )}
                              </section>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {!filteredProjectReviewGroups.length && (
          <div className="cb-emptyBoard">
            <BriefcaseBusiness size={22} />
            No hay proyectos, etapas o tareas visibles con los filtros actuales.
          </div>
        )}
      </section>
    );
  };

  return (
    <TooltipProvider>
      <main className={`cb-page ${embedded ? 'is-embedded' : ''}`}>
        {!embedded && (
          <header className="cb-header">
            <div>
              <span>Oficinas y reuniones</span>
              <h1>Compromisos por Gerencia General</h1>
            </div>
            <AppButton
              type="button"
              size="lg"
              onClick={() => {
                const firstUnit = visibleUnits[0];
                if (firstUnit) setUnitDraft(firstUnit.id, { isActive: true });
              }}
            >
              <Plus size={16} />
              Nuevo compromiso
            </AppButton>
          </header>
        )}

        {!hideViewTabs && (
          <div className="cb-viewTabs">
            <button
              type="button"
              className={viewMode === 'units' ? 'is-active' : ''}
              onClick={() => setViewMode('units')}
            >
              <ListChecks size={15} />
              Unidades
            </button>
            <button
              type="button"
              className={viewMode === 'projectsMembers' ? 'is-active' : ''}
              onClick={() => setViewMode('projectsMembers')}
            >
              <FolderGit2 size={15} />
              Proyectos + miembros
            </button>
            <button
              type="button"
              className={viewMode === 'membersCommitments' ? 'is-active' : ''}
              onClick={() => setViewMode('membersCommitments')}
            >
              <UsersRound size={15} />
              Miembros + compromisos
            </button>
          </div>
        )}

        <section className="cb-toolbar">
          <label className="cb-search">
            <Search size={16} />
            <AppInput
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={
                viewMode === 'projectsMembers'
                  ? 'Buscar proyecto, etapa, miembro o tarea...'
                  : viewMode === 'membersCommitments'
                  ? 'Buscar compromiso o miembro...'
                  : 'Buscar compromiso...'
              }
            />
          </label>
          {viewMode === 'projectsMembers' && (
            <>
              <select
                value={projectFilter}
                onChange={event => setProjectFilter(event.target.value)}
              >
                <option value="all">Todos los proyectos</option>
                {projectReviewGroups.map(project => (
                  <option key={project.reviewKey} value={project.projectId}>
                    {project.projectName}
                  </option>
                ))}
              </select>
              <select
                value={memberFilter}
                onChange={event => setMemberFilter(event.target.value)}
              >
                <option value="all">Todos los miembros</option>
                {Array.from(membersById.values())
                  .sort((first, second) =>
                    first.name.localeCompare(second.name)
                  )
                  .map(member => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                <option value="none">Sin responsable</option>
              </select>
            </>
          )}
          {viewMode === 'membersCommitments' && (
            <>
              <select
                value={memberFilter}
                onChange={event => setMemberFilter(event.target.value)}
              >
                <option value="all">Todos los miembros</option>
                {Array.from(membersById.values())
                  .sort((first, second) =>
                    first.name.localeCompare(second.name)
                  )
                  .map(member => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
              </select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Ajustes de la vista de miembros"
                  >
                    <Settings2 />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="cb-viewSettings" align="end">
                  <strong>Ajustes de vista</strong>
                  <label>
                    <span>Compromisos cumplidos</span>
                    <select
                      value={completedMode}
                      onChange={event =>
                        setCompletedMode(event.target.value as CompletedMode)
                      }
                    >
                      <option value="recent">Ultimos 30 dias</option>
                      <option value="all">Todo el historico</option>
                      <option value="hidden">Ocultar cumplidos</option>
                    </select>
                  </label>
                  <label className="cb-viewSettingsCheck">
                    <input
                      type="checkbox"
                      checked={showMembersWithoutCommitments}
                      onChange={event =>
                        setShowMembersWithoutCommitments(event.target.checked)
                      }
                    />
                    Incluir miembros sin compromisos
                  </label>
                </PopoverContent>
              </Popover>
            </>
          )}
          {viewMode === 'units' && (
            <select
              value={reviewFilter}
              onChange={event => setReviewFilter(event.target.value)}
            >
              <option value="">Todas las revisiones</option>
              {decisionOptions.map(decision => (
                <option key={decision} value={decision}>
                  {decisionLabel[decision]}
                </option>
              ))}
            </select>
          )}
          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
          >
            <option value="">Todos los estados</option>
            {viewMode === 'projectsMembers' && (
              <>
                <option value="UNRESOLVED">Sin resolver</option>
                <option value="PROCESS">En proceso tecnico</option>
                <option value="INREVIEW">En revision tecnica</option>
                <option value="DENIED">Observado</option>
              </>
            )}
            {Object.entries(statusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <span className="cb-toolbarMeta">
            {viewMode === 'projectsMembers' ? (
              <Filter size={15} />
            ) : viewMode === 'membersCommitments' ? (
              <UsersRound size={15} />
            ) : (
              <ListChecks size={15} />
            )}
            {viewMode === 'projectsMembers'
              ? 'Vista proyectos'
              : viewMode === 'membersCommitments'
              ? 'Vista miembros'
              : 'Vista arbol'}
          </span>
        </section>

        {boardQuery.isLoading && viewMode === 'units' && <LoaderForComponent />}
        {boardQuery.isError && viewMode === 'units' && (
          <div className="cb-error">
            <AlertCircle size={18} />
            No se pudo cargar el tablero de compromisos.
          </div>
        )}
        {viewMode === 'units' ? (
          <section className="cb-board">
            {visibleUnits.map(renderUnit)}
            {!visibleUnits.length && !boardQuery.isLoading && (
              <div className="cb-emptyBoard">
                <Clock size={22} />
                No hay unidades activas para mostrar.
              </div>
            )}
          </section>
        ) : viewMode === 'projectsMembers' ? (
          renderProjectsMembersView()
        ) : (
          renderMembersCommitmentsView()
        )}
        {!embedded && (
          <footer className="cb-footerNote">
            <CalendarDays size={15} />
            Revisions tecnicas y valorizaciones quedan fuera de esta primera
            version.
          </footer>
        )}
        <Sheet
          open={!!memberDraft}
          onOpenChange={open => {
            if (!open) setMemberDraft(null);
          }}
        >
          <SheetContent className="cb-detailSheet">
            <SheetHeader>
              <SheetDescription>Nuevo compromiso de oficina</SheetDescription>
              <SheetTitle>
                {memberDraft?.memberName || 'Asignar compromiso'}
              </SheetTitle>
            </SheetHeader>

            {memberDraft && (
              <div className="cb-detailContent">
                <div className="cb-detailHero">
                  <Badge variant="info">{memberDraft.unit.name}</Badge>
                  <Badge variant="outline">Contexto de oficina</Badge>
                </div>

                <label className="cb-detailField">
                  <span>Compromiso</span>
                  <Input
                    autoFocus
                    value={memberDraft.draft.title}
                    placeholder="Ej. Consolidar requerimientos de julio"
                    onChange={event =>
                      updateMemberDraft({ title: event.target.value })
                    }
                  />
                </label>

                <label className="cb-detailField">
                  <span>Comentario inicial</span>
                  <Textarea
                    value={memberDraft.draft.comment}
                    rows={4}
                    placeholder="Acuerdo, criterio de cumplimiento o comentario de control..."
                    onKeyDown={stopNativeUndoPropagation}
                    onChange={event =>
                      updateMemberDraft({ comment: event.target.value })
                    }
                  />
                </label>

                <div className="cb-detailGrid">
                  <label className="cb-detailField">
                    <span>Fecha limite</span>
                    <Input
                      type="date"
                      value={memberDraft.draft.dueDate}
                      onChange={event =>
                        updateMemberDraft({ dueDate: event.target.value })
                      }
                    />
                  </label>

                  <label className="cb-detailField">
                    <span>Revision inicial</span>
                    <Select
                      value={memberDraft.draft.decision || 'NONE'}
                      onValueChange={value =>
                        updateMemberDraft({
                          decision:
                            value === 'NONE'
                              ? ''
                              : (value as CommitmentReviewDecision),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Sin revision</SelectItem>
                        {decisionOptions.map(decision => (
                          <SelectItem key={decision} value={decision}>
                            {decisionLabel[decision]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                </div>

                <Separator />

                <section className="cb-detailSection">
                  <span>Responsables</span>
                  <CommitmentAssigneePopover
                    unitId={memberDraft.unit.id}
                    value={memberDraft.draft.assigneeUserIds}
                    disabled={createMutation.isPending}
                    onApply={assigneeUserIds =>
                      updateMemberDraft({ assigneeUserIds })
                    }
                  />
                </section>
              </div>
            )}

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMemberDraft(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={
                  !memberDraft?.draft.title.trim() || createMutation.isPending
                }
                onClick={async () => {
                  if (!memberDraft?.draft.title.trim()) return;
                  await createMutation.mutateAsync(memberDraft);
                  setMemberDraft(null);
                }}
              >
                <Plus size={15} />
                Crear compromiso
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Sheet
          open={!!projectDraft}
          onOpenChange={open => {
            if (!open) setProjectDraft(null);
          }}
        >
          <SheetContent className="cb-detailSheet">
            <SheetHeader>
              <SheetDescription>Nuevo compromiso operativo</SheetDescription>
              <SheetTitle>Proyectos + miembros</SheetTitle>
            </SheetHeader>

            {projectDraft && (
              <div className="cb-detailContent">
                <div className="cb-detailHero">
                  <Badge variant="info">
                    {projectDraft.draft.context.projectName || 'Proyecto'}
                  </Badge>
                  {projectDraft.draft.context.stageName && (
                    <Badge variant="outline">
                      {projectDraft.draft.context.stageName}
                    </Badge>
                  )}
                </div>

                <label className="cb-detailField">
                  <span>Compromiso</span>
                  <Input
                    autoFocus
                    value={projectDraft.draft.title}
                    placeholder="Ej. Levantar observaciones de planos"
                    onChange={event =>
                      updateProjectDraft({ title: event.target.value })
                    }
                  />
                </label>

                <label className="cb-detailField">
                  <span>Comentario inicial</span>
                  <Textarea
                    value={projectDraft.draft.comment}
                    rows={4}
                    placeholder="Acuerdo, criterio de cumplimiento o comentario de control..."
                    onKeyDown={stopNativeUndoPropagation}
                    onChange={event =>
                      updateProjectDraft({ comment: event.target.value })
                    }
                  />
                </label>

                <div className="cb-detailGrid">
                  <label className="cb-detailField">
                    <span>Fecha limite</span>
                    <Input
                      type="date"
                      value={projectDraft.draft.dueDate}
                      onChange={event =>
                        updateProjectDraft({ dueDate: event.target.value })
                      }
                    />
                  </label>

                  <label className="cb-detailField">
                    <span>Revision inicial</span>
                    <Select
                      value={projectDraft.draft.decision || 'NONE'}
                      onValueChange={value =>
                        updateProjectDraft({
                          decision:
                            value === 'NONE'
                              ? ''
                              : (value as CommitmentReviewDecision),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Sin revision</SelectItem>
                        {decisionOptions.map(decision => (
                          <SelectItem key={decision} value={decision}>
                            {decisionLabel[decision]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                </div>

                <Separator />

                <section className="cb-detailSection">
                  <span>Contexto tecnico</span>
                  <CommitmentContextDialog
                    unitId={projectDraft.unit.id}
                    value={projectDraft.draft.context}
                    label={getDraftContextSummary(projectDraft.draft.context)}
                    disabled={createMutation.isPending}
                    onApply={context => updateProjectDraft({ context })}
                  />
                </section>

                <section className="cb-detailSection">
                  <span>Responsables</span>
                  <CommitmentAssigneePopover
                    unitId={projectDraft.unit.id}
                    value={projectDraft.draft.assigneeUserIds}
                    disabled={createMutation.isPending}
                    onApply={assigneeUserIds =>
                      updateProjectDraft({ assigneeUserIds })
                    }
                  />
                </section>
              </div>
            )}

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setProjectDraft(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={
                  !projectDraft?.draft.title.trim() || createMutation.isPending
                }
                onClick={async () => {
                  if (!projectDraft?.draft.title.trim()) return;
                  await createMutation.mutateAsync(projectDraft);
                  setProjectDraft(null);
                }}
              >
                <Plus size={15} />
                Crear compromiso
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Sheet
          open={!!selectedCommitmentId}
          onOpenChange={open => {
            if (!open) setSelectedCommitmentId(null);
          }}
        >
          <SheetContent className="cb-detailSheet">
            <SheetHeader>
              <SheetDescription>Detalle de compromiso</SheetDescription>
              <SheetTitle>
                {selectedCommitment
                  ? getCommitmentKey(selectedCommitment)
                  : 'Compromiso'}
              </SheetTitle>
            </SheetHeader>

            {selectedCommitment && detailDraft && (
              <div className="cb-detailContent">
                <div className="cb-detailHero">
                  <Badge variant="outline">
                    {getContextBadgeLabel(selectedCommitment)}
                  </Badge>
                  <Badge
                    variant={
                      selectedCommitment.priority === 'URGENT'
                        ? 'danger'
                        : 'info'
                    }
                  >
                    {priorityLabel[selectedCommitment.priority]}
                  </Badge>
                </div>

                <label className="cb-detailField">
                  <span>Compromiso</span>
                  <Input
                    value={detailDraft.title}
                    onChange={event =>
                      setDetailDraft(current =>
                        current
                          ? { ...current, title: event.target.value }
                          : current
                      )
                    }
                  />
                </label>

                <label className="cb-detailField">
                  <span>Descripcion</span>
                  <Textarea
                    value={detailDraft.description}
                    rows={4}
                    placeholder="Agregar descripcion interna..."
                    onKeyDown={stopNativeUndoPropagation}
                    onChange={event =>
                      setDetailDraft(current =>
                        current
                          ? { ...current, description: event.target.value }
                          : current
                      )
                    }
                  />
                </label>

                <div className="cb-detailGrid">
                  <label className="cb-detailField">
                    <span>Fecha limite</span>
                    <Input
                      type="date"
                      value={detailDraft.dueDate}
                      onChange={event =>
                        setDetailDraft(current =>
                          current
                            ? { ...current, dueDate: event.target.value }
                            : current
                        )
                      }
                    />
                  </label>

                  <label className="cb-detailField">
                    <span>Estado</span>
                    <Select
                      value={detailDraft.status}
                      onValueChange={value =>
                        setDetailDraft(current =>
                          current
                            ? {
                                ...current,
                                status: value as Commitment['status'],
                              }
                            : current
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabel).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                </div>

                <label className="cb-detailField">
                  <span>Prioridad</span>
                  <Select
                    value={detailDraft.priority}
                    onValueChange={value =>
                      setDetailDraft(current =>
                        current
                          ? {
                              ...current,
                              priority: value as Commitment['priority'],
                            }
                          : current
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabel).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <Separator />

                <section className="cb-detailSection">
                  <div className="cb-detailSectionHeader">
                    <span>Revision</span>
                    {renderReviewButtons(selectedCommitment, {
                      compact: true,
                      decision: detailDraft.decision,
                      comment: detailDraft.comment,
                      onDecision: decision =>
                        setDetailDraft(current =>
                          current ? { ...current, decision } : current
                        ),
                    })}
                  </div>
                  <Textarea
                    value={detailDraft.comment}
                    rows={6}
                    placeholder="Comentario de revision o control..."
                    onChange={event => {
                      const comment = event.target.value;
                      setDetailDraft(current =>
                        current ? { ...current, comment } : current
                      );
                      setReviewComments(current => ({
                        ...current,
                        [selectedCommitment.id]: comment,
                      }));
                      scheduleReviewCommentSave(selectedCommitment, comment);
                    }}
                    onBlur={event =>
                      persistReviewComment(
                        selectedCommitment,
                        event.target.value
                      )
                    }
                    onKeyDown={stopNativeUndoPropagation}
                  />
                </section>

                <Separator />

                <section className="cb-detailSection">
                  <span>Responsables</span>
                  <p className="cb-detailMuted">
                    <UsersRound size={14} />
                    {getAssigneeText(selectedCommitment)}
                  </p>
                </section>

                <section className="cb-detailSection">
                  <span>Contexto principal</span>
                  <p className="cb-detailMuted">
                    {getContextLabel(selectedCommitment)}
                  </p>
                </section>
              </div>
            )}

            <SheetFooter>
              {selectedCommitment && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => confirmDeleteCommitment(selectedCommitment)}
                >
                  <Trash2 />
                  Eliminar
                </Button>
              )}
              <Button type="button" onClick={saveDetailDraft}>
                Guardar cambios
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </main>
    </TooltipProvider>
  );
};

export default CommitmentsBoardWorkspace;

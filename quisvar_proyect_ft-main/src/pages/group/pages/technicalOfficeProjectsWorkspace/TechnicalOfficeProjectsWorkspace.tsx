import {
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  ClipboardList,
  Copy,
  Crown,
  Download,
  Eye,
  FileText,
  Filter,
  FolderOpen,
  FolderTree,
  ListPlus,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  UploadCloud,
  UserPlus,
  X,
  Users,
} from 'lucide-react';
import type { FileTask, Level, SubTask } from '@/types/types';
import type { RootState } from '@/store/store.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import { URL, axiosInstance } from '@/services/axiosInstance';
import { SocketContext } from '@/context/SocketContex';
import {
  appendTechnicalReviewFiles,
  createTechnicalReviewSubmission,
  createMeeting,
  createStageVersion,
  deleteWorkspaceStage,
  deleteTechnicalTaskFile,
  bulkAddOfficeMembers,
  createTechnicalLevel,
  createTechnicalSiblingLevel,
  createTechnicalSiblingSubtask,
  createTechnicalSubtask,
  createTechnicalCommitment,
  deleteTechnicalLevel,
  deleteTechnicalSubtask,
  duplicateTechnicalLevel,
  duplicateTechnicalSubtask,
  getCommitments,
  getMeeting,
  getMeetingViewConfig,
  getMeetings,
  getMeetingUnitDashboard,
  getOfficeProjectModerators,
  getMeetingUnitTechnicalProjects,
  getMeetingUnitTechnicalStageTree,
  getTechnicalTaskDetail,
  getTechnicalReviewSubmissions,
  getOfficeProjectCandidates,
  getStageVersionSources,
  getOfficeMemberCandidates,
  linkMeetingUnitProjectFocus,
  duplicateWorkspaceStage,
  markStageVersionCurrent,
  previewTechnicalCommitmentAssignment,
  reviewTechnicalLevel,
  reviewTechnicalTask,
  removeOfficeMember,
  deleteMeetingViewConfig,
  reassignTechnicalExecutionTask,
  selfAssignTechnicalExecutionTask,
  sendTechnicalExecutionReview,
  startMeeting,
  updateCommitment,
  updateMeetingUnitProjectFocus,
  updateMeetingViewConfig,
  updateOfficeMember,
  updateTechnicalReviewPercentage,
  updateWorkspaceStage,
  updateTechnicalLevel,
  updateTechnicalSubtask,
  updateTechnicalValuation,
} from '../../services/officeMeetings.service';
import { getMeetingUnitsOverview } from '../../services/meetingUnitProjects.service';
import type {
  Commitment,
  CommitmentReviewDecision,
  OfficeMemberCandidate,
  OfficeProjectModerator,
  OfficeMemberRole,
  OfficeProjectCandidate,
  TechnicalCommitmentAssignmentPayload,
  TechnicalCommitmentPreview,
  TechnicalCommitmentPreviewRow,
  TechnicalPreviewFile,
  TechnicalReviewSubmission,
  TechnicalStageTree,
  MeetingScope,
  MeetingWorkspaceView,
} from '../../types/officeMeetings.types';
import type {
  MeetingProjectFocus,
  MeetingStageOption,
  StageVersionSourceKind,
  StageVersionType,
} from '../../types/meetingUnitProjects.types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import useRole from '@/hooks/useRole';
import {
  handleArchiver,
  handleMergePdfs,
} from '@/pages/specialities/services/projectDocuments.service';
import ProjectTaskWorkspace from '@/pages/specialities/components/projectTaskWorkspace/ProjectTaskWorkspace';
import CommitmentsBoardWorkspace from '../commitmentsBoardWorkspace/CommitmentsBoardWorkspace';
import { OfficeUnitTreeSelect } from '../../components/OfficeUnitTreeSelect';
import BasicResourcesWorkspace from './BasicResourcesWorkspace';

type CommitmentBuckets = {
  byLevel: Map<number, Commitment[]>;
  byTask: Map<number, Commitment[]>;
};

type GlobalRoleOption = {
  id: number;
  name: string;
};

type SelectionState = {
  levelIds: Set<number>;
  taskIds: Set<number>;
};

type FilteredTechnicalTree = {
  level: Level | null;
  matchCount: number;
};

type CommitmentDraft = {
  title: string;
  description: string;
  dueDate: string;
  priority: Commitment['priority'];
  assigneeUserIds: number[];
  reflectAssignment: boolean;
  technicalOwnerId: number | null;
};

type ExecutionSession = {
  taskId: number;
};

type TechnicalExecutionMutationInput = {
  taskId: number;
  percentage: number;
  files?: File[];
  fileType?: 'UPLOADS' | 'MODEL';
};

type TechnicalReviewNode = {
  type: 'LEVEL' | 'TASK';
  id: number;
};

type TechnicalReviewMutationInput = {
  node: TechnicalReviewNode;
  decision: CommitmentReviewDecision;
  comment?: string | null;
  commitmentId?: string | null;
  contextId?: string | null;
  applyToChildren?: boolean;
};

type ValuationDraft = {
  days: string;
};

type SelectedOfficeMemberDraft = {
  user: OfficeMemberCandidate;
  role: OfficeMemberRole;
  canManageUnitProjects: boolean;
  isUnitLead: boolean;
};

type ValuationTotals = {
  days: number;
  amount: number;
  spending: number;
  balance: number;
};

const OFFICE_MEMBER_ROLES: OfficeMemberRole[] = [
  'GERENTE',
  'JEFE',
  'COORDINADOR',
  'ESPECIALISTA',
  'ASISTENTE',
  'APOYO',
];

const officeRoleLabel = (role?: string) =>
  role
    ? role
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/^\w/, letter => letter.toUpperCase())
    : 'Miembro';

const isGeneralManagementUnit = (name?: string | null) =>
  Boolean(name?.toLowerCase().includes('gerencia general'));

type PendingLevelReview = TechnicalReviewMutationInput & {
  levelName: string;
  affectedTasks: number;
};

type CommitmentDetailState = {
  commitment: Commitment;
  node?: TechnicalNodeRef;
};

type TechnicalNodeRef = {
  type: 'LEVEL' | 'TASK';
  id: number;
};

type StructureDraft =
  | {
      kind: 'ROOT_LEVEL';
      stageId: number;
      withTask: boolean;
    }
  | {
      kind: 'EDIT_LEVEL';
      levelId: number;
      depth: number;
      defaultName: string;
    }
  | {
      kind: 'LEVEL_SIBLING';
      levelId: number;
      position: 'upper' | 'lower';
      depth: number;
    }
  | {
      kind: 'LEVEL_CHILD';
      levelId: number;
      stageId: number;
      depth: number;
    }
  | {
      kind: 'SUBTASK_CHILD';
      levelId: number;
      depth: number;
    }
  | {
      kind: 'DUPLICATE_LEVEL';
      levelId: number;
      depth: number;
      defaultName: string;
    }
  | {
      kind: 'EDIT_TASK';
      subtaskId: number;
      depth: number;
      defaultName: string;
    }
  | {
      kind: 'TASK_SIBLING';
      subtaskId: number;
      position: 'upper' | 'lower';
      depth: number;
    }
  | {
      kind: 'DUPLICATE_TASK';
      subtaskId: number;
      depth: number;
      defaultName: string;
    };

type TechnicalAssignmentMode = NonNullable<
  TechnicalCommitmentAssignmentPayload['assignmentMode']
>;

type WorkspaceTab =
  | 'resumen'
  | 'calendario'
  | 'proyectos'
  | 'miembros'
  | 'compromisos';

type WorkspacePhase =
  | 'trabajo-tecnico'
  | 'revision'
  | 'valorizacion'
  | 'basicos';

const workspaceTabs: { value: WorkspaceTab; label: string }[] = [
  { value: 'proyectos', label: 'Proyectos' },
  { value: 'resumen', label: 'Resumen' },
  { value: 'calendario', label: 'Calendario' },
  { value: 'miembros', label: 'Miembros' },
  { value: 'compromisos', label: 'Compromisos' },
];

const normalizeWorkspaceTab = (value?: string | null): WorkspaceTab =>
  workspaceTabs.some(tab => tab.value === value)
    ? (value as WorkspaceTab)
    : 'proyectos';

const workspacePhases: {
  value: WorkspacePhase;
  label: string;
  disabled?: boolean;
}[] = [
  { value: 'trabajo-tecnico', label: 'Trabajo tecnico' },
  { value: 'revision', label: 'Revision' },
  { value: 'valorizacion', label: 'Valorizacion' },
  { value: 'basicos', label: 'Básicos' },
];

const normalizeWorkspacePhase = (value?: string | null): WorkspacePhase => {
  if (value === 'estructura-asignacion' || value === 'ejecucion') {
    return 'trabajo-tecnico';
  }
  return workspacePhases.some(phase => phase.value === value)
    ? (value as WorkspacePhase)
    : 'trabajo-tecnico';
};

const emptySelection = (): SelectionState => ({
  levelIds: new Set(),
  taskIds: new Set(),
});

const defaultDraft = (): CommitmentDraft => ({
  title: '',
  description: '',
  dueDate: '',
  priority: 'NORMAL',
  assigneeUserIds: [],
  reflectAssignment: false,
  technicalOwnerId: null,
});

const taskStatusLabel: Record<string, string> = {
  UNRESOLVED: 'Sin resolver',
  PROCESS: 'En proceso',
  INREVIEW: 'En revision',
  DENIED: 'Observado',
  REVIEWED: 'Revisado',
  DONE: 'Finalizado',
  LIQUIDATION: 'Liquidacion',
};

const previewCategoryLabel: Record<string, string> = {
  ASSIGNABLE: 'Se asignara',
  SAME_ASSIGNEE: 'Ya asignada',
  ASSIGNED_TO_OTHER: 'Asignada a otro',
  REOPENABLE: 'Se reabrira',
  LOCKED: 'Bloqueada',
  NO_ACTION: 'Sin cambio',
};

const previewCategoryVariant = (category?: string) => {
  if (category === 'ASSIGNABLE') return 'success';
  if (category === 'SAME_ASSIGNEE') return 'info';
  if (category === 'REOPENABLE') return 'danger';
  if (category === 'ASSIGNED_TO_OTHER') return 'warning';
  if (category === 'LOCKED') return 'danger';
  return 'outline';
};

const statusVariant = (status?: string) => {
  if (status === 'REVIEWED' || status === 'DONE') return 'success';
  if (status === 'INREVIEW') return 'review';
  if (status === 'DENIED') return 'danger';
  if (status === 'PROCESS') return 'info';
  if (status === 'LIQUIDATION') return 'warning';
  return 'outline';
};

const projectLabel = (focus?: MeetingProjectFocus) =>
  focus?.project.contract?.projectShortName ||
  focus?.project.contract?.projectName ||
  focus?.project.name ||
  'Proyecto sin nombre';

const stageVersionLabel = (stage?: MeetingStageOption | null) => {
  if (!stage) return 'Etapa';
  const version = stage.versionMetadata;
  if (!version) return stage.name;
  return `${stageConceptName(stage)} ${stageVersionOptionLabel(stage)}`;
};

const stageConceptName = (stage?: MeetingStageOption | null) => {
  if (!stage) return 'Etapa';
  return (
    stage.versionMetadata?.group?.baseName ||
    cleanStageVersionBaseName(stage.name)
  );
};

const stageVersionOptionLabel = (stage?: MeetingStageOption | null) => {
  if (!stage) return 'version';
  const version = stage.versionMetadata;
  if (!version) return stage.name;
  const label = version.versionLabel || `v${version.versionNumber}`;
  return version.isCurrent ? `${label} - actual` : label;
};

const stageVersionOriginLabel = (stage?: MeetingStageOption | null) => {
  const version = stage?.versionMetadata;
  if (!version || version.sourceKind !== 'OTHER_PROJECT_STAGE') return null;
  const project =
    version.sourceProject?.contract?.projectShortName ||
    version.sourceProject?.contract?.projectName ||
    version.sourceProject?.name ||
    'otro proyecto';
  const sourceStage = version.sourceStage?.name || 'etapa origen';
  return `Origen externo: ${project} / ${sourceStage}`;
};

const cleanStageVersionBaseName = (name: string) =>
  name.replace(/\s+v\d+$/i, '').trim() || name;

const projectCandidateLabel = (project?: OfficeProjectCandidate) =>
  project?.contract?.projectShortName ||
  project?.contract?.projectName ||
  project?.name ||
  'Proyecto sin nombre';

const focusKey = (focus: MeetingProjectFocus) =>
  focus.id || `${focus.unitId}-${focus.projectId}`;

const activeStageFocus = (focus?: MeetingProjectFocus | null) =>
  (focus?.stageFocus ?? []).filter(
    stageFocus => stageFocus.isCurrent && stageFocus.status !== 'INACTIVE'
  );

const activeFocusStages = (focus?: MeetingProjectFocus | null) =>
  activeStageFocus(focus)
    .map(stageFocus => stageFocus.stage)
    .sort((a, b) => {
      const currentSort =
        Number(b.versionMetadata?.isCurrent || false) -
        Number(a.versionMetadata?.isCurrent || false);
      if (currentSort) return currentSort;
      const versionSort =
        (b.versionMetadata?.versionNumber || 0) -
        (a.versionMetadata?.versionNumber || 0);
      if (versionSort) return versionSort;
      return a.name.localeCompare(b.name);
    });

const displayTitle = (value?: string | null) =>
  (value || 'Oficina')
    .toLocaleLowerCase('es-PE')
    .replace(/(^|\s)(\S)/g, match => match.toLocaleUpperCase('es-PE'));

const formatS10Item = (value?: string | number | null) => {
  const raw = String(value ?? '')
    .trim()
    .replace(/\.+$/g, '');
  if (!raw) return '';
  return raw
    .split('.')
    .filter(Boolean)
    .map(segment =>
      /^\d+$/.test(segment) ? segment.padStart(2, '0') : segment
    )
    .join('.');
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDashboardProjectName = (projectFocus: MeetingProjectFocus) =>
  projectLabel(projectFocus);

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

const buildDefaultMeetingTitle = (unitName: string, scheduledAt: string) => {
  const formatted = formatMeetingDateForTitle(scheduledAt);
  return formatted ? `${unitName} - ${formatted}` : `${unitName} - Reunion`;
};

const formatUserName = (user?: {
  id?: number;
  email?: string | null;
  profile?: {
    firstName?: string;
    lastName?: string;
    job?: unknown;
  } | null;
}) => {
  if (!user) return '';
  const profile = user.profile;
  const fullName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || user.email || (user.id ? `Usuario ${user.id}` : '');
};

const taskAssigneeNames = (task: SubTask) => {
  const users = task.users as unknown;
  if (Array.isArray(users)) {
    return users
      .map(item => {
        const assignment = item as {
          status?: boolean;
          user?: Parameters<typeof formatUserName>[0];
        };
        if (assignment.status === false) return '';
        return formatUserName(assignment.user);
      })
      .filter(Boolean);
  }
  const active = (users as { ACTIVE?: Parameters<typeof formatUserName>[0][] })
    ?.ACTIVE;
  return (active ?? []).map(formatUserName).filter(Boolean);
};

const taskAssignments = (task: SubTask) => {
  const users = task.users as unknown;
  if (Array.isArray(users)) {
    return users as {
      id?: number;
      userId?: number;
      status?: boolean;
      percentage?: number;
      user?: Parameters<typeof formatUserName>[0];
    }[];
  }
  const grouped = users as {
    ACTIVE?: {
      id?: number;
      userId?: number;
      status?: boolean;
      percentage?: number;
      user?: Parameters<typeof formatUserName>[0];
    }[];
  };
  return grouped?.ACTIVE ?? [];
};

type TaskResponsibleFilterOption = {
  userId: number;
  label: string;
  taskCount: number;
};

const activeTaskResponsibleUsers = (task: SubTask) => {
  const meetingParticipants = task.meetingParticipants ?? [];
  if (meetingParticipants.length) {
    return meetingParticipants
      .filter(participant => participant.isActive)
      .map(participant => ({
        userId: participant.userId,
        user: participant.user,
      }));
  }

  return taskAssignments(task)
    .filter(assignment => assignment.status !== false)
    .map(assignment => ({
      userId: assignment.userId ?? assignment.user?.id ?? 0,
      user: assignment.user,
    }))
    .filter(assignment => assignment.userId > 0);
};

const taskHasAnyResponsible = (task: SubTask, userIds: Set<number>) =>
  activeTaskResponsibleUsers(task).some(assignment =>
    userIds.has(assignment.userId)
  );

const responsibleFilterOptions = (
  level?: Level | null
): TaskResponsibleFilterOption[] => {
  const optionsByUserId = new Map<number, TaskResponsibleFilterOption>();
  collectTasks(level).forEach(task => {
    activeTaskResponsibleUsers(task).forEach(assignment => {
      const current = optionsByUserId.get(assignment.userId);
      if (current) {
        current.taskCount += 1;
        return;
      }
      optionsByUserId.set(assignment.userId, {
        userId: assignment.userId,
        label:
          formatUserName(assignment.user) || `Usuario ${assignment.userId}`,
        taskCount: 1,
      });
    });
  });
  return Array.from(optionsByUserId.values()).sort((first, second) =>
    first.label.localeCompare(second.label, 'es')
  );
};

const filterTechnicalTreeByResponsible = (
  level: Level | null | undefined,
  userIds: Set<number>
): Level | null => {
  if (!level) return null;
  if (!userIds.size) return level;

  const subTasks = (level.subTasks ?? []).filter(task =>
    taskHasAnyResponsible(task, userIds)
  );
  const nextLevel = (level.nextLevel ?? [])
    .map(child => filterTechnicalTreeByResponsible(child, userIds))
    .filter((child): child is Level => Boolean(child));

  if (!subTasks.length && !nextLevel.length) return null;
  return { ...level, subTasks, nextLevel };
};

const taskActiveAssignment = (task: SubTask) =>
  taskAssignments(task).find(assignment => assignment.status !== false) ??
  taskAssignments(task)[0];

const taskExecutionPercentage = (task: SubTask) => {
  const assignmentPercentage = Number(taskActiveAssignment(task)?.percentage);
  if (Number.isFinite(assignmentPercentage) && assignmentPercentage > 0)
    return assignmentPercentage;
  const taskPercentage = Number(task.percentage);
  return Number.isFinite(taskPercentage) ? taskPercentage : 0;
};

const getTaskLastFeedback = (task: SubTask) =>
  task.lastFeedback ||
  (task as SubTask & { feedBacks?: SubTask['lastFeedback'][] }).feedBacks?.[0];

const numericValue = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const roundValuation = (value: number, digits = 4) =>
  Number.isFinite(value) ? Number(value.toFixed(digits)) : 0;

const monthlyDayRate = (monthlyPrice: number) =>
  monthlyPrice > 0 ? monthlyPrice / 30 : 0;

const valuationAmountFromDays = (days: number, monthlyPrice: number) =>
  roundValuation(days * monthlyDayRate(monthlyPrice), 2);

const valuationDaysFromAmount = (amount: number, monthlyPrice: number) => {
  const dayRate = monthlyDayRate(monthlyPrice);
  return dayRate > 0 ? roundValuation(amount / dayRate, 4) : 0;
};

const formatValuationMoney = (value: number) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(value || 0);

const taskValuationDays = (
  task: SubTask,
  valuationDrafts: Record<number, ValuationDraft>
) => {
  const draft = valuationDrafts[task.id];
  return draft ? numericValue(draft.days) : numericValue(task.days);
};

const taskValuationTotals = (
  task: SubTask,
  monthlyPrice: number,
  valuationDrafts: Record<number, ValuationDraft>
): ValuationTotals => {
  const days = taskValuationDays(task, valuationDrafts);
  const amount = valuationAmountFromDays(days, monthlyPrice);
  const spending = numericValue(
    (task as SubTask & { spending?: number }).spending
  );
  return {
    days,
    amount,
    spending,
    balance: roundValuation(amount - spending, 2),
  };
};

const levelValuationTotals = (
  level: Level | null | undefined,
  monthlyPrice: number,
  valuationDrafts: Record<number, ValuationDraft>
): ValuationTotals => {
  const totals = collectTasks(level).reduce<ValuationTotals>(
    (acc, task) => {
      const taskTotals = taskValuationTotals(
        task,
        monthlyPrice,
        valuationDrafts
      );
      return {
        days: acc.days + taskTotals.days,
        amount: acc.amount + taskTotals.amount,
        spending: acc.spending + taskTotals.spending,
        balance: acc.balance + taskTotals.balance,
      };
    },
    { days: 0, amount: 0, spending: 0, balance: 0 }
  );
  return {
    days: roundValuation(totals.days, 4),
    amount: roundValuation(totals.amount, 2),
    spending: roundValuation(totals.spending, 2),
    balance: roundValuation(totals.balance, 2),
  };
};

const reviewableTask = (task: SubTask) =>
  task.status === 'INREVIEW' && Boolean(getTaskLastFeedback(task));

const taskReviewBlockedReason = (
  task: SubTask,
  canManageCurrentUnit: boolean,
  hasReview?: boolean
) => {
  if (!canManageCurrentUnit) return 'Solo gestores pueden revisar';
  if (hasReview) return 'Ya revisado';
  if (['REVIEWED', 'DENIED', 'DONE', 'LIQUIDATION'].includes(task.status)) {
    return 'Ya revisado';
  }
  if (task.status !== 'INREVIEW' || !getTaskLastFeedback(task)) {
    return 'Pendiente de envio';
  }
  return '';
};

const taskReviewStats = (level: Level) => {
  const tasks = collectTasks(level);
  return {
    total: tasks.length,
    inReview: tasks.filter(task => task.status === 'INREVIEW').length,
    reviewed: tasks.filter(task => task.status === 'REVIEWED').length,
    rejected: tasks.filter(task => task.status === 'DENIED').length,
    pending: tasks.filter(
      task => !['INREVIEW', 'REVIEWED', 'DENIED'].includes(task.status)
    ).length,
  };
};

const reviewContextForNode = (
  commitments: Commitment[] | undefined,
  node: TechnicalReviewNode
) => {
  const openCommitments = activeCommitments(commitments);
  for (const commitment of openCommitments) {
    const context = commitment.contexts?.find(item =>
      node.type === 'LEVEL'
        ? item.levelId === node.id
        : item.subTaskId === node.id
    );
    if (context) return { commitment, context };
  }
  return openCommitments[0]
    ? { commitment: openCommitments[0], context: undefined }
    : null;
};

const isCommitmentOpen = (commitment: Commitment) =>
  ['PENDING', 'IN_PROGRESS', 'BLOCKED'].includes(commitment.status);

const activeCommitments = (commitments?: Commitment[]) =>
  (commitments ?? []).filter(isCommitmentOpen);

const latestReviewForContext = (
  commitment: Commitment | undefined,
  contextId?: string | null
) =>
  commitment?.reviews?.find(review =>
    contextId ? review.contextId === contextId : !review.contextId
  );

const reviewerLabel = (value?: string | null) => {
  if (!value) return '';
  try {
    const parsed = JSON.parse(value) as { fullname?: string };
    return parsed.fullname || '';
  } catch {
    return value;
  }
};

const reviewDecisionLabel: Record<CommitmentReviewDecision, string> = {
  APPROVED: 'Si',
  REJECTED: 'No',
  NOT_APPLICABLE: 'N/A',
};

const taskFileList = (task: SubTask): FileTask[] => {
  const files = task.files as unknown;
  const directFiles = (() => {
    if (!files) return [];
    if (Array.isArray(files)) return files;
    const grouped = files as Record<string, unknown[] | undefined>;
    return [
      ...(grouped.MODEL ?? []),
      ...(grouped.UPLOADS ?? []),
      ...(grouped.REVIEW ?? []),
    ];
  })();
  const feedbackFiles = (getTaskLastFeedback(task)?.files ?? []) as unknown[];
  const merged = new Map<string, FileTask>();
  [...directFiles, ...feedbackFiles].forEach(file => {
    const item = file as Partial<FileTask>;
    if (!item.id || !item.dir || !item.name) return;
    const normalized: FileTask = {
      id: item.id,
      dir: item.dir,
      name: item.name,
      type: item.type || 'UPLOADS',
      originalname: item.originalname || item.name,
    };
    const key = item.id
      ? `${item.type || 'file'}-${item.id}`
      : `${item.type || 'file'}-${item.name || Math.random()}`;
    merged.set(key, normalized);
  });
  return Array.from(merged.values());
};

const taskExecutionVersion = (task?: SubTask | null) =>
  task
    ? `${task.id}:${task.updatedAt ?? ''}:${
        task.status
      }:${taskExecutionPercentage(task)}:${taskFileList(task).length}`
    : '';

const isTaskExecutionLocked = (task: SubTask) =>
  ['INREVIEW', 'REVIEWED', 'DONE', 'LIQUIDATION'].includes(task.status);

const canExecuteTask = (
  task: SubTask,
  userId?: number,
  canManageCurrentUnit?: boolean
) => {
  if (canManageCurrentUnit) return !isTaskExecutionLocked(task);
  if (!userId || isTaskExecutionLocked(task)) return false;
  const activeAssignments = taskAssignments(task).filter(
    assignment => assignment.status !== false
  );
  if (!activeAssignments.length) return true;
  return activeAssignments.some(assignment => assignment.userId === userId);
};

const canOpenTask = (
  task: SubTask,
  userId?: number,
  canManageCurrentUnit?: boolean
) => {
  if (canManageCurrentUnit) return true;
  if (!userId) return false;
  return taskAssignments(task).some(assignment => assignment.userId === userId);
};

const commitmentAssigneeNames = (commitments?: Commitment[]) =>
  Array.from(
    new Set(
      (commitments ?? [])
        .flatMap(commitment => commitment.assignees ?? [])
        .map(assignee => formatUserName(assignee.user ?? undefined))
        .filter(Boolean)
    )
  );

const countTasks = (level?: Level | null): number => {
  if (!level) return 0;
  const current = level.subTasks?.length ?? 0;
  return (
    current +
    (level.nextLevel ?? []).reduce(
      (total, child) => total + countTasks(child),
      0
    )
  );
};

const collectLevelIds = (level?: Level | null): number[] => {
  if (!level) return [];
  return [
    level.id,
    ...(level.nextLevel ?? []).flatMap(child => collectLevelIds(child)),
  ];
};

const collectTaskIds = (level?: Level | null): number[] => {
  if (!level) return [];
  return [
    ...(level.subTasks ?? []).map(task => task.id),
    ...(level.nextLevel ?? []).flatMap(child => collectTaskIds(child)),
  ];
};

const collectTasks = (level?: Level | null): SubTask[] => {
  if (!level) return [];
  return [
    ...(level.subTasks ?? []),
    ...(level.nextLevel ?? []).flatMap(child => collectTasks(child)),
  ];
};

const normalizeTechnicalTreeSearch = (value: string) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();

const technicalTreeNodeMatches = (search: string, values: string[]) =>
  values.some(value => normalizeTechnicalTreeSearch(value).includes(search));

const filterTechnicalTree = (
  level: Level | null | undefined,
  search: string
): FilteredTechnicalTree => {
  if (!level) return { level: null, matchCount: 0 };
  if (!search) return { level, matchCount: 0 };

  const levelMatches = technicalTreeNodeMatches(search, [
    formatS10Item(level.item || level.id),
    level.item || '',
    level.name || '',
  ]);
  const matchingTasks = (level.subTasks ?? []).filter(task =>
    technicalTreeNodeMatches(search, [
      formatS10Item(task.item || task.id),
      task.item || '',
      task.name || '',
    ])
  );
  const childResults = (level.nextLevel ?? []).map(child =>
    filterTechnicalTree(child, search)
  );
  const matchingChildren = childResults
    .map(result => result.level)
    .filter((child): child is Level => Boolean(child));
  const matchCount =
    Number(levelMatches) +
    matchingTasks.length +
    childResults.reduce((total, result) => total + result.matchCount, 0);

  if (levelMatches) {
    return { level, matchCount };
  }

  if (!matchingTasks.length && !matchingChildren.length) {
    return { level: null, matchCount };
  }

  return {
    level: {
      ...level,
      subTasks: matchingTasks,
      nextLevel: matchingChildren,
    },
    matchCount,
  };
};

const TREE_EXPANSION_STORAGE_PREFIX = 'technical-office-tree:v1';

const technicalTreeExpansionStorageKey = (input: {
  userId?: number;
  unitId?: string | null;
  projectId?: number | null;
  stageId?: number | null;
}) => {
  const { userId, unitId, projectId, stageId } = input;
  if (!userId || !unitId || !projectId || !stageId) return null;
  return `${TREE_EXPANSION_STORAGE_PREFIX}:${userId}:${unitId}:${projectId}:${stageId}`;
};

const readCollapsedTechnicalLevelIds = (key: string) => {
  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) return new Set<number>();
    const parsedValue = JSON.parse(rawValue) as {
      version?: number;
      collapsedLevelIds?: unknown;
    };
    if (
      parsedValue.version !== 1 ||
      !Array.isArray(parsedValue.collapsedLevelIds)
    ) {
      return new Set<number>();
    }
    return new Set(
      parsedValue.collapsedLevelIds.filter(
        (levelId): levelId is number =>
          typeof levelId === 'number' && Number.isSafeInteger(levelId)
      )
    );
  } catch {
    return new Set<number>();
  }
};

const writeCollapsedTechnicalLevelIds = (
  key: string,
  levelIds: Set<number>
) => {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        collapsedLevelIds: Array.from(levelIds),
      })
    );
  } catch {
    // Storage is optional: the current session continues in memory.
  }
};

const collectLevelIdsContainingTask = (
  level: Level | null | undefined,
  taskId: number
): number[] => {
  if (!level) return [];
  const direct = (level.subTasks ?? []).some(task => task.id === taskId);
  const childMatches = (level.nextLevel ?? []).flatMap(child =>
    collectLevelIdsContainingTask(child, taskId)
  );
  return direct || childMatches.length ? [level.id, ...childMatches] : [];
};

const collectSelectedLevels = (
  level: Level | null | undefined,
  selectedIds: Set<number>
): Level[] => {
  if (!level) return [];
  return [
    ...(selectedIds.has(level.id) ? [level] : []),
    ...(level.nextLevel ?? []).flatMap(child =>
      collectSelectedLevels(child, selectedIds)
    ),
  ];
};

const findLevelById = (
  level: Level | null | undefined,
  levelId: number
): Level | null => {
  if (!level) return null;
  if (level.id === levelId) return level;
  for (const child of level.nextLevel ?? []) {
    const found = findLevelById(child, levelId);
    if (found) return found;
  }
  return null;
};

const findTaskById = (
  level: Level | null | undefined,
  taskId: number
): SubTask | null => {
  if (!level) return null;
  const direct = (level.subTasks ?? []).find(task => task.id === taskId);
  if (direct) return direct;
  for (const child of level.nextLevel ?? []) {
    const found = findTaskById(child, taskId);
    if (found) return found;
  }
  return null;
};

const replaceTaskInLevelTree = (
  level: TechnicalStageTree | null | undefined,
  updatedTask: SubTask
): TechnicalStageTree | undefined => {
  if (!level) return level ?? undefined;
  let changed = false;
  const nextSubTasks = (level.subTasks ?? []).map(task => {
    if (task.id !== updatedTask.id) return task;
    changed = true;
    return updatedTask;
  });
  const nextLevels = (level.nextLevel ?? []).map(child => {
    const nextChild = replaceTaskInLevelTree(child, updatedTask);
    if (nextChild && nextChild !== child) changed = true;
    return nextChild ?? child;
  });
  if (!changed) return level;
  return {
    ...level,
    subTasks: nextSubTasks,
    nextLevel: nextLevels,
  };
};

const selectedCount = (selection: SelectionState) =>
  selection.levelIds.size + selection.taskIds.size;

const memberLabel = (membership?: OfficeProjectModerator) => {
  const user = membership?.user;
  if (!user) return 'Usuario sin datos';
  const profile = user.profile;
  if (!profile) return user.email || `Usuario ${user.id}`;
  return `${profile.firstName} ${profile.lastName}`;
};

const candidateLabel = (candidate?: OfficeMemberCandidate | null) => {
  if (!candidate) return 'Usuario sin datos';
  const profile = candidate.profile;
  if (!profile) return candidate.email || `Usuario ${candidate.id}`;
  return `${profile.firstName} ${profile.lastName}`;
};

const assigneeInlineLabel = (
  memberships: OfficeProjectModerator[],
  userIds: number[]
) => {
  if (!userIds.length) return 'Elegir encargado';
  const names = userIds
    .map(userId =>
      memberLabel(memberships.find(membership => membership.user.id === userId))
    )
    .filter(Boolean);
  if (!names.length) return `${userIds.length} encargados`;
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1}`;
};

const commitmentDueStatus = (commitments?: Commitment[]) => {
  const openCommitments = activeCommitments(commitments);
  if (!openCommitments.length) return 'NONE';
  const dates = openCommitments
    .map(commitment => commitment.dueDate)
    .filter(Boolean)
    .map(value => new Date(value as string))
    .filter(date => !Number.isNaN(date.getTime()));
  if (!dates.length) return 'LINKED';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hasOverdue = dates.some(date => {
    const due = new Date(date);
    due.setHours(0, 0, 0, 0);
    return due < today;
  });
  if (hasOverdue) return 'OVERDUE';
  const soonLimit = new Date(today);
  soonLimit.setDate(today.getDate() + 3);
  const hasSoon = dates.some(date => {
    const due = new Date(date);
    due.setHours(0, 0, 0, 0);
    return due <= soonLimit;
  });
  return hasSoon ? 'SOON' : 'LINKED';
};

const commitmentRowClass = (
  commitments?: Commitment[],
  fallback = 'bg-white'
) => {
  const status = commitmentDueStatus(commitments);
  if (status === 'OVERDUE') return 'bg-red-50 hover:bg-red-100';
  if (status === 'SOON') return 'bg-amber-50 hover:bg-amber-100';
  if (status === 'LINKED') return 'bg-blue-50 hover:bg-blue-100';
  return `${fallback} hover:bg-slate-50`;
};

const earliestCommitment = (commitments?: Commitment[]) =>
  activeCommitments(commitments)
    .filter(commitment => commitment.dueDate)
    .sort((first, second) => {
      const firstTime = new Date(first.dueDate as string).getTime();
      const secondTime = new Date(second.dueDate as string).getTime();
      return firstTime - secondTime;
    })[0] ?? activeCommitments(commitments)[0];

const InlineAssigneePicker = ({
  memberships,
  value,
  displayLabel,
  onChange,
}: {
  memberships: OfficeProjectModerator[];
  value: number[];
  displayLabel?: string;
  onChange: (nextValue: number[]) => void;
}) => (
  <Popover>
    <PopoverTrigger asChild>
      {displayLabel ? (
        <button
          type="button"
          className="max-w-[220px] text-left text-xs text-slate-600 underline-offset-2 hover:text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-300"
          title="Click para reasignar"
        >
          <span className="line-clamp-2">{displayLabel}</span>
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 max-w-[220px] justify-start overflow-hidden font-normal"
        >
          <Users size={14} />
          <span className="truncate">
            {assigneeInlineLabel(memberships, value)}
          </span>
        </Button>
      )}
    </PopoverTrigger>
    <PopoverContent className="w-72 p-2" align="start">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-slate-500">
          Encargados
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={() => onChange([])}
        >
          Limpiar
        </Button>
      </div>
      <div className="max-h-64 space-y-1 overflow-auto">
        {!memberships.length && (
          <p className="p-2 text-sm text-slate-500">
            No hay miembros activos en esta oficina.
          </p>
        )}
        {memberships.map(membership => {
          const userId = membership.user.id;
          const checked = value.includes(userId);
          return (
            <label
              key={userId}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-slate-50"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() =>
                  onChange(
                    checked
                      ? value.filter(currentId => currentId !== userId)
                      : [...value, userId]
                  )
                }
              />
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-900">
                  {memberLabel(membership)}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {membership.user.profile?.job ||
                    membership.user.email ||
                    'Miembro de oficina'}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </PopoverContent>
  </Popover>
);

const ResponsibleTaskFilter = ({
  options,
  selectedUserIds,
  onSelectedUserIdsChange,
  currentUserId,
  canQuickFilterCurrentUser,
}: {
  options: TaskResponsibleFilterOption[];
  selectedUserIds: number[];
  onSelectedUserIdsChange: (userIds: number[]) => void;
  currentUserId?: number;
  canQuickFilterCurrentUser: boolean;
}) => {
  const [search, setSearch] = useState('');
  const selectedIds = new Set(selectedUserIds);
  const normalizedSearch = search.trim().toLocaleLowerCase('es-PE');
  const visibleOptions = normalizedSearch
    ? options.filter(option =>
        option.label.toLocaleLowerCase('es-PE').includes(normalizedSearch)
      )
    : options;
  const currentUserOption = options.find(
    option => option.userId === currentUserId
  );
  const isCurrentUserFilterActive =
    currentUserId !== undefined &&
    selectedUserIds.length === 1 &&
    selectedUserIds[0] === currentUserId;

  const toggleUser = (userId: number) => {
    onSelectedUserIdsChange(
      selectedIds.has(userId)
        ? selectedUserIds.filter(selectedId => selectedId !== userId)
        : [...selectedUserIds, userId]
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          aria-label="Filtrar subtareas por responsable"
        >
          <span>Responsable</span>
          {selectedUserIds.length > 0 && (
            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
              {selectedUserIds.length}
            </span>
          )}
          <Filter className="size-3" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              Filtrar subtareas por responsable
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Se conserva la ruta de niveles de cada resultado.
            </p>
          </div>
          {selectedUserIds.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 px-2 text-xs"
              onClick={() => onSelectedUserIdsChange([])}
            >
              Limpiar
            </Button>
          )}
        </div>
        {canQuickFilterCurrentUser && currentUserId && (
          <Button
            type="button"
            variant={isCurrentUserFilterActive ? 'secondary' : 'outline'}
            size="sm"
            className="mb-2 h-8 w-full justify-between text-xs"
            onClick={() =>
              onSelectedUserIdsChange(
                isCurrentUserFilterActive ? [] : [currentUserId]
              )
            }
          >
            <span>Mis tareas</span>
            <span className="tabular-nums">
              {currentUserOption?.taskCount ?? 0}
            </span>
          </Button>
        )}
        <Input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Buscar responsable..."
          className="mb-2 h-8 text-sm"
        />
        <div className="max-h-64 space-y-1 overflow-auto">
          {!visibleOptions.length && (
            <p className="p-2 text-sm text-slate-500">
              No hay responsables asignados en esta etapa.
            </p>
          )}
          {visibleOptions.map(option => {
            const checked = selectedIds.has(option.userId);
            return (
              <label
                key={option.userId}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleUser(option.userId)}
                />
                <span className="min-w-0 flex-1 truncate text-slate-800">
                  {option.label}
                </span>
                <span className="text-xs tabular-nums text-slate-500">
                  {option.taskCount}
                </span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const previewAssigneeLabel = (
  assignee?: TechnicalCommitmentPreviewRow['currentAssignees'][number]
) => {
  const user = assignee?.user;
  if (!user) return 'Sin responsable';
  const profile = user.profile;
  if (!profile) return user.email || `Usuario ${user.id}`;
  return `${profile.firstName} ${profile.lastName}`;
};

const normalizeFileUrl = (
  file: Pick<FileTask, 'dir' | 'name'> | TechnicalPreviewFile
) => {
  const dir = file.dir || '';
  const normalizedDir =
    dir.includes('editables') || dir.includes('projects')
      ? `projects/${dir.split('/').slice(3).join('/')}`
      : dir.replace('./uploads/', 'uploads/');
  return `${URL}/${normalizedDir}/${file.name}`;
};

const EvidenceFileList = ({
  title,
  files,
}: {
  title: string;
  files: TechnicalPreviewFile[];
}) => (
  <div className="space-y-2">
    <p className="text-xs font-semibold uppercase text-slate-500">{title}</p>
    {!files.length && (
      <p className="rounded-md border border-dashed border-slate-200 p-3 text-sm text-slate-500">
        Sin archivos registrados.
      </p>
    )}
    {files.map(file => (
      <a
        key={`${file.id}-${file.name}`}
        href={normalizeFileUrl(file)}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-blue-300 hover:bg-blue-50"
      >
        <span className="min-w-0 truncate">
          {file.originalname || file.name}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-blue-700">
          <Download size={14} />
          {file.type}
        </span>
      </a>
    ))}
  </div>
);

const TaskFilesDisclosureRow = ({
  task,
  depth,
  colSpan,
  unitId,
  projectId,
  stageId,
  canCreateNextSubmission,
  newSubmissionOpen,
  onNewSubmissionOpenChange,
  onTaskUpdated,
}: {
  task: SubTask;
  depth: number;
  colSpan: number;
  unitId?: string | null;
  projectId?: number | null;
  stageId?: number | null;
  canCreateNextSubmission: boolean;
  newSubmissionOpen: boolean;
  onNewSubmissionOpenChange: (open: boolean) => void;
  onTaskUpdated: (task: SubTask) => void;
}) => {
  const queryClient = useQueryClient();
  const addFilesInputRef = useRef<HTMLInputElement | null>(null);
  const nextSubmissionFilesInputRef = useRef<HTMLInputElement | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileTask | null>(null);
  const [editReviewOpen, setEditReviewOpen] = useState(false);
  const [reviewPercentage, setReviewPercentage] = useState('100');
  const [nextSubmissionPercentage, setNextSubmissionPercentage] = useState('');
  const [nextSubmissionFiles, setNextSubmissionFiles] = useState<File[]>([]);
  const taskFilesQuery = useQuery({
    queryKey: ['technical-office-task-files', task.id],
    queryFn: () => getTechnicalTaskDetail(task.id),
  });
  const reviewSubmissionsQuery = useQuery({
    queryKey: ['technical-office-review-submissions', unitId, task.id],
    queryFn: () => getTechnicalReviewSubmissions(unitId!, task.id),
    enabled: Boolean(unitId),
  });
  const deleteFileMutation = useMutation({
    mutationFn: deleteTechnicalTaskFile,
    onSuccess: async () => {
      SnackbarUtilities.success('Archivo eliminado.');
      setFileToDelete(null);
      const [result] = await Promise.all([
        taskFilesQuery.refetch(),
        reviewSubmissionsQuery.refetch(),
      ]);
      if (result.data) onTaskUpdated(result.data);
      queryClient.invalidateQueries({
        queryKey: ['technical-office-stage-tree'],
      });
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar el archivo.'
      );
    },
  });
  const createSubmissionMutation = useMutation({
    mutationFn: async () => {
      if (!unitId || !projectId || !stageId) {
        throw new Error('Selecciona oficina, proyecto y etapa.');
      }
      const percentage = Number(nextSubmissionPercentage);
      if (!Number.isInteger(percentage) || percentage < minimumNextPercentage) {
        throw new Error(
          `Ingresa un avance entero entre ${minimumNextPercentage}% y 100%.`
        );
      }
      if (percentage > 100) {
        throw new Error('Ingresa un avance entre 1% y 100%.');
      }
      if (!nextSubmissionFiles.length) {
        throw new Error('Selecciona al menos un archivo.');
      }
      return createTechnicalReviewSubmission(unitId, task.id, {
        projectId,
        stageId,
        percentage,
        files: nextSubmissionFiles,
      });
    },
    onSuccess: async updatedTask => {
      SnackbarUtilities.success('Nuevo entregable enviado a revision.');
      setNextSubmissionFiles([]);
      onNewSubmissionOpenChange(false);
      onTaskUpdated(updatedTask);
      await Promise.all([
        taskFilesQuery.refetch(),
        reviewSubmissionsQuery.refetch(),
      ]);
      queryClient.invalidateQueries({
        queryKey: ['technical-office-stage-tree'],
      });
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo registrar el nuevo entregable.'
      );
    },
  });
  const appendFilesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!unitId || !projectId || !stageId) {
        throw new Error('Selecciona oficina, proyecto y etapa.');
      }
      if (!files.length) throw new Error('Selecciona al menos un archivo.');
      return appendTechnicalReviewFiles(unitId, task.id, {
        projectId,
        stageId,
        files,
      });
    },
    onSuccess: async updatedTask => {
      onTaskUpdated(updatedTask);
      queryClient.setQueryData(
        ['technical-office-task-files', task.id],
        updatedTask
      );
      await Promise.all([
        taskFilesQuery.refetch(),
        reviewSubmissionsQuery.refetch(),
      ]);
      queryClient.invalidateQueries({
        queryKey: ['technical-office-stage-tree'],
      });
      SnackbarUtilities.success(
        'Archivos agregados y visibles en el entregable.'
      );
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudieron agregar los archivos.'
      );
    },
  });
  const detailTask = taskFilesQuery.data;
  const files = detailTask ? taskFileList(detailTask) : [];
  const supportFiles = files.filter(file => file.type !== 'REVIEW');
  const submissions: TechnicalReviewSubmission[] =
    reviewSubmissionsQuery.data ?? [];
  const orderedSubmissions = [...submissions].reverse();
  const latestFeedback = detailTask
    ? getTaskLastFeedback(detailTask)
    : getTaskLastFeedback(task);
  const canAppendReviewFiles =
    (detailTask?.status ?? task.status) === 'INREVIEW' &&
    Boolean(latestFeedback) &&
    !latestFeedback?.status &&
    !latestFeedback?.replacedAt;
  const latestSubmission = submissions.at(-1);
  const currentSubmissionPercentage = Number(
    latestSubmission?.percentage ?? latestFeedback?.percentage ?? 0
  );
  const minimumNextPercentage = Math.min(
    101,
    Math.max(1, Math.floor(currentSubmissionPercentage) + 1)
  );
  const pendingReviewPercentage = useMemo(() => {
    const feedbackPercentage = Number(latestFeedback?.percentage);
    const approvedPercentage = Number(
      (
        detailTask as
          | (SubTask & { percentageWithoutActive?: number | string })
          | undefined
      )?.percentageWithoutActive ??
        (task as SubTask & { percentageWithoutActive?: number | string })
          .percentageWithoutActive
    );
    if (Number.isFinite(feedbackPercentage)) {
      const pending =
        feedbackPercentage -
        (Number.isFinite(approvedPercentage) ? approvedPercentage : 0);
      if (pending > 0) return Math.min(100, Math.max(0, pending));
    }
    const fallback = taskExecutionPercentage(detailTask ?? task);
    return fallback > 0 ? fallback : 100;
  }, [detailTask, latestFeedback, task]);
  useEffect(() => {
    setReviewPercentage(String(pendingReviewPercentage));
  }, [pendingReviewPercentage]);
  useEffect(() => {
    if (!newSubmissionOpen) return;

    const frame = window.requestAnimationFrame(() => {
      setNextSubmissionPercentage(
        minimumNextPercentage <= 100 ? String(minimumNextPercentage) : ''
      );
      setNextSubmissionFiles([]);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [minimumNextPercentage, newSubmissionOpen]);
  const updatePercentageMutation = useMutation({
    mutationFn: async () => {
      if (!unitId || !projectId || !stageId) {
        throw new Error('Selecciona oficina, proyecto y etapa.');
      }
      const percentage = Number(reviewPercentage);
      if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
        throw new Error('Ingresa un porcentaje entre 1 y 100.');
      }
      return updateTechnicalReviewPercentage(unitId, task.id, {
        projectId,
        stageId,
        percentage,
      });
    },
    onSuccess: async updatedTask => {
      SnackbarUtilities.success('Porcentaje actualizado.');
      setEditReviewOpen(false);
      onTaskUpdated(updatedTask);
      await Promise.all([
        taskFilesQuery.refetch(),
        reviewSubmissionsQuery.refetch(),
      ]);
      queryClient.invalidateQueries({
        queryKey: ['technical-office-stage-tree'],
      });
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el porcentaje.'
      );
    },
  });
  return (
    <>
      <tr className="border-t border-blue-100 bg-blue-50/40">
        <td colSpan={colSpan} className="px-3 py-3">
          <div
            className="rounded-md border border-blue-100 bg-white p-3"
            style={{ marginLeft: `${Math.max(depth, 0) * 18 + 26}px` }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase text-blue-700">
                  Archivos de la subtarea
                </p>
                <p className="text-sm font-medium text-slate-900">
                  {task.name}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={taskFilesQuery.isFetching}
                      onClick={() => {
                        void Promise.all([
                          taskFilesQuery.refetch(),
                          reviewSubmissionsQuery.refetch(),
                        ]);
                      }}
                    >
                      {taskFilesQuery.isFetching
                        ? 'Actualizando...'
                        : 'Actualizar'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Vuelve a consultar los archivos y el historial de
                    entregables.
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            {taskFilesQuery.isLoading && (
              <div className="py-4">
                <LoaderForComponent />
              </div>
            )}
            {!taskFilesQuery.isLoading &&
              !reviewSubmissionsQuery.isLoading &&
              !supportFiles.length &&
              !submissions.length && (
                <p className="rounded-md border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                  Sin archivos registrados.
                </p>
              )}
            {!reviewSubmissionsQuery.isLoading && submissions.length > 0 && (
              <div className="mb-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Historial de entregables
                  </p>
                  <span className="text-xs text-slate-400">
                    {submissions.length} version
                    {submissions.length === 1 ? '' : 'es'}
                  </span>
                </div>
                {orderedSubmissions.map((submission, displayIndex) => {
                  const status = {
                    PENDING: {
                      label: 'Pendiente de revision',
                      className: 'border-amber-200 bg-amber-50 text-amber-800',
                    },
                    REPLACED: {
                      label: 'Reemplazado',
                      className: 'border-slate-200 bg-slate-50 text-slate-600',
                    },
                    APPROVED: {
                      label: 'Aprobado',
                      className:
                        'border-emerald-200 bg-emerald-50 text-emerald-800',
                    },
                    OBSERVED: {
                      label: 'Observado',
                      className: 'border-red-200 bg-red-50 text-red-700',
                    },
                  }[submission.state];
                  const isCurrent = submission.state === 'PENDING';
                  return (
                    <article
                      key={submission.id}
                      className={`rounded-md border p-3 ${
                        isCurrent
                          ? 'border-sky-200 bg-sky-50/60 ring-1 ring-sky-100'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Entregable #{submissions.length - displayIndex}
                            <span className="ml-2 text-sky-700">
                              {submission.percentage}%
                            </span>
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDateTime(submission.createdAt)}
                            {reviewerLabel(submission.author)
                              ? ` · ${reviewerLabel(submission.author)}`
                              : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {isCurrent && canAppendReviewFiles && (
                            <>
                              <input
                                ref={addFilesInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={event => {
                                  const selectedFiles = Array.from(
                                    event.target.files ?? []
                                  );
                                  if (selectedFiles.length) {
                                    appendFilesMutation.mutate(selectedFiles);
                                  }
                                  event.target.value = '';
                                }}
                              />
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    disabled={appendFilesMutation.isPending}
                                    onClick={() =>
                                      addFilesInputRef.current?.click()
                                    }
                                  >
                                    <Plus size={14} />
                                    {appendFilesMutation.isPending
                                      ? 'Agregando...'
                                      : 'Agregar archivos'}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Adjunta más archivos a este entregable sin
                                  crear una versión nueva.
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                      updatePercentageMutation.isPending
                                    }
                                    onClick={() => setEditReviewOpen(true)}
                                  >
                                    <Pencil size={14} />
                                    Editar porcentaje
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Corrige el avance de este envío; no crea otro
                                  entregable.
                                </TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          <Badge variant="outline" className={status.className}>
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
                        {submission.files.map(file => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                          >
                            <a
                              href={normalizeFileUrl(file)}
                              target="_blank"
                              rel="noreferrer"
                              className="flex min-w-0 items-center gap-2 text-blue-700 hover:underline"
                              onClick={event => event.stopPropagation()}
                            >
                              <FileText size={15} />
                              <span className="truncate">
                                {file.originalname || file.name}
                              </span>
                            </a>
                            {isCurrent && canAppendReviewFiles && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={deleteFileMutation.isPending}
                                    className="shrink-0 text-red-600 hover:bg-red-50"
                                    onClick={() =>
                                      setFileToDelete(file as FileTask)
                                    }
                                  >
                                    <Trash2 size={14} />
                                    Eliminar
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Quita este archivo del entregable vigente.
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            {!taskFilesQuery.isLoading && supportFiles.length > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Archivos de apoyo
                </p>
                <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
                  {supportFiles.map(file => {
                    const canDelete = file.type !== 'UPLOADS';
                    return (
                      <div
                        key={`${file.type}-${file.id}`}
                        className="grid gap-3 px-3 py-2 text-sm md:grid-cols-[minmax(0,1fr)_120px_90px]"
                      >
                        <a
                          href={normalizeFileUrl(file)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex min-w-0 items-center gap-2 text-blue-700 hover:underline"
                          onClick={event => event.stopPropagation()}
                        >
                          <FileText size={15} />
                          <span className="truncate">
                            {file.originalname || file.name}
                          </span>
                        </a>
                        <Badge variant="outline" className="w-fit">
                          {file.type}
                        </Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={
                                  !canDelete || deleteFileMutation.isPending
                                }
                                className={
                                  canDelete
                                    ? 'text-red-600 hover:bg-red-50'
                                    : 'text-slate-400'
                                }
                                onClick={() => {
                                  if (!canDelete) return;
                                  setFileToDelete(file);
                                }}
                              >
                                <Trash2 size={14} />
                                Eliminar
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {canDelete
                              ? 'Quita este archivo de apoyo.'
                              : 'Este archivo marcado como hecho no se puede eliminar.'}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </td>
      </tr>
      <Dialog
        open={Boolean(fileToDelete)}
        onOpenChange={open => !open && setFileToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar archivo</DialogTitle>
            <DialogDescription>
              Esta accion quitara el archivo del registro de la subtarea. No se
              puede deshacer desde esta vista.
            </DialogDescription>
          </DialogHeader>
          {fileToDelete && (
            <div className="rounded-md border border-red-100 bg-red-50 p-3">
              <p className="text-xs font-semibold uppercase text-red-700">
                Archivo seleccionado
              </p>
              <p className="mt-1 break-words text-sm font-medium text-slate-950">
                {fileToDelete.originalname || fileToDelete.name}
              </p>
              <Badge variant="outline" className="mt-2">
                {fileToDelete.type}
              </Badge>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteFileMutation.isPending}
              onClick={() => setFileToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!fileToDelete || deleteFileMutation.isPending}
              onClick={() => {
                if (fileToDelete) deleteFileMutation.mutate(fileToDelete.id);
              }}
            >
              {deleteFileMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={editReviewOpen}
        onOpenChange={open => {
          if (!updatePercentageMutation.isPending) setEditReviewOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar porcentaje enviado</DialogTitle>
            <DialogDescription>
              Corrige el avance de la versión vigente. Esta acción no crea un
              nuevo entregable ni modifica el historial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-sky-100 bg-sky-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                Entregable vigente
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {latestSubmission
                  ? `Entregable #${submissions.length}`
                  : task.name}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`review-percentage-${task.id}`}>
                Avance enviado
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`review-percentage-${task.id}`}
                  type="number"
                  min={1}
                  max={100}
                  value={reviewPercentage}
                  disabled={updatePercentageMutation.isPending}
                  onChange={event => setReviewPercentage(event.target.value)}
                  className="w-28"
                />
                <span className="text-sm text-slate-500">%</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {[25, 50, 75, 100].map(value => (
                  <Button
                    key={value}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={updatePercentageMutation.isPending}
                    onClick={() => setReviewPercentage(String(value))}
                  >
                    {value}%
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={updatePercentageMutation.isPending}
              onClick={() => setEditReviewOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={updatePercentageMutation.isPending}
              onClick={() => updatePercentageMutation.mutate()}
            >
              {updatePercentageMutation.isPending
                ? 'Guardando...'
                : 'Guardar corrección'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={newSubmissionOpen}
        onOpenChange={open => {
          if (!createSubmissionMutation.isPending)
            onNewSubmissionOpenChange(open);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar nuevo entregable</DialogTitle>
            <DialogDescription>
              Registra una version mas avanzada sin esperar la revision actual.
              El envio pendiente se conservara como reemplazado en el historial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
              <p className="font-semibold">{task.name}</p>
              <p className="mt-1 text-xs text-sky-800">
                El entregable pendiente registra {currentSubmissionPercentage}%.{' '}
                El nuevo avance debe estar entre {minimumNextPercentage}% y
                100%.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`next-submission-percentage-${task.id}`}>
                Avance acumulado
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`next-submission-percentage-${task.id}`}
                  type="number"
                  min={minimumNextPercentage}
                  max={100}
                  value={nextSubmissionPercentage}
                  disabled={createSubmissionMutation.isPending}
                  onChange={event =>
                    setNextSubmissionPercentage(event.target.value)
                  }
                  className="w-28"
                />
                <span className="text-sm text-slate-500">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Archivos del nuevo entregable</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={createSubmissionMutation.isPending}
                  onClick={() => nextSubmissionFilesInputRef.current?.click()}
                >
                  <UploadCloud size={14} />
                  Seleccionar archivos
                </Button>
                <input
                  ref={nextSubmissionFilesInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={event => {
                    const selected = Array.from(event.target.files ?? []);
                    if (!selected.length) return;
                    setNextSubmissionFiles(current => {
                      const known = new Set(
                        current.map(
                          file =>
                            `${file.name}:${file.size}:${file.lastModified}`
                        )
                      );
                      return [
                        ...current,
                        ...selected.filter(file => {
                          const key = `${file.name}:${file.size}:${file.lastModified}`;
                          if (known.has(key)) return false;
                          known.add(key);
                          return true;
                        }),
                      ];
                    });
                    event.target.value = '';
                  }}
                />
              </div>
              {nextSubmissionFiles.length ? (
                <div className="divide-y rounded-md border border-slate-200">
                  {nextSubmissionFiles.map(file => (
                    <div
                      key={`${file.name}:${file.size}:${file.lastModified}`}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate text-slate-700">
                        {file.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Quitar ${file.name}`}
                        disabled={createSubmissionMutation.isPending}
                        onClick={() =>
                          setNextSubmissionFiles(current =>
                            current.filter(item => item !== file)
                          )
                        }
                      >
                        <X size={15} />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                  Selecciona los archivos que evidencian este nuevo avance.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={createSubmissionMutation.isPending}
              onClick={() => onNewSubmissionOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={
                !canCreateNextSubmission ||
                minimumNextPercentage > 100 ||
                createSubmissionMutation.isPending
              }
              onClick={() => createSubmissionMutation.mutate()}
            >
              {createSubmissionMutation.isPending
                ? 'Registrando...'
                : 'Registrar y enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const LegacyTaskExecutionDialog = ({
  open,
  taskId,
  onOpenChange,
  onTaskUpdated,
}: {
  open: boolean;
  taskId: number | null;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: (task: SubTask) => void;
}) => {
  const socket = useContext(SocketContext);
  const queryClient = useQueryClient();
  const lastAppliedTaskVersionRef = useRef('');
  const taskQuery = useQuery({
    queryKey: ['technical-office-legacy-task', taskId],
    queryFn: async () => {
      const res = await axiosInstance.get<SubTask>(`/subtasks/${taskId}`, {
        headers: { noLoader: true },
      });
      return res.data;
    },
    enabled: open && Boolean(taskId),
  });

  useEffect(() => {
    lastAppliedTaskVersionRef.current = '';
  }, [taskId]);

  const applyTaskUpdate = useCallback(
    (task: SubTask) => {
      if (!taskId || task.id !== taskId) return;
      const version = taskExecutionVersion(task);
      if (version === lastAppliedTaskVersionRef.current) return;
      lastAppliedTaskVersionRef.current = version;
      queryClient.setQueryData(['technical-office-legacy-task', taskId], task);
      onTaskUpdated(task);
    },
    [onTaskUpdated, queryClient, taskId]
  );

  useEffect(() => {
    if (!open || !taskId) return;
    socket.emit('join', `budget-task-${taskId}`);
    const handleTaskLoad = (task: SubTask) => {
      if (task.id !== taskId) return;
      applyTaskUpdate(task);
    };
    socket.on('server:load-budget-task', handleTaskLoad);
    return () => {
      socket.off('server:load-budget-task', handleTaskLoad);
    };
  }, [applyTaskUpdate, open, socket, taskId]);

  useEffect(() => {
    if (taskQuery.data) applyTaskUpdate(taskQuery.data);
  }, [applyTaskUpdate, taskQuery.data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(86vh,720px)] w-[min(96vw,1440px)] max-w-none overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Ejecutar subtarea tecnica</DialogTitle>
          <DialogDescription>
            Gestiona archivos, responsables y revision de la subtarea tecnica.
          </DialogDescription>
        </DialogHeader>
        {taskQuery.isLoading && (
          <div className="flex h-full items-center justify-center">
            <LoaderForComponent />
          </div>
        )}
        {!taskQuery.isLoading && taskQuery.data && (
          <ProjectTaskWorkspace
            task={taskQuery.data}
            className="h-full bg-white"
          />
        )}
        {!taskQuery.isLoading && !taskQuery.data && (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No se pudo cargar la tarea.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const getCommitmentBuckets = (commitments: Commitment[]): CommitmentBuckets =>
  commitments.reduce<CommitmentBuckets>(
    (acc, commitment) => {
      commitment.contexts?.forEach(context => {
        if (context.levelId) {
          const list = acc.byLevel.get(context.levelId) ?? [];
          acc.byLevel.set(context.levelId, [...list, commitment]);
        }
        if (context.subTaskId) {
          const list = acc.byTask.get(context.subTaskId) ?? [];
          acc.byTask.set(context.subTaskId, [...list, commitment]);
        }
      });
      return acc;
    },
    { byLevel: new Map(), byTask: new Map() }
  );

const CommitmentBadge = ({
  commitments,
  onOpenCommitment,
}: {
  commitments?: Commitment[];
  onOpenCommitment?: (commitment: Commitment) => void;
}) => {
  const openCommitments = activeCommitments(commitments);
  const total = openCommitments.length;
  if (!total)
    return <span className="text-xs text-slate-400">Sin compromisos</span>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex">
          <Badge variant="info" className="cursor-pointer">
            {total} compromiso{total > 1 ? 's' : ''}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase text-slate-500">
            Compromisos abiertos
          </p>
          {openCommitments.map(commitment => (
            <button
              key={commitment.id}
              type="button"
              className="block w-full rounded-md px-2 py-2 text-left hover:bg-blue-50"
              onClick={() => onOpenCommitment?.(commitment)}
            >
              <span className="block text-sm font-semibold text-slate-900">
                {commitment.title}
              </span>
              <span className="text-xs text-slate-500">
                {commitment.dueDate
                  ? `Fecha: ${commitment.dueDate.slice(0, 10)}`
                  : 'Sin fecha'}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const DueDatePreviewCell = ({
  commitments,
  onOpenCommitment,
}: {
  commitments?: Commitment[];
  onOpenCommitment?: (commitment: Commitment) => void;
}) => {
  const openCommitments = activeCommitments(commitments);
  const primary = earliestCommitment(openCommitments);
  const status = commitmentDueStatus(openCommitments);

  if (!openCommitments.length) {
    return <span className="text-xs text-slate-400">Nuevo compromiso</span>;
  }

  const statusClass =
    status === 'OVERDUE'
      ? 'border-red-200 bg-red-50 text-red-700'
      : status === 'SOON'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-slate-200 bg-white text-slate-700';

  const label = primary?.dueDate ? primary.dueDate.slice(0, 10) : 'Sin fecha';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex h-8 items-center gap-2 rounded-md border px-2 text-xs font-medium ${statusClass}`}
        >
          {label}
          {openCommitments.length > 1 && (
            <span className="rounded bg-white/70 px-1 text-[10px]">
              +{openCommitments.length - 1}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase text-slate-500">
            Fecha proxima
          </p>
          {openCommitments.map(commitment => (
            <button
              key={commitment.id}
              type="button"
              className="block w-full rounded-md px-2 py-2 text-left hover:bg-blue-50"
              onClick={() => onOpenCommitment?.(commitment)}
            >
              <span className="block text-sm font-semibold text-slate-900">
                {commitment.title}
              </span>
              <span className="text-xs text-slate-500">
                {commitment.dueDate
                  ? commitment.dueDate.slice(0, 10)
                  : 'Sin fecha definida'}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const ReviewDecisionControl = ({
  value,
  disabled,
  disabledReason,
  isPending,
  onSelect,
}: {
  value?: CommitmentReviewDecision;
  disabled?: boolean;
  disabledReason?: string;
  isPending?: boolean;
  onSelect: (decision: CommitmentReviewDecision) => void;
}) => {
  const items: CommitmentReviewDecision[] = [
    'APPROVED',
    'REJECTED',
    'NOT_APPLICABLE',
  ];
  const control = (
    <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5">
      {items.map(item => (
        <button
          key={item}
          type="button"
          disabled={disabled || isPending}
          onClick={() => onSelect(item)}
          className={`min-w-10 rounded px-2 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            value === item
              ? item === 'APPROVED'
                ? 'bg-emerald-600 text-white'
                : item === 'REJECTED'
                ? 'bg-red-600 text-white'
                : 'bg-slate-700 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {reviewDecisionLabel[item]}
        </button>
      ))}
    </div>
  );

  if (disabledReason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-block cursor-help">{control}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-64 text-xs">{disabledReason}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return control;
};

const structureDraftLabel = (draft: StructureDraft) => {
  if (draft.kind === 'ROOT_LEVEL') {
    return draft.withTask ? 'Nuevo nivel con subtarea' : 'Nuevo nivel';
  }
  if (draft.kind === 'EDIT_LEVEL') return 'Editar nivel';
  if (draft.kind === 'LEVEL_SIBLING') {
    return draft.position === 'upper' ? 'Nivel arriba' : 'Nivel abajo';
  }
  if (draft.kind === 'LEVEL_CHILD') return 'Nuevo nivel anidado';
  if (draft.kind === 'SUBTASK_CHILD') return 'Nueva subtarea';
  if (draft.kind === 'DUPLICATE_LEVEL') return 'Duplicar nivel';
  if (draft.kind === 'EDIT_TASK') return 'Editar subtarea';
  if (draft.kind === 'TASK_SIBLING') {
    return draft.position === 'upper' ? 'Subtarea arriba' : 'Subtarea abajo';
  }
  return 'Duplicar subtarea';
};

const structureDraftDepth = (draft: StructureDraft) =>
  'depth' in draft ? draft.depth : 0;

const StructureDraftRow = ({
  draft,
  value,
  isSaving,
  onChange,
  onCancel,
  onSave,
}: {
  draft: StructureDraft;
  value: string;
  isSaving: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) => (
  <tr className="border-t border-blue-200 bg-blue-50/70">
    <td className="min-w-[110px] px-3 py-2 align-top font-mono text-xs text-blue-700">
      nuevo
    </td>
    <td className="min-w-[360px] px-3 py-2 align-top">
      <div
        className="flex items-center gap-2"
        style={{
          paddingLeft: `${Math.max(structureDraftDepth(draft), 0) * 18}px`,
        }}
      >
        <ListPlus className="size-4 text-blue-700" />
        <Input
          autoFocus
          value={value}
          onChange={event => onChange(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSave();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              onCancel();
            }
          }}
          placeholder={structureDraftLabel(draft)}
          className="h-8 max-w-xl bg-white"
          disabled={isSaving}
        />
      </div>
    </td>
    <td className="px-3 py-2 align-top">
      <Badge variant="outline">{structureDraftLabel(draft)}</Badge>
    </td>
    <td className="px-3 py-2 align-top text-xs text-slate-500" colSpan={3}>
      Enter para guardar, Esc para cancelar.
    </td>
    <td className="min-w-[120px] px-3 py-2 align-top">
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onCancel}
          disabled={isSaving}
        >
          <X size={15} />
        </Button>
        <Button
          type="button"
          size="icon"
          className="size-8"
          onClick={onSave}
          disabled={isSaving}
        >
          <Check size={15} />
        </Button>
      </div>
    </td>
  </tr>
);

const StructureActionButton = ({
  children,
  onClick,
}: {
  children: any;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
  >
    {children}
  </button>
);

const LevelStructureContextMenuItems = ({
  level,
  depth,
  onStartStructureDraft,
  onDeleteLevel,
}: {
  level: Level;
  depth: number;
  onStartStructureDraft: (draft: StructureDraft) => void;
  onDeleteLevel: (level: Level) => void;
}) => (
  <>
    <ContextMenuLabel>Acciones de nivel</ContextMenuLabel>
    <ContextMenuItem
      onSelect={() =>
        onStartStructureDraft({
          kind: 'EDIT_LEVEL',
          levelId: level.id,
          depth,
          defaultName: level.name || '',
        })
      }
    >
      <Pencil size={14} />
      Editar
    </ContextMenuItem>
    <ContextMenuItem
      variant="destructive"
      onSelect={() => onDeleteLevel(level)}
    >
      <Trash2 size={14} />
      Eliminar
    </ContextMenuItem>
    <ContextMenuItem
      onSelect={() =>
        onStartStructureDraft({
          kind: 'DUPLICATE_LEVEL',
          levelId: level.id,
          depth,
          defaultName: `${level.name || 'Nivel'} copia`,
        })
      }
    >
      <Copy size={14} />
      Duplicar
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem
      onSelect={() =>
        onStartStructureDraft({
          kind: 'LEVEL_SIBLING',
          levelId: level.id,
          position: 'upper',
          depth,
        })
      }
    >
      <ChevronDown className="rotate-180" size={14} />
      Agregar arriba
    </ContextMenuItem>
    <ContextMenuItem
      onSelect={() =>
        onStartStructureDraft({
          kind: 'LEVEL_SIBLING',
          levelId: level.id,
          position: 'lower',
          depth,
        })
      }
    >
      <ChevronDown size={14} />
      Agregar abajo
    </ContextMenuItem>
    <ContextMenuItem
      onSelect={() =>
        onStartStructureDraft({
          kind: 'LEVEL_CHILD',
          levelId: level.id,
          stageId: level.stagesId,
          depth: depth + 1,
        })
      }
    >
      <FolderTree size={14} />
      Agregar nivel anidado
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem
      onSelect={() =>
        onStartStructureDraft({
          kind: 'SUBTASK_CHILD',
          levelId: level.id,
          depth: depth + 1,
        })
      }
    >
      <Plus size={14} />
      Agregar subtarea
    </ContextMenuItem>
  </>
);

const TaskStructureContextMenuItems = ({
  task,
  depth,
  onStartStructureDraft,
  onDeleteTask,
}: {
  task: SubTask;
  depth: number;
  onStartStructureDraft: (draft: StructureDraft) => void;
  onDeleteTask: (task: SubTask) => void;
}) => (
  <>
    <ContextMenuLabel>Acciones de subtarea</ContextMenuLabel>
    <ContextMenuItem
      onSelect={() =>
        onStartStructureDraft({
          kind: 'EDIT_TASK',
          subtaskId: task.id,
          depth,
          defaultName: task.name,
        })
      }
    >
      <Pencil size={14} />
      Editar
    </ContextMenuItem>
    <ContextMenuItem variant="destructive" onSelect={() => onDeleteTask(task)}>
      <Trash2 size={14} />
      Eliminar
    </ContextMenuItem>
    <ContextMenuItem
      onSelect={() =>
        onStartStructureDraft({
          kind: 'DUPLICATE_TASK',
          subtaskId: task.id,
          depth,
          defaultName: `${task.name} copia`,
        })
      }
    >
      <Copy size={14} />
      Duplicar
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem
      onSelect={() =>
        onStartStructureDraft({
          kind: 'TASK_SIBLING',
          subtaskId: task.id,
          position: 'upper',
          depth,
        })
      }
    >
      <ChevronDown className="rotate-180" size={14} />
      Agregar arriba
    </ContextMenuItem>
    <ContextMenuItem
      onSelect={() =>
        onStartStructureDraft({
          kind: 'TASK_SIBLING',
          subtaskId: task.id,
          position: 'lower',
          depth,
        })
      }
    >
      <ChevronDown size={14} />
      Agregar abajo
    </ContextMenuItem>
  </>
);

const TaskRow = ({
  task,
  depth,
  commitments,
  selected,
  onToggleTask,
  memberships,
  draft,
  structureDraft,
  structureDraftValue,
  structureDraftSaving,
  onStartStructureDraft,
  onDeleteTask,
  onStructureDraftChange,
  onCancelStructureDraft,
  onSaveStructureDraft,
  onInlineAssigneesChange,
  onOpenCommitment,
  workspacePhase,
  onOpenExecution,
  onOpenDirectReassign,
  onSelfAssignTask,
  selfAssigningTaskId,
  onTaskFilesUpdated,
  autoOpenTaskFilesId,
  workUnitId,
  selectedProjectId,
  selectedStageId,
  onInlineExecutionDrop,
  quickUploadPercentage,
  onQuickUploadPercentageChange,
  onQuickUploadFiles,
  reviewComment,
  reviewPending,
  onReviewCommentChange,
  onReviewTask,
  valuationDrafts,
  valuationMonthlyPrice,
  onValuationDaysChange,
  onValuationAmountChange,
  executionActive,
  executionUploading,
  focused,
  currentUserId,
  canManageCurrentUnit,
}: {
  task: SubTask;
  depth: number;
  commitments?: Commitment[];
  selected: boolean;
  onToggleTask: (taskId: number) => void;
  memberships: OfficeProjectModerator[];
  draft: CommitmentDraft;
  structureDraft: StructureDraft | null;
  structureDraftValue: string;
  structureDraftSaving: boolean;
  onStartStructureDraft: (draft: StructureDraft) => void;
  onDeleteTask: (task: SubTask) => void;
  onStructureDraftChange: (value: string) => void;
  onCancelStructureDraft: () => void;
  onSaveStructureDraft: () => void;
  onInlineAssigneesChange: (node: TechnicalNodeRef, userIds: number[]) => void;
  onOpenCommitment: (commitment: Commitment, node?: TechnicalNodeRef) => void;
  workspacePhase: WorkspacePhase;
  onOpenExecution: (task: SubTask) => void;
  onOpenDirectReassign: (task: SubTask) => void;
  onSelfAssignTask: (task: SubTask) => void;
  selfAssigningTaskId?: number | null;
  onTaskFilesUpdated: (task: SubTask) => void;
  autoOpenTaskFilesId: number | null;
  workUnitId?: string | null;
  selectedProjectId?: number | null;
  selectedStageId?: number | null;
  onInlineExecutionDrop: (task: SubTask, files: FileList) => void;
  quickUploadPercentage?: string;
  onQuickUploadPercentageChange: (taskId: number, value: string) => void;
  onQuickUploadFiles: (task: SubTask, files: FileList) => void;
  reviewComment?: string;
  reviewPending?: boolean;
  onReviewCommentChange: (nodeKey: string, value: string) => void;
  onReviewTask: (
    task: SubTask,
    decision: CommitmentReviewDecision,
    target: ReturnType<typeof reviewContextForNode> | null
  ) => void;
  valuationDrafts: Record<number, ValuationDraft>;
  valuationMonthlyPrice: number;
  onValuationDaysChange: (task: SubTask, value: string) => void;
  onValuationAmountChange: (task: SubTask, value: string) => void;
  executionActive?: boolean;
  executionUploading?: boolean;
  focused?: boolean;
  currentUserId?: number;
  canManageCurrentUnit?: boolean;
}) => {
  const [filesOpen, setFilesOpen] = useState(false);
  const [newSubmissionOpen, setNewSubmissionOpen] = useState(false);
  useEffect(() => {
    if (autoOpenTaskFilesId === task.id) setFilesOpen(true);
  }, [autoOpenTaskFilesId, task.id]);

  const assigneeValue = selected ? draft.assigneeUserIds : [];
  const nodeRef: TechnicalNodeRef = { type: 'TASK', id: task.id };
  const currentAssigneeLabel = taskAssigneeNames(task).join(', ');
  const hasCurrentAssignee = Boolean(currentAssigneeLabel);
  const draftBeforeTask =
    structureDraft?.kind === 'TASK_SIBLING' &&
    structureDraft.subtaskId === task.id &&
    structureDraft.position === 'upper';
  const draftAfterTask =
    structureDraft &&
    ((structureDraft.kind === 'TASK_SIBLING' &&
      structureDraft.subtaskId === task.id &&
      structureDraft.position === 'lower') ||
      (structureDraft.kind === 'EDIT_TASK' &&
        structureDraft.subtaskId === task.id) ||
      (structureDraft.kind === 'DUPLICATE_TASK' &&
        structureDraft.subtaskId === task.id));
  const isWorkPhase = workspacePhase === 'trabajo-tecnico';
  const isReviewPhase = workspacePhase === 'revision';
  const isValuationPhase = workspacePhase === 'valorizacion';
  const canSelfAssign =
    isWorkPhase &&
    task.status === 'UNRESOLVED' &&
    !selected &&
    !hasCurrentAssignee &&
    Boolean(currentUserId) &&
    (Boolean(canManageCurrentUnit) ||
      memberships.some(membership => membership.user.id === currentUserId));
  const executionAllowed = canExecuteTask(
    task,
    currentUserId,
    canManageCurrentUnit
  );
  const canCreateNextSubmission =
    task.status === 'INREVIEW' &&
    Boolean(currentUserId) &&
    (Boolean(canManageCurrentUnit) ||
      taskAssignments(task).some(
        assignment =>
          assignment.status !== false && assignment.userId === currentUserId
      ));
  const taskOpenAllowed = canOpenTask(
    task,
    currentUserId,
    canManageCurrentUnit
  );
  const normalizedLastFeedback = getTaskLastFeedback(task);
  const uploadLockedByStatus = [
    'INREVIEW',
    'REVIEWED',
    'DONE',
    'LIQUIDATION',
  ].includes(task.status);
  const quickPercentage = quickUploadPercentage ?? '100';
  const reviewTarget = reviewContextForNode(commitments, {
    type: 'TASK',
    id: task.id,
  });
  const latestCommitmentReview = latestReviewForContext(
    reviewTarget?.commitment,
    reviewTarget?.context?.id
  );
  const taskReviewDisabledReason = taskReviewBlockedReason(
    task,
    Boolean(canManageCurrentUnit),
    Boolean(latestCommitmentReview)
  );
  const taskCanReview = !taskReviewDisabledReason;
  const taskReviewer = reviewerLabel(normalizedLastFeedback?.reviewer);
  const taskS10Code = formatS10Item(task.item || task.id);
  const taskCommentValue = taskCanReview
    ? reviewComment ??
      latestCommitmentReview?.comment ??
      normalizedLastFeedback?.comment ??
      ''
    : latestCommitmentReview?.comment ?? normalizedLastFeedback?.comment ?? '';
  const valuationTotals = taskValuationTotals(
    task,
    valuationMonthlyPrice,
    valuationDrafts
  );
  const valuationChanged = Boolean(valuationDrafts[task.id]);
  const valuationReadonly = !canManageCurrentUnit;
  const openExecutionIfAllowed = (event: MouseEvent<HTMLTableRowElement>) => {
    const target = event.target as HTMLElement;
    if (
      target.closest(
        'button,input,textarea,label,a,[role="checkbox"],[data-no-row-open="true"]'
      )
    ) {
      return;
    }
    if (isWorkPhase && taskOpenAllowed) onOpenExecution(task);
  };
  const handleExecutionDrop = (event: DragEvent<HTMLTableRowElement>) => {
    if (!isWorkPhase || !executionAllowed) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files.length) {
      onInlineExecutionDrop(task, event.dataTransfer.files);
    }
  };
  return (
    <>
      {draftBeforeTask && (
        <StructureDraftRow
          draft={structureDraft}
          value={structureDraftValue}
          isSaving={structureDraftSaving}
          onChange={onStructureDraftChange}
          onCancel={onCancelStructureDraft}
          onSave={onSaveStructureDraft}
        />
      )}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <tr
            data-technical-task-id={task.id}
            className={`border-t border-slate-200 ${
              focused
                ? 'bg-cyan-50 ring-1 ring-inset ring-cyan-300'
                : executionActive
                ? 'bg-blue-50'
                : executionUploading
                ? 'bg-sky-50'
                : commitmentRowClass(commitments)
            } ${
              isWorkPhase && taskOpenAllowed
                ? 'cursor-pointer hover:bg-blue-50/70'
                : ''
            }`}
            onClick={openExecutionIfAllowed}
            onDragOver={event => {
              if (isWorkPhase && executionAllowed) event.preventDefault();
            }}
            onDrop={handleExecutionDrop}
          >
            <td className="min-w-[420px] px-3 py-1 align-middle">
              <div
                className="technicalTree-s10Node technicalTree-s10Task flex min-w-0 items-center gap-2"
                style={{ paddingLeft: `${Math.max(depth, 0) * 14}px` }}
              >
                {isWorkPhase && (
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => onToggleTask(task.id)}
                    className="shrink-0"
                    aria-label={`Seleccionar subtarea ${task.name}`}
                  />
                )}
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="technicalTree-s10Code shrink-0 font-mono text-[0.76rem] font-semibold tabular-nums text-slate-600">
                    {taskS10Code}
                  </span>
                  <span
                    className="technicalTree-s10Name line-clamp-2 min-w-0 text-sm font-medium leading-4 text-slate-900"
                    title={task.name}
                  >
                    {task.name}
                  </span>
                </div>
              </div>
            </td>
            <td className="min-w-[140px] px-3 py-1 align-middle">
              <Badge variant={statusVariant(task.status)}>
                {taskStatusLabel[task.status] ?? task.status}
              </Badge>
            </td>
            {isReviewPhase ? (
              <>
                <td className="min-w-[220px] px-3 py-3 align-top text-sm text-slate-600">
                  {currentAssigneeLabel || 'Sin responsable'}
                </td>
                <td className="min-w-[150px] px-3 py-3 align-top">
                  <div className="space-y-1">
                    <ReviewDecisionControl
                      value={latestCommitmentReview?.decision}
                      disabled={!taskCanReview}
                      disabledReason={taskReviewDisabledReason}
                      isPending={reviewPending}
                      onSelect={decision =>
                        onReviewTask(task, decision, reviewTarget)
                      }
                    />
                    {taskReviewDisabledReason && (
                      <Badge variant="outline">
                        {taskReviewDisabledReason}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="min-w-[280px] px-3 py-3 align-top">
                  <Textarea
                    value={taskCommentValue}
                    onChange={event =>
                      onReviewCommentChange(
                        `TASK:${task.id}`,
                        event.target.value
                      )
                    }
                    placeholder={
                      taskReviewDisabledReason || 'Comentario de revision'
                    }
                    className={`min-h-16 resize-y text-sm ${
                      taskCanReview ? 'bg-white' : 'bg-slate-50 text-slate-500'
                    }`}
                    disabled={!taskCanReview || reviewPending}
                  />
                </td>
                <td className="min-w-[170px] px-3 py-3 align-top text-xs text-slate-500">
                  {taskReviewer ? (
                    <div>
                      <p className="font-medium text-slate-700">
                        {taskReviewer}
                      </p>
                      <p>{normalizedLastFeedback?.type}</p>
                    </div>
                  ) : latestCommitmentReview ? (
                    <div>
                      <p className="font-medium text-slate-700">
                        {latestCommitmentReview.reviewedBy
                          ? formatUserName(latestCommitmentReview.reviewedBy)
                          : 'Revision registrada'}
                      </p>
                      <p>{formatDateTime(latestCommitmentReview.reviewedAt)}</p>
                    </div>
                  ) : (
                    'Sin historial'
                  )}
                </td>
                <td className="min-w-[160px] px-3 py-3 align-top">
                  <CommitmentBadge commitments={commitments} />
                </td>
              </>
            ) : isValuationPhase ? (
              <>
                <td className="min-w-[150px] px-3 py-3 align-top">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={String(valuationTotals.days)}
                    disabled={valuationReadonly}
                    onChange={event =>
                      onValuationDaysChange(task, event.target.value)
                    }
                    className="h-8 bg-white"
                  />
                  {valuationChanged && (
                    <Badge variant="warning" className="mt-1">
                      Pendiente
                    </Badge>
                  )}
                </td>
                <td className="min-w-[170px] px-3 py-3 align-top">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={String(valuationTotals.amount)}
                    disabled={valuationReadonly || valuationMonthlyPrice <= 0}
                    onChange={event =>
                      onValuationAmountChange(task, event.target.value)
                    }
                    className="h-8 bg-white"
                  />
                  {valuationMonthlyPrice <= 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      Define costo mensual
                    </p>
                  )}
                </td>
                <td className="min-w-[150px] px-3 py-3 align-top text-sm text-slate-600">
                  {formatValuationMoney(valuationTotals.spending)}
                </td>
                <td className="min-w-[150px] px-3 py-3 align-top text-sm font-semibold text-slate-700">
                  {formatValuationMoney(valuationTotals.balance)}
                </td>
              </>
            ) : (
              <>
                <td className="min-w-[240px] px-3 py-1 align-middle">
                  <div className="flex items-center gap-1">
                    {!selected && hasCurrentAssignee && canManageCurrentUnit ? (
                      <button
                        type="button"
                        className="max-w-[220px] text-left text-xs text-slate-600 underline-offset-2 hover:text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-300"
                        title="Reasignar responsable tecnico"
                        onClick={event => {
                          event.stopPropagation();
                          onOpenDirectReassign(task);
                        }}
                      >
                        <span className="line-clamp-2">
                          {currentAssigneeLabel}
                        </span>
                      </button>
                    ) : (
                      <InlineAssigneePicker
                        memberships={memberships}
                        value={assigneeValue}
                        displayLabel={
                          !selected && hasCurrentAssignee
                            ? currentAssigneeLabel
                            : undefined
                        }
                        onChange={userIds =>
                          onInlineAssigneesChange(nodeRef, userIds)
                        }
                      />
                    )}
                    {canSelfAssign && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                            disabled={selfAssigningTaskId === task.id}
                            onClick={event => {
                              event.stopPropagation();
                              onSelfAssignTask(task);
                            }}
                            aria-label="Asignarme como responsable tecnico"
                          >
                            <UserPlus size={16} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Asignarme como responsable tecnico
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  {!selected && !hasCurrentAssignee && (
                    <p className="mt-1 text-xs text-slate-500">
                      Sin responsable
                    </p>
                  )}
                </td>
                <td className="min-w-[150px] px-3 py-1 align-middle">
                  <DueDatePreviewCell
                    commitments={commitments}
                    onOpenCommitment={commitment =>
                      onOpenCommitment(commitment, nodeRef)
                    }
                  />
                </td>
                <td className="min-w-[160px] px-3 py-1 align-middle">
                  <CommitmentBadge
                    commitments={commitments}
                    onOpenCommitment={commitment =>
                      onOpenCommitment(commitment, nodeRef)
                    }
                  />
                </td>
                <td className="min-w-[240px] px-3 py-1 align-middle">
                  {uploadLockedByStatus ? (
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {task.status === 'INREVIEW' &&
                          canCreateNextSubmission && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={event => {
                                    event.stopPropagation();
                                    setFilesOpen(true);
                                    setNewSubmissionOpen(true);
                                  }}
                                >
                                  <Plus size={13} />
                                  Nuevo entregable
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Crea una versión con mayor avance y conserva la
                                pendiente como reemplazada.
                              </TooltipContent>
                            </Tooltip>
                          )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                              onClick={event => {
                                event.stopPropagation();
                                setFilesOpen(open => !open);
                              }}
                            >
                              <FileText size={13} />
                              {filesOpen ? 'Ocultar archivos' : 'Ver archivos'}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {filesOpen
                              ? 'Cierra el detalle de archivos e historial.'
                              : 'Muestra los archivos y las versiones enviadas.'}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {task.status === 'INREVIEW'
                          ? canCreateNextSubmission
                            ? 'Puedes registrar una version mas avanzada sin esperar la revision.'
                            : 'Envio pendiente de revision.'
                          : 'Este estado no permite subir desde la tabla.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          className={`inline-flex h-8 cursor-pointer items-center gap-1 rounded-md px-3 text-xs font-semibold ${
                            executionAllowed && !executionUploading
                              ? 'bg-sky-600 text-white hover:bg-sky-700'
                              : 'cursor-not-allowed bg-slate-100 text-slate-400'
                          }`}
                          onClick={event => event.stopPropagation()}
                        >
                          <UploadCloud size={14} />
                          {executionUploading ? 'Subiendo...' : 'Subir archivo'}
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            disabled={!executionAllowed || executionUploading}
                            onChange={event => {
                              event.stopPropagation();
                              if (event.target.files?.length) {
                                onQuickUploadFiles(task, event.target.files);
                                event.target.value = '';
                              }
                            }}
                          />
                        </label>
                        <label
                          className="inline-flex items-center gap-1 text-xs text-slate-600"
                          onClick={event => event.stopPropagation()}
                        >
                          Avance
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={quickPercentage}
                            disabled={!executionAllowed || executionUploading}
                            onChange={event =>
                              onQuickUploadPercentageChange(
                                task.id,
                                event.target.value
                              )
                            }
                            className="h-8 w-16 bg-white text-xs"
                          />
                          %
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                          onClick={event => {
                            event.stopPropagation();
                            setFilesOpen(open => !open);
                          }}
                        >
                          <FileText size={13} />
                          {executionUploading
                            ? 'Procesando'
                            : filesOpen
                            ? 'Ocultar archivos'
                            : 'Ver archivos'}
                        </Button>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {executionAllowed && !hasCurrentAssignee
                          ? 'Se te asignara al subir y se enviara a revision.'
                          : 'Click en el nombre o fila para abrir la tarea.'}
                      </p>
                    </>
                  )}
                </td>
              </>
            )}
          </tr>
        </ContextMenuTrigger>
        {isWorkPhase && (
          <ContextMenuContent className="w-56">
            <TaskStructureContextMenuItems
              task={task}
              depth={depth}
              onStartStructureDraft={onStartStructureDraft}
              onDeleteTask={onDeleteTask}
            />
          </ContextMenuContent>
        )}
      </ContextMenu>
      {isWorkPhase && filesOpen && (
        <TaskFilesDisclosureRow
          task={task}
          depth={depth}
          colSpan={6}
          unitId={workUnitId}
          projectId={selectedProjectId}
          stageId={selectedStageId}
          canCreateNextSubmission={canCreateNextSubmission}
          newSubmissionOpen={newSubmissionOpen}
          onNewSubmissionOpenChange={setNewSubmissionOpen}
          onTaskUpdated={onTaskFilesUpdated}
        />
      )}
      {draftAfterTask && (
        <StructureDraftRow
          draft={structureDraft}
          value={structureDraftValue}
          isSaving={structureDraftSaving}
          onChange={onStructureDraftChange}
          onCancel={onCancelStructureDraft}
          onSave={onSaveStructureDraft}
        />
      )}
    </>
  );
};

const LevelRows = ({
  level,
  depth = 0,
  buckets,
  expandedLevelIds,
  forceExpandedLevelIds,
  onToggleLevel,
  selection,
  onToggleLevelSelection,
  onToggleTaskSelection,
  memberships,
  draft,
  structureDraft,
  structureDraftValue,
  structureDraftSaving,
  onStartStructureDraft,
  onDeleteLevel,
  onDeleteTask,
  onStructureDraftChange,
  onCancelStructureDraft,
  onSaveStructureDraft,
  onInlineAssigneesChange,
  onOpenCommitment,
  workspacePhase,
  onOpenExecution,
  onOpenDirectReassign,
  onSelfAssignTask,
  selfAssigningTaskId,
  onTaskFilesUpdated,
  autoOpenTaskFilesId,
  workUnitId,
  selectedProjectId,
  selectedStageId,
  onInlineExecutionDrop,
  quickUploadPercentages,
  onQuickUploadPercentageChange,
  onQuickUploadFiles,
  onCompressLevel,
  compressingLevelKey,
  reviewComments,
  reviewApplyChildren,
  reviewPendingNodeKey,
  onReviewCommentChange,
  onReviewApplyChildrenChange,
  onReviewLevel,
  onReviewTask,
  valuationDrafts,
  valuationMonthlyPrice,
  onValuationDaysChange,
  onValuationAmountChange,
  activeExecutionTaskId,
  uploadingTaskIds,
  focusedTaskId,
  currentUserId,
  canManageCurrentUnit,
}: {
  level: Level;
  depth?: number;
  buckets: CommitmentBuckets;
  expandedLevelIds: Set<number>;
  forceExpandedLevelIds?: Set<number>;
  onToggleLevel: (levelId: number) => void;
  selection: SelectionState;
  onToggleLevelSelection: (level: Level) => void;
  onToggleTaskSelection: (taskId: number) => void;
  memberships: OfficeProjectModerator[];
  draft: CommitmentDraft;
  structureDraft: StructureDraft | null;
  structureDraftValue: string;
  structureDraftSaving: boolean;
  onStartStructureDraft: (draft: StructureDraft) => void;
  onDeleteLevel: (level: Level) => void;
  onDeleteTask: (task: SubTask) => void;
  onStructureDraftChange: (value: string) => void;
  onCancelStructureDraft: () => void;
  onSaveStructureDraft: () => void;
  onInlineAssigneesChange: (node: TechnicalNodeRef, userIds: number[]) => void;
  onOpenCommitment: (commitment: Commitment, node?: TechnicalNodeRef) => void;
  workspacePhase: WorkspacePhase;
  onOpenExecution: (task: SubTask) => void;
  onOpenDirectReassign: (task: SubTask) => void;
  onSelfAssignTask: (task: SubTask) => void;
  selfAssigningTaskId?: number | null;
  onTaskFilesUpdated: (task: SubTask) => void;
  autoOpenTaskFilesId: number | null;
  workUnitId?: string | null;
  selectedProjectId?: number | null;
  selectedStageId?: number | null;
  onInlineExecutionDrop: (task: SubTask, files: FileList) => void;
  quickUploadPercentages: Record<number, string>;
  onQuickUploadPercentageChange: (taskId: number, value: string) => void;
  onQuickUploadFiles: (task: SubTask, files: FileList) => void;
  onCompressLevel: (
    level: Level,
    type: 'all' | 'pdf' | 'nopdf' | 'merge'
  ) => void;
  compressingLevelKey?: string | null;
  reviewComments: Record<string, string>;
  reviewApplyChildren: Record<number, boolean>;
  reviewPendingNodeKey?: string;
  onReviewCommentChange: (nodeKey: string, value: string) => void;
  onReviewApplyChildrenChange: (levelId: number, value: boolean) => void;
  onReviewLevel: (
    level: Level,
    decision: CommitmentReviewDecision,
    target: ReturnType<typeof reviewContextForNode> | null
  ) => void;
  onReviewTask: (
    task: SubTask,
    decision: CommitmentReviewDecision,
    target: ReturnType<typeof reviewContextForNode> | null
  ) => void;
  valuationDrafts: Record<number, ValuationDraft>;
  valuationMonthlyPrice: number;
  onValuationDaysChange: (task: SubTask, value: string) => void;
  onValuationAmountChange: (task: SubTask, value: string) => void;
  activeExecutionTaskId?: number;
  uploadingTaskIds: Set<number>;
  focusedTaskId?: number | null;
  currentUserId?: number;
  canManageCurrentUnit?: boolean;
}) => {
  const childLevels = level.nextLevel ?? [];
  const tasks = level.subTasks ?? [];
  const showSelf = level.level > 0 || Boolean(level.name);
  const hasChildren = Boolean(childLevels.length || tasks.length);
  const isExpanded =
    expandedLevelIds.has(level.id) ||
    forceExpandedLevelIds?.has(level.id) ||
    !showSelf;
  const FolderIcon = isExpanded ? FolderOpen : FolderTree;
  const descendantTaskIds = collectTaskIds(level);
  const selectedDescendantTasks = descendantTaskIds.filter(taskId =>
    selection.taskIds.has(taskId)
  ).length;
  const levelChecked = selection.levelIds.has(level.id);
  const hasDescendantTasks = descendantTaskIds.length > 0;
  const levelSelectionState =
    levelChecked ||
    (hasDescendantTasks && selectedDescendantTasks === descendantTaskIds.length)
      ? true
      : selectedDescendantTasks > 0
      ? 'indeterminate'
      : false;
  const levelCommitments = buckets.byLevel.get(level.id);
  const levelAssigneeValue = levelChecked ? draft.assigneeUserIds : [];
  const levelCurrentAssigneeLabel = level.user?.profile
    ? `${level.user.profile.firstName} ${level.user.profile.lastName}`
    : commitmentAssigneeNames(levelCommitments).join(', ');
  const hasLevelCurrentAssignee = Boolean(levelCurrentAssigneeLabel);
  const levelNodeRef: TechnicalNodeRef = { type: 'LEVEL', id: level.id };
  const isWorkPhase = workspacePhase === 'trabajo-tecnico';
  const isReviewPhase = workspacePhase === 'revision';
  const isValuationPhase = workspacePhase === 'valorizacion';
  const reviewStats = taskReviewStats(level);
  const valuationTotals = levelValuationTotals(
    level,
    valuationMonthlyPrice,
    valuationDrafts
  );
  const levelReviewTarget = reviewContextForNode(levelCommitments, {
    type: 'LEVEL',
    id: level.id,
  });
  const levelS10Code = formatS10Item(level.item || level.id);
  const latestLevelReview = latestReviewForContext(
    levelReviewTarget?.commitment,
    levelReviewTarget?.context?.id
  );
  const levelNodeKey = `LEVEL:${level.id}`;
  const levelReviewDisabledReason = !canManageCurrentUnit
    ? 'Solo gestores pueden revisar'
    : !levelReviewTarget
    ? 'No hay compromiso asociado al nivel'
    : latestLevelReview
    ? 'Ya revisado'
    : '';
  const levelCanReview = !levelReviewDisabledReason;
  const levelCommentValue = levelCanReview
    ? reviewComments[levelNodeKey] ?? latestLevelReview?.comment ?? ''
    : latestLevelReview?.comment ?? '';
  const draftBeforeLevel =
    structureDraft?.kind === 'LEVEL_SIBLING' &&
    structureDraft.levelId === level.id &&
    structureDraft.position === 'upper';
  const draftAfterLevel =
    structureDraft &&
    ((structureDraft.kind === 'LEVEL_SIBLING' &&
      structureDraft.levelId === level.id &&
      structureDraft.position === 'lower') ||
      (structureDraft.kind === 'EDIT_LEVEL' &&
        structureDraft.levelId === level.id) ||
      (structureDraft.kind === 'LEVEL_CHILD' &&
        structureDraft.levelId === level.id) ||
      (structureDraft.kind === 'SUBTASK_CHILD' &&
        structureDraft.levelId === level.id) ||
      (structureDraft.kind === 'DUPLICATE_LEVEL' &&
        structureDraft.levelId === level.id));
  return (
    <>
      {draftBeforeLevel && (
        <StructureDraftRow
          draft={structureDraft}
          value={structureDraftValue}
          isSaving={structureDraftSaving}
          onChange={onStructureDraftChange}
          onCancel={onCancelStructureDraft}
          onSave={onSaveStructureDraft}
        />
      )}
      {showSelf && (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <tr
              className={`border-t border-slate-200 ${commitmentRowClass(
                levelCommitments,
                'bg-slate-50'
              )}`}
            >
              <td className="min-w-[420px] px-3 py-1 align-middle">
                <div
                  className="technicalTree-s10Node technicalTree-s10Level flex min-w-0 items-center gap-2"
                  style={{ paddingLeft: `${Math.max(depth, 0) * 14}px` }}
                >
                  {isWorkPhase && (
                    <Checkbox
                      checked={levelSelectionState}
                      onCheckedChange={() => onToggleLevelSelection(level)}
                      className="shrink-0"
                      aria-label={`Seleccionar nivel ${level.name || level.id}`}
                    />
                  )}
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => onToggleLevel(level.id)}
                      className="inline-flex size-5 shrink-0 items-center justify-center rounded text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      aria-label={
                        isExpanded
                          ? `Contraer ${level.name || 'nivel'}`
                          : `Desplegar ${level.name || 'nivel'}`
                      }
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                  ) : (
                    <span className="size-5 shrink-0" />
                  )}
                  <FolderIcon className="size-4 shrink-0 text-blue-700" />
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="technicalTree-s10Code shrink-0 font-mono text-[0.76rem] font-bold tabular-nums text-blue-700">
                      {levelS10Code}
                    </span>
                    <button
                      type="button"
                      onClick={() => hasChildren && onToggleLevel(level.id)}
                      className="technicalTree-s10Name line-clamp-2 min-w-0 text-left text-sm font-semibold uppercase leading-4 text-slate-950 hover:text-blue-700 disabled:hover:text-slate-950"
                      disabled={!hasChildren}
                      title={level.name || 'Nivel sin nombre'}
                    >
                      {level.name || 'Nivel sin nombre'}
                    </button>
                  </div>
                </div>
              </td>
              <td className="min-w-[140px] px-3 py-1 align-middle">
                <Badge variant="outline">Nivel</Badge>
              </td>
              {isReviewPhase ? (
                <>
                  <td className="min-w-[220px] px-3 py-3 align-top text-sm text-slate-500">
                    <span className="font-medium text-slate-700">
                      {reviewStats.inReview} en revision
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      {reviewStats.reviewed} revisadas, {reviewStats.rejected}{' '}
                      observadas
                    </p>
                  </td>
                  <td className="min-w-[150px] px-3 py-3 align-top">
                    <div className="space-y-2">
                      <ReviewDecisionControl
                        value={latestLevelReview?.decision}
                        disabled={!levelCanReview}
                        disabledReason={levelReviewDisabledReason}
                        isPending={reviewPendingNodeKey === levelNodeKey}
                        onSelect={decision =>
                          onReviewLevel(level, decision, levelReviewTarget)
                        }
                      />
                      {levelReviewDisabledReason && (
                        <Badge variant="outline">
                          {!levelReviewTarget
                            ? 'Sin compromiso'
                            : levelReviewDisabledReason}
                        </Badge>
                      )}
                      {levelCanReview && reviewStats.inReview > 0 && (
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <Checkbox
                            checked={Boolean(reviewApplyChildren[level.id])}
                            onCheckedChange={checked =>
                              onReviewApplyChildrenChange(
                                level.id,
                                checked === true
                              )
                            }
                          />
                          Aplicar Si a subtareas en revision
                        </label>
                      )}
                    </div>
                  </td>
                  <td className="min-w-[280px] px-3 py-3 align-top">
                    <Textarea
                      value={levelCommentValue}
                      onChange={event =>
                        onReviewCommentChange(levelNodeKey, event.target.value)
                      }
                      placeholder={
                        levelReviewDisabledReason ||
                        'Comentario de revision del nivel'
                      }
                      className={`min-h-16 resize-y text-sm ${
                        levelCanReview
                          ? 'bg-white'
                          : 'bg-slate-50 text-slate-500'
                      }`}
                      disabled={
                        !levelCanReview || reviewPendingNodeKey === levelNodeKey
                      }
                    />
                  </td>
                  <td className="min-w-[170px] px-3 py-3 align-top text-xs text-slate-500">
                    {latestLevelReview ? (
                      <div>
                        <p className="font-medium text-slate-700">
                          {latestLevelReview.reviewedBy
                            ? formatUserName(latestLevelReview.reviewedBy)
                            : 'Revision registrada'}
                        </p>
                        <p>{formatDateTime(latestLevelReview.reviewedAt)}</p>
                      </div>
                    ) : (
                      'Sin historial'
                    )}
                  </td>
                  <td className="min-w-[160px] px-3 py-3 align-top">
                    <CommitmentBadge commitments={levelCommitments} />
                  </td>
                </>
              ) : isValuationPhase ? (
                <>
                  <td className="min-w-[150px] px-3 py-3 align-top text-sm font-semibold text-slate-700">
                    {roundValuation(valuationTotals.days, 2)}
                  </td>
                  <td className="min-w-[170px] px-3 py-3 align-top text-sm font-semibold text-slate-700">
                    {formatValuationMoney(valuationTotals.amount)}
                  </td>
                  <td className="min-w-[150px] px-3 py-3 align-top text-sm text-slate-600">
                    {formatValuationMoney(valuationTotals.spending)}
                  </td>
                  <td className="min-w-[150px] px-3 py-3 align-top text-sm font-semibold text-slate-700">
                    {formatValuationMoney(valuationTotals.balance)}
                  </td>
                </>
              ) : (
                <>
                  <td className="min-w-[240px] px-3 py-1 align-middle">
                    <InlineAssigneePicker
                      memberships={memberships}
                      value={levelAssigneeValue}
                      displayLabel={
                        !levelChecked && hasLevelCurrentAssignee
                          ? levelCurrentAssigneeLabel
                          : undefined
                      }
                      onChange={userIds =>
                        onInlineAssigneesChange(levelNodeRef, userIds)
                      }
                    />
                    {!levelChecked && !hasLevelCurrentAssignee && (
                      <p className="mt-1 text-xs text-slate-500">
                        Sin responsable directo
                      </p>
                    )}
                  </td>
                  <td className="min-w-[150px] px-3 py-1 align-middle">
                    <DueDatePreviewCell
                      commitments={levelCommitments}
                      onOpenCommitment={commitment =>
                        onOpenCommitment(commitment, levelNodeRef)
                      }
                    />
                  </td>
                  <td className="min-w-[160px] px-3 py-1 align-middle">
                    <CommitmentBadge
                      commitments={levelCommitments}
                      onOpenCommitment={commitment =>
                        onOpenCommitment(commitment, levelNodeRef)
                      }
                    />
                  </td>
                  <td className="min-w-[180px] px-3 py-1 align-middle">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={Boolean(compressingLevelKey)}
                        >
                          <Download size={14} />
                          {compressingLevelKey?.startsWith(`${level.id}:`)
                            ? 'Preparando...'
                            : 'Comprimir'}
                          <ChevronDown size={14} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-1" align="end">
                        {[
                          ['all', 'ZIP Comprimir'],
                          ['pdf', 'PDF Comprimir PDF'],
                          ['nopdf', 'DOC Comprimir editables'],
                          ['merge', 'PDF+ Unir PDFs'],
                        ].map(([type, label]) => (
                          <StructureActionButton
                            key={type}
                            onClick={() =>
                              onCompressLevel(
                                level,
                                type as 'all' | 'pdf' | 'nopdf' | 'merge'
                              )
                            }
                          >
                            <Download size={14} />
                            {label}
                          </StructureActionButton>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </td>
                </>
              )}
            </tr>
          </ContextMenuTrigger>
          {isWorkPhase && (
            <ContextMenuContent className="w-56">
              <LevelStructureContextMenuItems
                level={level}
                depth={depth}
                onStartStructureDraft={onStartStructureDraft}
                onDeleteLevel={onDeleteLevel}
              />
            </ContextMenuContent>
          )}
        </ContextMenu>
      )}
      {draftAfterLevel && (
        <StructureDraftRow
          draft={structureDraft}
          value={structureDraftValue}
          isSaving={structureDraftSaving}
          onChange={onStructureDraftChange}
          onCancel={onCancelStructureDraft}
          onSave={onSaveStructureDraft}
        />
      )}
      {isExpanded &&
        tasks.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            depth={depth + 1}
            commitments={buckets.byTask.get(task.id)}
            selected={selection.taskIds.has(task.id)}
            onToggleTask={onToggleTaskSelection}
            memberships={memberships}
            draft={draft}
            structureDraft={structureDraft}
            structureDraftValue={structureDraftValue}
            structureDraftSaving={structureDraftSaving}
            onStartStructureDraft={onStartStructureDraft}
            onDeleteTask={onDeleteTask}
            onStructureDraftChange={onStructureDraftChange}
            onCancelStructureDraft={onCancelStructureDraft}
            onSaveStructureDraft={onSaveStructureDraft}
            onInlineAssigneesChange={onInlineAssigneesChange}
            onOpenCommitment={onOpenCommitment}
            workspacePhase={workspacePhase}
            onOpenExecution={onOpenExecution}
            onOpenDirectReassign={onOpenDirectReassign}
            onSelfAssignTask={onSelfAssignTask}
            selfAssigningTaskId={selfAssigningTaskId}
            onTaskFilesUpdated={onTaskFilesUpdated}
            autoOpenTaskFilesId={autoOpenTaskFilesId}
            workUnitId={workUnitId}
            selectedProjectId={selectedProjectId}
            selectedStageId={selectedStageId}
            onInlineExecutionDrop={onInlineExecutionDrop}
            quickUploadPercentage={quickUploadPercentages[task.id]}
            onQuickUploadPercentageChange={onQuickUploadPercentageChange}
            onQuickUploadFiles={onQuickUploadFiles}
            reviewComment={reviewComments[`TASK:${task.id}`]}
            reviewPending={reviewPendingNodeKey === `TASK:${task.id}`}
            onReviewCommentChange={onReviewCommentChange}
            onReviewTask={onReviewTask}
            executionActive={activeExecutionTaskId === task.id}
            executionUploading={uploadingTaskIds.has(task.id)}
            focused={focusedTaskId === task.id}
            currentUserId={currentUserId}
            canManageCurrentUnit={canManageCurrentUnit}
            valuationDrafts={valuationDrafts}
            valuationMonthlyPrice={valuationMonthlyPrice}
            onValuationDaysChange={onValuationDaysChange}
            onValuationAmountChange={onValuationAmountChange}
          />
        ))}
      {isExpanded &&
        childLevels.map(child => (
          <LevelRows
            key={child.id}
            level={child}
            depth={showSelf ? depth + 1 : depth}
            buckets={buckets}
            expandedLevelIds={expandedLevelIds}
            forceExpandedLevelIds={forceExpandedLevelIds}
            onToggleLevel={onToggleLevel}
            selection={selection}
            onToggleLevelSelection={onToggleLevelSelection}
            onToggleTaskSelection={onToggleTaskSelection}
            memberships={memberships}
            draft={draft}
            structureDraft={structureDraft}
            structureDraftValue={structureDraftValue}
            structureDraftSaving={structureDraftSaving}
            onStartStructureDraft={onStartStructureDraft}
            onDeleteLevel={onDeleteLevel}
            onDeleteTask={onDeleteTask}
            onStructureDraftChange={onStructureDraftChange}
            onCancelStructureDraft={onCancelStructureDraft}
            onSaveStructureDraft={onSaveStructureDraft}
            onInlineAssigneesChange={onInlineAssigneesChange}
            onOpenCommitment={onOpenCommitment}
            workspacePhase={workspacePhase}
            onOpenExecution={onOpenExecution}
            onOpenDirectReassign={onOpenDirectReassign}
            onSelfAssignTask={onSelfAssignTask}
            selfAssigningTaskId={selfAssigningTaskId}
            onTaskFilesUpdated={onTaskFilesUpdated}
            autoOpenTaskFilesId={autoOpenTaskFilesId}
            workUnitId={workUnitId}
            selectedProjectId={selectedProjectId}
            selectedStageId={selectedStageId}
            onInlineExecutionDrop={onInlineExecutionDrop}
            quickUploadPercentages={quickUploadPercentages}
            onQuickUploadPercentageChange={onQuickUploadPercentageChange}
            onQuickUploadFiles={onQuickUploadFiles}
            onCompressLevel={onCompressLevel}
            compressingLevelKey={compressingLevelKey}
            reviewComments={reviewComments}
            reviewApplyChildren={reviewApplyChildren}
            reviewPendingNodeKey={reviewPendingNodeKey}
            onReviewCommentChange={onReviewCommentChange}
            onReviewApplyChildrenChange={onReviewApplyChildrenChange}
            onReviewLevel={onReviewLevel}
            onReviewTask={onReviewTask}
            activeExecutionTaskId={activeExecutionTaskId}
            uploadingTaskIds={uploadingTaskIds}
            focusedTaskId={focusedTaskId}
            currentUserId={currentUserId}
            canManageCurrentUnit={canManageCurrentUnit}
            valuationDrafts={valuationDrafts}
            valuationMonthlyPrice={valuationMonthlyPrice}
            onValuationDaysChange={onValuationDaysChange}
            onValuationAmountChange={onValuationAmountChange}
          />
        ))}
    </>
  );
};
type TechnicalOfficeProjectsWorkspaceProps = {
  embedded?: boolean;
  meetingId?: string;
  unitId?: string;
  scope?: 'self' | 'descendants';
};

const TechnicalOfficeProjectsWorkspace = ({
  embedded = false,
  meetingId: embeddedMeetingId,
  unitId: embeddedUnitId,
  scope: embeddedScope,
}: TechnicalOfficeProjectsWorkspaceProps = {}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionUserId = useSelector((state: RootState) => state.userSession.id);
  const { hasAccess: isModuleMod } = useRole('MOD', 'grupos');
  const globalRolesQuery = useQuery({
    queryKey: ['global-roles-form'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<GlobalRoleOption[]>(
        '/role/form',
        {
          headers: { noLoader: true },
        }
      );
      return data;
    },
  });
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedFocusId, setSelectedFocusId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null
  );
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [technicalTreeSearch, setTechnicalTreeSearch] = useState('');
  const [scope, setScope] = useState<'self' | 'descendants'>('self');
  // The project picker is useful on demand, but the task tree is the primary
  // workspace. Start with it hidden so entering the module preserves the full
  // horizontal area for levels and subtasks.
  const [showProjectPanel, setShowProjectPanel] = useState(false);
  const [showInactiveProjects, setShowInactiveProjects] = useState(false);
  const [responsibleTaskUserIds, setResponsibleTaskUserIds] = useState<
    number[]
  >([]);
  const [collapsedLevelIds, setCollapsedLevelIds] = useState<Set<number>>(
    () => new Set()
  );
  const hydratedTreeExpansionKeyRef = useRef<string | null>(null);
  const [selection, setSelection] = useState<SelectionState>(emptySelection);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<CommitmentDraft>(defaultDraft);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [assignmentPreview, setAssignmentPreview] =
    useState<TechnicalCommitmentPreview | null>(null);
  const [evidenceRow, setEvidenceRow] =
    useState<TechnicalCommitmentPreviewRow | null>(null);
  const [structureDraft, setStructureDraft] = useState<StructureDraft | null>(
    null
  );
  const [structureDraftValue, setStructureDraftValue] = useState('');
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingTitleTouched, setMeetingTitleTouched] = useState(false);
  const [meetingScheduledAt, setMeetingScheduledAt] = useState(
    toDateTimeLocal(new Date())
  );
  const activeTab = normalizeWorkspaceTab(searchParams.get('tab'));
  const activePhase = normalizeWorkspacePhase(searchParams.get('phase'));
  const meetingId =
    embeddedMeetingId || searchParams.get('meetingId') || undefined;
  const isWorkPhase = activePhase === 'trabajo-tecnico';
  const isValuationPhase = activePhase === 'valorizacion';
  const [quickUploadPercentages, setQuickUploadPercentages] = useState<
    Record<number, string>
  >({});
  const [commitmentDetail, setCommitmentDetail] =
    useState<CommitmentDetailState | null>(null);
  const [commitmentDetailDraft, setCommitmentDetailDraft] = useState({
    title: '',
    description: '',
    dueDate: '',
    status: 'PENDING' as Commitment['status'],
    priority: 'NORMAL' as Commitment['priority'],
  });
  const [compressingLevelKey, setCompressingLevelKey] = useState<string | null>(
    null
  );
  const [executionSheetOpen, setExecutionSheetOpen] = useState(false);
  const [executionSession, setExecutionSession] =
    useState<ExecutionSession | null>(null);
  const [uploadingTaskIds, setUploadingTaskIds] = useState<Set<number>>(
    () => new Set()
  );
  const [autoOpenTaskFilesId, setAutoOpenTaskFilesId] = useState<number | null>(
    null
  );
  const [focusedTaskId, setFocusedTaskId] = useState<number | null>(null);
  const [directReassignTask, setDirectReassignTask] = useState<SubTask | null>(
    null
  );
  const [directReassignOwnerId, setDirectReassignOwnerId] = useState('');
  const [directReassignReason, setDirectReassignReason] = useState('');
  const deepLinkHandledRef = useRef('');
  const [reviewComments, setReviewComments] = useState<Record<string, string>>(
    {}
  );
  const [reviewApplyChildren, setReviewApplyChildren] = useState<
    Record<number, boolean>
  >({});
  const [pendingLevelReview, setPendingLevelReview] =
    useState<PendingLevelReview | null>(null);
  const [valuationDrafts, setValuationDrafts] = useState<
    Record<number, ValuationDraft>
  >({});
  const [valuationMonthlyPrice, setValuationMonthlyPrice] = useState('');
  const [valuationMonthlyPriceTouched, setValuationMonthlyPriceTouched] =
    useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectModalSearch, setProjectModalSearch] = useState('');
  const [projectModalFocus, setProjectModalFocus] =
    useState<MeetingProjectFocus | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(
    null
  );
  const [selectedProjectStageIds, setSelectedProjectStageIds] = useState<
    Set<number>
  >(() => new Set());
  const [stageVersionModalOpen, setStageVersionModalOpen] = useState(false);
  const [stageVersionSourceKind, setStageVersionSourceKind] =
    useState<StageVersionSourceKind>('SAME_STAGE');
  const [stageVersionSearch, setStageVersionSearch] = useState('');
  const [stageVersionType, setStageVersionType] = useState<
    StageVersionType | 'ALL'
  >('ALL');
  const [stageVersionSourceStageId, setStageVersionSourceStageId] = useState<
    number | null
  >(null);
  const [stageVersionName, setStageVersionName] = useState('');
  const [stageVersionLinkToOffice, setStageVersionLinkToOffice] =
    useState(true);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberDrafts, setSelectedMemberDrafts] = useState<
    SelectedOfficeMemberDraft[]
  >([]);
  const [bulkMemberSkipped, setBulkMemberSkipped] = useState<
    { userId: number; reason: string }[]
  >([]);
  const [memberRole, setMemberRole] =
    useState<OfficeMemberRole>('ESPECIALISTA');
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [meetingViewConfigOpen, setMeetingViewConfigOpen] = useState(false);
  const [meetingViewDraft, setMeetingViewDraft] = useState<{
    defaultScope: MeetingScope;
    defaultView: MeetingWorkspaceView;
    visibleViews: MeetingWorkspaceView[];
  }>({
    defaultScope: 'SELF',
    defaultView: 'UNITS',
    visibleViews: ['UNITS', 'TECHNICAL_TREE', 'MEMBERS', 'PROJECTS_MEMBERS'],
  });

  const overviewQuery = useQuery({
    queryKey: ['office-meetings', 'overview'],
    queryFn: getMeetingUnitsOverview,
  });

  const visibleUnits = overviewQuery.data?.data ?? [];
  const meetingContextQuery = useQuery({
    queryKey: ['office-meetings', 'meeting-context', meetingId],
    queryFn: () => getMeeting(meetingId!),
    enabled: Boolean(meetingId),
  });
  const liveUnitMeetingsQuery = useQuery({
    queryKey: ['office-meetings', 'live-unit-workspace', selectedUnitId],
    queryFn: () => getMeetings({ unitId: selectedUnitId, status: 'LIVE' }),
    enabled: !meetingId && Boolean(selectedUnitId),
  });
  const activeMeeting =
    meetingContextQuery.data ?? liveUnitMeetingsQuery.data?.[0];
  const activeMeetingId = activeMeeting?.id ?? meetingId;
  const canUseDescendantScope = Boolean(isModuleMod && visibleUnits.length > 1);
  const defaultWorkspaceUnit = useMemo(() => {
    if (!visibleUnits.length) {
      return undefined;
    }
    if (isModuleMod) {
      return (
        visibleUnits.find(unit => isGeneralManagementUnit(unit.name)) ||
        visibleUnits[0]
      );
    }
    return (
      visibleUnits.find(unit => !isGeneralManagementUnit(unit.name)) ||
      visibleUnits[0]
    );
  }, [isModuleMod, visibleUnits]);

  const updateParams = (patch: Record<string, string | null | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (!visibleUnits.length) {
      return;
    }
    const unitFromUrl = embeddedUnitId || searchParams.get('unitId');
    const scopeFromUrl = searchParams.get('scope');
    const normalizedScope: 'self' | 'descendants' =
      embeddedScope ||
      (scopeFromUrl === 'descendants' && canUseDescendantScope
        ? 'descendants'
        : 'self');
    const urlUnitIsVisible = Boolean(
      unitFromUrl && visibleUnits.some(unit => unit.id === unitFromUrl)
    );
    const currentUnitIsVisible = Boolean(
      selectedUnitId && visibleUnits.some(unit => unit.id === selectedUnitId)
    );
    const fallbackUnit = defaultWorkspaceUnit || visibleUnits[0];
    const nextUnitId = urlUnitIsVisible
      ? unitFromUrl!
      : currentUnitIsVisible
      ? selectedUnitId
      : fallbackUnit.id;
    const nextParams = new URLSearchParams(searchParams);
    let shouldReplaceParams = false;

    if (!embeddedUnitId && unitFromUrl !== nextUnitId) {
      nextParams.set('unitId', nextUnitId);
      shouldReplaceParams = true;
    }
    if (!embeddedScope && scopeFromUrl !== normalizedScope) {
      nextParams.set('scope', normalizedScope);
      shouldReplaceParams = true;
    }
    if (!searchParams.get('tab')) {
      nextParams.set('tab', 'proyectos');
      shouldReplaceParams = true;
    }

    if (selectedUnitId !== nextUnitId) {
      setSelectedUnitId(nextUnitId);
    }
    if (scope !== normalizedScope) {
      setScope(normalizedScope);
    }
    if (shouldReplaceParams) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    canUseDescendantScope,
    defaultWorkspaceUnit,
    embeddedUnitId,
    embeddedScope,
    scope,
    searchParams,
    selectedUnitId,
    setSearchParams,
    visibleUnits,
  ]);

  useEffect(() => {
    const rawPhase = searchParams.get('phase');
    if (rawPhase === 'estructura-asignacion' || rawPhase === 'ejecucion') {
      updateParams({ phase: 'trabajo-tecnico' });
    }
  }, [searchParams]);

  const projectsQuery = useQuery({
    queryKey: [
      'technical-office-projects',
      selectedUnitId,
      scope,
      showInactiveProjects,
    ],
    queryFn: () =>
      getMeetingUnitTechnicalProjects(selectedUnitId, {
        scope,
        includeInactive: showInactiveProjects,
      }),
    enabled: !!selectedUnitId,
  });

  const projectCandidatesQuery = useQuery({
    queryKey: ['office-project-candidates', projectModalSearch, selectedUnitId],
    queryFn: () =>
      getOfficeProjectCandidates(projectModalSearch, selectedUnitId),
    enabled: projectModalOpen && !!selectedUnitId,
  });

  const projects = projectsQuery.data ?? [];
  const filteredProjects = useMemo(() => {
    const value = search.trim().toLowerCase();
    const byStatus = showInactiveProjects
      ? projects
      : projects.filter(focus => focus.status !== 'INACTIVE');
    if (!value) return byStatus;
    return byStatus.filter(focus => {
      const label = projectLabel(focus).toLowerCase();
      const cui = focus.project.contract?.cui?.toLowerCase() ?? '';
      const unitName = focus.unit?.name.toLowerCase() ?? '';
      return (
        label.includes(value) || cui.includes(value) || unitName.includes(value)
      );
    });
  }, [projects, search, showInactiveProjects]);

  useEffect(() => {
    if (!projects.length) {
      setSelectedFocusId(null);
      setSelectedProjectId(null);
      setSelectedStageId(null);
      return;
    }
    const focusFromUrl = searchParams.get('focusId');
    const projectFromUrl = Number(searchParams.get('projectId'));
    const stageFromUrl = Number(searchParams.get('stageId'));
    const urlProject =
      projects.find(focus => focusKey(focus) === focusFromUrl) ||
      projects.find(focus => focus.projectId === projectFromUrl);
    if (urlProject && selectedFocusId !== focusKey(urlProject)) {
      const stages = activeFocusStages(urlProject);
      setSelectedFocusId(focusKey(urlProject));
      setSelectedProjectId(urlProject.projectId);
      setSelectedStageId(
        stages.some(stage => stage.id === stageFromUrl)
          ? stageFromUrl
          : stages[0]?.id ?? null
      );
      return;
    }
    if (
      !selectedFocusId ||
      !projects.some(focus => focusKey(focus) === selectedFocusId)
    ) {
      const project = projects[0];
      const stages = activeFocusStages(project);
      setSelectedFocusId(focusKey(project));
      setSelectedProjectId(project.projectId);
      setSelectedStageId(stages[0]?.id ?? null);
    }
  }, [projects, searchParams, selectedFocusId]);

  const selectedUnit = visibleUnits.find(unit => unit.id === selectedUnitId);
  const selectedProject = projects.find(
    focus => focusKey(focus) === selectedFocusId
  );
  const selectedProjectStages = useMemo(
    () => activeFocusStages(selectedProject),
    [selectedProject]
  );
  const selectProjectFocus = (focus: MeetingProjectFocus) => {
    const stages = activeFocusStages(focus);
    const nextStageId = stages.some(stage => stage.id === selectedStageId)
      ? selectedStageId
      : stages[0]?.id ?? null;

    setSelectedFocusId(focusKey(focus));
    setSelectedProjectId(focus.projectId);
    setSelectedStageId(nextStageId);
    updateParams({
      focusId: focusKey(focus),
      projectId: String(focus.projectId),
      stageId: nextStageId ? String(nextStageId) : null,
    });
  };
  const handleProjectFocusChange = (nextFocusId: string) => {
    const nextFocus = projects.find(focus => focusKey(focus) === nextFocusId);
    if (nextFocus) selectProjectFocus(nextFocus);
  };
  const selectedProjectStageGroups = useMemo(() => {
    const map = new Map<
      string,
      { id: string; conceptName: string; versions: MeetingStageOption[] }
    >();
    selectedProjectStages.forEach(stage => {
      const groupId = stage.versionMetadata?.groupId || `stage-${stage.id}`;
      const current = map.get(groupId);
      if (current) {
        current.versions.push(stage);
        return;
      }
      map.set(groupId, {
        id: groupId,
        conceptName: stageConceptName(stage),
        versions: [stage],
      });
    });
    return Array.from(map.values()).map(group => ({
      ...group,
      versions: group.versions.sort((a, b) => {
        const currentSort =
          Number(b.versionMetadata?.isCurrent || false) -
          Number(a.versionMetadata?.isCurrent || false);
        if (currentSort) return currentSort;
        return (
          (b.versionMetadata?.versionNumber || 0) -
          (a.versionMetadata?.versionNumber || 0)
        );
      }),
    }));
  }, [selectedProjectStages]);
  const selectedStage =
    selectedProjectStages.find(stage => stage.id === selectedStageId) ?? null;
  const workUnitId = selectedProject?.unitId || selectedUnitId;
  const workUnitName =
    selectedProject?.unit?.name || selectedUnit?.name || 'Sin oficina';

  const stageVersionSourcesQuery = useQuery({
    queryKey: [
      'stage-version-sources',
      workUnitId,
      selectedProjectId,
      stageVersionSearch,
      stageVersionType,
    ],
    queryFn: () =>
      getStageVersionSources(workUnitId, selectedProjectId!, {
        search: stageVersionSearch,
        type: stageVersionType,
      }),
    enabled:
      stageVersionModalOpen &&
      !!workUnitId &&
      !!selectedProjectId &&
      !!selectedStageId,
  });

  const projectModeratorsQuery = useQuery({
    queryKey: ['office-project-moderators', workUnitId],
    queryFn: () => getOfficeProjectModerators(workUnitId),
    enabled: !!workUnitId,
  });

  const selectedUnitDashboardQuery = useQuery({
    queryKey: ['meeting-unit-dashboard', selectedUnitId, 'workspace-summary'],
    queryFn: () => getMeetingUnitDashboard(selectedUnitId),
    enabled: !!selectedUnitId,
  });
  const meetingViewConfigQuery = useQuery({
    queryKey: ['meeting-view-config', selectedUnitId],
    queryFn: () => getMeetingViewConfig(selectedUnitId),
    enabled: meetingViewConfigOpen && Boolean(selectedUnitId),
  });

  useEffect(() => {
    const config = meetingViewConfigQuery.data;
    if (!config) return;
    setMeetingViewDraft({
      defaultScope: config.localConfig?.defaultScope ?? config.scope,
      defaultView: config.localConfig?.defaultView ?? config.defaultView,
      visibleViews: [
        ...(config.localConfig?.visibleViews ?? config.visibleViews),
      ],
    });
  }, [meetingViewConfigQuery.data]);

  const selectedUnitProjectModeratorsQuery = useQuery({
    queryKey: ['office-project-moderators', selectedUnitId],
    queryFn: () => getOfficeProjectModerators(selectedUnitId),
    enabled: !!selectedUnitId,
  });

  const memberCandidatesQuery = useQuery({
    queryKey: ['office-member-candidates', selectedUnitId, memberSearch],
    queryFn: () => getOfficeMemberCandidates(selectedUnitId, memberSearch),
    enabled: memberModalOpen && !!selectedUnitId,
  });

  useEffect(() => {
    if (!showNewMeeting) return;
    const defaultDate = toDateTimeLocal(new Date());
    const unitName = selectedUnit?.name || 'Oficina';
    setMeetingScheduledAt(defaultDate);
    setMeetingTitle(buildDefaultMeetingTitle(unitName, defaultDate));
    setMeetingTitleTouched(false);
  }, [showNewMeeting, selectedUnit?.name]);

  useEffect(() => {
    if (!showNewMeeting || meetingTitleTouched) return;
    setMeetingTitle(
      buildDefaultMeetingTitle(
        selectedUnit?.name || 'Oficina',
        meetingScheduledAt
      )
    );
  }, [
    meetingScheduledAt,
    meetingTitleTouched,
    selectedUnit?.name,
    showNewMeeting,
  ]);

  const createMeetingMutation = useMutation({
    mutationFn: async (mode: 'DRAFT' | 'LIVE') => {
      if (!selectedUnitId) throw new Error('Selecciona una oficina');
      const activeProjectIds =
        selectedProject?.projectId != null
          ? [selectedProject.projectId]
          : (selectedUnitDashboardQuery.data?.projects ?? [])
              .filter(projectFocus => projectFocus.status === 'ACTIVE')
              .map(projectFocus => projectFocus.projectId);
      const createdMeeting = await createMeeting({
        unitId: selectedUnitId,
        title:
          meetingTitle.trim() ||
          buildDefaultMeetingTitle(
            selectedUnit?.name || 'Oficina',
            meetingScheduledAt
          ),
        scheduledAt: new Date(meetingScheduledAt).toISOString(),
        projectIds: activeProjectIds,
        agendaItems: [
          {
            title: 'Agenda general',
            scope: 'GENERAL',
            order: 0,
          },
        ],
        participants: [],
      });
      if (mode === 'LIVE') return startMeeting(createdMeeting.id);
      return createdMeeting;
    },
    onSuccess: meeting => {
      queryClient.invalidateQueries({ queryKey: ['office-meetings'] });
      queryClient.invalidateQueries({
        queryKey: ['meeting-unit-dashboard', selectedUnitId],
      });
      queryClient.invalidateQueries({
        queryKey: [
          'meeting-unit-dashboard',
          selectedUnitId,
          'workspace-summary',
        ],
      });
      setShowNewMeeting(false);
      setMeetingTitleTouched(false);
      navigate(`/grupos/reuniones/${meeting.id}`);
    },
    onError: () => {
      SnackbarUtilities.error('No se pudo crear la reunion');
    },
  });

  const invalidateSelectedUnitMembers = () => {
    queryClient.invalidateQueries({
      queryKey: ['meeting-unit-dashboard', selectedUnitId],
    });
    queryClient.invalidateQueries({
      queryKey: ['meeting-unit-dashboard', selectedUnitId, 'workspace-summary'],
    });
    queryClient.invalidateQueries({
      queryKey: ['office-member-candidates', selectedUnitId],
    });
    queryClient.invalidateQueries({
      queryKey: ['office-meetings', 'overview'],
    });
    queryClient.invalidateQueries({
      queryKey: ['office-project-moderators', selectedUnitId],
    });
  };

  const resetMemberModal = () => {
    setMemberSearch('');
    setMemberRole('ESPECIALISTA');
    setSelectedMemberDrafts([]);
    setBulkMemberSkipped([]);
    setMemberModalOpen(false);
  };

  const addMemberDraft = (candidate: OfficeMemberCandidate) => {
    setBulkMemberSkipped([]);
    setSelectedMemberDrafts(current => {
      if (current.some(member => member.user.id === candidate.id))
        return current;
      return [
        ...current,
        {
          user: candidate,
          role: memberRole,
          canManageUnitProjects: false,
          isUnitLead: false,
        },
      ];
    });
  };

  const removeMemberDraft = (userId: number) => {
    setSelectedMemberDrafts(current =>
      current.filter(member => member.user.id !== userId)
    );
  };

  const updateMemberDraft = (
    userId: number,
    patch: Partial<Omit<SelectedOfficeMemberDraft, 'user'>>
  ) => {
    setBulkMemberSkipped([]);
    setSelectedMemberDrafts(current =>
      current.map(member => {
        if (member.user.id !== userId) return member;
        return {
          ...member,
          ...patch,
        };
      })
    );
  };

  const setMemberDraftLead = (userId: number, checked: boolean) => {
    setBulkMemberSkipped([]);
    setSelectedMemberDrafts(current =>
      current.map(member => ({
        ...member,
        isUnitLead: checked && member.user.id === userId,
      }))
    );
  };

  const addMemberMutation = useMutation({
    mutationFn: () => {
      if (!selectedUnitId || !selectedMemberDrafts.length)
        throw new Error('Selecciona un miembro');
      return bulkAddOfficeMembers(selectedUnitId, {
        members: selectedMemberDrafts.map(member => ({
          userId: member.user.id,
          role: member.role,
          isUnitLead: member.isUnitLead,
          canManageUnitProjects: member.canManageUnitProjects,
        })),
      });
    },
    onSuccess: result => {
      const createdCount = result.created?.length ?? 0;
      const skipped = result.skipped ?? [];
      setBulkMemberSkipped(skipped);
      if (createdCount) {
        SnackbarUtilities.success(
          createdCount === 1
            ? 'Miembro agregado.'
            : `${createdCount} miembros agregados.`
        );
      }
      if (skipped.length) {
        SnackbarUtilities.warning(
          `${skipped.length} usuario(s) no se agregaron.`
        );
      }
      if (!skipped.length) {
        resetMemberModal();
      } else {
        const skippedUserIds = new Set(skipped.map(item => item.userId));
        setSelectedMemberDrafts(current =>
          current.filter(member => skippedUserIds.has(member.user.id))
        );
      }
      invalidateSelectedUnitMembers();
    },
    onError: () => {
      SnackbarUtilities.error('No se pudieron agregar los miembros.');
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({
      membershipId,
      payload,
    }: {
      membershipId: string;
      payload: {
        role?: OfficeMemberRole;
        roleId?: number | null;
        isUnitLead?: boolean;
        canManageUnitProjects?: boolean;
      };
    }) => updateOfficeMember(selectedUnitId, membershipId, payload),
    onSuccess: () => {
      SnackbarUtilities.success('Miembro actualizado.');
      invalidateSelectedUnitMembers();
    },
    onError: () => {
      SnackbarUtilities.error('No se pudo actualizar el miembro.');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (membershipId: string) =>
      removeOfficeMember(selectedUnitId, membershipId),
    onSuccess: () => {
      SnackbarUtilities.success('Miembro retirado.');
      setMemberToRemove(null);
      invalidateSelectedUnitMembers();
    },
    onError: () => {
      SnackbarUtilities.error('No se pudo retirar el miembro.');
    },
  });

  useEffect(() => {
    if (
      selectedProject &&
      (!selectedStageId ||
        !selectedProjectStages.some(stage => stage.id === selectedStageId))
    ) {
      const nextStageId = selectedProjectStages[0]?.id ?? null;
      setSelectedStageId(nextStageId);
      updateParams({ stageId: nextStageId ? String(nextStageId) : null });
    }
  }, [selectedProject, selectedProjectStages, selectedStageId]);

  const treeQuery = useQuery({
    queryKey: [
      'technical-office-stage-tree',
      workUnitId,
      selectedProjectId,
      selectedStageId,
    ],
    queryFn: () =>
      getMeetingUnitTechnicalStageTree({
        unitId: workUnitId,
        projectId: selectedProjectId!,
        stageId: selectedStageId!,
      }),
    enabled: !!workUnitId && !!selectedProjectId && !!selectedStageId,
  });

  const commitmentsQuery = useQuery({
    queryKey: [
      'technical-office-commitments',
      workUnitId,
      selectedProjectId,
      selectedStageId,
    ],
    queryFn: () =>
      getCommitments({
        unitId: workUnitId,
        projectId: selectedProjectId!,
        stageId: selectedStageId!,
      }),
    enabled: !!workUnitId && !!selectedProjectId && !!selectedStageId,
  });

  const buckets = useMemo(
    () => getCommitmentBuckets(commitmentsQuery.data ?? []),
    [commitmentsQuery.data]
  );
  const memberships = projectModeratorsQuery.data?.memberships ?? [];

  useEffect(() => {
    if (!treeQuery.data || valuationMonthlyPriceTouched) return;
    setValuationMonthlyPrice(String(numericValue(treeQuery.data.monthlyPrice)));
  }, [treeQuery.data, valuationMonthlyPriceTouched]);

  const valuationMonthlyPriceNumber = numericValue(valuationMonthlyPrice);
  const valuationTotals = useMemo(
    () =>
      levelValuationTotals(
        treeQuery.data,
        valuationMonthlyPriceNumber,
        valuationDrafts
      ),
    [treeQuery.data, valuationDrafts, valuationMonthlyPriceNumber]
  );
  const valuationHasChanges =
    Boolean(Object.keys(valuationDrafts).length) ||
    (treeQuery.data
      ? valuationMonthlyPriceNumber !==
        numericValue(treeQuery.data.monthlyPrice)
      : false);
  const canManageCurrentUnit = Boolean(
    isModuleMod || projectModeratorsQuery.data?.canManageCurrentUnit
  );
  const canManageSelectedUnit = Boolean(
    isModuleMod || selectedUnitProjectModeratorsQuery.data?.canManageCurrentUnit
  );
  const allLevelIds = useMemo(
    () => collectLevelIds(treeQuery.data),
    [treeQuery.data]
  );
  const responsibleTaskOptions = useMemo(
    () => responsibleFilterOptions(treeQuery.data),
    [treeQuery.data]
  );
  const canQuickFilterCurrentUser = Boolean(
    sessionUserId &&
      (responsibleTaskOptions.some(option => option.userId === sessionUserId) ||
        memberships.some(membership => membership.user.id === sessionUserId))
  );
  const responsibleTaskUserIdSet = useMemo(
    () => new Set(responsibleTaskUserIds),
    [responsibleTaskUserIds]
  );
  const isResponsibleTaskFilterActive = responsibleTaskUserIds.length > 0;
  const responsibleFilteredTechnicalTree = useMemo(
    () =>
      filterTechnicalTreeByResponsible(
        treeQuery.data,
        responsibleTaskUserIdSet
      ),
    [responsibleTaskUserIdSet, treeQuery.data]
  );
  const handleResponsibleTaskFilterChange = (userIds: number[]) => {
    setResponsibleTaskUserIds(userIds);
    setSelection(emptySelection());
  };
  const treeExpansionStorageKey = useMemo(
    () =>
      technicalTreeExpansionStorageKey({
        userId: sessionUserId,
        unitId: workUnitId,
        projectId: selectedProjectId,
        stageId: selectedStageId,
      }),
    [sessionUserId, workUnitId, selectedProjectId, selectedStageId]
  );
  const expandedLevelIds = useMemo(
    () =>
      new Set(allLevelIds.filter(levelId => !collapsedLevelIds.has(levelId))),
    [allLevelIds, collapsedLevelIds]
  );
  const deferredTechnicalTreeSearch = useDeferredValue(technicalTreeSearch);
  const normalizedTechnicalTreeSearch = useMemo(
    () => normalizeTechnicalTreeSearch(deferredTechnicalTreeSearch),
    [deferredTechnicalTreeSearch]
  );
  const filteredTechnicalTree = useMemo(
    () =>
      filterTechnicalTree(
        responsibleFilteredTechnicalTree,
        normalizedTechnicalTreeSearch
      ),
    [normalizedTechnicalTreeSearch, responsibleFilteredTechnicalTree]
  );
  const forcedExpandedLevelIds = useMemo(
    () =>
      isResponsibleTaskFilterActive || normalizedTechnicalTreeSearch
        ? new Set(collectLevelIds(filteredTechnicalTree.level))
        : undefined,
    [
      filteredTechnicalTree.level,
      isResponsibleTaskFilterActive,
      normalizedTechnicalTreeSearch,
    ]
  );

  useEffect(() => {
    hydratedTreeExpansionKeyRef.current = null;
    const nextCollapsedLevelIds = treeExpansionStorageKey
      ? readCollapsedTechnicalLevelIds(treeExpansionStorageKey)
      : new Set<number>();
    const animationFrame = window.requestAnimationFrame(() => {
      setCollapsedLevelIds(nextCollapsedLevelIds);
      hydratedTreeExpansionKeyRef.current = treeExpansionStorageKey;
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [treeExpansionStorageKey]);

  useEffect(() => {
    if (
      !treeExpansionStorageKey ||
      hydratedTreeExpansionKeyRef.current !== treeExpansionStorageKey ||
      !treeQuery.isSuccess ||
      treeQuery.isFetching
    ) {
      return;
    }
    const availableLevelIds = new Set(allLevelIds);
    const animationFrame = window.requestAnimationFrame(() => {
      setCollapsedLevelIds(current => {
        const next = new Set(
          Array.from(current).filter(levelId => availableLevelIds.has(levelId))
        );
        return next.size === current.size ? current : next;
      });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [
    allLevelIds,
    treeExpansionStorageKey,
    treeQuery.isFetching,
    treeQuery.isSuccess,
  ]);

  useEffect(() => {
    if (
      !treeExpansionStorageKey ||
      hydratedTreeExpansionKeyRef.current !== treeExpansionStorageKey
    ) {
      return;
    }
    writeCollapsedTechnicalLevelIds(treeExpansionStorageKey, collapsedLevelIds);
  }, [collapsedLevelIds, treeExpansionStorageKey]);

  useEffect(() => {
    setSelection(emptySelection());
    setSheetOpen(false);
    setDraft(defaultDraft());
    setPreviewOpen(false);
    setAssignmentPreview(null);
    setEvidenceRow(null);
    setStructureDraft(null);
    setStructureDraftValue('');
    setExecutionSheetOpen(false);
    setExecutionSession(null);
    setAutoOpenTaskFilesId(null);
    setFocusedTaskId(null);
    setDirectReassignTask(null);
    setDirectReassignOwnerId('');
    setDirectReassignReason('');
    setValuationDrafts({});
    setValuationMonthlyPrice('');
    setValuationMonthlyPriceTouched(false);
    setResponsibleTaskUserIds([]);
    setTechnicalTreeSearch('');
  }, [workUnitId, selectedProjectId, selectedStageId]);

  useEffect(() => {
    if (activePhase === 'trabajo-tecnico') return;
    setSheetOpen(false);
    setPreviewOpen(false);
    setStructureDraft(null);
    setStructureDraftValue('');
    setExecutionSheetOpen(false);
    setExecutionSession(null);
    setAutoOpenTaskFilesId(null);
    setDirectReassignTask(null);
    setDirectReassignOwnerId('');
    setDirectReassignReason('');
  }, [activePhase]);

  useEffect(() => {
    if (activePhase === 'trabajo-tecnico' || activePhase === 'revision') return;
    setResponsibleTaskUserIds(current => (current.length ? [] : current));
  }, [activePhase]);

  const toggleLevel = (levelId: number) => {
    setCollapsedLevelIds(current => {
      const next = new Set(current);
      if (next.has(levelId)) {
        next.delete(levelId);
      } else {
        next.add(levelId);
      }
      return next;
    });
  };

  const expandAllLevels = () => setCollapsedLevelIds(new Set());
  const collapseAllLevels = () => setCollapsedLevelIds(new Set(allLevelIds));

  const toggleLevelSelection = (level: Level) => {
    const descendantTaskIds = collectTaskIds(level);
    setSelection(current => {
      const nextLevelIds = new Set(current.levelIds);
      const nextTaskIds = new Set(current.taskIds);
      const shouldRemove =
        (!isResponsibleTaskFilterActive && nextLevelIds.has(level.id)) ||
        (descendantTaskIds.length > 0 &&
          descendantTaskIds.every(taskId => nextTaskIds.has(taskId)));

      if (shouldRemove) {
        if (!isResponsibleTaskFilterActive) nextLevelIds.delete(level.id);
        descendantTaskIds.forEach(taskId => nextTaskIds.delete(taskId));
      } else {
        if (!isResponsibleTaskFilterActive) nextLevelIds.add(level.id);
        descendantTaskIds.forEach(taskId => nextTaskIds.add(taskId));
      }

      return { levelIds: nextLevelIds, taskIds: nextTaskIds };
    });
  };

  const toggleTaskSelection = (taskId: number) => {
    setSelection(current => {
      const nextLevelIds = new Set(current.levelIds);
      const nextTaskIds = new Set(current.taskIds);
      if (nextTaskIds.has(taskId)) {
        nextTaskIds.delete(taskId);
        collectLevelIdsContainingTask(treeQuery.data, taskId).forEach(levelId =>
          nextLevelIds.delete(levelId)
        );
      } else {
        nextTaskIds.add(taskId);
      }
      return { levelIds: nextLevelIds, taskIds: nextTaskIds };
    });
  };

  const clearSelection = () => setSelection(emptySelection());

  const startStructureDraft = (nextDraft: StructureDraft) => {
    setStructureDraft(nextDraft);
    setStructureDraftValue(
      'defaultName' in nextDraft ? nextDraft.defaultName : ''
    );
  };

  const cancelStructureDraft = () => {
    setStructureDraft(null);
    setStructureDraftValue('');
  };

  const structureMutation = useMutation({
    mutationFn: async () => {
      if (!structureDraft) throw new Error('No hay accion estructural activa.');
      const name = structureDraftValue.trim();
      if (!name) throw new Error('Ingresa un nombre.');
      if (structureDraft.kind === 'ROOT_LEVEL') {
        return createTechnicalLevel({
          stageId: structureDraft.stageId,
          rootId: 0,
          name,
          typeItem: treeQuery.data?.rootTypeItem || 'NUM',
          withTask: structureDraft.withTask,
        });
      }
      if (structureDraft.kind === 'EDIT_LEVEL') {
        return updateTechnicalLevel({
          levelId: structureDraft.levelId,
          name,
        });
      }
      if (structureDraft.kind === 'LEVEL_SIBLING') {
        return createTechnicalSiblingLevel({
          levelId: structureDraft.levelId,
          name,
          position: structureDraft.position,
        });
      }
      if (structureDraft.kind === 'LEVEL_CHILD') {
        return createTechnicalLevel({
          stageId: structureDraft.stageId,
          rootId: structureDraft.levelId,
          name,
          typeItem: treeQuery.data?.rootTypeItem || 'NUM',
        });
      }
      if (structureDraft.kind === 'SUBTASK_CHILD') {
        return createTechnicalSubtask({
          levelId: structureDraft.levelId,
          name,
        });
      }
      if (structureDraft.kind === 'EDIT_TASK') {
        return updateTechnicalSubtask({
          subtaskId: structureDraft.subtaskId,
          name,
        });
      }
      if (structureDraft.kind === 'TASK_SIBLING') {
        return createTechnicalSiblingSubtask({
          subtaskId: structureDraft.subtaskId,
          name,
          position: structureDraft.position,
        });
      }
      if (structureDraft.kind === 'DUPLICATE_LEVEL') {
        return duplicateTechnicalLevel({
          levelId: structureDraft.levelId,
          name,
        });
      }
      return duplicateTechnicalSubtask({
        subtaskId: structureDraft.subtaskId,
        name,
      });
    },
    onSuccess: () => {
      SnackbarUtilities.success('Indice tecnico actualizado.');
      cancelStructureDraft();
      queryClient.invalidateQueries({
        queryKey: ['technical-office-stage-tree'],
      });
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el indice tecnico.'
      );
    },
  });

  const deleteStructureMutation = useMutation({
    mutationFn: async (
      target: { type: 'LEVEL'; level: Level } | { type: 'TASK'; task: SubTask }
    ) => {
      if (target.type === 'LEVEL') return deleteTechnicalLevel(target.level.id);
      return deleteTechnicalSubtask(target.task.id);
    },
    onSuccess: () => {
      SnackbarUtilities.success('Elemento eliminado.');
      queryClient.invalidateQueries({
        queryKey: ['technical-office-stage-tree'],
      });
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar el elemento.'
      );
    },
  });

  const handleDeleteLevel = (level: Level) => {
    const confirmed = window.confirm(
      `Eliminar el nivel "${level.name || level.id}"?`
    );
    if (confirmed) deleteStructureMutation.mutate({ type: 'LEVEL', level });
  };

  const handleDeleteTask = (task: SubTask) => {
    const confirmed = window.confirm(`Eliminar la subtarea "${task.name}"?`);
    if (confirmed) deleteStructureMutation.mutate({ type: 'TASK', task });
  };

  const openProjectModal = (focus?: MeetingProjectFocus) => {
    setProjectModalFocus(focus ?? null);
    setSelectedCandidateId(focus?.projectId ?? null);
    setSelectedProjectStageIds(
      new Set(activeStageFocus(focus).map(stageFocus => stageFocus.stageId))
    );
    setProjectModalSearch('');
    setProjectModalOpen(true);
  };

  const selectedProjectCandidate = useMemo(
    () =>
      (projectCandidatesQuery.data ?? []).find(
        project => project.id === selectedCandidateId
      ) ??
      (projectModalFocus
        ? ({
            ...projectModalFocus.project,
            linkedUnitFocus: {
              id: projectModalFocus.id!,
              unitId: projectModalFocus.unitId,
              status: projectModalFocus.status,
              unit: {
                id: projectModalFocus.unitId,
                name: projectModalFocus.unit?.name || workUnitName,
                type: projectModalFocus.unit?.type || 'OFFICE',
              },
            },
          } as OfficeProjectCandidate)
        : undefined),
    [
      projectCandidatesQuery.data,
      projectModalFocus,
      selectedCandidateId,
      workUnitName,
    ]
  );

  const toggleProjectStageSelection = (stageId: number) => {
    setSelectedProjectStageIds(current => {
      const next = new Set(current);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  };

  const invalidateProjectFocusWorkspace = () => {
    queryClient.invalidateQueries({ queryKey: ['technical-office-projects'] });
    queryClient.invalidateQueries({ queryKey: ['office-project-candidates'] });
    queryClient.invalidateQueries({ queryKey: ['office-meetings'] });
  };

  const projectFocusMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUnitId || !selectedCandidateId)
        throw new Error('Selecciona oficina y proyecto.');
      const stageIds = Array.from(selectedProjectStageIds);
      if (projectModalFocus?.id) {
        return updateMeetingUnitProjectFocus(
          selectedUnitId,
          projectModalFocus.id,
          {
            stageIds,
            status: 'ACTIVE',
            isCurrent: true,
          }
        );
      }
      return linkMeetingUnitProjectFocus(selectedUnitId, {
        projectId: selectedCandidateId,
        stageIds,
        status: 'ACTIVE',
        isCurrent: true,
      });
    },
    onSuccess: focus => {
      SnackbarUtilities.success('Proyecto y etapas actualizados.');
      setProjectModalOpen(false);
      setProjectModalFocus(null);
      invalidateProjectFocusWorkspace();
      if (focus?.projectId) {
        const firstStageId =
          focus.stageFocus?.find(stageFocus => stageFocus.status !== 'INACTIVE')
            ?.stageId ?? null;
        setSelectedFocusId(focusKey(focus));
        setSelectedProjectId(focus.projectId);
        setSelectedStageId(firstStageId);
        updateParams({
          focusId: focusKey(focus),
          projectId: String(focus.projectId),
          stageId: firstStageId ? String(firstStageId) : null,
        });
      }
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo vincular el proyecto.'
      );
    },
  });

  const getNextStageVersionNumber = (baseStage = selectedStage) => {
    if (!baseStage) return 2;
    const groupId = baseStage.versionMetadata?.groupId;
    const versions = (selectedProject?.project.stages ?? [])
      .map(stage => stage.versionMetadata)
      .filter(version =>
        groupId
          ? version?.groupId === groupId
          : version?.stageId === baseStage.id
      )
      .map(version => version?.versionNumber || 1);
    return (
      Math.max(baseStage.versionMetadata?.versionNumber || 1, ...versions) + 1
    );
  };

  const openStageVersionModal = (stageOverride?: MeetingStageOption) => {
    const baseStage = stageOverride || selectedStage;
    if (!baseStage) {
      SnackbarUtilities.warning('Selecciona una etapa base.');
      return;
    }
    if (stageOverride) selectStage(stageOverride.id);
    const nextVersion = getNextStageVersionNumber(baseStage);
    const baseName =
      baseStage.versionMetadata?.group?.baseName ||
      cleanStageVersionBaseName(baseStage.name);
    setStageVersionSourceKind('SAME_STAGE');
    setStageVersionSourceStageId(baseStage.id);
    setStageVersionSearch('');
    setStageVersionType(baseStage.versionMetadata?.group?.stageType || 'ALL');
    setStageVersionName(`${baseName} v${nextVersion}`);
    setStageVersionLinkToOffice(true);
    setStageVersionModalOpen(true);
  };

  const stageVersionSourceProjects = useMemo(() => {
    if (stageVersionSourceKind === 'SAME_STAGE') return [];
    if (stageVersionSourceKind === 'SAME_PROJECT_STAGE') {
      return selectedProject
        ? [
            {
              ...selectedProject.project,
              isCurrentProject: true,
            },
          ]
        : [];
    }
    if (stageVersionSourceKind === 'OTHER_PROJECT_STAGE') {
      return (stageVersionSourcesQuery.data ?? []).filter(
        project => project.id !== selectedProjectId
      );
    }
    return [];
  }, [
    selectedProject,
    selectedProjectId,
    stageVersionSourceKind,
    stageVersionSourcesQuery.data,
  ]);

  const selectedStageVersionSource = useMemo(() => {
    if (stageVersionSourceKind === 'SAME_STAGE') {
      return selectedStage && selectedProjectId
        ? { stage: selectedStage, projectId: selectedProjectId }
        : null;
    }
    return (
      stageVersionSourceProjects
        .flatMap(project =>
          project.stages.map(stage => ({ stage, projectId: project.id }))
        )
        .find(item => item.stage.id === stageVersionSourceStageId) ?? null
    );
  }, [
    selectedStage,
    stageVersionSourceKind,
    stageVersionSourceProjects,
    stageVersionSourceStageId,
  ]);

  const stageVersionMutation = useMutation({
    mutationFn: async () => {
      if (!workUnitId || !selectedProjectId || !selectedStageId) {
        throw new Error('Selecciona oficina, proyecto y etapa.');
      }
      const source =
        stageVersionSourceKind === 'SAME_STAGE'
          ? selectedStageVersionSource
          : selectedStageVersionSource;
      if (stageVersionSourceKind !== 'EMPTY' && !source?.stage?.id) {
        throw new Error('Selecciona una etapa origen.');
      }
      return createStageVersion(
        workUnitId,
        selectedProjectId,
        selectedStageId,
        {
          name: stageVersionName.trim() || undefined,
          sourceKind: stageVersionSourceKind,
          sourceStageId:
            stageVersionSourceKind === 'EMPTY' ? undefined : source?.stage.id,
          sourceProjectId:
            stageVersionSourceKind === 'EMPTY' ? undefined : source?.projectId,
          linkToCurrentOffice: stageVersionLinkToOffice,
          copyPolicy: 'STRUCTURE_AND_MODEL',
        }
      );
    },
    onSuccess: result => {
      SnackbarUtilities.success('Version de etapa creada.');
      setStageVersionModalOpen(false);
      invalidateProjectFocusWorkspace();
      const newStageId = result.stage?.id || result.version.stageId;
      if (newStageId) {
        setSelectedProjectId(selectedProjectId);
        setSelectedStageId(newStageId);
        updateParams({
          projectId: selectedProjectId ? String(selectedProjectId) : null,
          stageId: String(newStageId),
          tab: 'proyectos',
          phase: 'trabajo-tecnico',
        });
      }
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo crear la version de etapa.'
      );
    },
  });

  const markStageVersionCurrentMutation = useMutation({
    mutationFn: (stageId: number) => {
      if (!workUnitId || !selectedProjectId) {
        throw new Error('Selecciona oficina y proyecto.');
      }
      return markStageVersionCurrent(workUnitId, selectedProjectId, stageId);
    },
    onSuccess: (_, stageId) => {
      SnackbarUtilities.success('Version marcada como actual.');
      invalidateProjectFocusWorkspace();
      setSelectedStageId(stageId);
      updateParams({ stageId: String(stageId) });
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo marcar la version como actual.'
      );
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ stageId, name }: { stageId: number; name: string }) =>
      updateWorkspaceStage(stageId, { name }),
    onSuccess: () => {
      SnackbarUtilities.success('Etapa actualizada.');
      invalidateProjectFocusWorkspace();
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error ? error.message : 'No se pudo editar la etapa.'
      );
    },
  });

  const deleteStageMutation = useMutation({
    mutationFn: (stageId: number) => deleteWorkspaceStage(stageId),
    onSuccess: () => {
      SnackbarUtilities.success('Etapa eliminada.');
      invalidateProjectFocusWorkspace();
      updateParams({ stageId: null });
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error ? error.message : 'No se pudo eliminar la etapa.'
      );
    },
  });

  const duplicateStageMutation = useMutation({
    mutationFn: ({ stageId, name }: { stageId: number; name: string }) =>
      duplicateWorkspaceStage(stageId, { name }),
    onSuccess: () => {
      SnackbarUtilities.success('Duplicado legacy iniciado.');
      invalidateProjectFocusWorkspace();
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error ? error.message : 'No se pudo duplicar la etapa.'
      );
    },
  });

  const selectStage = (stageId: number) => {
    setSelectedStageId(stageId);
    updateParams({ stageId: String(stageId) });
  };

  const openStageVersionModalFor = (stage: MeetingStageOption) => {
    openStageVersionModal(stage);
  };

  const handleEditStage = (stage: MeetingStageOption) => {
    const name = window.prompt('Nuevo nombre de etapa', stage.name);
    const cleanName = name?.trim();
    if (!cleanName || cleanName === stage.name) return;
    updateStageMutation.mutate({ stageId: stage.id, name: cleanName });
  };

  const handleDeleteStage = (stage: MeetingStageOption) => {
    const message = `Eliminar etapa "${stageVersionLabel(
      stage
    )}"? Si tiene compromisos, revisiones o foco activo de oficina, esta accion puede dejar relaciones historicas.`;
    if (!window.confirm(message)) return;
    deleteStageMutation.mutate(stage.id);
  };

  const handleDuplicateStage = (stage: MeetingStageOption) => {
    const defaultName = `${stageConceptName(stage)} copia`;
    const name = window.prompt('Nombre para duplicado legacy', defaultName);
    const cleanName = name?.trim();
    if (!cleanName) return;
    duplicateStageMutation.mutate({ stageId: stage.id, name: cleanName });
  };

  const showStageOrigin = (stage: MeetingStageOption) => {
    SnackbarUtilities.info(
      stageVersionOriginLabel(stage) ||
        'Esta version no registra origen externo.'
    );
  };

  const setTaskUploading = (taskId: number, uploading: boolean) => {
    setUploadingTaskIds(current => {
      const next = new Set(current);
      if (uploading) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  };

  const patchTechnicalTaskInTree = useCallback(
    (updatedTask: SubTask) => {
      queryClient.setQueryData<TechnicalStageTree>(
        [
          'technical-office-stage-tree',
          workUnitId,
          selectedProjectId,
          selectedStageId,
        ],
        current => replaceTaskInLevelTree(current, updatedTask)
      );
    },
    [queryClient, selectedProjectId, selectedStageId, workUnitId]
  );

  const handleLegacyTaskUpdated = useCallback(
    (task: SubTask) => {
      patchTechnicalTaskInTree(task);
    },
    [patchTechnicalTaskInTree]
  );

  const technicalReviewMutation = useMutation({
    mutationFn: async (input: TechnicalReviewMutationInput) => {
      if (!workUnitId || !selectedProjectId || !selectedStageId) {
        throw new Error('Selecciona oficina, proyecto y etapa.');
      }
      const payload = {
        projectId: selectedProjectId,
        stageId: selectedStageId,
        decision: input.decision,
        comment: input.comment,
        commitmentId: input.commitmentId,
        contextId: input.contextId,
        applyToChildren: input.applyToChildren,
      };
      return input.node.type === 'TASK'
        ? reviewTechnicalTask(workUnitId, input.node.id, payload)
        : reviewTechnicalLevel(workUnitId, input.node.id, payload);
    },
    onSuccess: (response, input) => {
      SnackbarUtilities.success('Revision guardada.');
      if (response.task) patchTechnicalTaskInTree(response.task);
      setReviewComments(current => {
        const next = { ...current };
        delete next[`${input.node.type}:${input.node.id}`];
        return next;
      });
      queryClient.invalidateQueries({
        queryKey: ['technical-office-stage-tree'],
      });
      queryClient.invalidateQueries({
        queryKey: ['technical-office-commitments'],
      });
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la revision.'
      );
    },
  });

  const reviewPendingNodeKey =
    technicalReviewMutation.isPending && technicalReviewMutation.variables
      ? `${technicalReviewMutation.variables.node.type}:${technicalReviewMutation.variables.node.id}`
      : undefined;

  const handleReviewCommentChange = (nodeKey: string, value: string) => {
    setReviewComments(current => ({ ...current, [nodeKey]: value }));
  };

  const handleReviewApplyChildrenChange = (levelId: number, value: boolean) => {
    setReviewApplyChildren(current => ({ ...current, [levelId]: value }));
  };

  const submitTechnicalReview = (input: TechnicalReviewMutationInput) => {
    const comment = input.comment?.trim() || '';
    if (input.decision === 'REJECTED' && !comment) {
      SnackbarUtilities.warning('Comentario requerido para rechazar.');
      return;
    }
    technicalReviewMutation.mutate({ ...input, comment });
  };

  const handleReviewTask = (
    task: SubTask,
    decision: CommitmentReviewDecision,
    target: ReturnType<typeof reviewContextForNode> | null
  ) => {
    if (decision === 'NOT_APPLICABLE' && !target?.commitment) {
      SnackbarUtilities.warning('No hay compromiso asociado para marcar N/A.');
      return;
    }
    submitTechnicalReview({
      node: { type: 'TASK', id: task.id },
      decision,
      comment: reviewComments[`TASK:${task.id}`],
      commitmentId: target?.commitment.id,
      contextId: target?.context?.id,
    });
  };

  const handleReviewLevel = (
    level: Level,
    decision: CommitmentReviewDecision,
    target: ReturnType<typeof reviewContextForNode> | null
  ) => {
    const applyToChildren =
      decision === 'APPROVED' && Boolean(reviewApplyChildren[level.id]);
    const input: TechnicalReviewMutationInput = {
      node: { type: 'LEVEL', id: level.id },
      decision,
      comment: reviewComments[`LEVEL:${level.id}`],
      commitmentId: target?.commitment.id,
      contextId: target?.context?.id,
      applyToChildren,
    };
    if (applyToChildren) {
      setPendingLevelReview({
        ...input,
        levelName: level.name || 'Nivel',
        affectedTasks: collectTasks(level).filter(reviewableTask).length,
      });
      return;
    }
    submitTechnicalReview(input);
  };

  const openExecutionTask = (task: SubTask) => {
    setExecutionSession({ taskId: task.id });
    setExecutionSheetOpen(true);
  };

  useEffect(() => {
    const taskIdFromUrl = Number(searchParams.get('taskId'));
    if (
      !treeQuery.data ||
      !taskIdFromUrl ||
      Number.isNaN(taskIdFromUrl) ||
      !workUnitId ||
      !selectedProjectId ||
      !selectedStageId
    ) {
      return;
    }

    const openTask = searchParams.get('openTask') === '1';
    const deepLinkKey = [
      workUnitId,
      selectedProjectId,
      selectedStageId,
      taskIdFromUrl,
      openTask,
    ].join(':');
    if (deepLinkHandledRef.current === deepLinkKey) return;

    const task = findTaskById(treeQuery.data, taskIdFromUrl);
    if (!task) return;

    const levelIdFromUrl = Number(searchParams.get('levelId'));
    const matchingLevelIds = collectLevelIdsContainingTask(
      treeQuery.data,
      taskIdFromUrl
    );
    window.requestAnimationFrame(() => {
      setCollapsedLevelIds(current => {
        const next = new Set(current);
        matchingLevelIds.forEach(levelId => next.delete(levelId));
        if (levelIdFromUrl && !Number.isNaN(levelIdFromUrl)) {
          next.delete(levelIdFromUrl);
        }
        return next;
      });
    });
    setFocusedTaskId(taskIdFromUrl);
    setAutoOpenTaskFilesId(taskIdFromUrl);
    deepLinkHandledRef.current = deepLinkKey;

    window.requestAnimationFrame(() => {
      document
        .querySelector(`[data-technical-task-id="${taskIdFromUrl}"]`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });

    if (openTask) {
      openExecutionTask(task);
    }
  }, [
    searchParams,
    selectedProjectId,
    selectedStageId,
    treeQuery.data,
    workUnitId,
  ]);

  const openDirectReassignTask = (task: SubTask) => {
    setDirectReassignTask(task);
    setDirectReassignOwnerId(String(taskActiveAssignment(task)?.userId ?? ''));
    setDirectReassignReason('');
  };

  const selfAssignTaskMutation = useMutation({
    mutationFn: async (task: SubTask) => {
      if (!workUnitId || !selectedProjectId || !selectedStageId) {
        throw new Error('Selecciona oficina, proyecto y etapa.');
      }
      if (!sessionUserId) throw new Error('No se pudo identificar al usuario.');
      return selfAssignTechnicalExecutionTask(workUnitId, task.id, {
        projectId: selectedProjectId,
        stageId: selectedStageId,
      });
    },
    onSuccess: updatedTask => {
      SnackbarUtilities.success('Te asignaste como responsable tecnico.');
      patchTechnicalTaskInTree(updatedTask);
      queryClient.invalidateQueries({
        queryKey: ['technical-office-stage-tree'],
      });
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo asignar la subtarea.'
      );
    },
  });

  const saveMeetingViewConfigMutation = useMutation({
    mutationFn: () => updateMeetingViewConfig(selectedUnitId, meetingViewDraft),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['meeting-view-config', selectedUnitId],
      });
      SnackbarUtilities.success('Configuracion de reuniones guardada');
      setMeetingViewConfigOpen(false);
    },
    onError: () =>
      SnackbarUtilities.error('No se pudo guardar la configuracion'),
  });

  const restoreMeetingViewConfigMutation = useMutation({
    mutationFn: () => deleteMeetingViewConfig(selectedUnitId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['meeting-view-config', selectedUnitId],
      });
      SnackbarUtilities.success('La unidad vuelve a heredar su configuracion');
    },
    onError: () =>
      SnackbarUtilities.error('No se pudo restaurar la configuracion heredada'),
  });

  const directReassignMutation = useMutation({
    mutationFn: async () => {
      if (
        !workUnitId ||
        !selectedProjectId ||
        !selectedStageId ||
        !directReassignTask
      ) {
        throw new Error('Selecciona oficina, proyecto, etapa y subtarea.');
      }
      const newOwnerId = Number(directReassignOwnerId);
      if (!newOwnerId) throw new Error('Selecciona el nuevo responsable.');
      if (
        directReassignTask.status === 'INREVIEW' &&
        !directReassignReason.trim()
      ) {
        throw new Error('Ingresa el motivo para retirar el envio pendiente.');
      }
      return reassignTechnicalExecutionTask(workUnitId, directReassignTask.id, {
        projectId: selectedProjectId,
        stageId: selectedStageId,
        newOwnerId,
        reason: directReassignReason.trim() || null,
        withdrawPendingReview: directReassignTask.status === 'INREVIEW',
      });
    },
    onSuccess: updatedTask => {
      SnackbarUtilities.success('Responsable tecnico actualizado.');
      patchTechnicalTaskInTree(updatedTask);
      setDirectReassignTask(null);
      setDirectReassignOwnerId('');
      setDirectReassignReason('');
      queryClient.invalidateQueries({
        queryKey: ['technical-office-stage-tree'],
      });
      if (activeMeetingId) {
        queryClient.invalidateQueries({
          queryKey: ['meeting-session-commitments', activeMeetingId],
        });
      }
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo reasignar la subtarea.'
      );
    },
  });

  const technicalExecutionPayload = (
    input: TechnicalExecutionMutationInput
  ) => {
    const taskId = input.taskId;
    if (!workUnitId || !selectedProjectId || !selectedStageId || !taskId) {
      throw new Error('Selecciona oficina, proyecto, etapa y subtarea.');
    }
    return {
      unitId: workUnitId,
      taskId,
      payload: {
        projectId: selectedProjectId,
        stageId: selectedStageId,
        percentage: input.percentage,
        files: input.files ?? [],
        fileType: input.fileType ?? 'UPLOADS',
      },
    };
  };

  const technicalExecutionReviewMutation = useMutation({
    mutationFn: async (input: TechnicalExecutionMutationInput) => {
      setTaskUploading(input.taskId, true);
      const { unitId, taskId, payload } = technicalExecutionPayload(input);
      const updatedTask = await sendTechnicalExecutionReview(
        unitId,
        taskId,
        payload
      );
      return updatedTask;
    },
    onSuccess: updatedTask => {
      SnackbarUtilities.success('Entregable enviado a revision.');
      patchTechnicalTaskInTree(updatedTask);
      setAutoOpenTaskFilesId(updatedTask.id);
      queryClient.invalidateQueries({
        queryKey: ['technical-office-task-files', updatedTask.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['technical-office-stage-tree'],
      });
    },
    onSettled: (_data, _error, input) => {
      if (input?.taskId) setTaskUploading(input.taskId, false);
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error ? error.message : 'No se pudo enviar a revision.'
      );
    },
  });

  const handleInlineExecutionDrop = (task: SubTask, files: FileList) => {
    const nextFiles = Array.from(files);
    if (!nextFiles.length || uploadingTaskIds.has(task.id)) return;
    const percentage = Number(quickUploadPercentages[task.id] || 100);
    technicalExecutionReviewMutation.mutate({
      taskId: task.id,
      percentage: Number.isFinite(percentage) ? percentage : 100,
      files: nextFiles,
      fileType: 'UPLOADS',
    });
  };

  const handleQuickUploadPercentageChange = (taskId: number, value: string) => {
    const cleanValue =
      value === '' ? '' : String(Math.max(0, Math.min(100, Number(value))));
    setQuickUploadPercentages(current => ({
      ...current,
      [taskId]: cleanValue,
    }));
  };

  const handleQuickUploadFiles = (task: SubTask, files: FileList) => {
    const nextFiles = Array.from(files);
    if (!nextFiles.length || uploadingTaskIds.has(task.id)) return;
    const percentage = Number(quickUploadPercentages[task.id] || 100);
    technicalExecutionReviewMutation.mutate({
      taskId: task.id,
      percentage: Number.isFinite(percentage) ? percentage : 100,
      files: nextFiles,
      fileType: 'UPLOADS',
    });
  };

  const openCommitmentDetail = (
    commitment: Commitment,
    node?: TechnicalNodeRef
  ) => {
    setCommitmentDetail({ commitment, node });
    setCommitmentDetailDraft({
      title: commitment.title,
      description: commitment.description ?? '',
      dueDate: commitment.dueDate ? commitment.dueDate.slice(0, 10) : '',
      status: commitment.status,
      priority: commitment.priority,
    });
  };

  const updateCommitmentDetailMutation = useMutation({
    mutationFn: async () => {
      if (!commitmentDetail) throw new Error('Selecciona un compromiso.');
      return updateCommitment(commitmentDetail.commitment.id, {
        title: commitmentDetailDraft.title.trim(),
        description: commitmentDetailDraft.description.trim() || null,
        dueDate: commitmentDetailDraft.dueDate
          ? new Date(`${commitmentDetailDraft.dueDate}T12:00:00`).toISOString()
          : null,
        status: commitmentDetailDraft.status,
        priority: commitmentDetailDraft.priority,
      });
    },
    onSuccess: commitment => {
      SnackbarUtilities.success('Compromiso actualizado.');
      setCommitmentDetail(current =>
        current ? { ...current, commitment } : current
      );
      queryClient.invalidateQueries({
        queryKey: ['technical-office-commitments'],
      });
      queryClient.invalidateQueries({ queryKey: ['meeting-unit-dashboard'] });
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el compromiso.'
      );
    },
  });

  const handleCompressLevel = async (
    level: Level,
    type: 'all' | 'pdf' | 'nopdf' | 'merge'
  ) => {
    if (compressingLevelKey) return;
    const key = `${level.id}:${type}`;
    setCompressingLevelKey(key);
    try {
      const name = level.name || `Nivel ${level.id}`;
      if (type === 'merge') {
        await handleMergePdfs('level', level.id, name, '/download/merge-');
      } else {
        await handleArchiver({
          type,
          id: level.id,
          name,
          typeLevel: 'level',
          service: '/download/',
          itemLevel: level.item?.split('.').slice(-1).join('.') || '',
        });
      }
    } catch (error) {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo comprimir el nivel.'
      );
    } finally {
      setCompressingLevelKey(null);
    }
  };

  const handleValuationDaysChange = (task: SubTask, value: string) => {
    const nextDays = numericValue(value);
    setValuationDrafts(current => {
      const next = { ...current };
      if (nextDays === numericValue(task.days)) {
        delete next[task.id];
      } else {
        next[task.id] = { days: value };
      }
      return next;
    });
  };

  const handleValuationAmountChange = (task: SubTask, value: string) => {
    const days = valuationDaysFromAmount(
      numericValue(value),
      valuationMonthlyPriceNumber
    );
    handleValuationDaysChange(task, String(days));
  };

  const discardValuationChanges = () => {
    setValuationDrafts({});
    setValuationMonthlyPrice(
      String(numericValue(treeQuery.data?.monthlyPrice))
    );
    setValuationMonthlyPriceTouched(false);
  };

  const technicalValuationMutation = useMutation({
    mutationFn: async () => {
      if (!workUnitId || !selectedProjectId || !selectedStageId) {
        throw new Error('Selecciona oficina, proyecto y etapa.');
      }
      const tasks = collectTasks(treeQuery.data);
      const monthlyChanged =
        valuationMonthlyPriceNumber !==
        numericValue(treeQuery.data?.monthlyPrice);
      const tasksToSave = (
        monthlyChanged ? tasks : tasks.filter(task => valuationDrafts[task.id])
      ).map(task => ({
        id: task.id,
        days: taskValuationDays(task, valuationDrafts),
      }));
      if (!tasksToSave.length) {
        throw new Error('No hay cambios de valorizacion para guardar.');
      }
      return updateTechnicalValuation(workUnitId, {
        projectId: selectedProjectId,
        stageId: selectedStageId,
        monthlyPrice: valuationMonthlyPriceNumber,
        tasks: tasksToSave,
      });
    },
    onSuccess: data => {
      SnackbarUtilities.success('Valorizacion actualizada.');
      queryClient.setQueryData(
        [
          'technical-office-stage-tree',
          workUnitId,
          selectedProjectId,
          selectedStageId,
        ],
        data
      );
      setValuationDrafts({});
      setValuationMonthlyPrice(String(numericValue(data.monthlyPrice)));
      setValuationMonthlyPriceTouched(false);
      queryClient.invalidateQueries({
        queryKey: ['technical-office-stage-tree'],
      });
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la valorizacion.'
      );
    },
  });

  const isNodeSelected = (state: SelectionState, node: TechnicalNodeRef) =>
    node.type === 'LEVEL'
      ? state.levelIds.has(node.id)
      : state.taskIds.has(node.id);

  const selectNodeForInlineEdit = (node: TechnicalNodeRef) => {
    setSelection(current => {
      if (selectedCount(current) > 1 && isNodeSelected(current, node)) {
        return current;
      }
      if (isNodeSelected(current, node)) return current;

      if (node.type === 'LEVEL') {
        const level = findLevelById(treeQuery.data, node.id);
        return {
          levelIds: new Set([node.id]),
          taskIds: new Set(collectTaskIds(level)),
        };
      }

      return {
        levelIds: new Set(),
        taskIds: new Set([node.id]),
      };
    });
  };

  const handleInlineAssigneesChange = (
    node: TechnicalNodeRef,
    userIds: number[]
  ) => {
    selectNodeForInlineEdit(node);
    setDraft(current => ({
      ...current,
      assigneeUserIds: userIds,
      technicalOwnerId: userIds[0] ?? null,
      reflectAssignment: Boolean(userIds.length),
    }));
  };

  const downloadSelectedLevelEditables = async () => {
    const levels = collectSelectedLevels(treeQuery.data, selection.levelIds);
    if (!levels.length) {
      SnackbarUtilities.info('Selecciona al menos un nivel.');
      return;
    }
    for (const level of levels) {
      await handleArchiver({
        type: 'nopdf',
        id: level.id,
        name: level.name || `Nivel ${level.id}`,
        typeLevel: 'level',
        service: '/download/',
        itemLevel: level.item?.split('.').slice(-1).join('.') || '',
      });
    }
  };

  const buildDefaultTechnicalCommitmentTitle = () => {
    const stageName = selectedStage?.name || 'etapa seleccionada';
    const currentProjectName = selectedProject
      ? projectLabel(selectedProject)
      : 'proyecto seleccionado';

    if (selection.levelIds.size === 1) {
      const level = findLevelById(
        treeQuery.data,
        Array.from(selection.levelIds)[0]
      );
      if (level?.name?.trim()) {
        return `Entregar ${level.name.trim()} - ${stageName} - ${currentProjectName}`;
      }
    }

    if (!selection.levelIds.size && selection.taskIds.size === 1) {
      const task = findTaskById(
        treeQuery.data,
        Array.from(selection.taskIds)[0]
      );
      if (task?.name?.trim()) {
        return `Entregar ${task.name.trim()} - ${stageName} - ${currentProjectName}`;
      }
    }

    const deliverablesCount = selection.taskIds.size || selection.levelIds.size;
    if (deliverablesCount > 1) {
      return `Entregar ${deliverablesCount} entregables - ${stageName} - ${currentProjectName}`;
    }

    return `Entregar entregable tecnico - ${stageName} - ${currentProjectName}`;
  };

  const buildTechnicalCommitmentPayload = (
    reflectAssignment = draft.reflectAssignment,
    assignmentMode?: TechnicalAssignmentMode
  ) => {
    if (!workUnitId || !selectedProjectId || !selectedStageId) {
      throw new Error('Selecciona una oficina, proyecto y etapa.');
    }
    if (!selectedCount(selection)) {
      throw new Error('Selecciona al menos un nivel o subtarea.');
    }
    if (reflectAssignment && !draft.technicalOwnerId) {
      throw new Error('Selecciona un responsable tecnico principal.');
    }
    const normalizedLevelIds = Array.from(selection.levelIds).filter(
      levelId => {
        const level = findLevelById(treeQuery.data, levelId);
        const descendantTaskIds = collectTaskIds(level);
        return (
          !descendantTaskIds.length ||
          descendantTaskIds.every(taskId => selection.taskIds.has(taskId))
        );
      }
    );
    const fullySelectedTaskIds = new Set(
      normalizedLevelIds.flatMap(levelId =>
        collectTaskIds(findLevelById(treeQuery.data, levelId))
      )
    );
    const normalizedSubTaskIds = Array.from(selection.taskIds).filter(
      taskId => !fullySelectedTaskIds.has(taskId)
    );
    const title = draft.title.trim() || buildDefaultTechnicalCommitmentTitle();
    return {
      projectId: selectedProjectId,
      stageId: selectedStageId,
      meetingId: activeMeetingId,
      title,
      description: draft.description.trim() || null,
      dueDate: draft.dueDate
        ? new Date(`${draft.dueDate}T12:00:00`).toISOString()
        : null,
      priority: draft.priority,
      levelIds: normalizedLevelIds,
      subTaskIds: normalizedSubTaskIds,
      assigneeUserIds: draft.assigneeUserIds,
      technicalOwnerId: draft.technicalOwnerId ?? undefined,
      reflectAssignment,
      assignmentMode,
    };
  };

  const previewHasConflicts = (preview: TechnicalCommitmentPreview) =>
    preview.summary.assignedToOther > 0 ||
    preview.summary.reopenable > 0 ||
    preview.summary.locked > 0 ||
    preview.summary.withOpenCommitments > 0 ||
    preview.rows.some(row => row.action === 'SKIP');

  const previewAssignmentMutation = useMutation({
    mutationFn: async () =>
      previewTechnicalCommitmentAssignment(
        workUnitId,
        buildTechnicalCommitmentPayload(true)
      ),
    onSuccess: preview => {
      setAssignmentPreview(preview);
      setPreviewOpen(true);
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo previsualizar la asignacion.'
      );
    },
  });

  const quickAssignMutation = useMutation({
    mutationFn: async () => {
      const preview = await previewTechnicalCommitmentAssignment(
        workUnitId,
        buildTechnicalCommitmentPayload(true)
      );
      if (previewHasConflicts(preview)) {
        return { preview, created: null };
      }
      const created = await createTechnicalCommitment(
        workUnitId,
        buildTechnicalCommitmentPayload(true, 'UNRESOLVED_ONLY')
      );
      return { preview, created };
    },
    onSuccess: result => {
      if (!result.created) {
        setAssignmentPreview(result.preview);
        setPreviewOpen(true);
        SnackbarUtilities.warning(
          'Se encontraron conflictos. Revisa antes de asignar.'
        );
        return;
      }
      SnackbarUtilities.success(
        `Compromiso creado. ${result.created.assignment.assigned} subtareas asignadas.`
      );
      setPreviewOpen(false);
      setAssignmentPreview(null);
      setEvidenceRow(null);
      setSheetOpen(false);
      setDraft(defaultDraft());
      setSelection(emptySelection());
      queryClient.invalidateQueries({
        queryKey: ['technical-office-commitments'],
      });
      queryClient.invalidateQueries({
        queryKey: ['technical-office-stage-tree'],
      });
      if (activeMeetingId) {
        queryClient.invalidateQueries({
          queryKey: ['meeting-session-commitments', activeMeetingId],
        });
      }
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error ? error.message : 'No se pudo asignar.'
      );
    },
  });

  const handlePrimaryCommitmentAction = () => {
    if (draft.assigneeUserIds.length && draft.dueDate) {
      quickAssignMutation.mutate();
      return;
    }
    setDraft(current => ({
      ...current,
      title: current.title || buildDefaultTechnicalCommitmentTitle(),
    }));
    setSheetOpen(true);
  };

  const createTechnicalCommitmentMutation = useMutation({
    mutationFn: async ({
      reflectAssignment,
      assignmentMode,
    }: {
      reflectAssignment: boolean;
      assignmentMode: TechnicalAssignmentMode;
    }) =>
      createTechnicalCommitment(
        workUnitId,
        buildTechnicalCommitmentPayload(reflectAssignment, assignmentMode)
      ),
    onSuccess: result => {
      const assigned = result.assignment.assigned;
      const reassigned = result.assignment.reassigned;
      const reopened = result.assignment.reopened;
      SnackbarUtilities.success(
        assigned || reassigned || reopened
          ? `Compromiso creado. ${assigned} asignadas, ${reassigned} reasignadas, ${reopened} reabiertas.`
          : 'Compromiso tecnico creado.'
      );
      setPreviewOpen(false);
      setAssignmentPreview(null);
      setEvidenceRow(null);
      setSheetOpen(false);
      setDraft(defaultDraft());
      setSelection(emptySelection());
      queryClient.invalidateQueries({
        queryKey: ['technical-office-commitments'],
      });
      queryClient.invalidateQueries({
        queryKey: ['technical-office-stage-tree'],
      });
      if (activeMeetingId) {
        queryClient.invalidateQueries({
          queryKey: ['meeting-session-commitments', activeMeetingId],
        });
      }
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo crear el compromiso.'
      );
    },
  });

  const setWorkspaceTab = (tab: WorkspaceTab) => {
    updateParams({ tab });
  };

  const summaryDashboard = selectedUnitDashboardQuery.data;
  const summaryProjects = summaryDashboard?.projects ?? [];
  const summaryMeetings = (summaryDashboard?.meetings ?? []) as any[];
  const summaryCommitments = (summaryDashboard?.commitments ?? []) as any[];
  const summaryReports = (summaryDashboard?.reports ?? []) as any[];
  const summaryMembers =
    selectedUnitProjectModeratorsQuery.data?.memberships ?? [];

  const renderWorkspaceSummary = () => {
    if (
      selectedUnitDashboardQuery.isLoading ||
      selectedUnitProjectModeratorsQuery.isLoading
    )
      return <LoaderForComponent />;
    return (
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Proyectos activos',
              value: summaryProjects.length,
              icon: <FolderTree size={18} />,
            },
            {
              label: 'Compromisos abiertos',
              value: summaryCommitments.length,
              icon: <ClipboardList size={18} />,
            },
            {
              label: 'Reuniones (mes)',
              value: summaryMeetings.length,
              icon: <CalendarDays size={18} />,
            },
            {
              label: 'Miembros',
              value: summaryMembers.length,
              icon: <Users size={18} />,
            },
          ].map(metric => (
            <article
              key={metric.label}
              className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-sm">{metric.label}</span>
                {metric.icon}
              </div>
              <strong className="mt-3 block text-3xl font-bold text-slate-950">
                {metric.value}
              </strong>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            <article className="rounded-md border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <h2 className="text-lg font-semibold">Proyectos activos</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWorkspaceTab('proyectos')}
                >
                  Ver proyectos
                </Button>
              </div>
              {summaryProjects.slice(0, 5).map(projectFocus => (
                <div
                  key={`${projectFocus.unitId}-${projectFocus.projectId}`}
                  className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {getDashboardProjectName(projectFocus)}
                    </p>
                    <p className="text-sm text-slate-500">
                      CUI: {projectFocus.project.contract?.cui || 'S/C'}
                    </p>
                  </div>
                  <Badge
                    variant={
                      projectFocus.status === 'ACTIVE' ? 'success' : 'outline'
                    }
                  >
                    {projectFocus.status}
                  </Badge>
                </div>
              ))}
              {!summaryProjects.length && (
                <p className="p-4 text-sm text-slate-500">
                  No hay proyectos activos para esta oficina.
                </p>
              )}
            </article>

            <article className="rounded-md border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4">
                <h2 className="text-lg font-semibold">Reuniones recientes</h2>
              </div>
              {summaryMeetings.slice(0, 4).map(meeting => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {meeting.title || 'Reunion sin titulo'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatDateTime(meeting.scheduledAt)}
                    </p>
                  </div>
                  <Badge variant="outline">{meeting.status || 'DRAFT'}</Badge>
                </div>
              ))}
              {!summaryMeetings.length && (
                <p className="p-4 text-sm text-slate-500">
                  Sin reuniones registradas.
                </p>
              )}
            </article>

            <article className="rounded-md border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4">
                <h2 className="text-lg font-semibold">Compromisos abiertos</h2>
              </div>
              {summaryCommitments.slice(0, 6).map(commitment => (
                <div
                  key={commitment.id}
                  className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
                >
                  <p className="font-semibold text-slate-950">
                    {commitment.title}
                  </p>
                  <span className="text-sm text-slate-500">
                    {commitment.project?.name || 'General'} /{' '}
                    {commitment.status}
                  </span>
                </div>
              ))}
              {!summaryCommitments.length && (
                <p className="p-4 text-sm text-slate-500">
                  Sin compromisos abiertos.
                </p>
              )}
            </article>
          </div>

          <aside className="space-y-6">
            <article className="rounded-md border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <h2 className="text-lg font-semibold">Miembros</h2>
                <button
                  type="button"
                  className="text-sm font-semibold text-blue-700"
                  onClick={() => setWorkspaceTab('miembros')}
                >
                  Gestionar
                </button>
              </div>
              {summaryMembers.slice(0, 6).map(membership => (
                <div
                  key={membership.user.id}
                  className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
                >
                  <span className="grid size-9 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                    {memberLabel(membership).slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-950">
                      {memberLabel(membership)}
                    </p>
                    <p className="text-xs uppercase text-slate-500">
                      {membership.user.profile?.job || 'Miembro'}
                    </p>
                  </div>
                </div>
              ))}
              {!summaryMembers.length && (
                <p className="p-4 text-sm text-slate-500">
                  Sin miembros activos.
                </p>
              )}
            </article>

            <article className="rounded-md border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4">
                <h2 className="text-lg font-semibold">Ultimos informes</h2>
              </div>
              {summaryReports.slice(0, 4).map(report => (
                <div
                  key={report.id}
                  className="border-b border-slate-100 px-4 py-3 last:border-b-0"
                >
                  <p className="font-semibold text-slate-950">
                    {report.title || report.project?.name || 'Informe'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {report.status || 'DRAFT'}
                  </p>
                </div>
              ))}
              {!summaryReports.length && (
                <p className="p-4 text-sm text-slate-500">
                  Sin informes recientes.
                </p>
              )}
            </article>
          </aside>
        </section>
      </div>
    );
  };

  const renderSimpleWorkspaceList = (tab: WorkspaceTab) => {
    if (
      selectedUnitDashboardQuery.isLoading ||
      selectedUnitProjectModeratorsQuery.isLoading
    )
      return <LoaderForComponent />;
    if (tab === 'calendario') {
      return (
        <article className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-lg font-semibold">Calendario de oficina</h2>
            <p className="text-sm text-slate-500">
              Reuniones y actividades de {displayTitle(selectedUnit?.name)}.
            </p>
          </div>
          {summaryMeetings.map(meeting => (
            <div
              key={meeting.id}
              className="border-b border-slate-100 p-4 last:border-b-0"
            >
              <p className="font-semibold">{meeting.title}</p>
              <p className="text-sm text-slate-500">
                {formatDateTime(meeting.scheduledAt)}
              </p>
            </div>
          ))}
          {!summaryMeetings.length && (
            <p className="p-4 text-sm text-slate-500">
              Sin reuniones programadas.
            </p>
          )}
        </article>
      );
    }
    if (tab === 'miembros') {
      const leadMember = summaryMembers.find(member => member.isUnitLead);
      return (
        <article className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-blue-700">
                Equipo de oficina
              </p>
              <h2 className="text-lg font-semibold">Miembros y permisos</h2>
              <p className="text-sm text-slate-500">
                Gestiona integrantes, gestores locales y responsable principal.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{summaryMembers.length} miembros</Badge>
              <Badge variant="outline">
                {
                  summaryMembers.filter(member => member.canManageUnitProjects)
                    .length
                }{' '}
                mods
              </Badge>
              <Button
                type="button"
                size="sm"
                disabled={!canManageSelectedUnit}
                onClick={() => setMemberModalOpen(true)}
              >
                <UserPlus size={15} />
                Agregar miembro
              </Button>
            </div>
          </div>
          <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Responsable de unidad
              </p>
              {leadMember ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Crown size={17} className="text-amber-500" />
                  <span className="font-semibold">
                    {memberLabel(leadMember)}
                  </span>
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                    Cabeza
                  </Badge>
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-500">
                  Aun no se definio un responsable principal.
                </p>
              )}
            </div>
            {!canManageSelectedUnit && (
              <Badge
                variant="outline"
                className="justify-self-start md:justify-self-end"
              >
                Solo lectura
              </Badge>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Miembro</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Permisos</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {summaryMembers.map(membership => (
                  <tr
                    key={membership.id || membership.user.id}
                    className={`border-t border-slate-100 ${
                      membership.isUnitLead ? 'bg-amber-50/45' : 'bg-white'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                          {memberLabel(membership).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-950">
                            {memberLabel(membership)}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {membership.user.profile?.job ||
                              membership.user.email ||
                              'Miembro'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="grid gap-1">
                        <Select
                          value={
                            membership.user.roleId
                              ? String(membership.user.roleId)
                              : '__none'
                          }
                          disabled={
                            !canManageSelectedUnit ||
                            updateMemberMutation.isPending ||
                            globalRolesQuery.isLoading
                          }
                          onValueChange={value =>
                            updateMemberMutation.mutate({
                              membershipId: membership.id,
                              payload: {
                                roleId:
                                  value === '__none' ? null : Number(value),
                              },
                            })
                          }
                        >
                          <SelectTrigger className="h-9 w-48">
                            <SelectValue placeholder="Sin rol global" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none">
                              Sin rol global
                            </SelectItem>
                            {(globalRolesQuery.data || []).map(role => (
                              <SelectItem key={role.id} value={String(role.id)}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-slate-500">
                          Org: {officeRoleLabel(membership.role)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                        <Checkbox
                          checked={Boolean(membership.canManageUnitProjects)}
                          disabled={
                            !canManageSelectedUnit ||
                            !isModuleMod ||
                            updateMemberMutation.isPending
                          }
                          onCheckedChange={checked =>
                            updateMemberMutation.mutate({
                              membershipId: membership.id,
                              payload: {
                                canManageUnitProjects: Boolean(checked),
                              },
                            })
                          }
                        />
                        <span>MOD oficina</span>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                        <Checkbox
                          checked={Boolean(membership.isUnitLead)}
                          disabled={
                            !canManageSelectedUnit ||
                            updateMemberMutation.isPending
                          }
                          onCheckedChange={checked =>
                            updateMemberMutation.mutate({
                              membershipId: membership.id,
                              payload: { isUnitLead: Boolean(checked) },
                            })
                          }
                        />
                        <span>
                          {membership.isUnitLead ? 'Cabeza' : 'Marcar'}
                        </span>
                      </label>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={!canManageSelectedUnit}
                        onClick={() => setMemberToRemove(membership.id)}
                      >
                        <Trash2 size={15} />
                        Quitar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!summaryMembers.length && (
              <div className="border-t border-slate-100 p-8 text-center text-sm text-slate-500">
                No hay miembros activos en esta oficina.
              </div>
            )}
          </div>
        </article>
      );
    }
    return (
      <CommitmentsBoardWorkspace
        unitId={selectedUnitId}
        scope={scope}
        embedded
      />
    );
  };

  if (overviewQuery.isLoading) return <LoaderForComponent />;

  return (
    <TooltipProvider>
      <main
        className={`flex min-h-0 flex-col text-slate-950 ${
          embedded
            ? 'h-auto overflow-visible bg-transparent'
            : 'h-[100dvh] overflow-hidden bg-slate-100'
        }`}
      >
        {!embedded && (
          <header className="border-b border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2">
              <div className="flex min-w-0 max-w-xl flex-1 items-center gap-1">
                <OfficeUnitTreeSelect
                  value={selectedUnitId}
                  units={visibleUnits}
                  onValueChange={value => {
                    setSelectedUnitId(value);
                    setSelectedFocusId(null);
                    setSelectedProjectId(null);
                    setSelectedStageId(null);
                    updateParams({
                      unitId: value,
                      focusId: null,
                      projectId: null,
                      stageId: null,
                      tab: activeTab,
                    });
                  }}
                  placeholder="Selecciona una oficina"
                  triggerClassName="flex h-8 w-full min-w-0 items-center justify-between border-0 bg-transparent px-0 py-0 text-left text-base font-bold uppercase tracking-normal text-slate-950 hover:text-blue-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
                {canManageSelectedUnit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-slate-500 hover:text-blue-700"
                        onClick={() => setMeetingViewConfigOpen(true)}
                        aria-label="Configurar vistas de reunión"
                      >
                        <Settings2 size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Configurar vistas de reunión
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <nav className="order-3 flex gap-5 overflow-x-auto sm:order-none">
                {workspaceTabs.map(item => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setWorkspaceTab(item.value)}
                    className={`relative whitespace-nowrap py-2 text-sm font-semibold ${
                      activeTab === item.value
                        ? 'text-blue-700 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-blue-700'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <div className="grid grid-cols-2 gap-1 rounded-md border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
                      scope === 'self'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    onClick={() => {
                      setScope('self');
                      updateParams({ scope: 'self' });
                    }}
                  >
                    Solo oficina
                  </button>
                  <button
                    type="button"
                    disabled={!canUseDescendantScope}
                    className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
                      scope === 'descendants'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    } ${!canUseDescendantScope ? 'opacity-50' : ''}`}
                    onClick={() => {
                      setScope('descendants');
                      updateParams({ scope: 'descendants' });
                    }}
                  >
                    Con suboficinas
                  </button>
                </div>
                <Button
                  type="button"
                  className="h-8 bg-blue-600 text-white hover:bg-blue-700"
                  disabled={!selectedUnitId}
                  onClick={() => setShowNewMeeting(true)}
                >
                  <Plus size={16} />
                  Nueva reunión
                </Button>
              </div>
            </div>
          </header>
        )}

        <section
          className={`min-h-0 flex-1 overflow-y-auto ${
            embedded ? 'p-0' : 'p-4'
          }`}
        >
          {!visibleUnits.length && (
            <section className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No tienes oficinas disponibles para este modulo.
            </section>
          )}

          {!!visibleUnits.length &&
            activeTab === 'resumen' &&
            renderWorkspaceSummary()}

          {!!visibleUnits.length &&
            ['calendario', 'miembros', 'compromisos'].includes(activeTab) &&
            renderSimpleWorkspaceList(activeTab)}

          {!!visibleUnits.length && activeTab === 'proyectos' && (
            <div
              className={`grid min-h-[calc(100vh-150px)] gap-4 ${
                showProjectPanel
                  ? 'xl:grid-cols-[330px_minmax(0,1fr)]'
                  : 'grid-cols-1'
              }`}
            >
              {showProjectPanel && (
                <aside className="rounded-md border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase text-slate-500">
                          Pestana Proyectos
                        </p>
                        <h2 className="text-base font-semibold">
                          Proyectos tecnicos
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline">
                          {filteredProjects.length} proyectos
                        </Badge>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 text-slate-500 hover:text-blue-700"
                                onClick={() => setShowProjectPanel(false)}
                              >
                                <PanelLeftClose size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ocultar proyectos</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <label className="text-xs font-semibold uppercase text-slate-500">
                        Buscar proyecto / CUI
                        <div className="relative mt-1">
                          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                          <Input
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            className="pl-9"
                            placeholder="Nombre, contrato, CUI u oficina"
                          />
                        </div>
                      </label>
                      <Button
                        type="button"
                        className="w-full"
                        size="sm"
                        onClick={() => openProjectModal()}
                      >
                        <Plus size={15} />
                        Gestionar proyectos
                      </Button>
                      <button
                        type="button"
                        className={`w-full rounded-md border px-3 py-2 text-xs font-semibold transition ${
                          showInactiveProjects
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                        onClick={() => setShowInactiveProjects(value => !value)}
                      >
                        {showInactiveProjects
                          ? 'Ocultar inactivos'
                          : 'Mostrar inactivos'}
                      </button>
                    </div>
                  </div>
                  {projectsQuery.isLoading && (
                    <div className="space-y-2 p-4">
                      {[1, 2, 3].map(item => (
                        <div
                          key={item}
                          className="h-16 animate-pulse rounded-md bg-slate-100"
                        />
                      ))}
                    </div>
                  )}
                  {!projectsQuery.isLoading && !filteredProjects.length && (
                    <div className="p-6 text-sm text-slate-500">
                      No hay proyectos tecnicos vinculados a esta oficina.
                    </div>
                  )}
                  <div className="max-h-[calc(100vh-250px)] overflow-auto p-2">
                    {filteredProjects.map(focus => {
                      const active = focusKey(focus) === selectedFocusId;
                      const stages = showInactiveProjects
                        ? focus.stageFocus ?? []
                        : activeStageFocus(focus);
                      return (
                        <div
                          key={`${focus.id}-${focus.projectId}`}
                          className={`mb-2 w-full rounded-md border p-3 text-left transition ${
                            active
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => selectProjectFocus(focus)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-950">
                                {projectLabel(focus)}
                              </p>
                              <Badge
                                variant={
                                  focus.status === 'ACTIVE'
                                    ? 'success'
                                    : 'outline'
                                }
                              >
                                {focus.status}
                              </Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <ClipboardList size={13} />
                                CUI {focus.project.contract?.cui || 'S/C'}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays size={13} />
                                {stages.length} etapas activas
                              </span>
                            </div>
                            <p className="mt-2 text-xs font-medium text-slate-600">
                              {focus.unit?.name ||
                                selectedUnit?.name ||
                                'Oficina'}
                            </p>
                          </button>
                          {!!stages.length && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {stages.map(stageFocus => (
                                <button
                                  key={stageFocus.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedFocusId(focusKey(focus));
                                    setSelectedProjectId(focus.projectId);
                                    setSelectedStageId(stageFocus.stageId);
                                    updateParams({
                                      focusId: focusKey(focus),
                                      projectId: String(focus.projectId),
                                      stageId: String(stageFocus.stageId),
                                    });
                                  }}
                                  className={`rounded-md border px-2 py-1 text-xs font-semibold transition ${
                                    stageFocus.status === 'INACTIVE'
                                      ? 'border-slate-200 bg-slate-100 text-slate-400'
                                      : selectedStageId ===
                                          stageFocus.stageId && active
                                      ? 'border-blue-500 bg-white text-blue-700'
                                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:text-blue-700'
                                  }`}
                                  disabled={stageFocus.status === 'INACTIVE'}
                                >
                                  {stageVersionLabel(stageFocus.stage)}
                                </button>
                              ))}
                            </div>
                          )}
                          {!stages.length && (
                            <p className="mt-3 rounded-md border border-dashed border-slate-200 p-2 text-xs text-slate-500">
                              Sin etapas asignadas a esta oficina.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>{' '}
                </aside>
              )}

              <section className="min-w-0 rounded-md border border-slate-200 bg-white shadow-sm">
                {!selectedProject && (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Selecciona un proyecto para ver sus etapas.
                  </div>
                )}

                {selectedProject && (
                  <>
                    <div className="relative border-b border-slate-200 px-4 py-3 pb-9">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            CUI {selectedProject.project.contract?.cui || 'S/C'}
                          </p>
                          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                            <h2 className="truncate text-xl font-bold">
                              <Select
                                value={selectedFocusId ?? undefined}
                                onValueChange={handleProjectFocusChange}
                              >
                                <SelectTrigger
                                  aria-label="Cambiar proyecto"
                                  className="h-auto max-w-full justify-start gap-2 border-0 bg-transparent px-0 py-0 text-left text-xl font-bold shadow-none hover:bg-transparent focus:ring-0 focus:ring-offset-0 [&>span]:min-w-0 [&>span]:truncate"
                                >
                                  <SelectValue placeholder="Selecciona un proyecto" />
                                </SelectTrigger>
                                <SelectContent>
                                  {projects
                                    .filter(
                                      focus => focus.status !== 'INACTIVE'
                                    )
                                    .map(focus => (
                                      <SelectItem
                                        key={focusKey(focus)}
                                        value={focusKey(focus)}
                                      >
                                        {projectLabel(focus)}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </h2>
                            <span className="hidden text-slate-300 sm:inline">
                              |
                            </span>
                            <p className="text-sm text-slate-500">
                              {stageVersionLabel(selectedStage)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">
                            {countTasks(treeQuery.data)} subtareas
                          </Badge>
                          <Badge variant="info">
                            {(commitmentsQuery.data ?? []).length} compromisos
                          </Badge>
                        </div>
                      </div>
                      {!showProjectPanel && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute bottom-2 left-4 size-6 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                              onClick={() => setShowProjectPanel(true)}
                              aria-label="Mostrar proyectos"
                            >
                              <PanelLeftOpen size={16} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Mostrar proyectos</TooltipContent>
                        </Tooltip>
                      )}
                      {selectedStage && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute bottom-2 right-4 size-6 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                              aria-label="Acciones del árbol"
                            >
                              <Settings2 size={16} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-60 p-1" align="end">
                            <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Acciones del árbol
                            </p>
                            {isWorkPhase && (
                              <>
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() =>
                                    startStructureDraft({
                                      kind: 'ROOT_LEVEL',
                                      stageId: selectedStage.id,
                                      withTask: false,
                                    })
                                  }
                                  disabled={structureMutation.isPending}
                                >
                                  <ListPlus size={15} />
                                  Nivel raíz
                                </button>
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() =>
                                    startStructureDraft({
                                      kind: 'ROOT_LEVEL',
                                      stageId: selectedStage.id,
                                      withTask: true,
                                    })
                                  }
                                  disabled={structureMutation.isPending}
                                >
                                  <Plus size={15} />
                                  Nivel con subtarea
                                </button>
                              </>
                            )}
                            <div className="my-1 border-t border-slate-100" />
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={expandAllLevels}
                              disabled={!allLevelIds.length}
                            >
                              <ChevronDown size={15} />
                              Expandir todo
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={collapseAllLevels}
                              disabled={!allLevelIds.length}
                            >
                              <ChevronRight size={15} />
                              Contraer todo
                            </button>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>

                    {!selectedProjectStages.length && (
                      <div className="p-8 text-center text-sm text-slate-500">
                        Este proyecto no tiene etapas asignadas a esta oficina.
                      </div>
                    )}

                    {!!selectedProjectStages.length && (
                      <Tabs
                        value={
                          selectedStageId ? String(selectedStageId) : undefined
                        }
                        onValueChange={value => {
                          setSelectedStageId(Number(value));
                          updateParams({ stageId: value });
                        }}
                        className="min-h-0"
                      >
                        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 pt-2 lg:flex-row lg:items-end lg:justify-between">
                          <div className="flex min-w-0 gap-6 overflow-x-auto text-sm">
                            {workspacePhases.map(phase => (
                              <button
                                key={phase.value}
                                type="button"
                                disabled={phase.disabled}
                                onClick={() =>
                                  updateParams({ phase: phase.value })
                                }
                                className={`whitespace-nowrap border-b-2 px-1 pb-2 pt-1 font-medium ${
                                  activePhase === phase.value
                                    ? 'border-blue-600 font-semibold text-blue-700'
                                    : 'border-transparent text-slate-500 hover:text-blue-700'
                                } ${
                                  phase.disabled
                                    ? 'cursor-not-allowed opacity-55 hover:text-slate-500'
                                    : ''
                                }`}
                              >
                                {phase.label}
                              </button>
                            ))}
                          </div>
                          <div className="hidden">
                            <button
                              type="button"
                              className="whitespace-nowrap border-b-2 border-blue-600 px-1 pb-2 pt-1 font-semibold text-blue-700"
                            >
                              Estructura y asignación
                            </button>
                            <button
                              type="button"
                              disabled
                              className="whitespace-nowrap border-b-2 border-transparent px-1 pb-2 pt-1 font-medium text-slate-500"
                            >
                              Ejecución
                            </button>
                            <button
                              type="button"
                              disabled
                              className="whitespace-nowrap border-b-2 border-transparent px-1 pb-2 pt-1 font-medium text-slate-500"
                            >
                              Revisión
                            </button>
                            <button
                              type="button"
                              disabled
                              className="whitespace-nowrap border-b-2 border-transparent px-1 pb-2 pt-1 font-medium text-slate-500"
                            >
                              Valorización
                            </button>
                          </div>
                          <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-2">
                            {selectedProjectStageGroups.map(group => {
                              const selectedInGroup = group.versions.find(
                                version => version.id === selectedStageId
                              );
                              const actionStage =
                                selectedInGroup ||
                                group.versions.find(
                                  version => version.versionMetadata?.isCurrent
                                ) ||
                                group.versions[0];
                              if (!actionStage) return null;
                              const isActiveGroup = Boolean(selectedInGroup);
                              const menuDisabled = !canManageCurrentUnit;
                              const actionButtonClass =
                                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50';

                              return (
                                <ContextMenu key={group.id}>
                                  <ContextMenuTrigger asChild>
                                    <div
                                      className={`flex min-w-[230px] items-center gap-2 rounded-md border px-2 py-1.5 ${
                                        isActiveGroup
                                          ? 'border-blue-300 bg-blue-50'
                                          : 'border-slate-200 bg-white'
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        className="min-w-0 flex-1 text-left"
                                        onClick={() =>
                                          selectStage(actionStage.id)
                                        }
                                      >
                                        <span className="block truncate text-xs font-bold uppercase text-slate-900">
                                          {group.conceptName}
                                        </span>
                                        <span className="block text-[11px] text-slate-500">
                                          {group.versions.length}{' '}
                                          {group.versions.length === 1
                                            ? 'version'
                                            : 'versiones'}
                                        </span>
                                      </button>
                                      <Select
                                        value={String(actionStage.id)}
                                        onValueChange={value =>
                                          selectStage(Number(value))
                                        }
                                      >
                                        <SelectTrigger className="h-8 w-[128px] border-blue-200 bg-white px-2 text-xs font-semibold text-blue-700">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {group.versions.map(stageOption => (
                                            <SelectItem
                                              key={stageOption.id}
                                              value={String(stageOption.id)}
                                            >
                                              {stageVersionOptionLabel(
                                                stageOption
                                              )}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 px-0"
                                          >
                                            <MoreHorizontal size={15} />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                          className="w-56 p-1"
                                          align="end"
                                        >
                                          <button
                                            type="button"
                                            className={actionButtonClass}
                                            disabled={menuDisabled}
                                            onClick={() =>
                                              openStageVersionModalFor(
                                                actionStage
                                              )
                                            }
                                          >
                                            <Copy size={14} />
                                            Nueva version
                                          </button>
                                          <button
                                            type="button"
                                            className={actionButtonClass}
                                            disabled={menuDisabled}
                                            onClick={() =>
                                              handleEditStage(actionStage)
                                            }
                                          >
                                            <Pencil size={14} />
                                            Editar etapa
                                          </button>
                                          <button
                                            type="button"
                                            className={actionButtonClass}
                                            disabled={menuDisabled}
                                            onClick={() =>
                                              handleDuplicateStage(actionStage)
                                            }
                                          >
                                            <Copy size={14} />
                                            Duplicar legacy
                                          </button>
                                          <button
                                            type="button"
                                            className={actionButtonClass}
                                            disabled={
                                              menuDisabled ||
                                              Boolean(
                                                actionStage.versionMetadata
                                                  ?.isCurrent
                                              )
                                            }
                                            onClick={() =>
                                              markStageVersionCurrentMutation.mutate(
                                                actionStage.id
                                              )
                                            }
                                          >
                                            <Check size={14} />
                                            Marcar como actual
                                          </button>
                                          <button
                                            type="button"
                                            className={actionButtonClass}
                                            onClick={() =>
                                              showStageOrigin(actionStage)
                                            }
                                          >
                                            <Eye size={14} />
                                            Ver origen
                                          </button>
                                          <button
                                            type="button"
                                            className={`${actionButtonClass} text-red-600 hover:bg-red-50`}
                                            disabled={menuDisabled}
                                            onClick={() =>
                                              handleDeleteStage(actionStage)
                                            }
                                          >
                                            <Trash2 size={14} />
                                            Eliminar etapa
                                          </button>
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                                  </ContextMenuTrigger>
                                  <ContextMenuContent className="w-56">
                                    <ContextMenuLabel>
                                      {group.conceptName}
                                    </ContextMenuLabel>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem
                                      disabled={menuDisabled}
                                      onSelect={() =>
                                        openStageVersionModalFor(actionStage)
                                      }
                                    >
                                      <Copy size={14} />
                                      Nueva version
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      disabled={menuDisabled}
                                      onSelect={() =>
                                        handleEditStage(actionStage)
                                      }
                                    >
                                      <Pencil size={14} />
                                      Editar etapa
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      disabled={menuDisabled}
                                      onSelect={() =>
                                        handleDuplicateStage(actionStage)
                                      }
                                    >
                                      <Copy size={14} />
                                      Duplicar legacy
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      disabled={
                                        menuDisabled ||
                                        Boolean(
                                          actionStage.versionMetadata?.isCurrent
                                        )
                                      }
                                      onSelect={() =>
                                        markStageVersionCurrentMutation.mutate(
                                          actionStage.id
                                        )
                                      }
                                    >
                                      <Check size={14} />
                                      Marcar como actual
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      onSelect={() =>
                                        showStageOrigin(actionStage)
                                      }
                                    >
                                      <Eye size={14} />
                                      Ver origen
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem
                                      variant="destructive"
                                      disabled={menuDisabled}
                                      onSelect={() =>
                                        handleDeleteStage(actionStage)
                                      }
                                    >
                                      <Trash2 size={14} />
                                      Eliminar etapa
                                    </ContextMenuItem>
                                  </ContextMenuContent>
                                </ContextMenu>
                              );
                            })}
                          </div>
                        </div>

                        {selectedProjectStages.map(stage => (
                          <TabsContent
                            key={stage.id}
                            value={String(stage.id)}
                            className="space-y-3"
                          >
                            <div
                              className={
                                isValuationPhase ||
                                (isWorkPhase && selectedCount(selection) > 0)
                                  ? 'sticky top-0 z-30 mx-4 mt-3 flex flex-col gap-3 rounded-md border border-blue-200 bg-white/95 p-2 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between'
                                  : 'hidden'
                              }
                            >
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Building2 size={16} />
                                {selectedUnit?.name}
                                <ChevronsUpDown size={14} />
                                {stageVersionLabel(stage)}
                                {stageVersionOriginLabel(stage) && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    origen externo
                                  </Badge>
                                )}
                                {isWorkPhase &&
                                  selectedCount(selection) > 0 && (
                                    <Badge variant="info">
                                      {selectedCount(selection)} seleccionados
                                    </Badge>
                                  )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {isValuationPhase && (
                                  <>
                                    <label className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                                      Costo mensual
                                      <Input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={valuationMonthlyPrice}
                                        disabled={!canManageCurrentUnit}
                                        onChange={event => {
                                          setValuationMonthlyPrice(
                                            event.target.value
                                          );
                                          setValuationMonthlyPriceTouched(true);
                                        }}
                                        className="h-8 w-32 bg-white text-sm font-normal normal-case"
                                      />
                                    </label>
                                    <Badge variant="outline">
                                      {roundValuation(valuationTotals.days, 2)}{' '}
                                      dias
                                    </Badge>
                                    <Badge variant="info">
                                      {formatValuationMoney(
                                        valuationTotals.amount
                                      )}
                                    </Badge>
                                    <Badge variant="outline">
                                      Gasto{' '}
                                      {formatValuationMoney(
                                        valuationTotals.spending
                                      )}
                                    </Badge>
                                    <Badge variant="outline">
                                      Saldo{' '}
                                      {formatValuationMoney(
                                        valuationTotals.balance
                                      )}
                                    </Badge>
                                    {canManageCurrentUnit && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={discardValuationChanges}
                                          disabled={
                                            !valuationHasChanges ||
                                            technicalValuationMutation.isPending
                                          }
                                        >
                                          <X size={15} />
                                          Descartar
                                        </Button>
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() =>
                                            technicalValuationMutation.mutate()
                                          }
                                          disabled={
                                            !valuationHasChanges ||
                                            technicalValuationMutation.isPending
                                          }
                                        >
                                          <Check size={15} />
                                          {technicalValuationMutation.isPending
                                            ? 'Guardando...'
                                            : 'Guardar cambios'}
                                        </Button>
                                      </>
                                    )}
                                  </>
                                )}
                                {isWorkPhase && (
                                  <>
                                    {selectedCount(selection) > 0 && (
                                      <>
                                        <Input
                                          type="date"
                                          value={draft.dueDate}
                                          onChange={event =>
                                            setDraft(current => ({
                                              ...current,
                                              dueDate: event.target.value,
                                            }))
                                          }
                                          className="h-8 w-40 bg-white"
                                          aria-label="Fecha compromiso"
                                        />
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            const next = new Date();
                                            next.setDate(next.getDate() + 1);
                                            setDraft(current => ({
                                              ...current,
                                              dueDate: next
                                                .toISOString()
                                                .slice(0, 10),
                                            }));
                                          }}
                                        >
                                          +1 dia
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            const next = new Date();
                                            next.setDate(next.getDate() + 7);
                                            setDraft(current => ({
                                              ...current,
                                              dueDate: next
                                                .toISOString()
                                                .slice(0, 10),
                                            }));
                                          }}
                                        >
                                          +1 semana
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={clearSelection}
                                        >
                                          <X size={15} />
                                          Limpiar
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="h-9 bg-blue-600 px-4 text-sm font-semibold shadow-sm hover:bg-blue-700"
                                      disabled={
                                        !selectedCount(selection) ||
                                        quickAssignMutation.isPending ||
                                        createTechnicalCommitmentMutation.isPending ||
                                        previewAssignmentMutation.isPending
                                      }
                                      onClick={handlePrimaryCommitmentAction}
                                    >
                                      <Plus size={15} />
                                      {quickAssignMutation.isPending
                                        ? 'Asignando...'
                                        : draft.assigneeUserIds.length &&
                                          draft.dueDate
                                        ? `Crear y asignar compromiso (${selectedCount(
                                            selection
                                          )})`
                                        : `Crear compromiso (${selectedCount(
                                            selection
                                          )})`}
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={expandAllLevels}
                                  disabled={!allLevelIds.length}
                                >
                                  <ChevronDown size={15} />
                                  Expandir todo
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={collapseAllLevels}
                                  disabled={!allLevelIds.length}
                                >
                                  <ChevronRight size={15} />
                                  Contraer todo
                                </Button>
                              </div>
                            </div>

                            {(treeQuery.isLoading ||
                              commitmentsQuery.isLoading) && (
                              <div className="space-y-2">
                                {[1, 2, 3, 4].map(item => (
                                  <div
                                    key={item}
                                    className="h-12 animate-pulse rounded-md bg-slate-100"
                                  />
                                ))}
                              </div>
                            )}

                            {!treeQuery.isLoading &&
                              treeQuery.data &&
                              (activePhase === 'basicos' ? (
                                <BasicResourcesWorkspace
                                  unitId={workUnitId}
                                  projectId={selectedProjectId!}
                                  stageId={selectedStageId!}
                                  tree={treeQuery.data}
                                />
                              ) : (
                                <div className="max-h-[calc(100vh-280px)] overflow-auto rounded-md border border-slate-200">
                                  <table className="w-full min-w-[1120px] border-collapse text-left">
                                    <thead className="sticky top-0 z-20 bg-slate-100 text-xs uppercase text-slate-500 shadow-sm">
                                      <tr>
                                        <th className="px-3 py-2">
                                          <div className="flex items-center gap-1.5">
                                            <span>Nivel / subtarea</span>
                                            <Popover>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <PopoverTrigger asChild>
                                                    <Button
                                                      type="button"
                                                      variant={
                                                        normalizedTechnicalTreeSearch
                                                          ? 'secondary'
                                                          : 'ghost'
                                                      }
                                                      size="icon-sm"
                                                      aria-label="Buscar tareas o niveles"
                                                    >
                                                      <Search size={14} />
                                                    </Button>
                                                  </PopoverTrigger>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  Buscar por código o nombre
                                                </TooltipContent>
                                              </Tooltip>
                                              <PopoverContent
                                                align="start"
                                                className="w-80 p-3"
                                              >
                                                <p className="text-sm font-semibold text-slate-900">
                                                  Buscar en la estructura
                                                </p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                  Encuentra niveles y subtareas
                                                  por código o nombre.
                                                </p>
                                                <div className="relative mt-3">
                                                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                                  <Input
                                                    autoFocus
                                                    type="search"
                                                    value={technicalTreeSearch}
                                                    onChange={event =>
                                                      setTechnicalTreeSearch(
                                                        event.target.value
                                                      )
                                                    }
                                                    placeholder="Ej. 01 o módulo de tareas"
                                                    aria-label="Buscar tareas o niveles"
                                                    aria-describedby="technical-tree-search-results"
                                                    className="h-9 bg-background pl-9 pr-9 text-sm"
                                                  />
                                                  {technicalTreeSearch && (
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="icon"
                                                      className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                                                      onClick={() =>
                                                        setTechnicalTreeSearch(
                                                          ''
                                                        )
                                                      }
                                                      aria-label="Limpiar búsqueda de tareas"
                                                    >
                                                      <X className="size-4" />
                                                    </Button>
                                                  )}
                                                </div>
                                                <p
                                                  id="technical-tree-search-results"
                                                  aria-live="polite"
                                                  className="mt-2 text-xs text-muted-foreground"
                                                >
                                                  {normalizedTechnicalTreeSearch
                                                    ? `${
                                                        filteredTechnicalTree.matchCount
                                                      } coincidencia${
                                                        filteredTechnicalTree.matchCount ===
                                                        1
                                                          ? ''
                                                          : 's'
                                                      }`
                                                    : 'Escribe para filtrar la tabla'}
                                                </p>
                                              </PopoverContent>
                                            </Popover>
                                            {normalizedTechnicalTreeSearch && (
                                              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-blue-700">
                                                {
                                                  filteredTechnicalTree.matchCount
                                                }
                                              </span>
                                            )}
                                          </div>
                                        </th>
                                        <th className="px-3 py-2">Estado</th>
                                        {isValuationPhase ? (
                                          <>
                                            <th className="px-3 py-2">Dias</th>
                                            <th className="px-3 py-2">Monto</th>
                                            <th className="px-3 py-2">
                                              Avance / gasto
                                            </th>
                                            <th className="px-3 py-2">Saldo</th>
                                          </>
                                        ) : activePhase === 'revision' ? (
                                          <>
                                            <th className="px-3 py-2">
                                              <ResponsibleTaskFilter
                                                options={responsibleTaskOptions}
                                                selectedUserIds={
                                                  responsibleTaskUserIds
                                                }
                                                onSelectedUserIdsChange={
                                                  handleResponsibleTaskFilterChange
                                                }
                                                currentUserId={sessionUserId}
                                                canQuickFilterCurrentUser={
                                                  canQuickFilterCurrentUser
                                                }
                                              />
                                            </th>
                                            <th className="px-3 py-2">
                                              Revision
                                            </th>
                                            <th className="px-3 py-2">
                                              Comentario
                                            </th>
                                            <th className="px-3 py-2">
                                              Historial
                                            </th>
                                            <th className="px-3 py-2">
                                              Compromisos
                                            </th>
                                          </>
                                        ) : (
                                          <>
                                            <th className="px-3 py-2">
                                              <ResponsibleTaskFilter
                                                options={responsibleTaskOptions}
                                                selectedUserIds={
                                                  responsibleTaskUserIds
                                                }
                                                onSelectedUserIdsChange={
                                                  handleResponsibleTaskFilterChange
                                                }
                                                currentUserId={sessionUserId}
                                                canQuickFilterCurrentUser={
                                                  canQuickFilterCurrentUser
                                                }
                                              />
                                            </th>
                                            <th className="px-3 py-2">
                                              Fecha proxima
                                            </th>
                                            <th className="px-3 py-2">
                                              Compromisos
                                            </th>
                                            <th className="px-3 py-2">
                                              Archivos / acciones
                                            </th>
                                          </>
                                        )}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {!isResponsibleTaskFilterActive &&
                                        isWorkPhase &&
                                        structureDraft?.kind === 'ROOT_LEVEL' &&
                                        structureDraft.stageId === stage.id && (
                                          <StructureDraftRow
                                            draft={structureDraft}
                                            value={structureDraftValue}
                                            isSaving={
                                              structureMutation.isPending
                                            }
                                            onChange={setStructureDraftValue}
                                            onCancel={cancelStructureDraft}
                                            onSave={() =>
                                              structureMutation.mutate()
                                            }
                                          />
                                        )}
                                      {filteredTechnicalTree.level ? (
                                        <LevelRows
                                          level={filteredTechnicalTree.level}
                                          buckets={buckets}
                                          expandedLevelIds={expandedLevelIds}
                                          forceExpandedLevelIds={
                                            forcedExpandedLevelIds
                                          }
                                          onToggleLevel={toggleLevel}
                                          selection={selection}
                                          onToggleLevelSelection={
                                            toggleLevelSelection
                                          }
                                          onToggleTaskSelection={
                                            toggleTaskSelection
                                          }
                                          memberships={memberships}
                                          draft={draft}
                                          structureDraft={structureDraft}
                                          structureDraftValue={
                                            structureDraftValue
                                          }
                                          structureDraftSaving={
                                            structureMutation.isPending
                                          }
                                          onStartStructureDraft={
                                            startStructureDraft
                                          }
                                          onDeleteLevel={handleDeleteLevel}
                                          onDeleteTask={handleDeleteTask}
                                          onStructureDraftChange={
                                            setStructureDraftValue
                                          }
                                          onCancelStructureDraft={
                                            cancelStructureDraft
                                          }
                                          onSaveStructureDraft={() =>
                                            structureMutation.mutate()
                                          }
                                          onInlineAssigneesChange={
                                            handleInlineAssigneesChange
                                          }
                                          onOpenCommitment={
                                            openCommitmentDetail
                                          }
                                          workspacePhase={activePhase}
                                          onOpenExecution={openExecutionTask}
                                          onOpenDirectReassign={
                                            openDirectReassignTask
                                          }
                                          onSelfAssignTask={task =>
                                            selfAssignTaskMutation.mutate(task)
                                          }
                                          selfAssigningTaskId={
                                            selfAssignTaskMutation.isPending
                                              ? selfAssignTaskMutation.variables
                                                  ?.id
                                              : null
                                          }
                                          onTaskFilesUpdated={
                                            handleLegacyTaskUpdated
                                          }
                                          autoOpenTaskFilesId={
                                            autoOpenTaskFilesId
                                          }
                                          workUnitId={workUnitId}
                                          selectedProjectId={selectedProjectId}
                                          selectedStageId={selectedStageId}
                                          onInlineExecutionDrop={
                                            handleInlineExecutionDrop
                                          }
                                          quickUploadPercentages={
                                            quickUploadPercentages
                                          }
                                          onQuickUploadPercentageChange={
                                            handleQuickUploadPercentageChange
                                          }
                                          onQuickUploadFiles={
                                            handleQuickUploadFiles
                                          }
                                          onCompressLevel={handleCompressLevel}
                                          compressingLevelKey={
                                            compressingLevelKey
                                          }
                                          reviewComments={reviewComments}
                                          reviewApplyChildren={
                                            reviewApplyChildren
                                          }
                                          reviewPendingNodeKey={
                                            reviewPendingNodeKey
                                          }
                                          onReviewCommentChange={
                                            handleReviewCommentChange
                                          }
                                          onReviewApplyChildrenChange={
                                            handleReviewApplyChildrenChange
                                          }
                                          onReviewLevel={handleReviewLevel}
                                          onReviewTask={handleReviewTask}
                                          activeExecutionTaskId={
                                            executionSession?.taskId
                                          }
                                          uploadingTaskIds={uploadingTaskIds}
                                          focusedTaskId={focusedTaskId}
                                          currentUserId={sessionUserId}
                                          canManageCurrentUnit={
                                            canManageCurrentUnit
                                          }
                                          valuationDrafts={valuationDrafts}
                                          valuationMonthlyPrice={
                                            valuationMonthlyPriceNumber
                                          }
                                          onValuationDaysChange={
                                            handleValuationDaysChange
                                          }
                                          onValuationAmountChange={
                                            handleValuationAmountChange
                                          }
                                        />
                                      ) : (
                                        <tr>
                                          <td
                                            colSpan={
                                              isValuationPhase
                                                ? 6
                                                : activePhase === 'revision'
                                                ? 7
                                                : 6
                                            }
                                            className="px-3 py-10 text-center text-sm text-muted-foreground"
                                          >
                                            {isResponsibleTaskFilterActive
                                              ? 'No hay subtareas asignadas a los responsables seleccionados.'
                                              : normalizedTechnicalTreeSearch
                                              ? 'No se encontraron tareas o niveles con esa búsqueda.'
                                              : 'No se encontraron tareas o niveles.'}
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              ))}

                            {!treeQuery.isLoading && !treeQuery.data && (
                              <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                                No se pudo cargar el arbol tecnico de esta
                                etapa.
                              </div>
                            )}
                          </TabsContent>
                        ))}
                      </Tabs>
                    )}
                  </>
                )}
              </section>
            </div>
          )}
        </section>
        <Dialog
          open={Boolean(pendingLevelReview)}
          onOpenChange={open => {
            if (!open) setPendingLevelReview(null);
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Aplicar revision a subtareas</DialogTitle>
              <DialogDescription>
                Se aprobara el compromiso del nivel y tambien las subtareas
                hijas que tengan entregables en revision.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950">
              <p className="font-semibold">{pendingLevelReview?.levelName}</p>
              <p className="mt-1">
                Subtareas en revision afectadas:{' '}
                <strong>{pendingLevelReview?.affectedTasks ?? 0}</strong>
              </p>
              <p className="mt-2 text-xs">
                Las subtareas sin entregable pendiente, revisadas u observadas
                no se modificaran.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingLevelReview(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={technicalReviewMutation.isPending}
                onClick={() => {
                  if (!pendingLevelReview) return;
                  submitTechnicalReview(pendingLevelReview);
                  setPendingLevelReview(null);
                }}
              >
                Confirmar revision
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <LegacyTaskExecutionDialog
          open={executionSheetOpen}
          taskId={executionSession?.taskId ?? null}
          onOpenChange={open => {
            setExecutionSheetOpen(open);
            if (!open) {
              setExecutionSession(null);
              queryClient.invalidateQueries({
                queryKey: ['technical-office-stage-tree'],
              });
            }
          }}
          onTaskUpdated={handleLegacyTaskUpdated}
        />
        <Dialog
          open={Boolean(directReassignTask)}
          onOpenChange={open => {
            if (!open) {
              setDirectReassignTask(null);
              setDirectReassignOwnerId('');
              setDirectReassignReason('');
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Reasignar responsable tecnico</DialogTitle>
              <DialogDescription>
                Corrige el responsable de la subtarea sin crear un compromiso.
                El historial de archivos y revisiones se conserva.
              </DialogDescription>
            </DialogHeader>
            {directReassignTask && (
              <div className="space-y-4">
                <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
                  <p className="font-mono text-xs font-semibold text-blue-700">
                    {directReassignTask.item || directReassignTask.id}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {directReassignTask.name}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant={statusVariant(directReassignTask.status)}>
                      {taskStatusLabel[directReassignTask.status] ??
                        directReassignTask.status}
                    </Badge>
                    <Badge variant="outline">
                      Actual:{' '}
                      {taskAssigneeNames(directReassignTask).join(', ') ||
                        'Sin responsable'}
                    </Badge>
                  </div>
                </div>

                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Nuevo responsable
                  <Select
                    value={directReassignOwnerId}
                    onValueChange={setDirectReassignOwnerId}
                    disabled={directReassignMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un miembro" />
                    </SelectTrigger>
                    <SelectContent>
                      {memberships.map(membership => (
                        <SelectItem
                          key={membership.user.id}
                          value={String(membership.user.id)}
                        >
                          {memberLabel(membership)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                {directReassignTask.status === 'INREVIEW' && (
                  <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-semibold text-amber-900">
                      Esta subtarea tiene un envio pendiente.
                    </p>
                    <p className="text-xs text-amber-800">
                      Al reasignar, el envio pendiente quedara observado en el
                      historial y la subtarea volvera a En proceso para que el
                      nuevo responsable pueda subir el entregable correcto.
                    </p>
                    <label className="space-y-1 text-sm font-medium text-amber-900">
                      Motivo
                      <Textarea
                        value={directReassignReason}
                        onChange={event =>
                          setDirectReassignReason(event.target.value)
                        }
                        disabled={directReassignMutation.isPending}
                        placeholder="Ejemplo: se subio desde el usuario equivocado."
                        className="min-h-20 bg-white"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={directReassignMutation.isPending}
                onClick={() => setDirectReassignTask(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={
                  !directReassignTask ||
                  directReassignMutation.isPending ||
                  !directReassignOwnerId ||
                  (directReassignTask.status === 'INREVIEW' &&
                    !directReassignReason.trim())
                }
                onClick={() => directReassignMutation.mutate()}
              >
                {directReassignMutation.isPending
                  ? 'Reasignando...'
                  : directReassignTask?.status === 'INREVIEW'
                  ? 'Retirar envio y reasignar'
                  : 'Reasignar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Sheet
          open={Boolean(commitmentDetail)}
          onOpenChange={open => !open && setCommitmentDetail(null)}
        >
          <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Detalle del compromiso</SheetTitle>
              <SheetDescription>
                Edita el acuerdo completo. Si el compromiso incluye otros nodos,
                el cambio aplica a todo su alcance.
              </SheetDescription>
            </SheetHeader>
            {commitmentDetail && (
              <div className="space-y-4 py-4">
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Este compromiso puede estar vinculado a mas niveles o
                  subtareas. Para cambiar solo una fila, crea un compromiso
                  puntual.
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commitment-detail-title">Titulo</Label>
                  <Input
                    id="commitment-detail-title"
                    value={commitmentDetailDraft.title}
                    onChange={event =>
                      setCommitmentDetailDraft(current => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commitment-detail-date">Fecha limite</Label>
                  <Input
                    id="commitment-detail-date"
                    type="date"
                    value={commitmentDetailDraft.dueDate}
                    onChange={event =>
                      setCommitmentDetailDraft(current => ({
                        ...current,
                        dueDate: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={commitmentDetailDraft.status}
                      onValueChange={value =>
                        setCommitmentDetailDraft(current => ({
                          ...current,
                          status: value as Commitment['status'],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          'PENDING',
                          'IN_PROGRESS',
                          'BLOCKED',
                          'DONE',
                          'CANCELLED',
                        ].map(status => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridad</Label>
                    <Select
                      value={commitmentDetailDraft.priority}
                      onValueChange={value =>
                        setCommitmentDetailDraft(current => ({
                          ...current,
                          priority: value as Commitment['priority'],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(priority => (
                          <SelectItem key={priority} value={priority}>
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commitment-detail-description">
                    Descripcion
                  </Label>
                  <Textarea
                    id="commitment-detail-description"
                    value={commitmentDetailDraft.description}
                    onChange={event =>
                      setCommitmentDetailDraft(current => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="min-h-28"
                  />
                </div>
              </div>
            )}
            <SheetFooter>
              <Button
                variant="outline"
                onClick={() => setCommitmentDetail(null)}
                disabled={updateCommitmentDetailMutation.isPending}
              >
                Cerrar
              </Button>
              <Button
                onClick={() => updateCommitmentDetailMutation.mutate()}
                disabled={
                  updateCommitmentDetailMutation.isPending ||
                  !commitmentDetailDraft.title.trim()
                }
              >
                {updateCommitmentDetailMutation.isPending
                  ? 'Guardando...'
                  : 'Guardar cambios'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Crear compromiso tecnico</SheetTitle>
              <SheetDescription>
                Se creara un compromiso agrupador con contextos para los niveles
                y subtareas seleccionados. Si activas el reflejo tecnico, solo
                se asignaran subtareas en Por hacer.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 py-4">
              <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">Seleccion actual</p>
                    <p>
                      {selection.levelIds.size} niveles y{' '}
                      {selection.taskIds.size} subtareas en{' '}
                      {selectedStage?.name || 'la etapa seleccionada'}.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadSelectedLevelEditables}
                    disabled={!selection.levelIds.size}
                  >
                    <Download size={14} />
                    Comprimir editables
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="technical-commitment-title">Titulo base</Label>
                <Input
                  id="technical-commitment-title"
                  value={draft.title}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Ej. Levantar observaciones de memoria descriptiva"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="technical-commitment-due">Fecha limite</Label>
                  <Input
                    id="technical-commitment-due"
                    type="date"
                    value={draft.dueDate}
                    onChange={event =>
                      setDraft(current => ({
                        ...current,
                        dueDate: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select
                    value={draft.priority}
                    onValueChange={value =>
                      setDraft(current => ({
                        ...current,
                        priority: value as Commitment['priority'],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Baja</SelectItem>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="HIGH">Alta</SelectItem>
                      <SelectItem value="URGENT">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Responsables del compromiso</Label>
                <div className="max-h-56 space-y-2 overflow-auto rounded-md border border-slate-200 p-2">
                  {projectModeratorsQuery.isLoading && (
                    <p className="p-2 text-sm text-slate-500">
                      Cargando miembros de la oficina...
                    </p>
                  )}
                  {!projectModeratorsQuery.isLoading && !memberships.length && (
                    <p className="p-2 text-sm text-slate-500">
                      No hay miembros activos registrados en esta oficina. Si no
                      eliges responsables, el compromiso quedara asignado a la
                      unidad.
                    </p>
                  )}
                  {memberships.map(membership => {
                    const userId = membership.user.id;
                    const checked = draft.assigneeUserIds.includes(userId);
                    return (
                      <label
                        key={userId}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-slate-50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() =>
                            setDraft(current => ({
                              ...current,
                              assigneeUserIds: checked
                                ? current.assigneeUserIds.filter(
                                    currentUserId => currentUserId !== userId
                                  )
                                : [...current.assigneeUserIds, userId],
                              technicalOwnerId:
                                checked && current.technicalOwnerId === userId
                                  ? null
                                  : current.technicalOwnerId,
                            }))
                          }
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-900">
                            {memberLabel(membership)}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {membership.user.profile?.job ||
                              membership.user.email ||
                              'Miembro de oficina'}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="technical-commitment-description">
                  Comentario / descripcion
                </Label>
                <Textarea
                  id="technical-commitment-description"
                  value={draft.description}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="min-h-28"
                  placeholder="Detalle operativo para el seguimiento del compromiso..."
                />
              </div>

              <div className="space-y-3 rounded-md border border-slate-200 p-3">
                <label className="flex items-start gap-3 text-sm text-slate-700">
                  <Checkbox
                    checked={draft.reflectAssignment}
                    onCheckedChange={checked =>
                      setDraft(current => ({
                        ...current,
                        reflectAssignment: Boolean(checked),
                        technicalOwnerId: checked
                          ? current.technicalOwnerId
                          : null,
                      }))
                    }
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-semibold text-slate-900">
                      Reflejar asignacion en subtareas
                    </span>
                    <span className="text-slate-500">
                      Solo cambiara a En proceso las subtareas Por hacer y sin
                      responsable. Las demas se mostraran como conflicto.
                    </span>
                  </span>
                </label>

                {draft.reflectAssignment && (
                  <div className="space-y-2">
                    <Label>Responsable tecnico principal</Label>
                    <Select
                      value={
                        draft.technicalOwnerId
                          ? String(draft.technicalOwnerId)
                          : undefined
                      }
                      onValueChange={value => {
                        const userId = Number(value);
                        setDraft(current => ({
                          ...current,
                          technicalOwnerId: userId,
                          assigneeUserIds: current.assigneeUserIds.includes(
                            userId
                          )
                            ? current.assigneeUserIds
                            : [...current.assigneeUserIds, userId],
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona responsable tecnico" />
                      </SelectTrigger>
                      <SelectContent>
                        {memberships.map(membership => (
                          <SelectItem
                            key={membership.user.id}
                            value={String(membership.user.id)}
                          >
                            {memberLabel(membership)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {assignmentPreview && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-slate-900">
                    Ultima previsualizacion
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    <Badge variant="success">
                      {assignmentPreview.summary.assignable} por asignar
                    </Badge>
                    <Badge variant="warning">
                      {assignmentPreview.summary.assignedToOther} conflictos
                    </Badge>
                    <Badge variant="danger">
                      {assignmentPreview.summary.locked} bloqueadas
                    </Badge>
                    <Badge variant="info">
                      {assignmentPreview.summary.sameAssignee} ya asignadas
                    </Badge>
                    <Badge variant="outline">
                      {assignmentPreview.summary.withOpenCommitments} con
                      compromiso
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            <SheetFooter>
              <Button
                variant="outline"
                onClick={() => setSheetOpen(false)}
                disabled={
                  createTechnicalCommitmentMutation.isPending ||
                  previewAssignmentMutation.isPending
                }
              >
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  draft.reflectAssignment
                    ? previewAssignmentMutation.mutate()
                    : createTechnicalCommitmentMutation.mutate({
                        reflectAssignment: false,
                        assignmentMode: 'CREATE_ONLY',
                      })
                }
                disabled={
                  createTechnicalCommitmentMutation.isPending ||
                  previewAssignmentMutation.isPending
                }
              >
                <Plus size={16} />
                {previewAssignmentMutation.isPending
                  ? 'Previsualizando...'
                  : createTechnicalCommitmentMutation.isPending
                  ? 'Creando...'
                  : draft.reflectAssignment
                  ? 'Previsualizar asignacion'
                  : 'Crear compromiso'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Dialog open={projectModalOpen} onOpenChange={setProjectModalOpen}>
          <DialogContent className="grid max-h-[90vh] w-[min(96vw,1040px)] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                {projectModalFocus
                  ? 'Gestionar proyecto'
                  : 'Gestionar proyectos'}
              </DialogTitle>
              <DialogDescription>
                Vincula el proyecto a la oficina y marca las etapas activas que
                trabajara. Una etapa activa no puede estar en dos oficinas a la
                vez.
              </DialogDescription>
            </DialogHeader>

            <div className="grid min-h-0 gap-4 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]">
              <section className="min-h-0 overflow-auto rounded-md border border-slate-200">
                <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-3">
                  <Label>Buscar proyecto / CUI</Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                    <Input
                      value={projectModalSearch}
                      onChange={event =>
                        setProjectModalSearch(event.target.value)
                      }
                      className="pl-9"
                      placeholder="Nombre, CUI, contrato o etapa"
                      disabled={Boolean(projectModalFocus)}
                    />
                  </div>
                </div>
                <div className="space-y-2 p-2">
                  {projectCandidatesQuery.isLoading && !projectModalFocus && (
                    <div className="p-4 text-sm text-slate-500">
                      Buscando...
                    </div>
                  )}
                  {projectModalFocus && (
                    <button
                      type="button"
                      className="w-full rounded-md border border-blue-500 bg-blue-50 p-3 text-left"
                    >
                      <p className="text-sm font-semibold">
                        {projectLabel(projectModalFocus)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        CUI {projectModalFocus.project.contract?.cui || 'S/C'}
                      </p>
                    </button>
                  )}
                  {!projectModalFocus &&
                    (projectCandidatesQuery.data ?? []).map(project => {
                      const active = project.id === selectedCandidateId;
                      return (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => {
                            setSelectedCandidateId(project.id);
                            setSelectedProjectStageIds(
                              new Set(
                                project.stages
                                  .filter(
                                    stage =>
                                      stage.availability ===
                                      'occupiedByCurrentUnit'
                                  )
                                  .map(stage => stage.id)
                              )
                            );
                          }}
                          className={`w-full rounded-md border p-3 text-left transition ${
                            active
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <p className="text-sm font-semibold">
                            {projectCandidateLabel(project)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            CUI {project.contract?.cui || 'S/C'} /{' '}
                            {project.stages.length} etapas
                          </p>
                        </button>
                      );
                    })}
                  {!projectModalFocus &&
                    !projectCandidatesQuery.isLoading &&
                    !(projectCandidatesQuery.data ?? []).length && (
                      <p className="p-4 text-sm text-slate-500">
                        No hay proyectos candidatos.
                      </p>
                    )}
                </div>
              </section>

              <section className="min-h-0 overflow-auto rounded-md border border-slate-200">
                <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Etapas activas de la oficina
                  </p>
                  <h3 className="text-base font-semibold text-slate-950">
                    {selectedProjectCandidate
                      ? projectCandidateLabel(selectedProjectCandidate)
                      : 'Selecciona un proyecto'}
                  </h3>
                </div>
                <div className="space-y-2 p-3">
                  {selectedProjectCandidate?.stages.map(stage => {
                    const occupiedByOther =
                      stage.availability === 'occupiedByOtherUnit';
                    const checked = selectedProjectStageIds.has(stage.id);
                    return (
                      <label
                        key={stage.id}
                        className={`flex items-start gap-3 rounded-md border p-3 transition ${
                          occupiedByOther
                            ? 'border-amber-200 bg-amber-50 opacity-75'
                            : checked
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={occupiedByOther}
                          onCheckedChange={() =>
                            toggleProjectStageSelection(stage.id)
                          }
                          className="mt-0.5"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-950">
                            {stageVersionLabel(stage)}
                          </span>
                          {occupiedByOther && stage.occupiedByUnit && (
                            <span className="text-xs text-amber-700">
                              Ocupada por {stage.occupiedByUnit.name}
                            </span>
                          )}
                        </span>
                        <Badge
                          variant={
                            occupiedByOther
                              ? 'warning'
                              : checked
                              ? 'info'
                              : 'outline'
                          }
                        >
                          {occupiedByOther
                            ? 'Ocupada'
                            : checked
                            ? 'Asignada'
                            : 'Disponible'}
                        </Badge>
                      </label>
                    );
                  })}
                  {selectedProjectCandidate &&
                    !selectedProjectCandidate.stages.length && (
                      <p className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                        Este proyecto no tiene etapas disponibles.
                      </p>
                    )}
                </div>
              </section>
            </div>

            <DialogFooter className="border-t border-slate-200 pt-3">
              <Button
                variant="outline"
                onClick={() => setProjectModalOpen(false)}
                disabled={projectFocusMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => projectFocusMutation.mutate()}
                disabled={
                  !selectedCandidateId ||
                  !selectedProjectStageIds.size ||
                  projectFocusMutation.isPending
                }
              >
                <Plus size={15} />
                {projectFocusMutation.isPending
                  ? 'Guardando...'
                  : 'Vincular proyecto y etapas'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={stageVersionModalOpen}
          onOpenChange={setStageVersionModalOpen}
        >
          <DialogContent className="grid max-h-[90vh] w-[min(96vw,900px)] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Crear nueva version de etapa</DialogTitle>
              <DialogDescription>
                Crea una etapa real nueva en este proyecto. Se copia estructura
                y archivos modelo/editables; no se copian responsables, avances,
                feedback, compromisos ni valorizaciones.
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
              <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
                <p className="text-xs font-semibold uppercase text-blue-700">
                  Etapa base
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {stageVersionLabel(selectedStage)}
                </p>
                {stageVersionOriginLabel(selectedStage) && (
                  <p className="mt-1 text-xs text-blue-700">
                    {stageVersionOriginLabel(selectedStage)}
                  </p>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Origen
                  <Select
                    value={stageVersionSourceKind}
                    onValueChange={value => {
                      const next = value as StageVersionSourceKind;
                      setStageVersionSourceKind(next);
                      setStageVersionSourceStageId(
                        next === 'SAME_STAGE' ? selectedStage?.id ?? null : null
                      );
                      if (next === 'EMPTY') setStageVersionSourceStageId(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAME_STAGE">
                        Desde esta version
                      </SelectItem>
                      <SelectItem value="SAME_PROJECT_STAGE">
                        Desde otra etapa del proyecto
                      </SelectItem>
                      <SelectItem value="OTHER_PROJECT_STAGE">
                        Desde otro proyecto
                      </SelectItem>
                      <SelectItem value="EMPTY">Vacia</SelectItem>
                    </SelectContent>
                  </Select>
                </label>

                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Nombre sugerido
                  <Input
                    value={stageVersionName}
                    onChange={event => setStageVersionName(event.target.value)}
                    placeholder="EXP DEFINITIVO v2"
                  />
                </label>
              </div>

              {stageVersionSourceKind !== 'SAME_STAGE' &&
                stageVersionSourceKind !== 'EMPTY' && (
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
                    <label className="space-y-1 text-sm font-medium text-slate-700">
                      Buscar proyecto, CUI o etapa
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                        <Input
                          value={stageVersionSearch}
                          onChange={event =>
                            setStageVersionSearch(event.target.value)
                          }
                          className="pl-9"
                          placeholder="Especialidades, CUI, nombre..."
                          disabled={
                            stageVersionSourceKind === 'SAME_PROJECT_STAGE'
                          }
                        />
                      </div>
                    </label>
                    <label className="space-y-1 text-sm font-medium text-slate-700">
                      Tipo rapido
                      <Select
                        value={stageVersionType}
                        onValueChange={value =>
                          setStageVersionType(value as StageVersionType | 'ALL')
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Todos</SelectItem>
                          <SelectItem value="BASICOS">Basicos</SelectItem>
                          <SelectItem value="ESPECIALIDADES">
                            Especialidades
                          </SelectItem>
                          <SelectItem value="COSTOS">Costos</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                  </div>
                )}

              {stageVersionSourceKind === 'EMPTY' && (
                <div className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  Se creara una version vacia para construir el indice desde
                  cero.
                </div>
              )}

              {stageVersionSourceKind === 'SAME_STAGE' && selectedStage && (
                <div className="rounded-md border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Origen seleccionado
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {stageVersionLabel(selectedStage)}
                  </p>
                </div>
              )}

              {stageVersionSourceKind !== 'SAME_STAGE' &&
                stageVersionSourceKind !== 'EMPTY' && (
                  <div className="min-h-[220px] rounded-md border border-slate-200">
                    <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase text-slate-500">
                      Etapas disponibles
                    </div>
                    <div className="max-h-72 space-y-2 overflow-auto p-2">
                      {stageVersionSourcesQuery.isLoading &&
                        stageVersionSourceKind === 'OTHER_PROJECT_STAGE' && (
                          <p className="p-3 text-sm text-slate-500">
                            Buscando fuentes...
                          </p>
                        )}
                      {stageVersionSourceProjects.map(project => (
                        <div
                          key={project.id}
                          className="rounded-md border border-slate-200"
                        >
                          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
                            <p className="text-sm font-semibold">
                              {projectCandidateLabel(project)}
                            </p>
                            <p className="text-xs text-slate-500">
                              CUI {project.contract?.cui || 'S/C'}
                            </p>
                          </div>
                          <div className="space-y-1 p-2">
                            {project.stages.map(stage => {
                              const checked =
                                stageVersionSourceStageId === stage.id;
                              return (
                                <button
                                  key={stage.id}
                                  type="button"
                                  onClick={() =>
                                    setStageVersionSourceStageId(stage.id)
                                  }
                                  className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition ${
                                    checked
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <span>
                                    <span className="block text-sm font-semibold">
                                      {stageVersionLabel(stage)}
                                    </span>
                                    {stageVersionOriginLabel(stage) && (
                                      <span className="text-xs text-blue-600">
                                        {stageVersionOriginLabel(stage)}
                                      </span>
                                    )}
                                  </span>
                                  {checked && <Check size={16} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {!stageVersionSourcesQuery.isLoading &&
                        !stageVersionSourceProjects.length && (
                          <p className="p-4 text-sm text-slate-500">
                            No hay etapas candidatas para este filtro.
                          </p>
                        )}
                    </div>
                  </div>
                )}

              <label className="flex items-start gap-3 rounded-md border border-slate-200 p-3 text-sm">
                <Checkbox
                  checked={stageVersionLinkToOffice}
                  onCheckedChange={checked =>
                    setStageVersionLinkToOffice(Boolean(checked))
                  }
                  className="mt-0.5"
                />
                <span>
                  <span className="block font-semibold text-slate-900">
                    Vincular nueva version a esta oficina
                  </span>
                  <span className="text-slate-500">
                    La version anterior seguira activa. Esta nueva etapa quedara
                    seleccionada para continuar trabajando.
                  </span>
                </span>
              </label>
            </div>

            <DialogFooter className="border-t border-slate-200 pt-3">
              <Button
                variant="outline"
                onClick={() => setStageVersionModalOpen(false)}
                disabled={stageVersionMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => stageVersionMutation.mutate()}
                disabled={
                  stageVersionMutation.isPending ||
                  (stageVersionSourceKind !== 'EMPTY' &&
                    stageVersionSourceKind !== 'SAME_STAGE' &&
                    !stageVersionSourceStageId)
                }
              >
                <Copy size={15} />
                {stageVersionMutation.isPending
                  ? 'Creando...'
                  : 'Crear nueva version'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={memberModalOpen}
          onOpenChange={open => {
            if (open) {
              setMemberModalOpen(true);
            } else {
              resetMemberModal();
            }
          }}
        >
          <DialogContent className="grid max-h-[90vh] w-[min(96vw,980px)] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Agregar miembro a la oficina</DialogTitle>
              <DialogDescription>
                Selecciona varios usuarios activos y define rol organizacional,
                responsable y permisos locales antes de guardar.
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <label className="text-sm font-medium text-slate-700">
                  Buscar usuario
                  <div className="relative mt-1">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      value={memberSearch}
                      onChange={event => setMemberSearch(event.target.value)}
                      onKeyDown={event => {
                        if (event.key !== 'Enter') return;
                        const firstAvailable = (
                          memberCandidatesQuery.data ?? []
                        ).find(
                          candidate =>
                            !selectedMemberDrafts.some(
                              member => member.user.id === candidate.id
                            )
                        );
                        if (!firstAvailable) return;
                        event.preventDefault();
                        addMemberDraft(firstAvailable);
                      }}
                      className="pl-9"
                      placeholder="Nombre, DNI, cargo o correo"
                    />
                  </div>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Rol organizacional
                  <Select
                    value={memberRole}
                    onValueChange={value =>
                      setMemberRole(value as OfficeMemberRole)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OFFICE_MEMBER_ROLES.map(role => (
                        <SelectItem key={role} value={role}>
                          {officeRoleLabel(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>

              <div className="grid min-h-[360px] min-w-0 gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
                <div className="min-h-0 min-w-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Usuarios disponibles
                    </p>
                    <Badge variant="secondary">
                      {(memberCandidatesQuery.data ?? []).length} resultados
                    </Badge>
                  </div>
                  <div className="grid max-h-[330px] gap-2 overflow-y-auto overflow-x-hidden p-2">
                    {memberCandidatesQuery.isLoading && (
                      <p className="p-3 text-sm text-slate-500">Buscando...</p>
                    )}
                    {!memberCandidatesQuery.isLoading &&
                      (memberCandidatesQuery.data ?? []).map(candidate => {
                        const selected = selectedMemberDrafts.some(
                          member => member.user.id === candidate.id
                        );
                        return (
                          <div
                            key={candidate.id}
                            className={`grid min-w-0 grid-cols-[auto_minmax(0,1fr)_40px] items-center gap-3 rounded-md border p-3 transition ${
                              selected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-slate-200 bg-white hover:border-blue-200'
                            }`}
                          >
                            <Checkbox
                              checked={selected}
                              onCheckedChange={checked => {
                                if (checked) {
                                  addMemberDraft(candidate);
                                } else {
                                  removeMemberDraft(candidate.id);
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left"
                              onClick={() =>
                                selected
                                  ? removeMemberDraft(candidate.id)
                                  : addMemberDraft(candidate)
                              }
                            >
                              <p className="truncate font-semibold">
                                {candidateLabel(candidate)}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {candidate.profile?.job ||
                                  candidate.email ||
                                  `Usuario ${candidate.id}`}
                              </p>
                            </button>
                            <Button
                              type="button"
                              size="sm"
                              variant={selected ? 'outline' : 'default'}
                              className="h-8 w-8 shrink-0 px-0"
                              onClick={() =>
                                selected
                                  ? removeMemberDraft(candidate.id)
                                  : addMemberDraft(candidate)
                              }
                            >
                              {selected ? (
                                <Check size={14} />
                              ) : (
                                <Plus size={14} />
                              )}
                              <span className="sr-only">
                                {selected
                                  ? 'Quitar seleccion'
                                  : 'Agregar usuario'}
                              </span>
                            </Button>
                          </div>
                        );
                      })}
                    {!memberCandidatesQuery.isLoading &&
                      !(memberCandidatesQuery.data ?? []).length && (
                        <p className="p-3 text-sm text-slate-500">
                          No hay usuarios disponibles para agregar.
                        </p>
                      )}
                  </div>
                </div>

                <div className="min-h-0 min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Seleccionados ({selectedMemberDrafts.length})
                      </p>
                      <p className="text-xs text-slate-500">
                        Puedes ajustar rol organizacional, MOD oficina y
                        responsable por usuario.
                      </p>
                    </div>
                    {!!selectedMemberDrafts.length && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedMemberDrafts([])}
                      >
                        Limpiar
                      </Button>
                    )}
                  </div>
                  <div className="grid max-h-[330px] gap-2 overflow-y-auto overflow-x-hidden p-2">
                    {!selectedMemberDrafts.length && (
                      <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                        Selecciona usuarios de la lista izquierda o presiona
                        Enter para agregar el primer resultado disponible.
                      </div>
                    )}
                    {selectedMemberDrafts.map(member => (
                      <div
                        key={member.user.id}
                        className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[minmax(0,1fr)_160px]"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {candidateLabel(member.user)}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {member.user.profile?.job ||
                              member.user.email ||
                              `Usuario ${member.user.id}`}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-3 text-sm">
                            <label className="flex items-center gap-2">
                              <Checkbox
                                checked={member.canManageUnitProjects}
                                disabled={!isModuleMod}
                                onCheckedChange={checked =>
                                  updateMemberDraft(member.user.id, {
                                    canManageUnitProjects: Boolean(checked),
                                  })
                                }
                              />
                              <span>MOD oficina</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <Checkbox
                                checked={member.isUnitLead}
                                onCheckedChange={checked =>
                                  setMemberDraftLead(
                                    member.user.id,
                                    Boolean(checked)
                                  )
                                }
                              />
                              <span>Responsable</span>
                            </label>
                          </div>
                          {!isModuleMod && (
                            <p className="mt-2 text-xs text-slate-500">
                              Solo un MOD del modulo puede otorgar MOD oficina.
                            </p>
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Select
                            value={member.role}
                            onValueChange={value =>
                              updateMemberDraft(member.user.id, {
                                role: value as OfficeMemberRole,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {OFFICE_MEMBER_ROLES.map(role => (
                                <SelectItem key={role} value={role}>
                                  {officeRoleLabel(role)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeMemberDraft(member.user.id)}
                          >
                            <X size={14} />
                            Quitar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {!!bulkMemberSkipped.length && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-900">
                    Algunos usuarios no se agregaron
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-800">
                    {bulkMemberSkipped.map(item => (
                      <li key={`${item.userId}-${item.reason}`}>
                        Usuario {item.userId}: {item.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!isModuleMod && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                  Puedes agregar miembros si gestionas esta oficina, pero los
                  permisos de MOD oficina sólo puede otorgarlos un MOD global
                  del módulo.
                </div>
              )}
              <div className="text-xs text-slate-500">
                El rol superior se aplica a nuevos seleccionados; no cambia las
                filas ya elegidas.
              </div>
            </div>

            <DialogFooter className="border-t border-slate-200 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={resetMemberModal}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={
                  !selectedMemberDrafts.length || addMemberMutation.isPending
                }
                onClick={() => addMemberMutation.mutate()}
              >
                <UserPlus size={15} />
                {addMemberMutation.isPending
                  ? 'Agregando...'
                  : `Agregar seleccionados (${selectedMemberDrafts.length})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(memberToRemove)}
          onOpenChange={open => {
            if (!open) setMemberToRemove(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Quitar miembro</DialogTitle>
              <DialogDescription>
                El miembro dejara de pertenecer a esta oficina y perdera sus
                permisos locales.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-950">
              {(() => {
                const membership = summaryMembers.find(
                  member => member.id === memberToRemove
                );
                return (
                  <>
                    <p className="font-semibold">
                      {membership ? memberLabel(membership) : 'Miembro'}
                    </p>
                    <p className="mt-1 text-xs">
                      Esta accion no elimina el usuario, solo termina su
                      membresia activa en la unidad.
                    </p>
                  </>
                );
              })()}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMemberToRemove(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!memberToRemove || removeMemberMutation.isPending}
                onClick={() => {
                  if (memberToRemove)
                    removeMemberMutation.mutate(memberToRemove);
                }}
              >
                Quitar miembro
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Sheet
          open={meetingViewConfigOpen}
          onOpenChange={setMeetingViewConfigOpen}
        >
          <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Vistas de reunión</SheetTitle>
              <SheetDescription>
                Define cómo se abrirán las reuniones nuevas de{' '}
                {selectedUnit?.name || 'esta unidad'}.
              </SheetDescription>
            </SheetHeader>
            {meetingViewConfigQuery.isLoading ? (
              <div className="py-10 text-center text-sm text-slate-500">
                Cargando configuración...
              </div>
            ) : meetingViewConfigQuery.data ? (
              <div className="space-y-6 py-5">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  {meetingViewConfigQuery.data.localConfig ? (
                    <>
                      <p className="font-semibold">
                        Configuración de esta unidad
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Las reuniones nuevas conservarán esta configuración.
                      </p>
                    </>
                  ) : meetingViewConfigQuery.data.sourceUnit ? (
                    <>
                      <p className="font-semibold">
                        Heredada de{' '}
                        {meetingViewConfigQuery.data.sourceUnit.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Guardar creará una configuración propia para esta
                        unidad.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">Configuración general</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Esta unidad aún no tiene una configuración heredada.
                      </p>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Alcance predeterminado</Label>
                  <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-200 bg-slate-50 p-1">
                    {(
                      [
                        ['SELF', 'Solo oficina'],
                        ['DESCENDANTS', 'Con suboficinas'],
                      ] as const
                    ).map(([value, label]) => (
                      <Button
                        key={value}
                        type="button"
                        variant={
                          meetingViewDraft.defaultScope === value
                            ? 'default'
                            : 'ghost'
                        }
                        className="h-9 text-xs"
                        onClick={() =>
                          setMeetingViewDraft(current => ({
                            ...current,
                            defaultScope: value,
                          }))
                        }
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Vistas disponibles</Label>
                  {(
                    [
                      ['UNITS', 'Unidades', 'Compromisos agrupados por unidad'],
                      [
                        'TECHNICAL_TREE',
                        'Árbol técnico',
                        'Proyectos, niveles y subtareas',
                      ],
                      ['MEMBERS', 'Miembros', 'Compromisos por responsable'],
                      [
                        'PROJECTS_MEMBERS',
                        'Proyectos + miembros',
                        'Seguimiento técnico por proyecto y persona',
                      ],
                    ] as const
                  ).map(([value, label, description]) => {
                    const checked =
                      meetingViewDraft.visibleViews.includes(value);
                    return (
                      <label
                        key={value}
                        className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3 hover:border-blue-200"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={nextChecked => {
                            setMeetingViewDraft(current => {
                              const visibleViews = nextChecked
                                ? [...current.visibleViews, value]
                                : current.visibleViews.filter(
                                    view => view !== value
                                  );
                              if (!visibleViews.length) return current;
                              return {
                                ...current,
                                visibleViews,
                                defaultView: visibleViews.includes(
                                  current.defaultView
                                )
                                  ? current.defaultView
                                  : visibleViews[0],
                              };
                            });
                          }}
                        />
                        <span className="grid gap-0.5">
                          <span className="text-sm font-semibold text-slate-900">
                            {label}
                          </span>
                          <span className="text-xs text-slate-500">
                            {description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <Label>Vista inicial</Label>
                  <Select
                    value={meetingViewDraft.defaultView}
                    onValueChange={value =>
                      setMeetingViewDraft(current => ({
                        ...current,
                        defaultView: value as MeetingWorkspaceView,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meetingViewDraft.visibleViews.map(value => (
                        <SelectItem key={value} value={value}>
                          {
                            {
                              UNITS: 'Unidades',
                              TECHNICAL_TREE: 'Árbol técnico',
                              MEMBERS: 'Miembros',
                              PROJECTS_MEMBERS: 'Proyectos + miembros',
                            }[value]
                          }
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-red-600">
                No se pudo cargar la configuración de reuniones.
              </div>
            )}
            <SheetFooter className="mt-auto gap-2 border-t border-slate-200 pt-4 sm:justify-between">
              {meetingViewConfigQuery.data?.localConfig ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={restoreMeetingViewConfigMutation.isPending}
                  onClick={() => restoreMeetingViewConfigMutation.mutate()}
                >
                  Restaurar herencia
                </Button>
              ) : (
                <span />
              )}
              <Button
                type="button"
                disabled={
                  !meetingViewConfigQuery.data?.canManage ||
                  saveMeetingViewConfigMutation.isPending
                }
                onClick={() => saveMeetingViewConfigMutation.mutate()}
              >
                {saveMeetingViewConfigMutation.isPending
                  ? 'Guardando...'
                  : 'Guardar configuración'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Dialog open={showNewMeeting} onOpenChange={setShowNewMeeting}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nueva reunión</DialogTitle>
              <DialogDescription>
                Crea una reunión para{' '}
                {selectedUnit?.name || 'la oficina seleccionada'}. Se abrirá el
                workspace de reunión al guardar.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-meeting-title">Título</Label>
                <Input
                  id="workspace-meeting-title"
                  value={meetingTitle}
                  onChange={event => {
                    setMeetingTitleTouched(true);
                    setMeetingTitle(event.target.value);
                  }}
                  placeholder={buildDefaultMeetingTitle(
                    selectedUnit?.name || 'Oficina',
                    meetingScheduledAt
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace-meeting-date">Fecha y hora</Label>
                <Input
                  id="workspace-meeting-date"
                  type="datetime-local"
                  value={meetingScheduledAt}
                  onChange={event => setMeetingScheduledAt(event.target.value)}
                />
              </div>
              <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950">
                <p className="font-semibold">Contexto inicial</p>
                <p>
                  {selectedProject
                    ? `Proyecto: ${projectLabel(selectedProject)}`
                    : 'Se vincularán los proyectos activos de la oficina.'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowNewMeeting(false)}
                disabled={createMeetingMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="secondary"
                onClick={() => createMeetingMutation.mutate('DRAFT')}
                disabled={createMeetingMutation.isPending || !selectedUnitId}
              >
                Guardar borrador
              </Button>
              <Button
                onClick={() => createMeetingMutation.mutate('LIVE')}
                disabled={createMeetingMutation.isPending || !selectedUnitId}
              >
                <CalendarDays size={16} />
                Iniciar reunión
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="grid max-h-[92vh] w-[min(96vw,1120px)] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Previsualizar asignacion tecnica</DialogTitle>
              <DialogDescription>
                {assignmentPreview?.summary.reopenable
                  ? 'Hay subtareas en revision, revisadas u observadas. Si confirmas, volveran a En proceso, se reemplazara el responsable tecnico y el envio anterior quedara observado en el historial.'
                  : assignmentPreview?.summary.assignedToOther
                  ? 'Hay subtareas asignadas a otra persona. Si confirmas, se reemplazara el responsable tecnico activo anterior por el encargado elegido.'
                  : 'Se creara el compromiso para toda la seleccion. Solo se asignaran tecnicamente las subtareas Por hacer y sin responsable.'}
              </DialogDescription>
            </DialogHeader>

            {assignmentPreview && (
              <div className="min-h-0 space-y-4 overflow-hidden">
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
                  <div className="rounded-md border border-slate-200 p-3">
                    <p className="text-xs uppercase text-slate-500">Total</p>
                    <p className="text-xl font-bold">
                      {assignmentPreview.summary.total}
                    </p>
                  </div>
                  <div className="rounded-md border border-green-200 bg-green-50 p-3">
                    <p className="text-xs uppercase text-green-700">
                      Por asignar
                    </p>
                    <p className="text-xl font-bold text-green-800">
                      {assignmentPreview.summary.assignable}
                    </p>
                  </div>
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs uppercase text-blue-700">
                      Ya asignadas
                    </p>
                    <p className="text-xl font-bold text-blue-800">
                      {assignmentPreview.summary.sameAssignee}
                    </p>
                  </div>
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs uppercase text-amber-700">
                      Conflictos
                    </p>
                    <p className="text-xl font-bold text-amber-800">
                      {assignmentPreview.summary.assignedToOther}
                    </p>
                  </div>
                  <div className="rounded-md border border-red-200 bg-red-50 p-3">
                    <p className="text-xs uppercase text-red-700">
                      Por reabrir
                    </p>
                    <p className="text-xl font-bold text-red-800">
                      {assignmentPreview.summary.reopenable}
                    </p>
                  </div>
                  <div className="rounded-md border border-red-200 bg-red-50 p-3">
                    <p className="text-xs uppercase text-red-700">Bloqueadas</p>
                    <p className="text-xl font-bold text-red-800">
                      {assignmentPreview.summary.locked}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 p-3">
                    <p className="text-xs uppercase text-slate-500">
                      Con compromiso
                    </p>
                    <p className="text-xl font-bold">
                      {assignmentPreview.summary.withOpenCommitments}
                    </p>
                  </div>
                </div>

                <div className="max-h-[min(54vh,460px)] overflow-auto rounded-md border border-slate-200">
                  <table className="w-full min-w-[920px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Codigo</th>
                        <th className="px-3 py-2">Subtarea</th>
                        <th className="px-3 py-2">Estado</th>
                        <th className="px-3 py-2">Responsable actual</th>
                        <th className="px-3 py-2">Resultado</th>
                        <th className="px-3 py-2">Compromisos</th>
                        <th className="px-3 py-2">Archivos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignmentPreview.rows.map(row => (
                        <tr
                          key={row.id}
                          className="border-t border-slate-200 bg-white"
                        >
                          <td className="px-3 py-2 align-top font-mono text-xs text-blue-700">
                            {row.item || row.id}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <p className="text-sm font-medium text-slate-950">
                              {row.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {row.files.length +
                                row.latestFeedbackFiles.length}{' '}
                              archivos visibles
                            </p>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <Badge variant={statusVariant(row.status)}>
                              {taskStatusLabel[row.status] ?? row.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 align-top text-sm text-slate-700">
                            {row.currentAssignees.length
                              ? row.currentAssignees
                                  .map(assignee =>
                                    previewAssigneeLabel(assignee)
                                  )
                                  .join(', ')
                              : 'Sin responsable'}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <Badge
                              variant={previewCategoryVariant(row.category)}
                            >
                              {previewCategoryLabel[row.category] ??
                                row.category}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 align-top text-xs text-slate-600">
                            {row.hasOpenCommitments ? (
                              row.openCommitments
                                .slice(0, 2)
                                .map(commitment => commitment.title)
                                .join(', ')
                            ) : (
                              <span className="text-slate-400">
                                Sin abiertos
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEvidenceRow(row)}
                            >
                              <Eye size={14} />
                              Ver
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <DialogFooter className="border-t border-slate-200 pt-3">
              <Button
                variant="outline"
                onClick={() => setPreviewOpen(false)}
                disabled={createTechnicalCommitmentMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  createTechnicalCommitmentMutation.mutate({
                    reflectAssignment: false,
                    assignmentMode: 'CREATE_ONLY',
                  })
                }
                disabled={createTechnicalCommitmentMutation.isPending}
              >
                Crear sin tocar responsables
              </Button>
              <Button
                onClick={() =>
                  createTechnicalCommitmentMutation.mutate({
                    reflectAssignment: true,
                    assignmentMode: assignmentPreview?.summary.reopenable
                      ? 'REOPEN_AND_REASSIGN'
                      : assignmentPreview?.summary.assignedToOther
                      ? 'OVERWRITE_ASSIGNED'
                      : 'UNRESOLVED_ONLY',
                  })
                }
                disabled={createTechnicalCommitmentMutation.isPending}
              >
                {createTechnicalCommitmentMutation.isPending
                  ? 'Creando...'
                  : assignmentPreview?.summary.reopenable
                  ? 'Reabrir y reasignar seleccionadas'
                  : assignmentPreview?.summary.assignedToOther
                  ? 'Reasignar seleccionadas'
                  : 'Crear y asignar Por hacer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(evidenceRow)}
          onOpenChange={open => !open && setEvidenceRow(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {evidenceRow?.item || evidenceRow?.id} - {evidenceRow?.name}
              </DialogTitle>
              <DialogDescription>
                Vista rapida de archivos tecnicos asociados a la subtarea.
              </DialogDescription>
            </DialogHeader>
            {evidenceRow && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={statusVariant(evidenceRow.status)}>
                    {taskStatusLabel[evidenceRow.status] ?? evidenceRow.status}
                  </Badge>
                  <Badge variant={previewCategoryVariant(evidenceRow.category)}>
                    {previewCategoryLabel[evidenceRow.category]}
                  </Badge>
                  {evidenceRow.hasOpenCommitments && (
                    <Badge variant="warning">Tiene compromiso abierto</Badge>
                  )}
                </div>
                <Separator />
                <EvidenceFileList
                  title="Archivos editables / modelo"
                  files={evidenceRow.files}
                />
                <EvidenceFileList
                  title="Ultima revision / feedback"
                  files={evidenceRow.latestFeedbackFiles}
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEvidenceRow(null)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      {!embedded &&
        activeMeeting &&
        (activeMeeting.status === 'LIVE' ||
          activeMeeting.status === 'ENDED') && (
          <div className="fixed bottom-5 right-5 z-50">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex max-w-sm items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-lg transition hover:border-blue-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label={`Abrir controles de ${activeMeeting.title}`}
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      activeMeeting.status === 'LIVE'
                        ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="min-w-0">
                    <span
                      className={`block text-xs font-semibold ${
                        activeMeeting.status === 'LIVE'
                          ? 'text-emerald-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {activeMeeting.status === 'LIVE'
                        ? 'Reunion en vivo'
                        : 'Reunion detenida'}
                    </span>
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {activeMeeting.title}
                    </span>
                  </span>
                  <MoreHorizontal className="h-4 w-4 shrink-0 text-slate-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-3">
                <p className="text-sm font-semibold text-slate-900">
                  {activeMeeting.status === 'LIVE'
                    ? 'La reunion sigue en curso'
                    : 'Esta reunion esta detenida'}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Accede a notas, asistencia y al control para finalizar o
                  continuar la reunion.
                </p>
                <Button
                  type="button"
                  className="mt-3 w-full justify-start"
                  onClick={() =>
                    navigate(`/grupos/reuniones/${activeMeeting.id}`)
                  }
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Abrir controles de reunion
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        )}
    </TooltipProvider>
  );
};

export default TechnicalOfficeProjectsWorkspace;

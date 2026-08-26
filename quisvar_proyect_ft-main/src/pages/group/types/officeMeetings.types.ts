import type { Level } from '@/types/types';
import type {
  MeetingProjectFocus,
  MeetingStageOption,
  MeetingUnitOverviewItem,
  StageVersionInfo,
  StageVersionSourceKind,
} from './meetingUnitProjects.types';

export type OfficeProjectCandidate = MeetingProjectFocus['project'] & {
  linkedUnitFocus?: {
    id: string;
    unitId: string;
    status: 'ACTIVE' | 'INACTIVE' | 'PAUSED';
    unit: {
      id: string;
      name: string;
      type: string;
    };
  } | null;
};

export interface OfficeProjectFocusPayload {
  projectId?: number;
  stageIds?: number[];
  status?: 'ACTIVE' | 'INACTIVE' | 'PAUSED';
  isCurrent?: boolean;
  notes?: string | null;
}

export type StageVersionSource = OfficeProjectCandidate & {
  isCurrentProject?: boolean;
};

export interface CreateStageVersionPayload {
  name?: string;
  versionLabel?: string;
  sourceStageId?: number;
  sourceProjectId?: number;
  sourceKind: StageVersionSourceKind;
  linkToCurrentOffice?: boolean;
  copyPolicy?: 'STRUCTURE_AND_MODEL';
}

export interface CreateStageVersionResponse {
  stage: MeetingStageOption | null;
  version: StageVersionInfo;
  focus?: {
    id: string;
    unitId: string;
    projectId: number;
    stageId: number;
    status: 'ACTIVE' | 'INACTIVE' | 'PAUSED';
    isCurrent: boolean;
    stage: MeetingStageOption;
  } | null;
}

export interface OfficeProjectModerator {
  id: string;
  userId: number;
  unitId: string;
  role: string;
  isPrimary: boolean;
  isUnitLead?: boolean;
  canManageUnitProjects: boolean;
  user: {
    id: number;
    email?: string | null;
    roleId?: number | null;
    role?: {
      id: number;
      name: string;
      hierarchy?: number;
    } | null;
    profile?: {
      firstName: string;
      lastName: string;
      job?: string | null;
    } | null;
  };
}

export interface OfficeProjectModeratorsResponse {
  canManageCurrentUnit: boolean;
  memberships: OfficeProjectModerator[];
}

export type OfficeMemberRole =
  | 'GERENTE'
  | 'JEFE'
  | 'COORDINADOR'
  | 'ESPECIALISTA'
  | 'ASISTENTE'
  | 'APOYO';

export interface OfficeMemberCandidate {
  id: number;
  email?: string | null;
  status?: boolean;
  profile?: {
    firstName: string;
    lastName: string;
    dni?: string | null;
    job?: string | null;
  } | null;
}

export type MeetingParticipantStatus =
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT'
  | 'EXCUSED';

export type MeetingStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'LIVE'
  | 'ENDED'
  | 'CANCELLED';

export type MeetingScope = 'SELF' | 'DESCENDANTS';
export type MeetingWorkspaceView =
  | 'UNITS'
  | 'TECHNICAL_TREE'
  | 'MEMBERS'
  | 'PROJECTS_MEMBERS';

export interface MeetingViewConfiguration {
  scope: MeetingScope;
  defaultView: MeetingWorkspaceView;
  visibleViews: MeetingWorkspaceView[];
  sourceUnit: { id: string; name: string } | null;
  inherited: boolean;
  canManage: boolean;
  localConfig: {
    id: string;
    defaultScope: MeetingScope;
    defaultView: MeetingWorkspaceView;
    visibleViews: MeetingWorkspaceView[];
  } | null;
}

export type MeetingLifecycleEventType = 'STARTED' | 'ENDED' | 'RESUMED';

export interface MeetingLifecycleEvent {
  id: string;
  meetingId: string;
  type: MeetingLifecycleEventType;
  reason?: string | null;
  occurredAt: string;
  actor?: {
    id: number;
    profile?: { firstName: string; lastName: string } | null;
  } | null;
}

export interface MeetingActaRevision {
  id: string;
  version: number;
  status: 'DRAFT' | 'FINAL' | 'SUPERSEDED';
  createdAt: string;
  finalizedAt?: string | null;
}

export interface MeetingHistoryItem {
  id: string;
  unitId: string;
  title: string;
  scheduledAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  status: MeetingStatus;
  scope?: MeetingScope;
  defaultView?: MeetingWorkspaceView;
  visibleViews?: MeetingWorkspaceView[];
  updatedAt: string;
  _count: { participants: number; commitments: number };
}

export interface MeetingExternalContact {
  id: string;
  name: string;
  position?: string | null;
  organization?: string | null;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  notes?: string | null;
  isActive: boolean;
}

export interface MeetingParticipantPayload {
  id?: string;
  userId?: number;
  externalContactId?: string;
  externalContact?: Partial<MeetingExternalContact>;
  status?: MeetingParticipantStatus;
  role?: string;
  notes?: string;
  origin?: 'UNIT_MEMBER' | 'INVITED';
}

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId?: number | null;
  externalContactId?: string | null;
  participantType: 'USER' | 'EXTERNAL';
  origin: 'UNIT_MEMBER' | 'INVITED';
  status: MeetingParticipantStatus;
  role?: string | null;
  notes?: string | null;
  displayName?: string | null;
  position?: string | null;
  organization?: string | null;
  user?: {
    id: number;
    email?: string | null;
    profile?: {
      firstName: string;
      lastName: string;
      job?: string | null;
    } | null;
  } | null;
  externalContact?: MeetingExternalContact | null;
}

export type MeetingAgendaScope =
  | 'GENERAL'
  | 'PROJECT'
  | 'ACTIVITY'
  | 'COMMITMENT';
export type MeetingAgendaStatus = 'OPEN' | 'REVIEWED' | 'CLOSED';

export interface MeetingAgendaItemPayload {
  id?: string;
  projectId?: number | null;
  activityId?: string | null;
  commitmentId?: string | null;
  title: string;
  description?: string | null;
  minutes?: string | null;
  scope?: MeetingAgendaScope;
  status?: MeetingAgendaStatus;
  order?: number;
}

export interface MeetingAgendaItem extends MeetingAgendaItemPayload {
  id: string;
  meetingId: string;
  project?: {
    id: number;
    name?: string | null;
    contract?: { cui?: string | null; projectShortName?: string | null } | null;
  } | null;
  activity?: CalendarActivity | null;
  commitment?: Commitment | null;
}

export type CommitmentConfirmationStatus =
  | 'PROPOSED'
  | 'CONFIRMED'
  | 'REJECTED';
export type CommitmentOrigin =
  | 'PRE_MEETING'
  | 'MEETING'
  | 'POST_MEETING'
  | 'MANUAL';
export type CommitmentTargetType =
  | 'ORG_UNIT'
  | 'PROJECT'
  | 'STAGE'
  | 'LEVEL'
  | 'TASK';
export type CommitmentReviewDecision =
  | 'APPROVED'
  | 'REJECTED'
  | 'NOT_APPLICABLE';

export interface CommitmentContext {
  id: string;
  commitmentId: string;
  targetType: CommitmentTargetType;
  unitId?: string | null;
  projectId?: number | null;
  stageId?: number | null;
  levelId?: number | null;
  subTaskId?: number | null;
  includeChildren: boolean;
  isPrimary: boolean;
  unit?: {
    id: string;
    name: string;
    type: string;
    codemap?: string | null;
  } | null;
  project?: {
    id: number;
    name?: string | null;
    contract?: { cui?: string | null; projectShortName?: string | null } | null;
  } | null;
  stage?: { id: number; name: string; projectId: number } | null;
  level?: {
    id: number;
    name: string;
    item?: string | null;
    index: number;
    level: number;
  } | null;
  subTask?: {
    id: number;
    name: string;
    item?: string | null;
    index: number;
    status: string;
  } | null;
}

export type TechnicalStageTree = Level;

export type BasicResourceKind =
  | 'PHOTO'
  | 'DOCUMENT'
  | 'DRAWING'
  | 'MODEL'
  | 'ARCHIVE'
  | 'VIDEO'
  | 'OTHER';

export interface BasicResourceTarget {
  id: string;
  levelId?: number | null;
  subTaskId?: number | null;
  includeDescendants: boolean;
  level?: { id: number; name: string; item?: string | null } | null;
  subTask?: { id: number; name: string; item?: string | null } | null;
}

export interface BasicResource {
  id: string;
  title?: string | null;
  description?: string | null;
  originalName: string;
  mimeType: string;
  extension: string;
  sizeBytes: string;
  kind: BasicResourceKind;
  createdAt: string;
  uploadedBy: {
    id: number;
    profile?: { firstName: string; lastName: string } | null;
  };
  targets: BasicResourceTarget[];
}

export interface BasicResourcesResponse {
  canManage: boolean;
  resources: BasicResource[];
}

export interface TechnicalCommitmentAssignmentPayload {
  projectId: number;
  stageId: number;
  meetingId?: string | null;
  levelIds: number[];
  subTaskIds: number[];
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: Commitment['priority'];
  assigneeUserIds?: number[];
  technicalOwnerId?: number;
  reflectAssignment?: boolean;
  assignmentMode?:
    | 'UNRESOLVED_ONLY'
    | 'OVERWRITE_ASSIGNED'
    | 'REOPEN_AND_REASSIGN'
    | 'CREATE_ONLY';
}

export type TechnicalPreviewCategory =
  | 'ASSIGNABLE'
  | 'SAME_ASSIGNEE'
  | 'ASSIGNED_TO_OTHER'
  | 'REOPENABLE'
  | 'LOCKED'
  | 'NO_ACTION';

export interface TechnicalPreviewFile {
  id: number;
  dir: string;
  name: string;
  type: string;
  originalname?: string | null;
}

export type TechnicalReviewSubmissionState =
  | 'PENDING'
  | 'REPLACED'
  | 'APPROVED'
  | 'OBSERVED';

export interface TechnicalReviewSubmission {
  id: number;
  author?: string | null;
  reviewer?: string | null;
  type: string;
  status: boolean;
  percentage: number;
  createdAt: string;
  updatedAt: string;
  replacedAt?: string | null;
  state: TechnicalReviewSubmissionState;
  files: TechnicalPreviewFile[];
}

export interface TechnicalCommitmentPreviewRow {
  id: number;
  item?: string | null;
  name: string;
  status: string;
  days: number;
  price: string | number;
  levelId: number;
  category: TechnicalPreviewCategory;
  action: 'ASSIGN' | 'SKIP' | 'KEEP';
  currentAssignees: {
    id: number;
    userId: number;
    assignedAt: string;
    user: {
      id: number;
      email?: string | null;
      profile?: {
        firstName: string;
        lastName: string;
        job?: string | null;
      } | null;
    };
  }[];
  files: TechnicalPreviewFile[];
  latestFeedbackFiles: TechnicalPreviewFile[];
  hasOpenCommitments: boolean;
  openCommitments: { id: string; title: string; status: string }[];
}

export interface TechnicalCommitmentPreview {
  summary: {
    total: number;
    assignable: number;
    sameAssignee: number;
    assignedToOther: number;
    reopenable: number;
    locked: number;
    noAction: number;
    withOpenCommitments: number;
  };
  rows: TechnicalCommitmentPreviewRow[];
}

export interface TechnicalCommitmentCreateResponse {
  commitment: Commitment;
  assignment: TechnicalCommitmentPreview['summary'] & {
    assigned: number;
    reassigned: number;
    reopened: number;
    skipped: number;
    locked: number;
  };
  preview: TechnicalCommitmentPreview;
}

export interface TechnicalReviewResponse {
  task?: import('@/types/types').SubTask;
  commitment?: Commitment | null;
  summary: {
    reviewedTasks: number;
    skippedTasks: number;
    commitmentReviewed: boolean;
  };
}

export interface CommitmentReview {
  id: string;
  commitmentId: string;
  contextId?: string | null;
  meetingId?: string | null;
  decision: CommitmentReviewDecision;
  comment?: string | null;
  reviewedAt: string;
  reviewedBy?: {
    id: number;
    profile?: { firstName: string; lastName: string } | null;
  } | null;
}

export interface Commitment {
  id: string;
  unitId: string;
  projectId?: number | null;
  meetingId?: string | null;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' | 'CANCELLED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  confirmationStatus: CommitmentConfirmationStatus;
  origin: CommitmentOrigin;
  createdAt?: string;
  updatedAt?: string;
  project?: { id: number; name?: string | null } | null;
  unit?: { id: string; name: string; type: string } | null;
  assignees?: {
    id: string;
    user?: {
      id: number;
      profile?: {
        firstName: string;
        lastName: string;
        job?: string | null;
      } | null;
    } | null;
    unit?: {
      id: string;
      name: string;
      type?: string;
      codemap?: string | null;
    } | null;
  }[];
  contexts?: CommitmentContext[];
  reviews?: CommitmentReview[];
}

export interface CommitmentBoardUnit {
  id: string;
  name: string;
  codemap?: string | null;
  type: string;
  parentId?: string | null;
  depth: number;
  path: string[];
  metrics: {
    total: number;
    pending: number;
    inProgress: number;
    blocked: number;
    done: number;
    rejected: number;
    notApplicable: number;
    overdue: number;
  };
  commitments: Commitment[];
  children: CommitmentBoardUnit[];
}

export interface CommitmentBoardResponse {
  rootMode: 'AUTO_ROOT';
  units: CommitmentBoardUnit[];
}

export interface CalendarActivity {
  id: string;
  unitId: string;
  projectId?: number | null;
  meetingId?: string | null;
  title: string;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  allDay: boolean;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  unit?: { id: string; name: string; type: string };
  project?: { id: number; name?: string | null } | null;
}

export interface CalendarActivityPayload {
  unitId: string;
  projectId?: number | null;
  meetingId?: string | null;
  title: string;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  allDay?: boolean;
  status?: CalendarActivity['status'];
  priority?: CalendarActivity['priority'];
  participantUserIds?: number[];
}

export interface CalendarItem {
  type: 'MEETING' | 'ACTIVITY' | 'COMMITMENT';
  sourceId: string;
  title: string;
  startAt: string;
  endAt?: string | null;
  status: string;
  confirmationStatus?: CommitmentConfirmationStatus;
  unit: { id: string; name: string; type: string };
  project?: { id: number; name?: string | null } | null;
}

export interface MeetingUnitDashboard {
  unit: MeetingUnitOverviewItem & {
    memberships?: {
      id: string;
      userId: number;
      unitId: string;
      role: OfficeMemberRole;
      isPrimary: boolean;
      isUnitLead?: boolean;
      canManageUnitProjects: boolean;
      user: {
        id: number;
        email: string;
        profile?: {
          firstName: string;
          lastName: string;
          job?: string | null;
        } | null;
      };
    }[];
  };
  projects: MeetingProjectFocus[];
  commitments: unknown[];
  meetings: unknown[];
  reports: unknown[];
}

export interface MeetingCreatePayload {
  unitId: string;
  title: string;
  scheduledAt?: string;
  projectIds?: number[];
  participants?: MeetingParticipantPayload[];
  agendaItems?: MeetingAgendaItemPayload[];
}

export interface ProgressReportPayload {
  unitId: string;
  projectId: number;
  meetingId?: string | null;
  title?: string | null;
  presenterType?: 'USER' | 'TEAM' | 'GROUP';
  presenterUserId?: number | null;
  presenterLabel?: string | null;
  participantUserIds?: number[];
  templateId?: string | null;
  overallProgress?: number;
  observations?: string | null;
  items?: {
    name: string;
    source?: 'PROJECT_ONLY' | 'ASITEC' | 'REUSABLE_TEMPLATE' | 'CUSTOM';
    status?:
      | 'NOT_STARTED'
      | 'IN_PROGRESS'
      | 'IN_REVIEW'
      | 'WAITING_ASITEC'
      | 'COMPLETED'
      | 'BLOCKED';
    progress?: number;
    observations?: string | null;
  }[];
}

export type ProgressReportStatus = 'DRAFT' | 'READY' | 'PRESENTED' | 'ARCHIVED';

export type ProgressReportItemStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'WAITING_ASITEC'
  | 'COMPLETED'
  | 'BLOCKED';

export type ProgressReportItemSource =
  | 'PROJECT_ONLY'
  | 'ASITEC'
  | 'REUSABLE_TEMPLATE'
  | 'CUSTOM';

export interface ProgressReportItem {
  id?: string;
  name: string;
  source: ProgressReportItemSource;
  status: ProgressReportItemStatus;
  progress: number;
  observations?: string | null;
  responsible?: string | null;
  order?: number;
}

export interface ProgressReport {
  id: string;
  unitId: string;
  projectId: number;
  meetingId?: string | null;
  title?: string | null;
  presenterType: 'USER' | 'TEAM' | 'GROUP';
  presenterUserId?: number | null;
  presenterLabel?: string | null;
  presenterKey?: string | null;
  readyKey?: string | null;
  overallProgress: number;
  observations?: string | null;
  status: ProgressReportStatus;
  updatedAt: string;
  unit: {
    id: string;
    name: string;
    type: string;
  };
  project: {
    id: number;
    name?: string | null;
    contract: {
      id: number;
      cui: string;
      projectShortName?: string | null;
    };
  };
  participants?: {
    id: string;
    userId: number;
    role: 'PRESENTER' | 'SUPPORT';
    user: {
      id: number;
      email?: string | null;
      profile?: {
        firstName: string;
        lastName: string;
        job?: string | null;
      } | null;
    };
  }[];
  items: ProgressReportItem[];
}

export interface ProgressReportsWorkspace {
  stats: {
    pending: number;
    drafts: number;
    ready: number;
    presented: number;
    teamOrGroup?: number;
    totalReports: number;
    completionRate: number;
  };
  pending: {
    unit: {
      id: string;
      name: string;
      type: string;
    };
    projectFocus: MeetingProjectFocus;
  }[];
  drafts: ProgressReport[];
  ready: ProgressReport[];
  presented: ProgressReport[];
  teamOrGroup?: ProgressReport[];
  projectFocus?: MeetingProjectFocus[];
}

export interface ReportItemTemplate {
  id: string;
  name: string;
  source: ProgressReportItemSource;
  description?: string | null;
}

export type ReportIndexTemplateScope = 'GLOBAL' | 'UNIT' | 'PERSONAL';

export interface ReportIndexTemplateItem {
  id: string;
  templateId: string;
  name: string;
  source: ProgressReportItemSource;
  defaultStatus: ProgressReportItemStatus;
  defaultProgress: number;
  defaultObservations?: string | null;
  order: number;
}

export interface ReportIndexTemplate {
  id: string;
  name: string;
  scope: ReportIndexTemplateScope;
  unitId?: string | null;
  ownerUserId?: number | null;
  description?: string | null;
  isActive: boolean;
  items: ReportIndexTemplateItem[];
}

export interface ReportIndexTemplatePayload {
  name: string;
  scope?: ReportIndexTemplateScope;
  unitId?: string | null;
  description?: string | null;
  items?: {
    name: string;
    source?: ProgressReportItemSource;
    defaultStatus?: ProgressReportItemStatus;
    defaultProgress?: number;
    defaultObservations?: string | null;
    order?: number;
  }[];
}


export type DutyAssignmentStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'OPEN_POOL';

export type DutySwapRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CLAIMED';

export type DutyFrequency = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type DutyAssignmentStrategy =
  | 'ONE_OWNER_PER_PERIOD'
  | 'ONE_OWNER_PER_SLOT'
  | 'DISTRIBUTE_PARTICIPANTS';
export type DutyParticipantSource = 'EXPLICIT' | 'ACTIVE_ELIGIBLE_SYNC';
export type DutyEvidencePolicy = 'NONE' | 'OPTIONAL_PHOTO' | 'REQUIRED_PHOTO';
export type DutyWeekday =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface DutyUserProfile {
  firstName: string;
  lastName: string;
  dni?: string;
  phone?: string | null;
}

export interface DutyRoleOption {
  id: number;
  name: string;
}

export interface DutyUser {
  id: number;
  email?: string;
  profile: DutyUserProfile | null;
  roleId?: number | null;
  role?: DutyRoleOption | null;
  status?: boolean;
}

export interface DutySlot {
  key: string;
  label: string;
  instructions?: string | null;
  capacity?: { mode: 'FIXED'; count: number } | { mode: 'REMAINDER' };
  eligibleParticipantIds?: number[];
}

export type DutyRecurrence =
  | { frequency: 'ONCE'; date: string; slots: DutySlot[] }
  | { frequency: 'DAILY'; weekdays: DutyWeekday[]; slots: DutySlot[] }
  | {
      frequency: 'WEEKLY';
      weekStartsOn: DutyWeekday;
      weekdays: DutyWeekday[];
      slots: DutySlot[];
    }
  | { frequency: 'MONTHLY'; daysOfMonth: number[]; slots: DutySlot[] };

export type DutyDraftRecurrence =
  | { frequency: 'ONCE'; date: string; slots: DutySlot[] }
  | { frequency: 'DAILY'; weekdays: DutyWeekday[]; slots: DutySlot[] }
  | { frequency: 'WEEKLY'; weekdays: DutyWeekday[]; slots: DutySlot[] }
  | { frequency: 'MONTHLY'; daysOfMonth: number[]; slots: DutySlot[] };

export interface DutyDraft {
  name: string;
  description?: string | null;
  capabilityKey?: string | null;
  accessWindowDays: number;
  assignmentStrategy: DutyAssignmentStrategy;
  participantSource: DutyParticipantSource;
  evidencePolicy: DutyEvidencePolicy;
  validFrom: string;
  validUntil?: string | null;
  recurrence: DutyDraftRecurrence;
  participantIds: number[];
  excludedOccurrenceKeys: string[];
}

export interface DutyParticipant {
  id: string;
  dutyId: string;
  userId: number;
  position: number;
  user: DutyUser | null;
}

export interface DutyRotationAllowedActions {
  inspect: boolean;
  edit: boolean;
  repair: boolean;
  deactivate: boolean;
  reactivate: boolean;
}

export interface DutyConfigurationIssue {
  code:
    | 'INVALID_RECURRENCE_RULE'
    | 'FREQUENCY_MISMATCH'
    | 'NO_PARTICIPANTS'
    | 'INVALID_ALLOCATION_RULE'
    | 'INVALID_RESPONSE';
  field: string;
  message: string;
}

interface DutyRotationBase {
  id: string;
  name: string;
  description: string | null;
  capabilityKey: string | null;
  accessWindowDays: number;
  frequency: DutyFrequency | null;
  assignmentStrategy: DutyAssignmentStrategy | null;
  participantSource: DutyParticipantSource | null;
  evidencePolicy: DutyEvidencePolicy | null;
  rosterVersion: number | null;
  weekStartsOn: DutyWeekday | null;
  validFrom: string | null;
  validUntil: string | null;
  planningStartsOn: string | null;
  excludedOccurrenceKeys: string[];
  configurationVersion: number | null;
  isActive: boolean;
  lastReconciledAt: string | null;
  participants: DutyParticipant[];
  createdAt: string;
  updatedAt: string;
  _count: { assignments: number } | null;
  allowedActions: DutyRotationAllowedActions;
  configurationIssues: DutyConfigurationIssue[];
}

export interface ValidDutyRotation extends DutyRotationBase {
  configurationStatus: 'VALID';
  frequency: DutyFrequency;
  assignmentStrategy: DutyAssignmentStrategy;
  participantSource: DutyParticipantSource;
  evidencePolicy: DutyEvidencePolicy;
  rosterVersion: number;
  weekStartsOn: DutyWeekday;
  recurrenceRule: DutyRecurrence;
  validFrom: string;
  planningStartsOn: string;
  configurationVersion: number;
  configurationIssues: [];
}

export interface InvalidDutyRotation extends DutyRotationBase {
  configurationStatus: 'INVALID';
  recurrenceRule: null;
}

export type DutyRotation = ValidDutyRotation | InvalidDutyRotation;

export interface DutyAssignmentDuty {
  id: string;
  name: string;
  capabilityKey: string | null;
  participants: DutyParticipant[];
}

export interface DutyRotationAssignment {
  id: string;
  dutyId: string;
  duty: DutyAssignmentDuty;
  occurrenceKey: string;
  periodStart: string;
  periodEnd: string;
  dueOn: string;
  slotKey: string;
  slotLabel: string;
  slotInstructions: string | null;
  baseSlotKey: string | null;
  slotPosition: number | null;
  assignedUserId: number;
  assignedUser: DutyUser | null;
  executedByUserId: number | null;
  executedByUser: DutyUser | null;
  status: DutyAssignmentStatus;
  configurationVersion: number;
  rosterVersion: number;
  evidencePolicy: DutyEvidencePolicy;
  origin: 'AUTO' | 'MANUAL' | 'SWAP' | 'OPEN_POOL';
  isLocked: boolean;
  resolutionNotes: string | null;
  coverageStart?: string;
  coverageEnd?: string;
  coverageLabel?: string;
  createdAt: string;
  updatedAt: string;
  swapRequests: DutySwapRequest[];
  evidences: DutyAssignmentEvidence[];
}

export interface DutyAssignmentEvidence {
  id: string;
  originalName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
  submittedById: number;
  createdAt: string;
  contentUrl: string;
}

export interface DutySwapRequest {
  id: string;
  assignmentId: string;
  requesterUserId: number;
  requesterUser?: DutyUser;
  targetUserId: number | null;
  targetUser?: DutyUser | null;
  status: DutySwapRequestStatus;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
  assignment?: DutyRotationAssignment;
}

export interface DutyPreviewOccurrence {
  occurrenceKey: string;
  periodStart: string;
  periodEnd: string;
  dueOn: string;
  slotKey: string;
  slotLabel: string;
  slotInstructions: string | null;
  baseSlotKey: string | null;
  slotPosition: number | null;
  assignedUser: DutyUser;
}

export interface DutyDistributionWarning {
  occurrenceKey: string;
  periodStart: string;
  periodEnd: string;
  repeatedParticipantCount: number;
}

export interface DutyPreviewResponse {
  occurrences: DutyPreviewOccurrence[];
  warnings: string[];
  distributionWarnings: DutyDistributionWarning[];
  adjustedStart: string | null;
  horizonEnd: string;
  rosterFingerprint: string;
  participantSnapshot: DutyUser[];
}

export interface DutyEligibleRosterResponse {
  participants: DutyUser[];
  rosterFingerprint: string;
}

export interface DutyRosterSyncPreviewResponse {
  addedIds: number[];
  removedIds: number[];
  preservedIds: number[];
  rosterFingerprint: string;
  impact: DutyImpactResponse;
}

export interface DutyOccurrenceAllocation {
  slotKey: string;
  slotLabel: string;
  slotInstructions: string | null;
  baseSlotKey: string;
  slotPosition: number;
  assignedUserId: number;
  assignedUser: DutyUser | null;
}

export interface DutyOccurrenceExclusionResponse {
  dutyId: string;
  dutyName: string;
  configurationVersion: number;
  rosterVersion: number;
  occurrence: {
    occurrenceKey: string;
    periodStart: string;
    periodEnd: string;
    dueOn: string;
  };
  existingExclusions: Array<{ userId: number; reason?: string | null }>;
  excludedUserIds: number[];
  canApply: boolean;
  conflicts: Array<{
    assignmentId: string;
    assignedUserId: number;
    slotKey: string;
    reason: string;
  }>;
  replacedCount: number;
  warnings: string[];
  assignments: DutyOccurrenceAllocation[];
  persistedAssignments?: DutyRotationAssignment[];
  idempotentReplay?: boolean;
}

export interface DutyEditPayload {
  draft: DutyDraft;
  effectiveFrom: string;
  expectedVersion: number;
  requestKey: string;
}

export interface DutyImpactAssignment {
  id: string;
  dutyId: string;
  occurrenceKey: string;
  periodStart: string;
  periodEnd: string;
  dueOn: string;
  slotKey: string;
  slotLabel: string;
  assignedUserId: number;
  status: DutyAssignmentStatus;
  origin: 'AUTO' | 'MANUAL' | 'SWAP' | 'OPEN_POOL';
  isLocked: boolean;
  protectionReason?: string;
}

export interface DutyImpactResponse {
  preservedCount: number;
  removedCount: number;
  regeneratedCount: number;
  conflictCount: number;
  preserved: DutyImpactAssignment[];
  removed: DutyImpactAssignment[];
  conflicts: DutyImpactAssignment[];
  preview: DutyPreviewResponse;
}

export interface DutyReconciliationResponse {
  dutyId: string;
  createdCount: number;
  preservedCount: number;
  deletedCount: number;
  conflictCount: number;
  createdIds: string[];
  deletedIds: string[];
  conflicts: Array<{
    assignmentId: string;
    occurrenceKey: string;
    slotKey: string;
    reason: string;
  }>;
}

export interface DutyMutationResponse {
  duty: DutyRotation;
  reconciliation: DutyReconciliationResponse | null;
  impact?: DutyImpactResponse;
  idempotentReplay: boolean;
}

export interface DutyStatusPreviewResponse {
  isActive: boolean;
  removableCount: number;
  preservedCount: number;
  conflictCount: number;
  conflicts: DutyImpactAssignment[];
}

export interface DutyStatusMutationResponse {
  duty: DutyRotation;
  deletedCount?: number;
  conflicts?: DutyImpactAssignment[];
  reconciliation: DutyReconciliationResponse | null;
  idempotentReplay: boolean;
}

export interface DutyAssignmentFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: DutyAssignmentStatus;
  userId?: number;
  dutyId?: string;
}

export interface DutyBulkDeleteAssignmentsPayload {
  ids: string[];
  dutyId?: string;
  allowCurrentDay?: boolean;
  deleteOnlyDeletable?: boolean;
}

export interface DutyBulkDeleteAssignmentsResponse {
  deletedCount: number;
  protectedCount: number;
  requestedCount: number;
  deletedIds: string[];
}

export interface DutyRotationEntitlement {
  assignment: DutyRotationAssignment;
  capabilityKey: string | null;
  periodStart: string;
  periodEnd: string;
  coverageLabel?: string;
  accessDeadline: string;
}

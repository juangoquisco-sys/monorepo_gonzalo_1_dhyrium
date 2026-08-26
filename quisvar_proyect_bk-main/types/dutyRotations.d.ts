import type {
  DutyRotationAssignmentOrigin,
  DutyRotationAssignmentStatus,
  DutySwapRequest,
} from '@prisma/client';

export type DutyAssignmentStatus = DutyRotationAssignmentStatus;
export type DutyAssignmentOrigin = DutyRotationAssignmentOrigin;
export type DutySwapRequestStatus = DutySwapRequest['status'];

export interface DutyAssignmentFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: DutyAssignmentStatus;
  userId?: number;
  dutyId?: string;
}

export interface DutyBulkDeleteAssignmentsBody {
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

export interface CompleteDutyAssignmentBody {
  executedByUserId?: number;
  resolutionNotes?: string;
  requestKey: string;
}

export interface ReassignDutyAssignmentBody {
  assignedUserId: number;
}

export interface DutySwapRequestBody {
  targetUserId?: number | null;
  reason?: string;
}

export interface RotationEntitlementQuery {
  capabilityKey: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  referenceDate?: Date;
}

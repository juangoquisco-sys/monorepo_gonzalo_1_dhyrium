import {
  AttendancePenaltyAdjustmentScope,
  AttendanceReconciliationStatus,
  ListDetails,
} from '@prisma/client';

export type AttendanceReconciliationItemInput = {
  usersId: number;
  listId: number;
};

export type AttendanceReconciliationCreateBody = {
  userId: number;
  periodStart: string | Date;
  periodEnd: string | Date;
  reason: string;
  items: AttendanceReconciliationItemInput[];
};

export type AttendanceReconciliationFilters = {
  userId?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: AttendanceReconciliationStatus;
};

export type AttendanceReconciliationCandidateFilters = {
  userId?: number;
  dateFrom?: string;
  dateTo?: string;
};

export type AttendanceReconciliationSummaryFilters = {
  dateFrom?: string;
  dateTo?: string;
};

export type AttendanceFineReportFilters = {
  dateFrom?: string;
  dateTo?: string;
  userId?: number;
  search?: string;
  sortAmount?: 'normal' | 'asc' | 'desc';
};

export type AttendanceIncidentFilters = {
  userId?: number;
  dateFrom?: string;
  dateTo?: string;
  statuses?: ListDetails[];
};

export type AttendanceReconciliationVoidBody = {
  reason: string;
};

export type AttendancePenaltyAdjustmentItemInput = {
  usersId: number;
  listId: number;
  adjustedAmount: number;
  reason: string;
};

export type AttendancePenaltyAdjustmentTotalInput = {
  adjustedAmount: number;
  reason: string;
};

export type AttendancePenaltyAdjustmentBulkInput = {
  userId: number;
  periodStart: string | Date;
  periodEnd: string | Date;
  items?: AttendancePenaltyAdjustmentItemInput[];
  total?: AttendancePenaltyAdjustmentTotalInput;
};

export type AttendancePenaltyAdjustmentVoidInput = {
  userId: number;
  periodStart: string | Date;
  periodEnd: string | Date;
  scope?: AttendancePenaltyAdjustmentScope;
  items?: { usersId: number; listId: number }[];
  reason?: string;
};

export type AttendanceEffectiveStatus = {
  originalStatus: ListDetails;
  effectiveStatus: ListDetails;
};

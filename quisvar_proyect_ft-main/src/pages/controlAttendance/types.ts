import type { AttendanceStatus } from '@/models/attendanceStatus';
import type { UserType } from '@/types/userType';

export type AttendanceIncidentStatus = AttendanceStatus;

export type AttendanceUserSummary = {
  id: number;
  email: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    dni?: string;
    phone?: string;
  };
};

export type AttendanceControlUserLookup = AttendanceUserSummary & {
  status?: boolean;
  userType?: UserType;
};

export type AttendanceReconciliationInfo = {
  id: string;
  reason: string;
  status: 'ACTIVE' | 'VOIDED';
  createdAt: string;
  createdBy?: AttendanceUserSummary;
};

export type AttendanceReconciliationCandidate = {
  usersId: number;
  listId: number;
  assignedAt: string;
  weekday?: string;
  status: AttendanceIncidentStatus;
  originalStatus: AttendanceIncidentStatus;
  effectiveStatus: AttendanceIncidentStatus;
  user: AttendanceUserSummary;
  list: {
    id: number;
    title?: string;
    timer?: string;
    createdAt: string;
  };
  reconciliation?: AttendanceReconciliationInfo | null;
};

export type AttendanceStatusCounts = Record<AttendanceIncidentStatus, number>;

export type AttendanceReconciliationSummary = {
  user: AttendanceUserSummary & {
    role?: {
      id: number;
      name: string;
      hierarchy: number;
    } | null;
    equipment?: {
      name?: string | null;
      workStation?: string | null;
    } | null;
  };
  counts: AttendanceStatusCounts;
  originalCounts: AttendanceStatusCounts;
  totalFine: number;
  originalFine: number;
  forgivenFine: number;
  totalRecords: number;
  reconciledCount: number;
  pendingReconciliableCount: number;
  status: 'CLEAR' | 'PARTIAL' | 'PENDING';
};

export type AttendanceReconciliation = {
  id: string;
  userId: number;
  periodStart: string;
  periodEnd: string;
  reason: string;
  status: 'ACTIVE' | 'VOIDED';
  voidReason?: string | null;
  voidedAt?: string | null;
  createdAt: string;
  user?: AttendanceUserSummary;
  createdBy?: AttendanceUserSummary;
  voidedBy?: AttendanceUserSummary | null;
  items: {
    id: string;
    usersId: number;
    listId: number;
    originalStatus: AttendanceIncidentStatus;
    resolvedStatus: AttendanceIncidentStatus;
    attendance?: {
      assignedAt: string;
      list?: {
        title?: string;
        timer?: string;
        createdAt: string;
      };
    };
  }[];
};

export type AttendanceReconciliationCreateBody = {
  userId: number;
  periodStart: string;
  periodEnd: string;
  reason: string;
  items: { usersId: number; listId: number }[];
};

export type AttendanceIncident = AttendanceReconciliationCandidate;

export type AttendancePenaltyAdjustment = {
  id: string;
  scope: 'ATTENDANCE_RECORD' | 'USER_PERIOD';
  usersId?: number | null;
  listId?: number | null;
  userId: number;
  adjustedById: number;
  originalStatus?: AttendanceIncidentStatus | null;
  originalAmount: number;
  adjustedAmount: number;
  reason: string;
  status: 'ACTIVE' | 'VOIDED';
  periodStart?: string | null;
  periodEnd?: string | null;
  createdAt: string;
};

export type AttendanceFineReportIncident = {
  usersId: number;
  listId: number;
  assignedAt: string;
  weekday?: string;
  list?: {
    id: number;
    title?: string;
    timer?: string;
    createdAt: string;
  };
  originalStatus: AttendanceIncidentStatus;
  effectiveStatus: AttendanceIncidentStatus;
  calculatedAmount: number;
  adjustedAmount: number;
  adjustment?: AttendancePenaltyAdjustment | null;
};

export type AttendanceFineReportRow = {
  user: AttendanceReconciliationSummary['user'];
  counts: AttendanceStatusCounts;
  originalCounts: AttendanceStatusCounts;
  totalRecords: number;
  calculatedAmount: number;
  itemAdjustedAmount: number;
  finalAmount: number;
  adjustedAmount: number;
  adjustedItems: number;
  hasAdjustment: boolean;
  totalAdjustment?: AttendancePenaltyAdjustment | null;
  incidents: AttendanceFineReportIncident[];
};

export type AttendanceFineReportResponse = {
  rows: AttendanceFineReportRow[];
  summary: {
    counts: AttendanceStatusCounts;
    calculatedAmount: number;
    finalAmount: number;
    adjustedAmount: number;
    adjustedUsers: number;
    totalRecords: number;
    usersCount: number;
  };
  count: number;
  usersCount: number;
  periodStart: string;
  periodEnd: string;
};

export type AttendancePenaltyAdjustmentBulkBody = {
  userId: number;
  periodStart: string;
  periodEnd: string;
  total?: {
    adjustedAmount: number;
    reason: string;
  };
  items?: {
    usersId: number;
    listId: number;
    adjustedAmount: number;
    reason: string;
  }[];
};

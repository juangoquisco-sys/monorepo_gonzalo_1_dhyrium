export type GatePassStatus =
  | 'ACTIVE'
  | 'RETURNED'
  | 'CANCELLED'
  | 'PENDING_EXIT_REVIEW'
  | 'PENDING_RETURN_REVIEW';

export type GateRuntimeStatus =
  | GatePassStatus
  | 'NEAR_DUE'
  | 'LATE'
  | 'PENDING_REVIEW';

export type GatePassSource = 'CONTROLLER' | 'SELF_SERVICE';

export type GateReviewRequestType =
  | 'EXIT_REGULARIZATION'
  | 'RETURN_REGULARIZATION'
  | 'PENALTY_REDUCTION';

export type GateReviewRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEEDS_INFO';

export type GateEvidenceType =
  | 'PHOTO'
  | 'WHATSAPP_SCREENSHOT'
  | 'LOCATION'
  | 'NOTE'
  | 'OTHER_FILE';

export interface GateCreatePassBody {
  userId: number;
  licenseId?: number | null;
  reason?: string | null;
  requestedMinutes: number;
  source?: GatePassSource;
  claimedExitAt?: string | Date | null;
  evidenceType?: GateEvidenceType;
  textNote?: string;
}

export interface GateMarkReturnBody {
  returnedAt?: string | Date | null;
}

export interface GatePassFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: GatePassStatus;
  userId?: number;
  search?: string;
}

export interface GateSubmitReviewRequestBody {
  type: GateReviewRequestType;
  claimedEventAt?: string | Date | null;
  requestedReductionMinutes?: number | null;
  reason?: string | null;
  evidenceType?: GateEvidenceType;
  textNote?: string;
}

export interface GateReviewDecisionBody {
  approvedReductionMinutes?: number | null;
  reviewNotes?: string | null;
}

export interface GateDirectPenaltyAdjustmentBody {
  reductionMinutes: number;
  reason: string;
}

export type GateFineReportSortAmount = 'normal' | 'asc' | 'desc';

export interface GateFineReportFilters {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortAmount?: GateFineReportSortAmount;
}

export interface GateFineAdjustmentBody {
  userId: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  adjustedAmount: number;
  reason: string;
}

export interface GateFineAdjustmentVoidBody {
  adjustmentId?: string;
  userId?: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  reason?: string;
}

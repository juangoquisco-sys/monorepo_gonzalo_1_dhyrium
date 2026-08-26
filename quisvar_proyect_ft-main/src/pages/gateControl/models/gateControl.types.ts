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

export interface GateUser {
  id: number;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    dni: string;
    phone?: string | null;
  } | null;
}

export interface GateEvidence {
  id: string;
  gatePassId: string;
  reviewRequestId: string | null;
  submittedById: number;
  submittedBy?: GateUser;
  type: GateEvidenceType;
  filePath: string | null;
  originalName: string | null;
  mimeType: string | null;
  textNote: string | null;
  createdAt: string;
}

export interface GateReviewRequest {
  id: string;
  gatePassId: string;
  gatePass?: GatePass;
  type: GateReviewRequestType;
  requestedById: number;
  requestedBy?: GateUser;
  status: GateReviewRequestStatus;
  claimedEventAt: string | null;
  requestedReductionMinutes: number | null;
  approvedReductionMinutes: number | null;
  reason: string | null;
  reviewNotes: string | null;
  reviewedById: number | null;
  reviewedBy?: GateUser | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  evidences: GateEvidence[];
}

export interface GatePass {
  id: string;
  userId: number;
  user: GateUser;
  licenseId: number | null;
  reason: string | null;
  requestedMinutes: number;
  status: GatePassStatus;
  runtimeStatus: GateRuntimeStatus;
  source: 'CONTROLLER' | 'SELF_SERVICE';
  actualExitAt: string | null;
  dueAt: string | null;
  actualReturnAt: string | null;
  originalPenaltyMinutes: number;
  finalPenaltyMinutes: number;
  createdAt: string;
  updatedAt: string;
  reviewRequests: GateReviewRequest[];
  evidences: GateEvidence[];
}

export interface GateSummary {
  todayPasses: number;
  outside: number;
  pendingReviews: number;
  lateReturns: number;
  totalPenaltyMinutes: number;
}

export interface GateRankingRow {
  userId: number;
  user: GateUser | null;
  passesCount: number;
  originalPenaltyMinutes: number;
  finalPenaltyMinutes: number;
  reducedPenaltyMinutes: number;
  forgiven: boolean;
}

export type GateFineResult =
  | 'PUNTUAL'
  | 'TARDE'
  | 'SIMPLE'
  | 'GRAVE'
  | 'MUY_GRAVE';
export type GateFineSortAmount = 'normal' | 'asc' | 'desc';

export interface GateFineDetail {
  passId: string;
  exitAt: string | null;
  dueAt: string | null;
  returnAt: string | null;
  reason: string | null;
  penaltyMinutes: number;
  result: GateFineResult;
  amount: number;
}

export interface GateFineAdjustment {
  id: string;
  originalAmount: number;
  adjustedAmount: number;
  reason: string;
  adjustedBy?: GateUser | null;
  createdAt: string;
}

export interface GateFineReportRow {
  userId: number;
  user: GateUser | null;
  counts: Record<GateFineResult, number>;
  calculatedAmount: number;
  adjustedAmount: number;
  adjustedDifference: number;
  hasAdjustment: boolean;
  adjustment: GateFineAdjustment | null;
  details: GateFineDetail[];
}

export interface GateFineReport {
  periodStart: string | null;
  periodEnd: string | null;
  totalRecords: number;
  usersCount: number;
  summary: Record<GateFineResult, number> & {
    calculatedAmount: number;
    adjustedAmount: number;
  };
  rows: GateFineReportRow[];
}

export interface GateCreatePassPayload {
  userId: number;
  reason?: string;
  requestedMinutes: number;
}

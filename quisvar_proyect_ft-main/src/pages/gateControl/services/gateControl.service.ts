import { axiosInstance } from '@/services/axiosInstance';
import type {
  GateCreatePassPayload,
  GateFineReport,
  GateFineSortAmount,
  GatePass,
  GatePassStatus,
  GateRankingRow,
  GateReviewRequest,
  GateReviewRequestStatus,
  GateReviewRequestType,
  GateSummary,
  GateUser,
} from '../models/gateControl.types';

const noLoaderHeaders = { headers: { noLoader: true } };

export const searchGateUsers = async (query: string) => {
  const res = await axiosInstance.get<GateUser[]>(
    '/gate-control/users/search',
    {
      params: { query },
      ...noLoaderHeaders,
    }
  );
  return res.data;
};

export const createGatePass = async (payload: GateCreatePassPayload) => {
  const res = await axiosInstance.post<GatePass>('/gate-control/passes', {
    ...payload,
    source: 'CONTROLLER',
  });
  return res.data;
};

export const createSelfServiceGatePass = async (payload: {
  userId: number;
  reason: string;
  requestedMinutes: number;
  claimedExitAt: string;
  textNote?: string;
  evidenceType?: string;
  files?: File[];
}) => {
  const formData = new FormData();
  Object.entries({
    userId: payload.userId,
    reason: payload.reason,
    requestedMinutes: payload.requestedMinutes,
    claimedExitAt: payload.claimedExitAt,
    source: 'SELF_SERVICE',
    textNote: payload.textNote || '',
    evidenceType: payload.evidenceType || 'WHATSAPP_SCREENSHOT',
  }).forEach(([key, value]) => formData.append(key, String(value)));
  payload.files?.forEach(file => formData.append('evidence', file));

  const res = await axiosInstance.post<GatePass>(
    '/gate-control/passes',
    formData
  );
  return res.data;
};

export const getActiveGatePasses = async () => {
  const res = await axiosInstance.get<GatePass[]>(
    '/gate-control/passes/active',
    noLoaderHeaders
  );
  return res.data;
};

export const getPendingGateLicenses = async () => {
  const res = await axiosInstance.get<GatePass[]>(
    '/gate-control/licenses/pending',
    noLoaderHeaders
  );
  return res.data;
};

export const getAuthorizedGateLicenses = async () => {
  const res = await axiosInstance.get<GatePass[]>(
    '/gate-control/licenses/authorized',
    noLoaderHeaders
  );
  return res.data;
};

export const approvePendingGateLicense = async (licenseId: number) => {
  const res = await axiosInstance.patch(
    `/gate-control/licenses/${licenseId}/approve`,
    {}
  );
  return res.data;
};

export const getMyActiveGatePasses = async () => {
  const res = await axiosInstance.get<GatePass[]>(
    '/gate-control/passes/my-active',
    noLoaderHeaders
  );
  return res.data;
};

export const getMyGatePassHistory = async () => {
  const res = await axiosInstance.get<GatePass[]>(
    '/gate-control/passes/my-history',
    noLoaderHeaders
  );
  return res.data;
};

export const markGatePassReturn = async (passId: string) => {
  const res = await axiosInstance.patch<GatePass>(
    `/gate-control/passes/${passId}/return`,
    {}
  );
  return res.data;
};

export const getGatePassHistory = async (filters: {
  dateFrom?: string;
  dateTo?: string;
  status?: GatePassStatus | '';
  search?: string;
}) => {
  const res = await axiosInstance.get<GatePass[]>(
    '/gate-control/passes/history',
    {
      params: filters,
      ...noLoaderHeaders,
    }
  );
  return res.data;
};

export const getGateSummary = async () => {
  const res = await axiosInstance.get<GateSummary>(
    '/gate-control/summary',
    noLoaderHeaders
  );
  return res.data;
};

export const getGateTardinessRanking = async () => {
  const res = await axiosInstance.get<GateRankingRow[]>(
    '/gate-control/tardiness-ranking',
    noLoaderHeaders
  );
  return res.data;
};

export const getGateFineReport = async (filters: {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortAmount?: GateFineSortAmount;
}) => {
  const res = await axiosInstance.get<GateFineReport>(
    '/gate-control/report/fines',
    {
      params: filters,
      ...noLoaderHeaders,
    }
  );
  return res.data;
};

export const upsertGateFineAdjustment = async (payload: {
  userId: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  adjustedAmount: number;
  reason: string;
}) => {
  const res = await axiosInstance.post(
    '/gate-control/report/fines/adjustments',
    payload
  );
  return res.data;
};

export const voidGateFineAdjustment = async (payload: {
  adjustmentId?: string;
  userId?: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  reason?: string;
}) => {
  const res = await axiosInstance.patch(
    '/gate-control/report/fines/adjustments/void',
    payload
  );
  return res.data;
};

export const submitGateReviewRequest = async (
  passId: string,
  payload: {
    type: GateReviewRequestType;
    claimedEventAt?: string;
    requestedReductionMinutes?: number;
    reason?: string;
    textNote?: string;
    evidenceType?: string;
    files?: File[];
  }
) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'files' || value === undefined || value === null) return;
    formData.append(key, String(value));
  });
  payload.files?.forEach(file => formData.append('evidence', file));

  const res = await axiosInstance.post<GateReviewRequest>(
    `/gate-control/passes/${passId}/review-requests`,
    formData
  );
  return res.data;
};

export const getGateReviewRequests = async (
  status: GateReviewRequestStatus | '' = 'PENDING'
) => {
  const res = await axiosInstance.get<GateReviewRequest[]>(
    '/gate-control/review-requests',
    {
      params: status ? { status } : {},
      ...noLoaderHeaders,
    }
  );
  return res.data;
};

export const getGatePenaltyAdjustmentCandidates = async (search = '') => {
  const res = await axiosInstance.get<GatePass[]>(
    '/gate-control/penalty-adjustment-candidates',
    {
      params: search ? { search } : {},
      ...noLoaderHeaders,
    }
  );
  return res.data;
};

export const approveGateReviewRequest = async (
  requestId: string,
  payload: { approvedReductionMinutes?: number; reviewNotes?: string }
) => {
  const res = await axiosInstance.patch<GateReviewRequest>(
    `/gate-control/review-requests/${requestId}/approve`,
    payload
  );
  return res.data;
};

export const rejectGateReviewRequest = async (
  requestId: string,
  payload: { reviewNotes?: string }
) => {
  const res = await axiosInstance.patch<GateReviewRequest>(
    `/gate-control/review-requests/${requestId}/reject`,
    payload
  );
  return res.data;
};

export const approvePendingGatePassReviews = async (
  passId: string,
  payload: { reviewNotes?: string } = {}
) => {
  const res = await axiosInstance.patch<GatePass>(
    `/gate-control/passes/${passId}/review-requests/approve-pending`,
    payload
  );
  return res.data;
};

export const rejectPendingGatePassReviews = async (
  passId: string,
  payload: { reviewNotes?: string } = {}
) => {
  const res = await axiosInstance.patch<GatePass>(
    `/gate-control/passes/${passId}/review-requests/reject-pending`,
    payload
  );
  return res.data;
};

export const directGatePenaltyAdjustment = async (
  passId: string,
  payload: { reductionMinutes: number; reason: string }
) => {
  const res = await axiosInstance.patch<GateReviewRequest>(
    `/gate-control/passes/${passId}/penalty-adjustment`,
    payload
  );
  return res.data;
};

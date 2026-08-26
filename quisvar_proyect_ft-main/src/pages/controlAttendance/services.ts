import { axiosInstance } from '@/services/axiosInstance';
import type {
  AttendanceIncident,
  AttendanceIncidentStatus,
  AttendanceControlUserLookup,
  AttendanceFineReportResponse,
  AttendancePenaltyAdjustmentBulkBody,
  AttendanceReconciliation,
  AttendanceReconciliationCandidate,
  AttendanceReconciliationCreateBody,
  AttendanceReconciliationSummary,
} from './types';
import { UserType } from '@/types/userType';

type AttendanceControlUserLookupResponse = {
  id: number;
  name?: string;
  label?: string;
  email: string;
  status: boolean;
  userType?: UserType;
  dni?: string | null;
  phone?: string | null;
};

const mapAttendanceControlUser = (
  user: AttendanceControlUserLookupResponse
): AttendanceControlUserLookup => ({
  id: user.id,
  email: user.email,
  status: user.status,
  userType: user.userType,
  profile: {
    firstName: user.name || user.label || user.email,
    lastName: '',
    dni: user.dni ?? '',
    phone: user.phone ?? '',
  },
});

export const attendanceControlService = {
  async getUsers() {
    const { data } = await axiosInstance.get<
      AttendanceControlUserLookupResponse[]
    >('/users/options/attendance-control', {
      headers: { noLoader: true },
    });

    return data
      .filter(user => user.userType !== UserType.REMOTO)
      .map(mapAttendanceControlUser);
  },

  async getIncidents(params: {
    userId?: number;
    dateFrom: string;
    dateTo: string;
    statuses?: AttendanceIncidentStatus[];
  }) {
    const { data } = await axiosInstance.get<AttendanceIncident[]>(
      '/attendance-control/incidents',
      { params }
    );
    return data;
  },

  async getReconciliationCandidates(params: {
    userId: number;
    dateFrom: string;
    dateTo: string;
  }) {
    const { data } = await axiosInstance.get<
      AttendanceReconciliationCandidate[]
    >('/attendance-control/reconciliation-candidates', { params });
    return data;
  },

  async getReconciliationSummary(params: { dateFrom: string; dateTo: string }) {
    const { data } = await axiosInstance.get<AttendanceReconciliationSummary[]>(
      '/attendance-control/reconciliation-summary',
      { params }
    );
    return data;
  },

  async getFineReport(params: {
    dateFrom: string;
    dateTo: string;
    userId?: number;
    search?: string;
    sortAmount?: 'normal' | 'asc' | 'desc';
  }) {
    const { data } = await axiosInstance.get<AttendanceFineReportResponse>(
      '/attendance-control/report/fines',
      { params }
    );
    return data;
  },

  async upsertPenaltyAdjustments(body: AttendancePenaltyAdjustmentBulkBody) {
    const { data } = await axiosInstance.post(
      '/attendance-control/report/fines/adjustments',
      body
    );
    return data;
  },

  async voidPenaltyAdjustments(body: {
    userId: number;
    periodStart: string;
    periodEnd: string;
    scope?: 'ATTENDANCE_RECORD' | 'USER_PERIOD';
    items?: { usersId: number; listId: number }[];
    reason?: string;
  }) {
    const { data } = await axiosInstance.patch(
      '/attendance-control/report/fines/adjustments/void',
      body
    );
    return data;
  },

  async createReconciliation(body: AttendanceReconciliationCreateBody) {
    const { data } = await axiosInstance.post<AttendanceReconciliation>(
      '/attendance-control/reconciliations',
      body
    );
    return data;
  },

  async getReconciliations(params: {
    userId?: number;
    dateFrom?: string;
    dateTo?: string;
    status?: 'ACTIVE' | 'VOIDED';
  }) {
    const { data } = await axiosInstance.get<AttendanceReconciliation[]>(
      '/attendance-control/reconciliations',
      { params }
    );
    return data;
  },

  async voidReconciliation(id: string, reason: string) {
    const { data } = await axiosInstance.patch<AttendanceReconciliation>(
      `/attendance-control/reconciliations/${id}/void`,
      { reason }
    );
    return data;
  },
};

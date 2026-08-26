import { axiosInstance } from '@/services/axiosInstance';
import type {
  AuditLogDetail,
  AuditLogFilters,
  AuditLogsResponse,
  AuditSummary,
} from '../models/auditLogs.types';

const noLoaderHeaders = { headers: { noLoader: true } };

const cleanParams = (filters: AuditLogFilters) =>
  Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(',') : value,
      ])
      .filter(([, value]) => {
        if (value === undefined || value === null || value === '') return false;
        return value !== 'all';
      })
  );

export const getAuditLogs = async (filters: AuditLogFilters) => {
  const res = await axiosInstance.get<AuditLogsResponse>('/audit-logs', {
    params: cleanParams(filters),
    ...noLoaderHeaders,
  });
  return res.data;
};

export const getAuditLogById = async (id: number) => {
  const res = await axiosInstance.get<AuditLogDetail>(`/audit-logs/${id}`, {
    ...noLoaderHeaders,
  });
  return res.data;
};

export const getAuditSummary = async (filters: AuditLogFilters) => {
  const res = await axiosInstance.get<AuditSummary>(
    '/audit-logs/stats/summary',
    {
      params: cleanParams(filters),
      ...noLoaderHeaders,
    }
  );
  return res.data;
};

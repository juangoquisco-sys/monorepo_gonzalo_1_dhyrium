import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { AuditLogFilters } from '../models/auditLogs.types';
import {
  getAuditLogById,
  getAuditLogs,
  getAuditSummary,
} from '../services/auditLogs.service';

export const auditLogsKeys = {
  all: ['audit-logs'] as const,
  list: (filters: AuditLogFilters) =>
    [...auditLogsKeys.all, 'list', filters] as const,
  summary: (filters: AuditLogFilters) =>
    [...auditLogsKeys.all, 'summary', filters] as const,
  detail: (id: number | null) => [...auditLogsKeys.all, 'detail', id] as const,
};

export const useAuditLogs = (filters: AuditLogFilters) =>
  useQuery({
    queryKey: auditLogsKeys.list(filters),
    queryFn: () => getAuditLogs(filters),
    placeholderData: keepPreviousData,
  });

export const useAuditSummary = (filters: AuditLogFilters) =>
  useQuery({
    queryKey: auditLogsKeys.summary(filters),
    queryFn: () => getAuditSummary(filters),
    placeholderData: keepPreviousData,
  });

export const useAuditLogDetail = (id: number | null) =>
  useQuery({
    queryKey: auditLogsKeys.detail(id),
    queryFn: () => getAuditLogById(id as number),
    enabled: Boolean(id),
  });

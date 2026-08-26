import type { User } from '@/types/types';

export type AuditMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS'
  | 'HEAD';

export type AuditSeverity =
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
  | 'CRITICAL';

export type AuditStatusGroup = '2xx' | '3xx' | '4xx' | '5xx';

export type AuditCursorDirection = 'next' | 'prev';

export type AuditSortBy =
  | 'createdAt'
  | 'statusCode'
  | 'responseTime'
  | 'severity';

export type AuditSortDir = 'asc' | 'desc';

export type AuditTimeUnit = 'ms' | 's' | 'min';

export type AuditTableColumnId =
  | 'select'
  | 'createdAt'
  | 'user'
  | 'module'
  | 'method'
  | 'path'
  | 'statusCode'
  | 'responseTime'
  | 'ipAddress'
  | 'severity'
  | 'actions';

export interface AuditUser {
  id: number;
  email: string;
  profile: Pick<User['profile'], 'firstName' | 'lastName'> | null;
}

export interface AuditLogItem {
  id: number;
  userId: number | null;
  action: string;
  method: AuditMethod | string;
  path: string;
  module: string;
  severity: AuditSeverity | string;
  statusCode: number;
  responseTime: number;
  ipAddress: string | null;
  userAgent: string | null;
  referrer: string;
  createdAt: string;
  user: AuditUser | null;
}

export interface AuditLogDetail extends AuditLogItem {
  requestBody: unknown;
  queryParams: unknown;
  errorResponse: unknown;
}

export interface AuditLogsMeta {
  limit: number;
  snapshotAt: string;
  nextCursor: AuditLogCursor | null;
  prevCursor: AuditLogCursor | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface AuditLogsResponse {
  data: AuditLogItem[];
  meta: AuditLogsMeta;
}

export interface AuditLogFilters {
  limit: number;
  search?: string;
  userId?: number[];
  method?: AuditMethod[];
  module?: string[];
  severity?: AuditSeverity[];
  statusCode?: number;
  statusGroup?: AuditStatusGroup[];
  from?: string;
  to?: string;
  snapshotAt?: string;
  cursorCreatedAt?: string;
  cursorId?: number;
  cursorSortValue?: string;
  direction?: AuditCursorDirection;
  sortBy?: AuditSortBy;
  sortDir?: AuditSortDir;
}

export interface AuditLogCursor {
  cursorCreatedAt: string;
  cursorId: number;
  cursorSortValue?: string;
}

export interface AuditSummary {
  totalLogs: number;
  totalErrors: number;
  activeUsers: number;
  averageResponseTime: number;
  logsByDay: {
    date: string;
    total: number;
    errors: number;
  }[];
  topUsers: {
    userId: number | null;
    user: AuditUser | null;
    count: number;
    averageResponseTime: number;
  }[];
  topModules: {
    module: string;
    count: number;
    averageResponseTime: number;
  }[];
  topEndpoints: {
    method: string;
    path: string;
    count: number;
    averageResponseTime: number;
  }[];
  statusDistribution: {
    statusCode: number;
    count: number;
  }[];
  recentCriticalActions: AuditLogItem[];
}

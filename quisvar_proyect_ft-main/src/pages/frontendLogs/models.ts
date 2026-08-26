import type { AuditUser } from '../auditLogs/models/auditLogs.types';

export type FrontendLogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type FrontendLogStatusGroup = '2xx' | '3xx' | '4xx' | '5xx';
export type FrontendLogType =
  | 'REACT_RENDER_ERROR'
  | 'WINDOW_ERROR'
  | 'UNHANDLED_REJECTION'
  | 'RESOURCE_ERROR'
  | 'API_ERROR'
  | 'FRONTEND_ROUTE_404'
  | 'FRONTEND_ROUTE_FORBIDDEN'
  | 'CUSTOM';

export interface FrontendLogEvent {
  id: number;
  userId: number | null;
  level: FrontendLogLevel | string;
  type: FrontendLogType | string;
  message: string;
  route: string;
  apiMethod: string;
  apiUrl: string;
  statusCode: number | null;
  sessionId: string;
  release: string;
  environment: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: AuditUser | null;
}

export interface FrontendLogEventDetail extends FrontendLogEvent {
  stack: string | null;
  componentStack: string | null;
  previousRoute: string;
  source: string;
  line: number | null;
  column: number | null;
  requestId: string;
  breadcrumbs: unknown;
  context: unknown;
}

export interface FrontendLogCursor {
  cursorId: number;
  cursorCreatedAt?: string;
}

export interface FrontendLogsMeta {
  limit: number;
  snapshotAt: string;
  nextCursor: FrontendLogCursor | null;
  prevCursor: FrontendLogCursor | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface FrontendLogEventsResponse {
  data: FrontendLogEvent[];
  meta: FrontendLogsMeta;
}

export interface FrontendLogFilters {
  limit: number;
  search?: string;
  userId?: number[];
  level?: FrontendLogLevel[];
  type?: FrontendLogType[];
  route?: string;
  environment?: string;
  release?: string;
  statusCode?: number;
  statusGroup?: FrontendLogStatusGroup[];
  from?: string;
  to?: string;
  snapshotAt?: string;
  cursorCreatedAt?: string;
  cursorId?: number;
  direction?: 'next' | 'prev';
}

export interface FrontendLogSummary {
  totalEvents: number;
  criticalEvents: number;
  eventsLast24h: number;
  eventsByType: {
    type: string;
    count: number;
  }[];
  eventsByLevel: {
    level: string;
    count: number;
  }[];
  topRoutes: {
    route: string;
    count: number;
  }[];
  recentCriticalEvents: FrontendLogEvent[];
}

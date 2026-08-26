import { createUuid } from '@/utils/createUuid';
import { API_BASE_URL } from '@/config/runtimeUrls';

type LogLevel = 'info' | 'warning' | 'error' | 'critical';

export type LogType =
  | 'REACT_RENDER_ERROR'
  | 'WINDOW_ERROR'
  | 'UNHANDLED_REJECTION'
  | 'RESOURCE_ERROR'
  | 'API_ERROR'
  | 'FRONTEND_ROUTE_404'
  | 'FRONTEND_ROUTE_FORBIDDEN'
  | 'CUSTOM';

export type Breadcrumb = {
  type: string;
  message: string;
  route?: string;
  createdAt: string;
  data?: Record<string, unknown>;
};

type FrontendLogPayload = {
  level: LogLevel;
  type: LogType;
  message: string;
  stack?: string;
  componentStack?: string;
  route?: string;
  previousRoute?: string;
  source?: string;
  line?: number;
  column?: number;
  apiMethod?: string;
  apiUrl?: string;
  statusCode?: number;
  requestId?: string;
  sessionId: string;
  release?: string;
  environment: string;
  breadcrumbs?: Breadcrumb[];
  context?: Record<string, unknown>;
};

type EnqueuedFrontendLog = Omit<
  FrontendLogPayload,
  'sessionId' | 'environment' | 'release' | 'breadcrumbs'
>;

const MAX_BREADCRUMBS = 30;
const MAX_QUEUE_SIZE = 20;
const FLUSH_DELAY_MS = 3000;
const SESSION_ID_KEY = 'frontend_session_id';
const LOG_ENDPOINT = `${API_BASE_URL}/system/frontend-logs/batch`;

let breadcrumbs: Breadcrumb[] = [];
let queue: FrontendLogPayload[] = [];
let flushTimer: number | null = null;
let lastRoute = '';

const getSessionId = () => {
  const current = localStorage.getItem(SESSION_ID_KEY);
  if (current) return current;
  const next = createUuid();
  localStorage.setItem(SESSION_ID_KEY, next);
  return next;
};

const sessionId = getSessionId();

const getCurrentRoute = () => {
  const hashRoute = window.location.hash.replace(/^#/, '');
  return hashRoute || window.location.pathname + window.location.search;
};

const getEnvironment = () => import.meta.env.MODE || 'production';

const getRelease = () =>
  import.meta.env.VITE_APP_VERSION ||
  import.meta.env.VITE_APP_COMMIT_SHA ||
  'unknown';

const forbiddenKeys = new Set([
  'password',
  'oldpassword',
  'newpassword',
  'verifypassword',
  'token',
  'authorization',
  'accesstoken',
  'refreshtoken',
  'secret',
  'cookie',
  'file',
  'files',
  'base64',
  'buffer',
]);

const sanitizeContext = (
  value: Record<string, unknown> = {}
): Record<string, unknown> => {
  try {
    return JSON.parse(
      JSON.stringify(value, (key, val) => {
        if (forbiddenKeys.has(key.toLowerCase())) return '[REDACTED]';
        if (typeof val === 'string' && val.length > 1000) {
          return val.slice(0, 1000);
        }
        return val;
      })
    );
  } catch {
    return { unserializable: true };
  }
};

const normalizeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      message: error.message || 'Unknown frontend error',
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  try {
    return {
      message: 'Unknown frontend error',
      stack: JSON.stringify(error),
    };
  } catch {
    return { message: 'Unknown frontend error' };
  }
};

const normalizeLevel = (level: LogLevel) => level;

const scheduleFlush = () => {
  if (flushTimer) return;
  flushTimer = window.setTimeout(() => {
    void flush();
  }, FLUSH_DELAY_MS);
};

const enqueue = (log: EnqueuedFrontendLog) => {
  const route = log.route || getCurrentRoute();
  const payload: FrontendLogPayload = {
    ...log,
    level: normalizeLevel(log.level),
    route,
    previousRoute: log.previousRoute || lastRoute,
    sessionId,
    environment: getEnvironment(),
    release: getRelease(),
    breadcrumbs: [...breadcrumbs],
    context: sanitizeContext(log.context),
  };

  queue.push(payload);

  if (queue.length >= MAX_QUEUE_SIZE) {
    void flush();
    return;
  }

  scheduleFlush();
};

export const addBreadcrumb = (breadcrumb: Omit<Breadcrumb, 'createdAt'>) => {
  breadcrumbs.push({
    ...breadcrumb,
    data: sanitizeContext(breadcrumb.data),
    createdAt: new Date().toISOString(),
  });

  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs = breadcrumbs.slice(-MAX_BREADCRUMBS);
  }
};

export const trackRouteChange = (route: string) => {
  if (route === lastRoute) return;
  addBreadcrumb({
    type: 'navigation',
    message: `Navego a ${route}`,
    route,
    data: lastRoute ? { previousRoute: lastRoute } : undefined,
  });
  lastRoute = route;
};

export const captureException = (params: {
  error: unknown;
  type: LogType;
  level?: LogLevel;
  context?: Record<string, unknown>;
  componentStack?: string;
  source?: string;
  line?: number;
  column?: number;
}) => {
  const normalized = normalizeError(params.error);

  enqueue({
    level: params.level || 'error',
    type: params.type,
    message: normalized.message,
    stack: normalized.stack,
    componentStack: params.componentStack,
    source: params.source,
    line: params.line,
    column: params.column,
    context: params.context,
  });
};

export const captureMessage = (params: {
  message: string;
  type: LogType;
  level?: LogLevel;
  context?: Record<string, unknown>;
  source?: string;
  apiMethod?: string;
  apiUrl?: string;
  statusCode?: number;
  requestId?: string;
}) => {
  enqueue({
    level: params.level || 'info',
    type: params.type,
    message: params.message,
    source: params.source,
    apiMethod: params.apiMethod,
    apiUrl: params.apiUrl,
    statusCode: params.statusCode,
    requestId: params.requestId,
    context: params.context,
  });
};

export const flush = async () => {
  if (queue.length === 0) return;

  const logsToSend = [...queue];
  queue = [];

  if (flushTimer) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }

  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    await fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ logs: logsToSend }),
      keepalive: true,
    });
  } catch {
    // Logging must never break the application or create recursive reports.
  }
};

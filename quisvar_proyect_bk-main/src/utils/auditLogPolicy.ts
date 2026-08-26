const AUDIT_LOGS_PATTERN = /\/audit-logs(\/|$)/i;
const FRONTEND_LOG_BATCH_ROUTE = {
  method: 'POST',
  path: '/system/frontend-logs/batch',
};

const ANONYMOUS_AUTH_AUDIT_ROUTES = [
  { method: 'POST', path: '/auth/login' },
  { method: 'POST', path: '/auth/forgot-password' },
  { method: 'POST', path: '/auth/new-password' },
];

const AUTH_FULL_DNI_AUDIT_ROUTES = [
  { method: 'POST', path: '/auth/login' },
  { method: 'POST', path: '/auth/forgot-password' },
];

const normalizePath = (path: string) => {
  const normalized = (path.split('?')[0] || '/').toLowerCase();
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
};

export const shouldSkipAuditLog = (method: string, path: string) => {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = normalizePath(path);
  if (
    normalizedMethod === FRONTEND_LOG_BATCH_ROUTE.method &&
    normalizedPath === FRONTEND_LOG_BATCH_ROUTE.path
  ) {
    return true;
  }

  return (
    ['GET', 'HEAD', 'OPTIONS'].includes(normalizedMethod) &&
    AUDIT_LOGS_PATTERN.test(normalizedPath)
  );
};

export const canAuditWithoutUser = (method: string, path: string) => {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = normalizePath(path);
  return ANONYMOUS_AUTH_AUDIT_ROUTES.some(
    route => route.method === normalizedMethod && route.path === normalizedPath
  );
};

export const canStoreFullDniInAuditRequest = (method: string, path: string) => {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = normalizePath(path);
  return AUTH_FULL_DNI_AUDIT_ROUTES.some(
    route => route.method === normalizedMethod && route.path === normalizedPath
  );
};

export const resolveAuditUserId = (
  sessionUserId: number | undefined,
  auditUserId: unknown
) => {
  if (sessionUserId) return sessionUserId;
  if (typeof auditUserId === 'number' && Number.isInteger(auditUserId)) {
    return auditUserId;
  }
  return null;
};

export const shouldPersistAuditLog = (
  method: string,
  path: string,
  userId: number | null
) => {
  if (shouldSkipAuditLog(method, path)) return false;
  return Boolean(userId) || canAuditWithoutUser(method, path);
};

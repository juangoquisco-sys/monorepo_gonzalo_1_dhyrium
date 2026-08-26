import type { AuditLogDetail, AuditLogItem } from '../models/auditLogs.types';

const REDACTED_AUDIT_VALUE = '[REDACTED]';

const fullName = (log: AuditLogItem) => {
  if (!log.user) return null;
  const firstName = log.user.profile?.firstName || '';
  const lastName = log.user.profile?.lastName || '';
  return `${firstName} ${lastName}`.trim() || log.user.email;
};

const maskDni = (value: unknown) => {
  const dni = String(value ?? '');
  if (!dni) return '';
  if (dni.length <= 2) return '*'.repeat(dni.length);
  return `${'*'.repeat(dni.length - 2)}${dni.slice(-2)}`;
};

const sanitizeDniForCopy = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizeDniForCopy);
  if (!value || typeof value !== 'object') return value;

  return Object.entries(value as Record<string, unknown>).reduce<
    Record<string, unknown>
  >((sanitized, [key, item]) => {
    if (key.toLowerCase() === 'dni') {
      sanitized[key] = REDACTED_AUDIT_VALUE;
      sanitized.dniMasked = maskDni(item);
      return sanitized;
    }

    sanitized[key] = sanitizeDniForCopy(item);
    return sanitized;
  }, {});
};

const buildAuditLogPayload = (log: AuditLogItem | AuditLogDetail) => ({
  id: log.id,
  createdAt: log.createdAt,
  severity: log.severity,
  statusCode: log.statusCode,
  responseTimeMs: log.responseTime,
  method: log.method,
  path: log.path,
  module: log.module,
  action: log.action,
  user: log.user
    ? {
        id: log.user.id,
        name: fullName(log),
        email: log.user.email,
      }
    : null,
  client: {
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    referrer: log.referrer,
  },
  ...('requestBody' in log
    ? {
        requestBody: sanitizeDniForCopy(log.requestBody),
        queryParams: sanitizeDniForCopy(log.queryParams),
        errorResponse: sanitizeDniForCopy(log.errorResponse),
      }
    : {}),
});

export const formatAuditLogForCodex = (log: AuditLogItem | AuditLogDetail) =>
  `## Audit log\n\n\`\`\`json\n${JSON.stringify(
    buildAuditLogPayload(log),
    null,
    2
  )}\n\`\`\``;

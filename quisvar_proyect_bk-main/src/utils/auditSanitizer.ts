export const REDACTED_AUDIT_VALUE = '[REDACTED]';
export const CIRCULAR_AUDIT_VALUE = '[Circular]';
export const MAX_AUDIT_STRING_LENGTH = 1000;

type AuditJsonValue =
  | string
  | number
  | boolean
  | null
  | AuditJsonValue[]
  | { [key: string]: AuditJsonValue };

const OMIT_VALUE = Symbol('omit-audit-value');
type SanitizedAuditValue = AuditJsonValue | typeof OMIT_VALUE;

export interface AuditSanitizeOptions {
  allowSensitiveKeys?: string[];
}

const SENSITIVE_KEYS = new Set([
  'password',
  'oldpassword',
  'newpassword',
  'verifypassword',
  'code',
  'dni',
  'reset',
  'resettoken',
  'token',
  'accesstoken',
  'refreshtoken',
  'jwt',
  'authorization',
  'cookie',
  'secret',
  'file',
  'files',
  'document',
  'documents',
  'cv',
  'declaration',
  'withdrawaldeclaration',
  'contract',
  'voucher',
  'rxh',
  'invoice',
  'buffer',
  'base64',
]);

const normalizeKey = (key: string) => key.toLowerCase();

const isSensitiveKey = (key: string, allowedSensitiveKeys: Set<string>) => {
  const normalizedKey = normalizeKey(key);
  return (
    SENSITIVE_KEYS.has(normalizedKey) &&
    !allowedSensitiveKeys.has(normalizedKey)
  );
};

const isBinaryPayload = (value: unknown) =>
  Buffer.isBuffer(value) ||
  value instanceof ArrayBuffer ||
  ArrayBuffer.isView(value);

const isMulterLikeFile = (value: Record<string, unknown>) => {
  const keys = new Set(Object.keys(value));
  const hasFileIdentity =
    keys.has('originalname') || keys.has('mimetype') || keys.has('fieldname');
  const hasFileStorage =
    keys.has('filename') ||
    keys.has('destination') ||
    keys.has('path') ||
    keys.has('size') ||
    keys.has('buffer');

  return hasFileIdentity && hasFileStorage;
};

export const sanitizeAuditPayload = (
  payload: unknown,
  options: AuditSanitizeOptions = {}
): AuditJsonValue => {
  const allowedSensitiveKeys = new Set(
    options.allowSensitiveKeys?.map(normalizeKey) || []
  );
  const sanitized = sanitizeAuditValue(
    payload,
    new WeakSet<object>(),
    allowedSensitiveKeys
  );
  return sanitized === OMIT_VALUE ? null : sanitized;
};

const sanitizeAuditValue = (
  payload: unknown,
  seen: WeakSet<object>,
  allowedSensitiveKeys: Set<string>
): SanitizedAuditValue => {
  if (payload === null) return null;
  if (payload === undefined) return OMIT_VALUE;

  if (typeof payload === 'string') {
    return payload.length > MAX_AUDIT_STRING_LENGTH
      ? payload.slice(0, MAX_AUDIT_STRING_LENGTH)
      : payload;
  }

  if (typeof payload === 'number') {
    return Number.isFinite(payload) ? payload : null;
  }

  if (typeof payload === 'boolean') return payload;
  if (typeof payload === 'bigint') return payload.toString();
  if (typeof payload !== 'object') return OMIT_VALUE;

  if (payload instanceof Date) return payload.toISOString();
  if (isBinaryPayload(payload)) return REDACTED_AUDIT_VALUE;

  if (seen.has(payload)) return CIRCULAR_AUDIT_VALUE;
  seen.add(payload);

  if (Array.isArray(payload)) {
    const sanitized = payload.map(item => {
      const value = sanitizeAuditValue(item, seen, allowedSensitiveKeys);
      return value === OMIT_VALUE ? null : value;
    });
    seen.delete(payload);
    return sanitized;
  }

  const record = payload as Record<string, unknown>;
  if (isMulterLikeFile(record)) {
    seen.delete(payload);
    return REDACTED_AUDIT_VALUE;
  }

  const sanitized = Object.entries(record).reduce<Record<string, unknown>>(
    (sanitized, [key, value]) => {
      const sanitizedValue = isSensitiveKey(key, allowedSensitiveKeys)
        ? REDACTED_AUDIT_VALUE
        : sanitizeAuditValue(value, seen, allowedSensitiveKeys);
      if (sanitizedValue !== OMIT_VALUE) sanitized[key] = sanitizedValue;
      return sanitized;
    },
    {}
  ) as { [key: string]: AuditJsonValue };
  seen.delete(payload);
  return sanitized;
};

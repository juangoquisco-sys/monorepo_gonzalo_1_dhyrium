import { Prisma } from '@prisma/client';
import AppError from '@/utils/appError';
import { sanitizeAuditPayload } from '@/utils/auditSanitizer';

type AuditErrorStatus = string | number | undefined;

interface AuditErrorOptions {
  statusCode?: number;
  status?: AuditErrorStatus;
  message?: string;
  code?: string;
}

type ErrorLike = Error & {
  statusCode?: number;
  status?: AuditErrorStatus;
  code?: string;
  meta?: unknown;
  isOperational?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const resolveErrorType = (err: unknown) => {
  if (err instanceof Error) return err.constructor.name;
  if (isRecord(err) && typeof err.name === 'string') return err.name;
  return typeof err;
};

const resolveStatusCode = (err: unknown, fallback?: number) => {
  if (fallback) return fallback;
  if (isRecord(err) && typeof err.statusCode === 'number') {
    return err.statusCode;
  }
  return 500;
};

const resolveMessage = (err: unknown, fallback?: string) => {
  if (fallback) return fallback;
  if (err instanceof Error && err.message) return err.message;
  if (isRecord(err) && typeof err.message === 'string') return err.message;
  return 'fail';
};

export const buildAuditErrorResponse = (
  err: unknown,
  options: AuditErrorOptions = {}
) => {
  const errorLike = err as ErrorLike;
  const statusCode = resolveStatusCode(err, options.statusCode);
  let safeErrorCode: string | undefined = options.code;
  const payload: Record<string, unknown> = {
    statusCode,
    status: options.status ?? errorLike.status ?? statusCode,
    message: resolveMessage(err, options.message),
    type: resolveErrorType(err),
  };

  if (err instanceof AppError || typeof errorLike.isOperational === 'boolean') {
    payload.operational = Boolean(errorLike.isOperational);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    safeErrorCode = err.code;
    if (err.meta) payload.meta = err.meta;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    safeErrorCode = 'PRISMA_VALIDATION_ERROR';
  }

  const sanitized = sanitizeAuditPayload(payload);
  const response =
    sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)
      ? sanitized
      : {};
  if (safeErrorCode) response.code = safeErrorCode;
  return response;
};

export const resolveAuditErrorResponse = (
  statusCode: number,
  rawErrorResponse: unknown
) => {
  const errorResponse = sanitizeAuditPayload(
    statusCode >= 400 ? rawErrorResponse : undefined
  );
  return errorResponse === null ? {} : errorResponse;
};

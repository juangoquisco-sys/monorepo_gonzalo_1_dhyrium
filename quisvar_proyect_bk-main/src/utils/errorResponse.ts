import { Prisma } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ZodError } from 'zod';
import AppError from '@/utils/appError';

export interface PublicErrorResponse {
  status: string;
  message: string;
  code: string;
  debug?: Record<string, unknown>;
}

export interface NormalizedErrorResponse {
  statusCode: number;
  status: string;
  message: string;
  code: string;
  auditMessage: string;
  publicResponse: PublicErrorResponse;
}

type ErrorLike = Error & {
  status?: string;
  statusCode?: number;
  code?: string;
  meta?: unknown;
};

const GENERIC_ERROR_MESSAGE =
  'Ocurrió un error inesperado. Intente nuevamente o contacte soporte.';

const PRISMA_REQUEST_ERROR_MESSAGE = 'No se pudo completar la operación.';
const PRISMA_VALIDATION_ERROR_MESSAGE =
  'No se pudo completar la operación por datos inválidos.';
const PRISMA_CONNECTION_ERROR_MESSAGE =
  'Base de datos no disponible. Verifique la conexión e intente nuevamente.';
const ZOD_VALIDATION_ERROR_MESSAGE = 'Los datos enviados no son válidos.';

const isProduction = () => process.env.NODE_ENV === 'production';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const resolveStatus = (statusCode: number) =>
  `${statusCode}`.startsWith('4') ? 'error' : 'fallo';

const getErrorMessage = (err: unknown) => {
  if (err instanceof Error && err.message) return err.message;
  if (isRecord(err) && typeof err.message === 'string') return err.message;
  return GENERIC_ERROR_MESSAGE;
};

const getErrorName = (err: unknown) => {
  if (err instanceof Error) return err.name;
  if (isRecord(err) && typeof err.name === 'string') return err.name;
  return typeof err;
};

const buildDebugPayload = (err: unknown) => {
  if (isProduction()) return undefined;

  const errorLike = err as ErrorLike;
  const debug: Record<string, unknown> = {
    name: getErrorName(err),
    message: getErrorMessage(err),
  };

  if (err instanceof Error && err.stack) debug.stack = err.stack;
  if (typeof errorLike.code === 'string') debug.code = errorLike.code;
  if (errorLike.meta) debug.meta = errorLike.meta;

  return debug;
};

const normalizePrismaKnownRequestError = (
  err: Prisma.PrismaClientKnownRequestError
) => {
  const auditMessage = err.message;
  let statusCode = 400;
  let code = 'PRISMA_REQUEST_ERROR';
  let message = PRISMA_REQUEST_ERROR_MESSAGE;

  if (err.code === 'P2002') {
    statusCode = 409;
    code = 'PRISMA_UNIQUE_CONSTRAINT';
    message = 'Ya existe un registro con esos datos.';
  }

  if (err.code === 'P2003') {
    statusCode = 409;
    code = 'PRISMA_FOREIGN_KEY_CONSTRAINT';
    message =
      'No se puede completar la operación porque hay datos relacionados.';
  }

  if (err.code === 'P2014') {
    statusCode = 409;
    code = 'PRISMA_RELATION_CONSTRAINT';
    message = 'No se puede completar la operación por una relación inválida.';
  }

  if (err.code === 'P2025') {
    statusCode = 404;
    code = 'PRISMA_RECORD_NOT_FOUND';
    message = 'El registro solicitado no existe o ya fue eliminado.';
  }

  return {
    statusCode,
    status: resolveStatus(statusCode),
    message,
    code,
    auditMessage,
  };
};

const normalizePrismaValidationError = (
  err: Prisma.PrismaClientValidationError
) => {
  const statusCode = 400;
  return {
    statusCode,
    status: resolveStatus(statusCode),
    message: PRISMA_VALIDATION_ERROR_MESSAGE,
    code: 'PRISMA_VALIDATION_ERROR',
    auditMessage: err.message,
  };
};

const normalizePrismaInitializationError = (
  err: Prisma.PrismaClientInitializationError
) => {
  const statusCode = 503;
  const message = PRISMA_CONNECTION_ERROR_MESSAGE;

  return {
    statusCode,
    status: resolveStatus(statusCode),
    message,
    code: 'PRISMA_DATABASE_UNAVAILABLE',
    auditMessage: err.message,
  };
};

const normalizeJwtError = (err: JsonWebTokenError | TokenExpiredError) => {
  const statusCode = 401;
  const isExpired = err instanceof TokenExpiredError;
  return {
    statusCode,
    status: resolveStatus(statusCode),
    message: isExpired
      ? 'Su sesión expiró. Inicie sesión nuevamente.'
      : 'Token de autenticación inválido.',
    code: isExpired ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID',
    auditMessage: err.message,
  };
};

const normalizeZodError = (err: ZodError) => {
  const statusCode = 400;
  const auditMessage = err.issues
    .map(issue => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
    .join('; ');

  return {
    statusCode,
    status: resolveStatus(statusCode),
    message: ZOD_VALIDATION_ERROR_MESSAGE,
    code: 'VALIDATION_ERROR',
    auditMessage,
  };
};

const normalizeAppError = (err: AppError) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational === true;
  const message =
    isOperational || !isProduction() ? err.message : GENERIC_ERROR_MESSAGE;

  return {
    statusCode,
    status: err.status || resolveStatus(statusCode),
    message,
    code: err.code || (statusCode === 404 ? 'NOT_FOUND' : 'APP_ERROR'),
    auditMessage: err.message,
  };
};

const normalizeUnknownError = (err: unknown) => {
  const errorLike = err as ErrorLike;
  const statusCode = errorLike.statusCode || 500;
  const internalMessage = getErrorMessage(err);
  const message = isProduction() ? GENERIC_ERROR_MESSAGE : internalMessage;

  return {
    statusCode,
    status: errorLike.status || resolveStatus(statusCode),
    message,
    code: statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
    auditMessage: internalMessage,
  };
};

export const normalizeErrorResponse = (
  err: unknown
): NormalizedErrorResponse => {
  const normalized =
    err instanceof Prisma.PrismaClientKnownRequestError
      ? normalizePrismaKnownRequestError(err)
      : err instanceof Prisma.PrismaClientValidationError
      ? normalizePrismaValidationError(err)
      : err instanceof Prisma.PrismaClientInitializationError
      ? normalizePrismaInitializationError(err)
      : err instanceof JsonWebTokenError || err instanceof TokenExpiredError
      ? normalizeJwtError(err)
      : err instanceof ZodError
      ? normalizeZodError(err)
      : err instanceof AppError
      ? normalizeAppError(err)
      : normalizeUnknownError(err);

  const publicResponse: PublicErrorResponse = {
    status: normalized.status,
    message: normalized.message,
    code: normalized.code,
  };
  const debug = buildDebugPayload(err);
  if (debug) publicResponse.debug = debug;

  return {
    ...normalized,
    publicResponse,
  };
};

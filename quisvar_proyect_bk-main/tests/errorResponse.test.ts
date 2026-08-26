import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { z } from 'zod';
import AppError from '@/utils/appError';
import { normalizeErrorResponse } from '@/utils/errorResponse';

const originalNodeEnv = process.env.NODE_ENV;

test.afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

test.describe('Public error response normalization', () => {
  test('keeps operational AppError messages visible in production', () => {
    process.env.NODE_ENV = 'production';

    const response = normalizeErrorResponse(
      new AppError('Credenciales incorrectas.', 401)
    );

    assert.equal(response.statusCode, 401);
    assert.equal(response.code, 'APP_ERROR');
    assert.equal(response.publicResponse.message, 'Credenciales incorrectas.');
    assert.equal('debug' in response.publicResponse, false);
  });

  test('hides unknown error details in production', () => {
    process.env.NODE_ENV = 'production';

    const response = normalizeErrorResponse(
      new Error('Database connection failed with internal details')
    );

    assert.equal(response.statusCode, 500);
    assert.equal(response.code, 'INTERNAL_SERVER_ERROR');
    assert.equal(
      response.publicResponse.message,
      'Ocurrió un error inesperado. Intente nuevamente o contacte soporte.'
    );
    assert.equal(
      response.auditMessage,
      'Database connection failed with internal details'
    );
    assert.equal('debug' in response.publicResponse, false);
  });

  test('includes controlled debug details outside production', () => {
    process.env.NODE_ENV = 'development';

    const response = normalizeErrorResponse(new Error('Visible dev failure'));

    assert.equal(response.statusCode, 500);
    assert.equal(response.publicResponse.message, 'Visible dev failure');
    assert.equal(response.publicResponse.debug?.name, 'Error');
    assert.equal(response.publicResponse.debug?.message, 'Visible dev failure');
    assert.equal(typeof response.publicResponse.debug?.stack, 'string');
  });

  test('maps Prisma unique constraint errors to a public code and safe message', () => {
    process.env.NODE_ENV = 'production';

    const response = normalizeErrorResponse(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: {
          target: ['email'],
        },
      })
    );

    assert.equal(response.statusCode, 409);
    assert.equal(response.code, 'PRISMA_UNIQUE_CONSTRAINT');
    assert.equal(
      response.publicResponse.message,
      'Ya existe un registro con esos datos.'
    );
    assert.equal(response.auditMessage, 'Unique constraint failed');
    assert.equal('debug' in response.publicResponse, false);
  });

  test('maps Prisma validation errors without exposing the validation text in production', () => {
    process.env.NODE_ENV = 'production';

    const response = normalizeErrorResponse(
      new Prisma.PrismaClientValidationError('Invalid Prisma query details', {
        clientVersion: 'test',
      })
    );

    assert.equal(response.statusCode, 400);
    assert.equal(response.code, 'PRISMA_VALIDATION_ERROR');
    assert.equal(
      response.publicResponse.message,
      'No se pudo completar la operación por datos inválidos.'
    );
    assert.equal(response.auditMessage, 'Invalid Prisma query details');
  });

  test('maps JWT errors to auth codes', () => {
    process.env.NODE_ENV = 'production';

    const invalidToken = normalizeErrorResponse(
      new JsonWebTokenError('jwt malformed')
    );
    const expiredToken = normalizeErrorResponse(
      new TokenExpiredError('jwt expired', new Date())
    );

    assert.equal(invalidToken.statusCode, 401);
    assert.equal(invalidToken.code, 'AUTH_TOKEN_INVALID');
    assert.equal(expiredToken.statusCode, 401);
    assert.equal(expiredToken.code, 'AUTH_TOKEN_EXPIRED');
  });

  test('maps Zod validation errors to a safe production response', () => {
    process.env.NODE_ENV = 'production';
    const schema = z.object({
      body: z.object({ name: z.string().min(1) }).strict(),
    });
    const parsed = schema.safeParse({ body: { name: '' } });

    assert.equal(parsed.success, false);
    if (parsed.success) return;

    const response = normalizeErrorResponse(parsed.error);

    assert.equal(response.statusCode, 400);
    assert.equal(response.code, 'VALIDATION_ERROR');
    assert.equal(response.publicResponse.status, 'error');
    assert.equal(
      response.publicResponse.message,
      'Los datos enviados no son válidos.'
    );
    assert.match(response.auditMessage, /body\.name/);
    assert.equal('debug' in response.publicResponse, false);
  });

  test('keeps Zod diagnostics in debug only outside production', () => {
    process.env.NODE_ENV = 'development';
    const parsed = z.coerce.number().int().positive().safeParse('invalid');

    assert.equal(parsed.success, false);
    if (parsed.success) return;

    const response = normalizeErrorResponse(parsed.error);

    assert.equal(response.statusCode, 400);
    assert.equal(response.code, 'VALIDATION_ERROR');
    assert.equal(
      response.publicResponse.message,
      'Los datos enviados no son válidos.'
    );
    assert.equal(response.publicResponse.debug?.name, 'ZodError');
    assert.equal(typeof response.publicResponse.debug?.message, 'string');
  });
});

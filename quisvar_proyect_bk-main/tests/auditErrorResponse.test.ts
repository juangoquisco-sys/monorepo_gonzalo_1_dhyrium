import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma } from '@prisma/client';
import {
  buildAuditErrorResponse,
  resolveAuditErrorResponse,
} from '@/utils/auditErrorResponse';
import AppError from '@/utils/appError';
import { REDACTED_AUDIT_VALUE } from '@/utils/auditSanitizer';

test.describe('Audit error response', () => {
  test('builds a safe AppError summary without stack details', () => {
    const response = buildAuditErrorResponse(
      new AppError('Credenciales incorrectas.', 401)
    ) as Record<string, unknown>;

    assert.equal(response.statusCode, 401);
    assert.equal(response.status, 'error');
    assert.equal(response.message, 'Credenciales incorrectas.');
    assert.equal(response.type, 'AppError');
    assert.equal(response.operational, true);
    assert.equal('stack' in response, false);
  });

  test('includes Prisma code and sanitized meta for known request errors', () => {
    const response = buildAuditErrorResponse(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: {
          target: ['email'],
          token: 'secret-token',
        },
      }),
      {
        statusCode: 409,
        status: 409,
        message: 'Error en la columna email',
      }
    ) as { code?: unknown; meta?: Record<string, unknown> } & Record<
      string,
      unknown
    >;

    assert.equal(response.statusCode, 409);
    assert.equal(response.status, 409);
    assert.equal(response.message, 'Error en la columna email');
    assert.equal(response.type, 'PrismaClientKnownRequestError');
    assert.equal(response.code, 'P2002');
    assert.deepEqual(response.meta?.target, ['email']);
    assert.equal(response.meta?.token, REDACTED_AUDIT_VALUE);
    assert.equal('stack' in response, false);
  });

  test('resolves audit error response only for error status codes', () => {
    const errorResponse = { message: 'Error visible' };

    assert.deepEqual(resolveAuditErrorResponse(200, errorResponse), {});
    assert.deepEqual(resolveAuditErrorResponse(399, errorResponse), {});
    assert.deepEqual(resolveAuditErrorResponse(400, errorResponse), {
      message: 'Error visible',
    });
    assert.deepEqual(resolveAuditErrorResponse(500, undefined), {});
  });
});

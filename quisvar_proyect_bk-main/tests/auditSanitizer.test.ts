import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_AUDIT_STRING_LENGTH,
  REDACTED_AUDIT_VALUE,
  sanitizeAuditPayload,
} from '@/utils/auditSanitizer';

test.describe('sanitizeAuditPayload', () => {
  test('redacts sensitive top-level fields without changing safe fields', () => {
    const payload = {
      name: 'Solicitud de pago',
      status: 'PENDING',
      projectId: 42,
      amount: 1200,
      dni: '12345678',
      password: '123456',
      oldPassword: 'old-secret',
      newPassword: 'new-secret',
      reset: 'reset-header',
      resetToken: 'reset-token',
      token: 'jwt-token',
      cv: 'cv.pdf',
      declaration: 'declaration.pdf',
      file: 'base64-file',
    };

    const sanitized = sanitizeAuditPayload(payload) as Record<string, unknown>;

    assert.equal(sanitized.name, payload.name);
    assert.equal(sanitized.status, payload.status);
    assert.equal(sanitized.projectId, payload.projectId);
    assert.equal(sanitized.amount, payload.amount);
    assert.equal(sanitized.dni, REDACTED_AUDIT_VALUE);
    assert.equal(sanitized.password, REDACTED_AUDIT_VALUE);
    assert.equal(sanitized.oldPassword, REDACTED_AUDIT_VALUE);
    assert.equal(sanitized.newPassword, REDACTED_AUDIT_VALUE);
    assert.equal(sanitized.reset, REDACTED_AUDIT_VALUE);
    assert.equal(sanitized.resetToken, REDACTED_AUDIT_VALUE);
    assert.equal(sanitized.token, REDACTED_AUDIT_VALUE);
    assert.equal(sanitized.cv, REDACTED_AUDIT_VALUE);
    assert.equal(sanitized.declaration, REDACTED_AUDIT_VALUE);
    assert.equal(sanitized.file, REDACTED_AUDIT_VALUE);
  });

  test('redacts nested sensitive fields in objects and arrays', () => {
    const payload = {
      user: {
        email: 'user@example.com',
        verifyPassword: 'secret',
      },
      history: [
        { action: 'login', authorization: 'Bearer token' },
        { action: 'upload', files: ['a.pdf', 'b.pdf'] },
      ],
      payment: {
        invoice: 'invoice.pdf',
        voucher: 'voucher.pdf',
        rxh: 'receipt.pdf',
      },
    };

    const sanitized = sanitizeAuditPayload(payload) as {
      user: Record<string, unknown>;
      history: Record<string, unknown>[];
      payment: Record<string, unknown>;
    };

    assert.equal(sanitized.user.email, payload.user.email);
    assert.equal(sanitized.user.verifyPassword, REDACTED_AUDIT_VALUE);
    assert.equal(sanitized.history[0].action, 'login');
    assert.equal(sanitized.history[0].authorization, REDACTED_AUDIT_VALUE);
    assert.equal(sanitized.history[1].files, REDACTED_AUDIT_VALUE);
    assert.equal(sanitized.payment.invoice, REDACTED_AUDIT_VALUE);
    assert.equal(sanitized.payment.voucher, REDACTED_AUDIT_VALUE);
    assert.equal(sanitized.payment.rxh, REDACTED_AUDIT_VALUE);
  });

  test('does not mutate the original payload', () => {
    const payload = {
      name: 'Usuario',
      password: 'plain-secret',
      nested: { token: 'jwt-token' },
    };
    const original = JSON.stringify(payload);

    sanitizeAuditPayload(payload);

    assert.equal(JSON.stringify(payload), original);
    assert.equal(payload.password, 'plain-secret');
    assert.equal(payload.nested.token, 'jwt-token');
  });

  test('allows selected sensitive fields only when explicitly configured', () => {
    const payload = {
      dni: '12345678',
      password: 'plain-secret',
    };

    const sanitized = sanitizeAuditPayload(payload, {
      allowSensitiveKeys: ['dni'],
    }) as Record<string, unknown>;

    assert.equal(sanitized.dni, payload.dni);
    assert.equal(sanitized.password, REDACTED_AUDIT_VALUE);
  });

  test('normalizes allowed sensitive field names', () => {
    const payload = {
      dni: '12345678',
    };

    const sanitized = sanitizeAuditPayload(payload, {
      allowSensitiveKeys: ['DNI'],
    }) as Record<string, unknown>;

    assert.equal(sanitized.dni, payload.dni);
  });

  test('redacts file-like and binary values', () => {
    const payload = {
      attachment: {
        fieldname: 'file',
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
        size: 1234,
        buffer: Buffer.from('document-content'),
      },
      raw: Buffer.from('raw-file-content'),
    };

    const sanitized = sanitizeAuditPayload(payload) as Record<string, unknown>;

    assert.equal(sanitized.attachment, REDACTED_AUDIT_VALUE);
    assert.equal(sanitized.raw, REDACTED_AUDIT_VALUE);
  });

  test('truncates long strings and handles circular references', () => {
    const payload: Record<string, unknown> = {
      description: 'a'.repeat(MAX_AUDIT_STRING_LENGTH + 50),
    };
    payload.self = payload;

    const sanitized = sanitizeAuditPayload(payload) as Record<string, string>;

    assert.equal(sanitized.description.length, MAX_AUDIT_STRING_LENGTH);
    assert.equal(sanitized.self, '[Circular]');
  });

  test('returns JSON-compatible values for Prisma Json fields', () => {
    const payload = {
      keep: 'ok',
      missing: undefined,
      callback: () => 'ignored',
      marker: Symbol('ignored'),
      values: [
        undefined,
        () => 'ignored',
        Symbol('ignored'),
        NaN,
        Infinity,
        10n,
      ],
    };

    const sanitized = sanitizeAuditPayload(payload) as {
      keep: string;
      missing?: unknown;
      callback?: unknown;
      marker?: unknown;
      values: unknown[];
    };

    assert.equal(sanitized.keep, 'ok');
    assert.equal('missing' in sanitized, false);
    assert.equal('callback' in sanitized, false);
    assert.equal('marker' in sanitized, false);
    assert.deepEqual(sanitized.values, [null, null, null, null, null, '10']);
    assert.doesNotThrow(() => JSON.stringify(sanitized));
  });
});

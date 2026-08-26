import assert from 'node:assert/strict';
import test from 'node:test';
import { loginRequestSchema } from '@/services/auth.schema';

test.describe('loginRequestSchema', () => {
  test('accepts the documented DNI and password contract', () => {
    const result = loginRequestSchema.safeParse({
      body: {
        dni: '73520253',
        password: 'test-password',
      },
    });

    assert.equal(result.success, true);
  });

  test('rejects the legacy mobile username field', () => {
    const result = loginRequestSchema.safeParse({
      body: {
        username: '73520253',
        password: 'test-password',
      },
    });

    assert.equal(result.success, false);
  });

  test('rejects a missing or malformed DNI', () => {
    const missingDni = loginRequestSchema.safeParse({
      body: {
        password: 'test-password',
      },
    });
    const malformedDni = loginRequestSchema.safeParse({
      body: {
        dni: '7352025',
        password: 'test-password',
      },
    });

    assert.equal(missingDni.success, false);
    assert.equal(malformedDni.success, false);
  });

  test('rejects an empty password', () => {
    const result = loginRequestSchema.safeParse({
      body: {
        dni: '73520253',
        password: '',
      },
    });

    assert.equal(result.success, false);
  });
});

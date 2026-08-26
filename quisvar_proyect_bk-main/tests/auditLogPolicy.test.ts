import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canAuditWithoutUser,
  canStoreFullDniInAuditRequest,
  resolveAuditUserId,
  shouldPersistAuditLog,
  shouldSkipAuditLog,
} from '@/utils/auditLogPolicy';

test.describe('Audit log policy', () => {
  test('allows anonymous auditing only for public auth security routes', () => {
    assert.equal(canAuditWithoutUser('POST', '/auth/login'), true);
    assert.equal(canAuditWithoutUser('POST', '/auth/forgot-password'), true);
    assert.equal(canAuditWithoutUser('POST', '/auth/new-password'), true);

    assert.equal(canAuditWithoutUser('GET', '/auth/login'), false);
    assert.equal(canAuditWithoutUser('POST', '/auth/recovery'), false);
    assert.equal(
      canAuditWithoutUser('POST', '/kitchen/order-meal/user/295'),
      false
    );
  });

  test('keeps audit panel reads out of audit logs', () => {
    assert.equal(shouldSkipAuditLog('GET', '/audit-logs'), true);
    assert.equal(shouldSkipAuditLog('HEAD', '/audit-logs/stats/summary'), true);
    assert.equal(shouldSkipAuditLog('OPTIONS', '/audit-logs/1'), true);
    assert.equal(shouldSkipAuditLog('POST', '/audit-logs'), false);
    assert.equal(
      shouldSkipAuditLog('POST', '/system/frontend-logs/batch'),
      true
    );
    assert.equal(shouldSkipAuditLog('GET', '/users'), false);
  });

  test('resolves session user before controller-provided audit user', () => {
    assert.equal(resolveAuditUserId(10, 20), 10);
    assert.equal(resolveAuditUserId(undefined, 20), 20);
    assert.equal(resolveAuditUserId(undefined, null), null);
    assert.equal(resolveAuditUserId(undefined, '20'), null);
  });

  test('persists authenticated logs and selected anonymous auth logs', () => {
    assert.equal(shouldPersistAuditLog('POST', '/projects', 10), true);
    assert.equal(shouldPersistAuditLog('POST', '/auth/login', null), true);
    assert.equal(
      shouldPersistAuditLog('POST', '/auth/forgot-password', null),
      true
    );
    assert.equal(
      shouldPersistAuditLog('POST', '/auth/new-password', null),
      true
    );

    assert.equal(shouldPersistAuditLog('POST', '/projects', null), false);
    assert.equal(
      shouldPersistAuditLog('GET', '/audit-logs/stats/summary', 10),
      false
    );
    assert.equal(
      shouldPersistAuditLog('POST', '/system/frontend-logs/batch', 10),
      false
    );
  });

  test('allows full DNI only in selected public auth request logs', () => {
    assert.equal(canStoreFullDniInAuditRequest('POST', '/auth/login'), true);
    assert.equal(
      canStoreFullDniInAuditRequest('POST', '/auth/forgot-password'),
      true
    );

    assert.equal(
      canStoreFullDniInAuditRequest('POST', '/auth/new-password'),
      false
    );
    assert.equal(canStoreFullDniInAuditRequest('GET', '/auth/login'), false);
    assert.equal(canStoreFullDniInAuditRequest('POST', '/users'), false);
  });
});

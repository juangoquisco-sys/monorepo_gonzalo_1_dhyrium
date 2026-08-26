import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAuditSeverity,
  matchesSensitiveBasePath,
} from '@/utils/auditSeverity';

test.describe('Audit logger severity', () => {
  test('matches only sensitive base paths', () => {
    assert.equal(matchesSensitiveBasePath('/users/295'), true);
    assert.equal(matchesSensitiveBasePath('/profile'), true);
    assert.equal(matchesSensitiveBasePath('/auth/change-password'), true);
    assert.equal(
      matchesSensitiveBasePath('/kitchen/order-meal/user/295'),
      false
    );
    assert.equal(matchesSensitiveBasePath('/reports/user/295'), false);
  });

  test('marks sensitive mutations as critical', () => {
    assert.equal(getAuditSeverity('POST', '/users/295', 200), 'CRITICAL');
    assert.equal(getAuditSeverity('PATCH', '/profile', 200), 'CRITICAL');
  });

  test('does not mark internal user segments as critical', () => {
    assert.equal(
      getAuditSeverity('POST', '/kitchen/order-meal/user/295', 200),
      'SUCCESS'
    );
    assert.equal(getAuditSeverity('POST', '/reports/user/295', 200), 'SUCCESS');
  });

  test('keeps delete requests as critical', () => {
    assert.equal(
      getAuditSeverity('DELETE', '/kitchen/order-meal/1', 200),
      'CRITICAL'
    );
  });

  test('classifies status based severities after critical checks', () => {
    assert.equal(getAuditSeverity('GET', '/users', 200), 'INFO');
    assert.equal(getAuditSeverity('GET', '/users', 500), 'ERROR');
    assert.equal(getAuditSeverity('POST', '/reports', 400), 'WARNING');
  });
});

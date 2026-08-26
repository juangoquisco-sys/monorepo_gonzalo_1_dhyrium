import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_AUDIT_LOG_CLEANUP_BATCH_SIZE,
  DEFAULT_AUDIT_LOG_CLEANUP_MAX_BATCHES,
  DEFAULT_AUDIT_LOG_RETENTION_DAYS,
  getAuditLogCleanupConfig,
  getAuditLogRetentionCutoff,
} from '@/services/auditLog.services';

test.describe('AuditLog retention config', () => {
  test('calculates cutoff from retention days', () => {
    const now = new Date('2026-06-17T12:00:00.000Z');
    const cutoff = getAuditLogRetentionCutoff(90, now);

    assert.equal(cutoff.toISOString(), '2026-03-19T12:00:00.000Z');
  });

  test('uses default values when env is empty', () => {
    const config = getAuditLogCleanupConfig({});

    assert.equal(config.retentionDays, DEFAULT_AUDIT_LOG_RETENTION_DAYS);
    assert.equal(config.batchSize, DEFAULT_AUDIT_LOG_CLEANUP_BATCH_SIZE);
    assert.equal(config.maxBatches, DEFAULT_AUDIT_LOG_CLEANUP_MAX_BATCHES);
  });

  test('parses positive integer env overrides', () => {
    const config = getAuditLogCleanupConfig({
      AUDIT_LOG_RETENTION_DAYS: '120',
      AUDIT_LOG_CLEANUP_BATCH_SIZE: '1000',
      AUDIT_LOG_CLEANUP_MAX_BATCHES: '50',
    });

    assert.equal(config.retentionDays, 120);
    assert.equal(config.batchSize, 1000);
    assert.equal(config.maxBatches, 50);
  });

  test('falls back to defaults for invalid env values', () => {
    const config = getAuditLogCleanupConfig({
      AUDIT_LOG_RETENTION_DAYS: '0',
      AUDIT_LOG_CLEANUP_BATCH_SIZE: '-1',
      AUDIT_LOG_CLEANUP_MAX_BATCHES: '1.5',
    });

    assert.equal(config.retentionDays, DEFAULT_AUDIT_LOG_RETENTION_DAYS);
    assert.equal(config.batchSize, DEFAULT_AUDIT_LOG_CLEANUP_BATCH_SIZE);
    assert.equal(config.maxBatches, DEFAULT_AUDIT_LOG_CLEANUP_MAX_BATCHES);
  });
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveProcessStatus,
  resolveSystemHealthStatus,
  type SystemHealthChecks,
  type SystemHealthSignals,
} from '@/services/systemHealth.services';

const baseSignals: SystemHealthSignals = {
  auditLast15m: {
    totalErrors: 0,
    criticalErrors: 0,
  },
  frontendLast15m: {
    totalErrors: 0,
    criticalErrors: 0,
  },
};

const baseChecks: Pick<SystemHealthChecks, 'database' | 'socket' | 'process'> =
  {
    database: {
      status: 'UP',
      latencyMs: 20,
      message: 'ok',
    },
    socket: {
      status: 'UP',
      connectedClients: 2,
      message: 'ok',
    },
    process: {
      status: 'UP',
      memory: {
        rssMb: 128,
        heapUsedMb: 64,
      },
      pid: 100,
    },
  };

test.describe('System health status', () => {
  test('returns UP when checks and signals are healthy', () => {
    assert.equal(resolveSystemHealthStatus(baseChecks, baseSignals), 'UP');
  });

  test('returns DOWN when database is down', () => {
    assert.equal(
      resolveSystemHealthStatus(
        {
          ...baseChecks,
          database: {
            status: 'DOWN',
            latencyMs: null,
            message: 'down',
          },
        },
        baseSignals
      ),
      'DOWN'
    );
  });

  test('returns DEGRADED when database is slow', () => {
    assert.equal(
      resolveSystemHealthStatus(
        {
          ...baseChecks,
          database: {
            status: 'DEGRADED',
            latencyMs: 1500,
            message: 'slow',
          },
        },
        baseSignals
      ),
      'DEGRADED'
    );
  });

  test('returns DEGRADED when socket is degraded', () => {
    assert.equal(
      resolveSystemHealthStatus(
        {
          ...baseChecks,
          socket: {
            status: 'DEGRADED',
            connectedClients: null,
            message: 'not initialized',
          },
        },
        baseSignals
      ),
      'DEGRADED'
    );
  });

  test('returns DEGRADED when recent critical signals exist', () => {
    assert.equal(
      resolveSystemHealthStatus(baseChecks, {
        ...baseSignals,
        frontendLast15m: {
          totalErrors: 1,
          criticalErrors: 1,
        },
      }),
      'DEGRADED'
    );
  });

  test('classifies process memory as degraded over thresholds', () => {
    assert.equal(
      resolveProcessStatus({
        rssMb: 1025,
        heapUsedMb: 128,
      }),
      'DEGRADED'
    );
    assert.equal(
      resolveProcessStatus({
        rssMb: 128,
        heapUsedMb: 513,
      }),
      'DEGRADED'
    );
  });
});

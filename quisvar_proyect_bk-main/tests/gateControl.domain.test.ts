import assert from 'node:assert/strict';
import test from 'node:test';
import { GateControllerPolicy } from '@/services/gateControl/domain/gateControllerPolicy';
import {
  GateTimePolicy,
  MAX_QUICK_PASS_MINUTES,
} from '@/services/gateControl/domain/gateTimePolicy';

const userWithDni = (dni: string) =>
  ({
    profile: { dni },
  } as any);

test.describe('GateTimePolicy', () => {
  test('accepts quick pass durations from 1 to 10 minutes', () => {
    assert.doesNotThrow(() => GateTimePolicy.assertQuickDuration(1));
    assert.doesNotThrow(() =>
      GateTimePolicy.assertQuickDuration(MAX_QUICK_PASS_MINUTES)
    );
  });

  test('rejects invalid or over-limit quick pass durations', () => {
    assert.throws(() => GateTimePolicy.assertQuickDuration(0), /duracion/);
    assert.throws(() => GateTimePolicy.assertQuickDuration(1.5), /duracion/);
    assert.throws(
      () => GateTimePolicy.assertQuickDuration(MAX_QUICK_PASS_MINUTES + 1),
      /10 minutos/
    );
  });

  test('calculates due date and rounded penalty minutes', () => {
    const exitAt = new Date('2026-05-20T09:00:00.000Z');
    const dueAt = GateTimePolicy.dueAt(exitAt, 10);
    const returnedLate = new Date('2026-05-20T09:12:01.000Z');

    assert.equal(dueAt.toISOString(), '2026-05-20T09:10:00.000Z');
    assert.equal(GateTimePolicy.penaltyMinutes(returnedLate, dueAt), 3);
    assert.equal(GateTimePolicy.penaltyMinutes(dueAt, dueAt), 0);
  });

  test('maps runtime status for active, late and pending review passes', () => {
    const futureDueAt = new Date(Date.now() + 5 * 60 * 1000);
    const pastDueAt = new Date(Date.now() - 60 * 1000);

    assert.equal(
      GateTimePolicy.runtimeStatus({ status: 'ACTIVE', dueAt: futureDueAt }),
      'ACTIVE'
    );
    assert.equal(
      GateTimePolicy.runtimeStatus({ status: 'ACTIVE', dueAt: pastDueAt }),
      'LATE'
    );
    assert.equal(
      GateTimePolicy.runtimeStatus({ status: 'PENDING_EXIT_REVIEW' }),
      'PENDING_REVIEW'
    );
  });
});

test.describe('GateControllerPolicy', () => {
  test('allows only configured controller DNIs', () => {
    assert.equal(
      GateControllerPolicy.isController(userWithDni('70412578')),
      true
    );
    assert.equal(
      GateControllerPolicy.isController(userWithDni('73520253')),
      true
    );
    assert.equal(
      GateControllerPolicy.isController(userWithDni('78549254')),
      true
    );
    assert.equal(
      GateControllerPolicy.isController(userWithDni('76137511')),
      false
    );
  });

  test('throws when a non-controller tries a controller action', () => {
    assert.doesNotThrow(() =>
      GateControllerPolicy.assertController(userWithDni('70412578'))
    );
    assert.throws(
      () => GateControllerPolicy.assertController(userWithDni('76137511')),
      /Solo el controlador/
    );
  });
});

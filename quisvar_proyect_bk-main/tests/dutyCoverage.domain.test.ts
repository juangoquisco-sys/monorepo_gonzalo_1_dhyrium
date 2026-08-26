import assert from 'node:assert/strict';
import test from 'node:test';
import DutyCoveragePolicy from '@/services/rotations/dutyCoverage.policy';

test.describe('DutyCoveragePolicy', () => {
  test('uses the period persisted on the assignment', () => {
    const period = DutyCoveragePolicy.resolveAssignmentPeriod({
      periodStart: new Date('2026-06-29T00:00:00.000Z'),
      periodEnd: new Date('2026-07-04T00:00:00.000Z'),
      dueOn: new Date('2026-07-04T00:00:00.000Z'),
      slotLabel: 'Llamar lista',
    });
    assert.equal(
      period.coverageStart.toISOString(),
      '2026-06-29T00:00:00.000Z'
    );
    assert.equal(period.coverageEnd.toISOString(), '2026-07-04T00:00:00.000Z');
    assert.equal(period.dueOn.toISOString(), '2026-07-04T00:00:00.000Z');
    assert.match(period.coverageLabel, /2026-06-29 - 2026-07-04/);
  });
});

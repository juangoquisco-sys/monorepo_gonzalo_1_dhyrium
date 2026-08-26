import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { toDutyRotationDto } from '@/services/rotations/duty.dto';
import DutyReconcilerService from '@/services/rotations/dutyReconciler.service';
import { dutyRecurrenceSchema } from '@/services/rotations/duty.schema';

const validWeeklyRule = {
  frequency: 'WEEKLY',
  weekStartsOn: 'MONDAY',
  weekdays: [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ],
  slots: [{ key: 'semana-operativa', label: 'Semana operativa' }],
};

const persistedDuty = (overrides: Record<string, unknown> = {}) =>
  ({
    id: '41ec2858-57bd-41ee-9505-b23388506b1f',
    name: 'Llamar lista',
    description: null,
    capabilityKey: null,
    accessWindowDays: 14,
    frequency: 'WEEKLY',
    assignmentStrategy: 'ONE_OWNER_PER_PERIOD',
    participantSource: 'EXPLICIT',
    evidencePolicy: 'NONE',
    rosterVersion: 1,
    recurrenceRule: validWeeklyRule,
    weekStartsOn: 'MONDAY',
    validFrom: new Date('2026-08-03T00:00:00.000Z'),
    validUntil: null,
    planningStartsOn: new Date('2026-08-03T00:00:00.000Z'),
    excludedOccurrenceKeys: [],
    configurationVersion: 1,
    creationKey: null,
    lastMutationKey: null,
    isActive: true,
    lastReconciledAt: null,
    createdAt: new Date('2026-07-15T10:00:00.000Z'),
    updatedAt: new Date('2026-07-15T10:00:00.000Z'),
    participants: [
      {
        id: 'f4f7d559-bc5b-4234-9bd8-4cb4914b18de',
        dutyId: '41ec2858-57bd-41ee-9505-b23388506b1f',
        userId: 10,
        position: 0,
        createdAt: new Date('2026-07-15T10:00:00.000Z'),
        updatedAt: new Date('2026-07-15T10:00:00.000Z'),
        user: {
          id: 10,
          email: 'gerente@example.com',
          status: true,
          profile: { firstName: 'Gerente', lastName: 'A' },
          role: { id: 2, name: 'Gerencia' },
        },
      },
    ],
    _count: { assignments: 3 },
    ...overrides,
  } as never);

describe('Duty rotation persisted DTO', () => {
  test('serializes a complete weekly activity as valid', () => {
    const result = toDutyRotationDto(persistedDuty());

    assert.equal(result.configurationStatus, 'VALID');
    assert.equal(result.recurrenceRule?.frequency, 'WEEKLY');
    assert.equal(result.weekStartsOn, 'MONDAY');
    assert.equal(result.validFrom, '2026-08-03');
    assert.equal(result.participants.length, 1);
    assert.equal(result.allowedActions.edit, true);
  });

  test('returns the configured weekly start normalized in the DTO', () => {
    const result = toDutyRotationDto(
      persistedDuty({
        recurrenceRule: {
          ...validWeeklyRule,
          weekStartsOn: 'FRIDAY',
        },
        weekStartsOn: 'FRIDAY',
      })
    );

    assert.equal(result.configurationStatus, 'VALID');
    assert.equal(result.weekStartsOn, 'FRIDAY');
    assert.equal(
      result.recurrenceRule?.frequency === 'WEEKLY'
        ? result.recurrenceRule.weekStartsOn
        : null,
      'FRIDAY'
    );
  });

  test('does not expose a malformed weekly rule as valid', () => {
    const result = toDutyRotationDto(
      persistedDuty({
        recurrenceRule: {
          frequency: 'WEEKLY',
          weekStartsOn: 'MONDAY',
          weekdays: ['NOT_A_WEEKDAY'],
          slots: [{ key: 'semana-operativa', label: 'Semana operativa' }],
        },
      })
    );

    assert.equal(result.configurationStatus, 'INVALID');
    assert.equal(result.recurrenceRule, null);
    assert.equal(result.allowedActions.repair, false);
    assert.ok(
      result.configurationIssues.some(
        issue => issue.code === 'INVALID_RECURRENCE_RULE'
      )
    );
  });

  test('detects monthly rules without daysOfMonth and rules without slots', () => {
    const monthly = toDutyRotationDto(
      persistedDuty({
        frequency: 'MONTHLY',
        recurrenceRule: {
          frequency: 'MONTHLY',
          slots: [{ key: 'cierre', label: 'Cierre' }],
        },
      })
    );
    const missingSlots = toDutyRotationDto(
      persistedDuty({
        recurrenceRule: {
          frequency: 'WEEKLY',
          weekdays: ['MONDAY'],
        },
      })
    );

    assert.equal(monthly.configurationStatus, 'INVALID');
    assert.equal(missingSlots.configurationStatus, 'INVALID');
  });

  test('marks an impossible persisted distribution as invalid', () => {
    const result = toDutyRotationDto(
      persistedDuty({
        assignmentStrategy: 'DISTRIBUTE_PARTICIPANTS',
        recurrenceRule: {
          ...validWeeklyRule,
          slots: [
            {
              key: 'oficinas',
              label: 'Oficinas',
              capacity: { mode: 'FIXED', count: 1 },
              eligibleParticipantIds: [999],
            },
            {
              key: 'restante',
              label: 'Personal restante',
              capacity: { mode: 'REMAINDER' },
            },
          ],
        },
      })
    );

    assert.equal(result.configurationStatus, 'INVALID');
    assert.ok(
      result.configurationIssues.some(
        issue => issue.code === 'INVALID_ALLOCATION_RULE'
      )
    );
  });

  test('marks an activity without participants as invalid', () => {
    const result = toDutyRotationDto(persistedDuty({ participants: [] }));

    assert.equal(result.configurationStatus, 'INVALID');
    assert.ok(
      result.configurationIssues.some(issue => issue.code === 'NO_PARTICIPANTS')
    );
  });

  test('the reconciler rejects an invalid persisted configuration', () => {
    assert.throws(
      () =>
        DutyReconcilerService.planningConfiguration(
          persistedDuty({
            recurrenceRule: {
              frequency: 'WEEKLY',
              weekdays: ['MONDAY'],
              slots: [{ key: 'turno', label: 'Turno' }],
            },
          })
        ),
      /DUTY_CONFIGURATION_INVALID/
    );
  });

  test('the recurrence schema rejects unknown fields', () => {
    const result = dutyRecurrenceSchema.safeParse({
      ...validWeeklyRule,
      unsupportedField: true,
    });

    assert.equal(result.success, false);
  });
});

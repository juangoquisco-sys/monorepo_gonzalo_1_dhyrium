import assert from 'node:assert/strict';
import test from 'node:test';
import DutyPlannerPolicy from '@/services/rotations/dutyPlanner.policy';
import type { DutyPlanningConfiguration } from '@/services/rotations/dutyPlanner.policy';
import type { DutyDraft } from '@/services/rotations/duty.schema';

const weeklyConfiguration = (
  overrides: Partial<DutyPlanningConfiguration> = {}
): DutyPlanningConfiguration => ({
  validFrom: '2026-08-03',
  validUntil: null,
  assignmentStrategy: 'ONE_OWNER_PER_PERIOD',
  recurrence: {
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
    slots: [{ key: 'attendance', label: 'Llamar lista' }],
  },
  ...overrides,
});

test.describe('DutyPlannerPolicy', () => {
  const weeklyDraft = (validFrom: string): DutyDraft => ({
    name: 'Llamar lista',
    description: null,
    capabilityKey: null,
    accessWindowDays: 14,
    assignmentStrategy: 'ONE_OWNER_PER_PERIOD',
    participantSource: 'EXPLICIT',
    evidencePolicy: 'NONE',
    validFrom,
    validUntil: null,
    recurrence: {
      frequency: 'WEEKLY',
      weekdays: [
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
        'SUNDAY',
      ],
      slots: [{ key: 'attendance', label: 'Llamar lista' }],
    },
    participantIds: [10],
    excludedOccurrenceKeys: [],
  });

  test('derives the persisted weekly start from validFrom', () => {
    const monday = DutyPlannerPolicy.fromDraft(weeklyDraft('2026-08-03'));
    const friday = DutyPlannerPolicy.fromDraft(weeklyDraft('2026-07-17'));
    const wednesday = DutyPlannerPolicy.fromDraft(weeklyDraft('2025-10-15'));

    assert.equal(
      monday.recurrence.frequency === 'WEEKLY'
        ? monday.recurrence.weekStartsOn
        : null,
      'MONDAY'
    );
    assert.equal(
      friday.recurrence.frequency === 'WEEKLY'
        ? friday.recurrence.weekStartsOn
        : null,
      'FRIDAY'
    );
    assert.equal(
      wednesday.recurrence.frequency === 'WEEKLY'
        ? wednesday.recurrence.weekStartsOn
        : null,
      'WEDNESDAY'
    );
  });

  test('normalizes one owner per period to one internal period slot', () => {
    const configuration = DutyPlannerPolicy.fromDraft(
      weeklyDraft('2026-08-03')
    );

    assert.deepEqual(configuration.recurrence.slots, [
      { key: 'period', label: 'Periodo completo' },
    ]);
  });

  test('uses validFrom as the first weekly occurrence key for new drafts', () => {
    const configuration = DutyPlannerPolicy.fromDraft(
      weeklyDraft('2026-07-17')
    );
    const occurrences = DutyPlannerPolicy.plan(
      configuration,
      '2026-07-17',
      '2026-08-06'
    );

    assert.deepEqual(
      occurrences.map(item => item.occurrenceKey),
      ['2026-07-17', '2026-07-24', '2026-07-31']
    );
  });

  test('plans a single exact occurrence', () => {
    const occurrences = DutyPlannerPolicy.plan(
      {
        validFrom: '2026-08-05',
        validUntil: '2026-08-05',
        assignmentStrategy: 'ONE_OWNER_PER_SLOT',
        recurrence: {
          frequency: 'ONCE',
          date: '2026-08-05',
          slots: [{ key: 'only', label: 'Unico' }],
        },
      },
      '2026-08-01',
      '2026-09-01'
    );
    assert.equal(occurrences.length, 1);
    assert.equal(occurrences[0].occurrenceKey, '2026-08-05');
  });

  test('plans daily occurrences only on active weekdays', () => {
    const occurrences = DutyPlannerPolicy.plan(
      {
        validFrom: '2026-08-03',
        assignmentStrategy: 'ONE_OWNER_PER_SLOT',
        recurrence: {
          frequency: 'DAILY',
          weekdays: ['MONDAY', 'WEDNESDAY'],
          slots: [{ key: 'daily', label: 'Diario' }],
        },
      },
      '2026-08-03',
      '2026-08-09'
    );
    assert.deepEqual(
      occurrences.map(item => item.occurrenceKey),
      ['2026-08-03', '2026-08-05']
    );
  });

  test('creates one Monday-to-Saturday assignment per week', () => {
    const occurrences = DutyPlannerPolicy.plan(
      weeklyConfiguration(),
      '2026-08-03',
      '2026-08-23'
    );
    assert.deepEqual(
      occurrences.map(item => [item.periodStart, item.periodEnd, item.dueOn]),
      [
        ['2026-08-03', '2026-08-08', '2026-08-08'],
        ['2026-08-10', '2026-08-15', '2026-08-15'],
        ['2026-08-17', '2026-08-22', '2026-08-22'],
      ]
    );
    assert.ok(occurrences.every(item => item.slots.length === 1));
  });

  test('plans Friday-to-Thursday cycles from the configured start day', () => {
    const occurrences = DutyPlannerPolicy.plan(
      weeklyConfiguration({
        validFrom: '2026-07-17',
        recurrence: {
          frequency: 'WEEKLY',
          weekStartsOn: 'FRIDAY',
          weekdays: [
            'FRIDAY',
            'SATURDAY',
            'SUNDAY',
            'MONDAY',
            'TUESDAY',
            'WEDNESDAY',
            'THURSDAY',
          ],
          slots: [{ key: 'attendance', label: 'Llamar lista' }],
        },
      }),
      '2026-07-17',
      '2026-08-06'
    );

    assert.deepEqual(
      occurrences.map(item => [
        item.occurrenceKey,
        item.periodStart,
        item.periodEnd,
        item.dueOn,
      ]),
      [
        ['2026-07-17', '2026-07-17', '2026-07-23', '2026-07-23'],
        ['2026-07-24', '2026-07-24', '2026-07-30', '2026-07-30'],
        ['2026-07-31', '2026-07-31', '2026-08-06', '2026-08-06'],
      ]
    );
    assert.ok(occurrences.every(item => item.slots.length === 1));
  });

  test('plans Wednesday-to-Tuesday cycles across Sunday', () => {
    const occurrences = DutyPlannerPolicy.plan(
      weeklyConfiguration({
        validFrom: '2025-10-15',
        recurrence: {
          frequency: 'WEEKLY',
          weekStartsOn: 'WEDNESDAY',
          weekdays: [
            'WEDNESDAY',
            'THURSDAY',
            'FRIDAY',
            'SATURDAY',
            'SUNDAY',
            'MONDAY',
            'TUESDAY',
          ],
          slots: [{ key: 'attendance', label: 'Llamar lista' }],
        },
      }),
      '2025-10-15',
      '2025-10-28'
    );

    assert.deepEqual(
      occurrences.map(item => [item.periodStart, item.periodEnd]),
      [
        ['2025-10-15', '2025-10-21'],
        ['2025-10-22', '2025-10-28'],
      ]
    );
  });

  test('keeps a week crossing month boundaries as one occurrence', () => {
    const occurrences = DutyPlannerPolicy.plan(
      weeklyConfiguration({ validFrom: '2026-06-29' }),
      '2026-06-29',
      '2026-07-05'
    );
    assert.deepEqual(occurrences[0], {
      occurrenceKey: '2026-06-29',
      periodStart: '2026-06-29',
      periodEnd: '2026-07-04',
      dueOn: '2026-07-04',
      slots: [
        {
          slotKey: 'period',
          slotLabel: 'Llamar lista',
          slotInstructions: null,
        },
      ],
    });
  });

  test('keeps a week crossing year boundaries as one occurrence', () => {
    const occurrences = DutyPlannerPolicy.plan(
      weeklyConfiguration({
        validFrom: '2021-12-31',
        recurrence: {
          frequency: 'WEEKLY',
          weekStartsOn: 'FRIDAY',
          weekdays: [
            'FRIDAY',
            'SATURDAY',
            'SUNDAY',
            'MONDAY',
            'TUESDAY',
            'WEDNESDAY',
            'THURSDAY',
          ],
          slots: [{ key: 'attendance', label: 'Llamar lista' }],
        },
      }),
      '2021-12-31',
      '2022-01-06'
    );
    assert.equal(occurrences[0].occurrenceKey, '2021-12-31');
    assert.equal(occurrences[0].periodEnd, '2022-01-06');
  });

  test('keeps a persisted mismatched weekly anchor readable', () => {
    const occurrences = DutyPlannerPolicy.plan(
      weeklyConfiguration({
        validFrom: '2026-08-05',
        validUntil: '2026-08-20',
      }),
      '2026-08-01',
      '2026-08-31'
    );
    assert.deepEqual(
      occurrences.map(item => item.occurrenceKey),
      ['2026-08-10']
    );
  });

  test('keeps the stored anchor for a persisted rule until it is edited', () => {
    const fridayToThursday = weeklyConfiguration({
      validFrom: '2026-07-21',
      recurrence: {
        frequency: 'WEEKLY',
        weekStartsOn: 'FRIDAY',
        weekdays: [
          'FRIDAY',
          'SATURDAY',
          'SUNDAY',
          'MONDAY',
          'TUESDAY',
          'WEDNESDAY',
          'THURSDAY',
        ],
        slots: [{ key: 'attendance', label: 'Llamar lista' }],
      },
    });
    const occurrences = DutyPlannerPolicy.plan(
      fridayToThursday,
      '2026-07-21',
      '2026-08-06'
    );

    assert.equal(occurrences[0].occurrenceKey, '2026-07-24');
    assert.equal(occurrences[0].periodStart, '2026-07-24');
  });

  test('does not include a cycle started before validity when selected days begin later', () => {
    const occurrences = DutyPlannerPolicy.plan(
      weeklyConfiguration({
        validFrom: '2026-07-21',
        recurrence: {
          frequency: 'WEEKLY',
          weekStartsOn: 'FRIDAY',
          weekdays: ['TUESDAY', 'THURSDAY'],
          slots: [{ key: 'attendance', label: 'Llamar lista' }],
        },
      }),
      '2026-07-21',
      '2026-08-06'
    );

    assert.deepEqual(occurrences[0], {
      occurrenceKey: '2026-07-24',
      periodStart: '2026-07-28',
      periodEnd: '2026-07-30',
      dueOn: '2026-07-30',
      slots: [
        {
          slotKey: 'period',
          slotLabel: 'Llamar lista',
          slotInstructions: null,
        },
      ],
    });
  });

  test('omits a configured cycle cut by the end of validity', () => {
    const occurrences = DutyPlannerPolicy.plan(
      weeklyConfiguration({
        validFrom: '2026-07-17',
        validUntil: '2026-07-29',
        recurrence: {
          frequency: 'WEEKLY',
          weekStartsOn: 'FRIDAY',
          weekdays: [
            'FRIDAY',
            'SATURDAY',
            'SUNDAY',
            'MONDAY',
            'TUESDAY',
            'WEDNESDAY',
            'THURSDAY',
          ],
          slots: [{ key: 'attendance', label: 'Llamar lista' }],
        },
      }),
      '2026-07-17',
      '2026-08-06'
    );

    assert.deepEqual(
      occurrences.map(item => item.occurrenceKey),
      ['2026-07-17']
    );
  });

  test('omits day 31 when the month does not contain it', () => {
    const occurrences = DutyPlannerPolicy.plan(
      {
        validFrom: '2027-01-01',
        assignmentStrategy: 'ONE_OWNER_PER_SLOT',
        recurrence: {
          frequency: 'MONTHLY',
          daysOfMonth: [31],
          slots: [{ key: 'close', label: 'Cierre' }],
        },
      },
      '2027-01-01',
      '2027-03-31'
    );
    assert.deepEqual(
      occurrences.map(item => item.occurrenceKey),
      ['2027-01-31', '2027-03-31']
    );
  });

  test('creates one assignment per configured block when requested', () => {
    const occurrences = DutyPlannerPolicy.plan(
      weeklyConfiguration({
        assignmentStrategy: 'ONE_OWNER_PER_SLOT',
        recurrence: {
          frequency: 'WEEKLY',
          weekStartsOn: 'MONDAY',
          weekdays: ['SATURDAY'],
          slots: [
            {
              key: 'office',
              label: 'Oficina',
              instructions: 'Limpiar escritorios.',
            },
            { key: 'hall', label: 'Pasillo' },
            { key: 'bathrooms', label: 'Banos' },
          ],
        },
      }),
      '2026-08-03',
      '2026-08-09'
    );
    assert.deepEqual(
      occurrences[0].slots.map(slot => slot.slotKey),
      ['office', 'hall', 'bathrooms']
    );
    assert.equal(
      occurrences[0].slots[0].slotInstructions,
      'Limpiar escritorios.'
    );
  });

  test('excludes a complete weekly occurrence by its cycle-start key', () => {
    const occurrences = DutyPlannerPolicy.plan(
      weeklyConfiguration({ excludedOccurrenceKeys: ['2026-08-10'] }),
      '2026-08-03',
      '2026-08-23'
    );
    assert.deepEqual(
      occurrences.map(item => item.occurrenceKey),
      ['2026-08-03', '2026-08-17']
    );
  });

  test('calculates an inclusive 60-day planning horizon in Lima', () => {
    assert.equal(
      DutyPlannerPolicy.horizonEnd(new Date('2026-07-15T12:00:00.000Z')),
      '2026-09-13'
    );
  });
});

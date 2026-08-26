import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDutyRequestSchema,
  dutyDraftSchema,
  updateDutyRequestSchema,
} from '@/services/rotations/duty.schema';

const validDraft = () => ({
  name: 'Llamar lista',
  description: null,
  capabilityKey: null,
  accessWindowDays: 14,
  assignmentStrategy: 'ONE_OWNER_PER_PERIOD' as const,
  validFrom: '2026-08-03',
  validUntil: null,
  recurrence: {
    frequency: 'WEEKLY' as const,
    weekdays: [
      'MONDAY' as const,
      'TUESDAY' as const,
      'WEDNESDAY' as const,
      'THURSDAY' as const,
      'FRIDAY' as const,
      'SATURDAY' as const,
    ],
    slots: [{ key: 'attendance', label: 'Llamar lista' }],
  },
  participantIds: [10, 20, 30],
  excludedOccurrenceKeys: [],
});

test.describe('Duty HTTP schemas', () => {
  test('accepts a complete weekly draft', () => {
    assert.equal(dutyDraftSchema.parse(validDraft()).validFrom, '2026-08-03');
  });

  test('validates and trims optional slot instructions', () => {
    const parsed = dutyDraftSchema.parse({
      ...validDraft(),
      recurrence: {
        ...validDraft().recurrence,
        slots: [
          {
            key: 'attendance',
            label: 'Llamar lista',
            instructions: '  Confirmar a todas las personas.  ',
          },
        ],
      },
    });
    assert.equal(
      parsed.recurrence.slots[0].instructions,
      'Confirmar a todas las personas.'
    );
  });

  test('rejects slot instructions longer than 500 characters', () => {
    const result = dutyDraftSchema.safeParse({
      ...validDraft(),
      recurrence: {
        ...validDraft().recurrence,
        slots: [
          {
            key: 'attendance',
            label: 'Llamar lista',
            instructions: 'a'.repeat(501),
          },
        ],
      },
    });
    assert.equal(result.success, false);
  });

  test('create and edit requests keep the validated recurrence contract', () => {
    const requestKey = '4ec1466c-8a43-44d6-a63d-7cc86f280b56';
    const created = createDutyRequestSchema.parse({
      body: { draft: validDraft(), requestKey },
    });
    const edited = updateDutyRequestSchema.parse({
      params: { id: '41ec2858-57bd-41ee-9505-b23388506b1f' },
      body: {
        draft: validDraft(),
        effectiveFrom: '2026-08-10',
        expectedVersion: 1,
        requestKey,
      },
    });

    assert.equal(created.body.draft.recurrence.frequency, 'WEEKLY');
    assert.equal(edited.body.draft.recurrence.frequency, 'WEEKLY');
    assert.equal('weekStartsOn' in created.body.draft.recurrence, false);
  });

  test('rejects weekStartsOn in new weekly requests', () => {
    const result = dutyDraftSchema.safeParse({
      ...validDraft(),
      recurrence: {
        ...validDraft().recurrence,
        weekStartsOn: 'FRIDAY',
      },
    });

    assert.equal(result.success, false);
  });

  test('rejects an activity without participants', () => {
    const result = dutyDraftSchema.safeParse({
      ...validDraft(),
      participantIds: [],
    });
    assert.equal(result.success, false);
  });

  test('rejects a repeated participant', () => {
    const result = dutyDraftSchema.safeParse({
      ...validDraft(),
      participantIds: [10, 10],
    });
    assert.equal(result.success, false);
  });

  test('rejects repeated normalized slot keys', () => {
    const result = dutyDraftSchema.safeParse({
      ...validDraft(),
      recurrence: {
        frequency: 'WEEKLY',
        weekdays: ['MONDAY'],
        slots: [
          { key: 'room', label: 'Oficina' },
          { key: 'room', label: 'Pasillo' },
        ],
      },
    });
    assert.equal(result.success, false);
  });

  test('rejects multiple internal blocks for one owner per period', () => {
    const result = dutyDraftSchema.safeParse({
      ...validDraft(),
      recurrence: {
        ...validDraft().recurrence,
        slots: [
          { key: 'first', label: 'Primera responsabilidad' },
          { key: 'second', label: 'Segunda responsabilidad' },
        ],
      },
    });

    assert.equal(result.success, false);
  });

  test('accepts one flexible group and fixed capacities for a full-roster distribution', () => {
    const result = dutyDraftSchema.safeParse({
      ...validDraft(),
      assignmentStrategy: 'DISTRIBUTE_PARTICIPANTS',
      participantSource: 'ACTIVE_ELIGIBLE_SYNC',
      evidencePolicy: 'REQUIRED_PHOTO',
      recurrence: {
        ...validDraft().recurrence,
        slots: [
          {
            key: 'oficinas',
            label: 'Oficinas',
            capacity: { mode: 'FIXED', count: 1 },
          },
          {
            key: 'resto',
            label: 'Personal restante',
            capacity: { mode: 'REMAINDER' },
          },
        ],
      },
    });
    assert.equal(result.success, true);
  });

  test('rejects distributed groups without exactly one remainder capacity', () => {
    const result = dutyDraftSchema.safeParse({
      ...validDraft(),
      assignmentStrategy: 'DISTRIBUTE_PARTICIPANTS',
      recurrence: {
        ...validDraft().recurrence,
        slots: [
          {
            key: 'oficinas',
            label: 'Oficinas',
            capacity: { mode: 'FIXED', count: 1 },
          },
        ],
      },
    });
    assert.equal(result.success, false);
  });

  test('rejects group restrictions that reference users outside the roster', () => {
    const result = dutyDraftSchema.safeParse({
      ...validDraft(),
      assignmentStrategy: 'DISTRIBUTE_PARTICIPANTS',
      recurrence: {
        ...validDraft().recurrence,
        slots: [
          {
            key: 'oficinas',
            label: 'Oficinas',
            capacity: { mode: 'FIXED', count: 1 },
            eligibleParticipantIds: [999],
          },
          {
            key: 'resto',
            label: 'Resto',
            capacity: { mode: 'REMAINDER' },
          },
        ],
      },
    });
    assert.equal(result.success, false);
  });

  test('rejects an inexistent calendar date and unknown fields', () => {
    const result = dutyDraftSchema.safeParse({
      ...validDraft(),
      validFrom: '2026-02-31',
      unsupportedField: true,
    });
    assert.equal(result.success, false);
  });

  test('requires a one-time date to equal validity start', () => {
    const result = dutyDraftSchema.safeParse({
      ...validDraft(),
      validFrom: '2026-08-03',
      recurrence: {
        frequency: 'ONCE',
        date: '2026-08-04',
        slots: [{ key: 'once', label: 'Una vez' }],
      },
    });
    assert.equal(result.success, false);
  });
});

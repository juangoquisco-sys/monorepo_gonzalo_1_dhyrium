import assert from 'node:assert/strict';
import test from 'node:test';
import DutyAllocationPolicy, {
  DutyAllocationError,
} from '@/services/rotations/dutyAllocation.policy';

const groups = [
  {
    key: 'oficinas',
    label: 'Oficinas',
    instructions: 'Limpiar escritorios y ventanas.',
    capacity: { mode: 'FIXED' as const, count: 2 },
  },
  {
    key: 'pasillos',
    label: 'Pasillos',
    capacity: { mode: 'FIXED' as const, count: 2 },
  },
  {
    key: 'servicios',
    label: 'Servicios higiénicos',
    capacity: { mode: 'REMAINDER' as const },
  },
];

const participants = Array.from({ length: 8 }, (_, position) => ({
  id: position + 1,
  position,
}));

test.describe('DutyAllocationPolicy', () => {
  test('distributes every participant exactly once using fixed and remainder groups', () => {
    const result = DutyAllocationPolicy.allocate(groups, participants, []);

    assert.equal(result.assignments.length, participants.length);
    assert.equal(
      new Set(result.assignments.map(item => item.assignedUserId)).size,
      participants.length
    );
    assert.deepEqual(
      result.assignments.reduce<Record<string, number>>((counts, item) => {
        counts[item.baseSlotKey] = (counts[item.baseSlotKey] ?? 0) + 1;
        return counts;
      }, {}),
      { oficinas: 2, pasillos: 2, servicios: 4 }
    );
    assert.equal(
      result.assignments.find(item => item.baseSlotKey === 'oficinas')
        ?.slotInstructions,
      'Limpiar escritorios y ventanas.'
    );
  });

  test('avoids repeating the previous group when a complete alternative exists', () => {
    const first = DutyAllocationPolicy.allocate(groups, participants, []);
    const second = DutyAllocationPolicy.allocate(
      groups,
      participants,
      first.assignments.map(item => ({
        occurrenceKey: '2026-08-01',
        baseSlotKey: item.baseSlotKey,
        assignedUserId: item.assignedUserId,
      }))
    );

    assert.equal(second.repeatedGroupCount, 0);
  });

  test('finds a complete non-repeating allocation before using fallback matches', () => {
    const result = DutyAllocationPolicy.allocate(
      [
        {
          key: 'zona-a',
          label: 'Zona A',
          capacity: { mode: 'FIXED', count: 2 },
        },
        {
          key: 'zona-b',
          label: 'Zona B',
          capacity: { mode: 'REMAINDER' },
        },
      ],
      participants.slice(0, 3),
      [
        { baseSlotKey: 'zona-b', assignedUserId: 1 },
        { baseSlotKey: 'otra-zona', assignedUserId: 2 },
        { baseSlotKey: 'zona-a', assignedUserId: 3 },
      ]
    );

    assert.equal(result.repeatedGroupCount, 0);
  });

  test('reports unavoidable repeated groups for the affected occurrence', () => {
    const unevenGroups = [
      {
        key: 'zona-amplia',
        label: 'Zona amplia',
        capacity: { mode: 'FIXED' as const, count: 6 },
      },
      {
        key: 'zona-restante',
        label: 'Zona restante',
        capacity: { mode: 'REMAINDER' as const },
      },
    ];
    const first = DutyAllocationPolicy.allocate(unevenGroups, participants, []);
    const second = DutyAllocationPolicy.allocate(
      unevenGroups,
      participants,
      first.assignments.map(item => ({
        baseSlotKey: item.baseSlotKey,
        assignedUserId: item.assignedUserId,
      }))
    );

    assert.equal(second.repeatedGroupCount, 4);
    assert.deepEqual(second.warnings, [
      '4 participante(s) repiten zona porque no fue posible evitar todas las repeticiones en una distribucion completa.',
    ]);
  });

  test('respects explicit eligibility restrictions', () => {
    const result = DutyAllocationPolicy.allocate(
      [
        {
          ...groups[0],
          eligibleParticipantIds: [7, 8],
        },
        groups[1],
        groups[2],
      ],
      participants,
      []
    );
    assert.deepEqual(
      result.assignments
        .filter(item => item.baseSlotKey === 'oficinas')
        .map(item => item.assignedUserId)
        .sort((a, b) => a - b),
      [7, 8]
    );
  });

  test('rejects a distribution whose fixed capacities exceed the roster', () => {
    assert.throws(
      () =>
        DutyAllocationPolicy.allocate(
          [
            {
              key: 'uno',
              label: 'Uno',
              capacity: { mode: 'FIXED', count: 9 },
            },
            {
              key: 'resto',
              label: 'Resto',
              capacity: { mode: 'REMAINDER' },
            },
          ],
          participants,
          []
        ),
      DutyAllocationError
    );
  });
});

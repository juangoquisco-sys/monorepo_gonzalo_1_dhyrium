import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma } from '@prisma/client';

const connect = () => Promise.resolve();
let transactionImplementation: (
  operation: (tx: unknown) => unknown
) => unknown = operation => operation({});
const transaction = (operation: (tx: unknown) => unknown) =>
  transactionImplementation(operation);
(globalThis as unknown as { db: unknown }).db = {
  $connect: connect,
  $transaction: transaction,
};

let DutyReconcilerService: typeof import('../src/services/rotations/dutyReconciler.service').default;

test.before(async () => {
  DutyReconcilerService = (
    await import('@/services/rotations/dutyReconciler.service')
  ).default;
});

test.beforeEach(() => {
  transactionImplementation = operation => operation({});
});

const assignment = (overrides: Record<string, unknown> = {}) => ({
  id: 'assignment-1',
  dutyId: 'duty-1',
  occurrenceKey: '2026-08-10',
  periodStart: new Date('2026-08-10T00:00:00.000Z'),
  periodEnd: new Date('2026-08-15T00:00:00.000Z'),
  dueOn: new Date('2026-08-15T00:00:00.000Z'),
  slotKey: 'period',
  slotLabel: 'Llamar lista',
  assignedUserId: 10,
  executedByUserId: null,
  configurationVersion: 1,
  status: 'PENDING',
  origin: 'AUTO',
  isLocked: false,
  resolutionNotes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  swapRequests: [],
  ...overrides,
});

test.describe('DutyReconcilerService policies', () => {
  test('returns a controlled conflict after exhausting serializable retries', async () => {
    let attempts = 0;
    transactionImplementation = () => {
      attempts += 1;
      throw new Prisma.PrismaClientKnownRequestError('write conflict', {
        code: 'P2034',
        clientVersion: '5.19.1',
      });
    };

    await assert.rejects(
      () => DutyReconcilerService.withSerializableRetry(async () => undefined),
      (error: { statusCode?: number }) => error.statusCode === 409
    );
    assert.equal(attempts, 3);
  });

  test('assigns weekly owners in deterministic circular order', async () => {
    const duty = {
      id: '41ec2858-57bd-41ee-9505-b23388506b1f',
      frequency: 'WEEKLY',
      validFrom: new Date('2026-08-03T00:00:00.000Z'),
      validUntil: null,
      assignmentStrategy: 'ONE_OWNER_PER_PERIOD',
      recurrenceRule: {
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
        slots: [
          {
            key: 'attendance',
            label: 'Llamar lista',
            instructions: 'Confirmar a todo el equipo.',
          },
        ],
      },
      excludedOccurrenceKeys: [],
      participants: [10, 20, 30].map((userId, position) => ({
        userId,
        position,
        user: { status: true, userType: 'PRESENCIAL' },
      })),
    };
    const expected = await DutyReconcilerService.expectedAssignments(
      duty as never,
      '2026-08-03',
      '2026-08-23'
    );
    assert.deepEqual(
      expected.map(item => item.assignedUserId),
      [10, 20, 30]
    );
    assert.ok(
      expected.every(
        item => item.slotInstructions === 'Confirmar a todo el equipo.'
      )
    );
  });

  test('a regenerated missing occurrence keeps its deterministic owner', async () => {
    const duty = {
      id: '41ec2858-57bd-41ee-9505-b23388506b1f',
      frequency: 'WEEKLY',
      validFrom: new Date('2026-08-03T00:00:00.000Z'),
      validUntil: null,
      assignmentStrategy: 'ONE_OWNER_PER_PERIOD',
      recurrenceRule: {
        frequency: 'WEEKLY',
        weekStartsOn: 'MONDAY',
        weekdays: ['MONDAY', 'SATURDAY'],
        slots: [{ key: 'attendance', label: 'Llamar lista' }],
      },
      excludedOccurrenceKeys: [],
      participants: [10, 20, 30].map((userId, position) => ({
        userId,
        position,
        user: { status: true, userType: 'PRESENCIAL' },
      })),
    };
    const first = await DutyReconcilerService.expectedAssignments(
      duty as never,
      '2026-08-03',
      '2026-08-23'
    );
    const repeated = await DutyReconcilerService.expectedAssignments(
      duty as never,
      '2026-08-03',
      '2026-08-23'
    );
    assert.equal(first[1].assignedUserId, 20);
    assert.equal(repeated[1].assignedUserId, 20);
  });

  test('keeps reconciliation deterministic with a Friday weekly start', async () => {
    const duty = {
      id: '41ec2858-57bd-41ee-9505-b23388506b1f',
      frequency: 'WEEKLY',
      validFrom: new Date('2026-07-17T00:00:00.000Z'),
      validUntil: null,
      assignmentStrategy: 'ONE_OWNER_PER_PERIOD',
      recurrenceRule: {
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
      excludedOccurrenceKeys: [],
      participants: [10, 20, 30].map((userId, position) => ({
        userId,
        position,
        user: { status: true, userType: 'PRESENCIAL' },
      })),
    };
    const first = await DutyReconcilerService.expectedAssignments(
      duty as never,
      '2026-07-17',
      '2026-08-06'
    );
    const repeated = await DutyReconcilerService.expectedAssignments(
      duty as never,
      '2026-07-17',
      '2026-08-06'
    );

    assert.deepEqual(
      first.map(item => [item.occurrenceKey, item.assignedUserId]),
      [
        ['2026-07-17', 10],
        ['2026-07-24', 20],
        ['2026-07-31', 30],
      ]
    );
    assert.deepEqual(repeated, first);
  });

  test('protects assignments in progress, manually adjusted or swapped', () => {
    assert.match(
      DutyReconcilerService.protectionReason(
        assignment({
          periodStart: new Date('2026-08-05T00:00:00.000Z'),
        }) as never,
        '2026-08-05'
      ) ?? '',
      /curso/
    );
    assert.match(
      DutyReconcilerService.protectionReason(
        assignment({ origin: 'MANUAL' }) as never,
        '2026-08-01'
      ) ?? '',
      /manual/
    );
    assert.match(
      DutyReconcilerService.protectionReason(
        assignment({ swapRequests: [{ id: 'swap-1' }] }) as never,
        '2026-08-01'
      ) ?? '',
      /intercambio/
    );
  });

  test('allows replacing only future automatic pending assignments', () => {
    assert.equal(
      DutyReconcilerService.protectionReason(
        assignment() as never,
        '2026-08-01'
      ),
      null
    );
    assert.match(
      DutyReconcilerService.protectionReason(
        assignment({ status: 'COMPLETED' }) as never,
        '2026-08-01'
      ) ?? '',
      /COMPLETED/
    );
  });
});

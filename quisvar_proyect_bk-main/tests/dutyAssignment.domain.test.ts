import assert from 'node:assert/strict';
import test from 'node:test';
import { hasDutyEvidenceSignature } from '@/middlewares/dutyEvidence.middleware';

type MockFunction = {
  (...args: unknown[]): unknown;
  calls: unknown[][];
  reset: () => void;
  setImplementation: (implementation: (...args: unknown[]) => unknown) => void;
};

const createMock = (): MockFunction => {
  let implementation: (...args: unknown[]) => unknown = () => undefined;
  const mock = ((...args: unknown[]) => {
    mock.calls.push(args);
    return implementation(...args);
  }) as MockFunction;
  mock.calls = [];
  mock.reset = () => {
    mock.calls = [];
    implementation = () => undefined;
  };
  mock.setImplementation = next => {
    implementation = next;
  };
  return mock;
};

const prismaMock = {
  dutyRotationAssignment: {
    findUnique: createMock(),
    findUniqueOrThrow: createMock(),
    findMany: createMock(),
    update: createMock(),
    updateMany: createMock(),
    deleteMany: createMock(),
  },
  dutyRotationParticipant: { findFirst: createMock() },
  dutyRotationAssignmentEvidence: { createMany: createMock() },
  $transaction: createMock(),
  $connect: createMock(),
};
(globalThis as unknown as { db: unknown }).db = prismaMock;

let DutyAssignmentService: typeof import('../src/services/rotations/assignment.service').default;

test.before(async () => {
  DutyAssignmentService = (
    await import('@/services/rotations/assignment.service')
  ).default;
});

test.beforeEach(() => {
  Object.values(prismaMock.dutyRotationAssignment).forEach(mock =>
    mock.reset()
  );
  prismaMock.dutyRotationParticipant.findFirst.reset();
  prismaMock.dutyRotationAssignmentEvidence.createMany.reset();
  prismaMock.$transaction.reset();
  prismaMock.$transaction.setImplementation(operation =>
    (operation as (tx: typeof prismaMock) => unknown)(prismaMock)
  );
});

const persistedAssignment = (overrides: Record<string, unknown> = {}) => ({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  dutyId: '11111111-1111-4111-8111-111111111111',
  duty: {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Llamar lista',
    capabilityKey: 'attendance.reconciliation',
    accessWindowDays: 14,
    participants: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        dutyId: '11111111-1111-4111-8111-111111111111',
        userId: 10,
        position: 0,
        user: {
          id: 10,
          email: 'gerente@example.com',
          profile: { firstName: 'Gerente', lastName: 'A' },
        },
      },
    ],
  },
  occurrenceKey: '2026-08-03',
  assignedUserId: 10,
  assignedUser: {
    id: 10,
    email: 'gerente@example.com',
    profile: { firstName: 'Gerente', lastName: 'A' },
  },
  executedByUserId: null,
  executedByUser: null,
  status: 'PENDING',
  periodStart: new Date('2026-08-03T00:00:00.000Z'),
  periodEnd: new Date('2026-08-08T00:00:00.000Z'),
  dueOn: new Date('2026-08-08T00:00:00.000Z'),
  slotKey: 'period',
  slotLabel: 'Llamar lista',
  slotInstructions: 'Confirmar asistencia antes del cierre.',
  baseSlotKey: null,
  slotPosition: null,
  configurationVersion: 1,
  rosterVersion: 1,
  evidencePolicy: 'NONE',
  origin: 'AUTO',
  isLocked: false,
  resolutionNotes: null,
  createdAt: new Date('2026-07-15T12:00:00.000Z'),
  updatedAt: new Date('2026-07-15T12:00:00.000Z'),
  swapRequests: [],
  evidences: [],
  ...overrides,
});

test.describe('DutyAssignmentService period behavior', () => {
  test('validates evidence content signatures instead of trusting the MIME header', () => {
    assert.equal(
      hasDutyEvidenceSignature(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        'image/png'
      ),
      true
    );
    assert.equal(
      hasDutyEvidenceSignature(Buffer.from('not-an-image'), 'image/png'),
      false
    );
  });

  test('builds a persisted-period overlap filter', () => {
    const where = DutyAssignmentService.buildOverlapFilter(
      '2026-07-01',
      '2026-07-31'
    );
    assert.equal(
      where.periodStart?.lte.toISOString(),
      '2026-07-31T00:00:00.000Z'
    );
    assert.equal(
      where.periodEnd?.gte.toISOString(),
      '2026-07-01T00:00:00.000Z'
    );
  });

  test('keeps weekly assignments visible while their period has not ended', async () => {
    prismaMock.dutyRotationAssignment.findMany.setImplementation(() =>
      Promise.resolve([])
    );
    await DutyAssignmentService.myUpcoming(
      10,
      new Date('2026-08-04T12:00:00.000Z')
    );
    const input = prismaMock.dutyRotationAssignment.findMany.calls[0][0] as {
      where: { periodEnd: { gte: Date }; status: { in: string[] } };
    };
    assert.equal(
      input.where.periodEnd.gte.toISOString(),
      '2026-08-04T00:00:00.000Z'
    );
    assert.deepEqual(input.where.status.in, [
      'PENDING',
      'OPEN_POOL',
      'COMPLETED',
    ]);
  });

  test('returns an explicit assignment DTO instead of the raw activity', async () => {
    prismaMock.dutyRotationAssignment.findMany.setImplementation(() =>
      Promise.resolve([persistedAssignment()])
    );
    const [assignment] = await DutyAssignmentService.myUpcoming(
      10,
      new Date('2026-08-04T12:00:00.000Z')
    );
    assert.deepEqual(Object.keys(assignment.duty).sort(), [
      'capabilityKey',
      'id',
      'name',
      'participants',
    ]);
    assert.equal(assignment.periodStart, '2026-08-03');
    assert.equal(assignment.periodEnd, '2026-08-08');
    assert.equal(
      assignment.slotInstructions,
      'Confirmar asistencia antes del cierre.'
    );
    assert.equal(
      assignment.duty.participants[0].user.profile?.firstName,
      'Gerente'
    );
  });

  test('does not allow completion before periodStart', async () => {
    prismaMock.dutyRotationAssignment.findUnique.setImplementation(() =>
      Promise.resolve(persistedAssignment())
    );
    await assert.rejects(
      () =>
        DutyAssignmentService.complete(
          'assignment-1',
          10,
          { requestKey: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
          [],
          new Date('2026-08-02T12:00:00.000Z')
        ),
      (error: { statusCode?: number }) => error.statusCode === 409
    );
    assert.equal(prismaMock.dutyRotationAssignment.update.calls.length, 0);
  });

  test('allows completion on dueOn and locks the assignment', async () => {
    const current = persistedAssignment();
    prismaMock.dutyRotationAssignment.findUnique.setImplementation(() =>
      Promise.resolve(current)
    );
    prismaMock.dutyRotationAssignment.updateMany.setImplementation(() =>
      Promise.resolve({ count: 1 })
    );
    prismaMock.dutyRotationAssignment.findUniqueOrThrow.setImplementation(() =>
      Promise.resolve({ ...current, status: 'COMPLETED', isLocked: true })
    );
    prismaMock.$transaction.setImplementation(async operation =>
      (operation as (tx: unknown) => Promise<unknown>)(prismaMock)
    );
    const result = await DutyAssignmentService.complete(
      'assignment-1',
      10,
      { requestKey: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
      [],
      new Date('2026-08-08T12:00:00.000Z')
    );
    assert.equal(result.status, 'COMPLETED');
    const input = prismaMock.dutyRotationAssignment.updateMany.calls[0][0] as {
      data: { isLocked: boolean };
    };
    assert.equal(input.data.isLocked, true);
  });

  test('claims completion atomically and rejects a concurrent different request', async () => {
    const pending = persistedAssignment();
    const completed = persistedAssignment({
      status: 'COMPLETED',
      completionRequestKey: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    });
    let lookupCount = 0;
    prismaMock.dutyRotationAssignment.findUnique.setImplementation(() => {
      lookupCount += 1;
      return Promise.resolve(lookupCount === 1 ? pending : completed);
    });
    prismaMock.dutyRotationAssignment.updateMany.setImplementation(() =>
      Promise.resolve({ count: 0 })
    );
    prismaMock.$transaction.setImplementation(async operation =>
      (operation as (tx: unknown) => Promise<unknown>)(prismaMock)
    );

    await assert.rejects(
      () =>
        DutyAssignmentService.complete(
          'assignment-1',
          10,
          { requestKey: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' },
          [],
          new Date('2026-08-08T12:00:00.000Z')
        ),
      (error: { statusCode?: number }) => error.statusCode === 409
    );
    const claim = prismaMock.dutyRotationAssignment.updateMany.calls[0][0] as {
      where: { assignedUserId: number; completionRequestKey: null };
    };
    assert.equal(claim.where.assignedUserId, 10);
    assert.equal(claim.where.completionRequestKey, null);
  });

  test('rejects completion after dueOn', async () => {
    prismaMock.dutyRotationAssignment.findUnique.setImplementation(() =>
      Promise.resolve(persistedAssignment())
    );
    await assert.rejects(
      () =>
        DutyAssignmentService.complete(
          'assignment-1',
          10,
          { requestKey: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' },
          [],
          new Date('2026-08-09T12:00:00.000Z')
        ),
      (error: { statusCode?: number }) => error.statusCode === 409
    );
  });

  test('requires photographic evidence when the assignment snapshot requires it', async () => {
    prismaMock.dutyRotationAssignment.findUnique.setImplementation(() =>
      Promise.resolve(persistedAssignment({ evidencePolicy: 'REQUIRED_PHOTO' }))
    );
    await assert.rejects(
      () =>
        DutyAssignmentService.complete(
          'assignment-1',
          10,
          { requestKey: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' },
          [],
          new Date('2026-08-08T12:00:00.000Z')
        ),
      (error: { statusCode?: number }) => error.statusCode === 400
    );
    assert.equal(prismaMock.$transaction.calls.length, 0);
  });

  test('replays the same completion request without writing again', async () => {
    const completed = persistedAssignment({
      status: 'COMPLETED',
      completionRequestKey: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    });
    prismaMock.dutyRotationAssignment.findUnique.setImplementation(() =>
      Promise.resolve(completed)
    );
    prismaMock.dutyRotationAssignment.findUniqueOrThrow.setImplementation(() =>
      Promise.resolve(completed)
    );

    const result = await DutyAssignmentService.complete('assignment-1', 10, {
      requestKey: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    });

    assert.equal(result.status, 'COMPLETED');
    assert.equal(prismaMock.$transaction.calls.length, 0);
  });

  test('marks pending and open-pool assignments only after dueOn', async () => {
    prismaMock.dutyRotationAssignment.updateMany.setImplementation(() =>
      Promise.resolve({ count: 2 })
    );
    await DutyAssignmentService.markPastPendingAsNoShow(
      new Date('2026-08-09T12:00:00.000Z')
    );
    const input = prismaMock.dutyRotationAssignment.updateMany.calls[0][0] as {
      where: { dueOn: { lt: Date }; status: { in: string[] } };
    };
    assert.equal(
      input.where.dueOn.lt.toISOString(),
      '2026-08-09T00:00:00.000Z'
    );
    assert.deepEqual(input.where.status.in, ['PENDING', 'OPEN_POOL']);
  });

  test('revalidates assignment state before an administrative reassignment', async () => {
    prismaMock.dutyRotationAssignment.findUnique.setImplementation(() =>
      Promise.resolve(
        persistedAssignment({
          status: 'COMPLETED',
          duty: { assignmentStrategy: 'ONE_OWNER_PER_PERIOD' },
        })
      )
    );

    await assert.rejects(
      () =>
        DutyAssignmentService.reassign('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', {
          assignedUserId: 20,
        }),
      (error: { statusCode?: number }) => error.statusCode === 409
    );
    assert.equal(prismaMock.dutyRotationAssignment.update.calls.length, 0);
  });

  test('keeps a protected assignment during permissive bulk deletion', async () => {
    prismaMock.dutyRotationAssignment.findMany.setImplementation(() =>
      Promise.resolve([
        persistedAssignment({ status: 'COMPLETED', swapRequests: [] }),
      ])
    );

    const result = await DutyAssignmentService.bulkDelete(
      {
        ids: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
        dutyId: '11111111-1111-4111-8111-111111111111',
        deleteOnlyDeletable: true,
      },
      new Date('2026-07-15T12:00:00.000Z')
    );

    assert.equal(result.deletedCount, 0);
    assert.equal(result.protectedCount, 1);
    assert.equal(prismaMock.dutyRotationAssignment.deleteMany.calls.length, 0);
  });
});

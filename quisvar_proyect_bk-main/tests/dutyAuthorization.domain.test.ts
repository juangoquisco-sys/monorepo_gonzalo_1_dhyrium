import assert from 'node:assert/strict';
import test from 'node:test';

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
  mock.setImplementation = nextImplementation => {
    implementation = nextImplementation;
  };
  return mock;
};

type PrismaMock = {
  dutyRotationAssignment: {
    findUnique: MockFunction;
    update: MockFunction;
  };
  dutyRotationParticipant: {
    findFirst: MockFunction;
  };
  dutySwapRequest: {
    create: MockFunction;
    findFirst: MockFunction;
    findMany: MockFunction;
    findUnique: MockFunction;
    update: MockFunction;
    count: MockFunction;
  };
  $connect: MockFunction;
  $transaction: MockFunction;
};

const prismaMock: PrismaMock = {
  dutyRotationAssignment: {
    findUnique: createMock(),
    update: createMock(),
  },
  dutyRotationParticipant: {
    findFirst: createMock(),
  },
  dutySwapRequest: {
    create: createMock(),
    findFirst: createMock(),
    findMany: createMock(),
    findUnique: createMock(),
    update: createMock(),
    count: createMock(),
  },
  $connect: createMock(),
  $transaction: createMock(),
};

const testGlobal = globalThis as unknown as Record<string, unknown>;
testGlobal.db = prismaMock;

let DutyAssignmentService: typeof import('../src/services/rotations/assignment.service').default;
let DutySwapService: typeof import('../src/services/rotations/swap.service').default;

test.before(async () => {
  DutyAssignmentService = (
    await import('@/services/rotations/assignment.service')
  ).default;
  DutySwapService = (await import('@/services/rotations/swap.service')).default;
});

test.beforeEach(() => {
  prismaMock.dutyRotationAssignment.findUnique.reset();
  prismaMock.dutyRotationAssignment.update.reset();
  prismaMock.dutyRotationParticipant.findFirst.reset();
  prismaMock.dutySwapRequest.create.reset();
  prismaMock.dutySwapRequest.findFirst.reset();
  prismaMock.dutySwapRequest.findMany.reset();
  prismaMock.dutySwapRequest.findUnique.reset();
  prismaMock.dutySwapRequest.update.reset();
  prismaMock.dutySwapRequest.count.reset();
  prismaMock.$transaction.reset();
  prismaMock.$transaction.setImplementation(operation =>
    (operation as (tx: PrismaMock) => unknown)(prismaMock)
  );
});

test.describe('Duty rotation personal authorization', () => {
  test('rejects completing a duty assigned to another user', async () => {
    prismaMock.dutyRotationAssignment.findUnique.setImplementation(() =>
      Promise.resolve({
        id: 'assignment-1',
        assignedUserId: 10,
        status: 'PENDING',
      })
    );

    await assert.rejects(
      () =>
        DutyAssignmentService.complete('assignment-1', 20, {
          requestKey: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        }),
      (error: { statusCode?: number }) => error.statusCode === 403
    );

    assert.equal(prismaMock.dutyRotationAssignment.update.calls.length, 0);
  });

  test('rejects swap requests for duties assigned to another user', async () => {
    prismaMock.dutyRotationAssignment.findUnique.setImplementation(() =>
      Promise.resolve({
        id: 'assignment-1',
        assignedUserId: 10,
        status: 'PENDING',
      })
    );

    await assert.rejects(
      () =>
        DutySwapService.requestSwap('assignment-1', 20, {
          targetUserId: null,
          reason: 'No podre cubrir el turno',
        }),
      (error: { statusCode?: number }) => error.statusCode === 403
    );

    assert.equal(prismaMock.dutySwapRequest.create.calls.length, 0);
  });

  test('rejects a duplicate pending swap request', async () => {
    prismaMock.dutyRotationAssignment.findUnique.setImplementation(() =>
      Promise.resolve({
        id: 'assignment-1',
        dutyId: 'duty-1',
        assignedUserId: 20,
        status: 'PENDING',
        dueOn: new Date('2099-08-08T00:00:00.000Z'),
      })
    );
    prismaMock.dutySwapRequest.findFirst.setImplementation(() =>
      Promise.resolve({ id: 'existing-request' })
    );

    await assert.rejects(
      () =>
        DutySwapService.requestSwap('assignment-1', 20, {
          targetUserId: 30,
          reason: 'Cambio coordinado',
        }),
      (error: { statusCode?: number; message?: string }) =>
        error.statusCode === 409 &&
        error.message ===
          'Este turno ya tiene una solicitud de cambio pendiente'
    );

    assert.equal(prismaMock.dutySwapRequest.create.calls.length, 0);
  });

  test('revalidates the assignment inside approval before writing', async () => {
    prismaMock.dutySwapRequest.findUnique.setImplementation(() =>
      Promise.resolve({
        id: 'swap-1',
        assignmentId: 'assignment-1',
        requesterUserId: 20,
        targetUserId: 30,
        status: 'PENDING',
        assignment: {
          id: 'assignment-1',
          dutyId: 'duty-1',
          assignedUserId: 20,
          status: 'COMPLETED',
          dueOn: new Date('2099-08-08T00:00:00.000Z'),
          duty: { assignmentStrategy: 'ONE_OWNER_PER_PERIOD' },
        },
      })
    );

    await assert.rejects(
      () => DutySwapService.approve('swap-1'),
      (error: { statusCode?: number; message?: string }) =>
        error.statusCode === 409 &&
        error.message === 'El turno ya no esta pendiente'
    );

    assert.equal(prismaMock.dutySwapRequest.update.calls.length, 0);
    assert.equal(prismaMock.dutyRotationAssignment.update.calls.length, 0);
  });

  test('rejects a pool claim whose request changed before the transaction', async () => {
    prismaMock.dutySwapRequest.findUnique.setImplementation(() =>
      Promise.resolve({
        id: 'swap-1',
        targetUserId: 40,
        status: 'CLAIMED',
        requesterUserId: 20,
        assignment: {
          id: 'assignment-1',
          dutyId: 'duty-1',
          status: 'PENDING',
          dueOn: new Date('2099-08-08T00:00:00.000Z'),
          duty: { assignmentStrategy: 'ONE_OWNER_PER_PERIOD' },
        },
      })
    );

    await assert.rejects(
      () => DutySwapService.claim('swap-1', 30),
      (error: { statusCode?: number }) => error.statusCode === 409
    );

    assert.equal(prismaMock.dutySwapRequest.update.calls.length, 0);
    assert.equal(prismaMock.dutyRotationAssignment.update.calls.length, 0);
  });

  test('scopes the open pool to eligible activities and excludes own requests', async () => {
    prismaMock.dutySwapRequest.findMany.setImplementation(() =>
      Promise.resolve([])
    );

    await DutySwapService.openPool(20, new Date('2026-08-04T12:00:00.000Z'));

    const input = prismaMock.dutySwapRequest.findMany.calls[0][0] as {
      where: {
        requesterUserId: { not: number };
        assignment: {
          dueOn: { gte: Date };
          duty: {
            participants: {
              some: {
                userId: number;
                user: { status: boolean; userType: { not: string } };
              };
            };
          };
        };
      };
    };
    assert.equal(input.where.requesterUserId.not, 20);
    assert.equal(
      input.where.assignment.dueOn.gte.toISOString(),
      '2026-08-04T00:00:00.000Z'
    );
    assert.equal(input.where.assignment.duty.participants.some.userId, 20);
    assert.deepEqual(input.where.assignment.duty.participants.some.user, {
      status: true,
      userType: { not: 'REMOTO' },
    });
  });

  test('lists only pending directed requests with pending assignments', async () => {
    prismaMock.dutySwapRequest.findMany.setImplementation(() =>
      Promise.resolve([])
    );

    await DutySwapService.listPendingDirected();

    const input = prismaMock.dutySwapRequest.findMany.calls[0][0] as {
      where: {
        targetUserId: { not: null };
        status: string;
        assignment: { status: string };
      };
    };
    assert.deepEqual(input.where, {
      targetUserId: { not: null },
      status: 'PENDING',
      assignment: { status: 'PENDING' },
    });
  });
});

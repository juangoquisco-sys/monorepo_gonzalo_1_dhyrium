import assert from 'node:assert/strict';
import test from 'node:test';

const connect = () => Promise.resolve();
(globalThis as unknown as { db: unknown }).db = {
  $connect: connect,
};

const {
  ClasesPermitAutomationService,
  AUTOMATION_KEY,
  clasesPermitWindow,
  isLimaWorkday,
} = require('@/services/clasesPermitAutomation.service');

type Permit = {
  id: number;
  usersId: number;
  supervisorId: number;
  reason: string;
  type: string;
  status: string;
  startDate: Date;
  untilDate: Date;
  checkout: Date | null;
  fine?: string;
  automationKey: string;
};

const mondayNoon = new Date('2026-09-07T18:00:00.000Z');

const mockDb = ({ active = true, approverId = 9 } = {}) => {
  const permits: Permit[] = [];
  let nextId = 1;
  const db = {
    users: {
      findUnique: async () => ({ status: active }),
      findFirst: async () => (approverId ? { id: approverId } : null),
    },
    licenses: {
      deleteMany: async ({ where }: any) => {
        const initial = permits.length;
        for (let index = permits.length - 1; index >= 0; index -= 1) {
          const permit = permits[index];
          if (
            permit.automationKey === where.automationKey &&
            (!where.untilDate || permit.untilDate < where.untilDate.lt)
          ) {
            permits.splice(index, 1);
          }
        }
        return { count: initial - permits.length };
      },
      findFirst: async ({ where }: any) =>
        permits.find(
          permit =>
            permit.automationKey === where.automationKey &&
            permit.usersId === where.usersId &&
            permit.startDate >= where.startDate.gte &&
            permit.startDate < where.startDate.lt
        ) ?? null,
      create: async ({ data }: any) => {
        const permit: Permit = { id: nextId++, checkout: null, ...data };
        permits.push(permit);
        return { id: permit.id, checkout: permit.checkout };
      },
      updateMany: async ({ where, data }: any) => {
        const matching = permits.filter(
          permit =>
            permit.automationKey === where.automationKey &&
            permit.usersId === where.usersId &&
            permit.startDate >= where.startDate.gte &&
            permit.startDate < where.startDate.lt &&
            permit.checkout === where.checkout
        );
        matching.forEach(permit => Object.assign(permit, data));
        return { count: matching.length };
      },
    },
  };
  return { db, permits };
};

test('identifies weekdays and uses the existing Lima license time convention', () => {
  assert.equal(isLimaWorkday(mondayNoon), true);
  assert.equal(isLimaWorkday(new Date('2026-09-06T18:00:00.000Z')), false);
  const window = clasesPermitWindow(mondayNoon);
  assert.equal(window.startDate.toISOString(), '2026-09-07T12:45:00.000Z');
  assert.equal(window.untilDate.toISOString(), '2026-09-07T19:30:00.000Z');
});

test('creates one approved permit and is idempotent', async () => {
  const { db, permits } = mockDb();
  const service = new ClasesPermitAutomationService(db as never, console);
  await service.reconcile(mondayNoon);
  await service.reconcile(mondayNoon);
  assert.equal(permits.length, 1);
  assert.deepEqual(
    {
      usersId: permits[0].usersId,
      supervisorId: permits[0].supervisorId,
      reason: permits[0].reason,
      type: permits[0].type,
      status: permits[0].status,
      automationKey: permits[0].automationKey,
    },
    {
      usersId: 2,
      supervisorId: 9,
      reason: 'Clases',
      type: 'PERMISO',
      status: 'ACEPTADO',
      automationKey: AUTOMATION_KEY,
    }
  );
});

test('does not create a permit when Diego is inactive or the approver is missing', async () => {
  const inactive = mockDb({ active: false });
  await new ClasesPermitAutomationService(inactive.db as never, console).reconcile(
    mondayNoon
  );
  assert.equal(inactive.permits.length, 0);

  const withoutApprover = mockDb({ approverId: 0 });
  await new ClasesPermitAutomationService(
    withoutApprover.db as never,
    { error: () => undefined }
  ).reconcile(mondayNoon);
  assert.equal(withoutApprover.permits.length, 0);
});

test('recovers after 19:30, marks the return, and only removes automated expired permits', async () => {
  const { db, permits } = mockDb();
  const service = new ClasesPermitAutomationService(db as never, console);
  await service.reconcile(mondayNoon);
  await service.reconcile(new Date('2026-09-08T00:30:00.000Z'));
  assert.equal(permits[0].checkout?.toISOString(), '2026-09-07T19:30:00.000Z');
  assert.equal(permits[0].status, 'INACTIVO');
  assert.equal(permits[0].fine, 'PUNTUAL');

  permits.push({
    ...permits[0],
    id: 99,
    automationKey: 'MANUAL',
    startDate: new Date('2026-09-07T12:45:00.000Z'),
    untilDate: new Date('2026-09-07T19:30:00.000Z'),
  });
  await service.reconcile(new Date('2026-09-08T05:01:00.000Z'));
  assert.equal(permits.some(permit => permit.automationKey === AUTOMATION_KEY), true);
  assert.equal(permits.some(permit => permit.automationKey === 'MANUAL'), true);
});

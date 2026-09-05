import assert from 'node:assert/strict';
import test from 'node:test';
import role from '@/middlewares/role.middleware';
import AppError from '@/utils/appError';

const selfSubmissionGuard = role.RoleHandler(
  ['USER'],
  'tramites',
  'planilla'
);

const userWithPayrollAccess = {
  role: {
    name: 'Tecnico',
    menuPoints: [
      {
        route: 'tramites',
        menu: [{ route: 'planilla', typeRol: 'USER' }],
      },
    ],
  },
};

const userWithPayrollManagement = {
  role: {
    name: 'Gerente',
    menuPoints: [
      {
        route: 'tramites',
        menu: [{ route: 'planilla', typeRol: 'MOD' }],
      },
    ],
  },
};

const invokeGuard = (userInfo: unknown) => {
  let nextCalled = false;
  selfSubmissionGuard(
    {} as never,
    { locals: { userInfo } } as never,
    () => {
      nextCalled = true;
    }
  );
  return nextCalled;
};

test('permite self-submission solo con planilla USER', () => {
  assert.equal(invokeGuard(userWithPayrollAccess), true);
});

test('deniega self-submission a planilla MOD', () => {
  assert.throws(
    () => invokeGuard(userWithPayrollManagement),
    error => error instanceof AppError && error.statusCode === 403
  );
});

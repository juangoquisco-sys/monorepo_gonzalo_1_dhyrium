import assert from 'node:assert/strict';
import test from 'node:test';
import { UserType } from '@prisma/client';
import {
  activeNonRemoteUserWhere,
  activeUserWhere,
  nonRemoteUserWhere,
  withActiveNonRemoteUsers,
  withActiveUsers,
  withNonRemoteUsers,
} from '@/utils/userFilters';
import { orderUserLookupRows } from '@/services/userLookup.services';
import { orderAttendanceRows } from '@/services/attendance/attendance.policy';

test.describe('userFilters', () => {
  test('builds reusable active and non-remote filters', () => {
    assert.deepEqual(activeUserWhere, { status: true });
    assert.deepEqual(nonRemoteUserWhere, {
      userType: { not: UserType.REMOTO },
    });
    assert.deepEqual(activeNonRemoteUserWhere, {
      status: true,
      userType: { not: UserType.REMOTO },
    });
  });

  test('merges base filters without hardcoded user ids', () => {
    assert.deepEqual(withActiveUsers({ role: { hierarchy: { gte: 3 } } }), {
      role: { hierarchy: { gte: 3 } },
      status: true,
    });
    assert.deepEqual(withNonRemoteUsers({ status: true }), {
      status: true,
      userType: { not: UserType.REMOTO },
    });
    assert.deepEqual(withActiveNonRemoteUsers({ email: { contains: '@' } }), {
      email: { contains: '@' },
      status: true,
      userType: { not: UserType.REMOTO },
    });
  });
});

test.describe('attendance user lookup order', () => {
  const alphabeticUsers = [
    { name: 'Alarcón', role: { hierarchy: 3 } },
    { name: 'Benites', role: { hierarchy: 2 } },
    { name: 'Castro', role: { hierarchy: 1 } },
    { name: 'Delgado', role: { hierarchy: 4 } },
    { name: 'Espinoza', role: null },
  ];

  test('places general management first and preserves each group order', () => {
    const orderedUsers = orderUserLookupRows('attendance', alphabeticUsers);

    assert.deepEqual(
      orderedUsers.map(user => user.name),
      ['Castro', 'Benites', 'Alarcón', 'Delgado', 'Espinoza']
    );
  });

  test('does not change the order for other lookup contexts', () => {
    const orderedUsers = orderUserLookupRows('licenses', alphabeticUsers);

    assert.deepEqual(
      orderedUsers.map(user => user.name),
      alphabeticUsers.map(user => user.name)
    );
  });

  test('applies the same order to persisted attendance participants', () => {
    const participants = alphabeticUsers.map((user, index) => ({
      usersId: index + 1,
      user,
    }));
    const orderedParticipants = orderAttendanceRows(
      participants,
      participant => participant.user.role?.hierarchy
    );

    assert.deepEqual(
      orderedParticipants.map(participant => participant.user.name),
      ['Castro', 'Benites', 'Alarcón', 'Delgado', 'Espinoza']
    );
  });
});

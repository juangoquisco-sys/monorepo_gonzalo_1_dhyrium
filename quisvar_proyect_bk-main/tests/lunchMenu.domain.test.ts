import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertCanAssignPendingLunchMenuSelection,
  assertEligibleForLunchMenu,
  assertLunchMenuOpen,
  calculateLunchMenuCloseAt,
  canAssignPendingLunchMenuSelection,
  isLunchMenuOpen,
} from '../src/modules/lunch-menu/lunchMenu.domain';
import {
  assignLunchMenuRequestSchema,
  assignMostRequestedLunchMenuRequestSchema,
  publishLunchMenuRequestSchema,
} from '../src/modules/lunch-menu/lunchMenu.schema';

test('uses a thirty-minute default and permits an explicit closing duration', () => {
  const publishedAt = new Date('2026-09-26T12:00:00.000Z');

  assert.equal(
    calculateLunchMenuCloseAt(publishedAt).toISOString(),
    '2026-09-26T12:30:00.000Z'
  );
  assert.equal(
    calculateLunchMenuCloseAt(publishedAt, 45).toISOString(),
    '2026-09-26T12:45:00.000Z'
  );
});

test('does not allow selections after closing or a manual close', () => {
  const now = new Date('2026-09-26T12:30:00.000Z');

  assert.equal(
    isLunchMenuOpen(
      {
        isManuallyClosed: false,
        closesAt: new Date('2026-09-26T12:31:00.000Z'),
      },
      now
    ),
    true
  );
  assert.equal(
    isLunchMenuOpen(
      {
        isManuallyClosed: true,
        closesAt: new Date('2026-09-26T13:00:00.000Z'),
      },
      now
    ),
    false
  );
  assert.throws(
    () =>
      assertLunchMenuOpen(
        {
          isManuallyClosed: false,
          closesAt: new Date('2026-09-26T12:30:00.000Z'),
        },
        now
      ),
    { statusCode: 409 }
  );
});

test('requires an existing affirmative lunch confirmation', () => {
  assert.doesNotThrow(() => assertEligibleForLunchMenu(true));
  assert.throws(() => assertEligibleForLunchMenu(false), { statusCode: 403 });
});

test('only the two approved DNI values can assign a pending selection', () => {
  assert.equal(canAssignPendingLunchMenuSelection('73520253'), true);
  assert.equal(canAssignPendingLunchMenuSelection('44622486'), true);
  assert.equal(canAssignPendingLunchMenuSelection('00000000'), false);
  assert.throws(
    () => assertCanAssignPendingLunchMenuSelection('00000000'), {
      statusCode: 403,
    }
  );
});

test('validates the HTTP contracts without accepting extra menu fields', () => {
  assert.deepEqual(
    publishLunchMenuRequestSchema.parse({
      body: {
        serviceDate: '2026-09-27',
        seconds: ['Pollo al horno'],
        soupAvailable: true,
        soupName: 'Quinua',
        dessertName: '',
        refreshmentName: 'Maracuyá',
        durationMinutes: 45,
      },
    }).body,
    {
      serviceDate: '2026-09-27',
      seconds: ['Pollo al horno'],
      soupAvailable: true,
      soupName: 'Quinua',
      dessertAvailable: true,
      dessertName: '',
      refreshmentName: 'Maracuyá',
      durationMinutes: 45,
    }
  );
  assert.throws(() =>
    publishLunchMenuRequestSchema.parse({
      body: {
        serviceDate: '2026-09-27',
        seconds: ['Pollo al horno'],
        soupAvailable: true,
        unexpected: true,
      },
    })
  );
  assert.deepEqual(
    assignLunchMenuRequestSchema.parse({
      params: { serviceDate: '2026-09-27', userId: '15' },
      body: { lunchMenuSecondId: 8, wantsSoup: false, wantsDessert: true, wantsRefreshment: true },
    }).params,
    { serviceDate: '2026-09-27', userId: 15 }
  );
  assert.deepEqual(
    assignLunchMenuRequestSchema.parse({
      params: { serviceDate: '2026-09-27', userId: '15' },
      body: { lunchMenuSecondId: 8, wantsSoup: false },
    }).body,
    { lunchMenuSecondId: 8, wantsSoup: false, wantsDessert: true, wantsRefreshment: true }
  );
  assert.deepEqual(
    assignMostRequestedLunchMenuRequestSchema.parse({
      params: { serviceDate: '2026-09-27' },
      body: { assignments: [{ userId: 15, wantsSoup: false, wantsDessert: true, wantsRefreshment: false }] },
    }).body.assignments,
    [{ userId: 15, wantsSoup: false, wantsDessert: true, wantsRefreshment: false }]
  );
});

import assert from 'node:assert/strict';
import test from 'node:test';
import KitchenServices from '../src/services/kitchen.services';

test('uses Monday as the start of the distribution week', () => {
  const { weekStart, currentDayStart } =
    KitchenServices.getDistributionWeekRange('2026-09-19');

  assert.equal(KitchenServices.formatDateOnly(weekStart), '2026-09-14');
  assert.equal(KitchenServices.formatDateOnly(currentDayStart), '2026-09-19');
});

test('only enables the fair distribution policy for lunch', () => {
  assert.equal(KitchenServices.isDistributionSupportedMealType('Almuerzo'), true);
  assert.equal(KitchenServices.isDistributionSupportedMealType('Cena'), false);
  assert.equal(KitchenServices.isDistributionSupportedMealType('Desayuno'), false);
});

test('assigns neutral history to participants without prior distributions', () => {
  const ordered = KitchenServices.orderFairDistribution(
    [1, 2],
    new Map(),
    (() => {
      const values = [0, 0.9];
      return () => values.shift() || 0;
    })()
  );

  assert.deepEqual(ordered, [2, 1]);
});

test('uses the mean relative position to favor a participant with later prior turns', () => {
  const ordered = KitchenServices.orderFairDistribution(
    [1, 2, 3],
    new Map([
      [1, [0, 0]],
      [2, [1, 1]],
    ]),
    () => 0
  );

  assert.deepEqual(ordered, [2, 3, 1]);
});

test('treats a single-person previous distribution as neutral', () => {
  const ordered = KitchenServices.orderFairDistribution(
    [10, 11],
    new Map([[10, [0.5]]]),
    () => 0
  );

  assert.deepEqual(ordered, [10, 11]);
});

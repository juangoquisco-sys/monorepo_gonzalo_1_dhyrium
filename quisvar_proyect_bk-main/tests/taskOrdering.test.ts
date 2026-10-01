import assert from 'node:assert/strict';
import test from 'node:test';
import {
  insertTaskId,
  orderTaskIds,
  requestedTaskIds,
} from '../src/services/taskOrdering.services';

test('uses id as a deterministic tie breaker for damaged positions', () => {
  assert.deepEqual(
    orderTaskIds([
      { id: 30, index: 14 },
      { id: 10, index: 13 },
      { id: 20, index: 14 },
    ]),
    [10, 20, 30]
  );
});

test('inserts above or below the selected task without duplicating positions', () => {
  assert.deepEqual(insertTaskId([1, 2, 3], 4, 2, 'upper'), [1, 4, 2, 3]);
  assert.deepEqual(insertTaskId([1, 2, 3], 4, 2, 'lower'), [1, 2, 4, 3]);
});

test('accepts only a complete contiguous reorder', () => {
  assert.deepEqual(
    requestedTaskIds(
      [1, 2, 3],
      [
        { id: 3, index: 1 },
        { id: 1, index: 2 },
        { id: 2, index: 3 },
      ]
    ),
    [3, 1, 2]
  );
  assert.throws(
    () => requestedTaskIds([1, 2, 3], [{ id: 2, index: 1 }]),
    /todas las tareas/
  );
  assert.throws(
    () =>
      requestedTaskIds(
        [1, 2, 3],
        [
          { id: 1, index: 1 },
          { id: 2, index: 1 },
          { id: 3, index: 3 },
        ]
      ),
    /todas las tareas/
  );
});

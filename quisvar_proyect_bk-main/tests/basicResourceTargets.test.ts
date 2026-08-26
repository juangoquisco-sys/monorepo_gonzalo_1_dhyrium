import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeBasicResourceTargets } from '@/modules/basic-resources/basicResources.targets';

const graph = {
  levels: [
    { id: 1, levelList: [] },
    { id: 2, levelList: [1] },
    { id: 3, levelList: [1, 2] },
    { id: 4, levelList: [] },
  ],
  tasks: [
    { id: 10, levelsId: 1 },
    { id: 20, levelsId: 2 },
    { id: 30, levelsId: 3 },
    { id: 40, levelsId: 4 },
  ],
};

test.describe('normalizeBasicResourceTargets', () => {
  test('removes direct descendants covered by a parent with inheritance', () => {
    const targets = normalizeBasicResourceTargets(
      [
        { levelId: 1, includeDescendants: true },
        { levelId: 2, includeDescendants: true },
        { subTaskId: 30, includeDescendants: false },
      ],
      graph
    );

    assert.deepEqual(targets, [{ levelId: 1, includeDescendants: true }]);
  });

  test('keeps a direct child task when no ancestor target inherits', () => {
    const targets = normalizeBasicResourceTargets(
      [{ subTaskId: 20, includeDescendants: false }],
      graph
    );

    assert.deepEqual(targets, [{ subTaskId: 20, includeDescendants: false }]);
  });

  test('keeps independent parent branches and removes only their descendants', () => {
    const targets = normalizeBasicResourceTargets(
      [
        { levelId: 1, includeDescendants: true },
        { subTaskId: 20, includeDescendants: false },
        { levelId: 4, includeDescendants: true },
        { subTaskId: 40, includeDescendants: false },
      ],
      graph
    );

    assert.deepEqual(targets, [
      { levelId: 1, includeDescendants: true },
      { levelId: 4, includeDescendants: true },
    ]);
  });

  test('does not treat a non-inheriting parent as coverage', () => {
    const targets = normalizeBasicResourceTargets(
      [
        { levelId: 1, includeDescendants: false },
        { levelId: 2, includeDescendants: false },
      ],
      graph
    );

    assert.deepEqual(targets, [
      { levelId: 1, includeDescendants: false },
      { levelId: 2, includeDescendants: false },
    ]);
  });
});

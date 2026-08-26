import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalizeCommitmentAssignees,
  canonicalizeCommitmentContexts,
} from '../src/services/commitmentSelection.policy';

test('deduplicates commitment assignees while preserving their order', () => {
  assert.deepEqual(
    canonicalizeCommitmentAssignees([
      { userId: 10, role: 'OWNER' },
      { userId: 10, role: 'SUPPORT' },
      { userId: 20, role: 'OWNER' },
    ]),
    [
      { userId: 10, role: 'OWNER' },
      { userId: 20, role: 'OWNER' },
    ]
  );
  assert.deepEqual(canonicalizeCommitmentAssignees([]), []);
});

test('deduplicates technical contexts and assigns one primary context', () => {
  const contexts = canonicalizeCommitmentContexts([
    {
      targetType: 'LEVEL',
      unitId: 'unit-1',
      projectId: 30,
      stageId: 40,
      levelId: 50,
      includeChildren: true,
      isPrimary: false,
    },
    {
      targetType: 'LEVEL',
      unitId: 'unit-1',
      projectId: 30,
      stageId: 40,
      levelId: 50,
      includeChildren: true,
      isPrimary: true,
    },
    {
      targetType: 'TASK',
      unitId: 'unit-1',
      projectId: 30,
      stageId: 40,
      subTaskId: 60,
      includeChildren: false,
      isPrimary: true,
    },
  ]);

  assert.equal(contexts.length, 2);
  assert.equal(contexts[0].isPrimary, true);
  assert.equal(contexts[1].isPrimary, false);
});

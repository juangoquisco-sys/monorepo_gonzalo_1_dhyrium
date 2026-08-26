import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'path';
import {
  basicResourceStorageKey,
  basicResourceStorageKeyFromPath,
  basicResourcesStorageRoot,
  basicResourceStoredFilename,
} from '@/modules/basic-resources/basicResources.storage';

test('stores the UUID filename inside the project and stage directory once', () => {
  const storageKey = basicResourceStorageKey(233, 213, 'campo.xlsx');
  const storedFilename = basicResourceStoredFilename(storageKey);
  const filePath = path.join(
    basicResourcesStorageRoot(),
    '233',
    '213',
    storedFilename
  );

  assert.match(storageKey, /^233\/213\/[\w-]+\.xlsx$/);
  assert.equal(basicResourceStorageKeyFromPath(filePath), storageKey);
  assert.equal(
    path.dirname(filePath),
    path.join(basicResourcesStorageRoot(), '233', '213')
  );
});

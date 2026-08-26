import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertFolderMove,
  buildBreadcrumbs,
  collectFolderDescendants,
  folderIdsForArchiveOperation,
  normalizeFolderName,
} from '@/modules/corporate-archive/corporateArchiveTree.domain';

const folders = [
  {
    id: 'root',
    parentId: null,
    name: 'CONTRACTS',
    isRoot: true,
    archivedAt: null,
  },
  { id: 'a', parentId: 'root', name: 'Legal', isRoot: false, archivedAt: null },
  { id: 'b', parentId: 'a', name: 'Firmados', isRoot: false, archivedAt: null },
];

test('collects descendants and breadcrumbs without depending on Prisma', () => {
  assert.deepEqual(collectFolderDescendants(folders, 'a').sort(), ['a', 'b']);
  assert.deepEqual(buildBreadcrumbs(folders, 'b'), [
    { id: 'root', name: 'CONTRACTS' },
    { id: 'a', name: 'Legal' },
    { id: 'b', name: 'Firmados' },
  ]);
});

test('normalizes folder names and blocks root/cyclic moves', () => {
  assert.equal(normalizeFolderName('  Área   Legal  '), 'área legal');
  assert.throws(
    () =>
      assertFolderMove({
        folderId: 'a',
        targetFolderId: 'b',
        rootFolderId: 'root',
        descendantIds: ['a', 'b'],
      }),
    { code: 'ARCHIVE_FOLDER_MOVE_CYCLE' }
  );
  assert.throws(
    () =>
      assertFolderMove({
        folderId: 'root',
        targetFolderId: 'a',
        rootFolderId: 'root',
        descendantIds: ['root', 'a', 'b'],
      }),
    { code: 'ARCHIVE_ROOT_FOLDER_IMMUTABLE' }
  );
});

test('restores only folders archived by the requested cascade operation', () => {
  const descendants = [
    { id: 'parent', archiveOperationId: 'parent-operation' },
    { id: 'child-already-archived', archiveOperationId: 'child-operation' },
    { id: 'child-archived-by-parent', archiveOperationId: 'parent-operation' },
  ];
  assert.deepEqual(
    folderIdsForArchiveOperation(descendants, 'parent-operation'),
    ['parent', 'child-archived-by-parent']
  );
});

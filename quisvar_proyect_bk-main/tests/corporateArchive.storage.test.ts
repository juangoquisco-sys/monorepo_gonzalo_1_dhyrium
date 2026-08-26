import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {
  corporateArchiveStorageRoot,
  isPrivateCorporateArchivePath,
  resolveCorporateArchiveStoragePath,
} from '@/modules/corporate-archive/corporateArchive.storage';

test('resolves only opaque keys inside private corporate archive storage', () => {
  const filePath = resolveCorporateArchiveStoragePath('root-id/document-id/version-id.pdf');
  assert.equal(path.dirname(path.dirname(path.dirname(filePath))), corporateArchiveStorageRoot());
  assert.throws(() => resolveCorporateArchiveStoragePath('../secret.pdf'));
});

test('blocks direct static access to the private archive root', () => {
  assert.equal(isPrivateCorporateArchivePath('/corporate-archive-private/file.pdf'), true);
  assert.equal(isPrivateCorporateArchivePath('/corporate%2Darchive%2Dprivate/file.pdf'), true);
  assert.equal(isPrivateCorporateArchivePath('/projects/file.pdf'), false);
  assert.equal(isPrivateCorporateArchivePath('/%E0%A4%A'), true);
});

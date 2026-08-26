import assert from 'node:assert/strict';
import test from 'node:test';
import {
  archiveContentsRequestSchema,
  corporateArchiveCategorySchema,
  createArchiveFolderRequestSchema,
  createArchiveVersionRequestSchema,
  moveArchiveDocumentRequestSchema,
  resolveArchiveRootRequestSchema,
} from '@/modules/corporate-archive/corporateArchive.schema';

test('accepts only the agreed corporate archive categories and scopes', () => {
  assert.equal(corporateArchiveCategorySchema.safeParse('CONTRACTS').success, true);
  assert.equal(corporateArchiveCategorySchema.safeParse('OTHER').success, false);
  assert.equal(resolveArchiveRootRequestSchema.safeParse({ params: { scopeType: 'COMPANY', scopeId: '4', categoryKey: 'IDENTITY' } }).success, true);
  assert.equal(resolveArchiveRootRequestSchema.safeParse({ params: { scopeType: 'PROJECT', scopeId: '4', categoryKey: 'IDENTITY' } }).success, false);
});

test('parses contents flags and rejects unexpected query fields', () => {
  const result = archiveContentsRequestSchema.parse({ params: { rootId: '29ec7ab5-00c8-4a61-beb0-0528e8148c76' }, query: { recursive: 'true', includeArchived: 'false' } });
  assert.equal(result.query.recursive, true);
  assert.equal(result.query.includeArchived, false);
  assert.equal(archiveContentsRequestSchema.safeParse({ params: { rootId: '29ec7ab5-00c8-4a61-beb0-0528e8148c76' }, query: { unsafe: 'yes' } }).success, false);
});

test('requires an explicit target folder and a strict folder payload', () => {
  assert.equal(moveArchiveDocumentRequestSchema.safeParse({ params: { id: '29ec7ab5-00c8-4a61-beb0-0528e8148c76' }, body: {} }).success, false);
  assert.equal(createArchiveFolderRequestSchema.safeParse({ params: { rootId: '29ec7ab5-00c8-4a61-beb0-0528e8148c76' }, body: { name: 'Legal', hidden: true } }).success, false);
});

test('requires the expected current version for optimistic concurrency', () => {
  const id = '29ec7ab5-00c8-4a61-beb0-0528e8148c76';
  assert.equal(
    createArchiveVersionRequestSchema.safeParse({
      params: { id },
      body: { expectedCurrentVersionId: id },
    }).success,
    true
  );
  assert.equal(
    createArchiveVersionRequestSchema.safeParse({ params: { id }, body: {} })
      .success,
    false
  );
});

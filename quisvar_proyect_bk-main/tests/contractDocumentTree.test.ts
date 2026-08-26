import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertPdfDestination,
  CONTRACT_INDEX_FALLBACK,
  countPdfDestinations,
  mapContractTree,
  parseContractIndex,
} from '@/modules/contract-documents/contractDocumentTree';

test('keeps the established contract hierarchy with three levels', () => {
  const tree = mapContractTree(JSON.stringify(CONTRACT_INDEX_FALLBACK), []);
  assert.equal(tree.length, 5);
  assert.equal(tree[1].children[0].children[4].code, '2.1.5');
  assert.equal(tree[2].children[3].children[12].code, '3.4.13');
  assert.equal(countPdfDestinations(CONTRACT_INDEX_FALLBACK), 30);
});

test('uses the stable hierarchy when legacy JSON is corrupt', () => {
  assert.equal(parseContractIndex('{broken').length, 5);
});

test('only leaf destinations accept PDFs', () => {
  assert.equal(
    assertPdfDestination(JSON.stringify(CONTRACT_INDEX_FALLBACK), '3.4.1').id,
    '3.4.1'
  );
  assert.throws(
    () => assertPdfDestination(JSON.stringify(CONTRACT_INDEX_FALLBACK), '3.4'),
    (error: unknown) =>
      (error as { code?: string }).code === 'CONTRACT_DOCUMENT_LEVEL_INVALID'
  );
});

test('overlays the current contract version without mutating structure', () => {
  const tree = mapContractTree(JSON.stringify(CONTRACT_INDEX_FALLBACK), [
    {
      id: 'document-id',
      levelCode: '1.1',
      currentVersionId: 'version-id',
    },
  ]);
  assert.equal(tree[0].children[0].status, 'SUBIDO');
  assert.equal(tree[0].children[1].status, 'PENDIENTE');
});

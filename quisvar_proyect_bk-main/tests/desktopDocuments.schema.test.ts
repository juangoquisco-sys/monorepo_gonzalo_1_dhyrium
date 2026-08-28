import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDesktopDocumentLaunchSchema,
  desktopDocumentContentSchema,
  redeemDesktopDocumentLaunchSchema,
  saveDesktopDocumentVersionSchema,
} from '../src/modules/desktop-documents/desktopDocuments.schema';

const documentId = '3a95be8d-e348-4c78-9206-9cdfae1b6d95';
const versionId = 'f861dd6e-98a4-4d59-9d72-3af84ecbf669';

test('valida la apertura desde un archivo registrado de Dhyrium', () => {
  const parsed = createDesktopDocumentLaunchSchema.parse({
    body: { sourceKind: 'TASK_FILE', sourceFileId: '33693' },
  });
  assert.equal(parsed.body.sourceKind, 'TASK_FILE');
  assert.equal(parsed.body.sourceFileId, 33693);
});

test('valida el canje de un enlace opaco y sus identificadores UUID', () => {
  const ticket = 'A'.repeat(43);
  assert.equal(
    redeemDesktopDocumentLaunchSchema.parse({ params: { ticket } }).params.ticket,
    ticket
  );
  assert.equal(
    desktopDocumentContentSchema.parse({
      params: { documentId, versionId },
    }).params.versionId,
    versionId
  );
  assert.equal(
    saveDesktopDocumentVersionSchema.parse({
      params: { documentId },
      body: { baseVersionId: versionId },
    }).body.baseVersionId,
    versionId
  );
});

test('rechaza parámetros manipulados', () => {
  assert.equal(
    createDesktopDocumentLaunchSchema.safeParse({
      body: { sourceKind: 'OTHER', sourceFileId: 0 },
    }).success,
    false
  );
  assert.equal(
    redeemDesktopDocumentLaunchSchema.safeParse({
      params: { ticket: '../secreto' },
    }).success,
    false
  );
  assert.equal(
    saveDesktopDocumentVersionSchema.safeParse({
      params: { documentId: 'no-uuid' },
      body: { baseVersionId: 'no-uuid' },
    }).success,
    false
  );
});

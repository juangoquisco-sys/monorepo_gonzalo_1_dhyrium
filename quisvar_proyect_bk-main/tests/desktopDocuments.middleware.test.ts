import assert from 'node:assert/strict';
import test from 'node:test';
import { getAuditRequestPath } from '../src/utils/auditRequestPath';
import { isPrivateTaskDocumentUploadPath } from '../src/modules/task-documents/taskDocumentAssets.domain';
import { redactSensitiveRequestPath } from '../src/utils/httpLogger';

const validTicket = 'A'.repeat(43);

test('redacta los enlaces de apertura en los registros y bloquea el almacén privado', () => {
  const path = `/api/v1/desktop/documents/launches/${validTicket}/redeem`;
  const redacted = redactSensitiveRequestPath(path);
  assert.equal(redacted, '/api/v1/desktop/documents/launches/[token]/redeem');
  assert.equal(redacted.includes(validTicket), false);

  const auditedPath = getAuditRequestPath({
    originalUrl: `${path}?otra=clave`,
  } as never);
  assert.equal(auditedPath.includes(validTicket), false);
  assert.equal(auditedPath.includes('[token]'), true);
  assert.equal(isPrivateTaskDocumentUploadPath('/desktop-documents/a/b.bin'), true);
  assert.equal(isPrivateTaskDocumentUploadPath('/task-document-files/a/b.docx'), true);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTaskDocumentOfficeSessionSchema,
  ensureTaskDocumentOriginalVersionSchema,
  listTaskDocumentFileVersionsSchema,
  restoreTaskDocumentFileVersionSchema,
  taskDocumentOfficeFileSchema,
} from '../src/modules/task-documents/taskDocumentOffice.schema';

test('valida la creación explícita de sesiones de Microsoft Word', () => {
  const parsed = createTaskDocumentOfficeSessionSchema.parse({
    params: { taskKind: 'subtasks', taskId: '27855' },
    body: { provider: 'WORD_DESKTOP', sourceFileId: 33693 },
  });
  assert.equal(parsed.body.provider, 'WORD_DESKTOP');
  assert.equal(parsed.params.taskId, 27855);
});

test('valida la importación protegida de la versión original', () => {
  const parsed = ensureTaskDocumentOriginalVersionSchema.parse({
    params: { taskKind: 'basictasks', taskId: '7' },
    body: { sourceFileId: 12 },
  });
  assert.equal(parsed.params.taskKind, 'basictasks');
  assert.equal(parsed.body.sourceFileId, 12);
});

test('rechaza proveedor, identificador y token manipulados', () => {
  assert.equal(
    createTaskDocumentOfficeSessionSchema.safeParse({
      params: { taskKind: 'subtasks', taskId: 1 },
      body: { provider: 'CANVAS', sourceFileId: 0 },
    }).success,
    false
  );
  assert.equal(
    taskDocumentOfficeFileSchema.safeParse({
      params: { token: '../token', fileName: 'archivo.docx' },
    }).success,
    false
  );
});

test('exige la identidad del adjunto en historial, descarga y restauración', () => {
  const list = listTaskDocumentFileVersionsSchema.parse({
    params: { taskKind: 'subtasks', taskId: '27855' },
    query: { sourceFileId: '33693' },
  });
  assert.equal(list.query.sourceFileId, 33693);
  assert.equal(list.query.limit, 20);

  const version = restoreTaskDocumentFileVersionSchema.parse({
    params: {
      taskKind: 'subtasks',
      taskId: '27855',
      versionNumber: '2',
    },
    query: { sourceFileId: '33693' },
  });
  assert.equal(version.query.sourceFileId, 33693);

  assert.equal(
    listTaskDocumentFileVersionsSchema.safeParse({
      params: { taskKind: 'subtasks', taskId: '27855' },
      query: {},
    }).success,
    false
  );
  assert.equal(
    restoreTaskDocumentFileVersionSchema.safeParse({
      params: {
        taskKind: 'subtasks',
        taskId: '27855',
        versionNumber: '2',
      },
      query: { sourceFileId: '0' },
    }).success,
    false
  );
});

test('acepta el token sin nombre para descubrir la coleccion WebDAV', () => {
  const parsed = taskDocumentOfficeFileSchema.parse({
    params: { token: 'A'.repeat(43) },
  });
  assert.equal(parsed.params.token.length, 43);
  assert.equal(parsed.params.fileName, undefined);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getTaskDocumentAssetRequestSchema,
  getTaskDocumentRequestSchema,
  saveTaskDocumentRequestSchema,
} from '../src/modules/task-documents/taskDocuments.schema';
import {
  isPrivateTaskDocumentUploadPath,
  taskDocumentAssetContentType,
  taskDocumentAssetExtension,
} from '../src/modules/task-documents/taskDocumentAssets.domain';

test('acepta los dos tipos de tarea soportados', () => {
  for (const taskKind of ['subtasks', 'basictasks']) {
    const parsed = getTaskDocumentRequestSchema.parse({
      params: { taskKind, taskId: '42' },
    });
    assert.equal(parsed.params.taskId, 42);
    assert.equal(parsed.params.taskKind, taskKind);
  }
});

test('rechaza tipos de tarea y contenido no soportados', () => {
  assert.equal(
    getTaskDocumentRequestSchema.safeParse({
      params: { taskKind: 'externo', taskId: 1 },
    }).success,
    false
  );
  assert.equal(
    saveTaskDocumentRequestSchema.safeParse({
      params: { taskKind: 'subtasks', taskId: 1 },
      body: {
        title: 'Documento',
        contentJson: { type: 'otro' },
        contentHtml: '<p>Texto</p>',
        plainText: 'Texto',
        expectedRevision: null,
        createVersion: false,
      },
    }).success,
    false
  );
});

test('evita campos inesperados en el guardado', () => {
  const result = saveTaskDocumentRequestSchema.safeParse({
    params: { taskKind: 'subtasks', taskId: 1 },
    body: {
      title: 'Documento',
      contentJson: { type: 'doc', content: [{ type: 'paragraph' }] },
      contentHtml: '<p>Texto</p>',
      plainText: 'Texto',
      expectedRevision: null,
      createVersion: true,
      updatedById: 999,
    },
  });
  assert.equal(result.success, false);
});

test('acepta documentos paginados de Canvas Editor', () => {
  const result = saveTaskDocumentRequestSchema.safeParse({
    params: { taskKind: 'subtasks', taskId: 1 },
    body: {
      title: 'Documento paginado',
      contentJson: {
        type: 'canvas-editor',
        schemaVersion: 1,
        editorVersion: '1.0.0',
        data: { main: [{ value: 'Contenido' }] },
        settings: {
          width: 794,
          height: 1123,
          margins: [96, 96, 96, 96],
          paperDirection: 'vertical',
          pageMode: 'paging',
          columns: { count: 1 },
        },
      },
      contentHtml: '<p>Contenido</p>',
      plainText: 'Contenido',
      expectedRevision: null,
      createVersion: false,
    },
  });

  assert.equal(result.success, true);
});

test('acepta el contrato Canvas v2 emitido por Dhyrium Writer', () => {
  const result = saveTaskDocumentRequestSchema.safeParse({
    params: { taskKind: 'subtasks', taskId: 1 },
    body: {
      title: 'Documento Dhyrium v2',
      contentJson: {
        type: 'canvas-editor',
        schemaVersion: 2,
        editorVersion: '1.0.0',
        data: {
          header: [{ value: 'Encabezado' }],
          main: [{ value: 'Contenido' }],
          footer: [{ value: 'Pie' }],
        },
        settings: {
          width: 794,
          height: 1123,
          margins: [96, 96, 96, 96],
          headerTop: 48,
          footerBottom: 48,
          paperDirection: 'vertical',
          pageMode: 'paging',
          columns: { count: 1 },
          docxZonesImported: true,
        },
      },
      contentHtml: '<p>Contenido</p>',
      plainText: 'Encabezado\nContenido\nPie',
      expectedRevision: 1,
      createVersion: true,
    },
  });

  assert.equal(result.success, true);
});

test('valida nombres opacos de recursos y rechaza traversal', () => {
  const validFileName = '8cf36c14-4fc2-47af-8bb9-914ad6cb950f.png';
  assert.equal(
    getTaskDocumentAssetRequestSchema.safeParse({
      params: {
        taskKind: 'subtasks',
        taskId: '42',
        fileName: validFileName,
      },
    }).success,
    true
  );
  for (const fileName of [
    '../secret.png',
    'asset.png',
    '8cf36c14-4fc2-47af-8bb9-914ad6cb950f.svg',
  ]) {
    assert.equal(
      getTaskDocumentAssetRequestSchema.safeParse({
        params: { taskKind: 'subtasks', taskId: 42, fileName },
      }).success,
      false
    );
  }
});

test('resuelve MIME permitidos para guardar y servir recursos', () => {
  assert.equal(taskDocumentAssetExtension('image/x-emf'), 'emf');
  assert.equal(taskDocumentAssetExtension('video/ogg'), 'ogv');
  assert.equal(
    taskDocumentAssetContentType('8cf36c14-4fc2-47af-8bb9-914ad6cb950f.webp'),
    'image/webp'
  );
  assert.equal(taskDocumentAssetContentType('../secret.png'), null);
});

test('bloquea el directorio privado a travÃ©s del servidor estÃ¡tico global', () => {
  assert.equal(
    isPrivateTaskDocumentUploadPath('/task-documents-private/x'),
    true
  );
  assert.equal(
    isPrivateTaskDocumentUploadPath('/task%2Ddocuments%2Dprivate/x'),
    true
  );
  assert.equal(isPrivateTaskDocumentUploadPath('/task-documents/x'), true);
  assert.equal(
    isPrivateTaskDocumentUploadPath('/task%2Ddocuments/x'),
    true
  );
  assert.equal(isPrivateTaskDocumentUploadPath('/projects/x'), false);
  assert.equal(isPrivateTaskDocumentUploadPath('/%E0%A4%A'), true);
});

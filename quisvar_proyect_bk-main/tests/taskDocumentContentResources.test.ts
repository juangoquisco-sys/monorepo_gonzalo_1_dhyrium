import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_INLINE_TASK_DOCUMENT_IMAGE_BYTES,
  validateCanvasResourceReferences,
  type CanvasResourceReferenceFailureReason,
} from '../src/modules/task-documents/taskDocumentContentResources.domain';

const TASK_ID = 42;
const IMAGE_FILE = '8cf36c14-4fc2-47af-8bb9-914ad6cb950f.png';
const VIDEO_FILE = '63ac770b-8022-4b1c-aab2-bb4b5f154348.mp4';
const context = { taskKind: 'subtasks' as const, taskId: TASK_ID };

const canvasDocument = (main: unknown[]) => ({
  type: 'canvas-editor',
  schemaVersion: 2,
  editorVersion: '1.0.0',
  data: { main },
});

const assertFailure = (
  main: unknown[],
  reason: CanvasResourceReferenceFailureReason
) => {
  const result = validateCanvasResourceReferences(
    canvasDocument(main),
    context
  );
  assert.equal(result.ok, false);
  if (result.ok) assert.fail('Se esperaba una referencia rechazada.');
  assert.equal(result.reason, reason);
  assert.ok(result.path.length > 0);
};

test('acepta imagen raster inline acotada y assets protegidos de la misma tarea', () => {
  const result = validateCanvasResourceReferences(
    canvasDocument([
      {
        type: 'image',
        value:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAA',
      },
      {
        type: 'table',
        value: '',
        trList: [
          {
            tdList: [
              {
                value: [
                  {
                    type: 'image',
                    value: `/api/v1/task-documents/subtasks/${TASK_ID}/assets/${IMAGE_FILE}`,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'block',
        value: '',
        block: {
          type: 'video',
          videoBlock: {
            src: `/uploads/task-documents/subtasks/${TASK_ID}/${VIDEO_FILE}`,
          },
        },
      },
    ]),
    context
  );

  assert.deepEqual(result, {
    ok: true,
    inspectedElementCount: 4,
    resourceCount: 3,
  });
});

test('no interpreta texto, hipervinculos ni metadata opaca como recursos', () => {
  const suspiciousUrl = `https://attacker.invalid/api/v1/task-documents/subtasks/${TASK_ID}/assets/${IMAGE_FILE}`;
  const result = validateCanvasResourceReferences(
    canvasDocument([
      { type: 'text', value: suspiciousUrl },
      {
        type: 'hyperlink',
        value: '',
        url: suspiciousUrl,
        valueList: [{ value: suspiciousUrl }],
      },
      {
        value: 'Texto',
        extension: { type: 'image', value: suspiciousUrl },
      },
    ]),
    context
  );

  assert.equal(result.ok, true);
  if (!result.ok) assert.fail(result.message);
  assert.equal(result.resourceCount, 0);
});

test('rechaza protocolos, otra tarea y rutas no canonicas en imagenes', () => {
  const invalidValues = [
    `https://attacker.invalid/api/v1/task-documents/subtasks/${TASK_ID}/assets/${IMAGE_FILE}`,
    `http://localhost/api/v1/task-documents/subtasks/${TASK_ID}/assets/${IMAGE_FILE}`,
    `blob:https://dhyrium.local/${IMAGE_FILE}`,
    `javascript:alert(1)`,
    `//attacker.invalid/${IMAGE_FILE}`,
    `/api/v1/task-documents/subtasks/99/assets/${IMAGE_FILE}`,
    `/api/v1/task-documents/subtasks/${TASK_ID}/files/${IMAGE_FILE}`,
    `/api/v1/task-documents/subtasks/${TASK_ID}/assets/not-a-uuid.png`,
    `/api/v1/task-documents/subtasks/${TASK_ID}/assets/8cf36c14-4fc2-47af-8bb9-914ad6cb950f.svg`,
  ];
  for (const value of invalidValues) {
    assertFailure([{ type: 'image', value }], 'RESOURCE_PATH_NOT_ALLOWED');
  }
});

test('rechaza tipos de medio que no corresponden al elemento Canvas', () => {
  assertFailure(
    [
      {
        type: 'image',
        value: `/api/v1/task-documents/subtasks/${TASK_ID}/assets/${VIDEO_FILE}`,
      },
    ],
    'RESOURCE_MEDIA_TYPE_MISMATCH'
  );
  assertFailure(
    [
      {
        type: 'block',
        value: '',
        block: {
          type: 'video',
          videoBlock: {
            src: `/task-document-assets/subtasks/${TASK_ID}/${IMAGE_FILE}`,
          },
        },
      },
    ],
    'RESOURCE_MEDIA_TYPE_MISMATCH'
  );
});

test('rechaza data URI no raster, base64 invalido y raster inline mayor a 2 MB', () => {
  assertFailure(
    [
      {
        type: 'image',
        value: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      },
    ],
    'INLINE_IMAGE_INVALID'
  );
  assertFailure(
    [{ type: 'image', value: 'data:image/png;base64,abc' }],
    'INLINE_IMAGE_INVALID'
  );
  const oversized = Buffer.alloc(
    MAX_INLINE_TASK_DOCUMENT_IMAGE_BYTES + 1
  ).toString('base64');
  assertFailure(
    [{ type: 'image', value: `data:image/png;base64,${oversized}` }],
    'INLINE_IMAGE_TOO_LARGE'
  );
});

test('rechaza video inline, video externo e iframe antes de persistir', () => {
  for (const src of [
    'data:video/mp4;base64,AAAA',
    'blob:https://dhyrium.local/video',
    'https://attacker.invalid/video.mp4',
  ]) {
    assertFailure(
      [
        {
          type: 'block',
          value: '',
          block: { type: 'video', videoBlock: { src } },
        },
      ],
      'RESOURCE_PATH_NOT_ALLOWED'
    );
  }
  assertFailure(
    [
      {
        type: 'block',
        value: '',
        block: {
          type: 'iframe',
          iframeBlock: { src: 'https://attacker.invalid/embed' },
        },
      },
    ],
    'IFRAME_NOT_ALLOWED'
  );
});

test('recorre arboles Canvas profundos sin recursion de la pila', () => {
  const root: Record<string, unknown> = { value: 'raiz' };
  let cursor = root;
  for (let index = 0; index < 10_000; index += 1) {
    const child: Record<string, unknown> = { value: `nivel-${index}` };
    cursor.valueList = [child];
    cursor = child;
  }
  cursor.type = 'image';
  cursor.value = `/api/v1/task-documents/subtasks/${TASK_ID}/assets/${IMAGE_FILE}`;

  const result = validateCanvasResourceReferences(
    canvasDocument([root]),
    context
  );
  assert.equal(result.ok, true);
  if (!result.ok) assert.fail(result.message);
  assert.equal(result.inspectedElementCount, 10_001);
  assert.equal(result.resourceCount, 1);
});

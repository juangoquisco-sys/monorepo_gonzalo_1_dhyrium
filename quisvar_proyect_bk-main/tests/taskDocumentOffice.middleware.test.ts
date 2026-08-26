import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import AppError from '../src/utils/appError';
import authenticateHandler from '../src/middlewares/auth.middleware';
import TaskDocumentsController from '../src/modules/task-documents/taskDocuments.controller';
import TaskDocumentOfficeService from '../src/modules/task-documents/taskDocumentOffice.service';
import taskDocumentsRouter from '../src/modules/task-documents/taskDocuments.routes';
import { taskDocumentAssetUpload } from '../src/modules/task-documents/taskDocuments.upload';
import { redactSensitiveRequestPath } from '../src/utils/httpLogger';

const validToken = 'A'.repeat(43);

type RouterLayer = {
  handle?: unknown;
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack: Array<{ handle: unknown }>;
  };
};

test('publica la coleccion WebDAV antes de autenticacion HTTP', () => {
  const layers = (taskDocumentsRouter as unknown as { stack: RouterLayer[] })
    .stack;
  const collectionIndex = layers.findIndex(
    layer => layer.route?.path === '/office-edit/:token'
  );
  const authenticationIndex = layers.findIndex(
    layer => layer.handle === authenticateHandler
  );

  assert.notEqual(collectionIndex, -1);
  assert.notEqual(authenticationIndex, -1);
  assert.ok(collectionIndex < authenticationIndex);
  assert.equal(layers[collectionIndex]?.route?.methods?._all, true);
  assert.equal(
    redactSensitiveRequestPath(
      `/api/v1/task-documents/office-edit/${validToken}`
    ),
    '/api/v1/task-documents/office-edit/[token]'
  );
});

test('valida la sesión antes de cargar el cuerpo DOCX del PUT', () => {
  const layers = (taskDocumentsRouter as unknown as { stack: RouterLayer[] })
    .stack;
  const putRoute = layers.find(
    layer =>
      layer.route?.path === '/office-edit/:token/:fileName' &&
      layer.route.methods?.put
  )?.route;

  assert.ok(putRoute);
  assert.equal(
    putRoute.stack[0]?.handle,
    TaskDocumentsController.validateOfficeFileSession
  );
  assert.equal(
    putRoute.stack.at(-1)?.handle,
    TaskDocumentsController.officeFileSave
  );
});

test('no continúa al parser cuando el token está vencido', async context => {
  context.mock.method(
    TaskDocumentOfficeService,
    'assertPublicSessionActive',
    async () => {
      throw new AppError(
        'La sesión de edición expiró.',
        401,
        'TASK_DOCUMENT_SESSION_EXPIRED'
      );
    }
  );

  const request = {
    params: { token: validToken, fileName: 'documento.docx' },
  } as unknown as Request;
  let continued = false;
  const next = (() => {
    continued = true;
  }) as NextFunction;

  await assert.rejects(
    TaskDocumentsController.validateOfficeFileSession(
      request,
      {} as Response,
      next
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'TASK_DOCUMENT_SESSION_EXPIRED'
  );
  assert.equal(continued, false);
});

test('PUT reenvia If e If-Match y devuelve recibo de version', async context => {
  type SaveFromWordInput = Parameters<
    typeof TaskDocumentOfficeService.saveFromWord
  >[0];
  let received: SaveFromWordInput | undefined;
  context.mock.method(
    TaskDocumentOfficeService,
    'saveFromWord',
    async (input: SaveFromWordInput) => {
      received = input;
      return {
        created: true,
        version: {
          id: 'version-id',
          versionNumber: 4,
          checksumSha256: 'a'.repeat(64),
          originalName: 'documento.docx',
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          sizeBytes: 100,
          source: 'WORD_DESKTOP',
          createdAt: new Date(),
        },
      };
    }
  );

  const body = Buffer.from('docx');
  const responseHeaders: Record<string, string> = {};
  let responseStatus = 0;
  const response = {
    set(headers: Record<string, string>) {
      Object.assign(responseHeaders, headers);
      return this;
    },
    status(status: number) {
      responseStatus = status;
      return this;
    },
    send() {
      return this;
    },
  } as unknown as Response;
  const request = {
    params: { token: validToken, fileName: 'documento.docx' },
    headers: {
      if: '(<opaquelocktoken:document-key>)',
      'if-match': `"${'b'.repeat(64)}"`,
    },
    body,
  } as unknown as Request;

  await TaskDocumentsController.officeFileSave(request, response);

  assert.equal(received?.token, validToken);
  assert.equal(received?.buffer, body);
  assert.equal(received?.ifHeader, request.headers.if);
  assert.equal(received?.ifMatchHeader, request.headers['if-match']);
  assert.equal(responseStatus, 204);
  assert.equal(responseHeaders['X-Dhyrium-Version'], '4');
  assert.equal(responseHeaders['X-Dhyrium-Version-Id'], 'version-id');
  assert.equal(responseHeaders['X-Dhyrium-Session-Phase'], 'SAVED');
});

test('autoriza el contexto de la tarea antes de cargar un recurso Canvas', () => {
  const layers = (taskDocumentsRouter as unknown as { stack: RouterLayer[] })
    .stack;
  const authenticationIndex = layers.findIndex(
    layer => layer.handle === authenticateHandler
  );
  const uploadRouteIndex = layers.findIndex(
    layer =>
      layer.route?.path === '/:taskKind/:taskId/assets' &&
      layer.route.methods?.post
  );
  const assetRoute = layers[uploadRouteIndex]?.route;
  const contentRouteIndex = layers.findIndex(
    layer =>
      layer.route?.path === '/:taskKind/:taskId/assets/:fileName' &&
      layer.route.methods?.get
  );

  assert.ok(authenticationIndex < uploadRouteIndex);
  assert.ok(authenticationIndex < contentRouteIndex);
  assert.equal(
    assetRoute?.stack[0]?.handle,
    TaskDocumentsController.validateCanEditTaskDocument
  );
  assert.equal(assetRoute?.stack[1]?.handle, taskDocumentAssetUpload);
  assert.equal(assetRoute?.stack.at(-1)?.handle, TaskDocumentsController.asset);
});

import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import {
  access,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test, { afterEach, mock } from 'node:test';
import type { ErrorRequestHandler } from 'express';
import express from 'express';
import jwt from 'jsonwebtoken';
import {
  DocumentArtifactStatus,
  DocumentArtifactType,
  type DocumentArtifact,
} from '@prisma/client';
import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import { SECRET } from '@/middlewares/auth.middleware';
import UsersServices from '@/services/users.services';
import DocumentComposerService from '@/modules/document-composer/documentComposer.service';
import documentComposerRouter from '@/modules/document-composer/documentComposer.routes';
import {
  getArtifactAbsolutePath,
  removeComposerPath,
} from '@/modules/document-composer/documentComposer.storage';
import {
  getOrStartDocumentThumbnail,
  getThumbnailCachePaths,
  removeArtifactThumbnailCache,
} from '@/modules/document-composer/documentComposer.thumbnail';
import {
  DOCUMENT_COMPOSER_LIMITS,
  DOCUMENT_COMPOSER_THUMBNAIL_ROOT,
} from '@/modules/document-composer/documentComposer.constants';
import { parseThumbnailRequest } from '@/modules/document-composer/documentComposer.schema';
import * as pdfThumbnailService from '@/modules/document-composer/pdfThumbnail.service';

const createArtifact = (
  overrides: Partial<DocumentArtifact> = {}
): DocumentArtifact => ({
  id: randomUUID(),
  ownerId: 101,
  type: DocumentArtifactType.ORIGINAL_PDF,
  status: DocumentArtifactStatus.TEMPORARY,
  safeName: 'source.pdf',
  originalName: 'source.pdf',
  storageKey: path.join('101', `${randomUUID()}.pdf`),
  mimeType: 'application/pdf',
  sizeBytes: 100,
  pageCount: 3,
  sha256: 'a'.repeat(64),
  manifest: null,
  idempotencyKey: null,
  failureCode: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  expiresAt: new Date(Date.now() + 60_000),
  ...overrides,
});

const createSyntheticJpeg = (width = 200, height = 280) =>
  Buffer.from([
    0xff,
    0xd8,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03,
    0x01,
    0x11,
    0x00,
    0x02,
    0x11,
    0x00,
    0x03,
    0x11,
    0x00,
    0xff,
    0xd9,
  ]);

const fileExists = async (filePath: string) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const waitFor = async (
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 3_000
) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await delay(10);
  }
  throw new Error('Timed out waiting for thumbnail state');
};

const prismaRestorers: Array<() => void> = [];

const replacePrismaMethod = (
  methodName: 'findUnique' | 'update',
  replacement: (...args: unknown[]) => Promise<unknown>
) => {
  const delegate = prisma.documentArtifact;
  const original = delegate[methodName];
  Object.defineProperty(delegate, methodName, {
    value: replacement,
    configurable: true,
    writable: true,
  });
  prismaRestorers.push(() => {
    Object.defineProperty(delegate, methodName, {
      value: original,
      configurable: true,
      writable: true,
    });
  });
};

const mockArtifactLookup = (artifact: DocumentArtifact | null) => {
  replacePrismaMethod('findUnique', async () => artifact);
};

const testErrorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const appError =
    error instanceof AppError
      ? error
      : new AppError('Error interno.', 500, 'INTERNAL_ERROR');
  res.status(appError.statusCode).json({
    status: appError.status,
    message: appError.message,
    code: appError.code,
  });
};

const withTestServer = async (callback: (baseUrl: string) => Promise<void>) => {
  const app = express();
  app.use('/api/v1/document-composer', documentComposerRouter);
  app.use(testErrorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address() as AddressInfo;
  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
};

const mockAuthenticatedUser = (userId = 101) =>
  mock.method(
    UsersServices,
    'find',
    async () =>
      ({
        id: userId,
        status: true,
      } as unknown as Awaited<ReturnType<typeof UsersServices.find>>)
  );

afterEach(() => {
  mock.restoreAll();
  while (prismaRestorers.length > 0) {
    prismaRestorers.pop()?.();
  }
});

test('rejects a thumbnail request without Bearer authentication', async () => {
  await withTestServer(async baseUrl => {
    const response = await fetch(
      `${baseUrl}/api/v1/document-composer/artifacts/${randomUUID()}/pages/1/thumbnail`,
      { redirect: 'manual' }
    );
    assert.equal(response.status, 401);
  });
});

test('returns 403 when the authenticated user does not own the artifact', async () => {
  const artifact = createArtifact({ ownerId: 202 });
  const cachePaths = getThumbnailCachePaths(artifact, 1);
  mockArtifactLookup(artifact);
  try {
    await mkdir(cachePaths.artifactDirectory, {
      recursive: true,
      mode: 0o700,
    });
    await writeFile(cachePaths.absolutePath, createSyntheticJpeg(), {
      mode: 0o600,
    });

    await assert.rejects(
      DocumentComposerService.getThumbnail(101, artifact.id, 1),
      (error: unknown) => error instanceof AppError && error.statusCode === 403
    );
  } finally {
    await removeArtifactThumbnailCache(artifact);
  }
});

test('returns 404 for a missing artifact', async () => {
  mockArtifactLookup(null);

  await assert.rejects(
    DocumentComposerService.getThumbnail(101, randomUUID(), 1),
    (error: unknown) => error instanceof AppError && error.statusCode === 404
  );
});

test('returns 404 when the artifact is not a PDF', async () => {
  const artifact = createArtifact({ mimeType: 'image/jpeg' });
  mockArtifactLookup(artifact);

  await assert.rejects(
    DocumentComposerService.getThumbnail(artifact.ownerId, artifact.id, 1),
    (error: unknown) => error instanceof AppError && error.statusCode === 404
  );
});

test('returns 404 for page zero and for a page beyond pageCount', async () => {
  const artifact = createArtifact({ pageCount: 2 });
  mockArtifactLookup(artifact);

  await assert.rejects(
    DocumentComposerService.getThumbnail(artifact.ownerId, artifact.id, 0),
    (error: unknown) => error instanceof AppError && error.statusCode === 404
  );
  await assert.rejects(
    DocumentComposerService.getThumbnail(artifact.ownerId, artifact.id, 3),
    (error: unknown) => error instanceof AppError && error.statusCode === 404
  );
});

test('serves a cached thumbnail as JPEG bytes', async () => {
  const artifact = createArtifact();
  const jpeg = createSyntheticJpeg();
  const cachePaths = getThumbnailCachePaths(artifact, 1);
  try {
    await mkdir(cachePaths.artifactDirectory, {
      recursive: true,
      mode: 0o700,
    });
    await writeFile(cachePaths.absolutePath, jpeg, { mode: 0o600 });

    const result = await getOrStartDocumentThumbnail({
      artifact,
      sourcePath: 'unused.pdf',
      pageNumber: 1,
    });

    assert.equal(result.state, 'ready');
    if (result.state !== 'ready') return;
    assert.equal(result.contentType, 'image/jpeg');
    assert.deepEqual(result.buffer, jpeg);
  } finally {
    await removeArtifactThumbnailCache(artifact);
  }
});

test('returns 202 with Retry-After while generation is pending', async () => {
  mockAuthenticatedUser();
  const pendingResult: Awaited<
    ReturnType<typeof DocumentComposerService.getThumbnail>
  > = {
    state: 'pending',
    retryAfterSeconds: 1,
  };
  mock.method(
    DocumentComposerService,
    'getThumbnail',
    async () => pendingResult
  );

  await withTestServer(async baseUrl => {
    const token = jwt.sign({ id: 101 }, SECRET);
    const response = await fetch(
      `${baseUrl}/api/v1/document-composer/artifacts/${randomUUID()}/pages/1/thumbnail`,
      {
        headers: { Authorization: `Bearer ${token}` },
        redirect: 'manual',
      }
    );
    assert.equal(response.status, 202);
    assert.equal(response.headers.get('retry-after'), '1');
    assert.equal(await response.text(), '');
  });
});

test('returns 200 binary JPEG without ETag or 304 behavior', async () => {
  mockAuthenticatedUser();
  const jpeg = createSyntheticJpeg();
  const readyResult: Awaited<
    ReturnType<typeof DocumentComposerService.getThumbnail>
  > = {
    state: 'ready',
    contentType: 'image/jpeg',
    buffer: jpeg,
  };
  mock.method(DocumentComposerService, 'getThumbnail', async () => readyResult);

  await withTestServer(async baseUrl => {
    const token = jwt.sign({ id: 101 }, SECRET);
    const response = await fetch(
      `${baseUrl}/api/v1/document-composer/artifacts/${randomUUID()}/pages/1/thumbnail`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'If-None-Match': '*',
        },
        redirect: 'manual',
      }
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/jpeg');
    assert.equal(response.headers.get('etag'), null);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), jpeg);
  });
});

test('deduplicates concurrent generation jobs for the same cache key', async () => {
  const artifact = createArtifact();
  const jpeg = createSyntheticJpeg();
  let releaseJob: () => void = () => undefined;
  const jobGate = new Promise<void>(resolve => {
    releaseJob = resolve;
  });
  const renderMock = mock.method(
    pdfThumbnailService,
    'renderPdfPageThumbnail',
    async (_sourcePath: string, _pageNumber: number, outputPrefix: string) => {
      await jobGate;
      const outputPath = `${outputPrefix}.jpg`;
      await writeFile(outputPath, jpeg);
      return outputPath;
    }
  );

  try {
    const [first, second] = await Promise.all([
      getOrStartDocumentThumbnail({
        artifact,
        sourcePath: 'source.pdf',
        pageNumber: 1,
      }),
      getOrStartDocumentThumbnail({
        artifact,
        sourcePath: 'source.pdf',
        pageNumber: 1,
      }),
    ]);
    assert.equal(first.state, 'pending');
    assert.equal(second.state, 'pending');

    await waitFor(() => renderMock.mock.callCount() === 1);
    releaseJob();
    const cachePaths = getThumbnailCachePaths(artifact, 1);
    await waitFor(() => fileExists(cachePaths.absolutePath));

    const ready = await getOrStartDocumentThumbnail({
      artifact,
      sourcePath: 'source.pdf',
      pageNumber: 1,
    });
    assert.equal(ready.state, 'ready');
    assert.equal(renderMock.mock.callCount(), 1);
  } finally {
    releaseJob();
    await removeArtifactThumbnailCache(artifact);
  }
});

test('enforces the configured thumbnail maximum width', () => {
  const valid = createSyntheticJpeg(
    DOCUMENT_COMPOSER_LIMITS.thumbnailMaxWidth,
    280
  );
  const oversized = createSyntheticJpeg(
    DOCUMENT_COMPOSER_LIMITS.thumbnailMaxWidth + 1,
    280
  );

  assert.equal(
    pdfThumbnailService.validateThumbnailBuffer(valid).width,
    DOCUMENT_COMPOSER_LIMITS.thumbnailMaxWidth
  );
  assert.throws(
    () => pdfThumbnailService.validateThumbnailBuffer(oversized),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'DOCUMENT_THUMBNAIL_GENERATION_FAILED'
  );
  assert.deepEqual(
    pdfThumbnailService
      .buildPdfThumbnailArgs('source.pdf', 2, 'thumbnail')
      .slice(5, 9),
    [
      '-scale-to-x',
      String(DOCUMENT_COMPOSER_LIMITS.thumbnailMaxWidth),
      '-scale-to-y',
      '-1',
    ]
  );
});

test('special artifact IDs cannot escape the private thumbnail root', () => {
  assert.throws(
    () =>
      parseThumbnailRequest({
        params: {
          artifactId: '../../outside',
          pageNumber: '1',
        },
      }),
    (error: unknown) => error instanceof AppError && error.statusCode === 404
  );

  const paths = getThumbnailCachePaths(
    { id: '../../outside', sha256: '../hash' },
    1
  );
  const relative = path.relative(
    DOCUMENT_COMPOSER_THUMBNAIL_ROOT,
    paths.absolutePath
  );
  assert.equal(relative.startsWith('..'), false);
  assert.equal(path.isAbsolute(relative), false);
  assert.equal(paths.absolutePath.includes('../../outside'), false);
});

test('generation failures leave no published or partial cache file', async () => {
  const artifact = createArtifact();
  const cachePaths = getThumbnailCachePaths(artifact, 1);
  const renderMock = mock.method(
    pdfThumbnailService,
    'renderPdfPageThumbnail',
    async (_sourcePath: string, _pageNumber: number, outputPrefix: string) => {
      await writeFile(`${outputPrefix}.jpg`, Buffer.from('partial'));
      throw new Error('renderer failed');
    }
  );

  try {
    const result = await getOrStartDocumentThumbnail({
      artifact,
      sourcePath: 'source.pdf',
      pageNumber: 1,
    });
    assert.equal(result.state, 'pending');
    await waitFor(() => renderMock.mock.callCount() === 1);

    let observedError: unknown;
    await waitFor(async () => {
      try {
        await getOrStartDocumentThumbnail({
          artifact,
          sourcePath: 'source.pdf',
          pageNumber: 1,
        });
        return false;
      } catch (error) {
        observedError = error;
        return true;
      }
    });

    assert.equal(await fileExists(cachePaths.absolutePath), false);
    const entries = (await fileExists(cachePaths.artifactDirectory))
      ? await readdir(cachePaths.artifactDirectory)
      : [];
    assert.deepEqual(entries, []);
    assert.equal(
      observedError instanceof AppError ? observedError.statusCode : undefined,
      500
    );
  } finally {
    await removeArtifactThumbnailCache(artifact);
  }
});

test('thumbnail generation does not mutate the PDF, manifest, or page order', async () => {
  const ownerId = 900_000_000;
  const artifactId = randomUUID();
  const storageKey = path.join(String(ownerId), `${artifactId}.pdf`);
  const sourcePath = getArtifactAbsolutePath(storageKey);
  const sourceBytes = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
  const manifest = {
    version: 1,
    items: [
      {
        id: 'page-b',
        kind: 'pdfPage',
        sourceArtifactId: artifactId,
        pageNumber: 2,
        order: 2,
      },
      {
        id: 'page-a',
        kind: 'pdfPage',
        sourceArtifactId: artifactId,
        pageNumber: 1,
        order: 1,
      },
    ],
  };
  const artifact = createArtifact({
    id: artifactId,
    ownerId,
    storageKey,
    manifest,
    sha256: createHash('sha256').update(sourceBytes).digest('hex'),
  });
  const jpeg = createSyntheticJpeg();
  await mkdir(path.dirname(sourcePath), { recursive: true });
  await writeFile(sourcePath, sourceBytes);
  const beforeStat = await stat(sourcePath);
  const manifestSnapshot = JSON.parse(JSON.stringify(artifact.manifest));

  mockArtifactLookup(artifact);
  let updateCalls = 0;
  replacePrismaMethod('update', async () => {
    updateCalls += 1;
    return artifact;
  });
  mock.method(
    pdfThumbnailService,
    'renderPdfPageThumbnail',
    async (
      rendererSourcePath: string,
      _pageNumber: number,
      outputPrefix: string
    ) => {
      assert.deepEqual(await readFile(rendererSourcePath), sourceBytes);
      const outputPath = `${outputPrefix}.jpg`;
      await writeFile(outputPath, jpeg);
      return outputPath;
    }
  );

  try {
    const pending = await DocumentComposerService.getThumbnail(
      ownerId,
      artifact.id,
      1
    );
    assert.equal(pending.state, 'pending');
    const cachePaths = getThumbnailCachePaths(artifact, 1);
    await waitFor(() => fileExists(cachePaths.absolutePath));
    const ready = await DocumentComposerService.getThumbnail(
      ownerId,
      artifact.id,
      1
    );
    assert.equal(ready.state, 'ready');

    const afterStat = await stat(sourcePath);
    assert.deepEqual(await readFile(sourcePath), sourceBytes);
    assert.equal(afterStat.mtimeMs, beforeStat.mtimeMs);
    assert.deepEqual(artifact.manifest, manifestSnapshot);
    assert.equal(updateCalls, 0);
  } finally {
    await removeArtifactThumbnailCache(artifact);
    await removeComposerPath(sourcePath);
  }
});

// Local-only integration harness: production streaming/range/chunk code, no production DB or accounts.
import express from 'express';
import { createReadStream } from 'fs';
import { mkdir, readFile, writeFile, rm } from 'fs/promises';
import path from 'path';
import { randomUUID, createHash } from 'crypto';

async function main() {
  const source = path.resolve(process.argv[2]);
  const root = path.resolve(process.argv[3]);
  await mkdir(root, { recursive: true });
  process.chdir(root);
  const { default: storage, createDesktopDocumentStorageKey } = await import(
    '../src/modules/desktop-documents/desktopDocuments.storage'
  );
  const { desktopTransfers, DESKTOP_CHUNK_BYTES } = await import(
    '../src/modules/desktop-documents/desktopDocuments.transfers'
  );
  const { sendDesktopVersion } = await import(
    '../src/modules/desktop-documents/desktopDocuments.download'
  );
  const { desktopRecoveries } = await import('../src/modules/desktop-documents/desktopDocuments.recovery');
  const documentId = randomUUID(),
    versionId = randomUUID(),
    ticket = 'T'.repeat(43);
  const key = createDesktopDocumentStorageKey(documentId, versionId);
  const metadata = await storage.importFile(key, source);
  const originalName = path.basename(source);
  const contentPath = await storage.contentPath(key);
  const contentRoute = `/desktop/documents/${documentId}/versions/${versionId}/content`;
  const transfersPath = `/desktop/documents/${documentId}/transfers`;
  const app = express();
  app.use(express.json());
  let peakRss = process.memoryUsage().rss,
    downloads = 0,
    resumed = false,
    interruptedUpload = false;
  let uploadedPath = '',
    uploadedHash = '',
    uploadCount = 0;
  const sampler = setInterval(() => {
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
  }, 50);
  sampler.unref();
  app.use('/api/v1', (req, res, next) => {
    if (req.header('Authorization') !== 'Bearer local-integration-test') {
      res.status(401).json({ message: 'Sesión de prueba requerida' });
      return;
    }
    next();
  });
  const descriptor = {
    document: { id: documentId, originalName },
    version: { id: versionId, ...metadata },
    contentPath: contentRoute,
    savePath: `/desktop/documents/${documentId}/versions`,
    transferPath: transfersPath,
    maxFileBytes: 4 * 1024 ** 3,
  };
  app.post(`/api/v1/desktop/documents/launches/${ticket}/redeem`, (_req, res) =>
    res.json({ launch: descriptor })
  );
  const recoveryRoute = `/api/v1/desktop/documents/${documentId}/recoveries`;
  app.get(recoveryRoute, async (_req, res) => res.json({ recoveries: await desktopRecoveries.list(documentId, 73) }));
  app.put(recoveryRoute + '/:checksum', async (req, res) => res.status(201).json({
    recovery: await desktopRecoveries.save(documentId, 73, req.params.checksum, req.get('X-Base-Version-Id')!, req),
  }));
  app.get(recoveryRoute + '/:checksum/content', async (req, res) => {
    const saved = await desktopRecoveries.content(documentId, 73, req.params.checksum);
    sendDesktopVersion(res, saved.path, { originalName, mimeType: 'application/octet-stream', checksumSha256: saved.entry.checksum });
  });
  app.get(`/api/v1${contentRoute}`, (req, res) => {
    downloads++;
    if (req.header('Range')) resumed = true;
    if (downloads === 1) {
      // Simulate a network drop after 16 MiB, retaining a valid prefix on the client.
      res.set({
        'Content-Length': String(metadata.sizeBytes),
        ETag: `"${metadata.checksumSha256}"`,
      });
      const stream = createReadStream(contentPath, {
        start: 0,
        end: 16 * 1024 ** 2 - 1,
      });
      stream.pipe(res, { end: false });
      stream.on('end', () => setTimeout(() => res.destroy(), 100));
      return;
    }
    sendDesktopVersion(res, contentPath, {
      originalName,
      mimeType: 'application/octet-stream',
      checksumSha256: metadata.checksumSha256,
    });
  });
  app.post(`/api/v1${transfersPath}`, async (req, res) =>
    res
      .status(201)
      .json({
        transfer: await desktopTransfers.create(req.body, documentId, 73),
      })
  );
  app.get(`/api/v1${transfersPath}/:id`, async (req, res) =>
    res.json({
      transfer: await desktopTransfers.status(
        await desktopTransfers.load(req.params.id, documentId, 73)
      ),
    })
  );
  app.put(`/api/v1${transfersPath}/:id/chunks/:index`, async (req, res) => {
    const transfer = await desktopTransfers.load(req.params.id, documentId, 73);
    await desktopTransfers.putChunk(transfer, Number(req.params.index), req);
    if (!interruptedUpload && req.params.index === '2') {
      interruptedUpload = true;
      res.destroy();
      return;
    }
    res.status(204).end();
  });
  app.post(`/api/v1${transfersPath}/:id/complete`, async (req, res) => {
    const transfer = await desktopTransfers.load(req.params.id, documentId, 73);
    uploadedPath = await desktopTransfers.assemble(transfer);
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(uploadedPath))
      hash.update(chunk);
    uploadedHash = hash.digest('hex');
    uploadCount++;
    res.status(201).json({ version: { id: randomUUID(), versionNumber: 2 } });
  });
  app.delete(`/api/v1${transfersPath}/:id`, async (req, res) => {
    await desktopTransfers.remove(req.params.id);
    res.status(204).end();
  });
  app.get('/results', (_req, res) =>
    res.json({
      ...metadata,
      uploadedHash,
      resumed,
      downloads,
      interruptedUpload,
      uploadCount,
      peakRss,
      chunkSize: DESKTOP_CHUNK_BYTES,
    })
  );
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => res.status(err.statusCode || 500).json({ message: err.message })
  );
  const server = app.listen(0, '127.0.0.1', async () => {
    const address = server.address() as { port: number };
    const config = {
      serverUrl: `http://127.0.0.1:${address.port}`,
      ticket,
      root,
      source,
      ...metadata,
    };
    await writeFile(
      path.join(root, 'harness.json'),
      JSON.stringify(config, null, 2)
    );
    console.log(JSON.stringify({ ready: true, ...config }));
  });
}
void main().catch(error => {
  console.error(error);
  process.exit(1);
});

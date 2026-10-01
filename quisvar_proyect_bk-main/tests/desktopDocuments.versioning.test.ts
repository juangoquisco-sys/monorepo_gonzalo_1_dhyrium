import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'fs/promises';
import { randomUUID, createHash } from 'crypto';
import os from 'os';
import path from 'path';

// Inject a transaction-capable in-memory Prisma double before loading the service.
// No connection to the configured database is made by this suite.
test('versiona antes de publicar, conserva el original ante conflicto y recupera publicación fallida', async () => {
  const originalCwd = process.cwd();
  const root = await mkdtemp(path.join(os.tmpdir(), 'desktop-versioning-'));
  process.chdir(root);
  const documentId = randomUUID(),
    initialId = randomUUID();
  const events: string[] = [];
  let failPublication = false;
  let loseCommitResponse = false;
  let chain = Promise.resolve();
  const versions: any[] = [
    {
      id: initialId,
      documentId,
      versionNumber: 1,
      originalName: 'mapa.mpk',
      mimeType: 'application/octet-stream',
      sizeBytes: 3n,
      checksumSha256: createHash('sha256').update('old').digest('hex'),
      createdById: 73,
      createdAt: new Date(),
      source: 'ORIGINAL_IMPORT',
    },
  ];
  const document: any = {
    id: documentId,
    originalName: 'mapa.mpk',
    sourceKind: 'TASK_FILE',
    currentVersionNumber: 1,
    sourceFile: {
      id: 9,
      subTasksId: 4,
      dir: 'uploads/source',
      name: 'mapa.mpk',
    },
  };
  const fake: any = {
    desktopDocument: {
      findUnique: async () => ({ ...document, versions: [versions.at(-1)] }),
      updateMany: async ({ where, data }: any) => {
        if (document.currentVersionNumber !== where.currentVersionNumber)
          return { count: 0 };
        document.currentVersionNumber = data.currentVersionNumber;
        return { count: 1 };
      },
    },
    desktopDocumentVersion: {
      findFirst: async ({ where }: any) =>
        where.id
          ? versions.find(
              item =>
                item.id === where.id && item.documentId === where.documentId
            )
          : versions.at(-1),
      findUnique: async ({ where }: any) =>
        versions.find(item => item.id === where.id),
      create: async ({ data }: any) => {
        const version = { ...data, createdAt: new Date() };
        versions.push(version);
        events.push('version-created');
        return version;
      },
    },
    $executeRaw: async () => {
      events.push('lock');
      return 1;
    },
    $transaction: async (run: any) => {
      let unlock!: () => void;
      const previous = chain;
      chain = new Promise<void>(resolve => {
        unlock = resolve;
      });
      await previous;
      try {
        const result = await run(fake);
        events.push('commit');
        if (loseCommitResponse) {
          loseCommitResponse = false;
          throw new Error('commit response lost');
        }
        return result;
      } finally {
        unlock();
      }
    },
  };
  (globalThis as any).db = fake;
  try {
    const { default: service } = await import(
      '../src/modules/desktop-documents/desktopDocuments.service'
    );
    const { default: storage } = await import(
      '../src/modules/desktop-documents/desktopDocuments.storage'
    );
    const { repairDesktopPublications } = await import(
      '../src/modules/desktop-documents/desktopDocuments.publication'
    );
    const replaceSource = storage.replaceSource.bind(storage);
    storage.replaceSource = async (...args) => {
      events.push('publish');
      if (failPublication) throw new Error('disk temporarily unavailable');
      return replaceSource(...args);
    };
    service.loadAccessibleDocument = async () => ({ ...document } as never);
    await mkdir('uploads/source', { recursive: true });
    await writeFile('uploads/source/mapa.mpk', 'old');
    await writeFile('incoming.mpk', 'first new content');
    const input = {
      documentId,
      baseVersionId: initialId,
      user: { id: 73 } as never,
      file: {
        path: path.join(root, 'incoming.mpk'),
        size: 17,
        originalname: 'mapa.mpk',
        mimetype: 'application/octet-stream',
      } as Express.Multer.File,
    };
    const saved = await service.saveVersion(input);
    assert.equal(saved.versionNumber, 2);
    assert.ok(events.indexOf('publish') > events.indexOf('commit'));
    assert.equal(
      await readFile('uploads/source/mapa.mpk', 'utf8'),
      'first new content'
    );
    await assert.rejects(
      service.saveVersion(input),
      (error: any) => error.code === 'DESKTOP_DOCUMENT_VERSION_CONFLICT'
    );
    assert.equal(versions.length, 2);
    failPublication = true;
    await writeFile('incoming.mpk', 'second new content');
    const pending = await service.saveVersion({
      ...input,
      baseVersionId: saved.id,
      file: { ...input.file, size: 18 },
    });
    assert.equal(pending.versionNumber, 3);
    assert.equal((pending as any).sourcePublicationPending, true);
    assert.equal(
      await readFile('uploads/source/mapa.mpk', 'utf8'),
      'first new content'
    );
    assert.equal(
      (await readdir('uploads/desktop-documents/.publication')).length,
      1
    );
    failPublication = false;
    await repairDesktopPublications();
    assert.equal(
      await readFile('uploads/source/mapa.mpk', 'utf8'),
      'second new content'
    );
    assert.equal(
      (await readdir('uploads/desktop-documents/.publication')).length,
      0
    );
    await writeFile('incoming.mpk', 'third new content');
    loseCommitResponse = true;
    await assert.rejects(
      service.saveVersion({ ...input, baseVersionId: pending.id }),
      /commit response lost/
    );
    assert.equal(versions.length, 4);
    assert.equal(
      await readFile(
        storage.resolveStorageKey(versions.at(-1).storageKey),
        'utf8'
      ),
      'third new content'
    );
    await repairDesktopPublications();
    assert.equal(
      await readFile('uploads/source/mapa.mpk', 'utf8'),
      'third new content'
    );
  } finally {
    process.chdir(originalCwd);
    await rm(root, { recursive: true, force: true });
    delete (globalThis as any).db;
  }
});

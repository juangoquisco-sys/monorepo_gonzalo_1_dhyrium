import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, stat, writeFile } from 'fs/promises';
import { createReadStream } from 'fs';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { createHash, randomUUID } from 'crypto';
import { writeDesktopStream } from '../src/modules/desktop-documents/desktopDocuments.storage';
import {
  DesktopTransferStore,
  DESKTOP_CHUNK_BYTES,
} from '../src/modules/desktop-documents/desktopDocuments.transfers';
import {
  assertDesktopDocumentSize,
  MAX_DESKTOP_DOCUMENT_BYTES,
} from '../src/modules/desktop-documents/desktopDocuments.domain';

test('admite el MPK real de 2.4 GB sin reservar su tamaño en RAM', () => {
  assert.doesNotThrow(() => assertDesktopDocumentSize(2417326618));
  assert.throws(() =>
    assertDesktopDocumentSize(MAX_DESKTOP_DOCUMENT_BYTES + 1)
  );
});

test('streaming verifica huella y elimina escrituras incompletas o excesivas', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'desktop-stream-'));
  try {
    const file = path.join(root, 'complete');
    const metadata = await writeDesktopStream(
      Readable.from([Buffer.from('abc'), Buffer.from('def')]),
      file
    );
    assert.equal(metadata.sizeBytes, 6);
    assert.equal(
      metadata.checksumSha256,
      createHash('sha256').update('abcdef').digest('hex')
    );
    await assert.rejects(
      writeDesktopStream(
        Readable.from([Buffer.alloc(10)]),
        path.join(root, 'too-large'),
        9
      )
    );
    await assert.rejects(stat(path.join(root, 'too-large')));
    async function* broken() {
      yield Buffer.from('partial');
      throw new Error('network interrupted');
    }
    await assert.rejects(
      writeDesktopStream(Readable.from(broken()), path.join(root, 'broken'))
    );
    await assert.rejects(stat(path.join(root, 'broken')));
    await assert.rejects(
      writeDesktopStream(
        createReadStream(path.join(root, 'missing-source')),
        path.join(root, 'missing-target')
      )
    );
    await assert.rejects(stat(path.join(root, 'missing-target')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('la limpieza no elimina una transferencia mientras se está finalizando', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'desktop-transfer-lease-'));
  try {
    const store = new DesktopTransferStore(root);
    const created = await store.create(
      {
        baseVersionId: randomUUID(),
        originalName: 'mapa.mpk',
        sizeBytes: 1,
        checksumSha256: createHash('sha256').update('x').digest('hex'),
      },
      randomUUID(),
      73
    );
    const transfer = await store.load(created.id, created.documentId, 73);
    await writeFile(
      path.join(root, transfer.id, 'manifest.json'),
      JSON.stringify({ ...transfer, expiresAt: Date.now() - 1 })
    );
    await store.withLease(transfer, async () => {
      await store.cleanup();
      await stat(path.join(root, transfer.id, 'manifest.json'));
    });
    await store.cleanup();
    await assert.rejects(stat(path.join(root, transfer.id)));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('reanuda bloques tras reinicio, aísla usuarios y rechaza bloques adulterados', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'desktop-transfers-'));
  try {
    const store = new DesktopTransferStore(root);
    const first = Buffer.alloc(DESKTOP_CHUNK_BYTES, 7);
    const last = Buffer.from('final');
    const documentId = randomUUID();
    const created = await store.create(
      {
        baseVersionId: randomUUID(),
        originalName: 'mapa.mpk',
        sizeBytes: first.length + last.length,
        checksumSha256: createHash('sha256')
          .update(first)
          .update(last)
          .digest('hex'),
      },
      documentId,
      73
    );
    const transfer = await store.load(created.id, documentId, 73);
    await assert.rejects(store.load(created.id, documentId, 74));
    await assert.rejects(store.load(created.id, randomUUID(), 73));
    await store.putChunk(transfer, 0, Readable.from([first]));
    await store.putChunk(transfer, 0, Readable.from([first]));
    await assert.rejects(
      store.putChunk(
        transfer,
        0,
        Readable.from([Buffer.alloc(first.length, 8)])
      )
    );
    await assert.rejects(store.assemble(transfer));
    const restarted = new DesktopTransferStore(root);
    assert.deepEqual((await restarted.status(transfer)).receivedChunks, [0]);
    await assert.rejects(
      restarted.putChunk(transfer, 1, Readable.from([Buffer.from('x')]))
    );
    await restarted.putChunk(transfer, 1, Readable.from([last]));
    const file = await restarted.assemble(transfer);
    assert.equal((await stat(file)).size, first.length + last.length);
    assert.deepEqual((await readFile(file)).subarray(-5), last);
    await assert.rejects(store.remove('../outside'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

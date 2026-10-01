import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, readdir, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { createHash, randomUUID } from 'crypto';
import { DesktopRecoveryStore } from '../src/modules/desktop-documents/desktopDocuments.recovery';

test('recuperaciones: copia durable, idempotencia, aislamiento por documento/autor e integridad', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'desktop-recovery-'));
  const store = new DesktopRecoveryStore(root);
  const document = randomUUID();
  const base = randomUUID();
  const bytes = Buffer.from('AC1032 dibujo recuperable sin publicar');
  const hash = createHash('sha256').update(bytes).digest('hex');
  try {
    const first = await store.save(document, 1, hash, base, Readable.from([bytes]));
    assert.deepEqual(await store.save(document, 1, hash, base, Readable.from([bytes])), first);
    assert.equal((await store.list(document, 1)).length, 1);
    assert.deepEqual(await store.list(document, 2), []);
    await assert.rejects(store.content(document, 2, hash), /no existe/);
    await assert.rejects(store.content(randomUUID(), 1, hash), /no existe/);
    const saved = await store.content(document, 1, hash);
    assert.deepEqual(await readFile(saved.path), bytes);
    await assert.rejects(store.save(document, 1, 'a'.repeat(64), base, Readable.from([bytes])), /incompleta/);
    const invalid = Buffer.from('invalido');
    await assert.rejects(store.save(document, 1, createHash('sha256').update(invalid).digest('hex'), base, Readable.from([invalid])), /encabezado/);
    const interrupted = Readable.from((async function* () { yield bytes; throw new Error('conexión interrumpida'); })());
    await assert.rejects(store.save(document, 1, hash, base, interrupted), /interrumpida/);
    assert.deepEqual(await readFile(saved.path), bytes);
    assert.equal((await readdir(path.dirname(saved.path))).filter(name => name.includes('.tmp')).length, 0);
    await assert.rejects(store.content('../escape', 1, hash));
  } finally { await rm(root, { recursive: true, force: true }); }
});

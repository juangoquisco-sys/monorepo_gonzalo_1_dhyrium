import { createReadStream } from 'fs';
import {
  mkdir,
  readFile,
  writeFile,
  readdir,
  stat,
  rm,
  link,
} from 'fs/promises';
import { Readable } from 'stream';
import path from 'path';
import { randomUUID, createHash } from 'crypto';
import { z } from 'zod';
import AppError from '@/utils/appError';
import {
  DESKTOP_VAULT_ROOT,
  writeDesktopStream,
} from './desktopDocuments.storage';
import { MAX_DESKTOP_DOCUMENT_BYTES } from './desktopDocuments.domain';

export const DESKTOP_CHUNK_BYTES = 8 * 1024 ** 2;
const TTL_MS = 24 * 60 * 60 * 1000;
const uuid = z.string().uuid();
export const transferInputSchema = z
  .object({
    baseVersionId: uuid,
    originalName: z.string().min(1).max(280),
    sizeBytes: z.number().int().positive().max(MAX_DESKTOP_DOCUMENT_BYTES),
    checksumSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/i)
      .transform(value => value.toLowerCase()),
  })
  .strict();
const manifestSchema = transferInputSchema.extend({
  id: uuid,
  documentId: uuid,
  userId: z.number().int().positive(),
  expiresAt: z.number(),
});
export type DesktopTransfer = z.infer<typeof manifestSchema>;

export class DesktopTransferStore {
  private readonly activeTransfers = new Set<string>();

  constructor(
    private readonly root = path.join(DESKTOP_VAULT_ROOT, '.transfers')
  ) {}

  private directory(id: string) {
    return path.join(this.root, uuid.parse(id));
  }

  async create(
    input: z.infer<typeof transferInputSchema>,
    documentId: string,
    userId: number
  ) {
    await mkdir(this.root, { recursive: true });
    await this.cleanup();
    const manifests = await this.list();
    if (manifests.filter(item => item.userId === userId).length >= 3) {
      throw new AppError(
        'Ya tiene tres transferencias pendientes. Reanude o cancele una.',
        429,
        'DESKTOP_TRANSFER_QUOTA'
      );
    }
    const transfer = manifestSchema.parse({
      ...input,
      documentId,
      userId,
      id: randomUUID(),
      expiresAt: Date.now() + TTL_MS,
    });
    const directory = this.directory(transfer.id);
    await mkdir(directory);
    await writeFile(
      path.join(directory, 'manifest.json'),
      JSON.stringify(transfer),
      { flag: 'wx' }
    );
    return this.status(transfer);
  }

  async load(id: string, documentId: string, userId: number) {
    let transfer: DesktopTransfer;
    try {
      transfer = manifestSchema.parse(
        JSON.parse(
          await readFile(path.join(this.directory(id), 'manifest.json'), 'utf8')
        )
      );
    } catch {
      throw new AppError(
        'La transferencia no existe.',
        404,
        'DESKTOP_TRANSFER_NOT_FOUND'
      );
    }
    if (
      transfer.userId !== userId ||
      transfer.documentId !== documentId ||
      transfer.expiresAt <= Date.now()
    ) {
      throw new AppError(
        'La transferencia venció o no pertenece a su sesión.',
        404,
        'DESKTOP_TRANSFER_NOT_FOUND'
      );
    }
    return transfer;
  }

  /**
   * The maintenance sweep runs in this same process.  A transfer can be close
   * to expiry while its final assembly is being copied into the document vault;
   * never remove that directory mid-copy.
   */
  async withLease<T>(transfer: DesktopTransfer, action: () => Promise<T>) {
    this.activeTransfers.add(transfer.id);
    try {
      return await action();
    } finally {
      this.activeTransfers.delete(transfer.id);
    }
  }

  async status(transfer: DesktopTransfer) {
    const names = await readdir(this.directory(transfer.id));
    return {
      ...transfer,
      chunkSize: DESKTOP_CHUNK_BYTES,
      receivedChunks: names
        .filter(name => /^\d+\.chunk$/.test(name))
        .map(name => Number(name.split('.')[0]))
        .sort((a, b) => a - b),
    };
  }

  async putChunk(transfer: DesktopTransfer, index: number, source: Readable) {
    const expectedSize = Math.min(
      DESKTOP_CHUNK_BYTES,
      transfer.sizeBytes - index * DESKTOP_CHUNK_BYTES
    );
    if (!Number.isSafeInteger(index) || index < 0 || expectedSize <= 0) {
      throw new AppError(
        'Bloque fuera de la transferencia.',
        422,
        'DESKTOP_TRANSFER_CHUNK_INVALID'
      );
    }
    const directory = this.directory(transfer.id);
    const temporary = path.join(directory, `${randomUUID()}.tmp`);
    const target = path.join(directory, `${index}.chunk`);
    try {
      const metadata = await writeDesktopStream(
        source,
        temporary,
        expectedSize
      );
      if (metadata.sizeBytes !== expectedSize)
        throw new AppError(
          'El bloque llegó incompleto.',
          422,
          'DESKTOP_TRANSFER_CHUNK_INCOMPLETE'
        );
      try {
        await link(temporary, target);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        const hash = createHash('sha256');
        for await (const chunk of createReadStream(target)) hash.update(chunk);
        if (hash.digest('hex') !== metadata.checksumSha256) {
          throw new AppError(
            'El bloque ya existe con otro contenido.',
            409,
            'DESKTOP_TRANSFER_CHUNK_CONFLICT'
          );
        }
      }
      return metadata;
    } finally {
      await rm(temporary, { force: true });
    }
  }

  async assemble(transfer: DesktopTransfer) {
    const directory = this.directory(transfer.id);
    const assembled = path.join(directory, `${randomUUID()}.assembled`);
    const count = Math.ceil(transfer.sizeBytes / DESKTOP_CHUNK_BYTES);
    async function* chunks() {
      for (let index = 0; index < count; index++) {
        const source = path.join(directory, `${index}.chunk`);
        const expected = Math.min(
          DESKTOP_CHUNK_BYTES,
          transfer.sizeBytes - index * DESKTOP_CHUNK_BYTES
        );
        if ((await stat(source)).size !== expected)
          throw new Error('Bloque incompleto');
        yield* createReadStream(source);
      }
    }
    try {
      const metadata = await writeDesktopStream(
        Readable.from(chunks()),
        assembled,
        transfer.sizeBytes
      );
      if (
        metadata.sizeBytes !== transfer.sizeBytes ||
        metadata.checksumSha256 !== transfer.checksumSha256
      ) {
        throw new AppError(
          'La huella del archivo recibido no coincide. Reinicie la transferencia.',
          422,
          'DESKTOP_TRANSFER_CHECKSUM_MISMATCH'
        );
      }
      return assembled;
    } catch (error) {
      await rm(assembled, { force: true });
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new AppError(
          'Faltan bloques por enviar.',
          409,
          'DESKTOP_TRANSFER_INCOMPLETE'
        );
      }
      throw error;
    }
  }

  async remove(id: string) {
    // Only UUID directories under the fixed private transfer root are removable.
    await rm(this.directory(id), { recursive: true, force: true });
  }

  private async list() {
    const result: DesktopTransfer[] = [];
    for (const name of await readdir(this.root)) {
      if (!uuid.safeParse(name).success) continue;
      try {
        result.push(
          manifestSchema.parse(
            JSON.parse(
              await readFile(
                path.join(this.directory(name), 'manifest.json'),
                'utf8'
              )
            )
          )
        );
      } catch {
        /* An interrupted manifest creation is handled by age-based cleanup. */
      }
    }
    return result;
  }

  async cleanup() {
    await mkdir(this.root, { recursive: true });
    for (const name of await readdir(this.root)) {
      if (!uuid.safeParse(name).success) continue;
      if (this.activeTransfers.has(name)) continue;
      const directory = this.directory(name);
      const info = await stat(directory).catch(() => null);
      const transfer = await this.readManifest(name);
      if (
        info &&
        (Date.now() - info.birthtimeMs > TTL_MS ||
          (typeof transfer?.expiresAt === 'number' &&
            transfer.expiresAt <= Date.now()))
      )
        await this.remove(name);
    }
  }

  private async readManifest(id: string) {
    try {
      return manifestSchema.parse(
        JSON.parse(
          await readFile(path.join(this.directory(id), 'manifest.json'), 'utf8')
        )
      );
    } catch {
      return null;
    }
  }
}

export const desktopTransfers = new DesktopTransferStore();

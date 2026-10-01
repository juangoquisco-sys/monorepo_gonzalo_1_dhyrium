import { mkdir, readdir, readFile, rename, rm, open } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Readable } from 'stream';
import { z } from 'zod';
import AppError from '@/utils/appError';
import { DESKTOP_VAULT_ROOT, writeDesktopStream } from './desktopDocuments.storage';
import DesktopDocumentsService from './desktopDocuments.service';
import type { UserType } from '@/middlewares/auth.middleware';

export const recoveryParams = z.object({ documentId: z.string().uuid(), checksum: z.string().regex(/^[a-f0-9]{64}$/) });
const entrySchema = z.object({ checksum: recoveryParams.shape.checksum, sizeBytes: z.number().int().positive(), createdAt: z.string().datetime(), baseVersionId: z.string().uuid() });

// Recovery files never replace the published document or its version head.
// Access is checked by the service; copies are scoped to document AND author.
export class DesktopRecoveryStore {
  constructor(private readonly root = path.join(DESKTOP_VAULT_ROOT, '.recoveries')) {}

  private directory(documentId: string, userId: number) {
    return path.join(this.root, z.string().uuid().parse(documentId), String(z.number().int().positive().parse(userId)));
  }

  async list(documentId: string, userId: number) {
    const directory = this.directory(documentId, userId);
    const names = await readdir(directory).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    const entries = await Promise.all(names.filter(name => /^[a-f0-9]{64}\.json$/.test(name)).map(async name =>
      entrySchema.parse(JSON.parse(await readFile(path.join(directory, name), 'utf8')))));
    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async content(documentId: string, userId: number, checksum: string) {
    recoveryParams.parse({ documentId, checksum });
    const entry = (await this.list(documentId, userId)).find(item => item.checksum === checksum);
    if (!entry) throw new AppError('La copia de recuperación no existe.', 404, 'DESKTOP_RECOVERY_NOT_FOUND');
    return { entry, path: path.join(this.directory(documentId, userId), checksum + '.bin') };
  }

  async save(documentId: string, userId: number, checksum: string, baseVersionId: string, source: Readable) {
    recoveryParams.parse({ documentId, checksum });
    z.string().uuid().parse(baseVersionId);
    const directory = this.directory(documentId, userId);
    await mkdir(directory, { recursive: true });
    const temporary = path.join(directory, randomUUID() + '.tmp');
    const metadataTemporary = temporary + '.json';
    try {
      const result = await writeDesktopStream(source, temporary);
      if (result.checksumSha256 !== checksum)
        throw new AppError('La copia de recuperación llegó incompleta o cambió.', 422, 'DESKTOP_RECOVERY_CHECKSUM');
      // Validate the DWG signature, without claiming that the drawing is healthy.
      const header = Buffer.alloc(6);
      const file = await open(temporary, 'r');
      try { await file.read(header, 0, 6, 0); } finally { await file.close(); }
      if (!/^AC10\d{2}$/.test(header.toString('ascii')))
        throw new AppError('La copia no contiene un encabezado DWG válido.', 422, 'DESKTOP_RECOVERY_FORMAT');
      const existing = (await this.list(documentId, userId)).find(item => item.checksum === checksum);
      if (existing) return existing;
      const entry = { checksum, sizeBytes: result.sizeBytes, createdAt: new Date().toISOString(), baseVersionId };
      const metadata = await open(metadataTemporary, 'wx');
      try { await metadata.writeFile(JSON.stringify(entry)); await metadata.sync(); } finally { await metadata.close(); }
      await rename(temporary, path.join(directory, checksum + '.bin'));
      await rename(metadataTemporary, path.join(directory, checksum + '.json'));
      return entry;
    } finally {
      await rm(temporary, { force: true });
      await rm(metadataTemporary, { force: true });
    }
  }
}

export const desktopRecoveries = new DesktopRecoveryStore();

export async function authorizeDesktopRecovery(documentId: string, user: UserType) {
  const document = await DesktopDocumentsService.loadAccessibleDocument(documentId, user);
  if (path.extname(document.originalName).toLowerCase() !== '.dwg')
    throw new AppError('La recuperación de AutoCAD requiere un dibujo DWG.', 422, 'DESKTOP_RECOVERY_DOCUMENT_TYPE');
  return document;
}

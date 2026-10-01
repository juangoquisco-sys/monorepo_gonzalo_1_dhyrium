import { mkdir, open, realpath, rename, rm, stat, link } from 'fs/promises';
import { createReadStream } from 'fs';
import { Transform, Writable, type Readable } from 'stream';
import { pipeline } from 'stream/promises';
import path from 'path';
import { createHash, randomUUID } from 'crypto';
import AppError from '@/utils/appError';
import {
  assertDesktopDocumentSize,
  MAX_DESKTOP_DOCUMENT_BYTES,
  desktopSizeLimitMessage,
} from './desktopDocuments.domain';

export const DESKTOP_VAULT_ROOT = path.resolve(
  process.cwd(),
  'uploads',
  'desktop-documents'
);
export const DESKTOP_STAGING_ROOT = path.join(DESKTOP_VAULT_ROOT, '.staging');
const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');
const STORAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.bin$/i;

const assertInside = (root: string, target: string) => {
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new AppError(
      'La ubicación del archivo no está autorizada.',
      403,
      'DESKTOP_DOCUMENT_SOURCE_PATH_REJECTED'
    );
  }
};

export const createDesktopDocumentStorageKey = (
  documentId: string,
  versionId: string
) => path.posix.join(documentId, `${versionId}.bin`);

/** Bounded memory, incremental checksum, exclusive creation and fsync before publication. */
export async function writeDesktopStream(
  source: Readable,
  target: string,
  maxBytes = MAX_DESKTOP_DOCUMENT_BYTES
) {
  // createReadStream starts opening immediately.  Capture an open failure before
  // the asynchronous target open below so it is returned to the request instead
  // of becoming an uncaught EventEmitter error.
  let earlySourceError: Error | null = null;
  const captureEarlySourceError = (error: Error) => {
    earlySourceError ??= error;
  };
  source.on('error', captureEarlySourceError);
  const handle = await open(target, 'wx');
  let sizeBytes = 0;
  const hash = createHash('sha256');
  const meter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      sizeBytes += chunk.length;
      if (sizeBytes > maxBytes) {
        callback(
          new AppError(
            desktopSizeLimitMessage(),
            413,
            'DESKTOP_DOCUMENT_FILE_TOO_LARGE'
          )
        );
        return;
      }
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  let succeeded = false;
  try {
    if (earlySourceError) throw earlySourceError;
    await pipeline(
      source,
      meter,
      new Writable({
        write(chunk: Buffer, _encoding, callback) {
          void handle.writeFile(chunk).then(
            () => callback(),
            error => callback(error)
          );
        },
      })
    );
    assertDesktopDocumentSize(sizeBytes);
    await handle.sync();
    succeeded = true;
    return { sizeBytes, checksumSha256: hash.digest('hex') };
  } finally {
    source.off('error', captureEarlySourceError);
    await handle.close();
    if (!succeeded) await rm(target, { force: true });
  }
}

class DesktopDocumentsStorage {
  static resolveStorageKey(storageKey: string) {
    if (!STORAGE_KEY_PATTERN.test(storageKey)) {
      throw new AppError(
        'Referencia de almacenamiento inválida.',
        500,
        'DESKTOP_DOCUMENT_STORAGE_KEY_INVALID'
      );
    }
    return path.resolve(DESKTOP_VAULT_ROOT, storageKey);
  }

  static async importFile(storageKey: string, sourcePath: string) {
    const target = this.resolveStorageKey(storageKey);
    await mkdir(path.dirname(target), { recursive: true });
    await mkdir(DESKTOP_STAGING_ROOT, { recursive: true });
    const temporary = path.join(DESKTOP_STAGING_ROOT, `${randomUUID()}.tmp`);
    try {
      const metadata = await writeDesktopStream(
        createReadStream(sourcePath),
        temporary
      );
      await link(temporary, target);
      return metadata;
    } finally {
      await rm(temporary, { force: true });
    }
  }

  static async contentPath(storageKey: string) {
    const absolute = this.resolveStorageKey(storageKey);
    const info = await stat(absolute);
    assertDesktopDocumentSize(info.size);
    return absolute;
  }

  static async remove(storageKey: string) {
    await rm(this.resolveStorageKey(storageKey), { force: true });
  }

  static async resolveSourcePath(directory: string, fileName: string) {
    const directoryPath = path.resolve(
      process.cwd(),
      directory.replace(/\\/g, '/')
    );
    const candidate = path.resolve(directoryPath, path.basename(fileName));
    assertInside(UPLOADS_ROOT, candidate);
    try {
      const [root, realCandidate] = await Promise.all([
        realpath(UPLOADS_ROOT),
        realpath(candidate),
      ]);
      assertInside(root, realCandidate);
      const info = await stat(realCandidate);
      if (!info.isFile()) throw new Error('Not a file');
      assertDesktopDocumentSize(info.size);
      return realCandidate;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'El adjunto ya no está disponible.',
        404,
        'DESKTOP_DOCUMENT_SOURCE_MISSING'
      );
    }
  }

  static async replaceSource(
    directory: string,
    fileName: string,
    storageKey: string
  ) {
    const target = await this.resolveSourcePath(directory, fileName);
    const temporary = path.join(
      path.dirname(target),
      `.${path.basename(target)}.${randomUUID()}.desktop.tmp`
    );
    try {
      await writeDesktopStream(
        createReadStream(this.resolveStorageKey(storageKey)),
        temporary
      );
      await rename(temporary, target);
    } finally {
      await rm(temporary, { force: true });
    }
  }
}

export default DesktopDocumentsStorage;

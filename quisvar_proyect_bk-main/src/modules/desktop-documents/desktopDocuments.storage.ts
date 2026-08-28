import { mkdir, open, readFile, realpath, rename, rm, stat } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import AppError from '@/utils/appError';
import { assertDesktopDocumentBuffer } from './desktopDocuments.domain';

const VAULT_ROOT = path.resolve(process.cwd(), 'uploads', 'desktop-documents');
const STAGING_ROOT = path.join(VAULT_ROOT, '.staging');
const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');
const STORAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.bin$/i;

const assertInside = (root: string, target: string, code: string) => {
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new AppError(
      'La referencia de almacenamiento está fuera de la ubicación autorizada.',
      403,
      code
    );
  }
};

const resolveStorageKey = (storageKey: string) => {
  const normalized = storageKey.replace(/\\/g, '/');
  if (!STORAGE_KEY_PATTERN.test(normalized)) {
    throw new AppError(
      'La referencia de almacenamiento del documento no es válida.',
      500,
      'DESKTOP_DOCUMENT_STORAGE_KEY_INVALID'
    );
  }
  const absolute = path.resolve(VAULT_ROOT, normalized);
  assertInside(VAULT_ROOT, absolute, 'DESKTOP_DOCUMENT_STORAGE_KEY_INVALID');
  return absolute;
};

export const createDesktopDocumentStorageKey = (
  documentId: string,
  versionId: string
) => path.posix.join(documentId, `${versionId}.bin`);

class DesktopDocumentsStorage {
  static async writeImmutable(storageKey: string, buffer: Buffer) {
    assertDesktopDocumentBuffer(buffer);
    const target = resolveStorageKey(storageKey);
    await mkdir(path.dirname(target), { recursive: true });
    await mkdir(STAGING_ROOT, { recursive: true });
    const temporary = path.join(STAGING_ROOT, `${randomUUID()}.tmp`);
    const handle = await open(temporary, 'wx');
    try {
      await handle.writeFile(buffer);
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      await rename(temporary, target);
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
  }

  static async read(storageKey: string) {
    const buffer = await readFile(resolveStorageKey(storageKey));
    assertDesktopDocumentBuffer(buffer);
    return buffer;
  }

  static async remove(storageKey: string) {
    await rm(resolveStorageKey(storageKey), { force: true });
  }

  static async resolveSourcePath(directory: string, fileName: string) {
    const directoryPath = path.resolve(
      process.cwd(),
      directory.replace(/\\/g, '/')
    );
    const candidate = path.resolve(directoryPath, path.basename(fileName));
    assertInside(UPLOADS_ROOT, candidate, 'DESKTOP_DOCUMENT_SOURCE_PATH_REJECTED');

    try {
      const [realUploadsRoot, realCandidate] = await Promise.all([
        realpath(UPLOADS_ROOT),
        realpath(candidate),
      ]);
      assertInside(
        realUploadsRoot,
        realCandidate,
        'DESKTOP_DOCUMENT_SOURCE_PATH_REJECTED'
      );
      return realCandidate;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'El archivo adjunto ya no está disponible en el almacenamiento.',
        404,
        'DESKTOP_DOCUMENT_SOURCE_MISSING'
      );
    }
  }

  static async readSource(directory: string, fileName: string) {
    const absolutePath = await this.resolveSourcePath(directory, fileName);
    try {
      const fileStat = await stat(absolutePath);
      if (!fileStat.isFile()) {
        throw new AppError(
          'El adjunto solicitado no es un archivo válido.',
          404,
          'DESKTOP_DOCUMENT_SOURCE_MISSING'
        );
      }
      if (fileStat.size > 160 * 1024 * 1024) {
        throw new AppError(
          'El archivo supera el límite de 160 MB para Dhyrium Desktop.',
          413,
          'DESKTOP_DOCUMENT_FILE_TOO_LARGE'
        );
      }
      const buffer = await readFile(absolutePath);
      assertDesktopDocumentBuffer(buffer);
      return buffer;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'El archivo adjunto ya no está disponible en el almacenamiento.',
        404,
        'DESKTOP_DOCUMENT_SOURCE_MISSING'
      );
    }
  }

  /**
   * Replaces the file that the task already exposes to Dhyrium users.
   * The new Desktop version is written to its immutable vault first; this
   * method then publishes that saved content with an atomic same-directory
   * rename so normal downloads always receive the latest saved file.
   */
  static async replaceSource(
    directory: string,
    fileName: string,
    buffer: Buffer
  ) {
    assertDesktopDocumentBuffer(buffer);
    const target = await this.resolveSourcePath(directory, fileName);
    const temporary = path.join(
      path.dirname(target),
      `.${path.basename(target)}.${randomUUID()}.desktop.tmp`
    );
    const handle = await open(temporary, 'wx');
    try {
      await handle.writeFile(buffer);
      await handle.sync();
    } finally {
      await handle.close();
    }

    try {
      await rename(temporary, target);
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
  }
}

export default DesktopDocumentsStorage;

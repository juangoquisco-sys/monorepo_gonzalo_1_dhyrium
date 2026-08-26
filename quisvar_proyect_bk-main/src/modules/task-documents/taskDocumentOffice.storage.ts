import { mkdir, open, readFile, rename, rm, stat } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import AppError from '@/utils/appError';
import { assertDocxBuffer } from './taskDocumentOffice.domain';

const VAULT_ROOT = path.resolve(
  process.cwd(),
  'uploads',
  'task-document-files'
);
const STAGING_ROOT = path.join(VAULT_ROOT, '.staging');

const resolveStorageKey = (storageKey: string) => {
  const normalized = storageKey.replace(/\\/g, '/');
  const absolute = path.resolve(VAULT_ROOT, normalized);
  const relative = path.relative(VAULT_ROOT, absolute);
  if (
    !normalized ||
    relative.startsWith('..') ||
    path.isAbsolute(relative) ||
    !/\.docx$/i.test(absolute)
  ) {
    throw new AppError(
      'La referencia de almacenamiento del documento no es válida.',
      500,
      'TASK_DOCUMENT_STORAGE_KEY_INVALID'
    );
  }
  return absolute;
};

export const createStorageKey = (documentId: string, versionId: string) =>
  path.posix.join(documentId, `${versionId}.docx`);

class TaskDocumentOfficeStorage {
  static async writeImmutable(storageKey: string, buffer: Buffer) {
    assertDocxBuffer(buffer);
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
    assertDocxBuffer(buffer);
    return buffer;
  }

  static async size(storageKey: string) {
    return (await stat(resolveStorageKey(storageKey))).size;
  }

  static async remove(storageKey: string) {
    await rm(resolveStorageKey(storageKey), { force: true });
  }

  static resolveSourcePath(directory: string, fileName: string) {
    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    const directoryPath = path.resolve(
      process.cwd(),
      directory.replace(/\\/g, '/')
    );
    const absolute = path.resolve(directoryPath, path.basename(fileName));
    const relative = path.relative(uploadsRoot, absolute);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new AppError(
        'El archivo adjunto está fuera del almacenamiento autorizado.',
        403,
        'TASK_DOCUMENT_SOURCE_PATH_REJECTED'
      );
    }
    return absolute;
  }
}

export default TaskDocumentOfficeStorage;


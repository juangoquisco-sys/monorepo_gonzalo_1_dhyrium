import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import AppError from '@/utils/appError';

const root = () => path.resolve(process.cwd(), 'uploads', 'letter-archive-private');
export const letterArchiveStagingRoot = () => path.join(root(), '.staging');

export const isPrivateLetterArchivePath = (requestPath: string) => {
  const normalized = requestPath.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
  return normalized === 'letter-archive-private' || normalized.startsWith('letter-archive-private/');
};

const resolve = (storageKey: string) => {
  const target = path.resolve(root(), storageKey);
  const relative = path.relative(root(), target);
  if (!storageKey || path.isAbsolute(storageKey) || !relative || relative.startsWith('..') || path.isAbsolute(relative))
    throw new AppError('Ruta de archivo de carta inválida.', 400, 'LETTER_ARCHIVE_STORAGE_PATH_INVALID');
  return target;
};

const extension = (name: string) => {
  const value = path.extname(name).toLowerCase();
  return /^[a-z0-9.]{0,20}$/.test(value) ? value : '';
};

export const persistLetterArchiveFile = async (input: { stagedPath: string; rootId: string; documentId: string; originalName: string }) => {
  const stagedPath = path.resolve(input.stagedPath);
  if (!stagedPath.startsWith(path.resolve(letterArchiveStagingRoot())))
    throw new AppError('Archivo temporal inválido.', 400, 'LETTER_ARCHIVE_STAGING_INVALID');
  if (!existsSync(stagedPath)) throw new AppError('El archivo temporal ya no está disponible.', 409, 'LETTER_ARCHIVE_UPLOAD_MISSING');
  const storageKey = path.posix.join(input.rootId, input.documentId, `${randomUUID()}${extension(input.originalName)}`);
  const absolutePath = resolve(storageKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(stagedPath)) hash.update(chunk);
  await rename(stagedPath, absolutePath);
  return { storageKey, sha256: hash.digest('hex') };
};

export const resolveLetterArchiveFile = resolve;
export const removeLetterArchiveStagedFile = (filePath: string) => rm(filePath, { force: true });

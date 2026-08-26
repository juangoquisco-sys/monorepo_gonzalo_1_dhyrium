import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import AppError from '@/utils/appError';

export const corporateArchiveStorageRoot = () =>
  path.resolve(process.cwd(), 'uploads', 'corporate-archive-private');

export const corporateArchiveStagingRoot = () =>
  path.join(corporateArchiveStorageRoot(), '.staging');

export const isPrivateCorporateArchivePath = (requestPath: string) => {
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(requestPath);
  } catch {
    return true;
  }
  const normalized = decodedPath.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
  return normalized === 'corporate-archive-private' || normalized.startsWith('corporate-archive-private/');
};

const assertInside = (root: string, target: string, message: string) => {
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative))
    throw new AppError(message, 400, 'ARCHIVE_STORAGE_PATH_INVALID');
  return target;
};

export const resolveCorporateArchiveStoragePath = (storageKey: string) => {
  if (!storageKey || path.isAbsolute(storageKey))
    throw new AppError('Ruta de archivo corporativo inválida.', 400, 'ARCHIVE_STORAGE_PATH_INVALID');
  return assertInside(
    corporateArchiveStorageRoot(),
    path.resolve(corporateArchiveStorageRoot(), storageKey),
    'Ruta de archivo corporativo inválida.'
  );
};

export const createCorporateArchiveStagingPath = async () => {
  await mkdir(corporateArchiveStagingRoot(), { recursive: true });
  return path.join(corporateArchiveStagingRoot(), randomUUID());
};

const sha256File = async (filePath: string) => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
};

const safeExtension = (originalName: string) => {
  const extension = path.extname(originalName).toLowerCase();
  return /^[a-z0-9.]{0,20}$/.test(extension) ? extension : '';
};

export const persistCorporateArchiveFile = async (input: {
  stagedPath: string;
  rootId: string;
  documentId: string;
  versionId: string;
  originalName: string;
}) => {
  const stagingPath = assertInside(
    corporateArchiveStagingRoot(),
    path.resolve(input.stagedPath),
    'Archivo temporal inválido.'
  );
  if (!existsSync(stagingPath))
    throw new AppError('El archivo temporal ya no está disponible.', 409, 'ARCHIVE_UPLOAD_MISSING');
  const storageKey = path.posix.join(
    input.rootId,
    input.documentId,
    `${input.versionId}${safeExtension(input.originalName)}`
  );
  const absolutePath = resolveCorporateArchiveStoragePath(storageKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  const sha256 = await sha256File(stagingPath);
  await rename(stagingPath, absolutePath);
  return { storageKey, absolutePath, sha256 };
};

export const removeCorporateArchiveFile = async (storageKey: string) => {
  await rm(resolveCorporateArchiveStoragePath(storageKey), { force: true });
};

export const removeCorporateArchiveStagedFile = async (filePath: string) => {
  const resolved = assertInside(
    corporateArchiveStagingRoot(),
    path.resolve(filePath),
    'Archivo temporal inválido.'
  );
  await rm(resolved, { force: true });
};

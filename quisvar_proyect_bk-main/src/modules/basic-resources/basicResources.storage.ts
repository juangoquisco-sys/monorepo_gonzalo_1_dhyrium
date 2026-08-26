import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import AppError from '@/utils/appError';

const legacyStorageRoot = path.resolve(process.cwd(), 'public');

export const basicResourcesStorageRoot = () =>
  path.resolve(process.cwd(), 'uploads', 'basic-resources');

const assertRelativeStorageKey = (storageKey: string) => {
  const normalizedKey = storageKey.replaceAll('\\', '/');
  const resolved = path.resolve(basicResourcesStorageRoot(), normalizedKey);
  const relative = path.relative(basicResourcesStorageRoot(), resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new AppError('Ruta de recurso básico inválida', 400);
  }
  return { normalizedKey, resolved };
};

export const basicResourceStorageKey = (
  projectId: number,
  stageId: number,
  originalName: string
) => {
  const extension = path.extname(originalName).toLowerCase();
  return path.posix.join(
    String(projectId),
    String(stageId),
    `${randomUUID()}${extension}`
  );
};

export const basicResourceStoredFilename = (storageKey: string) =>
  path.posix.basename(assertRelativeStorageKey(storageKey).normalizedKey);

export const basicResourceUploadDirectory = (
  projectId: number,
  stageId: number
) => {
  const directory = path.join(
    basicResourcesStorageRoot(),
    String(projectId),
    String(stageId)
  );
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
  return directory;
};

export const resolveBasicResourceStoragePath = (storageKey: string) =>
  assertRelativeStorageKey(storageKey).resolved;

export const basicResourceStorageKeyFromPath = (filePath: string) => {
  const relative = path.relative(
    basicResourcesStorageRoot(),
    path.resolve(filePath)
  );
  const { normalizedKey } = assertRelativeStorageKey(relative);
  return normalizedKey;
};

export const isLegacyBasicResourceStorageKey = (storageKey: string) =>
  storageKey.replaceAll('\\', '/').startsWith('basic-resources/');

export const resolveLegacyBasicResourceStoragePath = (storageKey: string) => {
  const normalizedKey = storageKey.replaceAll('\\', '/');
  const resolved = path.resolve(legacyStorageRoot, normalizedKey);
  const relative = path.relative(legacyStorageRoot, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new AppError('Ruta histórica de recurso básico inválida', 400);
  }
  return resolved;
};

export const resolveExistingBasicResourcePath = (storageKey: string) => {
  const currentPath = resolveBasicResourceStoragePath(storageKey);
  if (existsSync(currentPath)) return currentPath;

  if (isLegacyBasicResourceStorageKey(storageKey)) {
    const legacyPath = resolveLegacyBasicResourceStoragePath(storageKey);
    if (existsSync(legacyPath)) return legacyPath;
  }
  return currentPath;
};

import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  DOCUMENT_COMPOSER_ROOT,
  DOCUMENT_COMPOSER_TEMP_ROOT,
} from './documentComposer.constants';

export const ensureDocumentComposerStorage = async () => {
  await mkdir(DOCUMENT_COMPOSER_ROOT, { recursive: true });
  await mkdir(DOCUMENT_COMPOSER_TEMP_ROOT, { recursive: true });
};

export const createComposerWorkDir = async () => {
  await ensureDocumentComposerStorage();
  const workDir = path.join(DOCUMENT_COMPOSER_TEMP_ROOT, randomUUID());
  await mkdir(workDir, { recursive: true });
  return workDir;
};

export const removeComposerPath = async (targetPath: string) => {
  await rm(targetPath, { recursive: true, force: true });
};

export const writeComposerFile = async (targetPath: string, buffer: Buffer) => {
  await writeFile(targetPath, buffer, { flag: 'wx' });
};

export const getArtifactAbsolutePath = (storageKey: string) => {
  const absolute = path.resolve(DOCUMENT_COMPOSER_ROOT, storageKey);
  const relative = path.relative(DOCUMENT_COMPOSER_ROOT, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Invalid artifact storage key');
  }
  return absolute;
};

export const persistArtifactFile = async (
  workFilePath: string,
  ownerId: number,
  artifactId: string
) => {
  const ownerDir = path.join(DOCUMENT_COMPOSER_ROOT, String(ownerId));
  await mkdir(ownerDir, { recursive: true });
  const storageKey = path.join(String(ownerId), `${artifactId}.pdf`);
  const absolutePath = getArtifactAbsolutePath(storageKey);
  await rename(workFilePath, absolutePath);
  return { storageKey, absolutePath };
};

export const readArtifactSize = async (absolutePath: string) =>
  (await stat(absolutePath)).size;

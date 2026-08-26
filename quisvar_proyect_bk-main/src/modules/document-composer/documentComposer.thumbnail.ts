import { createHash, randomUUID } from 'node:crypto';
import {
  chmod,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
} from 'node:fs/promises';
import path from 'node:path';
import AppError from '@/utils/appError';
import {
  DOCUMENT_COMPOSER_LIMITS,
  DOCUMENT_COMPOSER_THUMBNAIL_ROOT,
} from './documentComposer.constants';
import {
  renderPdfPageThumbnail,
  validateThumbnailBuffer,
} from './pdfThumbnail.service';

type ThumbnailArtifact = {
  id: string;
  sha256: string;
};

export type DocumentThumbnailResult =
  | {
      state: 'ready';
      contentType: 'image/jpeg';
      buffer: Buffer;
    }
  | {
      state: 'pending';
      retryAfterSeconds: number;
    };

const activeJobs = new Map<string, Promise<void>>();
const recentFailures = new Map<string, number>();
const invalidatedArtifactDirectories = new Map<string, number>();
const queuedJobs: Array<() => void> = [];
let runningJobs = 0;
const thumbnailJobCapacity =
  DOCUMENT_COMPOSER_LIMITS.thumbnailMaxConcurrentJobs +
  DOCUMENT_COMPOSER_LIMITS.thumbnailMaxQueuedJobs;

const hashValue = (value: string) =>
  createHash('sha256').update(value).digest('hex');

export const getThumbnailCachePaths = (
  artifact: ThumbnailArtifact,
  pageNumber: number
) => {
  const artifactKey = hashValue(`${artifact.id}:${artifact.sha256}`);
  const cacheKey = hashValue(
    [
      'jpeg-v1',
      artifact.id,
      artifact.sha256,
      pageNumber,
      DOCUMENT_COMPOSER_LIMITS.thumbnailMaxWidth,
      DOCUMENT_COMPOSER_LIMITS.thumbnailJpegQuality,
    ].join(':')
  );
  const artifactDirectory = path.join(
    DOCUMENT_COMPOSER_THUMBNAIL_ROOT,
    artifactKey
  );
  return {
    cacheKey,
    artifactDirectory,
    absolutePath: path.join(artifactDirectory, `${cacheKey}.jpg`),
  };
};

const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error;

const ensurePrivateDirectory = async (directory: string) => {
  await mkdir(directory, {
    recursive: true,
    mode: 0o700,
  });
  await chmod(directory, 0o700);
};

const pruneExpiredEntries = (entries: Map<string, number>, now: number) => {
  for (const [key, expiresAt] of entries) {
    if (expiresAt <= now) entries.delete(key);
  }
};

const pruneTransientState = (now = Date.now()) => {
  pruneExpiredEntries(recentFailures, now);
  pruneExpiredEntries(invalidatedArtifactDirectories, now);
};

const isArtifactInvalidated = (artifactDirectory: string) =>
  (invalidatedArtifactDirectories.get(artifactDirectory) || 0) > Date.now();

const readCachedThumbnail = async (absolutePath: string) => {
  try {
    const fileStat = await stat(absolutePath);
    if (
      Date.now() - fileStat.mtimeMs >
      DOCUMENT_COMPOSER_LIMITS.thumbnailCacheTtlMs
    ) {
      await rm(absolutePath, { force: true });
      return null;
    }
    const buffer = await readFile(absolutePath);
    validateThumbnailBuffer(buffer);
    return buffer;
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return null;
    if (
      error instanceof AppError &&
      error.code === 'DOCUMENT_THUMBNAIL_GENERATION_FAILED'
    ) {
      await rm(absolutePath, { force: true });
      return null;
    }
    throw error;
  }
};

const scheduleThumbnailJob = (job: () => Promise<void>) =>
  new Promise<void>((resolve, reject) => {
    const run = () => {
      runningJobs += 1;
      void job()
        .then(resolve, reject)
        .finally(() => {
          runningJobs -= 1;
          const next = queuedJobs.shift();
          if (next) next();
        });
    };

    if (runningJobs < DOCUMENT_COMPOSER_LIMITS.thumbnailMaxConcurrentJobs) {
      run();
      return;
    }
    queuedJobs.push(run);
  });

const generateAndPublishThumbnail = async (
  sourcePath: string,
  pageNumber: number,
  artifactDirectory: string,
  absolutePath: string
) => {
  await ensurePrivateDirectory(DOCUMENT_COMPOSER_THUMBNAIL_ROOT);
  await ensurePrivateDirectory(artifactDirectory);
  const workDirectory = path.join(artifactDirectory, `.tmp-${randomUUID()}`);
  await mkdir(workDirectory, { mode: 0o700 });
  const outputPrefix = path.join(workDirectory, 'thumbnail');

  try {
    if (isArtifactInvalidated(artifactDirectory)) {
      throw normalizeGenerationFailure();
    }
    const renderedPath = await renderPdfPageThumbnail(
      sourcePath,
      pageNumber,
      outputPrefix
    );
    if (isArtifactInvalidated(artifactDirectory)) {
      throw normalizeGenerationFailure();
    }
    await rename(renderedPath, absolutePath);
    await chmod(absolutePath, 0o600);
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }
};

const normalizeGenerationFailure = () =>
  new AppError(
    'No se pudo generar la miniatura del PDF.',
    500,
    'DOCUMENT_THUMBNAIL_GENERATION_FAILED'
  );

const startThumbnailJob = (
  cacheKey: string,
  sourcePath: string,
  pageNumber: number,
  artifactDirectory: string,
  absolutePath: string
) => {
  if (activeJobs.has(cacheKey) || activeJobs.size >= thumbnailJobCapacity)
    return;

  const trackedJob = scheduleThumbnailJob(() =>
    generateAndPublishThumbnail(
      sourcePath,
      pageNumber,
      artifactDirectory,
      absolutePath
    )
  )
    .catch(() => {
      recentFailures.set(
        cacheKey,
        Date.now() + DOCUMENT_COMPOSER_LIMITS.thumbnailFailureTtlMs
      );
    })
    .finally(() => {
      activeJobs.delete(cacheKey);
    });

  activeJobs.set(cacheKey, trackedJob);
};

export const getOrStartDocumentThumbnail = async (input: {
  artifact: ThumbnailArtifact;
  sourcePath: string;
  pageNumber: number;
}): Promise<DocumentThumbnailResult> => {
  pruneTransientState();
  const { cacheKey, artifactDirectory, absolutePath } = getThumbnailCachePaths(
    input.artifact,
    input.pageNumber
  );
  invalidatedArtifactDirectories.delete(artifactDirectory);
  const cached = await readCachedThumbnail(absolutePath);
  if (cached) {
    recentFailures.delete(cacheKey);
    return {
      state: 'ready',
      contentType: 'image/jpeg',
      buffer: cached,
    };
  }

  const failureExpiresAt = recentFailures.get(cacheKey);
  if (failureExpiresAt) {
    recentFailures.delete(cacheKey);
    if (failureExpiresAt > Date.now()) throw normalizeGenerationFailure();
  }

  startThumbnailJob(
    cacheKey,
    input.sourcePath,
    input.pageNumber,
    artifactDirectory,
    absolutePath
  );
  return {
    state: 'pending',
    retryAfterSeconds: DOCUMENT_COMPOSER_LIMITS.thumbnailRetryAfterSeconds,
  };
};

export const removeArtifactThumbnailCache = async (
  artifact: ThumbnailArtifact
) => {
  const { artifactDirectory } = getThumbnailCachePaths(artifact, 1);
  invalidatedArtifactDirectories.set(
    artifactDirectory,
    Date.now() + DOCUMENT_COMPOSER_LIMITS.thumbnailCacheTtlMs
  );
  await rm(artifactDirectory, { recursive: true, force: true });
};

export const cleanupExpiredThumbnailCache = async (now = Date.now()) => {
  pruneTransientState(now);
  try {
    const entries = await readdir(DOCUMENT_COMPOSER_THUMBNAIL_ROOT, {
      withFileTypes: true,
    });
    let removed = 0;
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const entryPath = path.join(DOCUMENT_COMPOSER_THUMBNAIL_ROOT, entry.name);
      try {
        const entryStat = await stat(entryPath);
        if (
          now - entryStat.mtimeMs <=
          DOCUMENT_COMPOSER_LIMITS.thumbnailCacheTtlMs
        ) {
          continue;
        }
        await rm(entryPath, { recursive: true, force: true });
        removed += 1;
      } catch (error) {
        if (!isNodeError(error) || error.code !== 'ENOENT') throw error;
      }
    }
    return { removed };
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return { removed: 0 };
    }
    throw error;
  }
};

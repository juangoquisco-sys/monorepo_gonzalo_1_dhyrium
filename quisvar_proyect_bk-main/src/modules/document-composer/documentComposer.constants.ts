import path from 'node:path';
import os from 'node:os';

export const DOCUMENT_COMPOSER_LIMITS = {
  maxImageBytes: 15 * 1024 * 1024,
  maxPdfBytes: 150 * 1024 * 1024,
  maxTotalBytes: 200 * 1024 * 1024,
  maxPages: 200,
  minImageDimension: 300,
  maxImageDimension: 12000,
  maxImagePixels: 80_000_000,
  artifactTtlMs: 24 * 60 * 60 * 1000,
  qpdfTimeoutMs: 60_000,
  thumbnailMaxWidth: 200,
  thumbnailMaxPixels: 1_000_000,
  thumbnailJpegQuality: 75,
  thumbnailCacheTtlMs: 24 * 60 * 60 * 1000,
  thumbnailRendererTimeoutMs: 20_000,
  thumbnailRetryAfterSeconds: 1,
  thumbnailMaxConcurrentJobs: 2,
  thumbnailMaxQueuedJobs: 100,
  thumbnailFailureTtlMs: 5_000,
} as const;

export const DOCUMENT_COMPOSER_ROOT = path.resolve(
  process.cwd(),
  'uploads',
  'document-composer'
);

export const DOCUMENT_COMPOSER_TEMP_ROOT = path.join(
  DOCUMENT_COMPOSER_ROOT,
  'tmp'
);

export const DOCUMENT_COMPOSER_THUMBNAIL_ROOT = path.resolve(
  os.tmpdir(),
  'quisvar-document-composer-thumbnails'
);

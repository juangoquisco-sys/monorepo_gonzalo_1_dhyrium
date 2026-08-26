import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import AppError from '@/utils/appError';
import { DOCUMENT_COMPOSER_LIMITS } from './documentComposer.constants';
import { readJpegDimensions } from './documentComposer.domain';

export const buildPdfThumbnailArgs = (
  sourcePath: string,
  pageNumber: number,
  outputPrefix: string
) => [
  '-f',
  String(pageNumber),
  '-l',
  String(pageNumber),
  '-singlefile',
  '-scale-to-x',
  String(DOCUMENT_COMPOSER_LIMITS.thumbnailMaxWidth),
  '-scale-to-y',
  '-1',
  '-jpeg',
  '-jpegopt',
  `quality=${DOCUMENT_COMPOSER_LIMITS.thumbnailJpegQuality},progressive=y,optimize=y`,
  sourcePath,
  outputPrefix,
];

const runPdfThumbnailRenderer = (
  args: readonly string[],
  timeout = DOCUMENT_COMPOSER_LIMITS.thumbnailRendererTimeoutMs
) =>
  new Promise<void>((resolve, reject) => {
    execFile(
      process.env.PDFTOPPM_PATH || 'pdftoppm',
      [...args],
      {
        timeout,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
        shell: false,
      },
      error => {
        if (error) {
          reject(
            new AppError(
              'No se pudo generar la miniatura del PDF.',
              500,
              'DOCUMENT_THUMBNAIL_GENERATION_FAILED'
            )
          );
          return;
        }
        resolve();
      }
    );
  });

export const validateThumbnailBuffer = (buffer: Buffer) => {
  const dimensions = readJpegDimensions(buffer);
  if (
    !dimensions ||
    dimensions.width < 1 ||
    dimensions.width > DOCUMENT_COMPOSER_LIMITS.thumbnailMaxWidth ||
    dimensions.height < 1 ||
    dimensions.width * dimensions.height >
      DOCUMENT_COMPOSER_LIMITS.thumbnailMaxPixels
  ) {
    throw new AppError(
      'La miniatura generada no es válida.',
      500,
      'DOCUMENT_THUMBNAIL_GENERATION_FAILED'
    );
  }
  return dimensions;
};

export const renderPdfPageThumbnail = async (
  sourcePath: string,
  pageNumber: number,
  outputPrefix: string
) => {
  await runPdfThumbnailRenderer(
    buildPdfThumbnailArgs(sourcePath, pageNumber, outputPrefix)
  );
  const outputPath = `${outputPrefix}.jpg`;
  validateThumbnailBuffer(await readFile(outputPath));
  return outputPath;
};

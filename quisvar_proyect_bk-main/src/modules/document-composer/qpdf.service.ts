import { execFile } from 'node:child_process';
import AppError from '@/utils/appError';
import { DOCUMENT_COMPOSER_LIMITS } from './documentComposer.constants';

type QpdfResult = {
  stdout: string;
  stderr: string;
};

export const runQpdf = (
  args: readonly string[],
  timeout = DOCUMENT_COMPOSER_LIMITS.qpdfTimeoutMs
) =>
  new Promise<QpdfResult>((resolve, reject) => {
    execFile(
      process.env.QPDF_PATH || 'qpdf',
      [...args],
      {
        timeout,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
        shell: false,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new AppError(
              'No se pudo procesar el PDF.',
              422,
              'DOCUMENT_GENERATION_FAILED'
            )
          );
          return;
        }
        resolve({ stdout, stderr });
      }
    );
  });

export const validatePdfWithQpdf = async (filePath: string) => {
  await runQpdf(buildQpdfCheckArgs(filePath));
};

export const getPdfPageCount = async (filePath: string) => {
  const { stdout } = await runQpdf(buildQpdfPageCountArgs(filePath));
  const count = Number.parseInt(stdout.trim(), 10);
  if (!Number.isInteger(count) || count < 1) {
    throw new AppError(
      'El PDF no contiene páginas válidas.',
      422,
      'DOCUMENT_PDF_CORRUPT'
    );
  }
  return count;
};

export const extractPdfPage = async (
  sourcePath: string,
  pageNumber: number,
  outputPath: string
) => {
  await runQpdf(buildQpdfExtractArgs(sourcePath, pageNumber, outputPath));
};

export const buildQpdfCheckArgs = (filePath: string) => ['--check', filePath];

export const buildQpdfPageCountArgs = (filePath: string) => [
  '--show-npages',
  filePath,
];

export const buildQpdfExtractArgs = (
  sourcePath: string,
  pageNumber: number,
  outputPath: string
) => ['--empty', '--pages', sourcePath, String(pageNumber), '--', outputPath];

export const buildQpdfMergeArgs = (pagePaths: string[], outputPath: string) => {
  const pageArguments = pagePaths.flatMap(pagePath => [pagePath, '1']);
  return ['--empty', '--pages', ...pageArguments, '--', outputPath];
};

export const mergeSinglePagePdfs = async (
  pagePaths: string[],
  outputPath: string
) => {
  await runQpdf(buildQpdfMergeArgs(pagePaths, outputPath));
};

import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import AppError from '@/utils/appError';
import { corporateArchiveStagingRoot } from './corporateArchive.storage';
import { mkdirSync } from 'node:fs';

const MAX_ARCHIVE_FILE_BYTES = 250 * 1024 * 1024;
const BLOCKED_EXTENSIONS = new Set(['bat', 'cmd', 'com', 'dll', 'exe', 'msi', 'ps1', 'sh']);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      try {
        const stagingRoot = corporateArchiveStagingRoot();
        mkdirSync(stagingRoot, { recursive: true });
        callback(null, stagingRoot);
      } catch (error) {
        callback(error as Error, '');
      }
    },
    filename: (_req, _file, callback) => callback(null, randomUUID()),
  }),
  limits: { files: 20, fileSize: MAX_ARCHIVE_FILE_BYTES, fields: 10 },
  fileFilter: (_req, file, callback) => {
    const extension = file.originalname.split('.').at(-1)?.toLowerCase() || '';
    if (BLOCKED_EXTENSIONS.has(extension)) {
      callback(new AppError('Tipo de archivo no permitido.', 415, 'ARCHIVE_FILE_TYPE_BLOCKED'));
      return;
    }
    callback(null, true);
  },
});

const handleUploadError = (middleware: ReturnType<typeof upload.array> | ReturnType<typeof upload.single>) =>
  (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, error => {
      if (!error) return next();
      if (error instanceof multer.MulterError) {
        return next(new AppError(
          error.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera el límite de 250 MB.' : 'La carga excede los límites permitidos.',
          413,
          'ARCHIVE_UPLOAD_LIMIT_EXCEEDED'
        ));
      }
      return next(error);
    });
  };

export const corporateArchiveDocumentsUpload = handleUploadError(upload.array('files', 20));
export const corporateArchiveVersionUpload = handleUploadError(upload.single('file'));

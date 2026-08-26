import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import AppError from '@/utils/appError';
import { DOCUMENT_COMPOSER_LIMITS } from './documentComposer.constants';

const memoryStorage = multer.memoryStorage();

const imageUploadMiddleware = multer({
  storage: memoryStorage,
  limits: {
    files: DOCUMENT_COMPOSER_LIMITS.maxPages,
    fileSize: DOCUMENT_COMPOSER_LIMITS.maxImageBytes,
    fields: 10,
  },
}).array('files', DOCUMENT_COMPOSER_LIMITS.maxPages);

const pdfUploadMiddleware = multer({
  storage: memoryStorage,
  limits: {
    files: 1,
    fileSize: DOCUMENT_COMPOSER_LIMITS.maxPdfBytes,
    fields: 10,
  },
}).single('file');

const normalizeUploadError =
  (
    middleware: (
      req: Request,
      res: Response,
      callback: (error?: unknown) => void
    ) => void
  ) =>
  (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, error => {
      if (!error) {
        next();
        return;
      }
      if (error instanceof multer.MulterError) {
        next(
          new AppError(
            error.code === 'LIMIT_FILE_SIZE'
              ? 'Uno de los archivos supera el límite permitido.'
              : 'La carga excede los límites permitidos.',
            413,
            'DOCUMENT_UPLOAD_LIMIT_EXCEEDED'
          )
        );
        return;
      }
      next(error);
    });
  };

export const imageUpload = normalizeUploadError(imageUploadMiddleware);
export const pdfUpload = normalizeUploadError(pdfUploadMiddleware);

import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import AppError from '@/utils/appError';
import {
  assertDesktopFileNameAllowed,
  MAX_DESKTOP_DOCUMENT_BYTES,
} from './desktopDocuments.domain';

const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: MAX_DESKTOP_DOCUMENT_BYTES,
    fields: 3,
  },
  fileFilter: (_request, file, callback) => {
    try {
      assertDesktopFileNameAllowed(file.originalname);
      callback(null, true);
    } catch (error) {
      callback(error as Error);
    }
  },
}).single('file');

export const desktopDocumentUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  uploadMiddleware(req, res, error => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      next(
        new AppError(
          error.code === 'LIMIT_FILE_SIZE'
            ? 'El archivo supera el límite de 160 MB para Dhyrium Desktop.'
            : 'La carga excede los límites permitidos.',
          413,
          'DESKTOP_DOCUMENT_UPLOAD_LIMIT_EXCEEDED'
        )
      );
      return;
    }
    next(error);
  });
};

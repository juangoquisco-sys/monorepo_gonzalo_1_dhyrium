import multer from 'multer';
import { mkdirSync } from 'fs';
import { rm } from 'fs/promises';
import { randomUUID } from 'crypto';
import { DESKTOP_STAGING_ROOT } from './desktopDocuments.storage';
import type { NextFunction, Request, Response } from 'express';
import AppError from '@/utils/appError';
import {
  assertDesktopFileNameAllowed,
  MAX_DESKTOP_DOCUMENT_BYTES,
  desktopSizeLimitMessage,
} from './desktopDocuments.domain';

const uploadMiddleware = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      try {
        mkdirSync(DESKTOP_STAGING_ROOT, { recursive: true });
        callback(null, DESKTOP_STAGING_ROOT);
      } catch (error) {
        callback(error as Error, DESKTOP_STAGING_ROOT);
      }
    },
    filename: (_req, _file, callback) =>
      callback(null, `${randomUUID()}.upload`),
  }),
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
      res.once('close', () => {
        if (req.file?.path)
          void rm(req.file.path, { force: true }).catch(() => undefined);
      });
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      next(
        new AppError(
          error.code === 'LIMIT_FILE_SIZE'
            ? desktopSizeLimitMessage()
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

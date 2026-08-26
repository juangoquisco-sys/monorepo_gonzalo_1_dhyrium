import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';

import AppError from '@/utils/appError';

const MAX_TASK_DOCUMENT_ASSET_BYTES = 50 * 1024 * 1024;
const MAX_DOCX_PREVIEW_BYTES = 50 * 1024 * 1024;
const ALLOWED_ASSET_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/x-emf',
  'image/emf',
  'image/x-wmf',
  'image/wmf',
  'video/mp4',
  'video/webm',
  'video/ogg',
]);

const assetUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: MAX_TASK_DOCUMENT_ASSET_BYTES,
    fields: 5,
  },
  fileFilter: (_request, file, callback) => {
    if (!ALLOWED_ASSET_TYPES.has(file.mimetype.toLowerCase())) {
      callback(
        new AppError(
          'El recurso del documento no es una imagen o video compatible.',
          415,
          'TASK_DOCUMENT_ASSET_TYPE_NOT_ALLOWED'
        )
      );
      return;
    }
    callback(null, true);
  },
}).single('image');

export const taskDocumentAssetUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  assetUploadMiddleware(req, res, error => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      next(
        new AppError(
          error.code === 'LIMIT_FILE_SIZE'
            ? 'El recurso del documento supera el límite de 50 MB.'
            : 'La carga del recurso excede los límites permitidos.',
          413,
          'TASK_DOCUMENT_ASSET_LIMIT_EXCEEDED'
        )
      );
      return;
    }

    next(error);
  });
};

const docxPreviewUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: MAX_DOCX_PREVIEW_BYTES,
    fields: 2,
  },
  fileFilter: (_request, file, callback) => {
    const normalizedName = file.originalname.toLowerCase();
    const normalizedType = file.mimetype.toLowerCase();
    const isDocx = normalizedName.endsWith('.docx');
    const isAllowedType = new Set([
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
      'application/zip',
    ]).has(normalizedType);

    if (!isDocx || !isAllowedType) {
      callback(
        new AppError(
          'El documento debe ser un archivo DOCX compatible.',
          415,
          'TASK_DOCUMENT_PREVIEW_TYPE_NOT_ALLOWED'
        )
      );
      return;
    }
    callback(null, true);
  },
}).single('document');

export const taskDocumentPreviewUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  docxPreviewUploadMiddleware(req, res, error => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      next(
        new AppError(
          error.code === 'LIMIT_FILE_SIZE'
            ? 'El documento supera el límite de 50 MB.'
            : 'La carga del documento excede los límites permitidos.',
          413,
          'TASK_DOCUMENT_PREVIEW_LIMIT_EXCEEDED'
        )
      );
      return;
    }

    next(error);
  });
};

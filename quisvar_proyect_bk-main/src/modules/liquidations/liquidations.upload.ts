import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import multer from 'multer';

import AppError from '@/utils/appError';

export const LIQUIDATION_UPLOAD_DIRECTORY = path.resolve('public/mail');
export const LIQUIDATION_FILE_SIZE_LIMIT = 20 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    if (!existsSync(LIQUIDATION_UPLOAD_DIRECTORY)) {
      mkdirSync(LIQUIDATION_UPLOAD_DIRECTORY, { recursive: true });
    }
    callback(null, LIQUIDATION_UPLOAD_DIRECTORY);
  },
  filename: (_req, _file, callback) => {
    callback(null, `${Date.now()}-${randomUUID()}.pdf`);
  },
});

export const liquidationUpload = multer({
  storage,
  limits: {
    fileSize: LIQUIDATION_FILE_SIZE_LIMIT,
    files: 11,
    fields: 1,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (file.mimetype !== 'application/pdf' || extension !== '.pdf') {
      callback(
        new AppError(
          'La liquidacion solo admite documentos PDF.',
          400,
          'LIQUIDATION_FILE_TYPE'
        )
      );
      return;
    }
    callback(null, true);
  },
});

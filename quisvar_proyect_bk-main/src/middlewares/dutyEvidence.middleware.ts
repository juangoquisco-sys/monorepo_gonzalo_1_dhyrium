import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { open, unlink } from 'fs/promises';
import path from 'path';
import multer from 'multer';
import type { RequestHandler } from 'express';
import AppError from '@/utils/appError';

export const DUTY_EVIDENCE_ROOT = path.resolve(
  process.cwd(),
  'storage',
  'duty-rotations',
  'evidence'
);

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const extensionByMimeType: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    if (!existsSync(DUTY_EVIDENCE_ROOT)) {
      mkdirSync(DUTY_EVIDENCE_ROOT, { recursive: true });
    }
    callback(null, DUTY_EVIDENCE_ROOT);
  },
  filename: (_req, file, callback) => {
    const extension = extensionByMimeType[file.mimetype];
    callback(null, `${randomUUID()}${extension}`);
  },
});

export const dutyEvidenceUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const expectedExtension = extensionByMimeType[file.mimetype];
    const extensionMatches =
      file.mimetype === 'image/jpeg'
        ? ['.jpg', '.jpeg'].includes(extension)
        : extension === expectedExtension;
    if (!allowedMimeTypes.has(file.mimetype) || !extensionMatches) {
      callback(
        new AppError('La evidencia debe ser una imagen JPG, PNG o WebP', 400)
      );
      return;
    }
    callback(null, true);
  },
});

const dutyEvidenceArrayUpload = dutyEvidenceUpload.array('evidence', 3);

export const hasDutyEvidenceSignature = (
  bytes: Uint8Array,
  mimeType: string
) => {
  if (mimeType === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value
    );
  }
  if (mimeType === 'image/webp') {
    return (
      Buffer.from(bytes.subarray(0, 4)).toString('ascii') === 'RIFF' &&
      Buffer.from(bytes.subarray(8, 12)).toString('ascii') === 'WEBP'
    );
  }
  return false;
};

export const assertDutyEvidenceFiles = async (
  files: Express.Multer.File[]
): Promise<void> => {
  await Promise.all(
    files.map(async file => {
      const handle = await open(file.path, 'r');
      try {
        const bytes = Buffer.alloc(12);
        const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
        if (
          !hasDutyEvidenceSignature(bytes.subarray(0, bytesRead), file.mimetype)
        ) {
          throw new AppError(
            'El contenido de la evidencia no coincide con una imagen JPG, PNG o WebP valida',
            400
          );
        }
      } finally {
        await handle.close();
      }
    })
  );
};

export const handleDutyEvidenceUpload: RequestHandler = (req, res, next) => {
  dutyEvidenceArrayUpload(req, res, error => {
    if (!error) {
      next();
      return;
    }
    const files = Array.isArray(req.files) ? req.files : [];
    const normalizedError =
      error instanceof multer.MulterError
        ? new AppError(
            error.code === 'LIMIT_FILE_SIZE'
              ? 'Cada evidencia puede pesar como maximo 5 MB'
              : 'Solo puede adjuntar hasta tres evidencias',
            400
          )
        : error;
    void Promise.all(
      files.map(file => unlink(file.path).catch(() => undefined))
    ).finally(() => next(normalizedError));
  });
};

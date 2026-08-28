import multer from 'multer';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { letterArchiveStagingRoot } from './letterArchive.storage';
import AppError from '@/utils/appError';

const blocked = new Set(['bat', 'cmd', 'com', 'dll', 'exe', 'msi', 'ps1', 'sh']);
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => { const dir = letterArchiveStagingRoot(); mkdirSync(dir, { recursive: true }); callback(null, dir); },
    filename: (_req, _file, callback) => callback(null, randomUUID()),
  }),
  limits: { files: 20, fileSize: 250 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const ext = file.originalname.split('.').at(-1)?.toLowerCase() ?? '';
    if (blocked.has(ext)) {
      callback(new AppError('Tipo de archivo no permitido.', 415, 'LETTER_ARCHIVE_FILE_BLOCKED'));
      return;
    }
    callback(null, true);
  },
});
export const letterArchiveDocumentsUpload = upload.array('files', 20);

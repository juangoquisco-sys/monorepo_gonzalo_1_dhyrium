import { createHash, randomBytes } from 'crypto';
import path from 'path';
import AppError from '@/utils/appError';

export const MAX_DESKTOP_DOCUMENT_BYTES = 160 * 1024 * 1024;
export const DESKTOP_LAUNCH_TICKET_TTL_MS = 60_000;

export type DesktopDocumentSourceKind = 'TASK_FILE' | 'BASIC_FILE';

const BLOCKED_DESKTOP_EXTENSIONS = new Set([
  'appx',
  'appxbundle',
  'bat',
  'cmd',
  'com',
  'cpl',
  'dll',
  'exe',
  'gadget',
  'hta',
  'inf',
  'ins',
  'isp',
  'jar',
  'jse',
  'lib',
  'lnk',
  'mde',
  'msc',
  'msi',
  'msix',
  'msixbundle',
  'msp',
  'mst',
  'nsh',
  'pif',
  'ps1',
  'ps1xml',
  'ps2',
  'ps2xml',
  'psc1',
  'psc2',
  'psd1',
  'psm1',
  'pyc',
  'reg',
  'scr',
  'sct',
  'shb',
  'sys',
  'url',
  'vb',
  'vbe',
  'vbs',
  'vxd',
  'wsc',
  'wsf',
  'wsh',
]);

const WINDOWS_RESERVED_FILE_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

export const sha256 = (value: Buffer | string) =>
  createHash('sha256').update(value).digest('hex');

export const createDesktopLaunchTicket = () =>
  randomBytes(32).toString('base64url');

export const desktopTaskKindForSource = (sourceKind: DesktopDocumentSourceKind) =>
  sourceKind === 'TASK_FILE' ? 'subtasks' : 'basictasks';

export const sanitizeDesktopFileName = (value: string) => {
  const baseName = path.basename(value || 'archivo');
  const sanitized = baseName
    .replace(/[<>:"/\\|?*]/g, '_')
    .split('')
    .map(character => (character.charCodeAt(0) < 32 ? '_' : character))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, 280);
  const resolved = sanitized || 'archivo';
  return WINDOWS_RESERVED_FILE_NAMES.test(resolved) ? `_${resolved}` : resolved;
};

export const desktopFileExtension = (fileName: string) =>
  path.extname(sanitizeDesktopFileName(fileName)).slice(1).toLowerCase();

export const assertDesktopFileNameAllowed = (fileName: string) => {
  const extension = desktopFileExtension(fileName);
  if (!extension) {
    throw new AppError(
      'El archivo debe tener una extensión para abrirse con una aplicación local.',
      422,
      'DESKTOP_DOCUMENT_EXTENSION_REQUIRED'
    );
  }
  if (BLOCKED_DESKTOP_EXTENSIONS.has(extension)) {
    throw new AppError(
      'Por seguridad, este tipo de archivo no puede abrirse mediante Dhyrium Desktop.',
      415,
      'DESKTOP_DOCUMENT_EXTENSION_BLOCKED'
    );
  }
  return extension;
};

export const assertDesktopDocumentBuffer = (buffer: Buffer) => {
  if (!buffer.length) {
    throw new AppError(
      'El archivo no puede estar vacío.',
      422,
      'DESKTOP_DOCUMENT_EMPTY_FILE'
    );
  }
  if (buffer.length > MAX_DESKTOP_DOCUMENT_BYTES) {
    throw new AppError(
      'El archivo supera el límite de 160 MB para Dhyrium Desktop.',
      413,
      'DESKTOP_DOCUMENT_FILE_TOO_LARGE'
    );
  }
};

export const assertDesktopFileExtensionMatches = (input: {
  documentName: string;
  uploadedName: string;
}) => {
  const expectedExtension = assertDesktopFileNameAllowed(input.documentName);
  const uploadedExtension = assertDesktopFileNameAllowed(input.uploadedName);
  if (expectedExtension !== uploadedExtension) {
    throw new AppError(
      'La versión debe conservar la misma extensión del archivo original.',
      422,
      'DESKTOP_DOCUMENT_EXTENSION_MISMATCH'
    );
  }
};

export const normalizeDesktopMimeType = (value: string | undefined) => {
  const mimeType = String(value || '').trim().toLowerCase();
  return /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(mimeType)
    ? mimeType
    : 'application/octet-stream';
};

export const quoteDesktopDownloadName = (fileName: string) =>
  sanitizeDesktopFileName(fileName).replace(/["\\\r\n]/g, '_');

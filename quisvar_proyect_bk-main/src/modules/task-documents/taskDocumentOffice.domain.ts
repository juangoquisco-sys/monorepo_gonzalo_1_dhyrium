import { createHash, randomBytes } from 'crypto';
import path from 'path';
import AppError from '@/utils/appError';

export const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const MAX_DOCX_BYTES = 100 * 1024 * 1024;

const DOCX_ENTRY_MARKER = Buffer.from('word/document.xml', 'utf8');

export const sha256 = (value: Buffer | string) =>
  createHash('sha256').update(value).digest('hex');

export const createOpaqueToken = () => randomBytes(32).toString('base64url');

export type TaskDocumentOfficeActivity =
  | 'OPTIONS_COLLECTION'
  | 'PROPFIND_COLLECTION'
  | 'OPTIONS'
  | 'HEAD'
  | 'GET'
  | 'PROPFIND'
  | 'LOCK_ACQUIRED'
  | 'LOCK_REFRESH'
  | 'PUT';

export type TaskDocumentOfficePhase =
  | 'PREPARED'
  | 'CONTACTED'
  | 'LOCKED'
  | 'SAVED'
  | 'CLOSED'
  | 'EXPIRED'
  | 'CONFLICT'
  | 'FAILED';

const OFFICE_LOCK_TOKEN_PATTERN = /opaquelocktoken:[A-Za-z0-9._~-]+/gi;

const headerValue = (value: unknown) =>
  Array.isArray(value)
    ? value.join(',')
    : typeof value === 'string'
    ? value
    : '';

export const toOfficeLockToken = (documentKey: string) =>
  `opaquelocktoken:${documentKey}`;

export const readOfficeLockToken = (...headers: unknown[]) => {
  for (const header of headers) {
    const tokens = headerValue(header).match(OFFICE_LOCK_TOKEN_PATTERN);
    if (tokens?.length) return tokens[0];
  }
  return null;
};

export const readOfficeLockTokens = (header: unknown) =>
  headerValue(header).match(OFFICE_LOCK_TOKEN_PATTERN) ?? [];

export const assertOfficeSingleLockToken = (
  expectedToken: string,
  header: unknown
) => {
  const tokens = readOfficeLockTokens(header);
  if (tokens.length !== 1 || tokens[0] !== expectedToken) {
    throw new AppError(
      'La precondiciÃ³n WebDAV debe contener un Ãºnico token de bloqueo vÃ¡lido.',
      423,
      'TASK_DOCUMENT_LOCK_TOKEN_INVALID'
    );
  }
};

export const assertOfficeLockToken = (
  expectedToken: string,
  ...headers: unknown[]
) => {
  const receivedToken = readOfficeLockToken(...headers);
  if (!receivedToken || receivedToken !== expectedToken) {
    throw new AppError(
      'Microsoft Word no presentÃ³ un bloqueo WebDAV vÃ¡lido.',
      423,
      'TASK_DOCUMENT_LOCK_TOKEN_INVALID'
    );
  }
};

export const assertOfficeEntityTag = (
  expectedChecksum: string,
  ifMatchHeader: unknown
) => {
  const value = headerValue(ifMatchHeader).trim();
  if (!value || value === '*') return;
  const accepted = value.split(',').some(candidate => {
    const normalized = candidate.trim().replace(/^W\//i, '');
    return normalized === `"${expectedChecksum}"`;
  });
  if (!accepted) {
    throw new AppError(
      'El documento cambiÃ³ desde que Microsoft Word lo abriÃ³.',
      412,
      'TASK_DOCUMENT_ETAG_MISMATCH'
    );
  }
};

export const officeSessionHardExpiry = (
  createdAt: Date,
  maximumMinutes: number
) => new Date(createdAt.getTime() + maximumMinutes * 60_000);

export const nextOfficeSessionExpiry = (input: {
  now: Date;
  createdAt: Date;
  idleMinutes: number;
  maximumMinutes: number;
}) => {
  const idleExpiry = new Date(input.now.getTime() + input.idleMinutes * 60_000);
  const hardExpiry = officeSessionHardExpiry(
    input.createdAt,
    Math.max(input.idleMinutes, input.maximumMinutes)
  );
  return idleExpiry <= hardExpiry ? idleExpiry : hardExpiry;
};

export const deriveOfficeSessionPhase = (
  status: string,
  lastActivity: TaskDocumentOfficeActivity | null,
  lockAcquired: boolean
): TaskDocumentOfficePhase => {
  if (status === 'SAVED') return 'SAVED';
  if (status === 'RELEASED') return 'CLOSED';
  if (status === 'EXPIRED') return 'EXPIRED';
  if (status === 'CONFLICT') return 'CONFLICT';
  if (status === 'FAILED') return 'FAILED';
  if (lockAcquired) return 'LOCKED';
  return lastActivity ? 'CONTACTED' : 'PREPARED';
};

export const canAutoReleaseOfficeSession = (input: {
  status: string;
  hasWebDavActivity: boolean;
}) => input.status === 'ACTIVE' && !input.hasWebDavActivity;

export const assertDocxBuffer = (buffer: Buffer) => {
  if (!buffer.length) {
    throw new AppError(
      'El archivo Word está vacío.',
      422,
      'TASK_DOCUMENT_EMPTY_FILE'
    );
  }
  if (buffer.length > MAX_DOCX_BYTES) {
    throw new AppError(
      'El archivo Word supera el límite de 100 MB.',
      413,
      'TASK_DOCUMENT_FILE_TOO_LARGE'
    );
  }
  const hasZipSignature =
    buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03;
  if (!hasZipSignature || !buffer.includes(DOCX_ENTRY_MARKER)) {
    throw new AppError(
      'El contenido recibido no es un DOCX válido.',
      415,
      'TASK_DOCUMENT_INVALID_DOCX'
    );
  }
};

export const sanitizeOfficeFileName = (value: string) => {
  const baseName = path.basename(value || 'documento.docx');
  const sanitized = baseName
    .replace(/[<>:"/\\|?*]/g, '_')
    .split('')
    .map(character => (character.charCodeAt(0) < 32 ? '_' : character))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);
  const withName = sanitized || 'documento.docx';
  return /\.docx$/i.test(withName) ? withName : `${withName}.docx`;
};

export const isActiveSessionStatus = (status: string) =>
  status === 'ACTIVE' || status === 'SAVED';

export const matchesTaskDocumentSource = (
  taskKind: 'subtasks' | 'basictasks',
  requestedSourceFileId: number,
  binding: {
    sourceFileId: number | null;
    sourceBasicFileId: number | null;
  }
) =>
  taskKind === 'subtasks'
    ? binding.sourceFileId === requestedSourceFileId &&
      binding.sourceBasicFileId === null
    : binding.sourceBasicFileId === requestedSourceFileId &&
      binding.sourceFileId === null;

export const toOfficeDocumentKey = (
  documentId: string,
  versionNumber: number,
  nonce: string
) => sha256(`${documentId}:${versionNumber}:${nonce}`).slice(0, 48);

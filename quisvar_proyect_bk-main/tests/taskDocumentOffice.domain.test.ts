import assert from 'node:assert/strict';
import test from 'node:test';
import AppError from '../src/utils/appError';
import {
  assertOfficeEntityTag,
  assertOfficeLockToken,
  assertOfficeSingleLockToken,
  assertDocxBuffer,
  canAutoReleaseOfficeSession,
  createOpaqueToken,
  deriveOfficeSessionPhase,
  matchesTaskDocumentSource,
  nextOfficeSessionExpiry,
  readOfficeLockToken,
  sanitizeOfficeFileName,
  sha256,
  toOfficeLockToken,
} from '../src/modules/task-documents/taskDocumentOffice.domain';

const minimalDocxLikeBuffer = () =>
  Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    Buffer.from('fixture/word/document.xml/content'),
  ]);

test('crea tokens opacos de 256 bits y hashes no reversibles', () => {
  const token = createOpaqueToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(sha256(token).length, 64);
  assert.notEqual(sha256(token), token);
  assert.notEqual(createOpaqueToken(), token);
});

test('acepta la firma mínima de un paquete DOCX y rechaza contenido arbitrario', () => {
  assert.doesNotThrow(() => assertDocxBuffer(minimalDocxLikeBuffer()));
  assert.throws(
    () => assertDocxBuffer(Buffer.from('no es un docx')),
    (error: unknown) =>
      error instanceof AppError && error.code === 'TASK_DOCUMENT_INVALID_DOCX'
  );
});

test('sanea el nombre sin perder la extensión DOCX', () => {
  assert.equal(
    sanitizeOfficeFileName('../02:documento?.docx'),
    '02_documento_.docx'
  );
  assert.equal(sanitizeOfficeFileName('informe'), 'informe.docx');
});

test('distingue la identidad del adjunto por tabla y no solo por id', () => {
  assert.equal(
    matchesTaskDocumentSource('subtasks', 33693, {
      sourceFileId: 33693,
      sourceBasicFileId: null,
    }),
    true
  );
  assert.equal(
    matchesTaskDocumentSource('basictasks', 33693, {
      sourceFileId: null,
      sourceBasicFileId: 33693,
    }),
    true
  );
  assert.equal(
    matchesTaskDocumentSource('subtasks', 33693, {
      sourceFileId: null,
      sourceBasicFileId: 33693,
    }),
    false
  );
  assert.equal(
    matchesTaskDocumentSource('subtasks', 33693, {
      sourceFileId: 33694,
      sourceBasicFileId: null,
    }),
    false
  );
  assert.equal(
    matchesTaskDocumentSource('subtasks', 33693, {
      sourceFileId: 33693,
      sourceBasicFileId: 33693,
    }),
    false
  );
  assert.equal(
    matchesTaskDocumentSource('basictasks', 33693, {
      sourceFileId: null,
      sourceBasicFileId: null,
    }),
    false
  );
});

test('exige un unico token WebDAV persistido en If', () => {
  const expected = toOfficeLockToken('document-key');
  const ifHeader = `(<${expected}>)`;

  assert.equal(readOfficeLockToken(ifHeader), expected);
  assert.doesNotThrow(() => assertOfficeSingleLockToken(expected, ifHeader));
  assert.doesNotThrow(() => assertOfficeLockToken(expected, `<${expected}>`));
  assert.throws(
    () =>
      assertOfficeSingleLockToken(
        expected,
        `(<${expected}>) (<opaquelocktoken:otro>)`
      ),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 423 &&
      error.code === 'TASK_DOCUMENT_LOCK_TOKEN_INVALID'
  );
  assert.throws(
    () => assertOfficeSingleLockToken(expected, undefined),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'TASK_DOCUMENT_LOCK_TOKEN_INVALID'
  );
});

test('If-Match es opcional para Word y rechaza una version distinta', () => {
  const checksum = 'a'.repeat(64);
  assert.doesNotThrow(() => assertOfficeEntityTag(checksum, undefined));
  assert.doesNotThrow(() => assertOfficeEntityTag(checksum, '*'));
  assert.doesNotThrow(() => assertOfficeEntityTag(checksum, `W/"${checksum}"`));
  assert.throws(
    () => assertOfficeEntityTag(checksum, `"${'b'.repeat(64)}"`),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 412 &&
      error.code === 'TASK_DOCUMENT_ETAG_MISMATCH'
  );
});

test('renueva el TTL inactivo sin superar el tope absoluto', () => {
  const createdAt = new Date('2026-08-11T10:00:00.000Z');
  assert.equal(
    nextOfficeSessionExpiry({
      now: new Date('2026-08-11T10:05:00.000Z'),
      createdAt,
      idleMinutes: 30,
      maximumMinutes: 120,
    }).toISOString(),
    '2026-08-11T10:35:00.000Z'
  );
  assert.equal(
    nextOfficeSessionExpiry({
      now: new Date('2026-08-11T11:55:00.000Z'),
      createdAt,
      idleMinutes: 30,
      maximumMinutes: 120,
    }).toISOString(),
    '2026-08-11T12:00:00.000Z'
  );
});

test('deriva las fases observables del flujo de Microsoft Word', () => {
  assert.equal(deriveOfficeSessionPhase('ACTIVE', null, false), 'PREPARED');
  assert.equal(
    deriveOfficeSessionPhase('ACTIVE', 'OPTIONS_COLLECTION', false),
    'CONTACTED'
  );
  assert.equal(
    deriveOfficeSessionPhase('ACTIVE', 'LOCK_ACQUIRED', true),
    'LOCKED'
  );
  assert.equal(deriveOfficeSessionPhase('SAVED', 'PUT', true), 'SAVED');
  assert.equal(deriveOfficeSessionPhase('RELEASED', null, false), 'CLOSED');
  assert.equal(deriveOfficeSessionPhase('EXPIRED', null, false), 'EXPIRED');
  assert.equal(deriveOfficeSessionPhase('CONFLICT', null, false), 'CONFLICT');
});

test('solo reemplaza una sesion PREPARED sin actividad WebDAV', () => {
  assert.equal(
    canAutoReleaseOfficeSession({
      status: 'ACTIVE',
      hasWebDavActivity: false,
    }),
    true
  );
  assert.equal(
    canAutoReleaseOfficeSession({
      status: 'ACTIVE',
      hasWebDavActivity: true,
    }),
    false
  );
  assert.equal(
    canAutoReleaseOfficeSession({
      status: 'SAVED',
      hasWebDavActivity: false,
    }),
    false
  );
});

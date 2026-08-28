import assert from 'node:assert/strict';
import test from 'node:test';
import AppError from '../src/utils/appError';
import {
  assertDesktopDocumentBuffer,
  assertDesktopFileExtensionMatches,
  assertDesktopFileNameAllowed,
  createDesktopLaunchTicket,
  desktopFileExtension,
  sanitizeDesktopFileName,
  sha256,
} from '../src/modules/desktop-documents/desktopDocuments.domain';

test('crea enlaces opacos de 256 bits para Dhyrium Desktop', () => {
  const ticket = createDesktopLaunchTicket();
  assert.match(ticket, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(sha256(ticket).length, 64);
  assert.notEqual(sha256(ticket), ticket);
});

test('acepta extensiones de trabajo generales y bloquea ejecutables', () => {
  assert.equal(assertDesktopFileNameAllowed('plano.dwg'), 'dwg');
  assert.equal(assertDesktopFileNameAllowed('modelo.rvt'), 'rvt');
  assert.equal(assertDesktopFileNameAllowed('presupuesto.s10'), 's10');
  assert.equal(assertDesktopFileNameAllowed('archivo.interno'), 'interno');
  assert.throws(
    () => assertDesktopFileNameAllowed('instalador.exe'),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'DESKTOP_DOCUMENT_EXTENSION_BLOCKED'
  );
  assert.throws(
    () => assertDesktopFileNameAllowed('sin-extension'),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'DESKTOP_DOCUMENT_EXTENSION_REQUIRED'
  );
});

test('sanea nombres de Windows sin alterar la extensión que abre la aplicación', () => {
  assert.equal(
    sanitizeDesktopFileName('../plano:principal?.dwg'),
    'plano_principal_.dwg'
  );
  assert.equal(desktopFileExtension('../plano:principal?.dwg'), 'dwg');
  assert.equal(sanitizeDesktopFileName('CON.dwg'), '_CON.dwg');
});

test('exige que una versión conserve la extensión del archivo original', () => {
  assert.doesNotThrow(() =>
    assertDesktopFileExtensionMatches({
      documentName: 'Plano Principal.DWG',
      uploadedName: 'plano temporal.dwg',
    })
  );
  assert.throws(
    () =>
      assertDesktopFileExtensionMatches({
        documentName: 'Plano Principal.dwg',
        uploadedName: 'plano temporal.dxf',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'DESKTOP_DOCUMENT_EXTENSION_MISMATCH'
  );
});

test('rechaza archivos vacíos antes de crear una versión', () => {
  assert.throws(
    () => assertDesktopDocumentBuffer(Buffer.alloc(0)),
    (error: unknown) =>
      error instanceof AppError && error.code === 'DESKTOP_DOCUMENT_EMPTY_FILE'
  );
});

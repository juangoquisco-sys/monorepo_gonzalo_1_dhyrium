import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import morgan from 'morgan';
import { resolveRequestId } from '@/middlewares/requestContext.middleware';
import {
  getRequestPathname,
  isSuccessfulHealthCheck,
  redactSensitiveRequestPath,
  resolveTrustProxy,
} from '@/utils/httpLogger';

describe('HTTP logging policy', () => {
  const originalRoute = process.env.ROUTE;

  afterEach(() => {
    if (originalRoute === undefined) delete process.env.ROUTE;
    else process.env.ROUTE = originalRoute;
  });

  it('elimina el query string del path registrado', () => {
    const req = { originalUrl: '/reset?token=secret' } as never;
    assert.equal(getRequestPathname(req), '/reset');
  });

  it('redacta el token opaco de Word en todos los paths HTTP registrados', () => {
    const token = 'Abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE';
    assert.equal(token.length, 43);

    const path = `/api/v1/task-documents/office-edit/${token}/memoria.docx`;
    const redacted = redactSensitiveRequestPath(path);

    assert.equal(
      redacted,
      '/api/v1/task-documents/office-edit/[token]/memoria.docx'
    );
    assert.equal(redacted.includes(token), false);
    assert.equal(
      getRequestPathname({
        originalUrl: `${path}?downloadToken=otro-secreto`,
      } as never),
      '/api/v1/task-documents/office-edit/[token]/memoria.docx'
    );
    const morganUrlToken = (
      morgan as unknown as {
        url: (req: { originalUrl: string }) => string;
      }
    ).url;
    assert.equal(
      morganUrlToken({ originalUrl: path }),
      '/api/v1/task-documents/office-edit/[token]/memoria.docx'
    );
  });

  it('omite health checks exitosos pero conserva sus errores', () => {
    process.env.ROUTE = 'api/v1';
    const req = { originalUrl: '/api/v1/health?probe=1' } as never;
    assert.equal(
      isSuccessfulHealthCheck(req, { statusCode: 200 } as never),
      true
    );
    assert.equal(
      isSuccessfulHealthCheck(req, { statusCode: 503 } as never),
      false
    );
  });

  it('rechaza trust proxy global y acepta configuraciones acotadas', () => {
    assert.equal(resolveTrustProxy(undefined), false);
    assert.equal(resolveTrustProxy('1'), 1);
    assert.equal(
      resolveTrustProxy('loopback, 10.0.0.0/8'),
      'loopback, 10.0.0.0/8'
    );
    assert.throws(() => resolveTrustProxy('true'), /no es seguro/);
  });

  it('acepta request IDs seguros y reemplaza entradas manipulables', () => {
    assert.equal(resolveRequestId('client-request_123'), 'client-request_123');
    assert.match(resolveRequestId('bad\nrequest'), /^[0-9a-f-]{36}$/);
  });
});

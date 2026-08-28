import { Request, Response } from 'express';
import morgan from 'morgan';

const HEALTH_PATHS = new Set(['/health', '/system/health']);
const OFFICE_EDIT_TOKEN_PATH_PATTERN =
  /(\/task-documents\/office-edit\/)[A-Za-z0-9_-]{43}(?=\/|$)/g;
const DESKTOP_LAUNCH_TICKET_PATH_PATTERN =
  /(\/desktop\/documents\/launches\/)[A-Za-z0-9_-]{43}(?=\/redeem(?:\/|$))/g;

export const resolveTrustProxy = (value: string | undefined) => {
  if (!value) return false;

  const normalizedValue = value.trim();
  if (normalizedValue.toLowerCase() === 'true') {
    throw new Error(
      'TRUST_PROXY=true no es seguro; use una cantidad de proxies o rangos confiables'
    );
  }

  if (/^\d+$/.test(normalizedValue)) return Number(normalizedValue);
  return normalizedValue;
};

export const redactSensitiveRequestPath = (path: string) =>
  path
    .replace(OFFICE_EDIT_TOKEN_PATH_PATTERN, '$1[token]')
    .replace(DESKTOP_LAUNCH_TICKET_PATH_PATTERN, '$1[token]');

export const getRequestPathname = (req: Request) => {
  const pathname =
    (req.originalUrl || req.url || req.path || '/').split('?')[0] || '/';
  return redactSensitiveRequestPath(pathname);
};

// El formato `dev` incorporado de Morgan usa el token global `:url`. Se
// reemplaza en un solo punto para que desarrollo y producción nunca escriban
// el token opaco de una sesión Word en los logs HTTP.
morgan.token<Request, Response>('url', req => getRequestPathname(req));

export const isSuccessfulHealthCheck = (req: Request, res: Response) => {
  const pathname = getRequestPathname(req);
  const routePrefix = process.env.ROUTE
    ? `/${process.env.ROUTE}`.replace(/\/+/g, '/')
    : '';
  const applicationPath =
    routePrefix && pathname.startsWith(routePrefix)
      ? pathname.slice(routePrefix.length) || '/'
      : pathname;

  return HEALTH_PATHS.has(applicationPath) && res.statusCode < 400;
};

export const productionHttpLogFormat: morgan.FormatFn<Request, Response> = (
  tokens,
  req,
  res
) =>
  JSON.stringify({
    timestamp: tokens.date(req, res, 'iso'),
    requestId: res.locals.requestId || '',
    method: tokens.method(req, res),
    path: getRequestPathname(req),
    status: Number(tokens.status(req, res) || 0),
    responseTimeMs: Number(tokens['response-time'](req, res) || 0),
    contentLength: Number(tokens.res(req, res, 'content-length') || 0),
    ip: tokens['remote-addr'](req, res),
  });

export const createHttpLogger = (production: boolean) => {
  const options: morgan.Options<Request, Response> = {
    skip: isSuccessfulHealthCheck,
  };
  return production
    ? morgan<Request, Response>(productionHttpLogFormat, options)
    : morgan<Request, Response>('dev', options);
};

import type { Request } from 'express';

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getAuditRequestPath = (req: Request) => {
  const rawPath = (req.originalUrl || req.url || req.path || '').split('?')[0];
  const routePrefix = process.env.ROUTE
    ? `/${process.env.ROUTE}`.replace(/\/+/g, '/')
    : '';
  const pathWithoutPrefix =
    routePrefix && rawPath.startsWith(routePrefix)
      ? rawPath.replace(new RegExp(`^${escapeRegExp(routePrefix)}`), '') || '/'
      : rawPath || req.path || '/';
  return pathWithoutPrefix
    .replace(
      /(\/task-documents\/office-edit\/)[A-Za-z0-9_-]{43}(?=\/|$)/,
      '$1[token]'
    )
    .replace(
      /(\/desktop\/documents\/launches\/)[A-Za-z0-9_-]{43}(?=\/redeem(?:\/|$))/,
      '$1[token]'
    );
};

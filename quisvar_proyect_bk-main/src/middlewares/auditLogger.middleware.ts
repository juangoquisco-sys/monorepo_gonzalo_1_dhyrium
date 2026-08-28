import { prisma } from '@/utils/prisma.server';
import { Request, Response, NextFunction } from 'express';
import type { UserType } from '@/middlewares/auth.middleware';
import { sanitizeAuditPayload } from '@/utils/auditSanitizer';
import { getAuditSeverity } from '@/utils/auditSeverity';
import {
  canStoreFullDniInAuditRequest,
  resolveAuditUserId,
  shouldPersistAuditLog,
} from '@/utils/auditLogPolicy';
import { resolveAuditErrorResponse } from '@/utils/auditErrorResponse';
import { getRequestClientIp } from '@/utils/clientIp';
import { getAuditRequestPath } from '@/utils/auditRequestPath';

const OMITTED_AUDIT_PATHS = new Set(['/health']);

export const auditLogger = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const path = getAuditRequestPath(req);
  if (OMITTED_AUDIT_PATHS.has(path)) return next();

  const method = req.method.toUpperCase();
  const ip = getRequestClientIp(req);
  const userAgent = req.headers['user-agent'] || '';
  const start = Date.now();

  res.once('finish', async () => {
    try {
      const userInfo = res.locals.userInfo as UserType | undefined;
      const userId = resolveAuditUserId(userInfo?.id, res.locals.auditUserId);
      if (!shouldPersistAuditLog(method, path, userId)) return;

      const responseTime = Date.now() - start;
      const requestBody = sanitizeAuditPayload(req.body, {
        allowSensitiveKeys: canStoreFullDniInAuditRequest(method, path)
          ? ['dni']
          : [],
      });
      const queryParams = sanitizeAuditPayload(req.query);
      const errorResponse = resolveAuditErrorResponse(
        res.statusCode,
        res.locals.auditErrorResponse
      );
      const severity = getAuditSeverity(method, path, res.statusCode);
      await prisma.auditLog.create({
        data: {
          userId,
          action: `${method} ${path}`,
          method,
          path,
          severity,
          requestBody: requestBody === null ? {} : requestBody,
          queryParams: queryParams === null ? {} : queryParams,
          errorResponse: errorResponse === null ? {} : errorResponse,
          referrer: req.headers.referer || '',
          ipAddress: ip,
          userAgent,
          statusCode: res.statusCode,
          responseTime,
          createdAt: new Date(),
        },
      });
    } catch (err) {
      console.error('Error al guardar AuditLog:', err);
    }
  });

  next();
};

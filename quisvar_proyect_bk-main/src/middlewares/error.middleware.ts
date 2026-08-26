/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from 'express';
import pc from 'picocolors';
import { buildAuditErrorResponse } from '@/utils/auditErrorResponse';
import { normalizeErrorResponse } from '@/utils/errorResponse';

const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const normalizedError = normalizeErrorResponse(err);
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      pc.dim(
        pc.bgRed(
          `[requestId=${res.locals.requestId || 'unknown'}] ${
            normalizedError.auditMessage
          }`
        )
      )
    );
  }

  //---------------------------error_such_files----------------------------
  if (
    req.url.includes('uploads') ||
    req.url.includes('index') ||
    req.url.includes('public')
  ) {
    const pageNotFound = res.locals.pageNotFound as string;
    return res.sendFile(pageNotFound);
  }
  //-----------------------------------------------------------------------

  res.locals.auditErrorResponse = buildAuditErrorResponse(err, {
    statusCode: normalizedError.statusCode,
    status: normalizedError.status,
    message: normalizedError.auditMessage,
    code: normalizedError.code,
  });
  res.locals.auditErrorResponse = {
    ...res.locals.auditErrorResponse,
    requestId: res.locals.requestId || '',
  };
  res.status(normalizedError.statusCode).json(normalizedError.publicResponse);
};

export default globalErrorHandler;

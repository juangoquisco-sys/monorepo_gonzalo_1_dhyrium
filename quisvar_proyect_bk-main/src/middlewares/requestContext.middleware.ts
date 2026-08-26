import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;

export const resolveRequestId = (headerValue: unknown) => {
  const candidate = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return typeof candidate === 'string' &&
    SAFE_REQUEST_ID_PATTERN.test(candidate)
    ? candidate
    : randomUUID();
};

export const requestContext = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
  res.locals.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
};

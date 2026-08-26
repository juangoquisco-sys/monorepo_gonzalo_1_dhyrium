import { ControllerFunction } from '@/types/patterns';
import AppError from '@/utils/appError';
import FrontendLogServices from '@/services/frontendLog.services';
import type { QueryLike } from '@/services/frontendLog.services';
import type { UserType } from '@/middlewares/auth.middleware';
import { getRequestClientIp } from '@/utils/clientIp';

const parseId = (value: string) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('ID de frontend log invalido', 400);
  }
  return id;
};

export const ingestFrontendLogBatch: ControllerFunction = async (req, res) => {
  const userInfo = res.locals.userInfo as UserType | undefined;
  if (!userInfo?.id) throw new AppError('No autenticado', 401);

  const result = await FrontendLogServices.ingestBatch(req.body, {
    userId: userInfo.id,
    ipAddress: getRequestClientIp(req),
    userAgent: String(req.headers['user-agent'] || ''),
  });
  res.status(202).json(result);
};

export const listFrontendLogEvents: ControllerFunction = async (req, res) => {
  const result = await FrontendLogServices.listEvents(req.query as QueryLike);
  res.status(200).json(result);
};

export const getFrontendLogEventById: ControllerFunction = async (req, res) => {
  const result = await FrontendLogServices.findEventById(
    parseId(req.params.id)
  );
  res.status(200).json(result);
};

export const getFrontendLogSummary: ControllerFunction = async (req, res) => {
  const result = await FrontendLogServices.summary(req.query as QueryLike);
  res.status(200).json(result);
};

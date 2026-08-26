import { ControllerFunction } from '@/types/patterns';
import AppError from '@/utils/appError';
import AuditLogServices from '@/services/auditLog.services';
import type { QueryLike } from '@/services/auditLog.services';

const parseId = (value: string) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('ID de log invalido', 400);
  }
  return id;
};

export const listAuditLogs: ControllerFunction = async (req, res) => {
  const result = await AuditLogServices.findAll(req.query as QueryLike);
  res.status(200).json(result);
};

export const getAuditLogById: ControllerFunction = async (req, res) => {
  const result = await AuditLogServices.findById(parseId(req.params.id));
  res.status(200).json(result);
};

export const getAuditSummary: ControllerFunction = async (req, res) => {
  const result = await AuditLogServices.summary(req.query as QueryLike);
  res.status(200).json(result);
};

export const getAuditByModule: ControllerFunction = async (req, res) => {
  const result = await AuditLogServices.byModule(req.query as QueryLike);
  res.status(200).json(result);
};

export const getAuditByUser: ControllerFunction = async (req, res) => {
  const result = await AuditLogServices.byUser(req.query as QueryLike);
  res.status(200).json(result);
};

export const getAuditByStatus: ControllerFunction = async (req, res) => {
  const result = await AuditLogServices.byStatus(req.query as QueryLike);
  res.status(200).json(result);
};

export const getAuditByEndpoint: ControllerFunction = async (req, res) => {
  const result = await AuditLogServices.byEndpoint(req.query as QueryLike);
  res.status(200).json(result);
};

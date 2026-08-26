import { Request, Response } from 'express';
import LicenseServices from '@/services/licenses.services';
import { LicensesStatus } from '@prisma/client';
import { ControllerFunction } from '@/types/patterns';
import { parseQueries } from '@/utils/format.server';
import { DateOptions } from '@/types/types';

const parseBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return Boolean(value);
};

const parsePositiveInteger = (value: unknown, defaultValue: number) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue) || parsedValue < 1) return defaultValue;
  return Math.trunc(parsedValue);
};

const parseLicenseBody = (req: Request) => {
  const body = { ...req.body };
  if (body.usersId) body.usersId = Number(body.usersId);
  if (typeof body.usersIds === 'string') {
    body.usersIds = JSON.parse(body.usersIds).map(Number);
  }
  if (body.supervisorId) body.supervisorId = Number(body.supervisorId);
  if (body.autoApprove !== undefined) {
    body.autoApprove = parseBoolean(body.autoApprove);
  }
  if (typeof body.recurrence === 'string') {
    body.recurrence = JSON.parse(body.recurrence);
  }
  if (req.file) {
    body.departureFile = `licenses/resolutions/${req.file.filename}`;
  }
  return body;
};

class LicencesController {
  public static getByUser: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const options = parseQueries<DateOptions>(req.query);
    const query = await LicenseServices.getByUser(+id, options);
    res.status(200).json(query);
  };
}
export default LicencesController;
export const createLicense = async (req: Request, res: Response) => {
  const body = parseLicenseBody(req);
  const query = await LicenseServices.create(body, res.locals.userInfo?.id);
  res.status(201).json(query);
};
export const createFreeForAll = async (req: Request, res: Response) => {
  const { body } = req;
  const query = await LicenseServices.createFreeForAll(body);
  res.status(201).json(query);
};
export const updateLicense = async (req: Request, res: Response) => {
  const body = parseLicenseBody(req);
  const { id } = req.params;
  const query = await LicenseServices.update(Number(id), body);
  res.status(200).json(query);
};
export const approveLicense = async (req: Request, res: Response) => {
  const body = req.body;
  const { id } = req.params;
  const query = await LicenseServices.updateApprove(
    Number(id),
    body,
    res.locals.userInfo?.id
  );
  res.status(200).json(query);
};
export const updateCheckOut = async (req: Request, res: Response) => {
  const body = req.body;
  const { id } = req.params;
  const query = await LicenseServices.updateCheckOut(Number(id), body);
  res.status(200).json(query);
};
export const getLicenseById = async (req: Request, res: Response) => {
  // const id = req.params.id;
  // const status = req.query.status as LicensesStatus;
  const query = await LicenseServices.getActiveLicensesForAttendance();
  // const query = await LicenseServices.deleteExpiredLicenses();
  res.status(200).json(query);
};
export const getLicensesByStatus = async (req: Request, res: Response) => {
  // const id = req.params.id;
  const { page, pageSize, status, searchName } = req.query;
  const query = await LicenseServices.getLicensesByStatus(
    status as LicensesStatus,
    parsePositiveInteger(page, 1),
    parsePositiveInteger(pageSize, 20),
    searchName as string
  );
  res.status(200).json(query);
};
export const getLicensesEmployee = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page, pageSize, status, includeRecurringChildren } = req.query;
  const query = await LicenseServices.getLicensesEmployee(
    Number(id),
    status as LicensesStatus,
    parsePositiveInteger(page, 1),
    parsePositiveInteger(pageSize, 20),
    includeRecurringChildren === 'true'
  );
  res.status(200).json(query);
};
export const getLicensesFee = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;
  const query = await LicenseServices.getLicensesFee(
    startDate as string,
    endDate as string,
    Number(id)
  );
  res.status(200).json(query);
};
export const getLicensesFineReport = async (req: Request, res: Response) => {
  const { startDate, endDate, usersId } = req.query;
  const query = await LicenseServices.getLicensesFineReport(
    startDate as string | undefined,
    endDate as string | undefined,
    usersId ? Number(usersId) : undefined
  );
  res.status(200).json(query);
};
export const upsertLicensePenaltyAdjustments = async (
  req: Request,
  res: Response
) => {
  const query = await LicenseServices.upsertPenaltyAdjustments(
    res.locals.userInfo?.id,
    req.body
  );
  res.status(200).json(query);
};
export const voidLicensePenaltyAdjustments = async (
  req: Request,
  res: Response
) => {
  const query = await LicenseServices.voidPenaltyAdjustments(
    res.locals.userInfo?.id,
    req.body
  );
  res.status(200).json(query);
};
export const expiredLicenses = async (req: Request, res: Response) => {
  const query = await LicenseServices.deleteExpiredLicenses();
  res.status(200).json(query);
};
export const activeLicenses = async (req: Request, res: Response) => {
  const query = await LicenseServices.activeLicenses();
  res.status(200).json(query);
};
export const deleteLicense = async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = await LicenseServices.deleteLicense(Number(id));
  res.status(200).json(query);
};

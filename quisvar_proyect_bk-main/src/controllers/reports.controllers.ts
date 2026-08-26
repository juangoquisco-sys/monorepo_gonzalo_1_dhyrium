import { Request, Response } from 'express';
import ReportsServices from '@/services/reports.services';
import AppError from '@/utils/appError';
import { ControllerFunction } from '@/types/patterns';
import { parseQueries } from '@/utils/format.server';
import { ParametersByUser, ReportsByIdParameters } from '@/types/reports';

export const showListReportByUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const _user_id = parseInt(id);
  // const userInfo: UserType = res.locals.userInfo;
  // const { id } = userInfo;
  const initial = req.query.initial as string;
  const until = req.query.until as string;
  const status = req.query.status as 'DONE' | 'LIQUIDATION';
  const startDate = new Date(initial);
  const untilDate = new Date(until);
  if (!startDate || !untilDate)
    throw new AppError('Ingrese Fechas validas', 400);
  const query = await ReportsServices.getReportByUser(
    _user_id,
    startDate,
    untilDate,
    status
  );
  res.status(200).json(query);
};

class ReportsControllers {
  public static findByUser: ControllerFunction = async (req, res) => {
    const { userId } = req.params;
    const queries = parseQueries<ParametersByUser>(req.query);
    const result = await ReportsServices.findByUser(+userId, queries);
    res.status(200).json(result);
  };

  public static findById: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const options = parseQueries<ReportsByIdParameters>(req.query);
    const result = await ReportsServices.findById(+id, options);
    res.status(200).json(result);
  };

  public static create: ControllerFunction = async (req, res) => {
    const { body } = req;
    const result = await ReportsServices.create(body);
    res.status(201).json(result);
  };

  public static updateItems: ControllerFunction = async (req, res) => {
    const { body } = req;
    const { id } = req.params;
    const result = await ReportsServices.updateItems(
      +id,
      body,
      res.locals.userInfo
    );
    res.status(200).json(result);
  };

  public static removeItems: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { body } = req;
    const result = await ReportsServices.removeItems(+id, body);
    res.status(200).json(result);
  };

  public static authorizedItem: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { body } = req;
    const result = await ReportsServices.isAuthorizedItem(+id, body);
    res.status(200).json(result);
  };

  public static remove: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const result = await ReportsServices.remove(+id);
    res.status(200).json(result);
  };
}
export default ReportsControllers;

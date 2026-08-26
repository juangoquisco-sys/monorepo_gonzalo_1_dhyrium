import { ControllerFunction } from '@/types/patterns';
import { UserType } from '@/middlewares/auth.middleware';
import ProgressReportsServices from '@/services/progressReports.services';
import type {
  ProgressReportItemSource,
  ReportIndexTemplateScope,
} from '@prisma/client';

class ProgressReportsControllers {
  public static workspace: ControllerFunction = async (req, res) => {
    const query = await ProgressReportsServices.workspace(
      res.locals.userInfo as UserType
    );
    res.status(200).json(query);
  };

  public static find: ControllerFunction = async (req, res) => {
    const query = await ProgressReportsServices.find(
      res.locals.userInfo as UserType,
      req.params.id
    );
    res.status(200).json(query);
  };

  public static create: ControllerFunction = async (req, res) => {
    const query = await ProgressReportsServices.create(
      res.locals.userInfo as UserType,
      req.body
    );
    res.status(201).json(query);
  };

  public static update: ControllerFunction = async (req, res) => {
    const query = await ProgressReportsServices.update(
      res.locals.userInfo as UserType,
      req.params.id,
      req.body
    );
    res.status(200).json(query);
  };

  public static markReady: ControllerFunction = async (req, res) => {
    const query = await ProgressReportsServices.markReady(
      res.locals.userInfo as UserType,
      req.params.id
    );
    res.status(200).json(query);
  };

  public static deleteDraft: ControllerFunction = async (req, res) => {
    const query = await ProgressReportsServices.deleteDraft(
      res.locals.userInfo as UserType,
      req.params.id
    );
    res.status(200).json(query);
  };

  public static listTemplates: ControllerFunction = async (req, res) => {
    const query = await ProgressReportsServices.listTemplates(
      req.query.source as ProgressReportItemSource | undefined
    );
    res.status(200).json(query);
  };

  public static createTemplate: ControllerFunction = async (req, res) => {
    const query = await ProgressReportsServices.createTemplate(
      res.locals.userInfo as UserType,
      req.body
    );
    res.status(201).json(query);
  };

  public static listIndexTemplates: ControllerFunction = async (req, res) => {
    const query = await ProgressReportsServices.listIndexTemplates(
      res.locals.userInfo as UserType,
      {
        unitId: req.query.unitId as string | undefined,
        scope: req.query.scope as ReportIndexTemplateScope | undefined,
      }
    );
    res.status(200).json(query);
  };

  public static createIndexTemplate: ControllerFunction = async (req, res) => {
    const query = await ProgressReportsServices.createIndexTemplate(
      res.locals.userInfo as UserType,
      req.body
    );
    res.status(201).json(query);
  };

  public static updateIndexTemplate: ControllerFunction = async (req, res) => {
    const query = await ProgressReportsServices.updateIndexTemplate(
      res.locals.userInfo as UserType,
      req.params.id,
      req.body
    );
    res.status(200).json(query);
  };

  public static deleteIndexTemplate: ControllerFunction = async (req, res) => {
    const query = await ProgressReportsServices.deleteIndexTemplate(
      res.locals.userInfo as UserType,
      req.params.id
    );
    res.status(200).json(query);
  };

  public static saveAsTemplate: ControllerFunction = async (req, res) => {
    const query = await ProgressReportsServices.saveAsTemplate(
      res.locals.userInfo as UserType,
      req.params.id,
      req.body
    );
    res.status(201).json(query);
  };
}

export default ProgressReportsControllers;

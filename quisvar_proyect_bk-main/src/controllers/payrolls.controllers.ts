import { ControllerFunction } from '@/types/patterns';
import { existsSync, mkdirSync, renameSync, rmSync } from 'fs';
import PayrollMonthlyBridgeServices from '@/services/payrollMonthlyBridge.services';
import PayrollsServices from '@/services/payrolls.services';
import AppError from '@/utils/appError';
import { parseQueries } from '@/utils/format.server';
import { ParamPayrolls } from '@/types/payrolls';
import { ReportsByIdParameters } from '@/types/reports';
import { Request } from 'express';
import {
  MonthlyBridgeCandidatesParams,
  MonthlyBridgeCreatePayload,
  MonthlyBridgeDownloadZipPayload,
  MonthlyBridgePersonnelRequestsParams,
  SelfSubmissionTechnicalTasksParams,
} from '@/services/payrollMonthlyBridge.services';
import { reconcileLiquidationRequestSchema } from '@/modules/liquidations/liquidations.schema';

class PayrollsControllers {
  private static requestSelfAttachmentFiles(req: Request, path: string) {
    if (!req.files) {
      throw new AppError('Oops!, no se pudo subir los archivos', 400);
    }
    const { fileMail: files } = req.files as Record<
      string,
      Express.Multer.File[]
    >;
    if (!files?.length) {
      throw new AppError('Seleccione al menos un archivo', 400);
    }
    if (!existsSync(path)) mkdirSync(path, { recursive: true });
    return files.map(({ filename: name, originalname, ...file }) => {
      renameSync(file.path, path + '/' + name);
      return { name, path, originalname };
    });
  }

  public static getAll: ControllerFunction = async (req, res) => {
    const queries = parseQueries<ParamPayrolls>(req.query);
    const response = await PayrollsServices.showAll(queries);
    res.status(200).json(response);
  };

  public static changeStatus: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { body } = req;
    const response = await PayrollsServices.changeStatus(+id, body);
    res.status(200).json(response);
  };

  public static lastPad: ControllerFunction = async (req, res) => {
    const response = await PayrollsServices.lastPad();
    res.status(200).json(response);
  };

  public static getById: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const params = parseQueries<ReportsByIdParameters>(req.query);
    const response = await PayrollsServices.showById(+id, params);
    res.status(200).json(response);
  };

  public static penaltySummary: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const rawUserIds = req.query.userIds
      ? String(req.query.userIds).split(',')
      : [];
    const userIds = rawUserIds
      .map(value => Number(value))
      .filter(value => Number.isFinite(value) && value > 0);
    const response = await PayrollsServices.penaltySummary({
      payrollId: +id,
      userIds,
      userInfo: res.locals.userInfo,
    });
    res.status(200).json(response);
  };

  public static monthlyBridgeCandidates: ControllerFunction = async (
    req,
    res
  ) => {
    const queries = parseQueries<MonthlyBridgeCandidatesParams>(req.query);
    const response = await PayrollMonthlyBridgeServices.candidates(queries);
    res.status(200).json(response);
  };

  public static createMonthlyBridge: ControllerFunction = async (req, res) => {
    const response = await PayrollMonthlyBridgeServices.create(
      req.body as MonthlyBridgeCreatePayload
    );
    res.status(201).json(response);
  };

  public static downloadMonthlyBridgeZip: ControllerFunction = async (
    req,
    res,
    next
  ) => {
    const response = await PayrollMonthlyBridgeServices.downloadZip(
      req.body as MonthlyBridgeDownloadZipPayload
    );
    if (!existsSync(response.filePath)) {
      throw new AppError('No se pudo generar el ZIP', 500);
    }
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${response.filename}`
    );
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('File-Name', response.filename);
    res.download(response.filePath, response.filename, error => {
      rmSync(response.filePath, { force: true });
      if (error && !res.headersSent) next(error);
    });
  };

  public static monthlyBridgeTaskWorkspaceLink: ControllerFunction = async (
    req,
    res
  ) => {
    const { taskId } = req.params;
    const preferredUnitId = req.query.preferredUnitId
      ? String(req.query.preferredUnitId)
      : undefined;
    const response = await PayrollMonthlyBridgeServices.workspaceLinkForTask({
      taskId: Number(taskId),
      preferredUnitId,
      userInfo: res.locals.userInfo,
    });
    res.status(200).json(response);
  };

  public static monthlyBridgePersonnelRequests: ControllerFunction = async (
    req,
    res
  ) => {
    const { id } = req.params;
    const queries = parseQueries<
      Omit<MonthlyBridgePersonnelRequestsParams, 'payrollId'>
    >(req.query);
    const response = await PayrollMonthlyBridgeServices.personnelRequests({
      ...queries,
      payrollId: +id,
    });
    res.status(200).json(response);
  };

  public static selfSubmissionActivePayroll: ControllerFunction = async (
    req,
    res
  ) => {
    const response = await PayrollMonthlyBridgeServices.activePayroll();
    res.status(200).json({
      ...response,
      contractMonthlySalary: Number(
        res.locals.userInfo?.payrollInfo?.monthlySalary || 0
      ),
    });
  };

  public static selfSubmissionTechnicalTasks: ControllerFunction = async (
    req,
    res
  ) => {
    const queries = parseQueries<
      Omit<SelfSubmissionTechnicalTasksParams, 'userInfo'>
    >(req.query);
    const response = await PayrollMonthlyBridgeServices.selfTechnicalTasks({
      ...queries,
      userInfo: res.locals.userInfo,
    });
    res.status(200).json(response);
  };

  public static createSelfSubmissionTechnical: ControllerFunction = async (
    req,
    res
  ) => {
    const response = await PayrollMonthlyBridgeServices.createSelfTechnical({
      ...req.body,
      userInfo: res.locals.userInfo,
    });
    res.status(201).json(response);
  };

  public static selfSubmissionAdministrativePreview: ControllerFunction =
    async (req, res) => {
      const response =
        await PayrollMonthlyBridgeServices.selfAdministrativePreview(
          res.locals.userInfo
        );
      res.status(200).json(response);
    };

  public static createSelfSubmissionAdministrative: ControllerFunction = async (
    req,
    res
  ) => {
    const response =
      await PayrollMonthlyBridgeServices.createSelfAdministrative({
        ...req.body,
        userInfo: res.locals.userInfo,
      });
    res.status(201).json(response);
  };

  public static createPersonnelAdministrativeRequests: ControllerFunction =
    async (req, res) => {
      const { payrollId } = req.params;
      const response =
        await PayrollMonthlyBridgeServices.createPersonnelAdministrative({
          payrollId: +payrollId,
          items: req.body?.items || [],
        });
      res.status(201).json(response);
    };

  public static selfSubmissionSubmissions: ControllerFunction = async (
    req,
    res
  ) => {
    const response = await PayrollMonthlyBridgeServices.selfSubmissions(
      res.locals.userInfo
    );
    res.status(200).json(response);
  };

  public static selfSubmissionHistory: ControllerFunction = async (
    req,
    res
  ) => {
    const response = await PayrollMonthlyBridgeServices.selfSubmissionHistory(
      res.locals.userInfo
    );
    res.status(200).json(response);
  };

  public static removeSelfSubmissionReport: ControllerFunction = async (
    req,
    res
  ) => {
    const { reportId } = req.params;
    const response = await PayrollMonthlyBridgeServices.removeSelfReport(
      +reportId,
      res.locals.userInfo
    );
    res.status(200).json(response);
  };

  public static selfSubmissionAttachments: ControllerFunction = async (
    req,
    res
  ) => {
    const { paymessageId } = req.params;
    const response =
      await PayrollMonthlyBridgeServices.selfSubmissionAttachments(
        +paymessageId,
        res.locals.userInfo
      );
    res.status(200).json(response);
  };

  public static uploadSelfSubmissionAttachments: ControllerFunction = async (
    req,
    res
  ) => {
    const { paymessageId } = req.params;
    const { id: userId } = res.locals.userInfo;
    const files = PayrollsControllers.requestSelfAttachmentFiles(
      req,
      `public/mail/${userId}`
    );
    const response =
      await PayrollMonthlyBridgeServices.uploadSelfSubmissionAttachments({
        paymessageId: +paymessageId,
        userInfo: res.locals.userInfo,
        files,
      });
    res.status(201).json(response);
  };

  public static deleteSelfSubmissionAttachment: ControllerFunction = async (
    req,
    res
  ) => {
    const { paymessageId, fileId } = req.params;
    const response =
      await PayrollMonthlyBridgeServices.deleteSelfSubmissionAttachment({
        paymessageId: +paymessageId,
        fileId: +fileId,
        userInfo: res.locals.userInfo,
      });
    res.status(200).json(response);
  };

  public static sendPaymessagesToElaboration: ControllerFunction = async (
    req,
    res
  ) => {
    const { payrollId } = req.params;
    const response =
      await PayrollMonthlyBridgeServices.sendPaymessagesToElaboration({
        payrollId: +payrollId,
        paymessageIds: req.body?.paymessageIds || [],
      });
    res.status(200).json(response);
  };

  public static returnPaymessagesToRequests: ControllerFunction = async (
    req,
    res
  ) => {
    const { payrollId } = req.params;
    const response =
      await PayrollMonthlyBridgeServices.returnPaymessagesToRequests({
        payrollId: +payrollId,
        paymessageIds: req.body?.paymessageIds || [],
      });
    res.status(200).json(response);
  };

  public static create: ControllerFunction = async (req, res) => {
    const { body } = req;
    const response = await PayrollsServices.create(body);
    res.status(201).json(response);
  };

  public static addReport: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const response = await PayrollsServices.addReport(+id, req.body);
    res.status(200).json(response);
  };

  public static update: ControllerFunction = async (req, res) => {
    const { body } = req;
    const { id } = req.params;
    const response = await PayrollsServices.update(+id, body);
    res.status(200).json(response);
  };

  public static remove: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    await PayrollsServices.remove(+id);
    res.status(204).send();
  };

  public static removeItem: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const response = await PayrollsServices.removeItem(+id);
    res.status(200).json(response);
  };

  public static returnToElaboration: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const response = await PayrollsServices.returnToElaboration(+id);
    res.status(200).json(response);
  };

  public static setPaymessageOrgUnit: ControllerFunction = async (req, res) => {
    const { payrollId, paymessageId } = req.params;
    const response = await PayrollsServices.setPaymessageOrgUnit({
      payrollId: +payrollId,
      paymessageId: +paymessageId,
      unitId: req.body?.unitId ?? null,
    });
    res.status(200).json(response);
  };

  static authorizedGroup: ControllerFunction = async (req, res) => {
    const { body } = req;
    const result = await PayrollsServices.authorizedReportsGroup(body);
    res.status(200).json(result);
  };

  static authorizedITems: ControllerFunction = async (req, res) => {
    const { body } = req;
    const result = await PayrollsServices.updateAuthorizationOnItems(body);
    res.status(200).json(result);
  };

  static authorizedITemById: ControllerFunction = async (req, res) => {
    const { body } = req;
    const { id } = req.params;
    const result = await PayrollsServices.updateAuthorizationOnItemById(
      +id,
      body
    );
    res.status(200).json(result);
  };

  static reconcileLiquidation: ControllerFunction = async (req, res) => {
    const input = reconcileLiquidationRequestSchema.parse({
      params: req.params,
      body: req.body,
    });
    const result = await PayrollsServices.reconcileLiquidation(
      input.params.payrollId,
      input.body
    );
    res.status(200).json(result);
  };

  public static paymentGroup: ControllerFunction = async (req, res) => {
    const { body } = req;
    const result = await PayrollsServices.paymentItems(body);
    res.status(200).json(result);
  };
}
export default PayrollsControllers;

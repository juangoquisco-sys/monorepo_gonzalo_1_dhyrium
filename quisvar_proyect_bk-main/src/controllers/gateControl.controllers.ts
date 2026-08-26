import { ControllerFunction } from '@/types/patterns';
import { UserType } from '@/middlewares/auth.middleware';
import {
  GateCreatePassBody,
  GateDirectPenaltyAdjustmentBody,
  GateFineAdjustmentBody,
  GateFineAdjustmentVoidBody,
  GateFineReportFilters,
  GateMarkReturnBody,
  GatePassFilters,
  GateReviewDecisionBody,
  GateReviewRequestStatus,
  GateSubmitReviewRequestBody,
} from '@/types/gateControl';
import GateControlService from '@/services/gateControl/application/gateControl.service';
import { GateControllerPolicy } from '@/services/gateControl/domain/gateControllerPolicy';
import role from '@/middlewares/role.middleware';
import AppError from '@/utils/appError';

const getEvidenceFiles = (files?: Express.Multer.File[]) =>
  (files || []).map(file => ({
    filePath: file.path.replace(/\\/g, '/'),
    originalName: file.originalname,
    mimeType: file.mimetype,
  }));

export const searchGateUsers: ControllerFunction = async (req, res) => {
  GateControllerPolicy.assertController(res.locals.userInfo);
  const result = await GateControlService.searchUsers(
    req.query.query as string
  );
  res.status(200).json(result);
};

export const createGatePass: ControllerFunction = async (req, res) => {
  const userInfo: UserType = res.locals.userInfo;
  const isSelfService = req.body.source === 'SELF_SERVICE';
  const canUseMonitor = role.accessMenuPoint(
    userInfo,
    ['MOD'],
    'control-puerta',
    'monitor'
  );

  if (!isSelfService && !canUseMonitor) {
    throw new AppError('No tiene acceso para registrar salidas oficiales', 400);
  }
  if (!isSelfService) {
    GateControllerPolicy.assertController(userInfo);
  }
  if (isSelfService) {
    req.body.userId = userInfo.id;
  }

  const result = await GateControlService.createPass(
    userInfo.id,
    req.body as GateCreatePassBody,
    getEvidenceFiles(req.files as Express.Multer.File[] | undefined)
  );
  res.status(201).json(result);
};

export const listActiveGatePasses: ControllerFunction = async (_req, res) => {
  GateControllerPolicy.assertController(res.locals.userInfo);
  const result = await GateControlService.activePasses();
  res.status(200).json(result);
};

export const listPendingGateLicenses: ControllerFunction = async (
  _req,
  res
) => {
  GateControllerPolicy.assertController(res.locals.userInfo);
  const result = await GateControlService.pendingLicenses();
  res.status(200).json(result);
};

export const listAuthorizedGateLicenses: ControllerFunction = async (
  _req,
  res
) => {
  GateControllerPolicy.assertController(res.locals.userInfo);
  const result = await GateControlService.authorizedLicenses();
  res.status(200).json(result);
};

export const approvePendingGateLicense: ControllerFunction = async (
  req,
  res
) => {
  const userInfo: UserType = res.locals.userInfo;
  GateControllerPolicy.assertController(userInfo);
  const result = await GateControlService.approvePendingLicense(
    userInfo.id,
    Number(req.params.id)
  );
  res.status(200).json(result);
};

export const listMyActiveGatePasses: ControllerFunction = async (_req, res) => {
  const userInfo: UserType = res.locals.userInfo;
  const result = await GateControlService.myActivePasses(userInfo.id);
  res.status(200).json(result);
};

export const listMyGatePassHistory: ControllerFunction = async (_req, res) => {
  const userInfo: UserType = res.locals.userInfo;
  const result = await GateControlService.myHistory(userInfo.id);
  res.status(200).json(result);
};

export const markGatePassReturn: ControllerFunction = async (req, res) => {
  const userInfo: UserType = res.locals.userInfo;
  GateControllerPolicy.assertController(userInfo);
  const result = await GateControlService.markReturn(
    userInfo.id,
    req.params.id,
    req.body as GateMarkReturnBody
  );
  res.status(200).json(result);
};

export const gatePassHistory: ControllerFunction = async (req, res) => {
  GateControllerPolicy.assertController(res.locals.userInfo);
  const filters: GatePassFilters = {
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    status: req.query.status as GatePassFilters['status'],
    userId: req.query.userId ? +req.query.userId : undefined,
    search: req.query.search as string | undefined,
  };
  const result = await GateControlService.history(filters);
  res.status(200).json(result);
};

export const gateSummary: ControllerFunction = async (_req, res) => {
  GateControllerPolicy.assertController(res.locals.userInfo);
  const result = await GateControlService.summary();
  res.status(200).json(result);
};

export const gateTardinessRanking: ControllerFunction = async (req, res) => {
  GateControllerPolicy.assertController(res.locals.userInfo);
  const result = await GateControlService.tardinessRanking(
    req.query.dateFrom as string | undefined,
    req.query.dateTo as string | undefined
  );
  res.status(200).json(result);
};

export const gateFineReport: ControllerFunction = async (req, res) => {
  GateControllerPolicy.assertController(res.locals.userInfo);
  const result = await GateControlService.fineReport(
    req.query as GateFineReportFilters
  );
  res.status(200).json(result);
};

export const upsertGateFineAdjustment: ControllerFunction = async (
  req,
  res
) => {
  const userInfo: UserType = res.locals.userInfo;
  GateControllerPolicy.assertController(userInfo);
  const result = await GateControlService.upsertFineAdjustment(
    userInfo.id,
    req.body as GateFineAdjustmentBody
  );
  res.status(201).json(result);
};

export const voidGateFineAdjustment: ControllerFunction = async (req, res) => {
  const userInfo: UserType = res.locals.userInfo;
  GateControllerPolicy.assertController(userInfo);
  const result = await GateControlService.voidFineAdjustment(
    userInfo.id,
    req.body as GateFineAdjustmentVoidBody
  );
  res.status(200).json(result);
};

export const submitGateReviewRequest: ControllerFunction = async (req, res) => {
  const userInfo: UserType = res.locals.userInfo;
  const result = await GateControlService.submitReviewRequest(
    userInfo.id,
    req.params.id,
    req.body as GateSubmitReviewRequestBody,
    getEvidenceFiles(req.files as Express.Multer.File[] | undefined)
  );
  res.status(201).json(result);
};

export const listGateReviewRequests: ControllerFunction = async (req, res) => {
  GateControllerPolicy.assertController(res.locals.userInfo);
  const result = await GateControlService.listReviewRequests(
    req.query.status as GateReviewRequestStatus | undefined
  );
  res.status(200).json(result);
};

export const listGatePenaltyAdjustmentCandidates: ControllerFunction = async (
  req,
  res
) => {
  GateControllerPolicy.assertController(res.locals.userInfo);
  const result = await GateControlService.penaltyAdjustmentCandidates(
    req.query.search as string | undefined
  );
  res.status(200).json(result);
};

export const approveGateReviewRequest: ControllerFunction = async (
  req,
  res
) => {
  const userInfo: UserType = res.locals.userInfo;
  GateControllerPolicy.assertController(userInfo);
  const result = await GateControlService.approveReviewRequest(
    userInfo.id,
    req.params.id,
    req.body as GateReviewDecisionBody
  );
  res.status(200).json(result);
};

export const rejectGateReviewRequest: ControllerFunction = async (req, res) => {
  const userInfo: UserType = res.locals.userInfo;
  GateControllerPolicy.assertController(userInfo);
  const result = await GateControlService.rejectReviewRequest(
    userInfo.id,
    req.params.id,
    req.body as GateReviewDecisionBody
  );
  res.status(200).json(result);
};

export const directGatePenaltyAdjustment: ControllerFunction = async (
  req,
  res
) => {
  const userInfo: UserType = res.locals.userInfo;
  GateControllerPolicy.assertController(userInfo);
  const result = await GateControlService.directPenaltyAdjustment(
    userInfo.id,
    req.params.id,
    req.body as GateDirectPenaltyAdjustmentBody
  );
  res.status(201).json(result);
};

export const approvePendingGatePassReviews: ControllerFunction = async (
  req,
  res
) => {
  const userInfo: UserType = res.locals.userInfo;
  GateControllerPolicy.assertController(userInfo);
  const result = await GateControlService.approvePendingReviewRequests(
    userInfo.id,
    req.params.id,
    req.body as GateReviewDecisionBody
  );
  res.status(200).json(result);
};

export const rejectPendingGatePassReviews: ControllerFunction = async (
  req,
  res
) => {
  const userInfo: UserType = res.locals.userInfo;
  GateControllerPolicy.assertController(userInfo);
  const result = await GateControlService.rejectPendingReviewRequests(
    userInfo.id,
    req.params.id,
    req.body as GateReviewDecisionBody
  );
  res.status(200).json(result);
};

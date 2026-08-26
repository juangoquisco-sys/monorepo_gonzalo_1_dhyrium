import { ControllerFunction } from '@/types/patterns';
import {
  AttendanceIncidentFilters,
  AttendanceFineReportFilters,
  AttendancePenaltyAdjustmentBulkInput,
  AttendancePenaltyAdjustmentVoidInput,
  AttendanceReconciliationCandidateFilters,
  AttendanceReconciliationCreateBody,
  AttendanceReconciliationFilters,
  AttendanceReconciliationSummaryFilters,
  AttendanceReconciliationVoidBody,
} from '@/types/attendanceControl';
import { UserType } from '@/middlewares/auth.middleware';
import AttendanceControlService from '@/services/attendanceControl/application/attendanceControl.service';
import { ListDetails } from '@prisma/client';

const parseStatuses = (statuses: unknown): ListDetails[] | undefined => {
  if (!statuses) return undefined;
  const values = Array.isArray(statuses)
    ? statuses
    : String(statuses).split(',');
  return values
    .map(value => String(value).trim())
    .filter(Boolean) as ListDetails[];
};

export const listAttendanceIncidents: ControllerFunction = async (req, res) => {
  const userInfo: UserType = res.locals.userInfo;
  const filters: AttendanceIncidentFilters = {
    userId: req.query.userId ? +req.query.userId : undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    statuses: parseStatuses(req.query.statuses),
  };
  const result = await AttendanceControlService.listIncidents(
    userInfo,
    filters
  );
  res.status(200).json(result);
};

export const listAttendanceReconciliationCandidates: ControllerFunction =
  async (req, res) => {
    const userInfo: UserType = res.locals.userInfo;
    const filters: AttendanceReconciliationCandidateFilters = {
      userId: req.query.userId ? +req.query.userId : undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
    };
    const result = await AttendanceControlService.reconciliationCandidates({
      ...filters,
      userInfo,
    });
    res.status(200).json(result);
  };

export const listAttendanceReconciliationSummary: ControllerFunction = async (
  req,
  res
) => {
  const userInfo: UserType = res.locals.userInfo;
  const filters: AttendanceReconciliationSummaryFilters = {
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  };
  const result = await AttendanceControlService.reconciliationSummary(
    userInfo,
    filters
  );
  res.status(200).json(result);
};

export const getAttendanceFineReport: ControllerFunction = async (req, res) => {
  const userInfo: UserType = res.locals.userInfo;
  const filters: AttendanceFineReportFilters = {
    userId: req.query.userId ? +req.query.userId : undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    search: req.query.search as string | undefined,
    sortAmount: req.query
      .sortAmount as AttendanceFineReportFilters['sortAmount'],
  };
  const result = await AttendanceControlService.fineReport(userInfo, filters);
  res.status(200).json(result);
};

export const upsertAttendancePenaltyAdjustments: ControllerFunction = async (
  req,
  res
) => {
  const userInfo: UserType = res.locals.userInfo;
  const result = await AttendanceControlService.upsertPenaltyAdjustments(
    userInfo,
    req.body as AttendancePenaltyAdjustmentBulkInput
  );
  res.status(201).json(result);
};

export const voidAttendancePenaltyAdjustments: ControllerFunction = async (
  req,
  res
) => {
  const userInfo: UserType = res.locals.userInfo;
  const result = await AttendanceControlService.voidPenaltyAdjustments(
    userInfo,
    req.body as AttendancePenaltyAdjustmentVoidInput
  );
  res.status(200).json(result);
};

export const createAttendanceReconciliation: ControllerFunction = async (
  req,
  res
) => {
  const userInfo: UserType = res.locals.userInfo;
  const result = await AttendanceControlService.createReconciliation(
    userInfo,
    req.body as AttendanceReconciliationCreateBody
  );
  res.status(201).json(result);
};

export const listAttendanceReconciliations: ControllerFunction = async (
  req,
  res
) => {
  const filters: AttendanceReconciliationFilters = {
    userId: req.query.userId ? +req.query.userId : undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    status: req.query.status as AttendanceReconciliationFilters['status'],
  };
  const userInfo: UserType = res.locals.userInfo;
  const result = await AttendanceControlService.listReconciliations({
    ...filters,
    userInfo,
  });
  res.status(200).json(result);
};

export const voidAttendanceReconciliation: ControllerFunction = async (
  req,
  res
) => {
  const userInfo: UserType = res.locals.userInfo;
  const body = req.body as AttendanceReconciliationVoidBody;
  const result = await AttendanceControlService.voidReconciliation(
    userInfo,
    req.params.id,
    body.reason
  );
  res.status(200).json(result);
};

import { ControllerFunction } from '@/types/patterns';
import UserLookupServices, {
  UserLookupContext,
} from '@/services/userLookup.services';
import AppError from '@/utils/appError';

const parseLimit = (value: unknown) => {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseIncludeInactive = (value: unknown) => {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === true || raw === 'true';
};

export const createUserLookupController =
  (context: UserLookupContext): ControllerFunction =>
  async (req, res) => {
    const result = await UserLookupServices.list(context, {
      search: req.query.search as string | undefined,
      limit: parseLimit(req.query.limit),
      includeInactive: parseIncludeInactive(req.query.includeInactive),
    });
    res.status(200).json(result);
  };

export const getUserLookupOptions: ControllerFunction = async (
  req,
  res,
  next
) => {
  const { context } = req.params;

  if (!UserLookupServices.isContext(context)) {
    return next(new AppError('Contexto de usuarios no soportado', 400));
  }

  const result = await UserLookupServices.list(context, {
    search: req.query.search as string | undefined,
    limit: parseLimit(req.query.limit),
    includeInactive: parseIncludeInactive(req.query.includeInactive),
  });
  res.status(200).json(result);
};

export const getUserCenterUserOptions =
  createUserLookupController('user-center');
export const getAttendanceUserOptions =
  createUserLookupController('attendance');
export const getAttendanceControlUserOptions =
  createUserLookupController('attendance-control');
export const getRotationUserOptions = createUserLookupController('rotations');
export const getAuditUserOptions = createUserLookupController('audit');
export const getFrontendLogUserOptions =
  createUserLookupController('frontend-logs');
export const getLicenseUserOptions = createUserLookupController('licenses');
export const getProductionBonusUserOptions =
  createUserLookupController('production-bonus');
export const getProjectUserOptions = createUserLookupController('projects');
export const getPaymailUserOptions = createUserLookupController('paymail');
export const getCompanyUserOptions = createUserLookupController('companies');
export const getGroupUserOptions = createUserLookupController('groups');
export const getOfficeUserOptions = createUserLookupController('offices');

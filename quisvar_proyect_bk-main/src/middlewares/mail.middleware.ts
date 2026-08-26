import { ControllerFunction } from '@/types/patterns';
import { CategoryMailType } from '@/types/types';
import role from '@/middlewares/role.middleware';
import { MenuRole } from '@/models/menuPoints';
import { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import MailServices from '@/services/mail.services';
import { z } from 'zod';

const mailCategorySchema = z.enum(['DIRECT', 'GLOBAL']);
const mailMessageIdSchema = z.coerce.number().int().positive();
const mailMessageIdsSchema = z.array(z.number().int().positive()).min(1);

const MAIL_CATEGORY_SUBMENU: Record<CategoryMailType, string> = {
  DIRECT: 'tramite-regular',
  GLOBAL: 'comunicado',
};

const invalidCategoryError = () =>
  new AppError('Categoría de trámite inválida. Use DIRECT o GLOBAL', 400);

export const parseMailCategory = (value: unknown): CategoryMailType => {
  const result = mailCategorySchema.safeParse(value);
  if (!result.success) throw invalidCategoryError();
  return result.data;
};

export const parseMailMessageId = (value: unknown): number => {
  const result = mailMessageIdSchema.safeParse(value);
  if (!result.success)
    throw new AppError('El ID del trámite debe ser un entero válido', 400);
  return result.data;
};

export const parseMailMessageIds = (value: unknown): number[] => {
  const result = mailMessageIdsSchema.safeParse(value);
  if (!result.success)
    throw new AppError(
      'Los IDs de los trámites deben ser un arreglo de enteros válidos',
      400
    );
  return result.data;
};

const authorizeMailCategory = (
  userInfo: UserType,
  typeRol: MenuRole[],
  category: CategoryMailType
) => {
  const subMenu = MAIL_CATEGORY_SUBMENU[category];
  const hasAccess = role.accessMenuPoint(
    userInfo,
    typeRol,
    'tramites',
    subMenu
  );
  if (!hasAccess) {
    throw new AppError(
      `Rol: ${userInfo.role.name} no tiene acceso a ${subMenu}`,
      403
    );
  }
};

const setAuthorizedCategory = (
  res: Parameters<ControllerFunction>[1],
  category: CategoryMailType
) => {
  res.locals.mailCategory = category;
};

export const getAuthorizedMailCategory = (
  res: Parameters<ControllerFunction>[1]
): CategoryMailType => {
  const category = res.locals.mailCategory;
  if (!mailCategorySchema.safeParse(category).success) {
    throw new AppError('Categoría de trámite no autorizada', 500);
  }
  return category as CategoryMailType;
};

export const getAuthorizedMailMessageId = (
  res: Parameters<ControllerFunction>[1]
): number => {
  const messageId = res.locals.mailMessageId;
  const result = mailMessageIdSchema.safeParse(messageId);
  if (!result.success) throw new AppError('ID de trámite no autorizado', 500);
  return result.data;
};

export const getAuthorizedMailMessageIds = (
  res: Parameters<ControllerFunction>[1]
): number[] => {
  const messageIds = res.locals.mailMessageIds;
  const result = mailMessageIdsSchema.safeParse(messageIds);
  if (!result.success)
    throw new AppError('IDs de trámites no autorizados', 500);
  return result.data;
};

export const verifyMailAccessFromQuery =
  (typeRol: MenuRole[]): ControllerFunction =>
  async (req, res, next) => {
    const category = parseMailCategory(req.query.category);
    const userInfo: UserType = res.locals.userInfo;
    authorizeMailCategory(userInfo, typeRol, category);
    setAuthorizedCategory(res, category);
    next();
  };

export const verifyStaticMailAccess =
  (category: CategoryMailType, typeRol: MenuRole[]): ControllerFunction =>
  async (_req, res, next) => {
    const userInfo: UserType = res.locals.userInfo;
    authorizeMailCategory(userInfo, typeRol, category);
    setAuthorizedCategory(res, category);
    next();
  };

export const verifyMailAccessByMessageId =
  (typeRol: MenuRole[]): ControllerFunction =>
  async (req, res, next) => {
    const messageId = parseMailMessageId(req.params.id);
    const category = await MailServices.getCategoryById(messageId);
    const userInfo: UserType = res.locals.userInfo;
    authorizeMailCategory(userInfo, typeRol, category);
    setAuthorizedCategory(res, category);
    res.locals.mailMessageId = messageId;
    next();
  };

export const verifyMailAccessByMessageIds =
  (typeRol: MenuRole[]): ControllerFunction =>
  async (req, res, next) => {
    const messageIds = parseMailMessageIds(req.body?.ids);
    const messages = await MailServices.getCategoriesByIds(messageIds);
    const userInfo: UserType = res.locals.userInfo;
    const categories = new Set(messages.map(message => message.category));

    for (const category of categories) {
      authorizeMailCategory(userInfo, typeRol, category);
    }

    res.locals.mailMessageIds = messageIds;
    next();
  };

export const verifyMailBodyCategory: ControllerFunction = async (
  req,
  res,
  next
) => {
  const bodyCategory = parseMailCategory(req.body?.category);
  const authorizedCategory = getAuthorizedMailCategory(res);
  if (bodyCategory !== authorizedCategory) {
    throw new AppError(
      'La categoría del body no coincide con la categoría autorizada',
      400
    );
  }
  next();
};

import type { NextFunction, Request, Response } from 'express';
import AppError from '@/utils/appError';
import type { UserType } from './auth.middleware';

export const ROLE_MANAGEMENT_DNIS = new Set([
  '73520253', // Diego Adolfo Romani Cotohuanca
  '45574308', // Juan Gonzalo Quispe Condori
  '78549254', // Jorge Luis Perez Calizaya
  '76137511', // Jhon Carlos Castillo Atencio
]);

const roleManagementHandler = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = res.locals.userInfo as UserType;
  if (!ROLE_MANAGEMENT_DNIS.has(user.profile.dni)) {
    return next(
      new AppError('No tiene autorización para administrar roles y permisos.', 403)
    );
  }
  next();
};

export default roleManagementHandler;

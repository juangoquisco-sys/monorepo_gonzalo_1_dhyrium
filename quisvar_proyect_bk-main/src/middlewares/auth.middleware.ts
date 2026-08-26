import { Office, Profiles, Users } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import AppError from '@/utils/appError';
import { MenuRoles } from '@/models/menuPoints';
import UsersServices from '@/services/users.services';
import { VerifyTokenT } from '@/types/types';
import { ENV } from '@/config/env';

interface RoleAuht {
  id: number;
  name: string;
  menuPoints: MenuRoles[];
}
export type UserType = Users & { profile: Profiles } & { role: RoleAuht } & {
  office: Office;
};

export const SECRET = ENV.SECRET;

const authenticateHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { authorization } = req.headers;
  if (!authorization || !authorization.startsWith('Bearer'))
    return next(
      new AppError(
        '¡Usted no se ha identificado! por favor inicie sesión para obtener acceso.',
        401
      )
    );
  const token = authorization.split(' ')[1];
  try {
    const { id } = jwt.verify(token, SECRET) as {
      id: number;
    };
    const user = await UsersServices.find(id);
    if (!user?.status)
      return next(
        new AppError('El propietario de este token ya no está disponible.', 401)
      );
    res.locals.userInfo = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(
        new AppError(
          'Su sesion expiro o no es valida. Inicie sesion nuevamente.',
          401
        )
      );
    }
    next(error);
  }
};

export const authenticateHandlerByToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authorization = ('Bearer ' + req.query.token) as string;
  if (!authorization || !authorization.startsWith('Bearer'))
    return next(new AppError('¡Error al obtener acceso.', 401));
  const token = authorization.split(' ')[1];
  try {
    const { id } = jwt.verify(token, SECRET) as VerifyTokenT;
    const user = await UsersServices.find(id);
    res.locals.userInfo = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Token invalido o expirado.', 401));
    }
    next(error);
  }
};

export const verifySecretEnv = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (SECRET) return next();
  throw new AppError('Palabra secreta indefinida', 400);
};

export default authenticateHandler;

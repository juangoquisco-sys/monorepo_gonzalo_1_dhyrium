import { NextFunction, Request, Response } from 'express';
import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import type { UserType } from '@/middlewares/auth.middleware';

export const requireSystemUser = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  const userInfo = res.locals.userInfo as UserType | undefined;
  const userId = userInfo?.id;

  if (!userId) {
    throw new AppError('No autenticado', 401);
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      isSystemUser: true,
    },
  });

  if (!user?.status) {
    throw new AppError('No autenticado', 401);
  }

  if (!user.isSystemUser) {
    throw new AppError(
      'No tiene permisos para acceder al panel de auditoria',
      403
    );
  }

  return next();
};

export default requireSystemUser;

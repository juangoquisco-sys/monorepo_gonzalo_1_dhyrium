import { Response, Request, NextFunction } from 'express';
import AppError from '@/utils/appError';
import { UserType } from '@/middlewares/auth.middleware';
import { prisma } from '@/utils/prisma.server';
import { userProfilePick } from '@/utils/format.server';

const taskVerify = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userInfo: UserType = res.locals.userInfo;
  const userId = userInfo.id;
  const _sub_task_id = parseInt(id);
  const verifyTask = await prisma.taskOnUsers.findUnique({
    where: {
      subtaskId_userId: {
        userId,
        subtaskId: _sub_task_id,
      },
    },
  });
  if (!verifyTask) {
    throw new AppError(`No tiene ninguna tarea en esta ruta`, 404);
  }
  next();
};

export const verifyStatusUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userInfo: UserType = res.locals.userInfo;
  if (!userInfo.status) {
    throw new AppError(
      `Tu cuenta ha sido suspendida, hable con el admnistrador`,
      400
    );
  }
  next();
};

export const verifyUniqueParam = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const body: userProfilePick = req.body;
  const { dni, phone, email } = body;
  const findUserByDNI = await prisma.profiles.findUnique({
    where: { dni },
  });
  if (findUserByDNI)
    throw new AppError('Oops!, Este DNI ya ha sido registrado', 409);
  if (phone) {
    const findUserByCell = await prisma.profiles.findUnique({
      where: { phone },
    });
    if (findUserByCell)
      throw new AppError(
        'Oops!, Este Numero de Celular ya ha sido registrado',
        404
      );
  }
  const findUserByEmail = await prisma.users.findUnique({
    where: { email },
  });
  if (findUserByEmail)
    throw new AppError('Oops!, Este Correo ya ha sido registrado', 409);
  next();
};
export default taskVerify;

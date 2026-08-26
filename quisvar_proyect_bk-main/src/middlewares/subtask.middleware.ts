import { Response, Request, NextFunction } from 'express';
import AppError from '@/utils/appError';
import { UserType } from '@/middlewares/auth.middleware';
import type { SubTasks, Users } from '@prisma/client';
import SubTasksServices from '@/services/subtasks.services';

const permStatus: SubTasks['status'][] = ['UNRESOLVED', 'PROCESS', 'INREVIEW'];
// const permRole: Users['role'][] = ['ADMIN', 'MOD'];
type StatusType = { status: SubTasks['status'] };

export const statusVerify = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const body = req.body as StatusType;
  const userInfo: UserType = res.locals.userInfo;
  // const { role } = userInfo;
  // if (!permRole.includes(role) && !permStatus.includes(body.status)) {
  //   throw new AppError(
  //     `No cuenta con permisos con ${body.status} para esta ruta`,
  //     400
  //   );
  // }
  next();
};

export const validTaskById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { taskId, indexTaskId } = req.body;
  if (taskId || indexTaskId) {
    return next();
  }
  throw new AppError(`Necesita taskId o indexTaskId`, 400);
};
export const validSubtaskByIdAndStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { status } = await SubTasksServices.find(+id);
  if (status !== 'UNRESOLVED')
    throw new AppError('No puede eliminar esta subtarea', 409);
  next();
};

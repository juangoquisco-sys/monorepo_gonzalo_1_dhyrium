import { ControllerFunction } from '@/types/patterns';
import { UserType } from '@/middlewares/auth.middleware';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';

class LogsMiddleware {
  static role: ControllerFunction = async (req, res, next) => {
    const { ip } = req;
    const { id: userId, profile: user }: UserType = res.locals.userInfo;
    const log = await prisma.logs.create({
      data: { ip, query: { userId, user } },
    });
    if (!log) throw new AppError('check logs', 404);
    next();
  };
}
export default LogsMiddleware;

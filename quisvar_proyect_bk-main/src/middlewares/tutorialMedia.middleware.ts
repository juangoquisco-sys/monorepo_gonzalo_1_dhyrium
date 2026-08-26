import type { RequestHandler } from 'express';
import UsersServices from '@/services/users.services';
import { verifyTutorialMediaTicket } from '@/services/tutorialMediaTicket.service';
import AppError from '@/utils/appError';

export const authenticateTutorialMediaTicket: RequestHandler = async (
  req,
  res,
  next
) => {
  const ticket = typeof req.query.ticket === 'string' ? req.query.ticket : '';
  if (!ticket) {
    throw new AppError('Se requiere acceso autorizado al tutorial.', 401);
  }

  const { userId, videoId } = verifyTutorialMediaTicket(ticket);
  const user = await UsersServices.find(userId);
  if (!user?.status) {
    throw new AppError(
      'El propietario de este acceso ya no está disponible.',
      401
    );
  }

  res.locals.userInfo = user;
  res.locals.tutorialMediaVideoId = videoId;
  next();
};

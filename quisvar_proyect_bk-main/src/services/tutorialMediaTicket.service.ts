import jwt, { type JwtPayload } from 'jsonwebtoken';
import { ENV } from '@/config/env';
import AppError from '@/utils/appError';

const TUTORIAL_MEDIA_AUDIENCE = 'tutorial-media';
const TUTORIAL_MEDIA_TICKET_TTL = '4h';
const SECRET = ENV.SECRET;

interface TutorialMediaTicketPayload extends JwtPayload {
  videoId?: unknown;
}

export const createTutorialMediaTicket = (userId: number, videoId: number) =>
  jwt.sign({ videoId }, SECRET, {
    audience: TUTORIAL_MEDIA_AUDIENCE,
    expiresIn: TUTORIAL_MEDIA_TICKET_TTL,
    subject: String(userId),
  });

export const verifyTutorialMediaTicket = (token: string) => {
  try {
    const payload = jwt.verify(token, SECRET, {
      audience: TUTORIAL_MEDIA_AUDIENCE,
    }) as TutorialMediaTicketPayload;
    const userId = Number(payload.sub);
    const videoId = Number(payload.videoId);

    if (
      !Number.isInteger(userId) ||
      userId < 1 ||
      !Number.isInteger(videoId) ||
      videoId < 1
    ) {
      throw new AppError(
        'El acceso al archivo del tutorial no es válido.',
        401
      );
    }

    return { userId, videoId };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      'El acceso al archivo del tutorial expiró o no es válido.',
      401
    );
  }
};

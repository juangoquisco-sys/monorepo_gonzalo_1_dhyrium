import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import UsersServices from '@/services/users.services';
import { ExtendedError } from 'socket.io/dist/namespace';
import { ENV } from '@/config/env';

const SECRET = ENV.SECRET;

export const authSocket = async (
  socket: Socket,
  next: (err?: ExtendedError) => void
) => {
  const header = socket.handshake.headers.authorization;
  if (!header) {
    return next(new Error('no token'));
  }
  if (!header.startsWith('bearer ')) {
    return next(new Error('invalid token'));
  }
  const token = header.substring(7);
  try {
    const { id } = jwt.verify(token, SECRET) as {
      id: number;
    };
    const user = await UsersServices.find(id);
    socket.data.user = user;
    next();
  } catch (error) {
    return next(new Error('Token de autenticación inválido'));
  }
};

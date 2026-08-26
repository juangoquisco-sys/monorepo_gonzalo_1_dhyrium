import type { Profiles, Users } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import AppError from '@/utils/appError';
import { ENV } from '@/config/env';

const secret = ENV.SECRET;
const JWT_RESET = ENV.JWT_RESET;

export class authServices {
  static async auth({
    password,
    dni,
  }: Pick<Users, 'password'> & { dni: Profiles['dni'] }) {
    if (!dni || !password) throw new AppError('Credenciales incorrectas.', 401);

    const profile = await prisma.profiles.findUnique({
      where: { dni },
      select: {
        user: {
          select: {
            id: true,
            role: true,
            password: true,
            status: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                dni: true,
                phone: true,
              },
            },
          },
        },
      },
    });
    const user = profile?.user;

    if (!user) throw new AppError('Credenciales incorrectas.', 401);
    const verifyPassword = await bcrypt.compare(password, user.password);
    if (!verifyPassword)
      throw new AppError(
        'Credenciales incorrectas. Verifique su usuario y contraseña.',
        401
      );
    return user;
  }

  static getToken(id: number) {
    if (secret) {
      const token = jwt.sign({ id }, secret, { algorithm: 'HS512' });
      return token;
    }
  }
  static getTokenToResetPassword(id: number, dni: string) {
    const token = jwt.sign({ id, dni }, JWT_RESET, { expiresIn: '3m' });
    return token;
  }

  static async updatePassword(id: Users['id'], password: string) {
    if (!id || !password) throw new AppError('Oops!,ID invalido', 400);
    const passwordHash = await bcrypt.hash(password, 10);
    const updatePassword = await prisma.users.update({
      where: { id },
      data: { password: passwordHash },
      select: {
        id: true,
        role: true,
        password: true,
        status: true,
        email: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            dni: true,
            phone: true,
          },
        },
      },
    });
    return updatePassword;
  }
}
export default authServices;

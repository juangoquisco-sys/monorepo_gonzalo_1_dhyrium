import AppError from '@/utils/appError';
import type { Asitec } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';

class AsitecServices {
  static async create(data: Asitec) {
    if (!data) throw new AppError(`Oops!, algo salio mal`, 400);
    const groups = await prisma.asitec.create({ data });
    return groups;
  }
}
export default AsitecServices;

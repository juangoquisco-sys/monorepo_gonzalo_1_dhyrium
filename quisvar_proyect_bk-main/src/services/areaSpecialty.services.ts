import AppError from '@/utils/appError';
import type { AreaSpecialty } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';

class AreaSpecialtyServices {
  static async createAreaSpecialty(data: AreaSpecialty) {
    if (!data) throw new AppError(`Datos incorrectos`, 400);
    const newArea = await prisma.areaSpecialty.create({
      data: {
        ...data,
        areaSpecialtyNameId: +data.areaSpecialtyNameId,
        startDate: data.startDate ? new Date(data.startDate) : null,
        untilDate: data.untilDate ? new Date(data.untilDate) : null,
      },
    });
    return newArea;
  }
  static async getAreaSpecialty(
    areaSpecialtyNameId: AreaSpecialty['areaSpecialtyNameId']
  ) {
    const areas = await prisma.areaSpecialty.findMany({
      where: { areaSpecialtyNameId },
    });
    return areas;
  }
  static async uploadAreaSpecialty(
    id: AreaSpecialty['id'],
    { institution, startDate, untilDate, file }: AreaSpecialty
  ) {
    const areas = await prisma.areaSpecialty.update({
      where: { id },
      data: {
        institution,
        startDate: startDate ? new Date(startDate) : null,
        untilDate: untilDate ? new Date(untilDate) : null,
        file,
      },
    });
    return areas;
  }
  static async deleteAreaSpecialty(id: AreaSpecialty['id']) {
    const areas = await prisma.areaSpecialty.delete({
      where: { id },
    });
    return areas;
  }
}
export default AreaSpecialtyServices;

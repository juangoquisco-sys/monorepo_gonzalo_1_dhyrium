import AppError from '@/utils/appError';
import type { Equipment } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
// import Queries from '../utils/queries';

class EquipmentServices {
  static async createEquipment(data: Equipment) {
    if (!data) throw new AppError(`Datos incorrectos`, 400);
    const hasLimit = await prisma.workStation.findFirst({
      where: { id: data.workStationId },
      select: {
        total: true,
        equipment: true,
      },
    });
    if (hasLimit?.equipment.length === hasLimit?.total)
      throw new AppError(`Capacidad llena`, 400);
    const alreadyExist = await prisma.equipment.findFirst({
      where: { userId: data.userId },
    });
    if (alreadyExist)
      throw new AppError(`Usuario ya tiene un equipo (remoto)`, 400);
    const equipment = await prisma.equipment.create({
      data,
    });
    return equipment;
  }
  static async getEquipment(id: Equipment['id']) {
    const equipment = await prisma.equipment.findMany({
      where: { id },
    });

    return equipment;
  }
  static async updateEquipment(id: Equipment['id'], data: Equipment) {
    const equipment = await prisma.equipment.update({
      where: { id },
      data,
    });

    return equipment;
  }
  static async deleteEquipment(id: Equipment['id']) {
    const equipment = await prisma.equipment.delete({
      where: { id },
    });
    return equipment;
  }
}
export default EquipmentServices;

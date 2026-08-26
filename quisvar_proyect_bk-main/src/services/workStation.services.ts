import AppError from '@/utils/appError';
import type { WorkStation } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import Queries from '@/utils/queries';

class WorkStationServices {
  static async createWorkStation(data: WorkStation) {
    if (!data) throw new AppError(`Datos incorrectos`, 400);
    const stations = await prisma.workStation.create({
      data,
    });
    return stations;
  }
  static async getWorkStation() {
    const stations = await prisma.workStation.findMany({
      select: {
        id: true,
        name: true,
        total: true,
        description: true,
        price: true,
        equipment: {
          include: {
            user: {
              select: {
                id: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    dni: true,
                    userPc: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    return stations;
  }
  static async updateWorkStation(id: WorkStation['id'], data: WorkStation) {
    const stations = await prisma.workStation.update({
      where: { id },
      data,
    });

    return stations;
  }
  static async deleteWorkStation(id: WorkStation['id']) {
    const stations = await prisma.workStation.delete({
      where: { id },
    });

    return stations;
  }
}
export default WorkStationServices;

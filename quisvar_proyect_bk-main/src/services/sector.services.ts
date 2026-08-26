import { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import type { Sector, Specialities } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import Queries from '@/utils/queries';
import Utilities from '@/utils/utilities';

export interface SectorQuery {
  all?: boolean;
  currencyYear?: string;
}

class SectorServices {
  static async getAll(
    userId: UserType['id'],
    { all = true, currencyYear }: SectorQuery
  ) {
    const findGroups =
      !all && all !== undefined
        ? await prisma.groupOnUsers.groupBy({
            by: ['groupId'],
            where: { userId },
          })
        : undefined;
    const groupFilter = findGroups
      ? {
          in: findGroups.map(({ groupId }) => groupId),
        }
      : undefined;
    let createdAt = undefined;
    const someStages = groupFilter ? { groupId: groupFilter } : undefined;
    if (currencyYear) {
      const currentY = new Date();
      currentY.setFullYear(+currencyYear);
      const year = Utilities.getRangeDate(currentY);
      createdAt = { gte: year.startOfYear, lte: year.endOfYear };
    }
    const getSectors = await prisma.sector.findMany({
      include: {
        specialities: {
          orderBy: { id: 'asc' },
          include: {
            typeSpecialities: {
              orderBy: { id: 'asc' },
              include: {
                projects: {
                  where: {
                    stages: { some: someStages },
                    contract: {
                      createdAt,
                    },
                  },
                  orderBy: { id: 'asc' },
                  include: {
                    moderator: Queries.selectProfileUser,
                    stages: {
                      select: {
                        id: true,
                      },
                    },
                  },
                },
                _count: {
                  select: {
                    projects: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    const filteredSectors = all
      ? getSectors
      : getSectors
          .map(sector => {
            const specialities = sector.specialities
              .map(spec => {
                const typeSpecialities = spec.typeSpecialities.filter(
                  ts => ts.projects.length > 0
                );
                return typeSpecialities.length > 0
                  ? { ...spec, typeSpecialities }
                  : null;
              })
              .filter(Boolean);

            return specialities.length > 0 ? { ...sector, specialities } : null;
          })
          .filter(Boolean);
    return filteredSectors;
  }
  static async create({ name }: Sector) {
    const newSector = await prisma.sector.create({
      data: { name },
    });
    return newSector;
  }
  static async update(id: Sector['id'], { name }: Sector) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const updateSector = await prisma.sector.update({
      where: { id },
      data: { name },
    });
    return updateSector;
  }
  static async delete(id: Specialities['id']) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const deleteSector = await prisma.sector.delete({
      where: { id },
    });
    return deleteSector;
  }
}

export default SectorServices;

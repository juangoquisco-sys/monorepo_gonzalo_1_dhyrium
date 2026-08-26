import AppError from '@/utils/appError';
import type { Division, Group } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import StageServices from '@/services/stages.services';

class DivisionService {
  static async create(data: Division) {
    if (!data) throw new AppError(`Oops!, algo salio mal`, 400);
    const findAll = await prisma.division.findMany();
    const division = await prisma.division.create({
      data: {
        ...data,
        order: findAll.length + 1,
      },
    });
    return division;
  }
  static async getAll() {
    const divisions = await prisma.division.findMany({
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        order: true,
        groups: {
          orderBy: { gNumber: 'asc' },
        },
      },
    });
    return divisions;
  }
  static async getLeader(id: number) {
    const divisions = await prisma.division.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        leaders: {
          select: {
            profile: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    return divisions;
  }
  static async makeLeader(id: Division['id'], leaderId: number) {
    const hasConnection = await prisma.division.findFirst({
      where: { id },
      select: {
        leaders: {
          select: {
            profile: { select: { id: true } },
          },
        },
      },
    });
    if (hasConnection?.leaders.some(({ profile }) => profile?.id === leaderId))
      throw new AppError(`El usuario ya es lider de esta oficina`, 409);
    const divisions = await prisma.division.update({
      where: { id },
      data: {
        leaders: {
          connect: { id: leaderId },
        },
      },
    });
    return divisions;
  }
  static async deleteLeader(id: Division['id'], leaderId: number) {
    const divisions = await prisma.division.update({
      where: { id },
      data: {
        leaders: {
          disconnect: { id: leaderId },
        },
      },
    });
    return divisions;
  }
  static async getDivisions() {
    const divisions = await prisma.division.findMany({
      select: {
        id: true,
        name: true,
        groups: {
          select: {
            name: true,
            groups: {
              where: { users: { status: true } },
              select: {
                users: {
                  select: {
                    id: true,
                    profile: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        dni: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    return divisions.map(division => {
      const users = division.groups.flatMap(group =>
        group.groups.flatMap(({ users }) => ({
          id: users?.id,
          firstName: users.profile?.firstName,
          lastName: users.profile?.lastName,
          dni: users.profile?.dni,
          groupName: group.name,
        }))
      );

      const filter = users.filter(
        (user, index, self) => index === self.findIndex(u => u.dni === user.dni)
      );

      return {
        id: division.id,
        officeName: division.name,
        users: filter,
      };
    });
  }
  static async edit(id: number, data: Division) {
    if (!id) throw new AppError(`Oops!, algo salio mal`, 400);
    const division = await prisma.division.update({
      where: { id },
      data,
    });
    return division;
  }
  static async delete(id: number) {
    if (!id) throw new AppError(`Oops!, algo salio mal`, 400);
    const find = await prisma.division.findUnique({
      where: { id },
      select: {
        groups: true,
      },
    });
    if (find && find.groups.length > 0)
      throw new AppError(`No se puede borrar una división con grupos`, 409);
    const division = await prisma.division.delete({
      where: { id },
    });
    return division;
  }
  //--------------RELATION------------------
  static async assingDivision(
    divisionId: Division['id'],
    groupId: Group['id']
  ) {
    if (!divisionId || !groupId)
      throw new AppError(`Oops!, algo salio mal`, 400);
    const division = await prisma.group.update({
      where: { id: groupId },
      data: {
        divisionId,
      },
    });
    return division;
  }
  static async deleteDivision(
    divisionId: Division['id'],
    groupId: Group['id']
  ) {
    if (!divisionId || !groupId)
      throw new AppError(`Oops!, algo salio mal`, 400);
    const division = await prisma.group.update({
      where: { id: groupId, divisionId },
      data: {
        divisionId: null,
      },
    });
    return division;
  }
  /* -------------------------------- PROJECTS -------------------------------- */
  static async getProjects(id: Division['id']) {
    if (!id) throw new AppError(`Oops!, algo salio mal`, 400);
    const divisions = await prisma.division.findUnique({
      where: { id },
      select: {
        id: true,
        groups: {
          select: {
            id: true,
            name: true,
            stage: {
              select: {
                id: true,
                name: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!divisions?.groups) return [];
    const res = await Promise.all(
      divisions?.groups.map(async ({ id, name, stage }) => {
        const stageData = await Promise.all(
          stage.map(async item => {
            const { days, balance, percentage } = await StageServices.find(
              item.id
            );
            return {
              ...item,
              days,
              balance,
              percentage,
            };
          })
        );
        return { id, name, stageData };
      })
    );

    return res;
  }
}
export default DivisionService;

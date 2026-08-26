import { ProfileByRoleType } from '@/types/types';
import type { Office, UserToOffice } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import Queries from '@/utils/queries';
import professionServices from '@/services/profession.services';
import AppError from '@/utils/appError';

class OfficeServices {
  public static async getAll(
    userId: number,
    includeUser: boolean = true,
    { typeRol, menuId, subMenuId, subTypeRol, includeSelf }: ProfileByRoleType
  ) {
    const notIn = includeSelf ? [] : [userId];
    if (!includeUser)
      return await prisma.office.findMany({
        include: { _count: { select: { users: true } } },
      });
    const getListOffice = await prisma.office.findMany({
      where: {
        name: { not: 'MESA DE PARTES' },
        users: { some: { isOfficeManager: true } },
      },
      include: {
        users: {
          where: {
            user: {
              id: { notIn },
              status: true,
              role: {
                menuPoints: {
                  some: {
                    menuId,
                    typeRol,
                    subMenuPoints: subMenuId
                      ? { some: { menuId: subMenuId, typeRol: subTypeRol } }
                      : {},
                  },
                },
              },
            },
          },
          select: {
            user: Queries.selectProfileUser,
            isOfficeManager: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const parseOffice = getListOffice.map(({ users, ...data }) => {
      const manager = users.find(user => user.isOfficeManager)?.user;
      const job = professionServices.find(manager?.profile?.job || '');
      const newManager = { ...manager, profile: { ...manager?.profile, job } };
      const parseUsers = users.map(({ user, ...value }) => {
        const job = professionServices.find(user.profile?.job || '');
        const _user = { ...user, profile: { ...user.profile, job } };
        const newUser = { ..._user, office: data.name };
        return { ...value, user: newUser };
      });
      // if (!includeUser)
      //   return {
      //     ...data,
      //     _count: { users: parseUsers.length },
      //   };
      return {
        ...data,
        _count: { users: parseUsers.length },
        manager: newManager,
        users: parseUsers,
      };
    });
    return parseOffice;
  }

  public static async create({ name }: Office) {
    const createOffice = await prisma.office.create({ data: { name } });
    return createOffice;
  }

  public static async update(id: Office['id'], { name }: Office) {
    if (!id) throw new AppError('Opps, ID incorrecto', 400);
    if (id === 1) throw new AppError('Error, oficina reservada', 409);
    const updateOffice = await prisma.office.update({
      where: { id },
      data: { name },
    });
    return updateOffice;
  }

  public static async delete(id: Office['id']) {
    if (!id) throw new AppError('Opps, ID incorrecto', 400);
    if (id === 1) throw new AppError('Error, oficina reservada', 409);
    const deleteOffice = await prisma.office.delete({
      where: { id },
    });
    return deleteOffice;
  }

  public static async addUser(
    id: Office['id'],
    data: Pick<UserToOffice, 'usersId'>[]
  ) {
    const addUsersOnOffice = await prisma.office.update({
      where: { id },
      data: {
        users: { createMany: { data, skipDuplicates: true } },
      },
    });
    return addUsersOnOffice;
  }
}
export default OfficeServices;

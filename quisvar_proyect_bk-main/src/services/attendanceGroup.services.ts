import { unlinkSync } from 'fs';
import AppError from '@/utils/appError';
import type { Group, GroupList, GroupOnUsers } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import { timerDay } from '@/utils/tools';
// import { findProjects } from '../controllers';

class AttendanceGroupService {
  static async getUsersGroup(groupId: Group['id']) {
    const users = await prisma.groupOnUsers.findMany({
      where: { groupId, active: true },
      select: {
        users: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        users: {
          profile: {
            firstName: 'asc',
          },
        },
      },
    });
    return users;
  }
  static async createList(data: GroupList, id: number, date: string) {
    if (!data) throw new AppError(`Oops!, algo salio mal`, 400);
    const { nombre, groupId } = data;
    const today = new Date();
    today.setDate(today.getDate());
    today.setHours(0, 0, 0, 0);
    const _today = today.getTime();
    const startOfDay = new Date(_today);
    const lastList = await prisma.groupList.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        duty: true,
        createdAt: true,
      },
      take: 1,
    });
    if (
      lastList.length > 0 &&
      lastList[0].duty.length === 0 &&
      startOfDay > lastList[0].createdAt
    ) {
      await this.deleteList(lastList[0].id);
    }

    // if (lastList[0].attendance.length === 0)
    //   throw new AppError(`Oops!, Al parecer hay una lista en curso`, 400);
    await prisma.groupList.create({
      data: {
        nombre,
        groupId,
      },
    });
    const list = await this.getList(date, id);
    return list;
  }
  static async deleteList(id: GroupList['id']) {
    if (!id) throw new AppError(`Oops!, algo salio mal`, 400);
    const hasGroup = await prisma.groupList.findFirst({
      where: { id },
      select: {
        duty: true,
      },
    });
    if (hasGroup && hasGroup?.duty.length > 0)
      throw new AppError(`No puede borrar una lista con datos`, 409);
    const groupList = await prisma.groupList.delete({ where: { id } });
    return groupList;
  }
  static async getList(date: string, groupId: GroupList['groupId']) {
    if (!date) throw new AppError(`Oops!, algo salio mal`, 400);
    const { startOfDay, endOfDay } = timerDay(date);
    const groupList = await prisma.groupList.findMany({
      where: {
        groupId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        nombre: true,
        groupId: true,
        file: true,
        groups: {
          select: {
            name: true,
            gNumber: true,
          },
        },
        duty: {
          orderBy: {
            id: 'asc',
          },
          include: {
            members: {
              include: {
                task: true,
              },
              orderBy: {
                id: 'asc',
              },
            },
          },
        },
        createdAt: true,
      },
    });
    return groupList;
  }

  //Group List File
  static async updateListFile(file: GroupList['file'], id: GroupList['id']) {
    if (!file || !id) throw new AppError(`Oops!, algo salio mal`, 400);
    const groupList = await prisma.groupList.update({
      where: { id },
      data: { file },
    });
    return groupList;
  }
  static async deleteListFile(id: GroupList['id']) {
    if (!id) throw new AppError(`Oops!, id no encontrado`, 400);
    const res = await prisma.groupList.findUnique({
      where: { id },
      select: {
        file: true,
      },
    });
    if (res?.file) unlinkSync(`public/groups/daily/${res.file}`);
    const consortiums = await prisma.groupList.update({
      where: { id },
      data: {
        file: null,
      },
    });
    return consortiums;
  }
  //Disabled Users
  static async disabledGroup(userId: GroupOnUsers['userId'], status: boolean) {
    if (!userId) throw new AppError(`Oops!, algo salio mal`, 400);
    const attendance = await prisma.groupOnUsers.updateMany({
      where: { userId },
      data: {
        active: status,
      },
    });
    return attendance;
  }
  //Attendance File
  static async updateFile(id: GroupList['id'], file: string) {
    if (!id) throw new AppError(`Oops!, algo salio mal`, 400);
    const attendance = await prisma.groupList.update({
      where: { id },
      data: { file },
    });
    return attendance;
  }
  static async deleteFile(id: GroupList['id']) {
    if (!id) throw new AppError(`Oops!, algo salio mal`, 400);
    const res = await prisma.groupList.findUnique({
      where: { id },
      select: {
        file: true,
      },
    });
    if (res?.file) unlinkSync(`public/groups/daily/${res.file}`);
    const attendance = await prisma.groupList.update({
      where: { id },
      data: { file: null },
    });
    return attendance;
  }
}
export default AttendanceGroupService;

import AppError from '@/utils/appError';
import {
  AttendanceListState,
  type BasicLevels,
  type BasicTaskOnUsers,
  type BasicTasks,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import { v4 as uuidv4 } from 'uuid';
import { numberToConvert } from '@/utils/tools';
import { ObjectNumber, ParametersReportUser } from '@/types/types';
import LicenseServices from '@/services/licenses.services';
interface UserList {
  userId: number;
  taskId: BasicTaskOnUsers['taskId'];
}

interface Project<T> {
  id: number;
  name: string | null;
  tasks: T[];
}
interface Levels {
  id: number;
  typeItem: BasicLevels['typeItem'];
  index: number;
  name?: string;
  _count: {
    subTasks: number;
    stages: number;
  };
  levelList: number[];
}

class BasicTaskOnUserServices {
  public static async add({ taskId, userId }: UserList) {
    const status = 'PROCESS';
    const list = [
      prisma.basicTasks.update({ where: { id: taskId }, data: { status } }),
      prisma.basicTaskOnUsers.create({
        data: { userId, taskId, status: true },
      }),
    ];
    return await prisma.$transaction(list).then(res => res[1]);
  }

  public static async authorizateUsers(ids: BasicTaskOnUsers['id'][]) {
    if (!ids.length) throw new AppError('Oops, ID invalido', 400);
    const updateStatusUser = await prisma.basicTaskOnUsers.updateMany({
      where: { id: { in: ids } },
      data: { status: false },
    });
    return updateStatusUser;
  }

  public static async aprobateByTask(ids: BasicTasks['id'][]) {
    const getTasks = await prisma.basicTasks.findMany({
      where: { id: { in: ids } },
      select: {
        users: { take: 1, orderBy: [{ finishedAt: 'desc' }, { id: 'desc' }] },
      },
    });
    const getUsers = getTasks.map(({ users }) => users[0].id);
    const updateStatus = await prisma.basicTaskOnUsers.updateMany({
      where: { id: { in: getUsers } },
      data: { status: false },
    });
    return updateStatus;
  }

  public static async addColaborators(
    id: BasicTaskOnUsers['id'],
    userList: { userId: number; percentage: number }[]
  ) {
    if (!id) throw new AppError('Oops, ID invalido', 400);
    const findTask = await prisma.basicTaskOnUsers.findUnique({
      where: { id },
      select: {
        percentage: true,
        taskId: true,
        userId: true,
        assignedAt: true,
        finishedAt: true,
      },
    });
    if (!findTask) throw new AppError('Oops, usuario invalido', 400);
    const totalPercentage = userList.reduce((acc, u) => acc + u.percentage, 0);
    const { percentage, ...task } = findTask;
    if (totalPercentage > percentage)
      throw new AppError('Se excedio el tamaño de porcentage', 400);
    const groupId = uuidv4();
    const data = userList.map(user => ({
      ...task,
      status: false,
      groupId,
      ...user,
    }));
    const queryList = [
      prisma.basicTaskOnUsers.update({
        where: { id },
        data: {
          status: false,
          percentage: percentage - totalPercentage,
          groupId,
        },
      }),
      prisma.basicTaskOnUsers.createMany({
        data,
      }),
      prisma.basicTaskOnUsers.create({
        data: {
          userId: findTask.userId,
          taskId: findTask.taskId,
          status: true,
        },
      }),
    ];
    const createUsers = await prisma
      .$transaction(queryList)
      .then(res => res[0]);
    return createUsers;
  }

  public static async addMod({ taskId, userId }: UserList) {
    const addNewMod = await prisma.basicTasks.update({
      where: { id: taskId },
      data: { mods: { set: [], connect: { id: userId } } },
    });
    return addNewMod;
  }

  public static async remove(id: BasicTaskOnUsers['id']) {
    const findUser = await prisma.basicTaskOnUsers.findUnique({
      where: { id },
      select: {
        task: { select: { id: true, _count: { select: { users: true } } } },
      },
    });
    if (!findUser) throw new AppError('Opps, usuario no encontrado', 404);
    const status = findUser.task._count.users - 1 ? 'UNRESOLVED' : 'PROCESS';
    const list = [
      prisma.basicTaskOnUsers.delete({ where: { id } }),
      prisma.basicTasks.update({
        where: { id: findUser.task.id },
        data: { status },
      }),
    ];
    return await prisma.$transaction(list).then(res => res[1]);
  }

  public static async removeMod({ taskId, userId }: UserList) {
    const removeNewMod = await prisma.basicTasks.update({
      where: { id: taskId },
      data: { mods: { disconnect: { id: userId } } },
    });
    return removeNewMod;
  }

  public static async getReport(
    userId: number,
    {
      limit: take,
      offset,
      page,
      projectId,
      stageId,
      status,
      salaryAdvance,
      phaseId,
      initialDate,
      untilDate,
    }: ParametersReportUser
  ) {
    if (initialDate && !(initialDate instanceof Date))
      throw new AppError('Fecha inicial invalida', 400);
    if (untilDate && !(untilDate instanceof Date))
      throw new AppError('Fecha final invalida', 400);
    const skip = this.getPage({ offset, page, limit: take });
    const phase = phaseId
      ? await prisma.phases.findUnique({
          where: { id: phaseId },
          select: { initialDate: true, untilDate: true },
        })
      : undefined;
    const rangePhase =
      initialDate && untilDate
        ? { gte: initialDate, lte: untilDate }
        : phase
        ? { gte: phase.initialDate, lte: phase.untilDate }
        : undefined;
    const getReport = await prisma.basicTaskOnUsers.findMany({
      where: {
        userId,
        assignedAt: rangePhase,
        reportId: null,
        task: {
          Levels: { stages: { id: stageId, projectId } },
          status: status
            ? status
            : salaryAdvance
            ? { in: ['REVIEWED', 'APPROVED'] }
            : undefined,
        },
      },
      select: {
        id: true,
        finishedAt: true,
        assignedAt: true,
        percentage: true,
        task: {
          select: {
            id: true,
            name: true,
            status: true,
            days: true,
            price: true,
            index: true,
            typeItem: true,
            updatedAt: true,
            Levels: {
              select: {
                id: true,
                levelList: true,
                stages: {
                  select: {
                    moderator: {
                      select: {
                        id: true,
                        profile: {
                          select: { firstName: true, lastName: true },
                        },
                      },
                    },
                    project: { select: { id: true, name: true } },
                  },
                },
              },
            },
            mods: {
              select: {
                id: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      skip,
      take,
    });
    const total = await prisma.basicTaskOnUsers.count({
      where: {
        userId,
        assignedAt: rangePhase,
        task: {
          Levels: { stages: { id: stageId, projectId } },
          status: status
            ? status
            : salaryAdvance
            ? { in: ['REVIEWED', 'APPROVED'] }
            : undefined,
        },
      },
    });
    const ids = getReport.reduce<number[]>((acc, list) => {
      acc.push(...list.task.Levels.levelList, list.task.Levels.id);
      return [...new Set(acc)];
    }, []);
    const levels = await prisma.basicLevels.findMany({
      where: { id: { in: ids } },
      select: {
        _count: true,
        id: true,
        typeItem: true,
        index: true,
        levelList: true,
      },
      orderBy: { level: 'desc' },
    });

    /*------------------------ User Attendance ----------------------------------
      This section deals show user details on attendance.
    */
    const list = await prisma.listOnUsers.groupBy({
      by: ['status'],
      where: {
        usersId: userId,
        assignedAt: rangePhase,
        list: { state: AttendanceListState.FINALIZED },
      },
      _count: { status: true },
    });
    const attendance = list.reduce<ObjectNumber>((acc, _list) => {
      const status = _list.status;
      if (!acc[status]) acc[status] = 0;
      acc[status] = _list._count.status;
      return acc;
    }, {});
    /*------------------------ User Attendance ----------------------------------
        This section deals show user details on attendance.
      */
    const listLicenses = await prisma.licenses.findMany({
      where: {
        usersId: userId,
        createdAt: rangePhase,
      },
      select: {
        checkout: true,
        fine: true,
      },
    });
    const license = LicenseServices.countFee(listLicenses);
    const _levels = this.getListItems(levels);
    const transformList = getReport.reduce(
      (acc: Project<typeof list>[], { task, ...list }) => {
        const { id, name } = task.Levels.stages.project;
        const taskItem = numberToConvert(task.index, task.typeItem) + '.';
        const item =
          _levels.find(({ id }) => id === task.Levels.id)?.item + taskItem;
        const { Levels: _L, ..._task } = task;
        const newTask = {
          ...list,
          price: (list.percentage * Number(task.price)) / 100,
          taskInfo: {
            item,
            moderator: _L.stages.moderator,
            ..._task,
          },
        };
        const index = acc.findIndex(item => item.id === id);
        if (index < 0) {
          acc.push({ id, name, tasks: [newTask] });
        } else {
          acc[index].tasks = [...acc[index].tasks, newTask];
        }
        return acc;
      },
      []
    );
    return { total, info: { license, attendance }, data: transformList };
  }

  public static getListItems(list: Levels[]) {
    const _levels = list.map(element => {
      return {
        ...element,
        levelList: [...element.levelList.slice(1), element.id],
        item: numberToConvert(element.index, element.typeItem) + '.',
      };
    });
    return _levels
      .filter(l => l._count.subTasks)
      .map(({ id, levelList }) => {
        const parentLevels: string[] = [];
        let itemAux = '';
        const findLevels = _levels
          .filter(({ id }) => levelList.includes(id))
          .reverse();
        findLevels.forEach(({ item, name }) => {
          if (name) parentLevels.push(itemAux + item + ' ' + name);
          itemAux += item;
        });
        return { id, item: itemAux, parentLevels };
      });
  }

  private static getPage({ limit, offset, page }: ParametersReportUser) {
    if (offset !== undefined) return offset;
    if (!offset && page === undefined) return undefined;
    const numberPage = limit && page && limit * page;
    // const newPage = numberPage ? numberPage + 1 : numberPage;
    return numberPage;
  }
}
export default BasicTaskOnUserServices;

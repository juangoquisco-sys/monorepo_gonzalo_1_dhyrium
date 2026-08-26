import AppError from '@/utils/appError';
import { v4 as uuidv4 } from 'uuid';
import type {
  SubTaskOnUsers,
  SubTasks,
  // TypeItem,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import BasicTaskOnUserServices from '@/services/basictaskOnUsers.services';
import ListServices from '@/services/list.services';
import LicenseServices from '@/services/licenses.services';
import Queries from '@/utils/queries';
import Utilities from '@/utils/utilities';
import { ProjectTask, TaskListParams } from '@/types/task';
import { numberToConvert } from '@/utils/tools';
import StageServices from '@/services/stages.services';
import LevelsServices from '@/services/levels.services';
interface UserList {
  userId: number;
  taskId: SubTaskOnUsers['taskId'];
}

class TaskOnUsersServices {
  public static async add({ taskId, userId }: UserList) {
    const status = 'PROCESS';
    const list = [
      prisma.subTasks.update({ where: { id: taskId }, data: { status } }),
      prisma.subTaskOnUsers.create({
        data: { userId, taskId, status: true },
      }),
    ];
    return await prisma.$transaction(list).then(res => res[1]);
  }

  public static async updateUser({ taskId, userId }: UserList) {
    const status = 'PROCESS';
    const user = await prisma.subTaskOnUsers.findFirst({
      where: { taskId },
      orderBy: { id: 'desc' },
    });
    if (!user) throw new AppError('Oops!, usuario invalido', 400);
    if (userId === 0 && !user.statusPayment) {
      const list = [
        prisma.subTasks.update({
          where: { id: taskId },
          data: { status: 'UNRESOLVED' },
        }),
        prisma.subTaskOnUsers.delete({ where: { id: user.id } }),
      ];
      return await prisma.$transaction(list).then(res => res[1]);
    }
    if (user.statusPayment) {
      const list = [
        prisma.subTasks.update({ where: { id: taskId }, data: { status } }),
        prisma.subTaskOnUsers.create({
          data: { userId, taskId, status: true },
        }),
      ];
      return await prisma.$transaction(list).then(res => res[1]);
    }
    const list = [
      prisma.subTasks.update({ where: { id: taskId }, data: { status } }),
      prisma.subTaskOnUsers.delete({ where: { id: user.id } }),
      prisma.subTaskOnUsers.create({
        data: { userId, taskId, status: true },
      }),
    ];
    return await prisma.$transaction(list).then(res => res[1]);
  }

  public static async authorizateUsers(ids: SubTaskOnUsers['id'][]) {
    if (!ids.length) throw new AppError('Oops, ID invalido', 400);
    const updateStatusUser = await prisma.subTaskOnUsers.updateMany({
      where: { id: { in: ids } },
      data: { status: false },
    });
    return updateStatusUser;
  }

  public static async aprobateByTask(ids: SubTasks['id'][]) {
    const getTasks = await prisma.subTasks.findMany({
      where: { id: { in: ids } },
      select: {
        users: { take: 1, orderBy: [{ finishedAt: 'desc' }, { id: 'desc' }] },
      },
    });
    const getUsers = getTasks.map(({ users }) => users[0].id);
    const updateStatus = await prisma.subTaskOnUsers.updateMany({
      where: { id: { in: getUsers } },
      data: { status: false },
    });
    return updateStatus;
  }

  public static async addColaborators(
    id: SubTaskOnUsers['id'],
    userList: { userId: number; percentage: number }[]
  ) {
    if (!id) throw new AppError('Oops, ID invalido', 400);
    const findTask = await prisma.subTaskOnUsers.findUnique({
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
      prisma.subTaskOnUsers.update({
        where: { id },
        data: {
          status: false,
          percentage: percentage - totalPercentage,
          groupId,
        },
      }),
      prisma.subTaskOnUsers.createMany({
        data,
      }),
      prisma.subTaskOnUsers.create({
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
    const addNewMod = await prisma.subTasks.update({
      where: { id: taskId },
      data: { mods: { set: [], connect: { id: userId } } },
    });
    return addNewMod;
  }

  public static async remove(id: SubTaskOnUsers['id']) {
    const findUser = await prisma.subTaskOnUsers.findUnique({
      where: { id },
      select: {
        task: { select: { id: true, _count: { select: { users: true } } } },
      },
    });
    if (!findUser) throw new AppError('Opps, usuario no encontrado', 404);
    const status = findUser.task._count.users - 1 ? 'UNRESOLVED' : 'PROCESS';
    const list = [
      prisma.subTaskOnUsers.delete({ where: { id } }),
      prisma.subTasks.update({
        where: { id: findUser.task.id },
        data: { status },
      }),
    ];
    return await prisma.$transaction(list).then(res => res[1]);
  }

  public static async removeMod({ taskId, userId }: UserList) {
    const removeNewMod = await prisma.subTasks.update({
      where: { id: taskId },
      data: { mods: { disconnect: { id: userId } } },
    });
    return removeNewMod;
  }

  public static async taskListByUser(
    userId: number,
    { limit, offset, page, stage, project, ...options }: TaskListParams
  ) {
    const initialDate = Utilities.validateDate(options.initialDate);
    const untilDate = Utilities.validateDate(options.untilDate);
    const skip = Utilities.getPage({ limit, offset, page });
    const assignedAt = { gte: initialDate, lte: untilDate };
    const status = options.status
      ? options.status
      : options.salaryAdvance
      ? { in: ['REVIEWED', 'APPROVED'] as SubTasks['status'][] }
      : undefined;
    //-------------------------------------------------------------------------
    const taskList = await prisma.subTaskOnUsers.findMany({
      where: {
        userId,
        assignedAt,
        statusPayment: options.salaryAdvance ? false : undefined,
        percentage: options.salaryAdvance ? { not: 0 } : undefined,
        task: { Levels: { stages: { id: stage, projectId: project } }, status },
      },
      include: {
        task: {
          include: {
            Levels: {
              select: {
                id: true,
                levelList: true,
                stages: {
                  select: {
                    id: true,
                    name: true,
                    monthlyPrice: true,
                    stayPrice: true,
                    project: { select: { id: true, name: true } },
                  },
                },
              },
            },
            mods: Queries.selectProfileShort,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { task: { updatedAt: 'desc' } }],
      skip,
      take: limit,
    });
    const total = await prisma.subTaskOnUsers.count({
      where: {
        userId,
        assignedAt,
        // statusPayment: options.salaryAdvance,
        statusPayment: options.salaryAdvance ? false : undefined,
        task: { Levels: { stages: { id: stage, projectId: project } }, status },
      },
    });

    //----------------------- get levels -----------------------------------
    const idsList = taskList.reduce<number[]>((acc, list) => {
      acc.push(...list.task.Levels.levelList, list.task.Levels.id);
      return [...new Set(acc)];
    }, []);
    const levelList = await prisma.levels.findMany({
      where: { id: { in: idsList } },
      select: {
        _count: true,
        id: true,
        typeItem: true,
        index: true,
        levelList: true,
      },
      orderBy: { level: 'desc' },
    });
    const levels = BasicTaskOnUserServices.getListItems(levelList);
    const data = taskList.reduce(
      (acc: ProjectTask<typeof list>[], { task, ...list }) => {
        const { id, name, project, monthlyPrice } = task.Levels.stages;
        const newPrice =
          StageServices.calculatePricing({ monthlyPrice, stayPrice: 0 }) *
          task.days;
        const taskItem = numberToConvert(task.index, task.typeItem) + '.';
        const item =
          (levels.find(({ id }) => id === task.Levels.id)?.item || '') +
          taskItem;
        const { mods: _m, Levels: _l, ..._task } = task;
        const newTask = {
          ...list,
          finishedAt: list.finishedAt ? list.finishedAt : list.updatedAt,
          taskInfo: {
            ..._task,
            item,
            price: +_task.price || newPrice || 0,
            moderator: task.mods[0],
          },
        };
        const index = acc.findIndex(i => i.id === id);
        if (index < 0) {
          acc.push({
            id,
            name: project?.name + ' - ' + name,
            projectId: project?.id,
            cui: null,
            tasks: [newTask],
          });
        } else {
          acc[index].tasks = [...acc[index].tasks, newTask];
        }
        return acc;
      },
      []
    );
    if (options.salaryAdvance) {
      //------------------------ Attendance ----------------------------------
      const attendance = await ListServices.getAttendaceListByUser(userId, {
        initialDate,
        untilDate,
      });
      //------------------------ Licences ----------------------------------
      const licences = await LicenseServices.getLcenseListByUser(userId, {
        initialDate,
        untilDate,
      });
      return { total, info: { licences, attendance }, data };
    }
    return { total, data };
  }
  public static async taskListByMod(
    userId: number,
    { limit, offset, page, stage, project, ...options }: TaskListParams
  ) {
    if (!userId && userId !== 0)
      throw new AppError('ID de usuario invalido', 400);
    const initialDate = Utilities.validateDate(options.initialDate);
    const untilDate = Utilities.validateDate(options.untilDate);
    const skip = Utilities.getPage({ limit, offset, page });
    const updatedAt = { gte: initialDate, lte: untilDate };
    const mods = options.all
      ? undefined
      : userId
      ? { some: { id: userId } }
      : { none: {} };
    //-------------------------------------------------------------------------
    const taskList = await prisma.subTasks.findMany({
      where: {
        updatedAt,
        Levels: { stages: { id: stage, projectId: project } },
        status: options.status,
        mods,
      },
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        status: true,
        days: true,
        typeItem: true,
        index: true,
        updatedAt: true,
        name: true,
        Levels: {
          select: {
            id: true,
            levelList: true,
            stages: {
              select: {
                id: true,
                name: true,
                monthlyPrice: true,
                project: { select: { id: true, name: true } },
              },
            },
          },
        },
        users: {
          where: { OR: [{ status: true }, { statusPayment: true }] },
          select: {
            percentage: true,
            id: true,
            status: true,
            statusPayment: true,
            user: {
              select: {
                id: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
      skip,
      take: limit,
    });
    const total = await prisma.subTasks.count({
      where: {
        updatedAt,
        Levels: { stages: { id: stage, projectId: project } },
        status: options.status,
        mods,
      },
    });

    //----------------------- get levels -----------------------------------
    const idsList = taskList.reduce<number[]>((acc, list) => {
      acc.push(...list.Levels.levelList, list.Levels.id);
      return [...new Set(acc)];
    }, []);
    const tasklevels = await LevelsServices.getLevelsByIds(idsList);
    const data = taskList.reduce(
      (acc: ProjectTask<typeof task>[], { users, Levels, ...task }) => {
        const { id, name, project, monthlyPrice } = Levels.stages;
        const taskItem = numberToConvert(task.index, task.typeItem) + '.';
        const levelFind = tasklevels.find(({ id }) => id === Levels.id);
        const item = (levelFind?.item || '') + taskItem;
        const percentage = users.reduce<number>(
          (acc, u) => acc + (u.statusPayment || u.status ? u.percentage : 0),
          0
        );
        const mainUser =
          (users[0] && {
            id: users[0].id,
            userId: users[0].user.id,
            profile: users[0].user.profile,
          }) ||
          null;
        const newTask = {
          ...task,
          item,
          percentage,
          price: +(task.days * (monthlyPrice / 30)).toFixed(2) || 0,
          user: mainUser,
          parentLevels: levelFind?.parentLevels,
        };
        const index = acc.findIndex(i => i.id === id);
        if (index < 0) {
          acc.push({
            id,
            name: project?.name + ' - ' + name,
            projectId: project?.id,
            tasks: [newTask],
          });
        } else {
          // acc[index].tasks = [...acc[index].tasks, newTask];
          acc[index].tasks.push(newTask);
        }
        return acc;
      },
      []
    );
    return { total, data };
  }
}
export default TaskOnUsersServices;

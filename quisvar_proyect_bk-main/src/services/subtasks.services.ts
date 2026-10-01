/* eslint-disable @typescript-eslint/no-unused-vars */
import type { SubTasks } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import { existsSync, unlinkSync } from 'fs';
import Queries from '@/utils/queries';
import { numberToConvert } from '@/utils/tools';
import {
  ItemsToReduce,
  SortingListType,
  UpdateTaskDays,
  UpdateTaskPrices,
} from '@/types/task';
import { Level } from '@/types/types';
import path from 'path';
import LevelsServices from '@/services/levels.services';
import LegacyTaskAssignmentContextService from '@/services/legacyTaskAssignmentContext.services';
import {
  insertTaskId,
  lockTaskOrder,
  orderTaskIds,
  requestedTaskIds,
  writeSubTaskOrder,
} from '@/services/taskOrdering.services';

class SubTasksServices {
  public static async find(id: SubTasks['id']) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const findSubTask = await prisma.subTasks.findUnique({
      where: { id },
      include: Queries.includeSubtask,
    });
    if (!findSubTask) throw new AppError('No se pudo encontrar la tares ', 404);
    const {
      Levels,
      files: listFiles,
      users: listUsers,
      feedBacks,
      ...task
    } = findSubTask;
    const managerGroup = Levels.stages.group?.groups;
    const users = listUsers.reduce<ItemsToReduce<typeof listUsers>>(
      (acc, user) => {
        const {
          status,
          statusPayment,
          user: { status: userStatus },
        } = user;
        const type = !userStatus
          ? 'ARCHIVE'
          : status && !statusPayment
          ? 'ACTIVE'
          : 'INACTIVE';
        if (!acc[type]) acc[type] = [];
        acc[type].push(user);
        return acc;
      },
      {}
    );
    const files = listFiles.reduce<ItemsToReduce<typeof listFiles>>(
      (acc, file) => {
        const { type } = file;
        if (!acc[type]) acc[type] = [];
        acc[type].push(file);
        return acc;
      },
      {}
    );
    const percentage = listUsers.reduce<number>(
      (acc, u) => acc + (u.statusPayment || u.status ? u.percentage : 0),
      0
    );
    const percentageWithoutActive = listUsers.reduce<number>(
      (acc, u) => acc + (u.statusPayment ? u.percentage : 0),
      0
    );
    const initialDate = listUsers[0]?.assignedAt;
    const untilDate = listUsers[listUsers.length - 1]?.finishedAt;
    const lastFeedback = feedBacks[0];
    const item = await this.getItem([...Levels.levelList, Levels.id]);
    const auxData = { item, percentage, percentageWithoutActive };
    const aux = { initialDate, untilDate, lastFeedback, users, files };
    return { ...auxData, managerGroup, ...task, ...aux };
  }

  public static async findUsersAndMods(
    id: SubTasks['id'],
    { users: withUsers }: { users?: boolean }
  ) {
    const context = await LegacyTaskAssignmentContextService.forTechnicalTask(
      id
    );
    const group = context.members.map(users => ({ users }));
    if (!withUsers) return { group };
    return { group, users: context.allActiveUsers };
  }

  public static async create({
    name,
    price,
    days,
    levels_Id,
    index,
  }: Pick<SubTasks, 'name' | 'price' | 'days' | 'levels_Id'> & {
    index?: number;
  }) {
    const mods = await this.getCoordinate(levels_Id);
    return prisma.$transaction(async transaction => {
      await lockTaskOrder(transaction, 'technical', levels_Id);
      const level = await transaction.levels.findUnique({
        where: { id: levels_Id },
        select: {
          typeItem: true,
          subTasks: {
            orderBy: [{ index: 'asc' }, { id: 'asc' }],
            select: { id: true, index: true, name: true },
          },
        },
      });
      if (!level) throw new AppError('No se pudo encontrar el índice', 404);
      if (level.subTasks.some(task => task.name === name))
        throw new AppError('Error, Nombre existente', 409);

      const orderedIds = orderTaskIds(level.subTasks);
      const insertionIndex = index
        ? Math.min(Math.max(index - 1, 0), orderedIds.length)
        : orderedIds.length;
      const temporaryIndex =
        Math.max(0, ...level.subTasks.map(task => task.index)) +
        level.subTasks.length +
        1;
      const newTask = await transaction.subTasks.create({
        data: {
          name,
          levels_Id,
          index: temporaryIndex,
          typeItem: level.typeItem,
          price,
          days,
          mods,
        },
      });
      orderedIds.splice(insertionIndex, 0, newTask.id);
      await writeSubTaskOrder(transaction, orderedIds);
      return { ...newTask, index: insertionIndex + 1 };
    });
  }

  public static async update(
    id: SubTasks['id'],
    { days, name, price }: Pick<SubTasks, 'name' | 'days' | 'price'>
  ) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const updateTask = await prisma.subTasks.update({
      where: { id },
      data: { days, name, price },
    });
    return updateTask;
  }

  public static async updateDays({
    stageId,
    tasks,
    monthlyPrice,
    stayPrice,
  }: {
    stageId: number;
    tasks: UpdateTaskDays[];
    monthlyPrice?: number;
    stayPrice?: number;
  }) {
    if (!stageId) throw new AppError('Oops!,ID invalido', 400);
    await prisma.stages.update({
      where: { id: stageId },
      data: { monthlyPrice, stayPrice },
    });
    const updates = tasks.map(({ id, days }) => {
      return prisma.subTasks.update({ where: { id }, data: { days } });
    });
    return await prisma.$transaction(updates);
  }

  public static async updatePrices(tasks: UpdateTaskPrices[]) {
    const updates = tasks.map(({ id, price }) => {
      return prisma.subTasks.update({ where: { id }, data: { price } });
    });
    return await prisma.$transaction(updates);
  }

  public static async sorting(list: SortingListType[]) {
    if (!list.length) return [];
    const firstTask = await prisma.subTasks.findUnique({
      where: { id: list[0].id },
      select: { levels_Id: true },
    });
    if (!firstTask) throw new AppError('No existe la tarea', 404);

    return prisma.$transaction(async transaction => {
      await lockTaskOrder(transaction, 'technical', firstTask.levels_Id);
      const siblings = await transaction.subTasks.findMany({
        where: { levels_Id: firstTask.levels_Id },
        orderBy: [{ index: 'asc' }, { id: 'asc' }],
        select: { id: true, index: true },
      });
      let orderedIds: number[];
      try {
        orderedIds = requestedTaskIds(orderTaskIds(siblings), list);
      } catch {
        throw new AppError(
          'El orden debe incluir todas las tareas una sola vez',
          400
        );
      }
      await writeSubTaskOrder(transaction, orderedIds);
      return orderedIds.map((id, position) => ({ id, index: position + 1 }));
    });
  }
  public static async delete(id: SubTasks['id']) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const task = await prisma.subTasks.findUnique({
      where: { id },
      select: {
        levels_Id: true,
        Levels: { select: { unique: true } },
        _count: { select: { users: { where: { statusPayment: true } } } },
      },
    });
    if (!task) throw new AppError('Esta tarea no fue encontrada', 400);
    if (task.Levels.unique)
      throw new AppError(
        'No se puede eliminar esta tarea porque pertenece a un nivel único. Los niveles creados con la opción "Nivel con tarea" conservan su única tarea.',
        409
      );
    if (task._count.users)
      throw new AppError(
        'No se puede eliminar esta tarea porque tiene asignaciones con pago registrado.',
        409
      );
    return prisma.$transaction(async transaction => {
      await lockTaskOrder(transaction, 'technical', task.levels_Id);
      const current = await transaction.subTasks.findUnique({
        where: { id },
        select: { index: true, levels_Id: true },
      });
      if (!current) throw new AppError('Oops!,ID invalido', 400);
      const siblings = await transaction.subTasks.findMany({
        where: { levels_Id: current.levels_Id },
        orderBy: [{ index: 'asc' }, { id: 'asc' }],
        select: { id: true, index: true },
      });
      const subTaskDelete = await transaction.subTasks.delete({
        where: { id },
        select: { index: true, levels_Id: true },
      });
      const orderedIds = orderTaskIds(siblings).filter(taskId => taskId !== id);
      await writeSubTaskOrder(transaction, orderedIds);
      const itemsToUpdate = orderedIds.map((taskId, position) => ({
        id: taskId,
        index: position + 1,
      }));
      return { subTaskDelete, itemsToUpdate };
    });
  }

  public static async approved(id: SubTasks['id']) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const feedback = await prisma.feedback.findFirst({
      where: { subTasksId: id },
      select: {
        files: {
          where: { feedback: { type: 'ACCEPTED' } },
          select: { type: true, dir: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!feedback) throw new AppError('Oops!,ID Archivo no encontrado', 400);
    const files = feedback.files;
    return files;
    // const updateTask = await prisma.subTasks.update({
    //   where: { id },
    //   data: {
    //     status: 'APPROVED',
    //     users: {
    //       updateMany: { where: { subtaskId: id }, data: { status: true } },
    //     },
    //     files: {
    //       updateMany: { where: { subTasksId: id }, data: { type: 'UPLOADS' } },
    //     },
    //   },
    // });
  }

  public static async restore(id: SubTasks['id']) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const subTaskRestore = await prisma.subTasks.update({
      where: { id },
      data: {
        status: 'UNRESOLVED',
        files: { deleteMany: { subTasksId: id } },
        feedBacks: { deleteMany: { subTasksId: id } },
        users: { deleteMany: { taskId: id, statusPayment: false } },
      },
      select: { name: true, id: true, files: true },
    });
    subTaskRestore.files.forEach(file => {
      const path = file.dir + '/' + file.name;
      if (existsSync(path)) unlinkSync(path);
    });
    return subTaskRestore;
  }

  public static async addToUpperorLower(
    id: SubTasks['id'],
    { name, days }: Pick<SubTasks, 'days' | 'name'>,
    typeGte: 'upper' | 'lower'
  ) {
    if (!id || !typeGte) throw new AppError('Oops!,ID invalido', 400);
    //------------------------------------------------------------------
    const findTask = await prisma.subTasks.findUnique({ where: { id } });
    if (!findTask) throw new AppError('No existe la tarea', 404);
    return prisma.$transaction(async transaction => {
      await lockTaskOrder(transaction, 'technical', findTask.levels_Id);
      const anchor = await transaction.subTasks.findUnique({ where: { id } });
      if (!anchor) throw new AppError('No existe la tarea', 404);
      const siblings = await transaction.subTasks.findMany({
        where: { levels_Id: anchor.levels_Id },
        orderBy: [{ index: 'asc' }, { id: 'asc' }],
        select: { id: true, index: true, name: true },
      });
      if (siblings.some(task => task.name === name))
        throw new AppError('Error, Nombre existente', 409);
      const temporaryIndex =
        Math.max(0, ...siblings.map(task => task.index)) + siblings.length + 1;
      const newTask = await transaction.subTasks.create({
        data: {
          levels_Id: anchor.levels_Id,
          name,
          days,
          index: temporaryIndex,
          typeItem: anchor.typeItem,
        },
      });
      const orderedIds = insertTaskId(
        orderTaskIds(siblings),
        newTask.id,
        id,
        typeGte
      );
      await writeSubTaskOrder(transaction, orderedIds);
      const newIndex = orderedIds.indexOf(newTask.id) + 1;
      const updateTasks = orderedIds.map((taskId, position) => ({
        id: taskId,
        index: position + 1,
      }));
      return { newTask: { ...newTask, index: newIndex }, updateTasks };
    });
  }

  public static async findDuplicates(
    name: string,
    id: number,
    type: 'ROOT' | 'ID'
  ) {
    let levels_Id = id;
    if (name.includes('projects'))
      throw new AppError('Error palabra reservada', 409);
    if (type === 'ID') {
      const getLevelId = await prisma.subTasks.findUnique({
        where: { id },
        select: { levels_Id: true },
      });
      if (!getLevelId) throw new AppError('No existe encontrar el índice', 404);
      levels_Id = getLevelId.levels_Id;
    }
    const findLevel = await prisma.levels.findUnique({
      where: { id: levels_Id },
      select: {
        typeItem: true,
        subTasks: { select: { name: true } },
      },
    });
    if (!findLevel) throw new AppError('No se pudo encontrar el índice', 404);
    const { subTasks, typeItem } = findLevel;
    const quantity = subTasks.length;
    const duplicated = subTasks.some(task => task.name === name);
    return { duplicated, quantity, levels_Id, typeItem };
  }

  private static async getItem(list: number[]): Promise<string> {
    const levels = await prisma.levels.findMany({
      where: { id: { in: list } },
      orderBy: { level: 'asc' },
      select: { index: true, typeItem: true },
    });
    const item = levels.reduce<string>((acc, { index, typeItem }) => {
      acc = acc + numberToConvert(index, typeItem) + '.';
      return acc;
    }, '');
    return item;
  }

  public static async getCoordinate(id: Level['id']) {
    const level = await prisma.levels.findUnique({
      where: { id },
      select: { stagesId: true },
    });
    if (!level) throw new AppError('No se pudo encontrar el nivel', 404);
    return LegacyTaskAssignmentContextService.defaultEvaluatorForStage(
      level.stagesId
    );
  }

  public static async downloadFilesById(
    id: SubTasks['id'],
    { downloadPath }: { downloadPath: string }
  ) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const subtask = await prisma.subTasks.findUnique({
      where: { id },
      select: {
        feedBacks: {
          select: { files: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!subtask || !subtask.feedBacks.length)
      throw new AppError('Oops!,ID Archivo no encontrado', 400);
    const getFiles = subtask.feedBacks[0].files;
    const files = getFiles.map(file => {
      const oldPath = path.join(file.dir, file.name);
      const newPath = path.join(downloadPath, file.originalname || file.name);
      return { oldPath, newPath, ...file };
    });
    return files;
  }
  public static async createLastVisited(taskId: number, userId: number) {
    await prisma.lastVisitedTask.upsert({
      where: {
        userId_taskId: {
          userId,
          taskId,
        },
      },
      update: {
        visitedAt: new Date(),
      },
      create: {
        userId,
        taskId,
      },
    });
  }
  public static async showLastVisited(userId: number) {
    const visits = await prisma.lastVisitedTask.findMany({
      where: { userId },
      orderBy: { visitedAt: 'desc' },
      take: 5,
      select: {
        visitedAt: true,

        task: {
          select: {
            name: true,
            id: true,
            item: true,
            index: true,
            typeItem: true,
            Levels: {
              select: {
                levelList: true,
                name: true,
                id: true,
                item: true,
                stages: {
                  select: {
                    name: true,
                    id: true,
                    project: { select: { name: true, id: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    const levelsId = [
      ...new Set(
        visits.flatMap(({ task }) => [...task.Levels.levelList, task.Levels.id])
      ),
    ];
    const tasklevels = await LevelsServices.getLevelsByIds(levelsId);
    return visits.map(({ visitedAt, task }) => {
      const taskItem = numberToConvert(task.index, task.typeItem) + '.';
      const levelFind = tasklevels.find(({ id }) => id === task.Levels.id);
      const item = (levelFind?.item || '') + taskItem;
      return {
        visitedAt,
        name: task.name,
        id: task.id,
        item,
        levelName: task.Levels.name,
        levelItem: levelFind?.item,
        levelId: task.Levels.id,
        stageName: task.Levels.stages.name,
        stageId: task.Levels.stages.id,
        projectName: task.Levels.stages.project.name,
        projectId: task.Levels.stages.project.id,
      };
    });
  }
}
export default SubTasksServices;

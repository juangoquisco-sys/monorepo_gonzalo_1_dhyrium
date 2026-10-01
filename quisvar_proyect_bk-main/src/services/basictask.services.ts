import { BasicTasks } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import { numberToConvert } from '@/utils/tools';
import Queries from '@/utils/queries';
import { unlinkSync } from 'fs';
import LegacyTaskAssignmentContextService from './legacyTaskAssignmentContext.services';
import {
  insertTaskId,
  lockTaskOrder,
  orderTaskIds,
  requestedTaskIds,
  writeBasicTaskOrder,
} from './taskOrdering.services';

class BasicTasksServices {
  public static async find(id: BasicTasks['id']) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const findSubTask = await prisma.basicTasks.findUnique({
      where: { id },
      include: Queries.includeBasictask,
    });
    if (!findSubTask) throw new AppError('No se pudo encontrar la tares ', 404);
    const {
      Levels,
      files: listFiles,
      users: listUsers,
      feedBacks,
      ...task
    } = findSubTask;
    const managerGroup = Levels.stages.group?.groups[0];
    const users = listUsers.reduce<Record<string, typeof listUsers>>(
      (acc, user) => {
        const { status } = user;
        const type = status ? 'ACTIVE' : 'INACTIVE';
        if (!acc[type]) acc[type] = [];
        acc[type].push(user);
        return acc;
      },
      {}
    );
    const files = listFiles.reduce<Record<string, typeof listFiles>>(
      (acc, file) => {
        const { type } = file;
        if (!acc[type]) acc[type] = [];
        acc[type].push(file);
        return acc;
      },
      {}
    );
    const percentage = listUsers.reduce<number>(
      (acc, u) => acc + u.percentage,
      0
    );
    const lastFeedback = feedBacks[0];
    const item = await this.getItem([...Levels.levelList, Levels.id]);
    const auxData = { item, percentage };
    return { ...auxData, managerGroup, ...task, lastFeedback, users, files };
  }
  public static async findUsersAndMods(
    id: BasicTasks['id'],
    { users: withUsers }: { users?: boolean }
  ) {
    const context = await LegacyTaskAssignmentContextService.forBasicTask(id);
    const group = context.members.map(users => ({ users }));
    if (!withUsers) return { group };
    return { group, users: context.allActiveUsers };
  }

  public static async create({
    name,
    days,
    price,
    levels_Id,
    _index,
  }: BasicTasks & { _index?: number }) {
    return prisma.$transaction(async transaction => {
      await lockTaskOrder(transaction, 'basic', levels_Id);
      const level = await transaction.basicLevels.findUnique({
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
      const insertionIndex = _index
        ? Math.min(Math.max(_index - 1, 0), orderedIds.length)
        : orderedIds.length;
      const temporaryIndex =
        Math.max(0, ...level.subTasks.map(task => task.index)) +
        level.subTasks.length +
        1;
      const newTask = await transaction.basicTasks.create({
        data: {
          name,
          days,
          levels_Id,
          index: temporaryIndex,
          typeItem: level.typeItem,
          price,
        },
      });
      orderedIds.splice(insertionIndex, 0, newTask.id);
      await writeBasicTaskOrder(transaction, orderedIds);
      return { ...newTask, index: insertionIndex + 1 };
    });
  }

  public static async update(
    id: BasicTasks['id'],
    { days, price, name }: Pick<BasicTasks, 'days' | 'name' | 'price'>
  ) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const updateTask = await prisma.basicTasks.update({
      where: { id },
      data: { days, name, price },
    });
    return updateTask;
  }

  public static async sort(list: { id: number; index: number }[]) {
    if (!list.length) return [];
    const firstTask = await prisma.basicTasks.findUnique({
      where: { id: list[0].id },
      select: { levels_Id: true },
    });
    if (!firstTask) throw new AppError('No existe la tarea', 404);
    return prisma.$transaction(async transaction => {
      await lockTaskOrder(transaction, 'basic', firstTask.levels_Id);
      const siblings = await transaction.basicTasks.findMany({
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
      await writeBasicTaskOrder(transaction, orderedIds);
      return orderedIds.map((id, position) => ({ id, index: position + 1 }));
    });
  }

  public static async delete(id: BasicTasks['id']) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const task = await prisma.basicTasks.findUnique({
      where: { id },
      select: { levels_Id: true },
    });
    if (!task) throw new AppError('Oops!,ID invalido', 400);
    return prisma.$transaction(async transaction => {
      await lockTaskOrder(transaction, 'basic', task.levels_Id);
      const siblings = await transaction.basicTasks.findMany({
        where: { levels_Id: task.levels_Id },
        orderBy: [{ index: 'asc' }, { id: 'asc' }],
        select: { id: true, index: true },
      });
      const subTaskDelete = await transaction.basicTasks.delete({
        where: { id },
        select: { index: true, levels_Id: true },
      });
      const orderedIds = orderTaskIds(siblings).filter(taskId => taskId !== id);
      await writeBasicTaskOrder(transaction, orderedIds);
      const updateList = orderedIds.map((taskId, position) => ({
        id: taskId,
        index: position + 1,
      }));
      return { subTaskDelete, updateList };
    });
  }

  public static async restore(id: BasicTasks['id']) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const restoreQuery = await prisma.basicTasks.update({
      where: { id },
      data: {
        status: 'UNRESOLVED',
        files: { deleteMany: { subTasksId: id } },
        feedBacks: { deleteMany: { subTasksId: id } },
        users: { deleteMany: { taskId: id } },
      },
      select: { name: true, id: true, files: true },
    });
    restoreQuery.files.forEach(file => {
      const path = file.dir + '/' + file.name;
      unlinkSync(path);
    });
    return restoreQuery;
  }

  public static async addToUpperorLower(
    id: BasicTasks['id'],
    { name, days }: Pick<BasicTasks, 'days' | 'name'>,
    typeGte: 'upper' | 'lower'
  ) {
    if (!id || !typeGte) throw new AppError('Oops!,ID invalido', 400);
    //--------------------------- Find basictask ------------------------------------
    const findLevel = await prisma.basicTasks.findUnique({ where: { id } });
    if (!findLevel)
      throw new AppError('No se pudieron encontrar el nivel', 404);
    return prisma.$transaction(async transaction => {
      await lockTaskOrder(transaction, 'basic', findLevel.levels_Id);
      const anchor = await transaction.basicTasks.findUnique({ where: { id } });
      if (!anchor)
        throw new AppError('No se pudieron encontrar el nivel', 404);
      const siblings = await transaction.basicTasks.findMany({
        where: { levels_Id: anchor.levels_Id },
        orderBy: [{ index: 'asc' }, { id: 'asc' }],
        select: { id: true, index: true, name: true },
      });
      if (siblings.some(task => task.name === name))
        throw new AppError('Error, Nombre existente', 409);
      const temporaryIndex =
        Math.max(0, ...siblings.map(task => task.index)) + siblings.length + 1;
      const newLevel = await transaction.basicTasks.create({
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
        newLevel.id,
        id,
        typeGte
      );
      await writeBasicTaskOrder(transaction, orderedIds);
      const newIndex = orderedIds.indexOf(newLevel.id) + 1;
      const updateLevels = orderedIds.map((taskId, position) => ({
        id: taskId,
        index: position + 1,
      }));
      return { newLevel: { ...newLevel, index: newIndex }, updateLevels };
    });
  }

  public static async findDuplicates(
    name: string,
    id: number,
    type: 'ROOT' | 'ID'
  ) {
    let levels_Id = id;
    if (type === 'ID') {
      const getLevelId = await prisma.basicTasks.findUnique({
        where: { id },
        select: { levels_Id: true },
      });
      if (!getLevelId) throw new AppError('No existe encontrar el índice', 404);
      levels_Id = getLevelId.levels_Id;
    }
    const findLevel = await prisma.basicLevels.findUnique({
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

  private static async getItem(list: number[]) {
    const getLevels = await prisma.basicLevels.findMany({
      where: { id: { in: list } },
      orderBy: { level: 'asc' },
      select: { index: true, typeItem: true },
    });
    let item: string = '';
    getLevels.forEach(({ typeItem, index }) => {
      item = item + numberToConvert(index, typeItem) + '.';
    });
    return item;
  }
}
export default BasicTasksServices;

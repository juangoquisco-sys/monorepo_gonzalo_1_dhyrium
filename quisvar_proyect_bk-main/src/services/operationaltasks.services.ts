import {
  OperationalTasksForm,
  OperationalUpdatePosition,
  OperationFilesType,
  OptFilterUserTask,
  WeekDayInterface,
} from '@/types/operationaltask';
import type {
  OperationalFiles,
  OperationalItems,
  OperationalTasks,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import { existsSync, unlinkSync } from 'fs';
import path from 'path';
import AppError from '@/utils/appError';
import Utilities from '@/utils/utilities';

class OperationalTasksServices {
  public static async findByUserId(
    userId: number,
    { limit, offset, page, sort = 'asc', ...options }: OptFilterUserTask
  ) {
    if (!userId) throw new AppError('ID de usuario invalido', 400);
    //_-----------------------------------------------------------
    const currentDate = Utilities.validateDate(options.currentDate);
    const initialDate = Utilities.validateDate(options.initialDate);
    const untilDate = Utilities.validateDate(options.untilDate);
    let dateFilter: { lte?: Date; gte?: Date } = {};
    const now = currentDate || new Date();
    const { firstDate, lastDate, config, listDates } =
      Utilities.getDatesOnWeek(now);
    dateFilter = { gte: firstDate, lte: lastDate };
    if (initialDate && untilDate)
      dateFilter = { gte: initialDate, lte: untilDate };
    //_-----------------------------------------------------------
    const skip = Utilities.getPage({ limit, offset, page });
    const list = await prisma.operationalTasks.findMany({
      where: { userId, createdAt: dateFilter },
      select: {
        id: true,
        createdAt: true,
        description: true,
        name: true,
        projectName: true,
        order: true,
      },
      //   include: { files: true },
      orderBy: { order: sort },
      skip,
      take: limit,
    });
    const parseList = list.map(task => ({
      ...task,
      date: task.createdAt.getDate(),
    }));

    const reduceList = parseList.reduce(
      (acc: WeekDayInterface<typeof task>[], task) => {
        const index = acc.findIndex(({ id }) => id === task.date);
        if (index < 0) {
          const date = new Date(new Date().setDate(task.date));
          const isActive = task.date === new Date().getDate();
          const title = date.toLocaleString('es-PE', config);
          acc.push({ id: task.date, date, title, isActive, tasks: [task] });
        } else {
          acc[index].tasks.push(task);
        }
        return acc;
      },
      []
    );

    if (untilDate && initialDate) return reduceList;
    const weekList = listDates.map(date => {
      const tasks = reduceList.find(({ id }) => id === date.id)?.tasks || [];
      return { ...date, tasks };
    });
    return weekList;
  }

  public static async findByTaskId(taskId: number) {
    if (!taskId) throw new AppError('ID invalido', 400);
    const task = await prisma.operationalTasks.findUnique({
      where: { id: taskId },
    });
    return task;
  }
  public static async create({
    userId,
    createdAt,
    order,
    ...data
  }: OperationalTasksForm) {
    const taskCreationDate = new Date(createdAt);
    const task = await prisma.operationalTasks.create({
      data: {
        ...data,
        createdAt: taskCreationDate,
        user: { connect: { id: userId } },
        order: order,
      },
      select: {
        id: true,
        createdAt: true,
        description: true,
        name: true,
        projectName: true,
        order: true,
      },
    });
    return {
      ...task,
      date: task.createdAt.getDate(),
    };
  }

  public static async duplicate(
    taskId: number,
    { order }: Pick<OperationalTasksForm, 'order'>
  ) {
    if (!taskId) throw new AppError('ID invalido', 400);
    const findTask = await prisma.operationalTasks.findUnique({
      where: { id: taskId },
    });
    if (!findTask) throw new AppError('No se pudo encontrar la tarea', 400);
    const task = await prisma.operationalTasks.create({
      data: {
        name: findTask.name,
        description: findTask.description,
        projectName: findTask.projectName,
        createdAt: findTask.createdAt,
        user: { connect: { id: findTask.userId } },
        order: order,
      },
    });
    return {
      ...task,
      date: task.createdAt.getDate(),
    };
  }

  public static update(
    id: OperationalTasks['id'],
    data: Omit<OperationalTasksForm, 'userId'>
  ) {
    if (!id) throw new AppError('ID invalido', 400);
    return prisma.operationalTasks.update({
      where: { id },
      data,
    });
  }
  public static async updateTaskPosition(
    taskUpdates: OperationalUpdatePosition[]
  ): Promise<void> {
    const updates = taskUpdates.map(({ id, date, order }) => {
      const newCreatedAt = new Date(date);
      return prisma.operationalTasks.update({
        where: { id },
        data: { order, createdAt: newCreatedAt },
      });
    });
    await prisma.$transaction(updates);
  }

  public static async remove(id: OperationalTasks['id']) {
    if (!id) throw new AppError('ID invalido', 400);
    const task = await prisma.operationalTasks.delete({
      where: { id },
      select: { items: true },
    });
    // task.items.forEach(file => {
    //   const dir = path.join(file.dir, file.name);
    //   if (existsSync(dir)) unlinkSync(dir);
    // });
    return task;
  }

  public static async showItems(taskId: OperationalTasks['id']) {
    if (!taskId) throw new AppError('ID invalido', 400);
    const items = await prisma.operationalItems.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: { files: true },
    });
    return items;
  }

  public static async createItem({
    description,
    price,
    taskId,
  }: OperationalItems) {
    if (!taskId) throw new AppError('ID invalido', 400);
    const createItem = await prisma.operationalItems.create({
      data: {
        description,
        price,
        task: { connect: { id: taskId } },
      },
    });
    return createItem;
  }

  public static async updateItem(
    id: number,
    { description, price }: OperationalItems
  ) {
    if (!id) throw new AppError('ID invalido', 400);
    const createItem = await prisma.operationalItems.update({
      where: { id },
      data: {
        description,
        price,
      },
    });
    return createItem;
  }

  public static async removeItem(itemId: OperationalItems['id']) {
    if (!itemId) throw new AppError('ID invalido', 400);
    const createItem = await prisma.operationalItems.delete({
      where: { id: itemId },
      select: { files: true },
    });

    createItem.files.forEach(file => {
      const dir = path.join(file.dir, file.name);
      if (existsSync(dir)) unlinkSync(dir);
    });
    return createItem;
  }

  public static async addFile(
    itemId: OperationalItems['id'],
    file: OperationFilesType
  ) {
    if (!itemId) throw new AppError('ID invalido', 400);
    const newFile = await prisma.operationalFiles.create({
      data: { ...file, itemId },
    });
    return newFile;
  }

  public static async removeFile(id: OperationalFiles['id']) {
    if (!id) throw new AppError('ID invalido', 400);
    const file = await prisma.operationalFiles.delete({
      where: { id },
    });
    const dir = path.join(file.dir, file.name);
    if (existsSync(dir)) unlinkSync(dir);
    return file;
  }
}

export default OperationalTasksServices;

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BasicFiles,
  BasicLevels,
  BasicTasks,
  FeedbackType,
  Prisma,
} from '@prisma/client';
import { dataWithLevel, numberToConvert, percentageTasks } from '@/utils/tools';
import {
  DuplicateLevel,
  FolderLevels,
  GeneratePathAtributtes,
  GetFilterBasicLevels,
  GetFolderBasicLevels,
  ListCostType,
  MergeLevels,
  ObjectNumber,
  OptionsMergePdfs,
  OptionsTaskFilters,
  TypeIdsList,
} from '@/types/types';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import { appendFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import GenerateFiles from '@/utils/generateFile';
import Queries from '@/utils/queries';
import { LevelItemQuery } from '@/services/levels.services';

class BasicLevelServices {
  public static async getList(
    id: BasicLevels['id'],
    typeId: 'stage' | 'level',
    options: OptionsTaskFilters & { includeFiles: true }
  ): Promise<{
    info: { rootId: number; rootLevel: number };
    data: GetFolderBasicLevels[];
  }>;
  public static async getList(
    id: BasicLevels['id'],
    typeId?: 'stage' | 'level',
    options?: OptionsTaskFilters
  ): Promise<{
    info: { rootId: number; rootLevel: number };
    data: GetFilterBasicLevels[];
  }>;
  public static async getList(
    id: BasicLevels['id'],
    typeId: 'stage' | 'level' = 'level',
    {
      status,
      type,
      equal,
      endsWith,
      includeFiles = false,
      includeUsers = true,
    }: OptionsTaskFilters
  ): Promise<{
    info: { rootId: number; rootLevel: number };
    data: GetFilterBasicLevels[] | GetFolderBasicLevels[];
  }> {
    if (!id) throw new AppError('Opps, ID invalido', 400);
    //---------------------------- filter_items ------------------------------
    const name = equal ? { endsWith } : { not: { endsWith } };
    const files = includeFiles ? { files: { where: { type, name } } } : {};
    const feedBacks =
      includeFiles && type === 'UPLOADS'
        ? {
            feedBacks: {
              select: {
                files: {
                  where: {
                    name,
                    BasicFeedback: { type: 'ACCEPTED' as FeedbackType },
                  },
                },
              },
              take: 1,
              orderBy: { createdAt: 'desc' as Prisma.SortOrder },
            },
          }
        : {};
    const users = includeUsers
      ? {
          users: {
            select: {
              userId: true,
              percentage: true,
              user: Queries.selectProfileUser,
            },
          },
        }
      : {};
    //------------------------------------------------------------------------
    let findStage = null;
    if (typeId === 'level') {
      findStage = await prisma.basicLevels.findUnique({
        where: { id },
        include: {
          subTasks: {
            where: { status },
            orderBy: { index: 'asc' },
            include: {
              ...files,
              ...users,
              ...feedBacks,
            },
          },
        },
      });
    }
    if (typeId === 'level' && !findStage)
      throw new AppError('Opps, nivel inexistente', 404);
    //---------------------------- filter_items ------------------------------
    const level = findStage ? { gt: findStage.level } : {};
    const stagesId = typeId === 'level' ? findStage?.stagesId : id;
    //------------------------------------------------------------------------
    const getBasicList = await prisma.basicLevels.findMany({
      where: { stagesId, level },
      orderBy: { index: 'asc' },
      include: {
        subTasks: {
          where: { status },
          include: {
            ...files,
            ...users,
            ...feedBacks,
          },
          orderBy: { index: 'asc' },
        },
      },
    });
    const aux: typeof getBasicList = findStage ? [findStage] : [];
    const info = {
      rootId: findStage?.rootId ?? 0,
      rootLevel: findStage?.rootLevel ?? 0,
    };
    return { info, data: [...aux, ...getBasicList] };
  }

  public static async find(
    id: BasicLevels['id'],
    status?: BasicTasks['status']
  ) {
    const getBasicList = await this.getList(id, 'level', { status });
    const { rootId, rootLevel } = getBasicList.info;
    const list = this.findList(getBasicList.data, rootId, rootLevel, '');
    return list;
  }

  public static async create({
    name,
    stagesId,
    rootId,
    typeItem,
  }: BasicLevels) {
    //------------------------ Set new item ---------------------------
    const { quantity } = await this.duplicate(rootId, stagesId, name, 'ROOT');
    const index = quantity + 1;
    const { rootLevel, levelList: list } = await this.findRoot(rootId);
    const stages = { connect: { id: stagesId } };
    const level = rootLevel + 1;
    const levelList = [...(list ? list : []), rootId];
    const data = {
      rootId,
      name,
      index,
      rootLevel,
      stages,
      level,
      typeItem,
      levelList,
    };
    const newLevel = await prisma.basicLevels.create({ data });
    return newLevel;
  }

  public static async update(id: BasicLevels['id'], { name }: BasicLevels) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const { duplicated } = await this.duplicate(id, 0, name, 'ID');
    if (duplicated) throw new AppError('Error al crear, Nombre existente', 409);
    // const data = !duplicated ? { name } : userId ? { userId } : {};
    const data = !duplicated ? { name } : {};
    const updateLevel = await prisma.basicLevels.update({
      where: { id },
      data,
    });
    return updateLevel;
  }

  public static async makeRegularFolder(id: BasicLevels['id']) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);

    return prisma.basicLevels.update({
      where: { id },
      data: { unique: false },
    });
  }

  public static async delete(id: BasicLevels['id']) {
    if (!id) throw new AppError('Oops!, ID invalido', 400);
    const findLevel = await prisma.basicLevels.findUnique({ where: { id } });
    if (!findLevel)
      throw new AppError('No se pudieron encontrar el nivel', 404);
    const filterLevelList = await prisma.basicLevels.groupBy({
      by: ['id', 'index'],
      where: {
        stagesId: findLevel.stagesId,
        rootId: findLevel.rootId,
        level: findLevel.level,
        index: { gt: findLevel.index },
      },
      orderBy: { index: 'asc' },
    });

    const dropList = await this.listByDelete(findLevel.id);
    const deleteList = dropList.flat(1) as number[];
    const deleteLevels = await prisma.basicLevels.deleteMany({
      where: { id: { in: deleteList } },
    });
    const updateLevels = await this.listByUpdate(filterLevelList);
    const deleteLevel = await prisma.basicLevels.delete({ where: { id } });
    return { deleteLevels, updateLevels, deleteLevel };
  }

  public static async addToUpperorLower(
    id: BasicLevels['id'],
    { name }: BasicLevels,
    typeGte: 'upper' | 'lower'
  ) {
    if (!id || !typeGte) throw new AppError('Oops!,ID invalido', 400);
    //--------------------------- Find level ------------------------------------
    const findLevel = await prisma.basicLevels.findUnique({ where: { id } });
    if (!findLevel)
      throw new AppError('No se pudieron encontrar el nivel', 404);
    const { index: _index, stagesId, rootId, level, levelList } = findLevel;
    const index = typeGte === 'upper' ? { gte: _index } : { gt: _index };
    //-----------------------------------------------------------------
    const filterLevelList = await prisma.basicLevels.groupBy({
      by: ['id', 'index'],
      where: { stagesId, rootId, level, index },
      orderBy: { index: 'asc' },
    });
    const { id: _id, name: _name, ...filterData } = findLevel;
    const parseIndex = typeGte === 'upper' ? _index : _index + 1;
    const aux = { ...filterData, index: parseIndex };
    // const aux = { ...filterData, userId: null, index: parseIndex };
    const data = { ...aux, name, levelList };
    const newLevel = await prisma.basicLevels.create({ data });
    const updateLevels = await this.listByUpdate(filterLevelList, 1);
    return { newLevel, updateLevels };
  }

  public static async updateCovers(
    levels: { id: BasicLevels['id']; cover: boolean }[]
  ) {
    const updateList = levels.map(({ id, cover }) => {
      return prisma.basicLevels.update({ where: { id }, data: { cover } });
    });
    return await prisma.$transaction(updateList);
  }

  public static async updateDaysPerId(
    levels: { id: BasicLevels['id']; days: number }[]
  ) {
    const updateList = levels.map(({ id, days }) => {
      return prisma.basicTasks.update({ where: { id }, data: { days } });
    });
    return await prisma.$transaction(updateList);
  }

  public static findList(
    array: GetFilterBasicLevels[],
    _rootId: number,
    _rootLevel: number,
    _item: string,
    listCost?: ListCostType
  ) {
    const findList = array.filter(
      ({ rootId, rootLevel }) => rootId === _rootId && rootLevel === _rootLevel
    );
    const list = array.filter(value => !findList.includes(value));
    if (!findList.length) return [];
    const newList = findList.map(({ subTasks, ...value }) => {
      //-----------------------------------------------------------
      const findItem = numberToConvert(value.index, value.typeItem);
      const item = _item + (_item ? '.' : '') + findItem;
      //-----------------------------------------------------------
      let data: any = { item, ...dataWithLevel, ...value };
      if (subTasks && subTasks.length) {
        const { subTasks: subtasks, ...info } = percentageTasks(
          subTasks,
          item,
          { unique: value.unique, monthlyPrice: 0, stayPrice: 0 }
        );
        data = { item, ...value, ...info, subTasks: subtasks };
      }
      const nextLevel: typeof findList = this.findList(
        list,
        value.id,
        value.level,
        item,
        listCost
      );
      if (!nextLevel.length) return data;
      return { ...data, nextLevel };
    });
    return newList;
  }

  public static async folderlist(
    array: GetFolderBasicLevels[],
    {
      rootId: _rootId,
      rootLevel: _rootLevel,
      item: _item,
      path: _path,
    }: GeneratePathAtributtes,
    createFiles: boolean
  ) {
    const findList = array.filter(
      ({ rootId, rootLevel }) => rootId === _rootId && rootLevel === _rootLevel
    );
    const list = array.filter(value => !findList.includes(value));
    if (!findList.length) return [];
    const newList = findList.map(
      async ({ subTasks, id: rootId, level: rootLevel, ...values }) => {
        const { item, path, name } = this.getItemAndPath(_item, _path, values);
        //--------------------------------------------------------------
        const subtaskPromise = subTasks.map(async task => {
          const {
            name,
            item: i,
            path: taskPath,
          } = this.getItemAndPath(item, path, task);
          let arrayFiles: BasicFiles[] = [];
          if (!task.files.length && task.feedBacks?.length) {
            arrayFiles = task.feedBacks[0].files;
          } else {
            arrayFiles = task.files;
          }
          const files = this.getRenameFiles(arrayFiles, path, name, i);
          const downloadPath =
            path.split('/').slice(0, 2).join('/') + '/empty_files.txt';
          if (createFiles) {
            await new Promise(resolve => {
              mkdirSync(path, { recursive: true });
              files.forEach(file => {
                if (existsSync(file.oldPath)) {
                  copyFileSync(file.oldPath, file.newPath);
                } else {
                  appendFileSync(
                    downloadPath,
                    `archivo: ${file.filename} ruta: ${file.oldPath}, no fue encontrado\n`
                  );
                }
              });
              resolve(path);
            });
          }
          return {
            id: task.id,
            index: task.index,
            name,
            path: taskPath,
            files,
          };
        });
        const subtasks = await Promise.all(subtaskPromise);
        if (createFiles && !subTasks.length)
          await new Promise(resolve => {
            mkdirSync(path, { recursive: true });
            resolve(path);
          });
        const nextLevel = {
          rootId,
          rootLevel,
          item: item,
          path: path,
        };
        const next: FolderLevels[] = await this.folderlist(
          list,
          nextLevel,
          createFiles
        );
        const data = { id: rootId, index: values.index, name, path, subtasks };
        if (!next.length) return data;
        return { ...data, next };
      }
    );
    return await Promise.all(newList);
  }

  public static async mergePDFs(
    array: GetFolderBasicLevels[],
    outputPath: string,
    atributtes: GeneratePathAtributtes,
    { createFiles, createCover }: OptionsMergePdfs
  ) {
    const { rootId: _rootId, rootLevel: _rootLevel } = atributtes;
    const { item: _item, path: _path } = atributtes;
    //------------------------------------------------------------------------------------
    const findList = array.filter(
      ({ rootId, rootLevel }) => rootId === _rootId && rootLevel === _rootLevel
    );
    const list = array.filter(value => !findList.includes(value));
    if (!findList.length) return [];
    const newList = findList.map(
      async ({ subTasks, id: rootId, level: rootLevel, cover, ...values }) => {
        //------------------------- item_definition -------------------------------------
        const { item, path, name } = this.getItemAndPath(
          _item,
          _path,
          values,
          cover
        );
        const getFiles = subTasks.map(task => {
          const { name, item: i } = this.getItemAndPath(item, path, task);
          let arrayFiles: BasicFiles[] = [];
          if (!task.files.length && task.feedBacks?.length) {
            arrayFiles = task.feedBacks[0].files;
          } else {
            arrayFiles = task.files;
          }
          return this.getRenameFiles(arrayFiles, outputPath, name, i);
        });
        const files = getFiles.flat();
        if (createFiles) {
          await new Promise(resolve => {
            files.forEach(file => {
              if (existsSync(file.oldPath))
                copyFileSync(file.oldPath, file.newPath);
            });
            resolve(path);
          });
        }
        if (cover && createCover) {
          await new Promise(resolve => {
            const outPut = outputPath + '/' + name + '.pdf';
            resolve(GenerateFiles.coverV2(name, outPut, { fontSize: 40 }));
          });
        }
        const nextData = { rootId, rootLevel, item, path };
        const next: MergeLevels[] = await this.mergePDFs(
          list,
          outputPath,
          nextData,
          { createFiles, createCover }
        );
        const data = { id: rootId, name, cover, files };
        if (!next.length) return data;
        return { ...data, next };
      }
    );

    return await Promise.all(newList);
  }

  private static getItemAndPath(
    rootItem: string,
    rootPath: string,
    { index, typeItem, name }: Pick<BasicLevels, 'index' | 'typeItem' | 'name'>,
    coverName: boolean = false
  ) {
    const findItem = numberToConvert(index, typeItem);
    const item = rootItem + (rootItem ? '.' : '') + findItem;
    const parseName = item + (coverName ? '. ' : '. ') + name;
    const path = rootPath + '/' + item + '. ' + name;
    return { item, path, name: parseName };
  }

  private static getRenameFiles(
    files: BasicFiles[],
    rootPath: string,
    rootName: string,
    rootItem?: string
  ) {
    const countExt = this.fileCounter(files);
    return files.map(({ dir, name: filename, id, type }) => {
      const oldPath = dir + '/' + filename;
      const originalName = filename.split('$$').at(-1) || filename;
      const _rootItem = rootItem ? rootItem + '. ' : '.';
      const newPath = rootPath + '/' + _rootItem + originalName;
      if (['UPLOADS', 'REVIEW'].includes(type)) {
        const ext = filename.split('.').at(-1) || '';
        countExt[ext] -= 1;
        const pivot = countExt[ext] >= 1 ? ` (${countExt[ext]})` : '';
        const newFileName = rootName + pivot + '.' + ext;
        const newPath = rootPath + '/' + newFileName;
        return { id, oldPath, newPath, filename };
      }
      return { id, oldPath, newPath, filename };
    });
  }

  public static async listByUpdate(
    list: { id: number; index: number }[],
    quantity: number = -1
  ) {
    // let count: number = 0;
    // let aux: number;
    const updateListPerLevel = list.map(({ id, index }) => {
      // if (aux === index) count += 1;
      // aux = index;
      const data = { index: index + quantity };
      const update = prisma.basicLevels.update({ where: { id }, data });
      return update;
    });
    return prisma.$transaction(updateListPerLevel);
  }

  private static async listByDelete(rootId: BasicLevels['rootId']) {
    if (!rootId) throw new AppError('Oops!, ID invalido', 400);
    const findIds = await prisma.basicLevels.groupBy({
      by: ['id', 'index'],
      where: { rootId },
      orderBy: { index: 'asc' },
    });
    const list: TypeIdsList[] = await Promise.all(
      findIds.map(async ({ id }) => {
        const next = await this.listByDelete(id);
        if (!next.length) return id;
        return [id, ...next].flat(1);
      })
    );
    return list;
  }

  private static async findRoot(id: number) {
    const root = await prisma.basicLevels.findUnique({ where: { id } });
    if (!root) return { stagesId: 0, rootLevel: 0, typeIndex: null };
    const { stagesId, level: rootLevel, typeItem: typeIndex, levelList } = root;
    return { stagesId, rootLevel, typeIndex, levelList };
  }

  public static async duplicate(
    id: number,
    stageId: number,
    name: string,
    type: DuplicateLevel['type']
  ) {
    let rootId, stagesId;
    rootId = id;
    stagesId = stageId;
    if (name.includes('_basic'))
      throw new AppError('Error palabra reservada', 409);
    if (type === 'ID') {
      const getLevel = await prisma.basicLevels.findUnique({ where: { id } });
      if (!getLevel) throw new AppError('No se pudo encontrar el índice', 404);
      rootId = getLevel.rootId;
      stagesId = getLevel.stagesId;
    }
    const list = await prisma.basicLevels.groupBy({
      by: ['id', 'name'],
      where: { rootId, stagesId },
    });
    const duplicated = list.some(l => l.name.includes(name));
    return { duplicated, rootId, quantity: list.length };
  }

  private static fileCounter(files: BasicFiles[]) {
    const countExt =
      files?.reduce((acc: ObjectNumber, value) => {
        const ext = value.name.split('.').at(-1) || '';
        acc[ext] = (acc[ext] || 0) + 1;
        return acc;
      }, {}) || {};
    return countExt;
  }
  public static async updateTypeItem(
    id: BasicTasks['id'],
    { item, type = 'LEVEL' }: LevelItemQuery
  ) {
    if (type === 'STAGE') {
      const stageType = await prisma.stages.update({
        where: { id },
        data: {},
        // data: { rootTypeItem: item },
      });
      return stageType;
    }
    const levelType = await prisma.basicLevels.update({
      where: { id },
      data: { rootTypeItem: item },
    });
    return levelType;
  }
}

export default BasicLevelServices;

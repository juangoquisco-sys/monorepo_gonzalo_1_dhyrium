/* eslint-disable @typescript-eslint/no-explicit-any */
import { FeedbackType, Files, Levels, SubTasks } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import {
  basenameFromPath,
  dataWithLevel,
  numberToConvert,
  percentageTasks,
} from '@/utils/tools';
import {
  DuplicateLevel,
  FolderLevels,
  GetFilterLevels,
  GetFolderLevels,
  MergeLevels,
  ObjectNumber,
  TypeIdsList,
} from '@/types/types';
import Queries from '@/utils/queries';
import { ParamsMergePdfs, ParamsTask, PathAtributtes } from '@/types/task';
import { appendFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import GenerateFiles from '@/utils/generateFile';
import SubTasksServices from '@/services/subtasks.services';
import { Decimal } from '@prisma/client/runtime/library';
import { StagePricingOption } from '@/types/stages';
import BasicTaskOnUserServices from '@/services/basictaskOnUsers.services';

export interface LevelItemQuery {
  item: Levels['typeItem'];
  type: 'STAGE' | 'LEVEL';
}

export type MergedPdfPathIndexEntry = {
  levelId: number;
  taskId?: number;
  fileId?: number;
  coverDepth?: number;
  isTaskCover?: boolean;
};

export type MergedPdfPathIndex = Map<string, MergedPdfPathIndexEntry>;

class LevelsServices {
  public static async getLevelList(
    id: Levels['id'],
    type: 'stage' | 'level' = 'level',
    options: ParamsTask
  ) {
    if (!id) throw new AppError('Invalid level ID', 400);
    const name = options.equal
      ? { endsWith: options.endsWith }
      : { not: { endsWith: options.endsWith } };
    const files = options.includeFiles
      ? { files: { where: { type: options.type, name } } }
      : {};
    const review: FeedbackType | undefined = options.reviewFiles
      ? undefined
      : 'ACCEPTED';
    const feedBacks = options.includeLatestFeedbackFiles
      ? {
          feedBacks: {
            take: 1,
            orderBy: { createdAt: 'desc' as const },
            select: {
              files: {
                select: {
                  id: true,
                  dir: true,
                  name: true,
                  type: true,
                  originalname: true,
                },
              },
            },
          },
        }
      : options.includeFiles && options.type === 'UPLOADS'
        ? Queries.selectedFeedbacks<typeof name>(name, review)
        : {};
    const users = options.includeUsers
      ? {
          users: {
            select: {
              userId: true,
              percentage: true,
              statusPayment: true,
              user: Queries.selectProfileUser,
            },
          },
        }
      : {};
    let findStage = null;
    if (type === 'level') {
      findStage = await prisma.levels.findUnique({
        where: { id },
        include: {
          subTasks: {
            where: { status: options.status },
            orderBy: { index: 'asc' },
            include: { ...files, ...users, ...feedBacks },
          },
        },
      });
    }
    if (type === 'level' && !findStage)
      throw new AppError('Opps, nivel inexistente', 404);
    const level = findStage ? { gt: findStage.level } : {};
    const stagesId = type === 'level' ? findStage?.stagesId : id;
    const getLevelsList = await prisma.levels.findMany({
      where: { stagesId, level },
      orderBy: { index: 'asc' },
      include: {
        subTasks: {
          where: { status: options.status },
          orderBy: { index: 'asc' },
          include: { ...files, ...users, ...feedBacks },
        },
      },
    });
    const aux: typeof getLevelsList = findStage ? [findStage] : [];
    const info = {
      rootId: findStage?.rootId ?? 0,
      rootLevel: findStage?.rootLevel ?? 0,
    };
    return { info, data: [...aux, ...getLevelsList] };
  }

  public static getLevelsByIds = async (ids: number[]) => {
    const levelList = await prisma.levels.findMany({
      where: { id: { in: ids } },
      select: {
        _count: true,
        id: true,
        typeItem: true,
        index: true,
        levelList: true,
        name: true,
      },
      orderBy: { level: 'desc' },
    });
    const levels = BasicTaskOnUserServices.getListItems(levelList);
    return levels;
  };

  public static async find(id: Levels['id'], status?: SubTasks['status']) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const getList = await this.getLevelList(id, 'level', { status });
    const { rootId, rootLevel } = getList.info;
    const list = await this.findList(getList.data, rootId, rootLevel, '');
    return list;
  }
  public static async create(
    { name, stagesId, rootId, typeItem }: Levels,
    params?: { withTask: boolean }
  ) {
    //--------------------duplicate_name_level-------------------------------------
    const getDuplicate = await this.duplicate(rootId, stagesId, name, 'ROOT');
    const { duplicated, quantity } = getDuplicate;
    const index = quantity + 1;
    if (duplicated) throw new AppError('Error al crear, Nombre existente', 409);
    //--------------------------get_new_item---------------------------------------
    const root = await this.findRoot(rootId);
    const { rootLevel, levelList: list } = root;
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
      unique: params?.withTask,
    };
    const newLevel = await prisma.levels.create({ data });
    if (params?.withTask) {
      const newTask = await SubTasksServices.create({
        levels_Id: newLevel.id,
        price: new Decimal(0),
        days: 0,
        name,
      });
      return { ...newLevel, newTask };
    }
    return newLevel;
  }

  public static async update(id: Levels['id'], { name }: Pick<Levels, 'name'>) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const { duplicated } = await this.duplicate(id, 0, name, 'ID');
    if (duplicated) throw new AppError('Error al crear, Nombre existente', 409);
    const data = !duplicated ? { name } : {};
    const updateLevel = await prisma.levels.update({ where: { id }, data });
    return updateLevel;
  }

  public static async makeRegularFolder(id: Levels['id']) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);

    return prisma.levels.update({
      where: { id },
      data: { unique: false },
    });
  }

  public static async delete(id: Levels['id']) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const findLevel = await prisma.levels.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subTasks: {
              where: {
                status: { not: 'UNRESOLVED' }, //no pendientes
                users: {},
              },
            },
          },
        },
      },
    });
    if (!findLevel)
      throw new AppError('No se pudieron encontrar el nivel', 404);
    if (findLevel._count.subTasks)
      throw new AppError(
        'No se puede eliminar, tareas pendientes en el nivel ' +
          findLevel.name.toUpperCase(),
        404
      );
    const filterLevelList = await prisma.levels.groupBy({
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
    const deleteLevels = await prisma.levels.deleteMany({
      where: { id: { in: deleteList } },
    });
    const updateLevel = await this.listByUpdate(filterLevelList);
    const deleteLevel = await prisma.levels.delete({ where: { id } });
    return { deleteLevels, updateLevel, deleteLevel };
  }

  public static async addToUpperorLower(
    id: Levels['id'],
    { name }: Levels,
    typeGte: 'upper' | 'lower'
  ) {
    if (!id || !typeGte) throw new AppError('Oops!,ID invalido', 400);
    //--------------------------- Find level ------------------------------------
    const findLevel = await prisma.levels.findUnique({ where: { id } });
    if (!findLevel) throw new AppError('No se pudó encontrar el nivel', 404);
    const { index: _index, stagesId, rootId, level, levelList } = findLevel;
    const index = typeGte === 'upper' ? { gte: _index } : { gt: _index };
    //------------------------------------------------------------------
    const { duplicated } = await this.duplicate(rootId, stagesId, name, 'ROOT');
    if (duplicated) throw new AppError('Error al crear, Nombre existente', 409);
    //--------------------------- Find Lower Levels ------------------------------------
    const filterLevelList = await prisma.levels.groupBy({
      by: ['id', 'index'],
      where: { stagesId, rootId, level, index },
      orderBy: { index: 'asc' },
    });
    const { id: _id, name: _name, ...filterData } = findLevel;
    const auxIndex = typeGte === 'upper' ? _index : _index + 1;
    const aux = { ...filterData, index: auxIndex };
    const data = { ...aux, name, levelList };
    const newLevel = await prisma.levels.create({ data });
    const updateLevels = await this.listByUpdate(filterLevelList, 1);
    return { newLevel, updateLevels };
  }
  public static async updateCovers(
    levelIdsAndCovers: { id: Levels['id']; cover: Levels['cover'] }[]
  ) {
    const updates = levelIdsAndCovers.map(({ id, cover }) => {
      return prisma.levels.update({ where: { id }, data: { cover } });
    });
    return await prisma.$transaction(updates);
  }

  public static findList(
    array: GetFilterLevels[],
    _rootId: number,
    _rootLevel: number,
    _item: string,
    pricing?: StagePricingOption
    // pricing?: number
    // listCost?: ListCostType
  ) {
    const findList = array.filter(
      ({ rootId, rootLevel }) => rootId === _rootId && rootLevel === _rootLevel
    );
    const list = array.filter(value => !findList.includes(value));
    if (!findList.length) return [];
    const newList = findList.map(({ subTasks, ...value }) => {
      //-----------------------------------------------------------------------
      const findItem = numberToConvert(value.index, value.typeItem);
      const item = _item + (_item ? '.' : '') + findItem;
      //-----------------------------------------------------------------------
      let data: any = { ...dataWithLevel, ...value, item };
      if (subTasks && subTasks.length) {
        const { subTasks: subtasks, ...info } = percentageTasks(
          subTasks,
          item,
          {
            unique: value.unique,
            monthlyPrice: pricing?.monthlyPrice || 0,
            stayPrice: pricing?.stayPrice || 0,
          }
          // { priceTask: listCost, unique: value.unique }
        );
        data = { ...value, item, ...info, subTasks: subtasks };
      }
      const nextLevel: typeof findList = this.findList(
        list,
        value.id,
        value.level,
        item,
        pricing
      );
      if (!nextLevel.length) return data;
      return { ...data, nextLevel };
    });
    return newList;
  }

  public static async folderlist(
    array: GetFolderLevels[],
    attributes: PathAtributtes & { createFiles: boolean }
  ) {
    const findList = array.filter(
      ({ rootId, rootLevel }) =>
        rootId === attributes.rootId && rootLevel === attributes.rootLevel
    );
    const list = array.filter(value => !findList.includes(value));
    if (!findList.length) return [];
    const newList = findList.map(
      async ({ subTasks, id: rootId, level: rootLevel, ...values }) => {
        const {
          item,
          path,
          name: levelName,
        } = this.getItemAndPath(attributes.item, attributes.path, values);
        //--------------------------------------------------------------
        const subtaskPromise = subTasks.map(async task => {
          const {
            name,
            item: i,
            path: taskPath,
          } = this.getItemAndPath(item, path, task);
          let arrayFiles: Files[] = [];
          if (!task.files.length && task.feedBacks?.length) {
            arrayFiles = task.feedBacks[0].files;
          } else {
            arrayFiles = task.files;
          }
          const files = this.getRenameFiles(
            arrayFiles,
            path,
            values.unique ? levelName : name,
            values.unique ? item : i
          );
          const downloadPath =
            path.split('/').slice(0, 2).join('/') + '/empty_files.txt';
          if (attributes.createFiles) {
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
        if (attributes.createFiles && !subTasks.length)
          await new Promise(resolve => {
            mkdirSync(path, { recursive: true });
            resolve(path);
          });
        const nextLevel: typeof attributes = {
          rootId,
          rootLevel,
          item,
          path,
          createFiles: attributes.createFiles,
        };
        const next: FolderLevels[] = await this.folderlist(list, nextLevel);
        const data = {
          id: rootId,
          index: values.index,
          name: levelName,
          path,
          subtasks,
        };
        if (!next.length) return data;
        return { ...data, next };
      }
    );
    return await Promise.all(newList);
  }

  public static async mergePDFs(
    array: GetFolderLevels[],
    outputPath: string,
    atributtes: PathAtributtes & ParamsMergePdfs,
    pathIndex: MergedPdfPathIndex = new Map()
  ) {
    const findList = array.filter(
      ({ rootId, rootLevel }) =>
        rootId === atributtes.rootId && rootLevel === atributtes.rootLevel
    );
    const list = array.filter(value => !findList.includes(value));
    if (!findList.length) return [];
    const newList = findList.map(
      async ({ subTasks, id: rootId, level: rootLevel, cover, ...values }) => {
        //------------------------- item_definition -------------------------------------
        const { item, path, name } = this.getItemAndPath(
          atributtes.item,
          atributtes.path,
          values,
          cover
        );
        const files = subTasks
          .map(task => {
            const { name, item: i } = this.getItemAndPath(item, path, task);
            let arrayFiles: Files[] = [];
            if (!task.files.length && task.feedBacks?.length) {
              arrayFiles = task.feedBacks[0].files;
            } else {
              arrayFiles = task.files;
            }
            const renamed = this.getRenameFiles(arrayFiles, outputPath, name, i);
            renamed.forEach(file => {
              pathIndex.set(basenameFromPath(file.newPath), {
                levelId: rootId,
                taskId: task.id,
                fileId: file.id,
              });
            });
            return renamed;
          })
          .flat();
        if (atributtes.createFiles) {
          await new Promise(resolve => {
            files.forEach(file => {
              if (existsSync(file.oldPath))
                copyFileSync(file.oldPath, file.newPath);
            });
            resolve(path);
          });
        }
        if (cover && atributtes.createCover) {
          await new Promise(resolve => {
            const outPut = outputPath + '/' + name + '.pdf';
            pathIndex.set(basenameFromPath(outPut), {
              levelId: rootId,
              coverDepth: item.split('.').filter(Boolean).length,
            });
            resolve(GenerateFiles.coverV2(name, outPut, { fontSize: 40 }));
          });
        }
        const nextData = { ...atributtes, rootId, rootLevel, item, path };
        const next: MergeLevels[] = await this.mergePDFs(
          list,
          outputPath,
          nextData,
          pathIndex
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
    { index, typeItem, name }: Pick<Levels, 'index' | 'typeItem' | 'name'>,
    coverName: boolean = false
  ) {
    const findItem = numberToConvert(index, typeItem);
    const item = (rootItem ?? '') + (rootItem ? '.' : '') + findItem;
    const parseName = item + (coverName ? '. ' : '. ') + name;
    const path = rootPath + '/' + item + '. ' + name;
    return { item, path, name: parseName };
  }

  private static getRenameFiles(
    files: Files[],
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

  static async updateTypeItem(
    id: Levels['id'],
    { item, type = 'LEVEL' }: LevelItemQuery
  ) {
    if (type === 'STAGE') {
      const stageType = await prisma.stages.update({
        where: { id },
        data: { rootTypeItem: item },
      });
      return stageType;
    }
    const levelType = await prisma.levels.update({
      where: { id },
      data: { rootTypeItem: item },
    });
    return levelType;
  }

  private static async listByUpdate(
    list: { id: number; index: number }[],
    quantity: number = -1
  ) {
    const updatePerLevel = list.map(({ id, index }) => {
      const data = { index: index + quantity };
      const update = prisma.levels.update({ where: { id }, data });
      return update;
    });
    return prisma.$transaction(updatePerLevel);
  }

  private static async listByDelete(rootId: Levels['rootId']) {
    if (!rootId) throw new AppError('Oops!, ID invalido', 400);
    const findIds = await prisma.levels.findMany({
      where: { rootId },
      orderBy: { index: 'asc' },
      select: {
        id: true,
        index: true,
        name: true,
        _count: {
          select: {
            subTasks: {
              where: {
                status: { not: 'UNRESOLVED' }, // TODO: revisar
                users: {},
              },
            },
          },
        },
      },
    });
    const list: TypeIdsList[] = await Promise.all(
      findIds.map(async ({ id, _count, name }) => {
        if (_count.subTasks)
          throw new AppError(
            'No se puede eliminar, tareas pendientes en el nivel ' +
              name.toUpperCase(),
            400
          );
        const next = await this.listByDelete(id);
        if (!next.length) return id;
        return [id, ...next].flat(1);
      })
    );
    return list;
  }

  private static async findRoot(rootId: number) {
    const root = await prisma.levels.findUnique({ where: { id: rootId } });
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
    if (name.includes('project'))
      throw new AppError('Error palabra reservada', 409);
    if (type === 'ID') {
      const getId = await prisma.levels.findUnique({ where: { id } });
      if (!getId) throw new AppError('No se pudo encontrar el índice', 404);
      rootId = getId.rootId;
      stagesId = getId.stagesId;
    }
    const list = await prisma.levels.groupBy({
      by: ['id', 'name'],
      where: { stagesId, rootId },
    });
    const duplicated = list.some(l => l.name.includes(name));
    return { duplicated, quantity: list.length, rootId };
  }

  private static fileCounter(files: Files[]) {
    const countExt =
      files?.reduce((acc: ObjectNumber, value) => {
        const ext = value.name.split('.').at(-1) || '';
        acc[ext] = (acc[ext] || 0) + 1;
        return acc;
      }, {}) || {};
    return countExt;
  }
}

export default LevelsServices;

// class LevelsServices {
//   static async find(id: Levels['id'], status?: SubTasks['status']) {
//     if (!id) throw new AppError('Oops!, ID invalido', 400);
//     const findRootLevel = await prisma.levels.findUnique({ where: { id } });
//     if (!findRootLevel) throw new AppError('No se pudó encontrar nivel', 400);
//     const { stagesId, level } = findRootLevel;
//     const getList = await prisma.levels.findMany({
//       where: {
//         stagesId,
//         level: { gt: level },
//       },
//       orderBy: { index: 'asc' },
//       include: {
//         subTasks: {
//           where: { status },
//           orderBy: { index: 'asc' },
//           include: {
//             users: {
//               select: {
//                 percentage: true,
//                 userId: true,
//                 user: Queries.selectProfileUser,
//               },
//             },
//           },
//         },
//       },
//     });
//     const nextLevel = this.findList(getList, id, level);
//     return { ...findRootLevel, nextLevel };
//   }

//   static async duplicate(
//     id: number,
//     stageId: number,
//     name: string,
//     type: DuplicateLevel['type']
//   ) {
//     let rootId, stagesId;
//     rootId = id;
//     stagesId = stageId;

//     if (type === 'ID') {
//       const getId = await prisma.levels.findUnique({ where: { id } });
//       if (!getId) throw new AppError('No se pudo encontrar el índice', 404);
//       rootId = getId.rootId;
//       stagesId = getId.stagesId;
//     }
//     const list = await prisma.levels.findMany({ where: { rootId, stagesId } });
//     if (!list) throw new AppError('No se pudo encontrar la lista', 404);
//     const duplicated = list.map(({ name }) => name).includes(name);
//     const quantity = list.length;
//     return { duplicated, quantity, rootId };
//   }

//   static async findRoot(rootId: number) {
//     const root = await prisma.levels.findUnique({ where: { id: rootId } });
//     return {
//       rootItem: root ? root.item.slice(0, -1) : null,
//       stagesId: root ? root.stagesId : 0,
//       rootLevel: root ? root.level : 0,
//       project: root ? root.isProject : false,
//       area: root ? root.isArea : false,
//       include: root ? root.isInclude : false,
//       typeIndex: root ? root.typeItem : null,
//     };
//   }
//   static async create({
//     name,
//     stagesId,
//     rootId,
//     isProject,
//     userId,
//     isArea,
//     typeItem,
//   }: Levels) {
//     //---------------------------exist_file----------------------------------------
//     await existRootLevelPath(rootId, stagesId);
//     //--------------------duplicate_name_level-------------------------------------
//     const getDuplicate = await this.duplicate(rootId, stagesId, name, 'ROOT');
//     const { duplicated, quantity } = getDuplicate;
//     if (duplicated) throw new AppError('Error al crear, Nombre existente', 404);
//     //--------------------------get_new_item---------------------------------------
//     const root = await this.findRoot(rootId);
//     const { rootItem, rootLevel, project, include, area } = root;
//     const stages = { connect: { id: stagesId } };
//     // const isArea = area;
//     const level = rootLevel + 1;
//     const isInclude = area || include;
//     //--------------------------set_new_item---------------------------------------
//     const index = quantity + 1;
//     const newRootItem = rootItem ? rootItem + '.' : '';
//     const _type = numberToConvert(index, typeItem);
//     if (!_type) throw new AppError('excediste Limite de conversion', 400);
//     const item = `${newRootItem}${_type}.`;
//     //--------------------------find_user------------------------------------------
//     const _user = () => {
//       if (userId && (project || isProject || isArea))
//         return { connect: { id: userId } };
//       return undefined;
//     };
//     //-----------------------------------------------------------------------------
//     const _values = {
//       rootId,
//       item,
//       name,
//       index,
//       rootLevel,
//       stages,
//       level,
//       typeItem,
//     };
//     const data = { ..._values, isProject, isArea, isInclude, user: _user() };
//     const newLevel = await prisma.levels.create({ data });

//     return newLevel;
//   }

//   static async update(id: Levels['id'], { name, userId = null }: Levels) {
//     if (!id) throw new AppError('Oops!,ID invalido', 400);
//     const oldPath = await PathServices.level(id);
//     if (!existsSync(oldPath)) throw new AppError('Ops!,carpeta no existe', 404);
//     const { duplicated } = await this.duplicate(id, 0, name, 'ID');
//     if (duplicated) throw new AppError('Error al crear, Nombre existente', 404);
//     let updateLevel;
//     if (!duplicated) {
//       updateLevel = await prisma.levels.update({
//         where: { id },
//         data: { name },
//       });
//     }
//     if (userId) {
//       updateLevel = await prisma.levels.update({
//         where: { id },
//         data: { userId },
//       });
//     }
//     return { ...updateLevel, oldPath };
//   }

//   static async updateTypeItem(
//     id: Levels['id'],
//     rootTypeItem: Levels['rootTypeItem'],
//     isArea: Stages['isProject'],
//     type: 'LEVEL' | 'STAGE' = 'LEVEL'
//   ) {
//     if (type === 'STAGE') {
//       const stageType = await prisma.stages.update({
//         where: { id },
//         data: { rootTypeItem, isProject: isArea },
//       });
//       return stageType;
//     }
//     const levelType = await prisma.levels.update({
//       where: { id },
//       data: { rootTypeItem, isProject: isArea },
//     });
//     return levelType;
//   }

//   public static async addToUper(
//     id: Levels['id'],
//     { name, userId }: Levels,
//     typeGte: 'upper' | 'lower'
//   ) {
//     if (!id || !typeGte) throw new AppError('Oops!,ID invalido', 400);
//     //--------------------------- Find level ------------------------------------
//     const getInfoLevel = await getRootPath(id);
//     const { rootPath, rootId, stagesId, rootLevel, ..._level } = getInfoLevel;
//     const { typeItem, index, _item: item, ...levelData } = _level;
//     const { id: _i, name: _n, ...parseData } = levelData;
//     //------------------------------------------------------------------
//     const { duplicated } = await this.duplicate(rootId, stagesId, name, 'ROOT');
//     if (duplicated) throw new AppError('Error al crear, Nombre existente', 404);
//     //--------------------------create_level---------------------------------------
//     const rootData = { rootId, rootLevel, stagesId };
//     const data = { typeItem, name, item, ...parseData, ...rootData };
//     let newLevel;
//     const { rootItem } = getRootItem(item);
//     const _rootItem = rootItem.length ? rootItem + '.' : rootItem;
//     if (typeGte === 'lower') {
//       const newItem = _rootItem + numberToConvert(index + 1, typeItem) + '.';
//       const levelData = { ...data, index: index + 1, item: newItem, userId };
//       newLevel = await prisma.levels.create({ data: { ...levelData } });
//     } else {
//       const levelData = { ...data, index, userId };
//       newLevel = await prisma.levels.create({ data: { ...levelData } });
//     }
//     //--------------------------- Create Folder Levels ------------------------------------
//     const path = await PathServices.level(newLevel.id);
//     // const editablePath = path.replace('projects', 'editables');
//     if (newLevel) {
//       mkdirSync(path);
//       // mkdirSync(editablePath);
//     }
//     //-----------------------------------------------------------------------------------
//     const typeFilter =
//       typeGte === 'upper' ? { not: getInfoLevel.id } : { not: 0 };
//     const aux = typeGte === 'lower' ? 2 : 1;
//     //--------------------------- Find Lower Levels ------------------------------------
//     const filterLevelList = await prisma.levels.groupBy({
//       by: ['id', 'item', 'index'],
//       where: {
//         stagesId,
//         rootId: getInfoLevel.rootId,
//         level: getInfoLevel.level,
//         id: typeFilter,
//         index: { lte: index },
//       },
//     });

//     //-----------------------------------------------------------------
//     const blackList = filterLevelList.map(({ id }) => id);
//     const getList = await prisma.levels.findMany({
//       where: {
//         stagesId,
//         level: { gt: rootLevel },
//         item: { startsWith: _rootItem },
//         id: { notIn: [...blackList, newLevel.id] },
//       },
//       include: {
//         subTasks: {
//           select: {
//             index: true,
//             id: true,
//             item: true,
//             typeItem: true,
//             files: {
//               where: { OR: [{ type: 'UPLOADS' }] },
//               select: { id: true, dir: true, name: true, type: true },
//             },
//           },
//         },
//       },
//       orderBy: { index: 'asc' },
//     });

//     const updateList = await this.updateBlock(
//       getList,
//       rootLevel,
//       rootId,
//       rootPath,
//       _rootItem,
//       index + aux
//     );
//     return getList;
//   }

//   static async delete(id: Levels['id']) {
//     //----------------------------verify_exist------------------------------------
//     const getInfoLevel = await getRootPath(id);
//     const { rootPath, rootId, stagesId, _item, rootLevel } = getInfoLevel;
//     //----------------------------verify_tasks------------------------------------
//     const _count = await this.verifyTasks(stagesId, _item, getInfoLevel.level);
//     if (_count) throw new AppError('Error al eliminar, contiene tareas', 400);
//     //----------------------------delete_level------------------------------------
//     const deleteLevel = await prisma.levels.delete({ where: { id } });
//     // if (!deleteLevel) throw new AppError('Error al eliminar, contiene tareas', 400);
//     const deleteDir = rootPath + parsePath(_item, deleteLevel.name);
//     // await this.verifyTasks(stagesId, deleteLevel.item, deleteLevel.level);

//     const filterLevelList = await prisma.levels.groupBy({
//       by: ['id'],
//       where: {
//         stagesId,
//         rootId: getInfoLevel.rootId,
//         level: getInfoLevel.level,
//         index: { lte: getInfoLevel.index },
//       },
//     });
//     //-------------------------- get root id -------------------------
//     const { rootItem } = getRootItem(_item);
//     const _rootItem = rootItem ? rootItem + '.' : rootItem;
//     //-----------------------------------------------------------------
//     const blackList = filterLevelList.map(({ id }) => id);
//     const getList = await prisma.levels.findMany({
//       where: {
//         stagesId,
//         level: { gt: rootLevel },
//         item: { startsWith: _rootItem },
//         id: { notIn: blackList },
//       },
//       include: {
//         subTasks: {
//           select: {
//             index: true,
//             id: true,
//             item: true,
//             typeItem: true,
//             files: {
//               where: { type: 'UPLOADS' },
//               select: { id: true, dir: true, name: true, type: true },
//             },
//           },
//         },
//       },
//       orderBy: { index: 'asc' },
//     });

//     //-----------------------update_some_levels----------------------------------
//     await this.deleteBlock(stagesId, getInfoLevel._item, getInfoLevel.level);
//     const updateList = await this.updateBlock(
//       getList,
//       rootLevel,
//       rootId,
//       rootPath,
//       _rootItem,
//       getInfoLevel.index
//     );
//     // //-------------------------return_delete_dir---------------------------------
//     const result = await Promise.all(updateList).then(async () => {
//       return deleteDir;
//     });
//     return result;
//   }

//   static async deleteBlock(stagesId: number, item: string, level: number) {
//     const deleteList = await prisma.levels.groupBy({
//       by: ['id'],
//       where: {
//         stagesId,
//         item: { startsWith: item },
//         level: { gt: level },
//       },
//     });
//     const levelListDelete = deleteList.map(({ id }) => id);
//     await prisma.levels.deleteMany({
//       where: { id: { in: levelListDelete } },
//     });
//     return levelListDelete;
//   }

//   static async verifyTasks(stagesId: number, item: string, level: number) {
//     const list = await prisma.subTasks.groupBy({
//       by: ['id'],
//       where: {
//         Levels: {
//           stagesId,
//           item: { startsWith: item },
//           level: { gt: level },
//         },
//         NOT: { status: 'UNRESOLVED' },
//       },
//     });
//     const verify = !!list.length;
//     return verify;
//   }

//   static updateBlock(
//     _list: UpdateLevelBlock[],
//     _rootLevel: number,
//     _rootId: number,
//     rootPath: string,
//     rootItem: string,
//     previusIndex?: number
//   ) {
//     const { findList, list } = filterLevelList(_list, _rootId, _rootLevel);
//     if (findList.length === 0) return [];
//     const newList = findList.map(
//       async ({ subTasks: subtasks, ...value }, i) => {
//         const { level, id, item, name } = value;
//         //-----------------------------get_new_item--------------------------------------
//         const { lastItem } = getRootItem(item);
//         let index = value.index;
//         let _item = rootItem + lastItem + '.';
//         if (previusIndex) {
//           index = previusIndex + i;
//           const _type = numberToConvert(index, value.typeItem) || '';
//           _item = rootItem + _type + '.';
//         }
//         //----------------------------update_level---------------------------------------
//         const updateLevel = await prisma.levels.update({
//           where: { id },
//           data: { item: _item, index },
//         });
//         //------------------------------get_paths---------------------------------------
//         const oldPath = rootPath + parsePath(item, name);
//         const newPath = rootPath + parsePath(updateLevel.item, name);
//         // const oldEditable = oldPath.replace('projects', 'editables');
//         // const newEditable = newPath.replace('projects', 'editables');
//         renameDir(oldPath, newPath);
//         // renameDir(oldEditable, newEditable);
//         //-------------------------------------------------------------------------------
//         const subTasks = await Promise.all(
//           subtasks.map(async ({ item: _item, files: _files, ...subtask }) => {
//             const { lastItem } = getRootItem(_item);
//             const item = updateLevel.item + lastItem + '.';
//             const updateSubtask = await prisma.subTasks.update({
//               where: { id: subtask.id },
//               data: { item },
//             });
//             //------------------------- Count files per task ------------------------------------------
//             const countExt = _files.reduce((acc: ObjectNumber, value) => {
//               const ext = value.name.split('.').at(-1) || '';
//               acc[ext] = (acc[ext] || 0) + 1;
//               return acc;
//             }, {});
//             //-------------------------------------------------------------------------------
//             const parseFiles = await Promise.all(
//               _files.map(async ({ dir: d, id: _id, name: n, ...file }, i) => {
//                 const { item: _i, name: _n } = updateSubtask;
//                 const dir = newPath;
//                 const ext = n.split('.').at(-1) || '';
//                 countExt[ext] -= 1;
//                 const index = countExt[ext] >= 1 ? ` (${countExt[ext]})` : '';
//                 const name = _i + _n + index + '.' + ext;
//                 await prisma.files
//                   .update({
//                     where: { id: _id },
//                     data: { dir, name },
//                   })
//                   .then(() => {
//                     renameSync(`${newPath}/${n}`, `${newPath}/${name}`);
//                     // if (['pdf', 'PDF'].includes(ext) && newEditable) {
//                     //   renameSync(
//                     //     `${newEditable}/${n}`,
//                     //     `${newEditable}/${name}`
//                     //   );
//                     // }
//                   });
//                 return { dir, name, ...file };
//               })
//             );
//             //-------------------------------------------------------------------------------
//             const files = parseFiles.map(f => ({ id: 0, ...f }));
//             return { item, files, ...subtask };
//           })
//         );
//         //-------------------------------------------------------------------------------
//         const nextLevel: UpdateLevelBlock[] = await this.updateBlock(
//           list,
//           level,
//           id,
//           newPath,
//           _item
//         );
//         if (!nextLevel.length) return { oldPath, newPath, subTasks, ...value };
//         return { oldPath, newPath, ...value, subTasks, nextLevel };
//       }
//     );
//     const result = Promise.all(newList);
//     return result;
//   }

//   public static async updateDaysPerId(
//     levels: { id: BasicLevels['id']; days: number }[]
//   ) {
//     const updateList = levels.map(({ id, days }) => {
//       return prisma.subTasks.update({ where: { id }, data: { days } });
//     });
//     return await prisma.$transaction(updateList);
//   }

//   static findList(
//     array: GetFilterLevels[],
//     _rootId: number,
//     _rootLevel: number,
//     listCost?: ListCostType
//   ) {
//     const findList = array.filter(
//       ({ rootId, rootLevel }) => rootId === _rootId && rootLevel === _rootLevel
//     );
//     const list = array.filter(value => !findList.includes(value));
//     if (!findList.length) return [];
//     const newList = findList.map(({ subTasks, ...value }) => {
//       const { id, level } = value;
//       let data: any = {
//         spending: 0,
//         balance: 0,
//         price: 0,
//         days: 0,
//         listUsers: [],
//         percentage: 0,
//         total: 0,
//         ...value,
//       };
//       if (subTasks && subTasks.length) {
//         const subtasks = percentageSubTasks(subTasks, listCost);
//         const price = sumValues(subtasks, 'price');
//         const days = sumValues(subtasks, 'days');
//         const spending = sumValues(subtasks, 'spending');
//         const percentage = sumValues(subtasks, 'percentage');
//         //---------------------------------------------------------------------
//         const list = subtasks.map(({ listUsers }) => listUsers).flat(2);
//         const listUsers = list.reduce(
//           (acc: typeof list, { count, userId, ...data }) => {
//             const exist = acc.findIndex(u => u.userId === userId);
//             exist >= 0
//               ? (acc[exist].count += count)
//               : acc.push({ userId, count, ...data });
//             return acc;
//           },
//           []
//         );
//         //---------------------------------------------------------------------
//         const total = subTasks.length;
//         const balance = roundTwoDecimail(price - spending);
//         data = {
//           price,
//           spending,
//           balance,
//           days,
//           percentage,
//           listUsers,
//           total,
//           ...value,
//           subTasks: subtasks,
//         };
//       }
//       const nextLevel: typeof findList = this.findList(
//         list,
//         id,
//         level,
//         listCost
//       );
//       if (!nextLevel.length) return data;
//       return { ...data, nextLevel };
//     });
//     return newList;
//   }
// }

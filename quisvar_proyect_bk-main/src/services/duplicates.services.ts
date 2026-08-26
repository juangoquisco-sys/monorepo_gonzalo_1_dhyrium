/* eslint-disable @typescript-eslint/no-unused-vars */
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import AppError from '@/utils/appError';
import type {
  BasicLevels,
  Contratc,
  Files,
  Projects,
  Stages,
  SubTasks,
} from '@prisma/client';
import { Levels } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import PathServices from '@/services/paths.services';
import {
  BasicTaskFiles,
  GetDuplicateBasicLevels,
  GetDuplicateLevels,
  SubTaskFiles,
} from '@/types/types';
import {
  getPathProject,
  getPathStage,
  getRootItem,
  numberToConvert,
  toEditablesFiles,
} from '@/utils/tools';
import LevelsServices from '@/services/levels.services';
import SubTasksServices from '@/services/subtasks.services';
import StageServices from '@/services/stages.services';
import BasicLevelServices from '@/services/basiclevels.services';
import { DuplicateStageParams, TypeRoot } from '@/types/stages';
import ProjectsServices from '@/services/projects.services';
import path from 'path';
import { TaskDuplicateOptions } from '@/types/duplicates';
import LegacyTaskAssignmentContextService from '@/services/legacyTaskAssignmentContext.services';

class DuplicatesServices {
  static async project(
    id: Projects['id'],
    name: string,
    contractId: Contratc['id']
  ) {
    if (!id) throw new AppError('Oops!, ID invalido', 400);
    if (!contractId) throw new AppError('Oops!, ID invalido', 400);
    const getProyect = await prisma.projects.findUnique({
      where: { id },
      select: {
        userId: true,
        typeSpecialityId: true,
        stages: { select: { id: true, name: true }, take: 1 },
      },
    });
    if (!getProyect)
      throw new AppError('No se pudo encontrar el proyecto', 404);
    //----------------------------create_project--------------------------------------
    const { stages, ..._data } = getProyect;
    const data = { name, ..._data };
    const createNewProject = await prisma.projects.create({
      data: { ...data, contractId },
    });
    const { id: projectId } = createNewProject;
    //----------------------------create_files--------------------------------------
    ProjectsServices.createFolders(['MODEL', 'REVIEW', 'UPLOADS'], projectId);
    return { ...createNewProject };
  }

  static async stage(id: Stages['id'], options: DuplicateStageParams) {
    return this.copyStageContent(id, options.stageId, { name: options.name });
  }

  static async copyStageContent(
    id: Stages['id'],
    stageId: Stages['id'],
    options?: { name?: string }
  ) {
    if (!id) throw new AppError('Oops!,ID invalido?', 400);
    //-------------------------- create stage --------------------------------------
    const getStage = await prisma.stages.findUnique({
      where: { id },
      select: {
        rootTypeItem: true,
        projectId: true,
        levels: {
          orderBy: { item: 'asc' },
          include: {
            subTasks: { include: { files: { where: { type: 'MODEL' } } } },
          },
        },
      },
    });
    if (!getStage)
      throw new AppError('Oops!,no se pudo encontrar el nivel', 400);

    // if (!getStage.groupId)
    //   throw new AppError('Oops!,asignar a un grupo antes de duplicar', 400);
    //----------------------------create_stage--------------------------------------
    const updateStage = await prisma.stages.update({
      where: { id: stageId },
      data: {
        ...(options?.name ? { name: options.name } : {}),
        // projectId: getStage.projectId,
        rootTypeItem: getStage.rootTypeItem,
      },
    });
    const mods =
      await LegacyTaskAssignmentContextService.defaultEvaluatorForStage(
        updateStage.id
      );
    //------------------------------------------------------------------------------
    const stagePath = await PathServices.stage(updateStage.id, 'MODEL');
    //------------------------------------------------------------------------------
    const nextLevel = this.getList(getStage.levels, 0, 0, updateStage.id);
    const levels = await this.createLevel(nextLevel, 0, [], {
      stagePath,
      mods,
    });
    return { ...updateStage, levels };
  }

  static async level(lvlId: Levels['id'], name: string) {
    if (!lvlId) throw new AppError('Oops!, ID invalido', 400);
    const rootLevel = await prisma.levels.findUnique({
      where: { id: lvlId },
      include: {
        subTasks: { include: { files: { where: { type: 'UPLOADS' } } } },
      },
    });
    if (!rootLevel) throw new AppError('No se pudó encontrar nivel', 400);
    const duplicate = await LevelsServices.duplicate(lvlId, 0, name, 'ID');
    const { quantity, duplicated } = duplicate;
    if (duplicated) throw new AppError('Ya se registro el nombre', 400);
    const mods = await SubTasksServices.getCoordinate(lvlId);
    const { stagesId, level } = rootLevel;
    const { id: _id, name: _name, subTasks, ...otherProps } = rootLevel;
    //--------------------------create_level---------------------------------------
    const data = { ...otherProps, name, index: quantity + 1 };
    const newLevel = await prisma.levels.create({ data });
    //----------------------------get_levels---------------------------------------
    const getList = await prisma.levels.findMany({
      where: { stagesId, level: { gt: level } },
      orderBy: { item: 'asc' },
      include: {
        subTasks: { include: { files: { where: { type: 'MODEL' } } } },
      },
    });
    //-------------------------duplicate_subtasks---------------------------------
    const _subtasks = newLevel
      ? await this.listSubtask(subTasks, newLevel, { mods })
      : [];
    //----------------------------------------------------------------------------
    const nextLevel = this.getList(getList, lvlId, level, newLevel.stagesId);
    const createDuplicate = await this.createLevel(
      nextLevel,
      newLevel.id,
      newLevel.levelList,
      {}
    );
    //----------------------------------------------------------------------------
    return {
      ...data,
      subTasks: _subtasks,
      createDuplicate,
    };
  }

  static async basicLevel(lvlId: Levels['id'], name: string) {
    if (!lvlId) throw new AppError('Oops!, ID invalido', 400);
    const rootLevel = await prisma.basicLevels.findUnique({
      where: { id: lvlId },
      include: {
        subTasks: { include: { files: { where: { type: 'MODEL' } } } },
      },
    });
    if (!rootLevel) throw new AppError('No se pudó encontrar nivel', 400);
    const duplicate = await BasicLevelServices.duplicate(lvlId, 0, name, 'ID');
    const { quantity, duplicated } = duplicate;
    if (duplicated) throw new AppError('Ya se registro el nombre', 400);
    const { stagesId, level } = rootLevel;
    const { id: _id, name: _name, subTasks, ...otherProps } = rootLevel;
    //--------------------------create_level---------------------------------------
    const data = { ...otherProps, name, index: quantity + 1 };
    const newLevel = await prisma.basicLevels.create({ data });
    //----------------------------get_levels---------------------------------------
    const getList = await prisma.basicLevels.findMany({
      where: { stagesId, level: { gt: level } },
      orderBy: { index: 'asc' },
      include: {
        subTasks: { include: { files: { where: { type: 'MODEL' } } } },
      },
    });
    //-------------------------duplicate_subtasks---------------------------------
    const _subtasks = newLevel
      ? await this.listBasictask(subTasks, newLevel)
      : [];
    const nextLevel = this.getBasicList(
      getList,
      lvlId,
      level,
      newLevel.stagesId
    );
    const createDuplicate = await this.createBasicLevel(
      nextLevel,
      newLevel.id,
      newLevel.levelList,
      ''
    );
    return {
      ...data,
      subTasks: _subtasks,
      createDuplicate,
    };
  }

  static async subTask(_id: SubTasks['id'], name: string) {
    const verify = await SubTasksServices.findDuplicates(name, _id, 'ID');
    const { duplicated, quantity } = verify;
    if (duplicated) throw new AppError('Nombre registrado anteriormente', 404);
    const getSubTask = await prisma.subTasks.findUnique({
      where: { id: _id },
      select: {
        typeItem: true,
        price: true,
        days: true,
        index: true,
        files: { where: { type: 'MODEL' } },
        Levels: { select: { id: true, item: true } },
      },
    });
    if (!getSubTask) throw new AppError('Ops!, no se pudo encontrar', 404);
    const { files, Levels, index, ...subTaskData } = getSubTask;
    const newPath = await PathServices.level(Levels.id);
    const newEditables = newPath.replace('projects', 'editables');
    //--------------------------set_new_item-----------------------------
    const { item: rootItem, id: levels_Id } = Levels;
    const parseItem = rootItem ? rootItem : '';
    const lastItem = numberToConvert(index + 1, subTaskData.typeItem);
    if (!lastItem) throw new AppError('excediste Limite de conversion', 400);
    const item = parseItem + lastItem + '.';
    //--------------------------set_new_subtasks-------------------------
    const status: SubTasks['status'] = 'UNRESOLVED';
    const data = {
      ...subTaskData,
      status,
      name,
      item,
      levels_Id,
      index: index + 1,
    };
    const newSubTask = await prisma.subTasks.create({ data });
    //--------------------------set_new_files----------------------------
    const hash = new Date().getTime();
    const _files = files.map(
      ({ id, assignedAt, feedbackId, subTasksId, ...data }) => {
        const nameFile = data.name.split('$$')[1];
        const name = `${hash}$$${nameFile}`;
        copyFileSync(`${data.dir}/${data.name}`, `${data.dir}/${name}`);
        return { ...data, name, subTasksId: newSubTask.id };
      }
    );
    await prisma.files.createMany({ data: _files });
    //------------------------------------------------------------------
    const list = await prisma.subTasks.findMany({
      where: {
        levels_Id,
        index: { gt: index },
        id: {
          not: newSubTask.id,
        },
      },
      orderBy: { index: 'asc' },
      include: {
        files: {
          where: { OR: [{ type: 'UPLOADS' }] },
          select: { id: true, dir: true, name: true, type: true },
        },
      },
    });
    //--------------------------------------------------------------

    //--------------------------------------------------------------
    return { ...newSubTask, files: _files };
  }

  static async listSubtask(
    list: SubTaskFiles[],
    { id: rootId }: Pick<Levels, 'id'>,
    { stagePath, mods }: TaskDuplicateOptions
  ) {
    const newSubTaks = list.map(({ id, files, ...subtask }) => {
      const { levels_Id, createdAt, updatedAt, item, ...data } = subtask;
      //--------------------------set_new_files----------------------------
      const hash = new Date().getTime();
      const newFiles = files.map(file => {
        const name = hash + '$$' + file.originalname;
        const { type, originalname, author } = file;
        const data = { type, originalname, author };
        const input = path.join(file.dir, file.name);
        const dir = path.join(stagePath ? stagePath : file.dir);
        const output = path.join(dir, name);
        if (existsSync(input)) copyFileSync(input, output);
        return { ...data, dir, name };
      });
      return prisma.subTasks.create({
        data: {
          ...data,
          mods,
          status: 'UNRESOLVED',
          levels_Id: rootId,
          files: { createMany: { data: newFiles } },
        },
        include: { files: true },
      });
      //------------------------------------------------------------------
    });
    return await prisma.$transaction(newSubTaks);
  }

  static async listBasictask(
    list: BasicTaskFiles[],
    { id: rootId }: BasicLevels,
    stagePath?: string
  ) {
    const newSubTaks = list.map(({ id, files, ...subtask }) => {
      const { levels_Id, createdAt, updatedAt, ...data } = subtask;
      //--------------------------set_new_files----------------------------
      const hash = new Date().getTime();
      const newFiles = files.map(file => {
        const name = hash + '$$' + file.name.split('$$')[1];
        const { type, dir } = file;
        const data = { type, dir };
        const input = file.dir + '/' + file.name;
        const output = file.dir + '/' + name;
        if (existsSync(input)) copyFileSync(input, output);
        return { ...data, name };
      });
      return prisma.basicTasks.create({
        data: {
          ...data,
          status: 'UNRESOLVED',
          levels_Id: rootId,
          files: { createMany: { data: newFiles } },
        },
        include: { files: true },
      });
    });
    return await prisma.$transaction(newSubTaks);
  }

  static async createBasicLevel(
    array: GetDuplicateBasicLevels[],
    mainId: number,
    history: number[],
    stagePath?: string
  ) {
    const levelList = [...history, mainId];
    const createList = array.map(
      ({
        id: _id,
        next: _next,
        subTasks: _subTasks,
        rootId: _rootId,
        levelList: _history,
        ...data
      }) => {
        return prisma.basicLevels.create({
          data: { ...data, rootId: mainId, levelList },
        });
      }
    );
    const getNewList = await prisma.$transaction(createList);
    //---------------------------create_file---------------------------------------
    const list = array.map(async ({ id, next, subTasks, ...level }) => {
      const newLevel = getNewList.find(data => data.index === level.index)!;
      //-------------------------duplicate_subtasks---------------------------------
      const _subTasks =
        newLevel && subTasks
          ? await this.listBasictask(subTasks, newLevel, stagePath)
          : [];
      // //----------------------------------------------------------------------------
      if (!next) return { ...level, id, subTasks: _subTasks };
      type Next = GetDuplicateBasicLevels[];
      const _next: Next = await this.createBasicLevel(
        next,
        newLevel.id,
        levelList,
        stagePath
      );
      return { ...level, id, subTasks, next: _next };
    });
    return Promise.all(list);
  }

  static async createLevel(
    array: GetDuplicateLevels[],
    mainId: number,
    history: number[],
    { stagePath, mods }: TaskDuplicateOptions
  ) {
    const levelList = [...history, mainId];
    const list = array.map(
      ({
        id: _id,
        next: _next,
        subTasks: _subTasks,
        rootId: _rootId,
        levelList: _history,
        ...data
      }) => {
        return prisma.levels.create({
          data: { ...data, rootId: mainId, levelList },
        });
      }
    );
    const createLevels = await prisma.$transaction(list);
    //------------------------- create_files ---------------------------------
    const newList = array.map(async ({ id, next, subTasks, ...level }) => {
      const newLevel = createLevels.find(data => data.index === level.index)!;
      //-------------------------duplicate_subtasks---------------------------------
      const _subTasks =
        newLevel && subTasks
          ? await this.listSubtask(subTasks, newLevel, { stagePath, mods })
          : [];
      if (!next) return { ...level, id, subTasks: _subTasks };
      type Next = GetDuplicateLevels[];
      const _next: Next = await this.createLevel(next, newLevel.id, levelList, {
        stagePath,
        mods,
      });
      return { ...level, id, subTasks, next: _next };
    });
    return Promise.all(newList);
  }

  static getBasicList(
    array: GetDuplicateBasicLevels[],
    _rootId: number,
    _rootLevel: number,
    _stageId?: number
  ) {
    const findList = array.filter(
      ({ rootId, rootLevel }) => rootId === _rootId && rootLevel === _rootLevel
    );
    const list = array.filter(value => !findList.includes(value));
    if (!findList.length) return [];
    const newList = findList.map(({ subTasks, stagesId: stgId, ...value }) => {
      const stagesId = _stageId ?? stgId;
      let data;
      if (subTasks && subTasks.length) data = { subTasks };
      const props = { ...value, stagesId };
      const next: typeof findList = this.getBasicList(
        list,
        value.id,
        value.level,
        stagesId
      );
      if (!next.length) return { ...props, ...data };
      return { ...props, ...data, next };
    });
    return newList;
  }

  static getList(
    array: GetDuplicateLevels[],
    _rootId: number,
    _rootLevel: number,
    _stageId?: number
  ) {
    const findList = array.filter(
      ({ rootId, rootLevel }) => rootId === _rootId && rootLevel === _rootLevel
    );
    const list = array.filter(value => !findList.includes(value));
    if (!findList.length) return [];
    const newList = findList.map(({ subTasks, stagesId: stgId, ...value }) => {
      const stagesId = _stageId ?? stgId;
      let data;
      if (subTasks && subTasks.length) data = { subTasks };
      const props = { ...value, stagesId };
      //---------------------------------------------------------------------------
      type Next = typeof findList;
      const next: Next = this.getList(list, value.id, value.level, stagesId);
      if (!next.length) return { ...props, ...data };
      return { ...props, ...data, next };
    });
    return newList;
  }
}

export default DuplicatesServices;

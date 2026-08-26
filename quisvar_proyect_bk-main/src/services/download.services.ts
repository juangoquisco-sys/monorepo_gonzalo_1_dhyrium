import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  statSync,
} from 'fs';
import AppError from '@/utils/appError';
import BasicLevelServices from '@/services/basiclevels.services';
import {
  BasicLevelAttributes,
  LevelAttributes,
  MergePdfBasicLevelAttributes,
} from '@/types/types';
import LevelsServices from '@/services/levels.services';
import { AtrributesMergeFilters } from '@/types/task';
import { SubTasks } from '@prisma/client';
import SubTasksServices from '@/services/subtasks.services';

class DowloadServices {
  public static async level(
    id: number,
    type: 'level' | 'stage',
    {
      sourceDir: path,
      itemLevel: item = '',
      createFiles = true,
      type: typeFile = 'UPLOADS',
      ...options
    }: LevelAttributes
  ) {
    if (!id) throw new AppError('Oops!, ID incorrecto', 400);
    const getList = await LevelsServices.getLevelList(id, type, {
      type: typeFile,
      ...options,
    });
    if (!existsSync(path)) mkdirSync(path, { recursive: true });
    appendFileSync(
      path + '/empty_files.txt',
      'LISTA DE ARCHIVOS NO ENCONTRADOS\n'
    );
    const attributes = { item, path, ...getList.info, createFiles };
    const listWithPaths = await LevelsServices.folderlist(
      getList.data,
      attributes
    );
    if (statSync(path + '/empty_files.txt').size <= 40)
      rmSync(path + '/empty_files.txt');
    if (!listWithPaths.length)
      throw new AppError('Error, no se encontraron archivos', 404);
    return listWithPaths;
  }

  public static async basicLevel(
    id: number,
    type: 'level' | 'stage',
    {
      sourceDir: path,
      itemLevel: item = '',
      createFiles = true,
      type: typeFile = 'UPLOADS',
      ...options
    }: BasicLevelAttributes
  ) {
    if (!id) throw new AppError('Oops!, ID incorrecto', 400);
    const getList = await BasicLevelServices.getList(id, type, {
      type: typeFile,
      ...options,
      includeFiles: true,
    });
    if (!existsSync(path)) mkdirSync(path, { recursive: true });
    appendFileSync(
      path + '/empty_files.txt',
      'LISTA DE ARCHIVOS NO ENCONTRADOS\n'
    );
    const attributes = { item, path, ...getList.info };
    const listWithPaths = await BasicLevelServices.folderlist(
      getList.data,
      attributes,
      createFiles
    );
    if (statSync(path + '/empty_files.txt').size <= 40)
      rmSync(path + '/empty_files.txt');
    if (!listWithPaths.length)
      throw new AppError('Error, no se encontraron archivos', 404);
    return listWithPaths;
  }

  public static async mergePdfBasicLevel(
    id: number,
    type: 'level' | 'stage',
    { createCover, createFiles, ...options }: MergePdfBasicLevelAttributes
  ) {
    if (!id) throw new AppError('Oops!, ID incorrecto', 400);
    const {
      sourceDir,
      itemLevel: item = '',
      type: typeFile = 'UPLOADS',
    } = options;
    const getList = await BasicLevelServices.getList(id, type, {
      ...options,
      endsWith: '.pdf',
      equal: true,
      includeFiles: true,
      type: typeFile,
    });
    if (!existsSync(sourceDir)) mkdirSync(sourceDir, { recursive: true });
    const attributes = { item, path: sourceDir, ...getList.info };
    const listWithPaths = await BasicLevelServices.mergePDFs(
      getList.data,
      sourceDir,
      attributes,
      { createFiles, createCover }
    );
    if (!listWithPaths.length)
      throw new AppError('Error, no se encontraron archivos', 404);
    return { listWithPaths, sourceDir };
  }

  public static async mergePdfLevel(
    id: number,
    type: 'level' | 'stage',
    { createCover, createFiles, ...attributes }: AtrributesMergeFilters
  ) {
    if (!id) throw new AppError('Oops!, ID incorrecto', 400);
    const {
      sourceDir,
      itemLevel: item = '',
      type: typeFile = 'UPLOADS',
    } = attributes;
    const splitOptions = { endsWith: '.pdf', equal: true, includeFiles: true };
    const options = { ...attributes, ...splitOptions, type: typeFile };
    const { data, info } = await LevelsServices.getLevelList(id, type, options);
    if (!existsSync(sourceDir)) mkdirSync(sourceDir, { recursive: true });
    const params = {
      item,
      path: sourceDir,
      createFiles,
      createCover,
      ...info,
    };
    const pathList = await LevelsServices.mergePDFs(data, sourceDir, params);
    if (!pathList.length)
      throw new AppError('Error, no se encontraron archivos', 404);
    return { pathList, sourceDir };
  }

  public static async taskFiles(
    id: SubTasks['id'],
    { path }: { path: string }
  ) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    if (!existsSync(path)) mkdirSync(path, { recursive: true });
    appendFileSync(
      path + '/empty_files.txt',
      'LISTA DE ARCHIVOS NO ENCONTRADOS\n'
    );
    const getFiles = await SubTasksServices.downloadFilesById(id, {
      downloadPath: path,
    });
    const logsPath = path.split('/').slice(0, 2).join('/') + '/empty_files.txt';
    await new Promise(resolve => {
      getFiles.forEach(file => {
        if (existsSync(file.oldPath)) {
          copyFileSync(file.oldPath, file.newPath);
        } else {
          appendFileSync(
            logsPath,
            `archivo: ${file.originalname} ruta: ${file.oldPath}, no fue encontrado\n`
          );
        }
      });
      resolve(path);
    });
    if (statSync(path + '/empty_files.txt').size <= 40)
      rmSync(path + '/empty_files.txt');
    return getFiles;
  }
}
export default DowloadServices;

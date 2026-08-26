import { BasicFilesForm } from '@/types/types';
import AppError from '@/utils/appError';
import type {
  BasicFiles,
  FileTypes,
  Files,
  GeneralFiles,
  SubTasks,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import PathServices from '@/services/paths.services';
import fs, { existsSync } from 'fs';
import path from 'path';
// awa
class FilesServices {
  static async findBySubTask(subTasksId: SubTasks['id'], type: Files['type']) {
    if (!subTasksId) throw new AppError(`Oops!! id invalido`, 404);
    const filesList = await prisma.files.findMany({
      where: { subTasksId, type },
    });
    if (!filesList)
      throw new AppError(`no se pudo encontrar la lista de archivos`, 404);
    return filesList;
  }

  static async createManyFiles(
    data: {
      dir: string;
      type: FileTypes;
      subTasksId: number;
      name: string;
      userId: number;
    }[],
    subTasksId: SubTasks['id']
  ) {
    const subTask = await prisma.subTasks.findUnique({
      where: { id: subTasksId },
    });
    if (!subTask) throw new AppError(`no se pudo encontrar la subtarea`, 404);
    const newFile = await prisma.files.createMany({ data });
    return newFile;
  }

  static async createManyBasicFiles(
    data: BasicFilesForm[],
    subTasksId: SubTasks['id']
  ) {
    if (!subTasksId)
      throw new AppError(`no se pudo encontrar la subtarea`, 404);
    const newFile = await prisma.basicFiles.createMany({ data });
    return newFile;
  }

  static async create(
    subTasksId: Files['subTasksId'],
    filename: string,
    type: Files['type']
  ) {
    const subTask = await prisma.subTasks.findUnique({
      where: { id: subTasksId },
    });
    if (!subTask) throw new AppError(`no se pudo encontrar la subtarea`, 404);
    const dir = await PathServices.subTask(subTasksId, 'REVIEW');
    const newFile = await prisma.files.create({
      data: {
        dir,
        type,
        subTasksId,
        name: filename,
      },
    });
    return newFile;
  }

  static async createBasicFiles(
    subTasksId: BasicFiles['subTasksId'],
    filename: string,
    type: BasicFiles['type']
  ) {
    const basicTask = await prisma.basicTasks.findUnique({
      where: { id: subTasksId },
    });
    if (!basicTask) throw new AppError(`no se pudo encontrar la tarea`, 404);
    const newFile = await prisma.basicFiles.create({
      data: { dir: '', type, subTasksId, name: filename },
    });
    return newFile;
  }

  static async getAllGeneralFile() {
    const generalsFiles = await prisma.generalFiles.findMany({
      orderBy: { name: 'asc' },
    });
    return generalsFiles;
  }
  static async createGeneralFile({ dir, name }: GeneralFiles) {
    const duplicatedNameInFile = await prisma.generalFiles.findFirst({
      where: {
        name,
      },
    });
    if (duplicatedNameInFile)
      throw new AppError(`Nombre Duplicado del archivo.`, 404);

    const newGeneralFile = await prisma.generalFiles.create({
      data: {
        dir,
        name,
      },
    });
    return newGeneralFile;
  }
  /* ---------------------------------- update description ---------------------------------- */
  static async updateGeneralDescription(
    description: string,
    id: GeneralFiles['id']
  ) {
    if (!id) throw new AppError('Oops!, id invalido', 400);
    if (!description) throw new AppError('Oops!, descripcion invalida', 400);
    const updateGeneralFile = await prisma.generalFiles.update({
      where: { id },
      data: { description },
    });
    return updateGeneralFile;
  }
  static async deleteGeneralFile(id: GeneralFiles['id']) {
    if (!id) throw new AppError('Oops!,id invalido', 400);
    const deleteGeneralFile = await prisma.generalFiles.delete({
      where: { id },
    });
    return deleteGeneralFile;
  }

  static async getSubTask(id: SubTasks['id']) {
    if (!id) throw new AppError('Opps!, id invalido', 400);
    const subTask = await prisma.subTasks.findFirst({
      where: { id },
      select: { name: true, item: true },
    });
    if (!subTask) throw new AppError(`no se pudo encontrar la subtarea`, 404);
    return subTask;
  }

  static async delete(id: Files['id']) {
    if (!id) throw new AppError('Opps!, id invalido', 400);
    const getFile = await prisma.files.findUnique({ where: { id } });
    if (!getFile) throw new AppError('No se pudo encontrar el archivo', 404);
    if (getFile.type === 'UPLOADS')
      throw new AppError(
        'No se puede eliminar archivo, porque se marco como hecho',
        400
      );
    const deleteFile = await prisma.files.delete({ where: { id } });
    const dir = path.join(deleteFile.dir + deleteFile.name);
    if (existsSync(dir)) fs.unlinkSync(dir);
    return deleteFile;
  }

  static async parsePath(
    id: number,
    type: 'PROYECT' | 'AREA' | 'INDEXTASK' | 'TASK'
  ) {
    return { id, type };
    // if (type === 'PROYECT') {
    //   await prisma.projects.update({
    //     where: { id },
    //     data: {
    //       dir: ``,
    //       areas: {
    //         updateMany: {
    //           where: { projectId: id },
    //           data: {
    //           },
    //         },
    //       },
    //     },
    //   });
    // }
  }
}

export default FilesServices;

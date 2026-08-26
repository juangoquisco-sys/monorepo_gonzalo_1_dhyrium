import { ProjectDir } from '@/types/types';
import AppError from '@/utils/appError';
import type { BasicFiles, Files } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import path from 'path';

export const indexPath = './index';
export const _contractPath = `${indexPath}/contracts`;

class StageInfo {
  static async findProject(id: number) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const project = await prisma.projects.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!project)
      throw new AppError('Oops!,No pudimos encontrar el directorio', 404);
    return project;
  }
  static async findStage(id: number) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const stage = await prisma.stages.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        project: { select: { id: true, name: true } },
      },
    });
    if (!stage)
      throw new AppError('Oops!,No pudimos encontrar el directorio', 404);
    return stage;
  }
  static async getValues(id: number) {
    const findLevel = await prisma.levels.findUnique({ where: { id } });
    if (!findLevel) throw new AppError('Oops!,ID no encontrado', 400);
    const { rootId, item, name } = findLevel;
    if (!rootId) return item + name;
    const nextLevel: string = await this.getValues(rootId);
    return nextLevel + '/' + item + name;
  }
  static async findSubtask(id: number) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const findSubTask = await prisma.subTasks.findUnique({
      where: { id },
      include: { Levels: { select: { stages: true } } },
    });
    if (!findSubTask) throw new AppError('Oops!,No hay el directorio', 404);
    return findSubTask;
  }
}

class PathServices {
  static readonly basicPath = './uploads/basics';
  static readonly projectPath = './uploads/presupuestos';

  static async project(id: number, type: ProjectDir) {
    // const { id: _id } = await StageInfo.findProject(id);
    return path.join(this.projectPath, type, `${id}`);
  }
  static async stage(id: number, type: ProjectDir) {
    const { id: _id, project } = await StageInfo.findStage(id);
    if (!project) throw new AppError('Oops!,ID no encontrado', 400);
    const pathProject = await PathServices.project(project.id, type);
    return path.join(pathProject, `${_id}`);
  }

  /**
  @deprecated
  */
  static async level(id: number) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const findLevel = await prisma.levels.findUnique({ where: { id } });
    if (!findLevel) throw new AppError('Oops!,No hay el directorio', 404);
    const { stagesId } = findLevel;
    const projectPath = await PathServices.stage(stagesId, 'UPLOADS');
    const path = await StageInfo.getValues(id);
    return projectPath + '/' + path;
  }

  static async subTask(id: number, type: Files['type']) {
    const task = await prisma.subTasks.findUnique({
      where: { id },
      select: {
        Levels: {
          select: { stagesId: true, stages: { select: { projectId: true } } },
        },
      },
    });
    if (!task) throw new AppError('Opps,tarea invalida', 404);
    const { stagesId, stages } = task.Levels;
    const rootPath = path.join(this.projectPath, type);
    const relativePath = path.join(
      rootPath,
      stages.projectId.toString(),
      stagesId.toString()
    );
    return relativePath;
  }

  static async basicTask(id: number, type: BasicFiles['type']) {
    const task = await prisma.basicTasks.findUnique({
      where: { id },
      select: {
        Levels: {
          select: { stagesId: true, stages: { select: { projectId: true } } },
        },
      },
    });
    if (!task) throw new AppError('Opps,tarea invalida', 404);
    const { stagesId, stages } = task.Levels;
    const rootPath = this.basicPath + '/' + type;
    const relativePath = path.join(
      rootPath,
      stages.projectId.toString(),
      stagesId.toString()
    );
    return relativePath;
  }
}
export default PathServices;

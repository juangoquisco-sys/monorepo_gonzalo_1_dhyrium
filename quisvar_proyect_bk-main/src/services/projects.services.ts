import type { Projects } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import { UpdateProjectPick, projectPick } from '@/utils/format.server';
import PathServices from '@/services/paths.services';
import Queries from '@/utils/queries';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { ProjectDir } from '@/types/types';
import path from 'path';
import { ProjectParams } from '@/types/project';
import Utilities from '@/utils/utilities';

class ProjectsServices {
  static async getAll({ limit, offset, page, search: _search }: ProjectParams) {
    const skip = Utilities.getPage({ offset, page, limit });
    const search = _search ? _search?.toString() : undefined;
    const getListProjects = await prisma.projects.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { contract: { cui: { contains: search, mode: 'insensitive' } } },
        ],
      },
      include: {
        stages: { select: { id: true, name: true } },
        contract: { select: { cui: true } },
      },
      orderBy: { id: 'asc' },
      take: limit,
      skip,
    });
    return getListProjects;
  }

  static async find(id: Projects['id'], userId: number) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const findProject = await prisma.projects.findUnique({
      where: { id },
      include: {
        moderator: Queries.selectProfileUser,
        stages: {
          select: {
            id: true,
            name: true,
            _count: { select: { levels: true } },
            group: {
              select: {
                id: true,
                name: true,

                // moderator: Queries.selectProfileUserForStage,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!findProject)
      throw new AppError('No se pudo encontrar los proyectos registrados', 404);
    // const hasAccessInStage = findProject.stages.some(
    //   stage => stage.group?.moderator?.id === userId
    // );
    return { ...findProject, hasAccessInStage: false, useSessionId: userId }; // arregla castillo
  }

  static async create({ name, typeSpecialityId, contractId }: projectPick) {
    const newProject = await prisma.projects.create({
      data: {
        name,
        typeSpecialityId,
        contractId,
      },
    });
    return newProject;
  }

  static async update(
    id: Projects['id'],
    { contractId, ...data }: UpdateProjectPick
  ) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const updateProject = await prisma.projects.update({
      where: { id },
      data: { ...data, contractId },
    });
    await prisma.contratc.update({
      where: {
        id: updateProject.contractId,
      },
      data: {
        projectShortName: data.name,
      },
    });
    return updateProject;
  }

  static async delete(id: Projects['id']) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const path = await PathServices.project(id, 'UPLOADS');
    if (!existsSync(path))
      throw new AppError('No se pudo eliminar el projecto', 400);
    const deleteProject = await prisma.projects.delete({ where: { id } });
    return { ...deleteProject, path };
  }

  public static createFolders(list: ProjectDir[], projectId: number) {
    const presupuestos = PathServices.projectPath;
    const basicos = PathServices.basicPath;
    list.forEach(element => {
      const presupuestosPath = path.join(presupuestos, element, `${projectId}`);
      const basicosPath = path.join(basicos, element, `${projectId}`);
      if (!existsSync(presupuestosPath))
        mkdirSync(presupuestosPath, { recursive: true });
      if (!existsSync(basicosPath)) mkdirSync(basicosPath, { recursive: true });
    });
  }

  public static deleteFolders(list: ProjectDir[], projectId: number) {
    const presupuestos = PathServices.projectPath;
    const basicos = PathServices.basicPath;
    list.forEach(element => {
      const presupuestosPath = path.join(presupuestos, element, `${projectId}`);
      const basicosPath = path.join(basicos, element, `${projectId}`);
      if (existsSync(presupuestosPath))
        rmSync(presupuestosPath, { recursive: true });
      if (existsSync(basicosPath)) rmSync(basicosPath, { recursive: true });
    });
  }
}
export default ProjectsServices;

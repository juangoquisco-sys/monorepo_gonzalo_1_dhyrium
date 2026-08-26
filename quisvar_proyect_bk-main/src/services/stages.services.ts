import AppError from '@/utils/appError';
import {
  StageVersionSourceKind,
  StageVersionType,
  type Projects,
  type Stages,
  type SubTasks,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import {
  calculateAndUpdateDataByLevel,
  calculateDataByBasicLevel,
  dataWithLevel,
  round2Decimal,
} from '@/utils/tools';
import LevelsServices from '@/services/levels.services';
import { existsSync } from 'fs';
import Queries from '@/utils/queries';
import PathServices from '@/services/paths.services';
import {
  Level,
  LevelBasic,
  ListCostType,
  StageUpdate,
  TypeCost,
} from '@/types/types';
import BasicLevelServices from '@/services/basiclevels.services';
import { StageForm, StagePricingOption, StagesParams } from '@/types/stages';
import Utilities from '@/utils/utilities';
class StageServices {
  public static estadia = 1000;

  private static stageVersionType(name: string): StageVersionType {
    const normalized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (normalized.includes('basico')) return StageVersionType.BASICOS;
    if (normalized.includes('especial')) return StageVersionType.ESPECIALIDADES;
    if (normalized.includes('costo') || normalized.includes('presupuesto'))
      return StageVersionType.COSTOS;
    return StageVersionType.OTRO;
  }

  private static stageVersionBaseName(name: string) {
    return name.replace(/\s+v\d+$/i, '').trim() || name;
  }

  private static calculatePrice(
    { cost = 0, ...data }: ListCostType,
    typeCost?: keyof typeof data
  ) {
    Object.keys(data).forEach(key => {
      data[key as keyof typeof data] = round2Decimal(
        data[key as keyof typeof data] + this.estadia
      );
    });
    if (typeCost && Object.keys(data).includes(typeCost)) {
      return { cost: data[typeCost], ...data };
    }
    return { cost, ...data };
  }

  public static calculatePricing(data: StagePricingOption) {
    type Key = keyof typeof data;
    Object.keys(data).forEach(key => {
      data[key as Key] = round2Decimal(data[key as Key], 4);
    });
    const sum = Object.values(data).reduce<number>((a, b) => a + b, 0);
    return sum;
  }

  public static async findMany({
    offset,
    page,
    limit,
    ...options
  }: StagesParams) {
    const skip = Utilities.getPage({ offset, page, limit });
    const findStages = await prisma.stages.findMany({
      where: {
        project: {
          id: options.projectId,
          OR: [{ contract: { cui: options.search } }, { name: options.search }],
        },
      },
      select: { id: true, name: true },
      skip,
      take: limit,
    });
    return findStages;
  }

  public static async addBudget(
    id: Stages['id'],
    { budget }: Pick<Stages, 'budget'>
  ) {
    if (!id) throw new AppError('Oops!, ID invalido', 400);
    const updateBudget = await prisma.stages.update({
      where: { id },
      data: { budget },
    });
    return updateBudget;
  }

  public static async findShort(id: Stages['id']) {
    if (!id) throw new AppError('Oops!, ID invalido', 400);
    const findStage = await prisma.stages.findUnique({ where: { id } });
    if (!findStage) throw new AppError('Oops!, ID invalido', 400);
    return findStage;
  }

  public static async findDetails(id: Stages['id']) {
    if (!id) throw new AppError('Oops!, ID invalido', 400);
    const findStage = await prisma.stages.findUnique({
      where: { id },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            groups: {
              where: { users: { status: true } },
              select: { users: Queries.selectProfileUserForStage, mod: true },
            },
          },
        },
        project: {
          select: {
            contract: Queries.selectContractStage,
          },
        },
        projectStageFocus: {
          where: { isCurrent: true, status: { not: 'INACTIVE' } },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          include: {
            unit: {
              select: { id: true, name: true, type: true, codemap: true },
            },
          },
        },
      },
    });
    if (!findStage)
      throw new AppError('Oops!, No se pudo encontrar la etapa', 400);
    const managerGroup = findStage.group?.groups.filter(u => u.mod);
    const group = {
      ...findStage.group,
      groups: findStage.group?.groups.filter(u => !u.mod),
    };
    return {
      ...findStage,
      managerGroup,
      group,
      assignmentUnit: findStage.projectStageFocus[0]?.unit ?? null,
    };
  }

  public static async find(
    id: Stages['id'],
    status?: SubTasks['status']
    // typeCost?: TypeCost
  ) {
    if (!id) throw new AppError('Oops!, ID invalido', 400);
    const findStage = await prisma.stages.findUnique({
      where: { id },
      include: {
        group: { select: { groups: { where: { mod: true }, take: 1 } } },
        project: { select: { name: true } },
      },
    });
    if (!findStage)
      throw new AppError('Oops!,No se pudo encontrar la etapa', 400);
    const {
      project,
      rootTypeItem,
      group,
      name,
      monthlyPrice,
      stayPrice,
      budget,
    } = findStage;
    const managerGroup = group?.groups;
    const projectName = project.name;
    const getList = await LevelsServices.getLevelList(id, 'stage', {
      includeUsers: true,
      includeLatestFeedbackFiles: true,
      status,
    });
    //------------------------- Value cost per degree ----------------------
    // const valueCost = this.calculatePricing({ monthlyPrice, stayPrice });
    const valueCost = {
      monthlyPrice: monthlyPrice / 30,
      stayPrice: stayPrice / 30,
    };
    const list = LevelsServices.findList(getList.data, 0, 0, '', valueCost);
    const parseData = {
      nextLevel: list,
      ...dataWithLevel,
    } as Level;
    const nextLevel = calculateAndUpdateDataByLevel([parseData]);
    const aux = { id, name, projectName, rootTypeItem, managerGroup };
    return {
      ...nextLevel[0],
      ...aux,
      valueCost,
      monthlyPrice,
      stayPrice,
      budget,
    };
  }

  public static async createLastVisited(stageId: number, userId: number) {
    await prisma.lastVisitedStage.upsert({
      where: {
        userId_stageId: {
          userId: userId,
          stageId: stageId,
        },
      },
      update: {
        visitedAt: new Date(),
      },
      create: {
        userId: userId,
        stageId: stageId,
      },
    });
  }

  public static async showLastVisited(userId: number) {
    const visits = await prisma.lastVisitedStage.findMany({
      where: { userId },
      orderBy: { visitedAt: 'desc' },
      take: 5,
      select: {
        visitedAt: true,

        stage: {
          select: {
            name: true,
            id: true,
            project: {
              select: {
                name: true,
                id: true,
                contract: { select: { cui: true } },
              },
            },
          },
        },
      },
    });

    return visits.map(({ visitedAt, stage }) => ({
      visitedAt,
      stageName: stage.name,
      stageId: stage.id,
      projectName: stage.project.name,
      projectId: stage.project.id,
      cui: stage.project.contract.cui,
    }));
  }

  public static async findBasics(
    id: Stages['id'],
    status?: SubTasks['status'],
    typeCost?: TypeCost
  ) {
    if (!id) throw new AppError('Oops!, ID invalido', 400);
    const findStage = await prisma.stages.findUnique({
      where: { id },
      include: {
        group: { select: { groups: { where: { mod: true }, take: 1 } } },
        project: { select: { name: true } },
      },
    });
    if (!findStage)
      throw new AppError('Oops!,No se pudo encontrar la etapa', 400);
    const { name, project, rootTypeItem, group } = findStage;
    const managerGroup = group?.groups[0];
    const projectName = project.name;
    const getList = await BasicLevelServices.getList(id, 'stage', {
      includeUsers: true,
      status,
    });
    //------------------------- Value cost per degree ----------------------
    const {
      bachelorCost: bachelor,
      professionalCost: professional,
      graduateCost: graduate,
      internCost: intern,
    } = findStage;
    const valueCost = this.calculatePrice(
      { bachelor, graduate, intern, professional },
      typeCost
    );
    const list = BasicLevelServices.findList(getList.data, 0, 0, '', valueCost);
    const parseData = {
      nextLevel: list,
      ...dataWithLevel,
    } as LevelBasic;
    const nextLevel = calculateDataByBasicLevel([parseData]);
    const aux = { id, name, projectName, managerGroup, rootTypeItem };
    return { ...nextLevel[0], ...aux };
  }

  static async findReport(id: Projects['id']) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const findStage = await prisma.stages.findUnique({
      where: { id },
      select: {
        group: {
          select: {
            id: true,
          },
        },
        project: {
          select: {
            contract: {
              select: {
                cui: true,
                projectName: true,
                district: true,
                department: true,
                province: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });
    if (!findStage)
      throw new AppError('No se pudo encontrar el informe .', 404);
    const mod = await prisma.groupOnUsers.findFirst({
      where: { groupId: findStage.group?.id, mod: true },
      select: {
        users: Queries.selectProfileUserForStage,
      },
    });
    const { project } = findStage;
    const { createdAt, cui, department, district, projectName, province } =
      project.contract;
    let moderatorName = 'Aun no asignado';
    if (mod && mod.users && mod.users.profile) {
      const { firstName, lastName } = mod.users.profile;
      moderatorName = `${firstName} ${lastName}`;
    }
    return {
      initialDate: createdAt,
      cui,
      department,
      district,
      projectName,
      province,
      moderatorName,
      finishDate: '-',
    };
  }

  static async duplicate(id: number, name: string, type: 'ID' | 'ROOT') {
    let projectId: number = id;
    if (name.includes('projects')) throw new AppError('Nombre reservado', 409);
    if (type === 'ID') {
      const stage = await prisma.stages.findUnique({ where: { id } });
      if (!stage) throw new AppError('Etapa no Encontrada', 404);
      projectId = stage.projectId;
    }
    const getStages = await prisma.stages.groupBy({
      by: ['name'],
      where: { projectId },
    });
    const list = getStages.map(({ name }) => name);
    return list.includes(name);
  }

  static async create({ name, projectId }: StageForm) {
    const duplicated = await this.duplicate(projectId, name, 'ROOT');
    if (duplicated) throw new AppError('Ops!,Nombre repetido', 409);
    const path = await PathServices.project(projectId, 'UPLOADS');
    if (!existsSync(path)) throw new AppError('Ops!,carpeta no existe', 404);
    const createStage = await prisma.$transaction(async tx => {
      const stage = await tx.stages.create({
        data: { name, projectId },
        select: { id: true },
      });
      const group = await tx.stageVersionGroup.create({
        data: {
          projectId,
          baseName: this.stageVersionBaseName(name),
          stageType: this.stageVersionType(name),
        },
        select: { id: true },
      });
      await tx.stageVersion.create({
        data: {
          groupId: group.id,
          stageId: stage.id,
          versionNumber: 1,
          versionLabel: 'v1',
          sourceKind: StageVersionSourceKind.EMPTY,
          status: 'ACTIVE',
          isCurrent: true,
        },
      });
      return tx.stages.findUniqueOrThrow({
        where: { id: stage.id },
        include: { project: { select: { name: true, id: true } } },
      });
    });
    return createStage;
  }

  static async update(id: Stages['id'], { name }: Stages) {
    if (!id) throw new AppError('Oops!, ID invalido', 400);
    const duplicated = await this.duplicate(id, name, 'ID');
    if (duplicated) throw new AppError('Ops!,Nombre repetido', 409);
    const path = await PathServices.stage(id, 'UPLOADS');
    if (!existsSync(path)) throw new AppError('Ops!,carpeta no existe', 404);
    const updateStage = await prisma.stages.update({
      where: { id },
      data: { name },
      include: { project: { select: { name: true } } },
    });
    return updateStage;
  }

  static async updateDetails(
    id: Stages['id'],
    { groupId, unitId, ...data }: StageUpdate
  ) {
    if (!id) throw new AppError('Oops!, ID invalido', 400);
    const stage = await prisma.stages.findUnique({
      where: { id },
      select: { groupId: true, projectId: true },
    });
    if (!stage) throw new AppError('Etapa no encontrada', 404);
    if (groupId && groupId !== stage.groupId) {
      const quantityUsers = await prisma.taskOnUsers.count({
        where: { subtask: { Levels: { stages: { id } } } },
      });
      if (quantityUsers > 0)
        throw new AppError('El grupo, tiene tareas asignadas', 400);
    }
    if (unitId) {
      const unit = await prisma.organizationalUnit.findFirst({
        where: { id: unitId, isActive: true },
        select: { id: true },
      });
      if (!unit) throw new AppError('Unidad organizativa no encontrada', 404);
    }

    const now = new Date();
    const updateStage = await prisma.$transaction(async tx => {
      const updated = await tx.stages.update({
        where: { id },
        data: {
          ...data,
          ...(groupId !== undefined ? { groupId } : {}),
        },
        include: { project: { select: { name: true } } },
      });

      if (!unitId) return updated;

      const projectFocus = await tx.orgUnitProjectFocus.upsert({
        where: {
          unitId_projectId: { unitId, projectId: stage.projectId },
        },
        create: {
          unitId,
          projectId: stage.projectId,
          status: 'ACTIVE',
          isCurrent: true,
          startDate: now,
        },
        update: { status: 'ACTIVE', isCurrent: true, endDate: null },
      });
      await tx.orgUnitProjectStageFocus.updateMany({
        where: {
          stageId: id,
          unitId: { not: unitId },
          isCurrent: true,
          status: { not: 'INACTIVE' },
        },
        data: { status: 'INACTIVE', isCurrent: false, endDate: now },
      });
      await tx.orgUnitProjectStageFocus.upsert({
        where: { unitId_stageId: { unitId, stageId: id } },
        create: {
          unitId,
          projectId: stage.projectId,
          stageId: id,
          projectFocusId: projectFocus.id,
          status: 'ACTIVE',
          isCurrent: true,
          startDate: now,
        },
        update: {
          projectId: stage.projectId,
          projectFocusId: projectFocus.id,
          status: 'ACTIVE',
          isCurrent: true,
          endDate: null,
        },
      });
      return updated;
    });
    return updateStage;
  }

  static async delete(id: Stages['id']) {
    if (!id) throw new AppError('Oops!, ID invalido', 400);
    const path = await PathServices.stage(id, 'UPLOADS');
    if (!existsSync(path)) throw new AppError('Ops!,carpeta no existe', 404);
    const getTasks = await prisma.stages.count({
      where: {
        id,
        levels: { some: { subTasks: { some: { users: {} } } } },
      },
    });
    if (getTasks)
      throw new AppError(
        'No se puede eliminar, tiene tareas pendientes 😢 ',
        400
      );
    const deleteStage = await prisma.stages.delete({
      where: { id },
      include: { project: { select: { name: true, id: true } } },
    });
    return deleteStage;
  }
}

export default StageServices;

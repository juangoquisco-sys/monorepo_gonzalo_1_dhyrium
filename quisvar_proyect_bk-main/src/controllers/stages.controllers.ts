import { Response, Request } from 'express';
import PathServices from '@/services/paths.services';
import StageServices from '@/services/stages.services';
import { mkdirSync, rmSync } from 'fs';
import { SubTasks } from '@prisma/client';
import { ProjectDir, TypeCost } from '@/types/types';
import { parseQueries } from '@/utils/format.server';
import { StagesParams } from '@/types/stages';
import path from 'path';
import { ControllerFunction } from '@/types/patterns';
import { UserType } from '@/middlewares/auth.middleware';

interface IQuery {
  status: SubTasks['status'];
  typecost: TypeCost;
}
const createfiles = (paths: ProjectDir[], _path: string) => {
  const rootDir = PathServices.projectPath;
  paths.forEach(dir => mkdirSync(path.join(rootDir, dir, _path)));
};

// const uploadFiles = (list: string[], oldPath: string, newPath: string) => {
//   list.forEach(path => renameDir(`${path}/${oldPath}`, `${path}/${newPath}`));
// };

const deleteFiles = (list: ProjectDir[], _path: string) => {
  const rootDir = PathServices.projectPath;
  list.forEach(dir =>
    rmSync(path.join(rootDir, dir, _path), { recursive: true })
  );
};

class StagesControllers {
  public static async showAll(req: Request, res: Response) {
    const params = parseQueries<StagesParams>(req.query);
    const query = await StageServices.findMany(params);
    return res.status(200).json(query);
  }

  public static async details(req: Request, res: Response) {
    const { id } = req.params;
    const _stage_id = parseInt(id);
    const query = await StageServices.findDetails(_stage_id);
    return res.status(200).json(query);
  }

  public static async show(req: Request, res: Response) {
    const { id } = req.params;
    const userInfo: UserType = res.locals.userInfo;
    const { status, typecost: _ } = parseQueries<IQuery>(req.query);
    const query = await StageServices.find(+id, status);
    return res.status(200).json(query);
  }

  public static async showBasics(req: Request, res: Response) {
    const { id: stageId } = req.params;
    const { status, typecost } = parseQueries<IQuery>(req.query);
    const query = await StageServices.findBasics(+stageId, status, typecost);
    return res.status(200).json(query);
  }
  public static async showLastVisited(_req: Request, res: Response) {
    const userInfo: UserType = res.locals.userInfo;
    const query = await StageServices.showLastVisited(userInfo.id);
    return res.status(200).json(query);
  }

  public static async createLastLastVisited(req: Request, res: Response) {
    const userInfo: UserType = res.locals.userInfo;
    const { id } = req.params;
    await StageServices.createLastVisited(+id, userInfo.id);
    res.status(200).json({ message: 'Visita registrada correctamente' });
  }

  public static async showReport(req: Request, res: Response) {
    const { id } = req.params;
    const query = await StageServices.findReport(+id);
    res.status(200).json(query);
  }

  public static async showBasicReport(req: Request, res: Response) {
    const { id } = req.params;
    const query = await StageServices.findReport(+id);
    res.status(200).json(query);
  }

  public static async create(req: Request, res: Response) {
    const { body } = req;
    const { project, ...query } = await StageServices.create(body);
    const { id } = project;
    const path = id + '/' + query.id;
    if (query) createfiles(['MODEL', 'REVIEW', 'UPLOADS'], path);
    return res.status(201).json(query);
  }

  public static addBudget: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { body } = req;
    const query = await StageServices.addBudget(+id, body);
    res.status(201).json(query);
  };

  public static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { body } = req;
    const _stage_id = parseInt(id);
    // const oldStage = await StageServices.findShort(_stage_id);
    const query = await StageServices.update(_stage_id, body);
    // const oldStagePath = project.name + '/' + oldStage.name;
    // const newStagePath = project.name + '/' + query.name;
    // uploadFiles([model, dir, review, editables], oldStagePath, newStagePath);
    return res.status(200).json(query);
  }

  public static async updateDetails(req: Request, res: Response) {
    const { id } = req.params;
    const { body } = req;
    const _stage_id = parseInt(id);
    const query = await StageServices.updateDetails(_stage_id, body);
    return res.status(200).json(query);
  }

  public static async delete(req: Request, res: Response) {
    const { id } = req.params;
    const _stage_id = parseInt(id);
    const { project, ...query } = await StageServices.delete(_stage_id);
    const path = project.id + '/' + query.id;
    if (query) deleteFiles(['MODEL', 'REVIEW', 'UPLOADS'], path);
    res.status(200).json(query);
  }
}

export default StagesControllers;

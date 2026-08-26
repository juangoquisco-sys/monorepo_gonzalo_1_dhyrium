import type { Request, Response } from 'express';
import DuplicatesServices from '@/services/duplicates.services';
import { ControllerFunction } from '@/types/patterns';

export const duplicateProject = async (req: Request, res: Response) => {
  const { id } = req.params;
  const _project_id = parseInt(id);
  const { name, contractId } = req.body;
  const duplicate = await DuplicatesServices.project(
    _project_id,
    name,
    contractId
  );
  res.status(201).json(duplicate);
};

export const addNewStage = async (req: Request, res: Response) => {
  res.status(201).json({ status: true });
};

export const duplicateStages = async (req: Request, res: Response) => {
  const { id } = req.params;
  const _stage_id = parseInt(id);
  const duplicate = await DuplicatesServices.stage(_stage_id, req.body);
  res.status(201).json(duplicate);
};

export const duplicateLevels = async (req: Request, res: Response) => {
  const { id } = req.params;
  const _level_id = parseInt(id);
  const { name } = req.body;
  const duplicate = await DuplicatesServices.level(_level_id, name);
  res.status(201).json(duplicate);
};

class DuplicateControllers {
  public basicLevels: ControllerFunction = async (req, res, next) => {
    try {
      const { id: levels_Id } = req.params;
      const { name } = req.body;
      const result = await DuplicatesServices.basicLevel(+levels_Id, name);
      res.status(201).json(result);
    } catch (error) {
      console.log(error);
      next(error);
    }
  };
}

export default DuplicateControllers;

export const duplicateSubtask = async (req: Request, res: Response) => {
  const { id } = req.params;
  const _level_id = parseInt(id);
  const { name } = req.body;
  const duplicate = await DuplicatesServices.subTask(_level_id, name);
  res.status(201).json(duplicate);
};

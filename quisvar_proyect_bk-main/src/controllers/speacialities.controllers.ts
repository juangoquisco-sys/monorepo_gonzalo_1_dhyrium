import { Request, Response } from 'express';
import SpecialitiesServices from '@/services/specialities.services';

export const showSpecialities = async (req: Request, res: Response) => {
  const query = await SpecialitiesServices.getAll();
  res.status(200).json(query);
};

export const showSpeciality = async (req: Request, res: Response) => {
  const { id } = req.params;
  const project_id = parseInt(id);
  const query = await SpecialitiesServices.find(project_id);
  res.status(200).json(query);
};

export const createSpeciality = async (req: Request, res: Response) => {
  const { body } = req;
  const createNewProject = await SpecialitiesServices.create(body);
  res.status(201).json(createNewProject);
};

export const updateSpeciality = async (req: Request, res: Response) => {
  const { body } = req;
  const { id } = req.params;
  const _project_id = parseInt(id);
  const query = await SpecialitiesServices.update(_project_id, body);
  res.status(200).json(query);
};

export const deleteSpeciality = async (req: Request, res: Response) => {
  const { id } = req.params;
  const project_id = parseInt(id);
  await SpecialitiesServices.delete(project_id);
  res.status(204).send();
};

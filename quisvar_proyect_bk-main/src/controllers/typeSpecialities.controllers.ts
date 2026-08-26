import { Request, Response } from 'express';
import TypeSpecialitiesServices from '@/services/typeSpecialities.services';

export const showTypeSpecialities = async (req: Request, res: Response) => {
  const query = await TypeSpecialitiesServices.getAll();
  res.status(200).json(query);
};

export const showTypeSpeciality = async (req: Request, res: Response) => {
  const { id } = req.params;
  const type_speciality_id = parseInt(id);
  const query = await TypeSpecialitiesServices.find(type_speciality_id);
  res.status(200).json(query);
};

export const createTypeSpeciality = async (req: Request, res: Response) => {
  const { body } = req;
  const query = await TypeSpecialitiesServices.create(body);
  res.status(201).json(query);
};

export const updateTypeSpeciality = async (req: Request, res: Response) => {
  const { body } = req;
  const { id } = req.params;
  const type_speciality_id = parseInt(id);
  const query = await TypeSpecialitiesServices.update(type_speciality_id, body);
  res.status(200).json(query);
};

export const deleteTypeSpeciality = async (req: Request, res: Response) => {
  const { id } = req.params;
  const type_speciality_id = parseInt(id);
  await TypeSpecialitiesServices.delete(type_speciality_id);
  res.status(204).send();
};

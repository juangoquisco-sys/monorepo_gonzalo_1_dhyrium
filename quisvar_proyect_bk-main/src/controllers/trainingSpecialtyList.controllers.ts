import { Request, Response } from 'express';
import TrainingSpecialtyListServices from '@/services/trainingSpecialtyList.services';
export const createTrainingSpecialtyList = async (
  req: Request,
  res: Response
) => {
  const { body } = req;
  const query = await TrainingSpecialtyListServices.createTrainingSpecialtyList(
    body
  );
  res.status(201).json(query);
};
export const getTrainingSpecialtyList = async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = await TrainingSpecialtyListServices.getTrainingSpecialtyList(
    +id
  );
  res.status(200).json(query);
};
export const updateTrainingSpecialtyList = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;
  const { trainingName } = req.body;
  const query = await TrainingSpecialtyListServices.updateTrainingSpecialtyList(
    +id,
    trainingName
  );
  res.status(200).json(query);
};
export const deleteTrainingSpecialtyList = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;
  const query = await TrainingSpecialtyListServices.deleteTrainingSpecialtyList(
    +id
  );
  res.status(200).json(query);
};

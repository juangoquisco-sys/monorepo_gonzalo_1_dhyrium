import { Request, Response } from 'express';
import EquipmentServices from '@/services/equipment.services';
import AppError from '@/utils/appError';
type FilesProps = { [fieldname: string]: Express.Multer.File[] };
export const createEquipment = async (req: Request, res: Response) => {
  if (!req.files)
    throw new AppError('Oops!, no se pudo subir los archivos', 400);
  const { file } = req.files as FilesProps;
  const { body } = req;
  const query = await EquipmentServices.createEquipment({
    ...body,
    userId: +body.userId,
    workStationId: +body.workStationId,
    doc: file[0].filename,
  });
  res.status(201).json(query);
};
export const getEquipment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = await EquipmentServices.getEquipment(+id);
  res.status(200).json(query);
};
export const updateEquipment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body;
  const query = await EquipmentServices.updateEquipment(+id, body);
  res.status(200).json(query);
};
export const deleteEquipment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = await EquipmentServices.deleteEquipment(+id);
  res.status(200).json(query);
};

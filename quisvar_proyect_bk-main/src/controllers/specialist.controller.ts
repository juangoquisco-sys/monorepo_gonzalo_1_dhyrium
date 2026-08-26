import { NextFunction, Request, Response } from 'express';
import SpecialistServices from '@/services/specialist.services';
import AppError from '@/utils/appError';
import { FilesProps } from '@/types/types';

export const createSpecialist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.files)
      throw new AppError('Oops!, no se pudo subir los archivos', 400);
    const { agreementFile, fileCv } = req.files as FilesProps;
    const { body } = req;
    const query = await SpecialistServices.createSpecialist({
      ...body,
      inscriptionDate: new Date(body.inscriptionDate),
      cvFile: fileCv ? fileCv[0].filename : null,
      agreementFile: agreementFile ? agreementFile[0].filename : null,
    });
    res.status(201).json(query);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
export const getSpecialist = async (req: Request, res: Response) => {
  const query = await SpecialistServices.getSpecialist();
  res.status(200).json(query);
};
export const updateSpecialist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { body } = req;
    const { id } = req.params;
    const query = await SpecialistServices.updateSpecialist(body, +id);
    res.status(200).json(query);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
export const getSpecialistByDNI = async (req: Request, res: Response) => {
  const { dni } = req.params;
  const query = await SpecialistServices.getSpecialistByDNI(dni);
  res.status(200).json(query);
};
export const getSpecialistById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = await SpecialistServices.getSpecialistById(+id);
  res.status(200).json(query);
};
export const getSpecialistHistory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = await SpecialistServices.getSpecialistHistory(+id);
  res.status(200).json(query);
};
export const deleteSpecialist = async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = await SpecialistServices.deleteSpecialist(+id);
  res.status(200).json(query);
};

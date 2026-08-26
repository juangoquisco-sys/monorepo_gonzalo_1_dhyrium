import { Request, Response } from 'express';
import AppError from '@/utils/appError';
import MetradosServices from '@/services/metrados.services';

const getActorId = (res: Response) => Number(res.locals.userInfo?.id);

export const listMetrados = async (req: Request, res: Response) => {
  const query = await MetradosServices.list();
  res.status(200).json(query);
};

export const getMetradoById = async (req: Request, res: Response) => {
  const query = await MetradosServices.getById(req.params.id);
  res.status(200).json(query);
};

export const createMetradoDraft = async (req: Request, res: Response) => {
  const query = await MetradosServices.createDraft(req.body, getActorId(res));
  res.status(201).json(query);
};

export const importMetradoExcel = async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('Archivo Excel inexistente', 400);

  const { buffer, originalname, size, mimetype } =
    req.file as Express.Multer.File;

  const query = await MetradosServices.importExcel(
    {
      buffer,
      filename: originalname,
      size,
      mimeType: mimetype,
    },
    getActorId(res)
  );

  res.status(201).json(query);
};

export const deleteMetradoProject = async (req: Request, res: Response) => {
  const query = await MetradosServices.deleteProject(
    req.params.id,
    getActorId(res)
  );
  res.status(200).json(query);
};

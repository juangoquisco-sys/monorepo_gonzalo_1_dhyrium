import { Request, Response } from 'express';
import FilesServices from '@/services/files.services';
import PathServices from '@/services/paths.services';
import SubTasksServices from '@/services/subtasks.services';
import UsersServices from '@/services/users.services';
import { BasicFiles, Files } from '@prisma/client';
import { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import { unlinkSync } from 'fs';
import { TypeFileUser } from '@/types/types';
import { convertToUtf8 } from '@/utils/tools';
import { ControllerFunction } from '@/types/patterns';
export const uploadFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  // const userInfo: UserType = res.locals.userInfo;
  const status = req.query.status as Files['type'];
  const _subtask_id = parseInt(id);
  if (!req.file) return;
  const { filename } = req.file;
  await FilesServices.create(_subtask_id, filename, status);
  const query = await SubTasksServices.find(_subtask_id);
  res.status(201).json(query);
};
export const uploadUserFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const typeFileUser = req.query.typeFile as TypeFileUser;
  if (!req.file) throw new AppError('Oops!, no se pudo subir el contrato', 400);

  const body =
    typeFileUser === 'contract'
      ? {
          contract: {
            push: req.file.filename,
          },
        }
      : {
          [typeFileUser]: req.file.filename,
        };

  const query = await UsersServices.updateStatusFile(+id, body);
  res.status(201).json(query);
};
export const showFilesGeneral = async (req: Request, res: Response) => {
  const query = await FilesServices.getAllGeneralFile();
  res.status(200).json(query);
};
export const uploadFilesGeneral = async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('Oops!, no se pudo subir el contrato', 400);
  const body = {
    id: 0,
    dir: `general/${req.file.filename}`,
    name: convertToUtf8(req.file.originalname.toUpperCase()),
    description: null,
    createdAt: new Date(),
  };
  const query = await FilesServices.createGeneralFile(body);
  res.status(201).json(query);
};
export const updateGeneralDescription = async (req: Request, res: Response) => {
  const { description } = req.body;
  const { id } = req.params;
  await FilesServices.updateGeneralDescription(description, +id);
  res.status(200).json('Descripción actualizada correctamente');
};
export const deleteUserFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { filename } = req.params;
  const typeFileUser = req.query.typeFile as TypeFileUser;

  let body;
  if (typeFileUser === 'contract') {
    const user = await UsersServices.find(+id);
    const currentContracts = Array.isArray(user.contract)
      ? (user.contract as string[])
      : [];
    const newContracts = currentContracts.filter(c => c !== filename);
    body = {
      contract: {
        set: newContracts,
      },
    };
  } else {
    body = { [typeFileUser]: null };
  }

  unlinkSync(`public/${typeFileUser}/${filename}`);
  const query = await UsersServices.updateStatusFile(+id, body);
  res.status(200).json(query);
};

export const uploadFiles = async (req: Request, res: Response) => {
  const { id } = req.params;
  const subTasksId = parseInt(id);
  const userInfo: UserType = res.locals.userInfo;
  const type = req.query.status as Files['type'];
  const newFiles = req.files as Express.Multer.File[];
  const dir = await PathServices.subTask(subTasksId, type);
  const data = newFiles.map(({ filename, originalname }) => ({
    dir,
    type,
    subTasksId,
    originalname,
    name: filename,
    userId: userInfo.id,
  }));
  if (!req.files) return;
  await FilesServices.createManyFiles(data, subTasksId);
  const query = await SubTasksServices.find(subTasksId);
  res.status(201).json(query);
};

export const uploadBasicFiles: ControllerFunction = async (req, res) => {
  const { id } = req.params;
  const subTasksId = +id;
  const type = req.query.status as BasicFiles['type'];
  const { profile }: UserType = res.locals.userInfo;
  const { firstName, lastName } = profile;
  if (!req.files) return;
  const newFiles = req.files as Express.Multer.File[];
  const dir = await PathServices.basicTask(subTasksId, type);
  const data = newFiles.map(({ filename: name, originalname }) => {
    const values = { dir, type, subTasksId, name, originalname };
    return { author: firstName + ' ' + lastName, ...values };
  });
  const query = await FilesServices.createManyBasicFiles(data, +subTasksId);
  res.status(201).json(query);
};

export const deleteFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const _file_id = parseInt(id);
  const fileDelete = await FilesServices.delete(_file_id);
  const query = await SubTasksServices.find(fileDelete.subTasksId);
  res.status(200).json(query);
};
export const deleteFilesGeneral = async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = await FilesServices.deleteGeneralFile(+id);
  unlinkSync(`public/${query.dir}`);
  res.status(200).json(query);
};

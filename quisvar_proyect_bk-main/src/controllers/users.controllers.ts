import { Request, Response } from 'express';
import UsersServices from '@/services/users.services';
import { userProfilePick } from '@/utils/format.server';
import { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import { FilesProps, ProfileByRoleType } from '@/types/types';
import { ControllerFunction } from '@/types/patterns';

export const showUsers = async (req: Request, res: Response) => {
  const query = await UsersServices.getAll();
  res.status(200).json(query);
};

export const showUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const _user_id = parseInt(id);
  const query = await UsersServices.find(_user_id);
  res.status(200).json(query);
};

export const showTaskByUser = async (req: Request, res: Response) => {
  const userInfo: UserType = res.locals.userInfo;
  const { id } = userInfo;
  const query = await UsersServices.findListTask(id);
  res.status(200).json(query);
};

export const showTaskByUsers = async (req: Request, res: Response) => {
  const userInfo: UserType = res.locals.userInfo;
  const { id } = userInfo;
  const query = await UsersServices.findListTask(id);
  res.status(200).json(query);
};

export const showAllByMenuPoints: ControllerFunction = async (req, res) => {
  const { id: userId }: UserType = res.locals.userInfo;
  const { menuId, subMenuId, typeRol, subTypeRol } = req.query as Omit<
    ProfileByRoleType,
    'includeSelf'
  >;
  const includeSelf = req.query.includeUser === 'true';
  const queries: ProfileByRoleType = {
    menuId: menuId ? +menuId : undefined,
    subMenuId: subMenuId ? +subMenuId : undefined,
    typeRol,
    subTypeRol,
    includeSelf,
  };
  const result = await UsersServices.getUserMenuPoints(userId, queries);
  res.status(200).json(result);
};

export const showSubTasksByUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { project } = req.query;
  const _id = parseInt(id);
  const _project = parseInt(project as string);
  const query = await UsersServices.findListSubTask(_id, _project);
  res.status(200).json(query);
};

export const createUser = async (req: Request, res: Response) => {
  if (!req.files)
    throw new AppError('Oops!, no se pudo subir los archivos', 400);
  const { fileUserCv, fileUserDeclaration } = req.files as FilesProps;
  const body: userProfilePick = req.body;
  const officeIds = JSON.parse(req.body.officeIds);
  const query = await UsersServices.create({
    ...body,
    officeIds,
    cv: fileUserCv[0].filename,
    declaration: fileUserDeclaration[0].filename,
  });
  res.status(201).json(query);
};

export const updateUser = async (req: Request, res: Response) => {
  const { body } = req;
  const { id } = req.params;
  const _id = parseInt(id);
  const query = await UsersServices.update(_id, body);
  res.status(200).json(query);
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const _id = parseInt(id);
  await UsersServices.delete(_id);
  res.status(204).send();
};

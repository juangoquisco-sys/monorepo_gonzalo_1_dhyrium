import { Request, Response } from 'express';
import GroupServices from '@/services/groups.services';
import { ControllerFunction } from '@/types/patterns';

// GROUPS
export const createGroup = async (req: Request, res: Response) => {
  const body = req.body;
  const query = await GroupServices.create(body);
  res.status(200).json(query);
};
export const editOrder = async (req: Request, res: Response) => {
  const { body } = req;
  const query = await GroupServices.editOrder(body);
  res.status(200).json(query);
};
// export const deleteMod = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { id } = req.params;
//     const query = await GroupServices.deleteMod(+id);
//     res.status(200).json(query);
//   } catch (error) {
//     next(error);
//   }
// };
export const getAll = async (req: Request, res: Response) => {
  const query = await GroupServices.getAll();
  res.status(200).json(query);
};
export const getGroupsSelect = async (req: Request, res: Response) => {
  const query = await GroupServices.getGroupsSelect();
  res.status(200).json(query);
};
export const getById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = await GroupServices.getById(+id);
  res.status(200).json(query);
};
export const getUserTask = async (req: Request, res: Response) => {
  const { id, contractId } = req.params;
  const query = await GroupServices.getUserTask(+id, +contractId);
  res.status(200).json(query);
};
export const updateGroup = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  const query = await GroupServices.update(+id, name);
  res.status(200).json(query);
};
export const deleteGroup = async (req: Request, res: Response) => {
  const { id } = req.params;
  const query = await GroupServices.delete(+id);
  res.status(200).json(query);
};
//GROUP RELATION
export const createRelation = async (req: Request, res: Response) => {
  const { userId, groupId } = req.params;
  const query = await GroupServices.createRelation(+userId, +groupId);
  res.status(200).json(query);
};
export const updateRelation = async (req: Request, res: Response) => {
  const { userId, groupId } = req.params;
  const body = req.body;
  const query = await GroupServices.updateRelation(+userId, +groupId, body);
  res.status(200).json(query);
};
export const deleteRelation = async (req: Request, res: Response) => {
  const { userId, groupId } = req.params;
  const query = await GroupServices.deleteRelation(+userId, +groupId);
  res.status(200).json(query);
};
export const findProjects = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const query = await GroupServices.findProjects(+groupId);
  res.status(200).json(query);
};

class GroupsControllers {
  public static getOwner: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await GroupServices.getOWner(+id);
    res.status(200).json(query);
  };
}

export default GroupsControllers;

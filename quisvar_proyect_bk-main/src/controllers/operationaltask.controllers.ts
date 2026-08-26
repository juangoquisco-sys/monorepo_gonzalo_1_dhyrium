import { ControllerFunction } from '@/types/patterns';
import OperationalTasksServices from '@/services/operationaltasks.services';
import AppError from '@/utils/appError';
import { OptFilterUserTask } from '@/types/operationaltask';
import { UserType } from '@/middlewares/auth.middleware';
import { parseQueries } from '@/utils/format.server';

class OperationalTasksControllers {
  public static getByUser: ControllerFunction = async (req, res) => {
    const { userId } = req.params;
    const params = parseQueries<OptFilterUserTask>(req.query);
    const result = await OperationalTasksServices.findByUserId(+userId, params);
    res.status(200).json(result);
  };

  public static getById: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const result = await OperationalTasksServices.findByTaskId(+id);
    res.status(200).json(result);
  };

  public static create: ControllerFunction = async (req, res) => {
    const result = await OperationalTasksServices.create(req.body);
    res.status(201).json(result);
  };

  public static showItems: ControllerFunction = async (req, res) => {
    const { taskId } = req.params;
    const result = await OperationalTasksServices.showItems(+taskId);
    res.status(200).json(result);
  };

  public static createItem: ControllerFunction = async (req, res) => {
    const result = await OperationalTasksServices.createItem(req.body);
    res.status(201).json(result);
  };

  public static createFile: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { profile }: UserType = res.locals.userInfo;
    if (!req.file) throw new AppError('No existen archivos', 400);
    const _file = req.file as Express.Multer.File;
    const file = {
      dir: _file.destination,
      name: _file.filename,
      originalname: _file.originalname,
      author: profile.lastName + ' ' + profile.firstName,
    };
    const result = await OperationalTasksServices.addFile(+id, file);
    res.status(201).json(result);
  };

  public static update: ControllerFunction = async (req, res) => {
    const { body, params } = req;
    const { id } = params;
    const result = await OperationalTasksServices.update(+id, body);
    res.status(200).json(result);
  };

  public static updateTaskPosition: ControllerFunction = async (req, res) => {
    const taskUpdates: { id: number; date: string; order: number }[] = req.body;
    await OperationalTasksServices.updateTaskPosition(taskUpdates);
    res.status(200).json({ message: 'Tareas actualizadas' });
  };

  public static updateItem: ControllerFunction = async (req, res) => {
    const { body, params } = req;
    const { id } = params;
    const result = await OperationalTasksServices.updateItem(+id, body);
    res.status(200).json(result);
  };

  public static remove: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    await OperationalTasksServices.remove(+id);
    res.status(204).send();
  };

  public static removeItem: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    await OperationalTasksServices.removeItem(+id);
    res.status(204).send();
  };

  public static removeFile: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    await OperationalTasksServices.removeFile(+id);
    res.status(204).send();
  };
}
export default OperationalTasksControllers;

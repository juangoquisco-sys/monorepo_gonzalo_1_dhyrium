import { Request, Response } from 'express';
import LevelsServices from '@/services/levels.services';
import { SubTasks } from '@prisma/client';
import { ControllerFunction } from '@/types/patterns';
import { parseQueries } from '@/utils/format.server';
import { LevelItemQuery } from '@/services/levels.services';
// import mv from 'mv';

export const showLevel = async (req: Request, res: Response) => {
  const { id } = req.params;
  const status = req.query.status as SubTasks['status'];
  const _task_id = parseInt(id);
  const query = await LevelsServices.find(_task_id, status);
  res.status(200).json(query);
};

class LevelsControllers {
  public static create: ControllerFunction = async (req, res) => {
    const { body } = req;
    const params = parseQueries<{ withTask: boolean }>(req.query);
    const query = await LevelsServices.create(body, params);
    res.status(201).json(query);
  };

  public static findById: ControllerFunction = async (req, res) => {
    const { id: stageId } = req.params;
    const query = await LevelsServices.find(+stageId);
    res.status(200).json(query);
  };

  public static addUpperOrLower: ControllerFunction = async (req, res) => {
    const { body } = req;
    const { id } = req.params;
    const { type } = parseQueries<{ type: 'upper' | 'lower' }>(req.query);
    const query = await LevelsServices.addToUpperorLower(+id, body, type);
    res.status(201).json(query);
  };

  public static updateCovers: ControllerFunction = async (req, res) => {
    const { body } = req;
    const query = await LevelsServices.updateCovers(body);
    res.status(200).json(query);
  };

  public static update: ControllerFunction = async (req, res) => {
    const { body } = req;
    const { id } = req.params;
    const query = await LevelsServices.update(+id, body);
    res.status(200).json(query);
  };

  public static delete: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await LevelsServices.delete(+id);
    res.status(200).json(query);
  };

  public static updateTypeItem: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = parseQueries<LevelItemQuery>(req.query);
    const result = await LevelsServices.updateTypeItem(+id, query);
    res.status(200).json(result);
  };
}

export default LevelsControllers;

// export const createLevel = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { body } = req;
//     const query = await LevelsServices.create(body);
//     const path = await PathServices.level(query.id);
//     // const editablePath = path.replace('projects', 'editables');
//     if (query) {
//       mkdirSync(path);
//       // mkdirSync(editablePath);
//     }
//     res.status(201).json(query);
//   } catch (error) {
//     next(error);
//   }
// };

// export const updateLevel = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { body } = req;
//     const { id } = req.params;
//     const _task_id = parseInt(id);
//     const { oldPath, ...query } = await LevelsServices.update(_task_id, body);
//     if (query && query.item && query.name) {
//       const newPath = setNewPath(oldPath, query.item + query.name);
//       // const oldEditable = oldPath.replace('projects', 'editables');
//       // const newEditable = newPath.replace('projects', 'editables');
//       // mv(oldPath, newPath, err => console.log(err));
//       renameDir(oldPath, newPath);
//       // renameDir(oldEditable, newEditable);
//     }
//     res.status(200).json(query);
//   } catch (error) {
//     next(error);
//   }
// };

// export const updateTypeItem = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { id } = req.params;
//     const item = req.query.item as Levels['typeItem'];
//     const type = req.query.type as 'STAGE' | 'LEVEL';
//     const isArea = req.query.isArea === 'true';
//     const _task_id = parseInt(id);
//     const query = await LevelsServices.updateTypeItem(
//       _task_id,
//       item,
//       isArea,
//       type
//     );
//     res.status(200).json(query);
//   } catch (error) {
//     next(error);
//   }
// };

// export const deleteLevel = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { id } = req.params;
//     const _task_id = parseInt(id);
//     const query = await LevelsServices.delete(_task_id);
//     // const editables = query.replace('projects', 'editables');
//     if (query) {
//       rmSync(query, { recursive: true });
//       // rmSync(editables, { recursive: true });
//     }
//     res.status(200).json(query);
//   } catch (error) {
//     next(error);
//   }
// };

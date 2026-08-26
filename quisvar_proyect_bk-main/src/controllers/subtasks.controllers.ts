import SubTasksServices from '@/services/subtasks.services';
import TaskOnUsersServices from '@/services/taskOnUsers.services';
import { ControllerFunction } from '@/types/patterns';
import { parseQueries } from '@/utils/format.server';
import { TaskListParams, UpperOrLowerParams } from '@/types/task';
import { UserType } from '@/middlewares/auth.middleware';
import LegacyTaskAssignmentContextService from '@/services/legacyTaskAssignmentContext.services';

class SubtaskControllers {
  public static assignmentContext: ControllerFunction = async (
    req,
    res,
    next
  ) => {
    try {
      const { id } = req.params;
      const context = await LegacyTaskAssignmentContextService.forTechnicalTask(
        +id
      );
      res.status(200).json(context);
    } catch (error) {
      next(error);
    }
  };

  public static taskListByUser: ControllerFunction = async (req, res, next) => {
    try {
      const { id } = req.params;
      const queries = parseQueries<TaskListParams>(req.query);
      const result = await TaskOnUsersServices.taskListByUser(+id, queries);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public static showLastVisited: ControllerFunction = async (_req, res) => {
    const userInfo: UserType = res.locals.userInfo;
    const query = await SubTasksServices.showLastVisited(userInfo.id);
    res.status(200).json(query);
  };

  public static createLastLastVisited: ControllerFunction = async (
    req,
    res
  ) => {
    const userInfo: UserType = res.locals.userInfo;
    const { id } = req.params;
    await SubTasksServices.createLastVisited(+id, userInfo.id);
    res.status(200).json({ message: 'Visita registrada correctamente' });
  };

  public static taskListByMod: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const queries = parseQueries<TaskListParams>(req.query);
    const result = await TaskOnUsersServices.taskListByMod(+id, queries);
    res.status(200).json(result);
  };

  public static findUserColabs: ControllerFunction = async (req, res) => {
    const { id: subtask_id } = req.params;
    const queries = parseQueries<{ users?: boolean }>(req.query);
    const query = await SubTasksServices.findUsersAndMods(+subtask_id, queries);
    res.status(200).json(query);
  };

  public static find: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const result = await SubTasksServices.find(+id);
    res.status(200).json(result);
  };

  public static create: ControllerFunction = async (req, res) => {
    const { body } = req;
    const result = await SubTasksServices.create(body);
    res.status(201).json(result);
  };

  public static upperOrLower: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { type } = parseQueries<UpperOrLowerParams>(req.query);
    const { body } = req;
    const result = await SubTasksServices.addToUpperorLower(+id, body, type);
    res.status(201).json(result);
  };

  public static update: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { body } = req;
    const query = await SubTasksServices.update(+id, body);
    res.status(200).json(query);
  };

  public static approved: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await SubTasksServices.approved(+id);
    res.status(200).json(query);
  };

  public static sortTasks: ControllerFunction = async (req, res) => {
    const { body } = req;
    const query = await SubTasksServices.sorting(body);
    res.status(200).json(query);
  };

  public static updateDays: ControllerFunction = async (req, res) => {
    const { body } = req;
    const query = await SubTasksServices.updateDays(body);
    res.status(200).json(query);
  };

  public static updatePrices: ControllerFunction = async (req, res) => {
    const { body } = req;
    const query = await SubTasksServices.updatePrices(body);
    res.status(200).json(query);
  };

  public static delete: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await SubTasksServices.delete(+id);
    res.status(200).json(query);
  };

  public static restore: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await SubTasksServices.restore(+id);
    res.status(200).json(query);
  };
}

export default SubtaskControllers;

// export const showSubTask = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { id } = req.params;
//     const _subtask_id = parseInt(id);
//     const query = await SubTasksServices.find(_subtask_id);
//     res.status(200).json(query);
//   } catch (error) {
//     next(error);
//   }
// };

// export const createSubTask = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { stageId, ...body } = req.body;
//     await SubTasksServices.create(body);
//     const query = await StageServices.find(+stageId);
//     res.status(201).json({ ...query, stagesId: stageId });
//   } catch (error) {
//     next(error);
//   }
// };

// export const updateSubTask = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { stageId, ...body } = req.body;
//     const { id } = req.params;
//     const _subtask_id = parseInt(id);
//     await SubTasksServices.update(_subtask_id, body);
//     const query = await StageServices.find(+stageId);
//     res.status(201).json({ ...query, stagesId: stageId });
//   } catch (error) {
//     next(error);
//   }
// };

// export const assignedSubTask = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { id } = req.params;
//     const userInfo: UserType = res.locals.userInfo;
//     const userId = userInfo.id;
//     const _task_id = parseInt(id);
//     const status = req.query.status as 'decline' | 'apply' | 'review';
//     const query = await SubTasksServices.assigned(_task_id, userId, status);
//     return res.status(200).json(query);
//   } catch (error) {
//     next(error);
//   }
// };

// export const updateStatusSubTask = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { id, stageId } = req.params;
//     const { body } = req;
//     const userInfo: UserType = res.locals.userInfo;
//     const _subtask_id = parseInt(id);
//     const task = await SubTasksServices.updateStatus(
//       _subtask_id,
//       body,
//       userInfo
//     );
//     const project = await StageServices.find(+stageId);
//     res.status(200).json({
//       task,
//       project: {
//         ...project,
//         stagesId: stageId,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// export const resetStatusSubTask = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { id, stageId } = req.params;
//     const _subtask_id = parseInt(id);
//     const task = await SubTasksServices.resetStatus(_subtask_id);
//     const project = await StageServices.find(+stageId);
//     res.status(200).json({
//       task,
//       project: {
//         ...project,
//         stagesId: stageId,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// export const deleteSubTasks = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { id, stageId } = req.params;
//     const _subtask_id = parseInt(id);
//     await SubTasksServices.delete(_subtask_id);
//     const query = await StageServices.find(+stageId);
//     res.status(201).json({ ...query, stagesId: stageId });
//   } catch (error) {
//     next(error);
//   }
// };

// export const assignUserBySubtask = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { id, stageId } = req.params;
//     const { body } = req;
//     const task = await SubTasksServices.assignUserBySubtask(body, +id);
//     const project = await StageServices.find(+stageId);
//     res.status(200).json({
//       task,
//       project: {
//         ...project,
//         stagesId: stageId,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// // export const updateStatusPDF = async (
// //   req: Request,
// //   res: Response,
// //   next: NextFunction
// // ) => {
// //   try {
// //     const { id } = req.params;
// //     const pdf = req.query.pdf == 'true';
// //     const _subtask_id = parseInt(id);
// //     const query = await SubTasksServices.updateHasPDF(_subtask_id, pdf);
// //     return query;
// //   } catch (error) {
// //     next(error);
// //   }
// // };

// export const updatePercentage = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { id } = req.params;
//     const { body } = req;
//     const _subtask_id = parseInt(id);
//     const query = await SubTasksServices.updatePercentage(_subtask_id, body);
//     res.status(201).json(query);
//   } catch (error) {
//     next(error);
//   }
// };

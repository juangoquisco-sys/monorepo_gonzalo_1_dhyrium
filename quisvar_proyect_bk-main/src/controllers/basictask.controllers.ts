import { ControllerFunction } from '@/types/patterns';
import BasicTasksServices from '@/services/basictask.services';
import { parseQueries } from '@/utils/format.server';
import LegacyTaskAssignmentContextService from '@/services/legacyTaskAssignmentContext.services';

class BasicTaskControllers {
  public static assignmentContext: ControllerFunction = async (
    req,
    res,
    next
  ) => {
    try {
      const { id } = req.params;
      const context = await LegacyTaskAssignmentContextService.forBasicTask(
        +id
      );
      res.status(200).json(context);
    } catch (error) {
      next(error);
    }
  };

  public static findUserColabs: ControllerFunction = async (req, res, next) => {
    try {
      const { id: subtask_id } = req.params;
      const queries = parseQueries<{ users?: boolean }>(req.query);
      const query = await BasicTasksServices.findUsersAndMods(
        +subtask_id,
        queries
      );
      res.status(200).json(query);
    } catch (error) {
      next(error);
    }
  };

  public static find: ControllerFunction = async (req, res) => {
    //
    const { id: subtask_id } = req.params;
    const query = await BasicTasksServices.find(+subtask_id);
    res.status(200).json(query);
  };

  public static create: ControllerFunction = async (req, res) => {
    const { stageId: stagesId, ...body } = req.body;
    const pat = await BasicTasksServices.create(body);
    // const query = await BasicTasksServices.find(+stagesId);
    // res.status(201).json({ ...query, stagesId });
    res.status(201).json({ ...pat, stagesId });
  };

  public static upperOrLower: ControllerFunction = async (req, res) => {
    const { body } = req;
    const { id: subtask_id } = req.params;
    const type = req.query.type as 'upper' | 'lower';
    const query = await BasicTasksServices.addToUpperorLower(
      +subtask_id,
      body,
      type
    );
    res.status(201).json(query);
  };

  public static update: ControllerFunction = async (req, res) => {
    const { id: taskId } = req.params;
    const { body } = req;
    const query = await BasicTasksServices.update(+taskId, body);
    res.status(200).json(query);
    //
  };

  public static sortTasks: ControllerFunction = async (req, res) => {
    const { body } = req;
    const query = await BasicTasksServices.sort(body);
    res.status(200).json(query);
  };

  public static delete: ControllerFunction = async (req, res) => {
    const { id: taskId } = req.params;
    const query = await BasicTasksServices.delete(+taskId);
    res.status(200).json(query);
  };

  public static restore: ControllerFunction = async (req, res) => {
    const { id: taskId } = req.params;
    const query = await BasicTasksServices.restore(+taskId);
    res.status(200).json(query);
  };
}

export default BasicTaskControllers;

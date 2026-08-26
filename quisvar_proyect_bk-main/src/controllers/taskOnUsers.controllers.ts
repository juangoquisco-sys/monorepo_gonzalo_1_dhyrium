import { ControllerFunction } from '@/types/patterns';
import { parseQueries } from '@/utils/format.server';
import { ParametersReportUser } from '@/types/types';
import SubTaskOnUserServices from '@/services/taskOnUsers.services';

class SubTaskOnUserControllers {
  public static history: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const params = parseQueries<ParametersReportUser>(req.query);
    // const result = await SubTaskOnUserServices.getReport(+id, params);
    res.status(200).json({ id, params });
  };

  public static addUser: ControllerFunction = async (req, res) => {
    const { body } = req;
    const result = await SubTaskOnUserServices.add(body);
    res.status(201).json(result);
  };

  public static changeUser: ControllerFunction = async (req, res) => {
    const { body } = req;
    const result = await SubTaskOnUserServices.updateUser(body);
    res.status(200).json(result);
  };

  public static addMod: ControllerFunction = async (req, res) => {
    const { body } = req;
    const result = await SubTaskOnUserServices.addMod(body);
    res.status(201).json(result);
  };

  public static addColabs: ControllerFunction = async (req, res) => {
    const { body } = req;
    const { id } = req.params;
    const result = await SubTaskOnUserServices.addColaborators(+id, body);
    res.status(201).json(result);
  };

  public static changeStatus: ControllerFunction = async (req, res) => {
    const { body } = req;
    const result = await SubTaskOnUserServices.authorizateUsers(body);
    res.status(200).json(result);
  };

  public static removeUser: ControllerFunction = async (req, res) => {
    const { id: userIdList } = req.params;
    await SubTaskOnUserServices.remove(+userIdList);
    res.status(204).send();
  };

  public static removeMod: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { body } = req;
    await SubTaskOnUserServices.removeMod({
      taskId: +id,
      ...body,
    });
    res.status(204).send();
  };
}
export default SubTaskOnUserControllers;

import { ControllerFunction } from '@/types/patterns';
import BasicTaskOnUserServices from '@/services/basictaskOnUsers.services';
import { parseQueries } from '@/utils/format.server';
import { ParametersReportUser } from '@/types/types';

class BasicTaskOnUserControllers {
  public static history: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const params = parseQueries<ParametersReportUser>(req.query);
    const result = await BasicTaskOnUserServices.getReport(+id, params);
    res.status(200).json(result);
  };

  public static addUser: ControllerFunction = async (req, res) => {
    const { body } = req;
    const result = await BasicTaskOnUserServices.add(body);
    res.status(201).json(result);
  };

  public static addMod: ControllerFunction = async (req, res) => {
    const { body } = req;
    const result = await BasicTaskOnUserServices.addMod(body);
    res.status(201).json(result);
  };

  public static addColabs: ControllerFunction = async (req, res) => {
    const { body } = req;
    const { id } = req.params;
    const result = await BasicTaskOnUserServices.addColaborators(+id, body);
    res.status(201).json(result);
  };

  public static changeStatus: ControllerFunction = async (req, res) => {
    const { body } = req;
    const result = await BasicTaskOnUserServices.authorizateUsers(body);
    res.status(200).json(result);
  };

  public static removeUser: ControllerFunction = async (req, res) => {
    const { id: userIdList } = req.params;
    await BasicTaskOnUserServices.remove(+userIdList);
    res.status(204).send();
  };

  public static removeMod: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { body } = req;
    await BasicTaskOnUserServices.removeMod({
      taskId: +id,
      ...body,
    });
    res.status(204).send();
  };
}
export default BasicTaskOnUserControllers;

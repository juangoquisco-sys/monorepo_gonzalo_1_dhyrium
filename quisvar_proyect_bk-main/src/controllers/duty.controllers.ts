import { ControllerFunction } from '@/types/patterns';
import DutyServices from '@/services/duty.services';

// GROUPS
class DutyControllers {
  public createDuty: ControllerFunction = async (req, res, next) => {
    try {
      const { groupId, projectId } = req.params;
      const { body } = req;
      const query = await DutyServices.create(body, +groupId, +projectId);
      res.status(200).json(query);
    } catch (error) {
      console.log(error);
      next(error);
    }
  };
  public updateDuty: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { members, ...data } = req.body;
    const query = await DutyServices.update(+id, members, data);
    res.status(200).json(query);
  };
  public deleteDuty: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await DutyServices.delete(+id);
    res.status(200).json(query);
  };
  //Duty projects
  public getProjects: ControllerFunction = async (req, res) => {
    const query = await DutyServices.getProjects();
    res.status(200).json(query);
  };
}
export default new DutyControllers();

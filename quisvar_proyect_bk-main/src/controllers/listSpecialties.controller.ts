import { ControllerFunction } from '@/types/patterns';
import ListSpecialties from '@/services/listSpecialties.services';
class ListSpecialtiesController {
  public create: ControllerFunction = async (req, res, next) => {
    try {
      const { name } = req.body;
      const query = await ListSpecialties.create(name);
      res.status(201).json(query);
    } catch (error) {
      console.log(error);
      next(error);
    }
  };
  public getAll: ControllerFunction = async (req, res, next) => {
    try {
      const query = await ListSpecialties.getAll();
      res.status(200).json(query);
    } catch (error) {
      console.log(error);
      next(error);
    }
  };
  public update: ControllerFunction = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const query = await ListSpecialties.update(+id, name);
      res.status(200).json(query);
    } catch (error) {
      console.log(error);
      next(error);
    }
  };
  public delete: ControllerFunction = async (req, res, next) => {
    try {
      const { id } = req.params;
      const query = await ListSpecialties.delete(+id);
      res.status(200).json(query);
    } catch (error) {
      console.log(error);
      next(error);
    }
  };
}
export default new ListSpecialtiesController();

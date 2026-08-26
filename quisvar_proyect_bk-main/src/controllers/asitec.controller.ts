import { ControllerFunction } from '@/types/patterns';
import AsitecServices from '@/services/asitec.services';
class AsitecControllers {
  public createDuty: ControllerFunction = async (req, res, next) => {
    try {
      const { body } = req;
      const query = await AsitecServices.create(body);
      res.status(200).json(query);
    } catch (error) {
      console.log(error);
      next(error);
    }
  };
}
export default new AsitecControllers();

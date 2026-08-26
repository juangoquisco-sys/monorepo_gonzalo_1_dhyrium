import { ControllerFunction } from '@/types/patterns';
import OfficeServices from '@/services/office.services';
import { ProfileByRoleType } from '@/types/types';
import { UserType } from '@/middlewares/auth.middleware';

class OfficeControllers {
  public static showAll: ControllerFunction = async (req, res) => {
    const { id: userId }: UserType = res.locals.userInfo;
    const { menuId, subMenuId, typeRol, subTypeRol } = req.query as Omit<
      ProfileByRoleType,
      'includeSelf'
    >;
    const includeSelf = req.query.includeSelf === 'true';
    const { includeUsers } = req.query;
    const includeUser = !includeUsers || includeUsers === 'true';
    const queries: ProfileByRoleType = {
      menuId: menuId && +menuId,
      subMenuId: subMenuId && +subMenuId,
      typeRol,
      subTypeRol,
      includeSelf,
    };
    const result = await OfficeServices.getAll(userId, includeUser, queries);
    res.status(200).json(result);
  };

  public static create: ControllerFunction = async (req, res) => {
    const { body } = req;
    const query = await OfficeServices.create(body);
    res.status(201).json(query);
  };

  public static update: ControllerFunction = async (req, res) => {
    const { body } = req;
    const { id: officeId } = req.params;
    const query = await OfficeServices.update(+officeId, body);
    res.status(200).json(query);
  };

  public static remove: ControllerFunction = async (req, res) => {
    const { id: officeId } = req.params;
    await OfficeServices.delete(+officeId);
    res.status(204).send();
  };
}
export default OfficeControllers;

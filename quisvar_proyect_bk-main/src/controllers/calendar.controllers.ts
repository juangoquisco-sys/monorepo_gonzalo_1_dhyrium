import { ControllerFunction } from '@/types/patterns';
import { UserType } from '@/middlewares/auth.middleware';
import CalendarServices from '@/services/calendar.services';

class CalendarControllers {
  public static list: ControllerFunction = async (req, res) => {
    const query = await CalendarServices.list(
      res.locals.userInfo as UserType,
      req.query as any
    );
    res.status(200).json(query);
  };

  public static createActivity: ControllerFunction = async (req, res) => {
    const query = await CalendarServices.createActivity(
      res.locals.userInfo as UserType,
      req.body
    );
    res.status(201).json(query);
  };

  public static updateActivity: ControllerFunction = async (req, res) => {
    const query = await CalendarServices.updateActivity(
      res.locals.userInfo as UserType,
      req.params.id,
      req.body
    );
    res.status(200).json(query);
  };

  public static deleteActivity: ControllerFunction = async (req, res) => {
    const query = await CalendarServices.deleteActivity(
      res.locals.userInfo as UserType,
      req.params.id
    );
    res.status(200).json(query);
  };
}

export default CalendarControllers;

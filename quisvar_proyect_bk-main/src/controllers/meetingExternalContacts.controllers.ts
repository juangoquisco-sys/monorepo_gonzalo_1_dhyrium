import { ControllerFunction } from '@/types/patterns';
import { UserType } from '@/middlewares/auth.middleware';
import MeetingExternalContactsServices from '@/services/meetingExternalContacts.services';

class MeetingExternalContactsControllers {
  public static list: ControllerFunction = async (req, res) => {
    const query = await MeetingExternalContactsServices.list(
      res.locals.userInfo as UserType,
      req.query.search as string | undefined
    );
    res.status(200).json(query);
  };

  public static create: ControllerFunction = async (req, res) => {
    const query = await MeetingExternalContactsServices.create(
      res.locals.userInfo as UserType,
      req.body
    );
    res.status(201).json(query);
  };
}

export default MeetingExternalContactsControllers;

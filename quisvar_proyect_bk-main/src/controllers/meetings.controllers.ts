import { ControllerFunction } from '@/types/patterns';
import { UserType } from '@/middlewares/auth.middleware';
import MeetingsServices from '@/services/meetings.services';

class MeetingsControllers {
  public static create: ControllerFunction = async (req, res) => {
    const query = await MeetingsServices.create(
      res.locals.userInfo as UserType,
      req.body
    );
    res.status(201).json(query);
  };

  public static find: ControllerFunction = async (req, res) => {
    const query = await MeetingsServices.find(
      res.locals.userInfo as UserType,
      req.params.id
    );
    res.status(200).json(query);
  };

  public static update: ControllerFunction = async (req, res) => {
    const query = await MeetingsServices.update(
      res.locals.userInfo as UserType,
      req.params.id,
      req.body
    );
    res.status(200).json(query);
  };

  public static start: ControllerFunction = async (req, res) => {
    const query = await MeetingsServices.start(
      res.locals.userInfo as UserType,
      req.params.id
    );
    res.status(200).json(query);
  };

  public static end: ControllerFunction = async (req, res) => {
    const query = await MeetingsServices.end(
      res.locals.userInfo as UserType,
      req.params.id
    );
    res.status(200).json(query);
  };

  public static updateScope: ControllerFunction = async (req, res, next) => {
    try {
      const query = await MeetingsServices.updateScope(
        res.locals.userInfo as UserType,
        req.params.id,
        req.body?.scope
      );
      res.status(200).json(query);
    } catch (error) {
      next(error);
    }
  };

  public static list: ControllerFunction = async (req, res, next) => {
    try {
      const query = await MeetingsServices.list(
        res.locals.userInfo as UserType,
        req.query.unitId as string | undefined,
        req.query.status as string | undefined
      );
      res.status(200).json(query);
    } catch (error) {
      next(error);
    }
  };

  public static resume: ControllerFunction = async (req, res, next) => {
    try {
      const query = await MeetingsServices.resume(
        res.locals.userInfo as UserType,
        req.params.id,
        req.body?.reason
      );
      res.status(200).json(query);
    } catch (error) {
      next(error);
    }
  };

  public static updateAttendance: ControllerFunction = async (
    req,
    res,
    next
  ) => {
    try {
      const query = await MeetingsServices.updateAttendance(
        res.locals.userInfo as UserType,
        req.params.id,
        req.body?.participants
      );
      res.status(200).json(query);
    } catch (error) {
      next(error);
    }
  };

  public static addParticipants: ControllerFunction = async (req, res) => {
    const query = await MeetingsServices.addParticipants(
      res.locals.userInfo as UserType,
      req.params.id,
      req.body?.participants
    );
    res.status(200).json(query);
  };

  public static removeParticipant: ControllerFunction = async (req, res) => {
    const query = await MeetingsServices.removeParticipant(
      res.locals.userInfo as UserType,
      req.params.id,
      req.params.participantId
    );
    res.status(200).json(query);
  };

  public static participantCandidates: ControllerFunction = async (
    req,
    res
  ) => {
    const query = await MeetingsServices.participantCandidates(
      res.locals.userInfo as UserType,
      req.params.id,
      req.query.search as string | undefined
    );
    res.status(200).json(query);
  };

  public static updateMinutes: ControllerFunction = async (req, res) => {
    const query = await MeetingsServices.updateMinutes(
      res.locals.userInfo as UserType,
      req.params.id,
      req.body?.content || ''
    );
    res.status(200).json(query);
  };

  public static updateProjectMinutes: ControllerFunction = async (req, res) => {
    const query = await MeetingsServices.updateProjectMinutes(
      res.locals.userInfo as UserType,
      req.params.id,
      +req.params.projectId,
      req.body?.content || ''
    );
    res.status(200).json(query);
  };

  public static addAgendaItem: ControllerFunction = async (req, res) => {
    const query = await MeetingsServices.addAgendaItem(
      res.locals.userInfo as UserType,
      req.params.id,
      req.body
    );
    res.status(201).json(query);
  };

  public static updateAgendaItem: ControllerFunction = async (req, res) => {
    const query = await MeetingsServices.updateAgendaItem(
      res.locals.userInfo as UserType,
      req.params.id,
      req.params.itemId,
      req.body
    );
    res.status(200).json(query);
  };
}

export default MeetingsControllers;

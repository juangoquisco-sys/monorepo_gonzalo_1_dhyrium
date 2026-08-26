import { ControllerFunction } from '@/types/patterns';
import { UserType } from '@/middlewares/auth.middleware';
import CommitmentsServices from '@/services/commitments.services';

class CommitmentsControllers {
  public static list: ControllerFunction = async (req, res) => {
    const query = await CommitmentsServices.list(
      res.locals.userInfo as UserType,
      req.query as any
    );
    res.status(200).json(query);
  };

  public static create: ControllerFunction = async (req, res) => {
    const query = await CommitmentsServices.create(
      res.locals.userInfo as UserType,
      req.body
    );
    res.status(201).json(query);
  };

  public static createProposal: ControllerFunction = async (req, res) => {
    const query = await CommitmentsServices.createProposal(
      res.locals.userInfo as UserType,
      req.body
    );
    res.status(201).json(query);
  };

  public static update: ControllerFunction = async (req, res) => {
    const query = await CommitmentsServices.update(
      res.locals.userInfo as UserType,
      req.params.id,
      req.body
    );
    res.status(200).json(query);
  };

  public static updateStatus: ControllerFunction = async (req, res) => {
    const query = await CommitmentsServices.updateStatus(
      res.locals.userInfo as UserType,
      req.params.id,
      req.body?.status
    );
    res.status(200).json(query);
  };

  public static review: ControllerFunction = async (req, res) => {
    const query = await CommitmentsServices.review(
      res.locals.userInfo as UserType,
      req.params.id,
      req.body
    );
    res.status(201).json(query);
  };

  public static updateReviewComment: ControllerFunction = async (req, res) => {
    const query = await CommitmentsServices.updateReviewComment(
      res.locals.userInfo as UserType,
      req.params.id,
      req.body
    );
    res.status(200).json(query);
  };

  public static confirm: ControllerFunction = async (req, res) => {
    const query = await CommitmentsServices.confirm(
      res.locals.userInfo as UserType,
      req.params.id,
      req.body?.confirmationStatus
    );
    res.status(200).json(query);
  };

  public static attachMeeting: ControllerFunction = async (req, res) => {
    const query = await CommitmentsServices.attachMeeting(
      res.locals.userInfo as UserType,
      req.params.id,
      req.body?.meetingId
    );
    res.status(200).json(query);
  };

  public static delete: ControllerFunction = async (req, res) => {
    const query = await CommitmentsServices.delete(
      res.locals.userInfo as UserType,
      req.params.id
    );
    res.status(200).json(query);
  };
}

export default CommitmentsControllers;

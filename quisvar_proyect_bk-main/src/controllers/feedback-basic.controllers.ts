import { ControllerFunction } from '@/types/patterns';
import FeedbackBasicServices from '@/services/feedback-basic.services';
import PathServices from '@/services/paths.services';
import { UserType } from '@/middlewares/auth.middleware';
import { BasicFiles } from '@prisma/client';
import { BasicFilesForm } from '@/types/types';

class FeedbackBasicControllers {
  public static getByTask: ControllerFunction = async (req, res) => {
    const { id: taskId } = req.params;
    const result = await FeedbackBasicServices.showByTask(+taskId);
    res.status(200).json(result);
  };

  public static create: ControllerFunction = async (req, res) => {
    const { id: subTasksId } = req.params;
    const percentage = req.body.percentage;
    const userOnTaskId = req.body.userOnTaskId;
    const user: UserType = res.locals.userInfo;
    const { firstName, lastName } = user.profile;
    if (!req.files) return;
    const newFiles = req.files as Express.Multer.File[];
    const dir = await PathServices.basicTask(+subTasksId, 'REVIEW');
    const files = newFiles.map(({ filename: name, originalname }) => {
      const type: BasicFiles['type'] = 'REVIEW';
      const data = { name, dir, originalname, type };
      const values: BasicFilesForm = {
        author: firstName + ' ' + lastName,
        ...data,
        subTasksId: +subTasksId,
      };
      return values;
    });
    const data = {
      subTasksId: +subTasksId,
      percentage: +percentage,
      userOnTaskId,
      files,
    };
    const result = await FeedbackBasicServices.create(data, user);
    res.status(200).json(result);
  };

  public static review: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const body = req.body;
    const user: UserType = res.locals.userInfo;
    const data = { id: +id, ...body };
    const result = await FeedbackBasicServices.review(data, user);
    res.status(200).json(result);
  };
}
export default FeedbackBasicControllers;

import FeedbackServices from '@/services/feedbacks.services';
import PathServices from '@/services/paths.services';
import ProfileServices from '@/services/profile.services';
import { UserType } from '@/middlewares/auth.middleware';
import { ControllerFunction } from '@/types/patterns';
import { Files, Profiles } from '@prisma/client';
import { FilesType } from '@/types/task';

class FeedbackControllers {
  public static getByTask: ControllerFunction = async (req, res) => {
    const { id: taskId } = req.params;
    const result = await FeedbackServices.showByTask(+taskId);
    res.status(200).json(result);
  };

  public static create: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const percentage = +req.body.percentage;
    const userOnTaskId = req.body.userOnTaskId;
    const user: UserType = res.locals.userInfo;
    if (!req.files) return;
    const newFiles = req.files as Express.Multer.File[];
    const files = await this.filesResolve(newFiles, +id, user.profile);
    const data = { subTasksId: +id, percentage, files, userOnTaskId };
    const result = await FeedbackServices.create(data, user);
    res.status(201).json(result);
  };

  private static async filesResolve(
    files: Express.Multer.File[],
    taskId: number,
    profile: Profiles
  ) {
    const dir = await PathServices.subTask(taskId, 'REVIEW');
    const type: Files['type'] = 'REVIEW';
    const { fullname: author } = ProfileServices.setInformation(profile);
    const newFiles = files.map<FilesType>(
      ({ filename: name, originalname }) => {
        const data = { name, dir, originalname, type, author };
        return { subTasksId: +taskId, ...data };
      }
    );
    return newFiles;
  }

  public static review: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const body = req.body;
    const user: UserType = res.locals.userInfo;
    const data = { id: +id, ...body };
    const result = await FeedbackServices.review(data, user);
    res.status(200).json(result);
  };
  /* ----------------------------- UPDATE FEEDBACK ---------------------------- */
  public static editFeedback: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;
    const result = await FeedbackServices.editFeedback(+id, comment);
    res.status(200).json(result);
  };
}

export default FeedbackControllers;

// export const findFeedbacks = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { id } = req.params;
//     const _subtask_id = parseInt(id);
//     const query = await FeedBackServices.find(_subtask_id);
//     res.status(201).json(query);
//   } catch (error) {
//     next(error);
//   }
// };

// export const createFeedback = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const userInfo: UserType = res.locals.userInfo;
//     const userId = userInfo.id;
//     const { body } = req;
//     const query = await FeedBackServices.create({ ...body, userId });
//     res.status(201).json(query);
//   } catch (error) {
//     next(error);
//   }
// };
// export const editFeedback = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const userInfo: UserType = res.locals.userInfo;
//     const userId = userInfo.id;
//     const { body } = req;
//     const query = await FeedBackServices.update({ ...body, userId });
//     res.status(201).json(query);
//   } catch (error) {
//     console.log(error);
//     next(error);
//   }
// };

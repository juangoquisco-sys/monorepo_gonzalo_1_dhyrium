import AppError from '@/utils/appError';
import type { Feedback, SubTasks } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import Queries from '@/utils/queries';
import { UserType } from '@/middlewares/auth.middleware';
import ProfileServices from '@/services/profile.services';
import type { CreateFeedbackForm, ReviewFeedbackForm } from '@/types/feedback';

class FeedbackServices {
  static async showByTask(subTasksId: SubTasks['id']) {
    const feedbackList = await prisma.feedback.findMany({
      where: { subTasksId },
      include: { files: Queries.selectFiles },
      orderBy: { createdAt: 'desc' },
    });
    return feedbackList;
  }

  public static async create(
    { userOnTaskId, subTasksId, files, percentage }: CreateFeedbackForm,
    user: UserType
  ) {
    const total = await prisma.subTaskOnUsers.aggregate({
      where: { taskId: subTasksId, statusPayment: true },
      _sum: { percentage: true },
    });
    const newPercentage = (total._sum.percentage || 0) + percentage;
    const author = JSON.stringify(ProfileServices.setInformation(user.profile));
    const queries = [
      prisma.subTasks.update({
        where: { id: subTasksId },
        data: {
          status: 'INREVIEW',
          users: {
            update: {
              where: { id: +userOnTaskId },
              data: { updatedAt: new Date() },
            },
          },
        },
      }),
      prisma.feedback.create({
        data: {
          subTasksId,
          users: { create: { userId: user.id, userMain: true } },
          percentage: newPercentage,
          author,
          files: { createMany: { data: files } },
        },
        include: { files: true },
      }),
    ];
    const data = await prisma.$transaction(queries);
    return data[0];
  }

  public static async review(
    { userOnTaskId, id, percentage, ...data }: ReviewFeedbackForm,
    user: UserType
  ) {
    if (!id || !userOnTaskId) throw new AppError('Oops, ID invalido', 400);
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      select: { replacedAt: true },
    });
    if (!feedback || feedback.replacedAt)
      throw new AppError(
        'Este entregable fue reemplazado y no puede revisarse',
        409
      );
    const findTask = await prisma.subTaskOnUsers.findUnique({
      where: { id: userOnTaskId },
      select: { taskId: true },
    });
    if (!findTask) throw new AppError('Oops, usuario invalido', 400);
    const { taskId } = findTask;
    const averagePercentage = await prisma.subTaskOnUsers.aggregate({
      where: { statusPayment: true, taskId },
      _sum: { percentage: true },
    });
    const fbPercentage = percentage + (averagePercentage._sum.percentage || 0);
    //------------------------------------------------------------------------
    const reviewer = JSON.stringify(
      ProfileServices.setInformation(user.profile)
    );
    const users = {
      connectOrCreate: {
        where: { userId_feedbackId: { feedbackId: id, userId: user.id } },
        create: { userId: user.id },
      },
    };
    const updateUser = {
      update: {
        where: { id: userOnTaskId },
        data: { percentage, finishedAt: new Date() },
      },
    };
    const updateFeedback = await prisma.feedback.update({
      where: { id },
      data: {
        reviewer,
        status: true,
        users,
        percentage: fbPercentage,
        ...data,
        subTasks: {
          update: {
            status: data.type === 'ACCEPTED' ? 'REVIEWED' : 'DENIED',
            users: data.type === 'ACCEPTED' ? updateUser : undefined,
          },
        },
      },
    });
    return updateFeedback;
  }
  /* ----------------------------- UPDATE FEEDBACK ---------------------------- */
  public static async editFeedback(
    id: Feedback['id'],
    comment: Feedback['comment']
  ) {
    if (!id) throw new AppError('Oops, ID invalido', 400);
    const updateFeedback = await prisma.feedback.update({
      where: { id },
      data: { comment },
    });
    return updateFeedback;
  }
}
export default FeedbackServices;

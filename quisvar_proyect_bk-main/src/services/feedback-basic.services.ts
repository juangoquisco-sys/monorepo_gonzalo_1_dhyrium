import { BasicFeedback, BasicTasks } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import { UserType } from '@/middlewares/auth.middleware';
import Queries from '@/utils/queries';
import type { CreateFeedbackForm } from '@/types/feedback';
import ProfileServices from '@/services/profile.services';

class FeedbackBasicServices {
  public static async showByTask(subTasksId: BasicTasks['id']) {
    const list = await prisma.basicFeedback.findMany({
      where: { subTasksId },
      include: { files: Queries.selectFiles },
      orderBy: { createdAt: 'desc' },
    });
    return list;
  }

  public static async create(
    { subTasksId, percentage, files }: CreateFeedbackForm,
    { id: userId, profile }: UserType
  ) {
    const authorData = ProfileServices.setInformation(profile);
    const queryList = [
      prisma.basicTasks.update({
        where: { id: subTasksId },
        data: { status: 'INREVIEW' },
      }),
      prisma.basicFeedback.create({
        data: {
          subTasksId,
          users: { create: { userId, userMain: true } },
          percentage,
          author: JSON.stringify(authorData),
          files: { createMany: { data: files } },
        },
        include: { files: true },
      }),
    ];
    return await prisma.$transaction(queryList).then(res => res[1]);
  }

  public static async review(
    {
      id,
      type,
      comment,
      percentage,
      userOnTaskId,
    }: BasicFeedback & { userOnTaskId: number },
    { id: userId, profile }: UserType
  ) {
    const { lastName, firstName, dni } = profile;
    const reviewerData = {
      fullname: lastName + ' ' + firstName,
      lastName,
      firstName,
      dni,
    };
    // status: false  para despues para pago
    const queryList = [
      prisma.basicFeedback.update({
        where: { id },
        data: {
          reviewer: JSON.stringify(reviewerData),
          type,
          comment,
          percentage,
          status: true,
          subTasks: {
            update: {
              status: type === 'ACCEPTED' ? 'REVIEWED' : 'DENIED',
              users:
                type === 'ACCEPTED'
                  ? {
                      update: {
                        where: { id: userOnTaskId },
                        data: { percentage, finishedAt: new Date() },
                      },
                    }
                  : undefined,
            },
          },
          users: {
            connectOrCreate: {
              where: { userId_feedbackId: { feedbackId: id, userId } },
              create: { userId },
            },
          },
        },
      }),
      prisma.basicTaskOnUsers.update({
        where: { id: userOnTaskId },
        data: { finishedAt: new Date() },
      }),
    ];
    return await prisma.$transaction(queryList).then(res => res[0]);
  }
}
export default FeedbackBasicServices;

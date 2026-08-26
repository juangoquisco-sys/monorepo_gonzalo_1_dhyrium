import AppError from '@/utils/appError';
import type { Duty, DutyTasks, ListDetails } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import GroupServices from '@/services/groups.services';
type Members = {
  id: number;
  position?: string | null;
  fullName: string;
  feedBack?: string | null;
  feedBackDate?: string | null;
  dailyDuty?: string | null;
  dailyDutyDate?: string | null;
  attendance: ListDetails;
  dutyId: number;
  task: DutyTasks[];
};
class DutyServices {
  static async create(data: Duty, groupId: number, contractId: number) {
    if (!data) throw new AppError(`Oops!, algo salio mal`, 400);
    const duty = await prisma.duty.create({
      data: {
        ...data,
      },
    });
    const userTask = await GroupServices.getUserTask(groupId, contractId);
    userTask.map(async tasks => {
      const dutyMembers = await prisma.dutyMembers.create({
        data: {
          position: tasks.user?.job,
          fullName: tasks.user?.firstName + ' ' + tasks.user?.lastName,
          dutyId: duty.id,
        },
        select: {
          id: true,
        },
      });
      if (tasks.subtasks.length > 0) {
        tasks.subtasks.map(async task => {
          await prisma.dutyTasks.create({
            data: {
              name: task.name,
              percentage: +task.percentage,
              dutyMemberId: dutyMembers.id,
            },
          });
        });
      } else {
        await prisma.dutyTasks.create({
          data: {
            name: '',
            percentage: 0,
            dutyMemberId: dutyMembers.id,
          },
        });
      }
    });

    return duty;
  }
  static async update(
    id: Duty['id'],
    members: Members[],
    data: Pick<Duty, 'titleMeeting' | 'dutyGroup' | 'dutyGroupDate'>
  ) {
    if (!data) throw new AppError(`Oops!, algo salio mal`, 400);
    await prisma.duty.update({
      where: { id },
      data: {
        ...data,
      },
    });
    for (const member of members) {
      const { task, ...data } = member;
      await prisma.dutyMembers.update({
        where: { id: member.id },
        data: {
          ...data,
        },
      });
      task.map(async item => {
        await prisma.dutyTasks.update({
          where: { id: item.id },
          data: {
            ...item,
          },
        });
      });
    }
    return 'ok';
  }
  static async delete(id: Duty['id']) {
    if (!id) throw new AppError(`Oops!, algo salio mal`, 400);
    await prisma.duty.delete({ where: { id } });
    return 'ok';
  }
  //Duty projects
  static async getProjects() {
    // if (!cui) throw new AppError(`Oops!, algo salio mal`, 400);
    const projects = await prisma.contratc.findMany({
      select: { id: true, cui: true, projectName: true },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return projects;
  }
  // static async getProject(cui: Contratc['cui']) {
  //   if (!cui) throw new AppError(`Oops!, algo salio mal`, 400);
  //   await prisma.contratc.findFirst({ where: { cui } });
  //   return 'ok';
  // }
}
export default DutyServices;

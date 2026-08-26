import { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import type {
  CalendarActivityPriority,
  CalendarActivityStatus,
  CommitmentStatus,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import MeetingPermissionService from '@/services/meetingPermission.services';

type CalendarQuery = {
  scope?: 'person' | 'unit' | 'project';
  unitId?: string;
  projectId?: string | number;
  from?: string;
  to?: string;
};

type ActivityInput = {
  unitId: string;
  projectId?: number | null;
  meetingId?: string | null;
  title: string;
  description?: string | null;
  startAt: string | Date;
  endAt?: string | Date | null;
  allDay?: boolean;
  status?: CalendarActivityStatus;
  priority?: CalendarActivityPriority;
  participantUserIds?: number[];
};

class CalendarServices {
  private static parseDate(value?: string, fallback?: Date) {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new AppError('Fecha invalida', 400);
    return date;
  }

  private static dateRange(query: CalendarQuery) {
    const now = new Date();
    const fromFallback = new Date(now);
    fromFallback.setDate(now.getDate() - 30);
    const toFallback = new Date(now);
    toFallback.setDate(now.getDate() + 90);
    return {
      from: this.parseDate(query.from, fromFallback)!,
      to: this.parseDate(query.to, toFallback)!,
    };
  }

  private static async assertProjectUnit(
    unitId: string,
    projectId?: number | null
  ) {
    if (!projectId) return;
    const focus = await prisma.orgUnitProjectFocus.findFirst({
      where: {
        unitId,
        projectId,
        isCurrent: true,
        status: { not: 'INACTIVE' },
      },
      select: { id: true },
    });
    if (!focus)
      throw new AppError('El proyecto no pertenece a esta unidad', 409);
  }

  private static normalizeMeeting(meeting: any) {
    return {
      type: 'MEETING',
      sourceId: meeting.id,
      title: meeting.title,
      startAt: meeting.scheduledAt,
      endAt: meeting.endedAt,
      status: meeting.status,
      unit: meeting.unit,
      project: meeting.projects?.[0]?.project || null,
    };
  }

  private static normalizeActivity(activity: any) {
    return {
      type: 'ACTIVITY',
      sourceId: activity.id,
      title: activity.title,
      startAt: activity.startAt,
      endAt: activity.endAt,
      status: activity.status,
      unit: activity.unit,
      project: activity.project,
    };
  }

  private static normalizeCommitment(commitment: any) {
    return {
      type: 'COMMITMENT',
      sourceId: commitment.id,
      title: commitment.title,
      startAt: commitment.dueDate || commitment.createdAt,
      endAt: null,
      status: commitment.status,
      confirmationStatus: commitment.confirmationStatus,
      unit: commitment.unit,
      project: commitment.project,
    };
  }

  public static async list(userInfo: UserType, query: CalendarQuery) {
    const { from, to } = this.dateRange(query);
    const scope = query.scope || 'person';
    const projectId = query.projectId ? Number(query.projectId) : undefined;

    let unitIds: string[] | undefined;
    if (scope === 'unit' || scope === 'project') {
      if (!query.unitId) throw new AppError('Seleccione una unidad', 400);
      await MeetingPermissionService.assertCanReadUnit(userInfo, query.unitId);
      unitIds = [query.unitId];
    }

    const meetingWhere: any = {
      scheduledAt: { gte: from, lte: to },
      unitId: unitIds ? { in: unitIds } : undefined,
      projects: projectId ? { some: { projectId } } : undefined,
    };
    const activityWhere: any = {
      startAt: { gte: from, lte: to },
      unitId: unitIds ? { in: unitIds } : undefined,
      projectId,
    };
    const commitmentWhere: any = {
      OR: [{ dueDate: { gte: from, lte: to } }, { dueDate: null }],
      unitId: unitIds ? { in: unitIds } : undefined,
      projectId,
      confirmationStatus: 'CONFIRMED',
      status: {
        in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] as CommitmentStatus[],
      },
    };

    if (scope === 'person') {
      meetingWhere.OR = [
        { createdById: userInfo.id },
        { participants: { some: { userId: userInfo.id } } },
      ];
      activityWhere.OR = [
        { createdById: userInfo.id },
        { participants: { some: { userId: userInfo.id } } },
      ];
      commitmentWhere.OR = [
        { dueDate: { gte: from, lte: to } },
        { assignees: { some: { userId: userInfo.id } } },
        { proposedById: userInfo.id },
      ];
    }

    const [meetings, activities, commitments] = await Promise.all([
      prisma.meeting.findMany({
        where: meetingWhere,
        include: {
          unit: { select: { id: true, name: true, type: true } },
          projects: {
            include: { project: { select: { id: true, name: true } } },
            take: 1,
          },
        },
      }),
      prisma.calendarActivity.findMany({
        where: activityWhere,
        include: {
          unit: { select: { id: true, name: true, type: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.commitment.findMany({
        where: commitmentWhere,
        include: {
          unit: { select: { id: true, name: true, type: true } },
          project: { select: { id: true, name: true } },
        },
      }),
    ]);

    return [
      ...meetings.map(this.normalizeMeeting),
      ...activities.map(this.normalizeActivity),
      ...commitments.map(this.normalizeCommitment),
    ].sort(
      (first, second) =>
        new Date(first.startAt).getTime() - new Date(second.startAt).getTime()
    );
  }

  public static async createActivity(userInfo: UserType, data: ActivityInput) {
    if (!data?.unitId || !data.title || !data.startAt)
      throw new AppError('Ingrese unidad, titulo y fecha de actividad', 400);
    await MeetingPermissionService.assertCanManageUnitWork(
      userInfo,
      data.unitId
    );
    await this.assertProjectUnit(data.unitId, data.projectId);
    const startAt = this.parseDate(
      data.startAt instanceof Date ? data.startAt.toISOString() : data.startAt
    )!;
    const endAt = data.endAt
      ? this.parseDate(
          data.endAt instanceof Date ? data.endAt.toISOString() : data.endAt
        )
      : null;
    return prisma.calendarActivity.create({
      data: {
        unitId: data.unitId,
        projectId: data.projectId,
        meetingId: data.meetingId,
        title: data.title.trim(),
        description: data.description,
        startAt,
        endAt,
        allDay: Boolean(data.allDay),
        status: data.status || 'SCHEDULED',
        priority: data.priority || 'NORMAL',
        createdById: userInfo.id,
        participants: data.participantUserIds?.length
          ? {
              createMany: {
                data: data.participantUserIds.map(userId => ({ userId })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
    });
  }

  public static async updateActivity(
    userInfo: UserType,
    id: string,
    data: Partial<ActivityInput>
  ) {
    const activity = await prisma.calendarActivity.findUnique({
      where: { id },
      select: { unitId: true },
    });
    if (!activity) throw new AppError('Actividad no encontrada', 404);
    await MeetingPermissionService.assertCanManageUnitWork(
      userInfo,
      activity.unitId
    );
    await this.assertProjectUnit(
      data.unitId || activity.unitId,
      data.projectId
    );
    const updated = await prisma.calendarActivity.update({
      where: { id },
      data: {
        unitId: data.unitId,
        projectId: data.projectId,
        meetingId: data.meetingId,
        title: data.title?.trim(),
        description: data.description,
        startAt: data.startAt
          ? this.parseDate(
              data.startAt instanceof Date
                ? data.startAt.toISOString()
                : data.startAt
            )
          : undefined,
        endAt: data.endAt
          ? this.parseDate(
              data.endAt instanceof Date ? data.endAt.toISOString() : data.endAt
            )
          : data.endAt === null
          ? null
          : undefined,
        allDay: data.allDay,
        status: data.status,
        priority: data.priority,
      },
    });
    if (data.participantUserIds) {
      await prisma.$transaction([
        prisma.calendarActivityParticipant.deleteMany({
          where: { activityId: id },
        }),
        prisma.calendarActivityParticipant.createMany({
          data: data.participantUserIds.map(userId => ({
            activityId: id,
            userId,
          })),
          skipDuplicates: true,
        }),
      ]);
    }
    return updated;
  }

  public static async deleteActivity(userInfo: UserType, id: string) {
    const activity = await prisma.calendarActivity.findUnique({
      where: { id },
      select: { unitId: true },
    });
    if (!activity) throw new AppError('Actividad no encontrada', 404);
    await MeetingPermissionService.assertCanManageUnitWork(
      userInfo,
      activity.unitId
    );
    return prisma.calendarActivity.delete({
      where: { id },
      select: { id: true },
    });
  }
}

export default CalendarServices;

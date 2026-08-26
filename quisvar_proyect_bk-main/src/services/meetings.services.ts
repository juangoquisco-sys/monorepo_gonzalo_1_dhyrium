import { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import {
  MeetingAgendaScope,
  MeetingAgendaStatus,
  MeetingLifecycleEventType,
  MeetingParticipantOrigin,
  MeetingParticipantStatus,
  MeetingScope,
  MeetingStatus,
  prisma,
} from '@/utils/prisma.server';
import MeetingPermissionService from '@/services/meetingPermission.services';
import MeetingViewConfigurationServices from '@/services/meetingViewConfiguration.services';

type ExternalContactInput = {
  id?: string;
  name?: string;
  position?: string | null;
  organization?: string | null;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  notes?: string | null;
};

type MeetingParticipantInput = {
  id?: string;
  userId?: number;
  externalContactId?: string;
  externalContact?: ExternalContactInput;
  status?: MeetingParticipantStatus;
  role?: string;
  notes?: string;
  origin?: 'UNIT_MEMBER' | 'INVITED';
};

type MeetingAgendaItemInput = {
  id?: string;
  projectId?: number | null;
  activityId?: string | null;
  commitmentId?: string | null;
  title: string;
  description?: string | null;
  minutes?: string | null;
  scope?: MeetingAgendaScope;
  status?: MeetingAgendaStatus;
  order?: number;
};

type MeetingCreateInput = {
  unitId: string;
  title: string;
  scheduledAt?: string | Date;
  projectIds?: number[];
  participants?: MeetingParticipantInput[];
  agendaItems?: MeetingAgendaItemInput[];
};

type MeetingUpdateInput = Partial<
  Pick<MeetingCreateInput, 'title' | 'scheduledAt'>
> & {
  summary?: string | null;
  status?: MeetingStatus;
};

class MeetingsServices {
  private static readonly resumeReasonGraceMs = 15 * 60 * 1000;

  private static reportStatusPriority(status: string) {
    const priorities: Record<string, number> = {
      PRESENTED: 4,
      READY: 3,
      DRAFT: 2,
      ARCHIVED: 1,
    };
    return priorities[status] || 0;
  }

  private static getReportPresenterKey(report: {
    presenterKey: string | null;
    presenterType: string;
    unitId: string;
    presenterUserId: number | null;
    createdById: number;
    participants?: { userId: number }[];
  }) {
    if (report.presenterKey) return report.presenterKey;
    if (report.presenterType === 'GROUP') return `GROUP:${report.unitId}`;
    if (report.presenterType === 'TEAM') {
      const ids = (report.participants || [])
        .map(participant => participant.userId)
        .sort((first, second) => first - second);
      return `TEAM:${ids.join(',')}`;
    }
    return `USER:${report.presenterUserId || report.createdById}`;
  }

  private static dedupeReportsByPresenter<
    T extends {
      id: string;
      projectId: number;
      status: string;
      updatedAt: Date;
      presenterKey: string | null;
      presenterType: string;
      unitId: string;
      presenterUserId: number | null;
      createdById: number;
      participants?: { userId: number }[];
    }
  >(reports: T[]) {
    const selected = new Map<string, T>();
    reports.forEach(report => {
      const key = `${report.projectId}:${this.getReportPresenterKey(report)}`;
      const current = selected.get(key);
      if (!current) {
        selected.set(key, report);
        return;
      }
      const currentPriority = this.reportStatusPriority(current.status);
      const nextPriority = this.reportStatusPriority(report.status);
      if (
        nextPriority > currentPriority ||
        (nextPriority === currentPriority &&
          report.updatedAt > current.updatedAt)
      ) {
        selected.set(key, report);
      }
    });
    return Array.from(selected.values());
  }

  private static includeMeeting = {
    unit: { select: { id: true, name: true, type: true } },
    createdBy: {
      select: {
        id: true,
        profile: { select: { firstName: true, lastName: true } },
      },
    },
    projects: {
      include: {
        project: {
          select: {
            id: true,
            name: true,
            contract: {
              select: { id: true, cui: true, projectShortName: true },
            },
          },
        },
        minutes: true,
      },
      orderBy: { priority: 'asc' as const },
    },
    participants: {
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true, job: true } },
          },
        },
        externalContact: true,
      },
      orderBy: [{ origin: 'asc' as const }, { createdAt: 'asc' as const }],
    },
    minutes: true,
    lifecycleEvents: {
      include: {
        actor: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { occurredAt: 'desc' as const },
    },
    actaRevisions: {
      select: {
        id: true,
        version: true,
        status: true,
        createdAt: true,
        finalizedAt: true,
      },
      orderBy: { version: 'desc' as const },
    },
    agendaItems: {
      include: {
        project: {
          select: {
            id: true,
            name: true,
            contract: { select: { cui: true, projectShortName: true } },
          },
        },
        activity: {
          select: { id: true, title: true, startAt: true, status: true },
        },
        commitment: {
          select: {
            id: true,
            title: true,
            status: true,
            confirmationStatus: true,
          },
        },
      },
      orderBy: [{ order: 'asc' as const }, { createdAt: 'asc' as const }],
    },
    reports: {
      include: { items: { orderBy: { order: 'asc' as const } } },
      orderBy: { updatedAt: 'desc' as const },
    },
    commitments: {
      include: {
        project: { select: { id: true, name: true } },
        proposedBy: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        confirmedBy: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
            unit: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' as const }, { createdAt: 'desc' as const }],
    },
  };

  public static async create(userInfo: UserType, data: MeetingCreateInput) {
    await this.assertCanManageMeetingUnit(userInfo, data?.unitId);
    if (!data?.unitId || !data.title)
      throw new AppError('Ingrese unidad y titulo de reunion', 400);

    const scheduledAt = data.scheduledAt
      ? new Date(data.scheduledAt)
      : new Date();
    if (Number.isNaN(scheduledAt.getTime()))
      throw new AppError('Fecha de reunion invalida', 400);
    const presentation = await MeetingViewConfigurationServices.resolveForUnit(
      data.unitId
    );

    const meeting = await prisma.meeting.create({
      data: {
        unitId: data.unitId,
        title: data.title,
        scheduledAt,
        scope: presentation.scope,
        defaultView: presentation.defaultView,
        visibleViews: presentation.visibleViews,
        createdById: userInfo.id,
        projects: data.projectIds?.length
          ? {
              createMany: {
                data: data.projectIds.map((projectId, index) => ({
                  projectId,
                  priority: index,
                })),
                skipDuplicates: true,
              },
            }
          : undefined,
        minutes: { create: { scope: 'GENERAL', content: '' } },
      },
    });
    if (data.participants?.length) {
      await this.addParticipantRows(userInfo, meeting.id, data.participants);
    }
    await this.createAgendaRows(meeting.id, [
      ...(data.agendaItems || []),
      ...(data.projectIds || []).map((projectId, index) => ({
        projectId,
        title: 'Seguimiento del proyecto',
        scope: MeetingAgendaScope.PROJECT,
        order: (data.agendaItems?.length || 0) + index,
      })),
    ]);
    return this.find(userInfo, meeting.id);
  }

  public static async find(userInfo: UserType, id: string) {
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: this.includeMeeting,
    });
    if (!meeting) throw new AppError('Reunion no encontrada', 404);
    await MeetingPermissionService.assertCanReadUnit(userInfo, meeting.unitId);

    const projectIds = meeting.projects.map(project => project.projectId);
    if (!projectIds.length) return meeting;

    const preparedReports = await prisma.progressReport.findMany({
      where: {
        unitId: meeting.unitId,
        projectId: { in: projectIds },
        status: { not: 'ARCHIVED' },
        OR: [{ meetingId: id }, { meetingId: null }],
      },
      include: {
        items: { orderBy: { order: 'asc' as const } },
        participants: { select: { userId: true } },
        presenter: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true, job: true } },
          },
        },
        createdBy: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true, job: true } },
          },
        },
      },
      orderBy: [{ status: 'asc' as const }, { updatedAt: 'desc' as const }],
    });

    return {
      ...meeting,
      reports: this.dedupeReportsByPresenter(preparedReports),
    };
  }

  public static async update(
    userInfo: UserType,
    id: string,
    data: MeetingUpdateInput
  ) {
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      select: { unitId: true },
    });
    if (!meeting) throw new AppError('Reunion no encontrada', 404);
    await this.assertCanManageMeetingUnit(userInfo, meeting.unitId);
    const scheduledAt = data.scheduledAt
      ? new Date(data.scheduledAt)
      : undefined;
    if (scheduledAt && Number.isNaN(scheduledAt.getTime()))
      throw new AppError('Fecha de reunion invalida', 400);
    return prisma.meeting.update({
      where: { id },
      data: {
        title: data.title,
        summary: data.summary,
        status: data.status,
        scheduledAt,
      },
      include: this.includeMeeting,
    });
  }

  public static async start(userInfo: UserType, id: string) {
    await this.assertCanManageMeeting(userInfo, id);
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!meeting) throw new AppError('Reunion no encontrada', 404);
    if (meeting.status === MeetingStatus.LIVE) return this.find(userInfo, id);
    if (meeting.status === MeetingStatus.ENDED)
      throw new AppError(
        'Use reanudar para continuar una reunion finalizada',
        409
      );
    if (meeting.status === MeetingStatus.CANCELLED)
      throw new AppError('No se puede iniciar una reunion cancelada', 409);

    await prisma.$transaction(async tx => {
      await tx.meeting.update({
        where: { id },
        data: {
          status: MeetingStatus.LIVE,
          startedAt: new Date(),
          endedAt: null,
        },
      });
      await tx.meetingLifecycleEvent.create({
        data: {
          meetingId: id,
          type: MeetingLifecycleEventType.STARTED,
          actorId: userInfo.id,
        },
      });
    });
    return this.find(userInfo, id);
  }

  public static async updateScope(
    userInfo: UserType,
    id: string,
    rawScope?: string
  ) {
    if (!Object.values(MeetingScope).includes(rawScope as MeetingScope))
      throw new AppError('Alcance de reunion invalido', 400);
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      select: { unitId: true },
    });
    if (!meeting) throw new AppError('Reunion no encontrada', 404);
    await this.assertCanManageMeetingUnit(userInfo, meeting.unitId);
    await prisma.meeting.update({
      where: { id },
      data: { scope: rawScope as MeetingScope },
    });
    return this.find(userInfo, id);
  }

  public static async list(
    userInfo: UserType,
    unitId?: string,
    rawStatus?: string
  ) {
    if (!unitId) throw new AppError('Seleccione una unidad', 400);
    await MeetingPermissionService.assertCanReadUnit(userInfo, unitId);
    const status = rawStatus as MeetingStatus | undefined;
    if (status && !Object.values(MeetingStatus).includes(status))
      throw new AppError('Estado de reunion invalido', 400);
    return prisma.meeting.findMany({
      where: { unitId, status },
      select: {
        id: true,
        unitId: true,
        title: true,
        scheduledAt: true,
        startedAt: true,
        endedAt: true,
        status: true,
        updatedAt: true,
        _count: { select: { participants: true, commitments: true } },
      },
      orderBy: [{ scheduledAt: 'desc' }, { updatedAt: 'desc' }],
      take: 50,
    });
  }

  public static async end(userInfo: UserType, id: string) {
    await this.assertCanManageMeeting(userInfo, id);
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!meeting) throw new AppError('Reunion no encontrada', 404);
    if (meeting.status !== MeetingStatus.LIVE)
      throw new AppError('Solo se puede finalizar una reunion en vivo', 409);

    await prisma.$transaction(async tx => {
      await tx.meeting.update({
        where: { id },
        data: { status: MeetingStatus.ENDED, endedAt: new Date() },
      });
      await tx.meetingLifecycleEvent.create({
        data: {
          meetingId: id,
          type: MeetingLifecycleEventType.ENDED,
          actorId: userInfo.id,
        },
      });
    });
    return this.find(userInfo, id);
  }

  public static async resume(
    userInfo: UserType,
    id: string,
    rawReason?: string | null
  ) {
    await this.assertCanManageMeeting(userInfo, id);
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      select: { status: true, endedAt: true },
    });
    if (!meeting) throw new AppError('Reunion no encontrada', 404);
    if (meeting.status !== MeetingStatus.ENDED)
      throw new AppError('Solo se puede continuar una reunion finalizada', 409);

    const reason = rawReason?.trim() || null;
    const endedAt = meeting.endedAt?.getTime() || 0;
    const requiresReason =
      !endedAt || Date.now() - endedAt > this.resumeReasonGraceMs;
    if (requiresReason && !reason)
      throw new AppError(
        'Indique el motivo para continuar una reunion finalizada hace mas de 15 minutos',
        400
      );

    await prisma.$transaction(async tx => {
      await tx.meeting.update({
        where: { id },
        data: { status: MeetingStatus.LIVE, endedAt: null },
      });
      await tx.meetingLifecycleEvent.create({
        data: {
          meetingId: id,
          type: MeetingLifecycleEventType.RESUMED,
          reason,
          actorId: userInfo.id,
        },
      });
    });
    return this.find(userInfo, id);
  }

  public static async updateAttendance(
    userInfo: UserType,
    meetingId: string,
    participants: MeetingParticipantInput[] = []
  ) {
    await this.assertCanManageMeeting(userInfo, meetingId);
    if (!participants.length) return this.find(userInfo, meetingId);
    await this.upsertParticipantRows(userInfo, meetingId, participants);
    return this.find(userInfo, meetingId);
  }

  public static async addParticipants(
    userInfo: UserType,
    meetingId: string,
    participants: MeetingParticipantInput[] = []
  ) {
    await this.assertCanManageMeeting(userInfo, meetingId);
    if (!participants.length) throw new AppError('Agregue asistentes', 400);
    await this.addParticipantRows(userInfo, meetingId, participants);
    return this.find(userInfo, meetingId);
  }

  public static async removeParticipant(
    userInfo: UserType,
    meetingId: string,
    participantId: string
  ) {
    await this.assertCanManageMeeting(userInfo, meetingId);
    const participant = await prisma.meetingParticipant.findUnique({
      where: { id: participantId },
      select: { id: true, meetingId: true },
    });
    if (!participant || participant.meetingId !== meetingId)
      throw new AppError('Asistente no encontrado en la reunion', 404);
    await prisma.meetingParticipant.delete({ where: { id: participantId } });
    return this.find(userInfo, meetingId);
  }

  public static async participantCandidates(
    userInfo: UserType,
    meetingId: string,
    search?: string
  ) {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: {
        unitId: true,
        participants: {
          where: { userId: { not: null } },
          select: { userId: true },
        },
      },
    });
    if (!meeting) throw new AppError('Reunion no encontrada', 404);
    await MeetingPermissionService.assertCanReadUnit(userInfo, meeting.unitId);
    const excludedIds = meeting.participants
      .map(participant => participant.userId)
      .filter((id): id is number => Boolean(id));
    const cleanSearch = search?.trim();
    return prisma.users.findMany({
      where: {
        status: true,
        id: { notIn: excludedIds },
        ...(cleanSearch
          ? {
              OR: [
                { email: { contains: cleanSearch, mode: 'insensitive' } },
                {
                  profile: {
                    firstName: { contains: cleanSearch, mode: 'insensitive' },
                  },
                },
                {
                  profile: {
                    lastName: { contains: cleanSearch, mode: 'insensitive' },
                  },
                },
                {
                  profile: {
                    dni: { contains: cleanSearch, mode: 'insensitive' },
                  },
                },
                {
                  profile: {
                    job: { contains: cleanSearch, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        profile: {
          select: { firstName: true, lastName: true, dni: true, job: true },
        },
      },
      orderBy: [{ profile: { firstName: 'asc' } }, { email: 'asc' }],
      take: 25,
    });
  }

  public static async updateMinutes(
    userInfo: UserType,
    meetingId: string,
    content: string
  ) {
    await this.assertCanManageMeeting(userInfo, meetingId);
    const minute = await prisma.meetingMinute.findFirst({
      where: { meetingId, scope: 'GENERAL', meetingProjectId: null },
      select: { id: true },
    });
    if (minute) {
      await prisma.meetingMinute.update({
        where: { id: minute.id },
        data: { content },
      });
    } else {
      await prisma.meetingMinute.create({
        data: { meetingId, scope: 'GENERAL', content },
      });
    }
    return this.find(userInfo, meetingId);
  }

  public static async updateProjectMinutes(
    userInfo: UserType,
    meetingId: string,
    projectId: number,
    content: string
  ) {
    await this.assertCanManageMeeting(userInfo, meetingId);
    const meetingProject = await prisma.meetingProject.findUnique({
      where: { meetingId_projectId: { meetingId, projectId } },
      select: { id: true },
    });
    if (!meetingProject)
      throw new AppError('Proyecto no encontrado en la reunion', 404);

    const minute = await prisma.meetingMinute.findFirst({
      where: {
        meetingId,
        meetingProjectId: meetingProject.id,
        scope: 'PROJECT',
      },
      select: { id: true },
    });
    if (minute) {
      await prisma.meetingMinute.update({
        where: { id: minute.id },
        data: { content },
      });
    } else {
      await prisma.meetingMinute.create({
        data: {
          meetingId,
          meetingProjectId: meetingProject.id,
          scope: 'PROJECT',
          content,
        },
      });
    }
    return this.find(userInfo, meetingId);
  }

  public static async addAgendaItem(
    userInfo: UserType,
    meetingId: string,
    data: MeetingAgendaItemInput
  ) {
    await this.assertCanManageMeeting(userInfo, meetingId);
    if (!data.title?.trim()) throw new AppError('Ingrese tema de agenda', 400);
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { unitId: true },
    });
    if (!meeting) throw new AppError('Reunion no encontrada', 404);
    await this.assertAgendaReferences(meeting.unitId, data);
    const last = await prisma.meetingAgendaItem.findFirst({
      where: { meetingId },
      select: { order: true },
      orderBy: { order: 'desc' },
    });
    await prisma.meetingAgendaItem.create({
      data: {
        meetingId,
        projectId: data.projectId || null,
        activityId: data.activityId || null,
        commitmentId: data.commitmentId || null,
        title: data.title.trim(),
        description: data.description,
        minutes: data.minutes,
        scope: data.scope || (data.projectId ? 'PROJECT' : 'GENERAL'),
        status: data.status || 'OPEN',
        order: data.order ?? (last?.order ?? -1) + 1,
      },
    });
    return this.find(userInfo, meetingId);
  }

  public static async updateAgendaItem(
    userInfo: UserType,
    meetingId: string,
    itemId: string,
    data: Partial<MeetingAgendaItemInput>
  ) {
    await this.assertCanManageMeeting(userInfo, meetingId);
    const item = await prisma.meetingAgendaItem.findUnique({
      where: { id: itemId },
      select: { meetingId: true, meeting: { select: { unitId: true } } },
    });
    if (!item || item.meetingId !== meetingId)
      throw new AppError('Tema de agenda no encontrado', 404);
    await this.assertAgendaReferences(item.meeting.unitId, data);
    await prisma.meetingAgendaItem.update({
      where: { id: itemId },
      data: {
        projectId: data.projectId,
        activityId: data.activityId,
        commitmentId: data.commitmentId,
        title: data.title?.trim(),
        description: data.description,
        minutes: data.minutes,
        scope: data.scope,
        status: data.status,
        order: data.order,
      },
    });
    return this.find(userInfo, meetingId);
  }

  private static async assertCanManageMeetingUnit(
    userInfo: UserType,
    unitId?: string
  ) {
    if (MeetingPermissionService.hasModuleRole(userInfo, ['MOD'])) return;
    if (!unitId) throw new AppError('No tiene permisos para esta accion', 403);
    await MeetingPermissionService.assertCanManageUnitProjects(
      userInfo,
      unitId
    );
  }

  private static async assertCanManageMeeting(
    userInfo: UserType,
    meetingId: string
  ) {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { unitId: true },
    });
    if (!meeting) throw new AppError('Reunion no encontrada', 404);
    await this.assertCanManageMeetingUnit(userInfo, meeting.unitId);
  }

  private static async assertAgendaReferences(
    unitId: string,
    data: Partial<MeetingAgendaItemInput>
  ) {
    if (data.projectId) {
      const focus = await prisma.orgUnitProjectFocus.findFirst({
        where: {
          unitId,
          projectId: data.projectId,
          isCurrent: true,
          status: { not: 'INACTIVE' },
        },
        select: { id: true },
      });
      if (!focus)
        throw new AppError('El proyecto no pertenece a esta unidad', 409);
    }
    if (data.activityId) {
      const activity = await prisma.calendarActivity.findUnique({
        where: { id: data.activityId },
        select: { unitId: true },
      });
      if (!activity || activity.unitId !== unitId)
        throw new AppError('Actividad no encontrada en esta unidad', 400);
    }
    if (data.commitmentId) {
      const commitment = await prisma.commitment.findUnique({
        where: { id: data.commitmentId },
        select: { unitId: true },
      });
      if (!commitment || commitment.unitId !== unitId)
        throw new AppError('Compromiso no encontrado en esta unidad', 400);
    }
  }

  private static async createAgendaRows(
    meetingId: string,
    agendaItems: MeetingAgendaItemInput[]
  ) {
    const cleaned = agendaItems
      .filter(item => item.title?.trim())
      .map((item, index) => ({
        meetingId,
        projectId: item.projectId || null,
        activityId: item.activityId || null,
        commitmentId: item.commitmentId || null,
        title: item.title.trim(),
        description: item.description,
        minutes: item.minutes,
        scope:
          item.scope ||
          (item.projectId
            ? MeetingAgendaScope.PROJECT
            : MeetingAgendaScope.GENERAL),
        status: item.status || MeetingAgendaStatus.OPEN,
        order: item.order ?? index,
      }));
    if (!cleaned.length) return;
    await prisma.meetingAgendaItem.createMany({ data: cleaned });
  }

  private static getUserDisplay(user: {
    email?: string | null;
    profile?: {
      firstName?: string | null;
      lastName?: string | null;
      job?: string | null;
    } | null;
  }) {
    const profile = user.profile;
    const name = `${profile?.firstName ?? ''} ${
      profile?.lastName ?? ''
    }`.trim();
    return {
      displayName: name || user.email || 'Usuario sin nombre',
      position: profile?.job || null,
      organization: null,
    };
  }

  private static async resolveParticipant(
    userInfo: UserType,
    input: MeetingParticipantInput
  ) {
    const hasUser = Boolean(input.userId);
    const hasExternal = Boolean(
      input.externalContactId || input.externalContact
    );
    if (hasUser === hasExternal)
      throw new AppError('Seleccione usuario o contacto externo', 400);

    if (hasUser) {
      const user = await prisma.users.findUnique({
        where: { id: Number(input.userId) },
        select: {
          id: true,
          email: true,
          status: true,
          profile: { select: { firstName: true, lastName: true, job: true } },
        },
      });
      if (!user || !user.status)
        throw new AppError('Usuario activo no encontrado', 404);
      return {
        userId: user.id,
        externalContactId: null,
        participantType: 'USER' as const,
        origin:
          input.origin === 'UNIT_MEMBER'
            ? MeetingParticipantOrigin.UNIT_MEMBER
            : MeetingParticipantOrigin.INVITED,
        status: input.status || MeetingParticipantStatus.PRESENT,
        role: input.role,
        notes: input.notes,
        ...this.getUserDisplay(user),
      };
    }

    const contact =
      input.externalContactId || input.externalContact?.id
        ? await prisma.meetingExternalContact.findFirst({
            where: {
              id: input.externalContactId || input.externalContact?.id,
              isActive: true,
            },
          })
        : await this.createExternalContact(userInfo, input.externalContact);
    if (!contact) throw new AppError('Contacto externo no encontrado', 404);
    return {
      userId: null,
      externalContactId: contact.id,
      participantType: 'EXTERNAL' as const,
      origin: 'INVITED' as const,
      status: input.status || MeetingParticipantStatus.PRESENT,
      role: input.role,
      notes: input.notes,
      displayName: contact.name,
      position: contact.position,
      organization: contact.organization,
    };
  }

  private static async createExternalContact(
    userInfo: UserType,
    input?: ExternalContactInput
  ) {
    if (!input?.name?.trim())
      throw new AppError('Ingrese nombre del invitado externo', 400);
    return prisma.meetingExternalContact.create({
      data: {
        name: input.name.trim(),
        position: input.position?.trim() || null,
        organization: input.organization?.trim() || null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        document: input.document?.trim() || null,
        notes: input.notes?.trim() || null,
        createdById: userInfo.id,
      },
    });
  }

  private static async addParticipantRows(
    userInfo: UserType,
    meetingId: string,
    participants: MeetingParticipantInput[]
  ) {
    for (const participant of participants) {
      const data = await this.resolveParticipant(userInfo, participant);
      const duplicateFilters: {
        userId?: number;
        externalContactId?: string;
      }[] = [];
      if (data.userId) duplicateFilters.push({ userId: data.userId });
      if (data.externalContactId)
        duplicateFilters.push({ externalContactId: data.externalContactId });
      const exists = await prisma.meetingParticipant.findFirst({
        where: {
          meetingId,
          OR: duplicateFilters,
        },
        select: { id: true },
      });
      if (exists) continue;
      await prisma.meetingParticipant.create({
        data: {
          meetingId,
          ...data,
        },
      });
    }
  }

  private static async upsertParticipantRows(
    userInfo: UserType,
    meetingId: string,
    participants: MeetingParticipantInput[]
  ) {
    for (const participant of participants) {
      if (participant.id) {
        const currentParticipant = await prisma.meetingParticipant.findUnique({
          where: { id: participant.id },
          select: { meetingId: true },
        });
        if (!currentParticipant || currentParticipant.meetingId !== meetingId)
          throw new AppError('Asistente no encontrado en la reunion', 404);
        await prisma.meetingParticipant.update({
          where: { id: participant.id },
          data: {
            status: participant.status,
            role: participant.role,
            notes: participant.notes,
          },
        });
        continue;
      }
      const data = await this.resolveParticipant(userInfo, participant);
      const duplicateFilters: {
        userId?: number;
        externalContactId?: string;
      }[] = [];
      if (data.userId) duplicateFilters.push({ userId: data.userId });
      if (data.externalContactId)
        duplicateFilters.push({ externalContactId: data.externalContactId });
      const existing = await prisma.meetingParticipant.findFirst({
        where: {
          meetingId,
          OR: duplicateFilters,
        },
        select: { id: true },
      });
      if (existing) {
        await prisma.meetingParticipant.update({
          where: { id: existing.id },
          data: {
            status: data.status,
            role: data.role,
            notes: data.notes,
          },
        });
      } else {
        await prisma.meetingParticipant.create({
          data: { meetingId, ...data },
        });
      }
    }
  }
}

export default MeetingsServices;

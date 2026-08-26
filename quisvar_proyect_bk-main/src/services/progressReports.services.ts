import { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import type {
  MeetingPresenterType,
  ProgressReportItemSource,
  ProgressReportItemStatus,
  ProgressReportStatus,
  ReportIndexTemplateScope,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import MeetingPermissionService from '@/services/meetingPermission.services';

type ReportItemInput = {
  templateId?: string;
  name: string;
  source?: ProgressReportItemSource;
  status?: ProgressReportItemStatus;
  progress?: number;
  uploadDate?: string | Date | null;
  supportDate?: string | Date | null;
  approvalDate?: string | Date | null;
  observations?: string | null;
  responsible?: string | null;
  order?: number;
};

type ReportInput = {
  unitId: string;
  projectId: number;
  meetingId?: string | null;
  title?: string | null;
  presenterType?: MeetingPresenterType;
  presenterUserId?: number | null;
  presenterLabel?: string | null;
  participantUserIds?: number[];
  templateId?: string | null;
  overallProgress?: number;
  observations?: string | null;
  status?: ProgressReportStatus;
  items?: ReportItemInput[];
};

type ReportIndexTemplateInput = {
  name: string;
  scope?: ReportIndexTemplateScope;
  unitId?: string | null;
  description?: string | null;
  isActive?: boolean;
  items?: {
    name: string;
    source?: ProgressReportItemSource;
    defaultStatus?: ProgressReportItemStatus;
    defaultProgress?: number;
    defaultObservations?: string | null;
    order?: number;
  }[];
};

type TemplateInput = {
  name: string;
  source?: ProgressReportItemSource;
  description?: string | null;
  isActive?: boolean;
};

const ASITEC_INDEXES: ReportIndexTemplateInput[] = [
  {
    name: 'Especialidades ASITEC',
    scope: 'GLOBAL',
    description:
      'Indice clasico para reportar avances por especialidad ASITEC.',
    items: [
      'Estudio de basicos',
      'Especialidad de estructuras',
      'Especialidad de arquitectura',
      'Especialidad de instalaciones sanitarias',
      'Especialidad de instalaciones electricas',
      'Especialidad de comunicaciones',
    ].map((name, index) => ({
      name,
      source: 'ASITEC',
      defaultStatus: 'IN_REVIEW',
      defaultProgress: 0,
      defaultObservations: '',
      order: index,
    })),
  },
  {
    name: 'Basicos ASITEC',
    scope: 'GLOBAL',
    description: 'Indice base para reportes de estudios basicos y saneamiento.',
    items: [
      'Topografia',
      'Suelos',
      'Demanda',
      'EVAR',
      'Anteproyecto',
      'Saneamiento fisico legal',
    ].map((name, index) => ({
      name,
      source: 'ASITEC',
      defaultStatus: 'IN_REVIEW',
      defaultProgress: 0,
      defaultObservations: '',
      order: index,
    })),
  },
];

class ProgressReportsServices {
  private static includeReport = {
    unit: { select: { id: true, name: true, type: true } },
    project: {
      select: {
        id: true,
        name: true,
        contract: { select: { id: true, cui: true, projectShortName: true } },
      },
    },
    meeting: {
      select: { id: true, title: true, status: true, scheduledAt: true },
    },
    presenter: {
      select: {
        id: true,
        email: true,
        profile: { select: { firstName: true, lastName: true, job: true } },
      },
    },
    createdBy: {
      select: {
        id: true,
        profile: { select: { firstName: true, lastName: true } },
      },
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
      },
      orderBy: [{ role: 'asc' as const }, { userId: 'asc' as const }],
    },
    items: {
      include: { template: true },
      orderBy: { order: 'asc' as const },
    },
  };

  private static toDate(value?: string | Date | null) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new AppError('Fecha invalida', 400);
    return date;
  }

  private static normalizeItem(item: ReportItemInput, order: number) {
    if (!item.name?.trim()) throw new AppError('Ingrese nombre de item', 400);
    return {
      templateId: item.templateId,
      name: item.name.trim(),
      source: item.source || 'CUSTOM',
      status: item.status || 'IN_PROGRESS',
      progress: Math.max(0, Math.min(100, Number(item.progress ?? 0))),
      uploadDate: this.toDate(item.uploadDate),
      supportDate: this.toDate(item.supportDate),
      approvalDate: this.toDate(item.approvalDate),
      observations: item.observations,
      responsible: item.responsible,
      order: item.order ?? order,
    };
  }

  private static normalizeParticipantIds(ids?: number[]) {
    return Array.from(new Set((ids || []).map(Number).filter(Boolean))).sort(
      (first, second) => first - second
    );
  }

  private static buildPresenterKey(
    presenterType: MeetingPresenterType,
    unitId: string,
    presenterUserId?: number | null,
    participantUserIds?: number[]
  ) {
    if (presenterType === 'GROUP') return `GROUP:${unitId}`;
    if (presenterType === 'TEAM') {
      const ids = this.normalizeParticipantIds(participantUserIds);
      if (ids.length < 2)
        throw new AppError('Seleccione al menos dos miembros para equipo', 400);
      return `TEAM:${ids.join(',')}`;
    }
    if (!presenterUserId) throw new AppError('Seleccione presentador', 400);
    return `USER:${presenterUserId}`;
  }

  private static async getVisibleUnitIds(userInfo: UserType) {
    const units = await prisma.organizationalUnit.findMany({
      where: { isActive: true },
      select: { id: true, parentId: true, type: true },
    });
    const unitsByParent = new Map<string | null, typeof units>();
    units.forEach(unit => {
      const key = unit.parentId ?? null;
      unitsByParent.set(key, [...(unitsByParent.get(key) || []), unit]);
    });
    const reachableUnitIds = new Set<string>();
    const visit = (parentId: string | null) => {
      (unitsByParent.get(parentId) || []).forEach(unit => {
        reachableUnitIds.add(unit.id);
        visit(unit.id);
      });
    };
    visit(null);

    const reachableVisibleUnitIds = units
      .filter(unit => reachableUnitIds.has(unit.id))
      .map(unit => unit.id);

    if (MeetingPermissionService.hasModuleRole(userInfo, ['MOD'])) {
      return reachableVisibleUnitIds;
    }
    const memberships = await prisma.organizationalMembership.findMany({
      where: {
        userId: userInfo.id,
        unitId: { in: reachableVisibleUnitIds },
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      select: { unitId: true },
    });
    return memberships.map(membership => membership.unitId);
  }

  private static async assertProjectBelongsToUnit(
    unitId: string,
    projectId: number
  ) {
    const focus = await prisma.orgUnitProjectFocus.findFirst({
      where: {
        unitId,
        projectId,
        isCurrent: true,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    if (!focus)
      throw new AppError('El proyecto no esta activo en esta oficina', 400);
  }

  private static async assertParticipantsBelongToUnit(
    unitId: string,
    userIds: number[]
  ) {
    if (!userIds.length) return;
    const memberships = await prisma.organizationalMembership.findMany({
      where: {
        unitId,
        userId: { in: userIds },
        user: { status: true },
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      select: { userId: true },
    });
    const memberIds = new Set(memberships.map(member => member.userId));
    const missingIds = userIds.filter(userId => !memberIds.has(userId));
    if (missingIds.length)
      throw new AppError(
        'Todos los participantes deben pertenecer a la oficina',
        400
      );
  }

  private static async normalizeReportPresenter(
    userInfo: UserType,
    data: ReportInput,
    existing?: {
      unitId: string;
      presenterType: MeetingPresenterType;
      presenterUserId: number | null;
      participants: { userId: number }[];
    }
  ) {
    const unitId = data.unitId || existing?.unitId;
    if (!unitId) throw new AppError('Ingrese unidad', 400);
    const presenterType =
      data.presenterType || existing?.presenterType || 'USER';
    const participantUserIds =
      data.participantUserIds !== undefined
        ? this.normalizeParticipantIds(data.participantUserIds)
        : this.normalizeParticipantIds(
            existing?.participants.map(item => item.userId)
          );
    const presenterUserId =
      presenterType === 'USER'
        ? data.presenterUserId || existing?.presenterUserId || userInfo.id
        : data.presenterUserId ?? existing?.presenterUserId ?? null;
    const isModuleMod = MeetingPermissionService.hasModuleRole(userInfo, [
      'MOD',
    ]);
    const isLocalMod = await MeetingPermissionService.canManageUnitProjects(
      userInfo.id,
      unitId
    );

    await MeetingPermissionService.assertCanCreateReport(
      userInfo,
      unitId,
      presenterType
    );

    if (
      presenterType === 'USER' &&
      !isModuleMod &&
      presenterUserId !== userInfo.id
    )
      throw new AppError('Solo puede crear informes personales propios', 403);
    if (presenterType === 'GROUP' && !isModuleMod && !isLocalMod)
      throw new AppError(
        'Solo MOD o MOD de oficina puede crear informe grupal',
        403
      );
    if (
      presenterType === 'TEAM' &&
      !isModuleMod &&
      !isLocalMod &&
      !participantUserIds.includes(userInfo.id)
    )
      throw new AppError('Debe pertenecer al equipo del informe', 403);

    const participantIds =
      presenterType === 'TEAM'
        ? participantUserIds
        : presenterType === 'USER' && presenterUserId
        ? [presenterUserId]
        : [];
    await this.assertParticipantsBelongToUnit(unitId, participantIds);
    const presenterKey = this.buildPresenterKey(
      presenterType,
      unitId,
      presenterUserId,
      participantIds
    );

    return {
      unitId,
      presenterType,
      presenterUserId,
      participantIds,
      presenterKey,
    };
  }

  private static async getTemplateItems(templateId?: string | null) {
    if (!templateId) return [];
    const template = await prisma.reportIndexTemplate.findFirst({
      where: { id: templateId, isActive: true },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    if (!template) throw new AppError('Indice no encontrado', 404);
    return template.items.map(item => ({
      name: item.name,
      source: item.source,
      status: item.defaultStatus,
      progress: item.defaultProgress,
      observations: item.defaultObservations,
      order: item.order,
    }));
  }

  private static participantCreateData(userIds: number[]) {
    return userIds.map((userId, index) => ({
      userId,
      role: index === 0 ? ('PRESENTER' as const) : ('SUPPORT' as const),
    }));
  }

  private static async ensureDefaultIndexTemplates() {
    const existing = await prisma.reportIndexTemplate.findMany({
      where: {
        scope: 'GLOBAL',
        name: { in: ASITEC_INDEXES.map(item => item.name) },
      },
      select: { name: true },
    });
    const existingNames = new Set(existing.map(item => item.name));
    const missing = ASITEC_INDEXES.filter(
      item => !existingNames.has(item.name)
    );
    if (!missing.length) return;
    await prisma.$transaction(
      missing.map(template =>
        prisma.reportIndexTemplate.create({
          data: {
            name: template.name,
            scope: 'GLOBAL',
            description: template.description,
            items: {
              createMany: {
                data: (template.items || []).map((item, index) => ({
                  name: item.name,
                  source: item.source || 'ASITEC',
                  defaultStatus: item.defaultStatus || 'IN_REVIEW',
                  defaultProgress: item.defaultProgress ?? 0,
                  defaultObservations: item.defaultObservations,
                  order: item.order ?? index,
                })),
              },
            },
          },
        })
      )
    );
  }

  public static async workspace(userInfo: UserType) {
    MeetingPermissionService.assertModuleRole(userInfo, [
      'MOD',
      'MEMBER',
      'USER',
      'VIEWER',
    ]);
    const unitIds = await this.getVisibleUnitIds(userInfo);
    const isModuleMod = MeetingPermissionService.hasModuleRole(userInfo, [
      'MOD',
    ]);
    const [projectFocus, reports] = await Promise.all([
      prisma.orgUnitProjectFocus.findMany({
        where: {
          unitId: { in: unitIds },
          isCurrent: true,
          status: 'ACTIVE',
        },
        include: {
          unit: { select: { id: true, name: true, type: true } },
          project: {
            include: {
              contract: {
                select: {
                  id: true,
                  cui: true,
                  projectName: true,
                  projectShortName: true,
                  municipality: true,
                  milestones: { orderBy: { dueDate: 'asc' }, take: 5 },
                },
              },
              stages: {
                select: { id: true, name: true, status: true, groupId: true },
                orderBy: { updatedAt: 'desc' },
                take: 6,
              },
            },
          },
        },
        orderBy: [{ unit: { name: 'asc' } }, { updatedAt: 'desc' }],
      }),
      prisma.progressReport.findMany({
        where: {
          unitId: { in: unitIds },
          OR: [
            { createdById: userInfo.id },
            { presenterUserId: userInfo.id },
            { participants: { some: { userId: userInfo.id } } },
            ...(isModuleMod ? [{}] : []),
          ],
        },
        include: this.includeReport,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const readyOwnKeys = new Set(
      reports
        .filter(report => report.status === 'READY' && report.readyKey)
        .map(
          report => `${report.unitId}:${report.projectId}:${report.readyKey}`
        )
    );
    const pending = projectFocus
      .filter(focus => {
        if (isModuleMod) return false;
        return !readyOwnKeys.has(
          `${focus.unitId}:${focus.projectId}:USER:${userInfo.id}`
        );
      })
      .map(focus => ({
        unit: focus.unit,
        projectFocus: focus,
      }));

    const drafts = reports.filter(report => report.status === 'DRAFT');
    const ready = reports.filter(report => report.status === 'READY');
    const presented = reports.filter(report => report.status === 'PRESENTED');
    const teamOrGroup = reports.filter(
      report => report.presenterType !== 'USER'
    );
    const completionRate = projectFocus.length
      ? Math.round(
          ((ready.length + presented.length) / projectFocus.length) * 100
        )
      : 0;

    return {
      stats: {
        pending: pending.length,
        drafts: drafts.length,
        ready: ready.length,
        presented: presented.length,
        teamOrGroup: teamOrGroup.length,
        totalReports: reports.length,
        completionRate,
      },
      pending,
      drafts,
      ready,
      presented,
      teamOrGroup,
      projectFocus,
    };
  }

  public static async find(userInfo: UserType, id: string) {
    await MeetingPermissionService.assertCanReadReport(userInfo, id);
    return prisma.progressReport.findUnique({
      where: { id },
      include: this.includeReport,
    });
  }

  public static async create(userInfo: UserType, data: ReportInput) {
    if (!data?.unitId || !data.projectId)
      throw new AppError('Ingrese unidad y proyecto', 400);
    await this.assertProjectBelongsToUnit(data.unitId, data.projectId);
    const presenter = await this.normalizeReportPresenter(userInfo, data);

    const existingActiveReport = await prisma.progressReport.findFirst({
      where: {
        unitId: data.unitId,
        projectId: data.projectId,
        status: { not: 'ARCHIVED' },
        OR: [
          { presenterKey: presenter.presenterKey },
          ...(presenter.presenterType === 'USER' && presenter.presenterUserId
            ? [{ presenterUserId: presenter.presenterUserId }]
            : []),
        ],
      },
      include: this.includeReport,
      orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }],
    });
    if (existingActiveReport) return existingActiveReport;

    const templateItems = await this.getTemplateItems(data.templateId);
    const items = data.items?.length ? data.items : templateItems;
    const readyKey = data.status === 'READY' ? presenter.presenterKey : null;
    if (readyKey)
      await this.assertNoReadyDuplicate(data.unitId, data.projectId, readyKey);

    return prisma.progressReport.create({
      data: {
        unitId: data.unitId,
        projectId: data.projectId,
        meetingId: data.meetingId,
        presenterType: presenter.presenterType,
        presenterUserId: presenter.presenterUserId,
        presenterLabel: data.presenterLabel,
        title: data.title?.trim() || null,
        presenterKey: presenter.presenterKey,
        readyKey,
        createdById: userInfo.id,
        overallProgress: data.overallProgress ?? 0,
        observations: data.observations,
        status: data.status || 'DRAFT',
        participants: presenter.participantIds.length
          ? {
              createMany: {
                data: this.participantCreateData(presenter.participantIds),
              },
            }
          : undefined,
        items: items.length
          ? {
              createMany: {
                data: items.map((item, index) =>
                  this.normalizeItem(item, index)
                ),
              },
            }
          : undefined,
      },
      include: this.includeReport,
    });
  }

  public static async update(
    userInfo: UserType,
    id: string,
    data: Partial<ReportInput>
  ) {
    const existing = await MeetingPermissionService.assertCanEditReport(
      userInfo,
      id
    );
    const current = await prisma.progressReport.findUnique({
      where: { id },
      include: { participants: { select: { userId: true } } },
    });
    if (!current) throw new AppError('Informe no encontrado', 404);

    const shouldRecalculatePresenter =
      data.presenterType !== undefined ||
      data.presenterUserId !== undefined ||
      data.participantUserIds !== undefined;
    const presenter = shouldRecalculatePresenter
      ? await this.normalizeReportPresenter(
          userInfo,
          {
            ...data,
            unitId: current.unitId,
            projectId: current.projectId,
          } as ReportInput,
          current
        )
      : {
          unitId: current.unitId,
          presenterType: current.presenterType,
          presenterUserId: current.presenterUserId,
          participantIds: current.participants.map(item => item.userId),
          presenterKey: current.presenterKey || '',
        };
    const presenterChanged =
      shouldRecalculatePresenter &&
      presenter.presenterKey !== current.presenterKey;
    const nextStatus = presenterChanged
      ? 'DRAFT'
      : data.status || current.status;
    const nextReadyKey =
      nextStatus === 'READY' && !presenterChanged
        ? current.readyKey || presenter.presenterKey
        : null;

    if (nextReadyKey)
      await this.assertNoReadyDuplicate(
        current.unitId,
        current.projectId,
        nextReadyKey,
        id
      );

    await prisma.progressReport.update({
      where: { id },
      data: {
        meetingId: data.meetingId,
        presenterType: presenter.presenterType,
        presenterUserId: presenter.presenterUserId,
        presenterLabel: data.presenterLabel,
        title:
          data.title === undefined ? undefined : data.title?.trim() || null,
        presenterKey: presenter.presenterKey || current.presenterKey,
        readyKey: nextReadyKey,
        overallProgress: data.overallProgress,
        observations: data.observations,
        status: nextStatus,
      },
    });

    const operations = [];
    if (shouldRecalculatePresenter) {
      operations.push(
        prisma.progressReportParticipant.deleteMany({ where: { reportId: id } })
      );
      if (presenter.participantIds.length) {
        operations.push(
          prisma.progressReportParticipant.createMany({
            data: this.participantCreateData(presenter.participantIds).map(
              item => ({
                reportId: id,
                ...item,
              })
            ),
          })
        );
      }
    }
    if (data.items) {
      operations.push(
        prisma.progressReportItem.deleteMany({ where: { reportId: id } })
      );
      if (data.items.length) {
        operations.push(
          prisma.progressReportItem.createMany({
            data: data.items.map((item, index) => ({
              reportId: id,
              ...this.normalizeItem(item, index),
            })),
          })
        );
      }
    }
    if (operations.length) await prisma.$transaction(operations);
    return prisma.progressReport.findUnique({
      where: { id },
      include: this.includeReport,
    });
  }

  public static async deleteDraft(userInfo: UserType, id: string) {
    await MeetingPermissionService.assertCanEditReport(userInfo, id);
    const report = await prisma.progressReport.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!report) throw new AppError('Informe no encontrado', 404);
    if (report.status !== 'DRAFT')
      throw new AppError('Solo se pueden eliminar borradores', 409);
    return prisma.progressReport.delete({
      where: { id },
      select: { id: true },
    });
  }

  private static async assertNoReadyDuplicate(
    unitId: string,
    projectId: number,
    readyKey: string,
    ignoreReportId?: string
  ) {
    const duplicate = await prisma.progressReport.findFirst({
      where: {
        id: ignoreReportId ? { not: ignoreReportId } : undefined,
        unitId,
        projectId,
        readyKey,
        status: 'READY',
      },
      select: { id: true },
    });
    if (duplicate)
      throw new AppError(
        'Ya existe un informe listo para este presentador',
        409
      );
  }

  public static async markReady(userInfo: UserType, id: string) {
    await MeetingPermissionService.assertCanEditReport(userInfo, id);
    const report = await prisma.progressReport.findUnique({
      where: { id },
      include: { participants: { select: { userId: true } } },
    });
    if (!report) throw new AppError('Informe no encontrado', 404);
    const presenterKey =
      report.presenterKey ||
      this.buildPresenterKey(
        report.presenterType,
        report.unitId,
        report.presenterUserId,
        report.participants.map(item => item.userId)
      );
    await this.assertNoReadyDuplicate(
      report.unitId,
      report.projectId,
      presenterKey,
      id
    );
    return prisma.progressReport.update({
      where: { id },
      data: { status: 'READY', presenterKey, readyKey: presenterKey },
      include: this.includeReport,
    });
  }

  public static async listTemplates(source?: ProgressReportItemSource) {
    return prisma.reportItemTemplate.findMany({
      where: { source, isActive: true },
      orderBy: [{ source: 'asc' }, { name: 'asc' }],
    });
  }

  public static async createTemplate(userInfo: UserType, data: TemplateInput) {
    MeetingPermissionService.assertModuleRole(userInfo, ['MOD']);
    if (!data.name) throw new AppError('Ingrese nombre de plantilla', 400);
    return prisma.reportItemTemplate.create({
      data: {
        name: data.name,
        source: data.source || 'REUSABLE_TEMPLATE',
        description: data.description,
        isActive: data.isActive ?? true,
      },
    });
  }

  public static async listIndexTemplates(
    userInfo: UserType,
    filters: { unitId?: string; scope?: ReportIndexTemplateScope }
  ) {
    await this.ensureDefaultIndexTemplates();
    const visibleUnitIds = await this.getVisibleUnitIds(userInfo);
    const unitFilter = filters.unitId
      ? visibleUnitIds.includes(filters.unitId)
        ? filters.unitId
        : '__forbidden__'
      : undefined;
    return prisma.reportIndexTemplate.findMany({
      where: {
        isActive: true,
        scope: filters.scope,
        OR: [
          { scope: 'GLOBAL' },
          { scope: 'PERSONAL', ownerUserId: userInfo.id },
          {
            scope: 'UNIT',
            unitId: unitFilter || { in: visibleUnitIds },
          },
        ],
      },
      include: { items: { orderBy: { order: 'asc' } } },
      orderBy: [{ scope: 'asc' }, { name: 'asc' }],
    });
  }

  public static async createIndexTemplate(
    userInfo: UserType,
    data: ReportIndexTemplateInput
  ) {
    const scope = data.scope || 'PERSONAL';
    await this.assertCanManageTemplateScope(userInfo, scope, data.unitId);
    if (!data.name?.trim()) throw new AppError('Ingrese nombre de indice', 400);
    if (!data.items?.length)
      throw new AppError('Agregue al menos un item al indice', 400);
    return prisma.reportIndexTemplate.create({
      data: {
        name: data.name.trim(),
        scope,
        unitId: scope === 'UNIT' ? data.unitId : null,
        ownerUserId: scope === 'PERSONAL' ? userInfo.id : null,
        createdById: userInfo.id,
        description: data.description,
        isActive: data.isActive ?? true,
        items: {
          createMany: {
            data: data.items.map((item, index) => ({
              name: item.name.trim(),
              source: item.source || 'REUSABLE_TEMPLATE',
              defaultStatus: item.defaultStatus || 'IN_PROGRESS',
              defaultProgress: Math.max(
                0,
                Math.min(100, Number(item.defaultProgress ?? 0))
              ),
              defaultObservations: item.defaultObservations,
              order: item.order ?? index,
            })),
          },
        },
      },
      include: { items: { orderBy: { order: 'asc' } } },
    });
  }

  public static async updateIndexTemplate(
    userInfo: UserType,
    id: string,
    data: Partial<ReportIndexTemplateInput>
  ) {
    const template = await prisma.reportIndexTemplate.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!template) throw new AppError('Indice no encontrado', 404);
    await this.assertCanManageTemplateScope(
      userInfo,
      template.scope,
      template.unitId,
      template.ownerUserId
    );
    await prisma.reportIndexTemplate.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        description: data.description,
        isActive: data.isActive,
      },
    });
    if (data.items) {
      await prisma.$transaction([
        prisma.reportIndexTemplateItem.deleteMany({
          where: { templateId: id },
        }),
        prisma.reportIndexTemplateItem.createMany({
          data: data.items.map((item, index) => ({
            templateId: id,
            name: item.name.trim(),
            source: item.source || 'REUSABLE_TEMPLATE',
            defaultStatus: item.defaultStatus || 'IN_PROGRESS',
            defaultProgress: Math.max(
              0,
              Math.min(100, Number(item.defaultProgress ?? 0))
            ),
            defaultObservations: item.defaultObservations,
            order: item.order ?? index,
          })),
        }),
      ]);
    }
    return prisma.reportIndexTemplate.findUnique({
      where: { id },
      include: { items: { orderBy: { order: 'asc' } } },
    });
  }

  public static async deleteIndexTemplate(userInfo: UserType, id: string) {
    const template = await prisma.reportIndexTemplate.findUnique({
      where: { id },
      select: { id: true, scope: true, unitId: true, ownerUserId: true },
    });
    if (!template) throw new AppError('Indice no encontrado', 404);
    await this.assertCanManageTemplateScope(
      userInfo,
      template.scope,
      template.unitId,
      template.ownerUserId
    );
    return prisma.reportIndexTemplate.update({
      where: { id },
      data: { isActive: false },
      select: { id: true },
    });
  }

  public static async saveAsTemplate(
    userInfo: UserType,
    reportId: string,
    data: Omit<ReportIndexTemplateInput, 'items'>
  ) {
    const report = await MeetingPermissionService.assertCanEditReport(
      userInfo,
      reportId
    );
    const fullReport = await prisma.progressReport.findUnique({
      where: { id: reportId },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    if (!fullReport) throw new AppError('Informe no encontrado', 404);
    return this.createIndexTemplate(userInfo, {
      name: data.name,
      scope: data.scope || 'PERSONAL',
      unitId: data.scope === 'UNIT' ? report.unitId : data.unitId,
      description: data.description,
      isActive: true,
      items: fullReport.items.map(item => ({
        name: item.name,
        source: item.source,
        defaultStatus: item.status,
        defaultProgress: item.progress,
        defaultObservations: item.observations,
        order: item.order,
      })),
    });
  }

  private static async assertCanManageTemplateScope(
    userInfo: UserType,
    scope: ReportIndexTemplateScope,
    unitId?: string | null,
    ownerUserId?: number | null
  ) {
    if (scope === 'GLOBAL') {
      MeetingPermissionService.assertModuleRole(userInfo, ['MOD']);
      return;
    }
    if (scope === 'PERSONAL') {
      if (ownerUserId && ownerUserId !== userInfo.id)
        MeetingPermissionService.assertModuleRole(userInfo, ['MOD']);
      else
        MeetingPermissionService.assertModuleRole(userInfo, [
          'MOD',
          'MEMBER',
          'USER',
        ]);
      return;
    }
    if (!unitId) throw new AppError('Seleccione oficina para el indice', 400);
    if (MeetingPermissionService.hasModuleRole(userInfo, ['MOD'])) return;
    await MeetingPermissionService.assertCanManageUnitProjects(
      userInfo,
      unitId
    );
  }
}

export default ProgressReportsServices;

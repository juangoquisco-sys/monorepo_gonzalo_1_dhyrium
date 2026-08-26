import {
  AttendanceListState,
  AttendanceReconciliationStatus,
  ListDetails,
  Prisma,
} from '@prisma/client';
import AppError from '@/utils/appError';
import type { UserType } from '@/middlewares/auth.middleware';
import { prisma } from '@/utils/prisma.server';
import {
  AttendanceIncidentFilters,
  AttendanceReconciliationCandidateFilters,
  AttendanceReconciliationCreateBody,
  AttendanceReconciliationFilters,
  AttendanceFineReportFilters,
  AttendancePenaltyAdjustmentBulkInput,
  AttendancePenaltyAdjustmentVoidInput,
  AttendanceReconciliationSummaryFilters,
} from '@/types/attendanceControl';
import {
  attendanceFineForStatus,
  AttendanceReconciliationPolicy,
  RECONCILABLE_ATTENDANCE_STATUSES,
} from '@/services/attendanceControl/domain/attendanceReconciliationPolicy';
import RotationEntitlementService, {
  ATTENDANCE_RECONCILIATION_CAPABILITY,
} from '@/services/rotations/entitlement.service';
import {
  attendanceCandidateInclude,
  attendanceReconciliationInclude,
  attendanceUserSelect,
} from '@/services/attendanceControl/infrastructure/attendanceControl.repository';

type AttendanceCandidate = Prisma.ListOnUsersGetPayload<{
  include: typeof attendanceCandidateInclude;
}>;

type MappedAttendanceIncident = Omit<
  AttendanceCandidate,
  'reconciliationItems' | 'status'
> & {
  originalStatus: ListDetails;
  effectiveStatus: ListDetails;
  weekday?: string;
  status: ListDetails;
  reconciliation:
    | AttendanceCandidate['reconciliationItems'][number]['reconciliation']
    | null;
  reconciliationItems?: undefined;
};

class AttendanceControlService {
  private static severityOrder: Record<ListDetails, number> = {
    MUY_GRAVE: 1,
    GRAVE: 2,
    SIMPLE: 3,
    TARDE: 4,
    PUNTUAL: 5,
    PERMISO: 6,
    SALIDA: 7,
  };

  static mapIncident(incident: AttendanceCandidate): MappedAttendanceIncident {
    const activeItem = incident.reconciliationItems?.[0];
    const originalStatus = incident.status;
    const effectiveStatus = AttendanceReconciliationPolicy.effectiveStatus(
      originalStatus,
      activeItem?.resolvedStatus
    );

    return {
      ...incident,
      originalStatus,
      effectiveStatus,
      weekday: incident.assignedAt
        ? this.limaWeekday(incident.assignedAt)
        : undefined,
      status: effectiveStatus,
      reconciliation: activeItem?.reconciliation ?? null,
      reconciliationItems: undefined,
    };
  }

  static async reconciliationCandidates({
    userId,
    dateFrom,
    dateTo,
    userInfo,
  }: AttendanceReconciliationCandidateFilters & { userInfo?: UserType }) {
    if (!userId) throw new AppError('Seleccione un usuario', 400);
    const { start, end } = AttendanceReconciliationPolicy.operationalDateRange(
      dateFrom,
      dateTo
    );
    if (userInfo) {
      await this.assertCanReconcilePeriod(userInfo, start, end);
    }

    const user = await prisma.users.findFirst({
      where: { id: userId, status: true },
      select: { id: true },
    });
    if (!user)
      throw new AppError('No se pudo encontrar el usuario activo', 404);

    const incidents = await prisma.listOnUsers.findMany({
      where: {
        usersId: userId,
        assignedAt: { gte: start, lte: end },
        status: { in: RECONCILABLE_ATTENDANCE_STATUSES },
        list: { state: AttendanceListState.FINALIZED },
      },
      include: attendanceCandidateInclude,
      orderBy: [{ assignedAt: 'desc' }],
    });

    return incidents.map(incident => this.mapIncident(incident));
  }

  static async reconciliationSummary(
    userInfo: UserType,
    { dateFrom, dateTo }: AttendanceReconciliationSummaryFilters
  ) {
    const { start, end } = AttendanceReconciliationPolicy.operationalDateRange(
      dateFrom,
      dateTo
    );
    await this.assertCanReconcilePeriod(userInfo, start, end);

    const [users, incidents] = await Promise.all([
      prisma.users.findMany({
        where: { status: true },
        select: {
          ...attendanceUserSelect,
          role: { select: { id: true, name: true, hierarchy: true } },
          equipment: {
            select: {
              name: true,
              workStation: true,
            },
          },
        },
        orderBy: [{ profile: { lastName: 'asc' } }, { id: 'asc' }],
      }),
      prisma.listOnUsers.findMany({
        where: {
          assignedAt: { gte: start, lte: end },
          status: { in: AttendanceReconciliationPolicy.summaryStatuses() },
          user: { status: true },
          list: { state: AttendanceListState.FINALIZED },
        },
        include: attendanceCandidateInclude,
        orderBy: [{ assignedAt: 'asc' }, { usersId: 'asc' }],
      }),
    ]);

    const incidentsByUser = new Map<
      number,
      ReturnType<typeof AttendanceControlService.mapIncident>[]
    >();
    incidents.forEach(incident => {
      const mappedIncident = this.mapIncident(incident);
      const current = incidentsByUser.get(incident.usersId) ?? [];
      current.push(mappedIncident);
      incidentsByUser.set(incident.usersId, current);
    });

    return users.map(user => {
      const userIncidents = incidentsByUser.get(user.id) ?? [];
      const counts = AttendanceReconciliationPolicy.emptyStatusCounts();
      const originalCounts = AttendanceReconciliationPolicy.emptyStatusCounts();
      let totalFine = 0;
      let originalFine = 0;
      let reconciledCount = 0;

      userIncidents.forEach(incident => {
        counts[incident.effectiveStatus] += 1;
        originalCounts[incident.originalStatus] += 1;
        totalFine += attendanceFineForStatus(
          incident.effectiveStatus,
          user.role?.hierarchy
        );
        originalFine += attendanceFineForStatus(
          incident.originalStatus,
          user.role?.hierarchy
        );
        if (incident.reconciliation) reconciledCount += 1;
      });

      const pendingReconciliableCount = userIncidents.filter(incident =>
        RECONCILABLE_ATTENDANCE_STATUSES.includes(incident.effectiveStatus)
      ).length;

      return {
        user,
        counts,
        originalCounts,
        totalFine,
        originalFine,
        forgivenFine: Math.max(originalFine - totalFine, 0),
        totalRecords: userIncidents.length,
        reconciledCount,
        pendingReconciliableCount,
        status:
          pendingReconciliableCount === 0
            ? 'CLEAR'
            : reconciledCount > 0
            ? 'PARTIAL'
            : 'PENDING',
      };
    });
  }

  static async fineReport(
    userInfo: UserType,
    {
      dateFrom,
      dateTo,
      userId,
      search,
      sortAmount,
    }: AttendanceFineReportFilters
  ) {
    const { start, end } = AttendanceReconciliationPolicy.operationalDateRange(
      dateFrom,
      dateTo
    );
    await this.assertCanReconcilePeriod(userInfo, start, end);

    const searchValue = search?.trim().toLowerCase();
    const incidents = await prisma.listOnUsers.findMany({
      where: {
        ...(userId ? { usersId: +userId } : {}),
        assignedAt: { gte: start, lte: end },
        status: { in: AttendanceReconciliationPolicy.summaryStatuses() },
        user: { status: true },
        list: { state: AttendanceListState.FINALIZED },
      },
      include: attendanceCandidateInclude,
      orderBy: [{ assignedAt: 'asc' }, { usersId: 'asc' }],
    });

    const mappedIncidents = incidents.map(incident =>
      this.mapIncident(incident)
    );
    const userIds = [
      ...new Set(mappedIncidents.map(incident => incident.usersId)),
    ];
    const adjustments = userIds.length
      ? await prisma.attendancePenaltyAdjustment.findMany({
          where: {
            status: 'ACTIVE',
            userId: { in: userIds },
            OR: [
              {
                scope: 'ATTENDANCE_RECORD',
                periodStart: start,
                periodEnd: end,
              },
              {
                scope: 'USER_PERIOD',
                periodStart: start,
                periodEnd: end,
              },
            ],
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const recordAdjustments = new Map<string, (typeof adjustments)[number]>();
    const periodAdjustments = new Map<number, (typeof adjustments)[number]>();
    adjustments.forEach(adjustment => {
      if (
        adjustment.scope === 'ATTENDANCE_RECORD' &&
        adjustment.usersId &&
        adjustment.listId
      ) {
        const key = `${adjustment.usersId}:${adjustment.listId}`;
        if (!recordAdjustments.has(key)) recordAdjustments.set(key, adjustment);
      }
      if (
        adjustment.scope === 'USER_PERIOD' &&
        !periodAdjustments.has(adjustment.userId)
      ) {
        periodAdjustments.set(adjustment.userId, adjustment);
      }
    });

    const rowsByUser = new Map<number, any>();
    mappedIncidents.forEach(incident => {
      const current =
        rowsByUser.get(incident.usersId) ??
        this.createFineReportRow(incident.user);
      const calculatedAmount = attendanceFineForStatus(
        incident.effectiveStatus,
        incident.user.role?.hierarchy
      );
      const adjustment = recordAdjustments.get(
        `${incident.usersId}:${incident.listId}`
      );
      const finalAmount = adjustment?.adjustedAmount ?? calculatedAmount;

      current.counts[incident.effectiveStatus] += 1;
      current.originalCounts[incident.originalStatus] += 1;
      current.totalRecords += 1;
      current.calculatedAmount += calculatedAmount;
      current.itemAdjustedAmount += finalAmount;
      if (adjustment) current.adjustedItems += 1;
      current.incidents.push({
        usersId: incident.usersId,
        listId: incident.listId,
        assignedAt: incident.assignedAt,
        weekday: incident.weekday,
        list: incident.list,
        originalStatus: incident.originalStatus,
        effectiveStatus: incident.effectiveStatus,
        calculatedAmount,
        adjustedAmount: finalAmount,
        adjustment,
      });
      rowsByUser.set(incident.usersId, current);
    });

    let rows = [...rowsByUser.values()].map(row => {
      row.incidents.sort((a: any, b: any) => {
        const bySeverity =
          this.severityOrder[a.effectiveStatus as ListDetails] -
          this.severityOrder[b.effectiveStatus as ListDetails];
        if (bySeverity !== 0) return bySeverity;
        return (
          new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
        );
      });

      const totalAdjustment = periodAdjustments.get(row.user.id);
      const finalAmount =
        totalAdjustment?.adjustedAmount ?? row.itemAdjustedAmount;
      return {
        ...row,
        finalAmount,
        adjustedAmount: Math.max(row.calculatedAmount - finalAmount, 0),
        hasAdjustment: Boolean(totalAdjustment || row.adjustedItems),
        totalAdjustment: totalAdjustment ?? null,
      };
    });

    if (searchValue) {
      rows = rows.filter(row => {
        const name = this.fullName(row.user).toLowerCase();
        const dni = row.user.profile?.dni?.toLowerCase() ?? '';
        return name.includes(searchValue) || dni.includes(searchValue);
      });
    }

    if (sortAmount === 'asc') {
      rows.sort((a, b) => a.finalAmount - b.finalAmount);
    } else if (sortAmount === 'desc') {
      rows.sort((a, b) => b.finalAmount - a.finalAmount);
    } else {
      rows.sort((a, b) =>
        this.fullName(a.user).localeCompare(this.fullName(b.user))
      );
    }

    const summary = this.createFineReportSummary(rows);
    return {
      rows,
      summary,
      count: rows.reduce((total, row) => total + row.totalRecords, 0),
      usersCount: rows.length,
      periodStart: start,
      periodEnd: end,
    };
  }

  static async upsertPenaltyAdjustments(
    actor: UserType,
    data: AttendancePenaltyAdjustmentBulkInput
  ) {
    if (!data?.userId) throw new AppError('Usuario invalido', 400);
    const { start, end } = AttendanceReconciliationPolicy.operationalDateRange(
      data.periodStart,
      data.periodEnd
    );
    await this.assertCanReconcilePeriod(actor, start, end);
    const items = (data.items ?? []).filter(item => {
      return (
        Number.isFinite(item.usersId) &&
        Number.isFinite(item.listId) &&
        Number.isFinite(item.adjustedAmount) &&
        item.adjustedAmount >= 0 &&
        item.reason?.trim()
      );
    });
    const hasTotal =
      data.total &&
      Number.isFinite(data.total.adjustedAmount) &&
      data.total.adjustedAmount >= 0 &&
      data.total.reason?.trim();
    if (!hasTotal && !items.length) {
      throw new AppError('Ingrese un ajuste y un motivo', 400);
    }

    const incidents = await prisma.listOnUsers.findMany({
      where: {
        usersId: +data.userId,
        assignedAt: { gte: start, lte: end },
        status: { in: AttendanceReconciliationPolicy.summaryStatuses() },
        list: { state: AttendanceListState.FINALIZED },
      },
      include: attendanceCandidateInclude,
    });
    const mapped = incidents.map(incident => this.mapIncident(incident));
    const incidentMap = new Map(
      mapped.map(incident => [
        `${incident.usersId}:${incident.listId}`,
        incident,
      ])
    );
    const originalTotal = mapped.reduce(
      (sum, item) =>
        sum +
        attendanceFineForStatus(
          item.effectiveStatus,
          item.user.role?.hierarchy
        ),
      0
    );
    if (
      items.some(item => !incidentMap.has(`${item.usersId}:${item.listId}`))
    ) {
      throw new AppError(
        'Una incidencia no pertenece al periodo seleccionado',
        400
      );
    }
    if (hasTotal && data.total && data.total.adjustedAmount > originalTotal) {
      throw new AppError(
        'El ajuste total no puede superar el monto calculado',
        400
      );
    }
    const invalidItemAmount = items.some(item => {
      const incident = incidentMap.get(`${item.usersId}:${item.listId}`);
      const originalAmount = incident
        ? attendanceFineForStatus(
            incident.effectiveStatus,
            incident.user.role?.hierarchy
          )
        : 0;
      return item.adjustedAmount > originalAmount;
    });
    if (invalidItemAmount) {
      throw new AppError(
        'El ajuste de una incidencia no puede superar su monto calculado',
        400
      );
    }

    const now = new Date();
    return prisma.$transaction(async tx => {
      const created = [];
      if (hasTotal && data.total) {
        await tx.attendancePenaltyAdjustment.updateMany({
          where: {
            status: 'ACTIVE',
            scope: 'USER_PERIOD',
            userId: +data.userId,
            periodStart: start,
            periodEnd: end,
          },
          data: {
            status: 'VOIDED',
            voidedAt: now,
            voidedById: actor.id,
            voidReason: 'Reemplazado por un nuevo ajuste de periodo',
          },
        });
        created.push(
          await tx.attendancePenaltyAdjustment.create({
            data: {
              scope: 'USER_PERIOD',
              userId: +data.userId,
              adjustedById: actor.id,
              originalAmount: originalTotal,
              adjustedAmount: data.total.adjustedAmount,
              reason: data.total.reason.trim(),
              periodStart: start,
              periodEnd: end,
            },
          })
        );
      }

      for (const item of items) {
        const incident = incidentMap.get(`${item.usersId}:${item.listId}`);
        if (!incident) continue;
        await tx.attendancePenaltyAdjustment.updateMany({
          where: {
            status: 'ACTIVE',
            scope: 'ATTENDANCE_RECORD',
            usersId: +item.usersId,
            listId: +item.listId,
          },
          data: {
            status: 'VOIDED',
            voidedAt: now,
            voidedById: actor.id,
            voidReason: 'Reemplazado por un nuevo ajuste de incidencia',
          },
        });
        created.push(
          await tx.attendancePenaltyAdjustment.create({
            data: {
              scope: 'ATTENDANCE_RECORD',
              usersId: +item.usersId,
              listId: +item.listId,
              userId: +data.userId,
              adjustedById: actor.id,
              originalStatus: incident.effectiveStatus,
              originalAmount: attendanceFineForStatus(
                incident.effectiveStatus,
                incident.user.role?.hierarchy
              ),
              adjustedAmount: item.adjustedAmount,
              reason: item.reason.trim(),
              periodStart: start,
              periodEnd: end,
            },
          })
        );
      }
      return { count: created.length, adjustments: created };
    });
  }

  static async voidPenaltyAdjustments(
    actor: UserType,
    data: AttendancePenaltyAdjustmentVoidInput
  ) {
    if (!data?.userId) throw new AppError('Usuario invalido', 400);
    const { start, end } = AttendanceReconciliationPolicy.operationalDateRange(
      data.periodStart,
      data.periodEnd
    );
    await this.assertCanReconcilePeriod(actor, start, end);
    const items = data.items?.filter(
      item => Number.isFinite(item.usersId) && Number.isFinite(item.listId)
    );
    const recordClauses = items?.length
      ? items.map(item => ({
          scope: 'ATTENDANCE_RECORD' as const,
          usersId: +item.usersId,
          listId: +item.listId,
        }))
      : [
          {
            scope: 'ATTENDANCE_RECORD' as const,
            periodStart: start,
            periodEnd: end,
          },
        ];
    const shouldClearTotal = !data.scope || data.scope === 'USER_PERIOD';
    const shouldClearRecords =
      !data.scope || data.scope === 'ATTENDANCE_RECORD';

    return prisma.attendancePenaltyAdjustment.updateMany({
      where: {
        status: 'ACTIVE',
        userId: +data.userId,
        OR: [
          ...(shouldClearTotal
            ? [
                {
                  scope: 'USER_PERIOD' as const,
                  periodStart: start,
                  periodEnd: end,
                },
              ]
            : []),
          ...(shouldClearRecords ? recordClauses : []),
        ],
      },
      data: {
        status: 'VOIDED',
        voidedAt: new Date(),
        voidedById: actor.id,
        voidReason: data.reason?.trim() || 'Ajuste limpiado desde reporte',
      },
    });
  }

  static async listIncidents(
    userInfo: UserType,
    { userId, dateFrom, dateTo, statuses }: AttendanceIncidentFilters
  ) {
    const { start, end } = AttendanceReconciliationPolicy.operationalDateRange(
      dateFrom,
      dateTo
    );
    const canViewAll = this.hasSubMenuRole(userInfo, 'incidencias', 'MOD');
    const statusFilter =
      AttendanceReconciliationPolicy.parseIncidentStatuses(statuses);
    const targetUserId = canViewAll ? userId : userInfo.id;

    if (targetUserId) {
      const user = await prisma.users.findFirst({
        where: { id: +targetUserId, status: true },
        select: { id: true },
      });
      if (!user)
        throw new AppError('No se pudo encontrar el usuario activo', 404);
    }

    const incidents = await prisma.listOnUsers.findMany({
      where: {
        ...(targetUserId ? { usersId: +targetUserId } : {}),
        assignedAt: { gte: start, lte: end },
        status: { in: statusFilter },
        user: { status: true },
        list: { state: AttendanceListState.FINALIZED },
      },
      include: attendanceCandidateInclude,
      orderBy: [{ assignedAt: 'desc' }, { usersId: 'asc' }],
    });

    return incidents.map(incident => this.mapIncident(incident));
  }

  static async createReconciliation(
    actor: UserType,
    body: AttendanceReconciliationCreateBody
  ) {
    AttendanceReconciliationPolicy.assertReason(body.reason);
    AttendanceReconciliationPolicy.assertItems(body.items);
    if (!body.userId) throw new AppError('Seleccione un usuario', 400);

    const { start, end } = AttendanceReconciliationPolicy.operationalDateRange(
      body.periodStart,
      body.periodEnd
    );
    await this.assertCanReconcilePeriod(actor, start, end);
    const uniqueItems = this.uniqueItems(body.items);

    return prisma.$transaction(
      async tx => {
        const user = await tx.users.findFirst({
          where: { id: +body.userId, status: true },
          select: { id: true },
        });
        if (!user)
          throw new AppError('No se pudo encontrar el usuario activo', 404);

        if (uniqueItems.some(item => +item.usersId !== +body.userId)) {
          throw new AppError(
            'Todas las incidencias deben pertenecer al usuario seleccionado',
            400
          );
        }

        const incidents = await tx.listOnUsers.findMany({
          where: {
            usersId: +body.userId,
            assignedAt: { gte: start, lte: end },
            list: { state: AttendanceListState.FINALIZED },
            OR: uniqueItems.map(item => ({
              usersId: +item.usersId,
              listId: +item.listId,
            })),
          },
          include: {
            reconciliationItems: {
              where: { reconciliation: { status: 'ACTIVE' } },
              select: { id: true },
              take: 1,
            },
          },
        });

        if (incidents.length !== uniqueItems.length) {
          throw new AppError(
            'Una o mas incidencias no pertenecen al periodo seleccionado',
            400
          );
        }

        incidents.forEach(incident => {
          AttendanceReconciliationPolicy.assertReconciliableStatus(
            incident.status
          );
          if (incident.reconciliationItems.length) {
            throw new AppError(
              'Una o mas incidencias ya fueron reconciliadas',
              400
            );
          }
        });

        return tx.attendanceReconciliation.create({
          data: {
            userId: +body.userId,
            createdById: actor.id,
            periodStart: start,
            periodEnd: end,
            reason: body.reason.trim(),
            items: {
              create: incidents.map(incident => ({
                usersId: incident.usersId,
                listId: incident.listId,
                originalStatus: incident.status,
                resolvedStatus: 'PUNTUAL',
              })),
            },
          },
          include: attendanceReconciliationInclude,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  static async listReconciliations({
    userId,
    dateFrom,
    dateTo,
    status,
    userInfo,
  }: AttendanceReconciliationFilters & { userInfo?: UserType }) {
    const where: Prisma.AttendanceReconciliationWhereInput = {};
    if (userId) where.userId = +userId;
    if (status) where.status = status as AttendanceReconciliationStatus;
    if (dateFrom && dateTo) {
      const { start, end } =
        AttendanceReconciliationPolicy.operationalDateRange(dateFrom, dateTo);
      if (userInfo) {
        await this.assertCanReconcilePeriod(userInfo, start, end);
      }
      where.periodStart = { lte: end };
      where.periodEnd = { gte: start };
    } else if (userInfo && !this.canBypassRotationEntitlement(userInfo)) {
      throw new AppError('Seleccione un periodo para consultar historial', 400);
    }

    return prisma.attendanceReconciliation.findMany({
      where,
      include: attendanceReconciliationInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  static async voidReconciliation(
    actor: UserType,
    reconciliationId: string,
    reason?: string
  ) {
    AttendanceReconciliationPolicy.assertReason(reason);
    const reconciliation = await prisma.attendanceReconciliation.findUnique({
      where: { id: reconciliationId },
      select: { id: true, status: true, periodStart: true, periodEnd: true },
    });
    if (!reconciliation)
      throw new AppError('No se pudo encontrar la reconciliacion', 404);
    if (reconciliation.status === 'VOIDED') {
      throw new AppError('La reconciliacion ya fue anulada', 400);
    }
    await this.assertCanReconcilePeriod(
      actor,
      reconciliation.periodStart,
      reconciliation.periodEnd
    );

    return prisma.attendanceReconciliation.update({
      where: { id: reconciliationId },
      data: {
        status: 'VOIDED',
        voidedAt: new Date(),
        voidedById: actor.id,
        voidReason: reason!.trim(),
      },
      include: attendanceReconciliationInclude,
    });
  }

  static async activeEffectiveStatusByAttendance(
    usersId: number,
    listId: number
  ) {
    const item = await prisma.attendanceReconciliationItem.findFirst({
      where: {
        usersId,
        listId,
        reconciliation: { status: 'ACTIVE' },
      },
      select: { resolvedStatus: true },
    });
    return item?.resolvedStatus;
  }

  private static uniqueItems(
    items: AttendanceReconciliationCreateBody['items']
  ) {
    const map = new Map<string, { usersId: number; listId: number }>();
    items.forEach(item => {
      map.set(`${+item.usersId}:${+item.listId}`, {
        usersId: +item.usersId,
        listId: +item.listId,
      });
    });
    return [...map.values()];
  }

  private static createFineReportRow(user: any) {
    return {
      user,
      counts: AttendanceReconciliationPolicy.emptyStatusCounts(),
      originalCounts: AttendanceReconciliationPolicy.emptyStatusCounts(),
      totalRecords: 0,
      calculatedAmount: 0,
      itemAdjustedAmount: 0,
      adjustedItems: 0,
      incidents: [] as any[],
    };
  }

  private static createFineReportSummary(rows: any[]) {
    const counts = AttendanceReconciliationPolicy.emptyStatusCounts();
    let calculatedAmount = 0;
    let finalAmount = 0;
    let adjustedUsers = 0;
    let totalRecords = 0;

    rows.forEach(row => {
      AttendanceReconciliationPolicy.summaryStatuses().forEach(status => {
        counts[status] += row.counts[status] ?? 0;
      });
      calculatedAmount += row.calculatedAmount;
      finalAmount += row.finalAmount;
      totalRecords += row.totalRecords;
      if (row.hasAdjustment) adjustedUsers += 1;
    });

    return {
      counts,
      calculatedAmount,
      finalAmount,
      adjustedAmount: Math.max(calculatedAmount - finalAmount, 0),
      adjustedUsers,
      totalRecords,
      usersCount: rows.length,
    };
  }

  private static fullName(user: any) {
    return [user?.profile?.firstName, user?.profile?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  private static hasSubMenuRole(
    userInfo: UserType,
    subMenu: string,
    role: 'MOD' | 'USER'
  ) {
    return userInfo.role.menuPoints.some(
      menuPoint =>
        menuPoint.route === 'control-asistencia' &&
        menuPoint.menu?.some(
          menuPoint => menuPoint.route === subMenu && menuPoint.typeRol === role
        )
    );
  }

  private static canBypassRotationEntitlement(userInfo: UserType) {
    return this.hasSubMenuRole(userInfo, 'reconciliar-faltas', 'MOD');
  }

  private static async assertCanReconcilePeriod(
    userInfo: UserType,
    periodStart: Date,
    periodEnd: Date
  ) {
    if (this.canBypassRotationEntitlement(userInfo)) return;

    await RotationEntitlementService.assertCanUseCapability(userInfo.id, {
      capabilityKey: ATTENDANCE_RECONCILIATION_CAPABILITY,
      periodStart,
      periodEnd,
    });
  }

  private static limaWeekday(date: Date) {
    return new Intl.DateTimeFormat('es-PE', {
      weekday: 'short',
      timeZone: 'America/Lima',
    })
      .format(date)
      .replace('.', '');
  }
}

export default AttendanceControlService;

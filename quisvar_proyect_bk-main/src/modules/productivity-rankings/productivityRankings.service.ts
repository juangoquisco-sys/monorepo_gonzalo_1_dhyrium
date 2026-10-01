import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import type { UserType } from '@/middlewares/auth.middleware';
import {
  aggregateOfficeEntries,
  computeUserRankingEntry,
  rankEntries,
  type OfficeExclusion,
  type OfficeMembership,
  type RankingLineInput,
  type UserRankingInput,
} from './productivityRankings.domain';
import type {
  CreateNonTaskActivityBody,
  RankingConfigUpdateBody,
  ReviewNonTaskActivityBody,
} from './productivityRankings.schema';

const DEFAULT_TOP_N = 5;
const RANKING_CONFIG_SINGLETON_ID = '11111111-1111-1111-1111-111111111111';
/**
 * Estados de TaskRole que cuentan como "aprobado tras revision" para el
 * ranking. Solo REVIEWED esta disponible hoy en el frontend; APPROVED/DONE/
 * LIQUIDATION se incluyen para cuando el flujo de revision avance sin tener
 * que tocar este modulo de nuevo.
 */
const APPROVED_TASK_STATUSES = ['REVIEWED', 'APPROVED', 'DONE', 'LIQUIDATION'] as const;

class ProductivityRankingsService {
  static async getConfig() {
    const config = await prisma.rankingConfig.findUnique({
      where: { id: RANKING_CONFIG_SINGLETON_ID },
    });
    if (config) return config;
    return {
      id: RANKING_CONFIG_SINGLETON_ID,
      topN: DEFAULT_TOP_N,
      periodType: 'MONTHLY' as const,
      minWeightDaysToQualify: 0,
      excludedRoleIds: [] as number[],
      excludedUserIds: [] as number[],
      rankingEligibleUnitIds: [] as string[],
      updatedById: null,
      updatedAt: null,
    };
  }

  static async updateConfig(body: RankingConfigUpdateBody, actorId: number) {
    return prisma.rankingConfig.upsert({
      where: { id: RANKING_CONFIG_SINGLETON_ID },
      create: {
        id: RANKING_CONFIG_SINGLETON_ID,
        topN: body.topN ?? DEFAULT_TOP_N,
        minWeightDaysToQualify: body.minWeightDaysToQualify ?? 0,
        excludedRoleIds: body.excludedRoleIds ?? [],
        excludedUserIds: body.excludedUserIds ?? [],
        rankingEligibleUnitIds: body.rankingEligibleUnitIds ?? [],
        updatedById: actorId,
      },
      update: {
        ...(body.topN !== undefined ? { topN: body.topN } : {}),
        ...(body.minWeightDaysToQualify !== undefined
          ? { minWeightDaysToQualify: body.minWeightDaysToQualify }
          : {}),
        ...(body.excludedRoleIds !== undefined
          ? { excludedRoleIds: body.excludedRoleIds }
          : {}),
        ...(body.excludedUserIds !== undefined
          ? { excludedUserIds: body.excludedUserIds }
          : {}),
        ...(body.rankingEligibleUnitIds !== undefined
          ? { rankingEligibleUnitIds: body.rankingEligibleUnitIds }
          : {}),
        updatedById: actorId,
      },
    });
  }

  static async listPeriods() {
    return prisma.rankingPeriod.findMany({
      orderBy: { periodStart: 'desc' },
    });
  }

  static async createPeriod(periodStart: Date, periodEnd: Date) {
    const existing = await prisma.rankingPeriod.findUnique({
      where: {
        type_periodStart_periodEnd: {
          type: 'MONTHLY',
          periodStart,
          periodEnd,
        },
      },
    });
    if (existing) return existing;

    const overlapping = await prisma.rankingPeriod.findFirst({
      where: {
        type: 'MONTHLY',
        periodStart: { lt: periodEnd },
        periodEnd: { gt: periodStart },
      },
    });
    if (overlapping) {
      throw new AppError(
        'Ya existe un periodo de ranking que se superpone con este rango de fechas.',
        409,
        'RANKING_PERIOD_OVERLAP'
      );
    }

    return prisma.rankingPeriod.create({
      data: { type: 'MONTHLY', periodStart, periodEnd },
    });
  }

  private static async resolveLatestClosedPeriodId() {
    const latest = await prisma.rankingPeriod.findFirst({
      where: { status: 'CLOSED' },
      orderBy: { periodStart: 'desc' },
      select: { id: true },
    });
    return latest?.id ?? null;
  }

  static async getTop(periodId?: string) {
    const resolvedPeriodId = periodId ?? (await this.resolveLatestClosedPeriodId());
    if (!resolvedPeriodId) return { period: null, entries: [] };
    const [period, config] = await Promise.all([
      prisma.rankingPeriod.findUnique({ where: { id: resolvedPeriodId } }),
      this.getConfig(),
    ]);
    if (!period) return { period: null, entries: [] };
    const entries = await prisma.rankingEntry.findMany({
      where: { periodId: resolvedPeriodId, position: { gt: 0, lte: config.topN } },
      orderBy: { position: 'asc' },
      include: {
        user: {
          select: { id: true, profile: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    return { period, entries };
  }

  static async getOfficeTop(periodId?: string) {
    const resolvedPeriodId = periodId ?? (await this.resolveLatestClosedPeriodId());
    if (!resolvedPeriodId) return { period: null, entries: [] };
    const [period, entries] = await Promise.all([
      prisma.rankingPeriod.findUnique({ where: { id: resolvedPeriodId } }),
      prisma.rankingOfficeEntry.findMany({
        where: { periodId: resolvedPeriodId },
        orderBy: { position: 'asc' },
      }),
    ]);
    return { period, entries };
  }

  static async getEntryForUser(userId: number, periodId?: string) {
    const resolvedPeriodId = periodId ?? (await this.resolveLatestClosedPeriodId());
    if (!resolvedPeriodId) return { period: null, entry: null };
    const [period, entry] = await Promise.all([
      prisma.rankingPeriod.findUnique({ where: { id: resolvedPeriodId } }),
      prisma.rankingEntry.findUnique({
        where: { periodId_userId: { periodId: resolvedPeriodId, userId } },
        include: {
          lines: true,
          user: {
            select: { id: true, profile: { select: { firstName: true, lastName: true } } },
          },
        },
      }),
    ]);
    return { period, entry };
  }

  static getMyEntry(userId: number, periodId?: string) {
    return this.getEntryForUser(userId, periodId);
  }

  /**
   * Lista todas las entradas (todo el personal, no solo el top-N) de un
   * periodo. Uso exclusivo de moderadores, para auditoria/soporte a bonos.
   */
  static async listAllEntries(periodId?: string) {
    const resolvedPeriodId = periodId ?? (await this.resolveLatestClosedPeriodId());
    if (!resolvedPeriodId) return { period: null, entries: [] };
    const [period, entries] = await Promise.all([
      prisma.rankingPeriod.findUnique({ where: { id: resolvedPeriodId } }),
      prisma.rankingEntry.findMany({
        where: { periodId: resolvedPeriodId },
        orderBy: [{ position: 'asc' }, { score: 'desc' }],
        include: {
          user: {
            select: { id: true, profile: { select: { firstName: true, lastName: true } } },
          },
        },
      }),
    ]);
    return { period, entries };
  }

  /**
   * Reune las lineas de puntaje de todos los usuarios candidatos en el
   * periodo: tareas tecnicas (SubTaskOnUsers/BasicTaskOnUsers) ya revisadas
   * y vinculadas a un informe (Reports) cuyo rango se superpone al periodo
   * de ranking, mas actividades administrativas aprobadas (NonTaskActivity)
   * cuya fecha cae dentro del periodo.
   */
  private static async collectUserLines(
    periodStart: Date,
    periodEnd: Date,
    excludedUserIds: Set<number>
  ) {
    // Una etapa puede haber sido re-subida como una version mas nueva
    // (StageVersion/StageVersionGroup). Cuando eso pasa, solo la version
    // marcada como vigente (isCurrent=true) cuenta para el ranking; las
    // etapas sin grupo de version (la mayoria, o proyectos de una sola
    // etapa como Puentes) no tienen esta restriccion.
    const CURRENT_STAGE_VERSION_FILTER = {
      OR: [{ versionMetadata: null }, { versionMetadata: { isCurrent: true } }],
    };

    const [subTaskLines, basicTaskLines, nonTaskLines] = await Promise.all([
      prisma.subTaskOnUsers.findMany({
        where: {
          task: {
            status: { in: [...APPROVED_TASK_STATUSES] },
            Levels: { stages: CURRENT_STAGE_VERSION_FILTER },
          },
          report: { initialDate: { lt: periodEnd }, untilDate: { gte: periodStart } },
        },
        select: {
          userId: true,
          percentage: true,
          task: { select: { id: true, name: true, days: true } },
        },
      }),
      prisma.basicTaskOnUsers.findMany({
        where: {
          task: {
            status: { in: [...APPROVED_TASK_STATUSES] },
            Levels: { stages: CURRENT_STAGE_VERSION_FILTER },
          },
          reports: {
            some: { initialDate: { lt: periodEnd }, untilDate: { gte: periodStart } },
          },
        },
        select: {
          userId: true,
          percentage: true,
          task: { select: { id: true, name: true, days: true } },
        },
      }),
      prisma.nonTaskActivity.findMany({
        where: {
          status: 'APPROVED',
          periodDate: { gte: periodStart, lt: periodEnd },
        },
        select: { id: true, userId: true, type: true, approvedDays: true },
      }),
    ]);

    const byUser = new Map<number, RankingLineInput[]>();
    const pushLine = (userId: number, line: RankingLineInput) => {
      if (excludedUserIds.has(userId)) return;
      const lines = byUser.get(userId) ?? [];
      lines.push(line);
      byUser.set(userId, lines);
    };

    for (const row of subTaskLines) {
      pushLine(row.userId, {
        sourceType: 'SUB_TASK',
        sourceId: String(row.task.id),
        sourceLabel: row.task.name,
        weightDays: row.task.days,
        approvalPct: row.percentage,
      });
    }
    for (const row of basicTaskLines) {
      pushLine(row.userId, {
        sourceType: 'BASIC_TASK',
        sourceId: String(row.task.id),
        sourceLabel: row.task.name,
        weightDays: row.task.days,
        approvalPct: row.percentage,
      });
    }
    for (const row of nonTaskLines) {
      if (row.approvedDays == null) continue;
      pushLine(row.userId, {
        sourceType: 'NON_TASK_ACTIVITY',
        sourceId: row.id,
        sourceLabel: row.type,
        weightDays: row.approvedDays,
        approvalPct: 100,
      });
    }
    return byUser;
  }

  /**
   * Resuelve la oficina primaria de cada usuario en una sola consulta
   * batched (en vez de una por usuario) para evitar N+1. Es un dato
   * informativo (snapshot en RankingEntry.unitId), no interviene en el
   * puntaje ni en la agregacion por oficina.
   */
  private static async resolvePrimaryUnits(userIds: number[], periodEnd: Date) {
    if (!userIds.length) return new Map<number, string | null>();
    const memberships = await prisma.organizationalMembership.findMany({
      where: {
        userId: { in: userIds },
        startDate: { lt: periodEnd },
        OR: [{ endDate: null }, { endDate: { gte: periodEnd } }],
      },
      orderBy: [{ isPrimary: 'desc' }, { startDate: 'asc' }],
      select: { userId: true, unitId: true },
    });
    const byUser = new Map<number, string | null>();
    for (const membership of memberships) {
      if (!byUser.has(membership.userId)) {
        byUser.set(membership.userId, membership.unitId);
      }
    }
    return byUser;
  }

  static async closePeriod(periodId: string, actorId: number) {
    const period = await prisma.rankingPeriod.findUnique({ where: { id: periodId } });
    if (!period) {
      throw new AppError('El periodo de ranking no existe.', 404, 'RANKING_PERIOD_NOT_FOUND');
    }
    if (period.status === 'CLOSED') {
      throw new AppError(
        'Este periodo ya fue cerrado y es inmutable.',
        409,
        'RANKING_PERIOD_ALREADY_CLOSED'
      );
    }

    const config = await this.getConfig();
    const excludedUserIds = new Set(config.excludedUserIds);
    if (config.excludedRoleIds.length) {
      const excludedByRole = await prisma.users.findMany({
        where: { roleId: { in: config.excludedRoleIds } },
        select: { id: true },
      });
      excludedByRole.forEach(user => excludedUserIds.add(user.id));
    }

    const linesByUser = await this.collectUserLines(
      period.periodStart,
      period.periodEnd,
      excludedUserIds
    );

    const primaryUnitByUser = await this.resolvePrimaryUnits(
      Array.from(linesByUser.keys()),
      period.periodEnd
    );
    const userInputs: UserRankingInput[] = Array.from(linesByUser.entries()).map(
      ([userId, lines]) => ({
        userId,
        unitId: primaryUnitByUser.get(userId) ?? null,
        lines,
      })
    );

    const computed = userInputs.map(input =>
      computeUserRankingEntry(input, config.minWeightDaysToQualify)
    );
    const ranked = rankEntries(computed);

    const eligibleUnitIds = config.rankingEligibleUnitIds;
    let officeEntries: ReturnType<typeof aggregateOfficeEntries> = [];
    if (eligibleUnitIds.length) {
      const [memberships, exclusions] = await Promise.all([
        prisma.organizationalMembership.findMany({
          where: {
            unitId: { in: eligibleUnitIds },
            startDate: { lt: period.periodEnd },
            OR: [{ endDate: null }, { endDate: { gte: period.periodEnd } }],
          },
          select: { userId: true, unitId: true },
        }),
        prisma.rankingOfficeMemberExclusion.findMany({
          where: { unitId: { in: eligibleUnitIds } },
          select: { userId: true, unitId: true },
        }),
      ]);
      const membershipsWithoutGloballyExcluded = (memberships as OfficeMembership[]).filter(
        membership => !excludedUserIds.has(membership.userId)
      );
      officeEntries = aggregateOfficeEntries(
        ranked,
        membershipsWithoutGloballyExcluded,
        eligibleUnitIds,
        exclusions as OfficeExclusion[]
      );
    }

    await prisma.$transaction(async tx => {
      const closed = await tx.rankingPeriod.updateMany({
        where: { id: periodId, status: 'OPEN' },
        data: { status: 'CLOSED', closedAt: new Date(), closedById: actorId },
      });
      if (closed.count !== 1) {
        throw new AppError(
          'El periodo cambio de estado antes de completar el cierre.',
          409,
          'RANKING_PERIOD_CLOSE_CONFLICT'
        );
      }
      await tx.rankingEntry.deleteMany({ where: { periodId } });
      await tx.rankingOfficeEntry.deleteMany({ where: { periodId } });

      for (const entry of ranked) {
        await tx.rankingEntry.create({
          data: {
            periodId,
            userId: entry.userId,
            unitId: entry.unitId,
            score: entry.score,
            totalWeightDays: entry.totalWeightDays,
            avgApprovalPct: entry.avgApprovalPct,
            position: entry.position,
            qualified: entry.qualified,
            lines: {
              create: entry.lines.map(line => ({
                sourceType: line.sourceType,
                sourceId: line.sourceId,
                sourceLabel: line.sourceLabel,
                weightDays: line.weightDays,
                approvalPct: line.approvalPct,
                contribution: line.contribution,
              })),
            },
          },
        });
      }

      if (officeEntries.length) {
        await tx.rankingOfficeEntry.createMany({
          data: officeEntries.map(entry => ({
            periodId,
            unitId: entry.unitId,
            totalScore: entry.totalScore,
            memberCount: entry.memberCount,
            scorePerMember: entry.scorePerMember,
            position: entry.position,
          })),
        });
      }
    });

    return prisma.rankingPeriod.findUniqueOrThrow({ where: { id: periodId } });
  }

  static async createNonTaskActivity(user: UserType, body: CreateNonTaskActivityBody) {
    return prisma.nonTaskActivity.create({
      data: {
        userId: user.id,
        type: body.type,
        description: body.description,
        proposedDays: body.proposedDays,
        periodDate: body.periodDate,
      },
    });
  }

  static async listMyNonTaskActivities(userId: number) {
    return prisma.nonTaskActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async listPendingNonTaskActivities() {
    return prisma.nonTaskActivity.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  static async reviewNonTaskActivity(
    activityId: string,
    reviewerId: number,
    body: ReviewNonTaskActivityBody
  ) {
    const activity = await prisma.nonTaskActivity.findUnique({ where: { id: activityId } });
    if (!activity) {
      throw new AppError('La actividad no existe.', 404, 'NON_TASK_ACTIVITY_NOT_FOUND');
    }
    if (activity.status !== 'PENDING') {
      throw new AppError(
        'Esta actividad ya fue revisada.',
        409,
        'NON_TASK_ACTIVITY_ALREADY_REVIEWED'
      );
    }
    return prisma.nonTaskActivity.update({
      where: { id: activityId },
      data: {
        status: body.status,
        approvedDays: body.status === 'APPROVED' ? body.approvedDays : null,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }
}

export default ProductivityRankingsService;

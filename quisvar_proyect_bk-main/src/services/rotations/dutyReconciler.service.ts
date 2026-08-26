import { Prisma } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import DutyPlannerPolicy, {
  type DutyPlanningConfiguration,
} from '@/services/rotations/dutyPlanner.policy';
import { inspectDutyConfiguration } from '@/services/rotations/duty.dto';
import DutyAllocationPolicy, {
  DutyAllocationError,
  type DutyAllocationHistoryItem,
} from '@/services/rotations/dutyAllocation.policy';

export type DutyTransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export const dutyWithParticipantsInclude = {
  participants: {
    include: {
      user: {
        select: {
          id: true,
          email: true,
          status: true,
          userType: true,
          profile: { select: { firstName: true, lastName: true } },
          role: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { position: 'asc' as const },
  },
  _count: { select: { assignments: true } },
} satisfies Prisma.DutyRotationInclude;

export const dutyAssignmentInclude = {
  duty: {
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { position: 'asc' as const },
      },
    },
  },
  assignedUser: {
    select: {
      id: true,
      email: true,
      profile: { select: { firstName: true, lastName: true } },
    },
  },
  executedByUser: {
    select: {
      id: true,
      email: true,
      profile: { select: { firstName: true, lastName: true } },
    },
  },
  swapRequests: {
    include: {
      requesterUser: {
        select: {
          id: true,
          email: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
      targetUser: {
        select: {
          id: true,
          email: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  evidences: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.DutyRotationAssignmentInclude;

export type DutyWithParticipants = Prisma.DutyRotationGetPayload<{
  include: typeof dutyWithParticipantsInclude;
}>;

type ReconciliationAssignment = Prisma.DutyRotationAssignmentGetPayload<{
  include: { swapRequests: { select: { id: true } } };
}>;

interface ExpectedDutyAssignment {
  occurrenceKey: string;
  periodStart: string;
  periodEnd: string;
  dueOn: string;
  slotKey: string;
  slotLabel: string;
  slotInstructions: string | null;
  baseSlotKey: string | null;
  slotPosition: number | null;
  participantUniquenessScope: string | null;
  rosterVersion: number;
  evidencePolicy: DutyWithParticipants['evidencePolicy'];
  assignedUserId: number;
}

export interface ReconciliationSummary {
  dutyId: string;
  createdCount: number;
  preservedCount: number;
  deletedCount: number;
  conflictCount: number;
  createdIds: string[];
  deletedIds: string[];
  conflicts: Array<{
    assignmentId: string;
    occurrenceKey: string;
    slotKey: string;
    reason: string;
  }>;
}

export interface DutyImpactPreview {
  preserved: ReconciliationAssignment[];
  removable: ReconciliationAssignment[];
  conflicts: Array<ReconciliationAssignment & { protectionReason: string }>;
}

const assignmentIdentity = (assignment: {
  occurrenceKey: string;
  slotKey: string;
}) => `${assignment.occurrenceKey}:${assignment.slotKey}`;

class DutyReconcilerService {
  static assertConfigurationValid(duty: DutyWithParticipants) {
    const inspection = inspectDutyConfiguration(duty);
    if (!inspection.isValid) {
      console.error('Rotaciones: configuracion incompatible omitida', {
        dutyId: duty.id,
        issueCodes: inspection.issues.map(issue => issue.code),
      });
      throw new AppError(
        '[DUTY_CONFIGURATION_INVALID] La actividad requiere correccion administrativa antes de generar turnos',
        409
      );
    }
    return inspection.recurrence;
  }

  static planningConfiguration(
    duty: DutyWithParticipants
  ): DutyPlanningConfiguration {
    return {
      validFrom: DutyPlannerPolicy.formatDate(duty.validFrom),
      validUntil: duty.validUntil
        ? DutyPlannerPolicy.formatDate(duty.validUntil)
        : null,
      assignmentStrategy: duty.assignmentStrategy,
      recurrence: this.assertConfigurationValid(duty),
      excludedOccurrenceKeys: duty.excludedOccurrenceKeys,
    };
  }

  static async expectedAssignments(
    duty: DutyWithParticipants,
    rangeFrom: string,
    rangeTo: string,
    client: DutyTransactionClient = prisma,
    existing: ReconciliationAssignment[] = [],
    referenceDate = new Date()
  ): Promise<ExpectedDutyAssignment[]> {
    const ineligible = duty.participants.filter(
      participant =>
        !participant.user.status || participant.user.userType === 'REMOTO'
    );
    if (ineligible.length) {
      throw new AppError(
        '[DUTY_ROSTER_STALE] El padrón contiene participantes inactivos o no presenciales y requiere sincronización administrativa',
        409
      );
    }
    const participants = duty.participants.map(participant => ({
      id: participant.userId,
      position: participant.position,
    }));
    if (!participants.length) {
      throw new AppError(
        'La actividad no tiene participantes elegibles configurados',
        409
      );
    }
    const configuration = this.planningConfiguration(duty);
    const occurrences = DutyPlannerPolicy.plan(
      configuration,
      rangeFrom,
      rangeTo
    );
    if (duty.assignmentStrategy !== 'DISTRIBUTE_PARTICIPANTS') {
      const planned = DutyPlannerPolicy.flatten(occurrences);
      return planned.map(
        (assignment, index): ExpectedDutyAssignment => ({
          ...assignment,
          baseSlotKey: null,
          slotPosition: null,
          participantUniquenessScope: null,
          rosterVersion: duty.rosterVersion,
          evidencePolicy: duty.evidencePolicy,
          assignedUserId: participants[index % participants.length].id,
        })
      );
    }

    const exclusions = occurrences.length
      ? await client.dutyRotationOccurrenceExclusion.findMany({
          where: {
            dutyId: duty.id,
            occurrenceKey: { in: occurrences.map(item => item.occurrenceKey) },
          },
          select: { occurrenceKey: true, userId: true },
        })
      : [];
    const excludedByOccurrence = new Map<string, Set<number>>();
    exclusions.forEach(exclusion => {
      const values =
        excludedByOccurrence.get(exclusion.occurrenceKey) ?? new Set();
      values.add(exclusion.userId);
      excludedByOccurrence.set(exclusion.occurrenceKey, values);
    });
    const persistedHistory = await client.dutyRotationAssignment.findMany({
      where: {
        dutyId: duty.id,
        periodStart: { lt: DutyPlannerPolicy.parseDate(rangeFrom) },
        baseSlotKey: { not: null },
      },
      select: {
        baseSlotKey: true,
        assignedUserId: true,
      },
      orderBy: [{ periodStart: 'asc' }, { slotKey: 'asc' }],
    });
    const history: DutyAllocationHistoryItem[] = persistedHistory.flatMap(
      item =>
        item.baseSlotKey ? [{ ...item, baseSlotKey: item.baseSlotKey }] : []
    );
    const today = DutyPlannerPolicy.todayInLima(referenceDate);
    const assignments: ExpectedDutyAssignment[] = [];
    try {
      for (const occurrence of occurrences) {
        const excluded =
          excludedByOccurrence.get(occurrence.occurrenceKey) ?? new Set();
        const fixed = existing
          .filter(
            assignment =>
              assignment.occurrenceKey === occurrence.occurrenceKey &&
              Boolean(this.protectionReason(assignment, today))
          )
          .map(assignment => ({
            slotKey: assignment.slotKey,
            assignedUserId: assignment.assignedUserId,
          }));
        const available = participants.filter(item => !excluded.has(item.id));
        const availableIds = new Set(available.map(item => item.id));
        fixed.forEach(item => {
          if (!availableIds.has(item.assignedUserId)) {
            available.push({
              id: item.assignedUserId,
              position: available.length,
            });
            availableIds.add(item.assignedUserId);
          }
        });
        const allocation = DutyAllocationPolicy.allocate(
          configuration.recurrence.slots,
          available,
          history,
          fixed
        );
        allocation.assignments.forEach(assignment => {
          assignments.push({
            occurrenceKey: occurrence.occurrenceKey,
            periodStart: occurrence.periodStart,
            periodEnd: occurrence.periodEnd,
            dueOn: occurrence.dueOn,
            ...assignment,
            participantUniquenessScope: 'DISTRIBUTED',
            rosterVersion: duty.rosterVersion,
            evidencePolicy: duty.evidencePolicy,
          });
          history.push({
            baseSlotKey: assignment.baseSlotKey,
            assignedUserId: assignment.assignedUserId,
          });
        });
      }
    } catch (error) {
      if (error instanceof DutyAllocationError) {
        throw new AppError(error.message, 409);
      }
      throw error;
    }
    return assignments;
  }

  static protectionReason(assignment: ReconciliationAssignment, today: string) {
    if (DutyPlannerPolicy.formatDate(assignment.periodStart) <= today) {
      return 'La asignacion pertenece al pasado o ya esta en curso';
    }
    if (assignment.status !== 'PENDING') {
      return `La asignacion esta en estado ${assignment.status}`;
    }
    if (assignment.origin !== 'AUTO') {
      return 'La asignacion tuvo un ajuste manual';
    }
    if (assignment.isLocked) return 'La asignacion esta bloqueada';
    if (assignment.swapRequests.length > 0) {
      return 'La asignacion tiene historial de intercambio';
    }
    return null;
  }

  static async loadAssignmentsForImpact(
    client: DutyTransactionClient,
    dutyId: string,
    effectiveFrom: string,
    horizonEnd: string
  ) {
    return client.dutyRotationAssignment.findMany({
      where: {
        dutyId,
        periodStart: {
          gte: DutyPlannerPolicy.parseDate(effectiveFrom),
          lte: DutyPlannerPolicy.parseDate(horizonEnd),
        },
      },
      include: { swapRequests: { select: { id: true } } },
      orderBy: [
        { periodStart: 'asc' },
        { occurrenceKey: 'asc' },
        { slotKey: 'asc' },
      ],
    });
  }

  static async previewImpact(
    client: DutyTransactionClient,
    dutyId: string,
    effectiveFrom: string,
    horizonEnd: string,
    referenceDate = new Date()
  ): Promise<DutyImpactPreview> {
    const today = DutyPlannerPolicy.todayInLima(referenceDate);
    const assignments = await this.loadAssignmentsForImpact(
      client,
      dutyId,
      effectiveFrom,
      horizonEnd
    );
    const preserved: ReconciliationAssignment[] = [];
    const removable: ReconciliationAssignment[] = [];
    const conflicts: DutyImpactPreview['conflicts'] = [];
    assignments.forEach(assignment => {
      const reason = this.protectionReason(assignment, today);
      if (reason) {
        preserved.push(assignment);
        conflicts.push({ ...assignment, protectionReason: reason });
      } else {
        removable.push(assignment);
      }
    });
    return { preserved, removable, conflicts };
  }

  static async reconcileInTransaction(
    tx: DutyTransactionClient,
    duty: DutyWithParticipants,
    options: {
      horizonEnd: string;
      referenceDate?: Date;
      removeObsolete?: boolean;
    }
  ): Promise<ReconciliationSummary> {
    const referenceDate = options.referenceDate ?? new Date();
    const today = DutyPlannerPolicy.todayInLima(referenceDate);
    const planningStartsOn = DutyPlannerPolicy.formatDate(
      duty.planningStartsOn
    );
    const existing = await tx.dutyRotationAssignment.findMany({
      where: {
        dutyId: duty.id,
        periodStart: { lte: DutyPlannerPolicy.parseDate(options.horizonEnd) },
        periodEnd: { gte: duty.planningStartsOn },
      },
      include: { swapRequests: { select: { id: true } } },
      orderBy: [{ periodStart: 'asc' }, { slotKey: 'asc' }],
    });
    const expected = await this.expectedAssignments(
      duty,
      planningStartsOn,
      options.horizonEnd,
      tx,
      existing,
      referenceDate
    );
    const expectedByIdentity = new Map(
      expected.map(assignment => [assignmentIdentity(assignment), assignment])
    );
    const existingByIdentity = new Map(
      existing.map(assignment => [assignmentIdentity(assignment), assignment])
    );
    const conflicts: ReconciliationSummary['conflicts'] = [];
    const deletedIds: string[] = [];

    if (options.removeObsolete) {
      for (const assignment of existing) {
        if (expectedByIdentity.has(assignmentIdentity(assignment))) continue;
        const reason = this.protectionReason(assignment, today);
        if (reason) {
          conflicts.push({
            assignmentId: assignment.id,
            occurrenceKey: assignment.occurrenceKey,
            slotKey: assignment.slotKey,
            reason,
          });
        } else {
          deletedIds.push(assignment.id);
        }
      }
      if (deletedIds.length) {
        await tx.dutyRotationAssignment.deleteMany({
          where: { id: { in: deletedIds } },
        });
      }
    }

    const drafts = expected.filter(assignment => {
      if (assignment.dueOn < today) return false;
      return !existingByIdentity.has(assignmentIdentity(assignment));
    });
    if (drafts.length) {
      await tx.dutyRotationAssignment.createMany({
        data: drafts.map(assignment => ({
          dutyId: duty.id,
          occurrenceKey: assignment.occurrenceKey,
          periodStart: DutyPlannerPolicy.parseDate(assignment.periodStart),
          periodEnd: DutyPlannerPolicy.parseDate(assignment.periodEnd),
          dueOn: DutyPlannerPolicy.parseDate(assignment.dueOn),
          slotKey: assignment.slotKey,
          slotLabel: assignment.slotLabel,
          slotInstructions: assignment.slotInstructions,
          baseSlotKey: assignment.baseSlotKey,
          slotPosition: assignment.slotPosition,
          participantUniquenessScope: assignment.participantUniquenessScope,
          assignedUserId: assignment.assignedUserId,
          configurationVersion: duty.configurationVersion,
          rosterVersion: assignment.rosterVersion,
          evidencePolicy: assignment.evidencePolicy,
          origin: 'AUTO',
        })),
        skipDuplicates: true,
      });
    }

    const created = drafts.length
      ? await tx.dutyRotationAssignment.findMany({
          where: {
            dutyId: duty.id,
            OR: drafts.map(assignment => ({
              occurrenceKey: assignment.occurrenceKey,
              slotKey: assignment.slotKey,
            })),
          },
          select: { id: true },
        })
      : [];

    await tx.dutyRotation.update({
      where: { id: duty.id },
      data: { lastReconciledAt: referenceDate },
    });

    return {
      dutyId: duty.id,
      createdCount: created.length,
      preservedCount: existing.length - deletedIds.length,
      deletedCount: deletedIds.length,
      conflictCount: conflicts.length,
      createdIds: created.map(assignment => assignment.id),
      deletedIds,
      conflicts,
    };
  }

  static async withSerializableRetry<T>(
    operation: (tx: DutyTransactionClient) => Promise<T>,
    retries = 3
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt += 1) {
      try {
        return await prisma.$transaction(tx => operation(tx), {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ['P2002', 'P2034'].includes(error.code);
        if (!retryable) throw error;
        if (attempt === retries) {
          throw new AppError(
            'La operacion no pudo completarse por un conflicto concurrente. Intente nuevamente',
            409
          );
        }
      }
    }
    throw new AppError('No se pudo reconciliar la actividad', 409);
  }

  static async reconcileDuty(
    dutyId: string,
    options: {
      referenceDate?: Date;
      horizonDays?: number;
      removeObsolete?: boolean;
    } = {}
  ) {
    const referenceDate = options.referenceDate ?? new Date();
    const horizonEnd = DutyPlannerPolicy.horizonEnd(
      referenceDate,
      options.horizonDays ?? 60
    );
    return this.withSerializableRetry(async tx => {
      await tx.dutyRotation.update({
        where: { id: dutyId },
        data: { lastReconciledAt: referenceDate },
      });
      const duty = await tx.dutyRotation.findUnique({
        where: { id: dutyId },
        include: dutyWithParticipantsInclude,
      });
      if (!duty) throw new AppError('No se pudo encontrar la actividad', 404);
      if (!duty.isActive) {
        throw new AppError('La actividad esta inactiva', 409);
      }
      return this.reconcileInTransaction(tx, duty, {
        horizonEnd,
        referenceDate,
        removeObsolete: options.removeObsolete,
      });
    });
  }
}

export default DutyReconcilerService;

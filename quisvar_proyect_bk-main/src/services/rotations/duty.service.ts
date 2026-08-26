import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import { withActiveNonRemoteUsers } from '@/utils/userFilters';
import DutyPlannerPolicy from '@/services/rotations/dutyPlanner.policy';
import { toDutyRotationDto } from '@/services/rotations/duty.dto';
import DutyReconcilerService, {
  dutyAssignmentInclude,
  dutyWithParticipantsInclude,
  type DutyImpactPreview,
  type DutyTransactionClient,
  type DutyWithParticipants,
  type ReconciliationSummary,
} from '@/services/rotations/dutyReconciler.service';
import { toDutyAssignmentDtos } from '@/services/rotations/dutyAssignment.dto';
import {
  dutyRecurrenceSchema,
  type DutyDraft,
  type DutyRecurrence,
  type EditDutyInput,
} from '@/services/rotations/duty.schema';
import DutyAllocationPolicy, {
  DutyAllocationError,
  type DutyAllocationHistoryItem,
} from '@/services/rotations/dutyAllocation.policy';

const participantPreviewSelect = {
  id: true,
  email: true,
  status: true,
  userType: true,
  profile: { select: { firstName: true, lastName: true } },
  role: { select: { id: true, name: true } },
} satisfies Prisma.UsersSelect;

type EligibleParticipant = Prisma.UsersGetPayload<{
  select: typeof participantPreviewSelect;
}>;

interface DutyPreviewResult {
  occurrences: Array<{
    occurrenceKey: string;
    periodStart: string;
    periodEnd: string;
    dueOn: string;
    slotKey: string;
    slotLabel: string;
    slotInstructions: string | null;
    baseSlotKey: string | null;
    slotPosition: number | null;
    assignedUser: EligibleParticipant;
  }>;
  warnings: string[];
  distributionWarnings: Array<{
    occurrenceKey: string;
    periodStart: string;
    periodEnd: string;
    repeatedParticipantCount: number;
  }>;
  adjustedStart: string | null;
  horizonEnd: string;
  rosterFingerprint: string;
  participantSnapshot: EligibleParticipant[];
}

interface DutyEditPlanningOptions {
  recurrenceOverride?: DutyRecurrence;
}

class DutyRotationService {
  static async list(includeInactive = false) {
    const duties = await prisma.dutyRotation.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: dutyWithParticipantsInclude,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
    const response = duties.map(toDutyRotationDto);
    response.forEach(duty => {
      if (duty.configurationStatus === 'INVALID') {
        console.error('Rotaciones: configuracion incompatible detectada', {
          dutyId: duty.id,
          issueCodes: duty.configurationIssues.map(issue => issue.code),
        });
      }
    });
    return response;
  }

  private static async assertEligibleParticipants(
    tx: DutyTransactionClient,
    participantIds: number[]
  ) {
    const users = await tx.users.findMany({
      where: withActiveNonRemoteUsers({ id: { in: participantIds } }),
      select: participantPreviewSelect,
    });
    if (users.length !== participantIds.length) {
      throw new AppError(
        'Uno o mas participantes estan inactivos, son remotos o ya no existen',
        409
      );
    }
    const usersById = new Map(users.map(user => [user.id, user]));
    return participantIds.map(userId => {
      const user = usersById.get(userId);
      if (!user) {
        throw new AppError(
          'No se pudo resolver el orden de participantes',
          409
        );
      }
      return user;
    });
  }

  private static rosterFingerprint(userIds: number[]) {
    return createHash('sha256')
      .update([...userIds].sort((a, b) => a - b).join(','))
      .digest('hex');
  }

  private static async activeEligibleParticipants(tx: DutyTransactionClient) {
    return tx.users.findMany({
      where: withActiveNonRemoteUsers(),
      select: participantPreviewSelect,
      orderBy: [
        { profile: { lastName: 'asc' } },
        { profile: { firstName: 'asc' } },
        { id: 'asc' },
      ],
    });
  }

  static async eligibleRoster() {
    const participants = await this.activeEligibleParticipants(prisma);
    return {
      participants,
      rosterFingerprint: this.rosterFingerprint(
        participants.map(participant => participant.id)
      ),
    };
  }

  private static async assertParticipantSource(
    tx: DutyTransactionClient,
    draft: DutyDraft
  ) {
    const participants = await this.assertEligibleParticipants(
      tx,
      draft.participantIds
    );
    if (draft.participantSource !== 'ACTIVE_ELIGIBLE_SYNC') {
      return participants;
    }
    const active = await this.activeEligibleParticipants(tx);
    const expected = this.rosterFingerprint(active.map(item => item.id));
    const received = this.rosterFingerprint(draft.participantIds);
    if (expected !== received) {
      throw new AppError(
        'El personal activo cambio. Sincronice y vuelva a previsualizar la actividad',
        409
      );
    }
    return participants;
  }

  private static recurrenceJson(recurrence: DutyRecurrence) {
    return dutyRecurrenceSchema.parse(recurrence) as Prisma.InputJsonValue;
  }

  private static activityData(
    draft: DutyDraft,
    planningStartsOn: string,
    recurrenceOverride?: DutyRecurrence
  ): Prisma.DutyRotationUncheckedCreateInput {
    const recurrence =
      recurrenceOverride ?? DutyPlannerPolicy.recurrenceFromDraft(draft);
    return {
      name: draft.name,
      description: draft.description || null,
      capabilityKey: draft.capabilityKey || null,
      accessWindowDays: draft.accessWindowDays,
      frequency: draft.recurrence.frequency,
      assignmentStrategy: draft.assignmentStrategy,
      participantSource: draft.participantSource,
      evidencePolicy: draft.evidencePolicy,
      recurrenceRule: this.recurrenceJson(recurrence),
      weekStartsOn:
        recurrence.frequency === 'WEEKLY' ? recurrence.weekStartsOn : 'MONDAY',
      validFrom: DutyPlannerPolicy.parseDate(draft.validFrom),
      validUntil: draft.validUntil
        ? DutyPlannerPolicy.parseDate(draft.validUntil)
        : null,
      planningStartsOn: DutyPlannerPolicy.parseDate(planningStartsOn),
      excludedOccurrenceKeys: draft.excludedOccurrenceKeys,
    };
  }

  private static previewHorizon(draft: DutyDraft, referenceDate = new Date()) {
    const today = DutyPlannerPolicy.todayInLima(referenceDate);
    const start = draft.validFrom > today ? draft.validFrom : today;
    const naturalEnd = DutyPlannerPolicy.addDays(start, 730);
    const end =
      draft.validUntil && draft.validUntil < naturalEnd
        ? draft.validUntil
        : naturalEnd;
    return { start, end };
  }

  private static buildPreview(
    draft: DutyDraft,
    participants: EligibleParticipant[],
    referenceDate = new Date(),
    rangeFrom?: string,
    history: DutyAllocationHistoryItem[] = [],
    recurrenceOverride?: DutyRecurrence
  ): DutyPreviewResult {
    const previewRange = this.previewHorizon(draft, referenceDate);
    const start = rangeFrom ?? previewRange.start;
    const configuration = {
      ...DutyPlannerPolicy.fromDraft(draft),
      ...(recurrenceOverride ? { recurrence: recurrenceOverride } : {}),
    };
    const occurrences = DutyPlannerPolicy.plan(
      configuration,
      start,
      previewRange.end
    );
    const previewOccurrences = occurrences.slice(0, 12);
    const warnings: string[] = [];
    const distributionWarnings: DutyPreviewResult['distributionWarnings'] = [];
    let assignments: DutyPreviewResult['occurrences'];
    if (draft.assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS') {
      const participantById = new Map(
        participants.map((participant, position) => [
          participant.id,
          { participant, position },
        ])
      );
      const currentHistory = [...history];
      try {
        assignments = previewOccurrences.flatMap(occurrence => {
          const allocation = DutyAllocationPolicy.allocate(
            configuration.recurrence.slots,
            participants.map((participant, position) => ({
              id: participant.id,
              position,
            })),
            currentHistory
          );
          if (allocation.repeatedGroupCount > 0) {
            distributionWarnings.push({
              occurrenceKey: occurrence.occurrenceKey,
              periodStart: occurrence.periodStart,
              periodEnd: occurrence.periodEnd,
              repeatedParticipantCount: allocation.repeatedGroupCount,
            });
          }
          return allocation.assignments.map(assignment => {
            currentHistory.push({
              baseSlotKey: assignment.baseSlotKey,
              assignedUserId: assignment.assignedUserId,
            });
            const assigned = participantById.get(assignment.assignedUserId);
            if (!assigned) {
              throw new DutyAllocationError(
                'No se pudo resolver un participante de la vista previa'
              );
            }
            return {
              occurrenceKey: occurrence.occurrenceKey,
              periodStart: occurrence.periodStart,
              periodEnd: occurrence.periodEnd,
              dueOn: occurrence.dueOn,
              ...assignment,
              assignedUser: assigned.participant,
            };
          });
        });
      } catch (error) {
        if (error instanceof DutyAllocationError) {
          throw new AppError(error.message, 409);
        }
        throw error;
      }
    } else {
      assignments = DutyPlannerPolicy.flatten(previewOccurrences).map(
        (assignment, index) => ({
          ...assignment,
          baseSlotKey: null,
          slotPosition: null,
          assignedUser: participants[index % participants.length],
        })
      );
    }
    const adjustedStart = assignments[0]?.occurrenceKey ?? null;
    if (!assignments.length) {
      warnings.push(
        'No existen ocurrencias completas dentro de la vigencia configurada.'
      );
    }
    if (
      draft.recurrence.frequency === 'MONTHLY' &&
      draft.recurrence.daysOfMonth.some(day => day > 28)
    ) {
      warnings.push(
        'Los dias inexistentes de un mes se omiten; nunca se mueven a otra fecha.'
      );
    }
    return {
      occurrences: assignments,
      warnings: [...new Set(warnings)],
      distributionWarnings,
      adjustedStart,
      horizonEnd: previewRange.end,
      rosterFingerprint: this.rosterFingerprint(
        participants.map(participant => participant.id)
      ),
      participantSnapshot: participants,
    };
  }

  static async preview(draft: DutyDraft, referenceDate = new Date()) {
    return prisma.$transaction(async tx => {
      const participants = await this.assertParticipantSource(tx, draft);
      return this.buildPreview(draft, participants, referenceDate);
    });
  }

  static async create(
    draft: DutyDraft,
    requestKey: string,
    referenceDate = new Date()
  ) {
    return DutyReconcilerService.withSerializableRetry(async tx => {
      const previous = await tx.dutyRotation.findUnique({
        where: { creationKey: requestKey },
        include: dutyWithParticipantsInclude,
      });
      if (previous) {
        return {
          duty: toDutyRotationDto(previous),
          reconciliation: null,
          idempotentReplay: true,
        };
      }
      await this.assertParticipantSource(tx, draft);
      const duty = await tx.dutyRotation.create({
        data: {
          ...this.activityData(draft, draft.validFrom),
          creationKey: requestKey,
          participants: {
            create: draft.participantIds.map((userId, position) => ({
              userId,
              position,
            })),
          },
        },
        include: dutyWithParticipantsInclude,
      });
      const reconciliation = await DutyReconcilerService.reconcileInTransaction(
        tx,
        duty,
        {
          referenceDate,
          horizonEnd: DutyPlannerPolicy.horizonEnd(referenceDate),
        }
      );
      const savedDuty = await tx.dutyRotation.findUniqueOrThrow({
        where: { id: duty.id },
        include: dutyWithParticipantsInclude,
      });
      return {
        duty: toDutyRotationDto(savedDuty),
        reconciliation,
        idempotentReplay: false,
      };
    });
  }

  private static assertExpectedVersion(
    duty: DutyWithParticipants,
    expectedVersion: number
  ) {
    if (duty.configurationVersion !== expectedVersion) {
      throw new AppError(
        'La actividad cambio despues de la previsualizacion. Actualice e intente nuevamente',
        409
      );
    }
  }

  private static assertEffectiveOccurrence(
    draft: DutyDraft,
    effectiveFrom: string,
    referenceDate = new Date(),
    recurrenceOverride?: DutyRecurrence
  ) {
    const today = DutyPlannerPolicy.todayInLima(referenceDate);
    if (effectiveFrom <= today) {
      throw new AppError(
        'Los cambios deben comenzar en una ocurrencia futura completa',
        409
      );
    }
    const horizonEnd = DutyPlannerPolicy.addDays(effectiveFrom, 730);
    const firstOccurrence = DutyPlannerPolicy.plan(
      {
        ...DutyPlannerPolicy.fromDraft(draft),
        ...(recurrenceOverride ? { recurrence: recurrenceOverride } : {}),
      },
      effectiveFrom,
      draft.validUntil && draft.validUntil < horizonEnd
        ? draft.validUntil
        : horizonEnd
    )[0];
    if (!firstOccurrence || firstOccurrence.occurrenceKey !== effectiveFrom) {
      throw new AppError(
        'La fecha de aplicacion debe identificar una ocurrencia futura completa',
        409
      );
    }
  }

  private static impactResponse(
    impact: DutyImpactPreview,
    preview: DutyPreviewResult,
    regeneratedCount = preview.occurrences.length
  ) {
    return {
      preservedCount: impact.preserved.length,
      removedCount: impact.removable.length,
      regeneratedCount,
      conflictCount: impact.conflicts.length,
      preserved: impact.preserved.map(assignment =>
        this.impactAssignmentResponse(assignment)
      ),
      removed: impact.removable.map(assignment =>
        this.impactAssignmentResponse(assignment)
      ),
      conflicts: impact.conflicts.map(assignment =>
        this.impactAssignmentResponse(assignment, assignment.protectionReason)
      ),
      preview,
    };
  }

  private static plannedAssignmentCount(
    draft: DutyDraft,
    rangeFrom: string,
    rangeTo: string,
    recurrenceOverride?: DutyRecurrence
  ) {
    const occurrences = DutyPlannerPolicy.plan(
      {
        ...DutyPlannerPolicy.fromDraft(draft),
        ...(recurrenceOverride ? { recurrence: recurrenceOverride } : {}),
      },
      rangeFrom,
      rangeTo
    );
    return draft.assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS'
      ? occurrences.length * draft.participantIds.length
      : DutyPlannerPolicy.flatten(occurrences).length;
  }

  private static impactAssignmentResponse(
    assignment: DutyImpactPreview['preserved'][number],
    protectionReason?: string
  ) {
    return {
      id: assignment.id,
      dutyId: assignment.dutyId,
      occurrenceKey: assignment.occurrenceKey,
      periodStart: DutyPlannerPolicy.formatDate(assignment.periodStart),
      periodEnd: DutyPlannerPolicy.formatDate(assignment.periodEnd),
      dueOn: DutyPlannerPolicy.formatDate(assignment.dueOn),
      slotKey: assignment.slotKey,
      slotLabel: assignment.slotLabel,
      assignedUserId: assignment.assignedUserId,
      status: assignment.status,
      origin: assignment.origin,
      isLocked: assignment.isLocked,
      ...(protectionReason ? { protectionReason } : {}),
    };
  }

  static async previewEdit(
    dutyId: string,
    input: EditDutyInput,
    referenceDate = new Date(),
    options: DutyEditPlanningOptions = {}
  ) {
    return prisma.$transaction(async tx => {
      const duty = await tx.dutyRotation.findUnique({
        where: { id: dutyId },
        include: dutyWithParticipantsInclude,
      });
      if (!duty) throw new AppError('No se pudo encontrar la actividad', 404);
      this.assertExpectedVersion(duty, input.expectedVersion);
      this.assertEffectiveOccurrence(
        input.draft,
        input.effectiveFrom,
        referenceDate,
        options.recurrenceOverride
      );
      const participants = await this.assertParticipantSource(tx, input.draft);
      const horizonEnd = DutyPlannerPolicy.horizonEnd(referenceDate);
      const impact = await DutyReconcilerService.previewImpact(
        tx,
        dutyId,
        input.effectiveFrom,
        horizonEnd,
        referenceDate
      );
      const preview = this.buildPreview(
        input.draft,
        participants,
        referenceDate,
        input.effectiveFrom,
        [],
        options.recurrenceOverride
      );
      const regeneratedCount = this.plannedAssignmentCount(
        input.draft,
        input.effectiveFrom,
        horizonEnd,
        options.recurrenceOverride
      );
      return this.impactResponse(impact, preview, regeneratedCount);
    });
  }

  static async update(
    dutyId: string,
    input: EditDutyInput,
    referenceDate = new Date(),
    options: DutyEditPlanningOptions = {}
  ) {
    return DutyReconcilerService.withSerializableRetry(async tx => {
      const current = await tx.dutyRotation.findUnique({
        where: { id: dutyId },
        include: dutyWithParticipantsInclude,
      });
      if (!current)
        throw new AppError('No se pudo encontrar la actividad', 404);
      if (current.lastMutationKey === input.requestKey) {
        return {
          duty: toDutyRotationDto(current),
          reconciliation: null,
          idempotentReplay: true,
        };
      }
      this.assertExpectedVersion(current, input.expectedVersion);
      this.assertEffectiveOccurrence(
        input.draft,
        input.effectiveFrom,
        referenceDate,
        options.recurrenceOverride
      );
      const participants = await this.assertParticipantSource(tx, input.draft);
      const horizonEnd = DutyPlannerPolicy.horizonEnd(referenceDate);
      const impact = await DutyReconcilerService.previewImpact(
        tx,
        dutyId,
        input.effectiveFrom,
        horizonEnd,
        referenceDate
      );
      if (impact.removable.length) {
        await tx.dutyRotationAssignment.deleteMany({
          where: {
            id: { in: impact.removable.map(assignment => assignment.id) },
          },
        });
      }
      await tx.dutyRotationParticipant.deleteMany({ where: { dutyId } });
      const updated = await tx.dutyRotation.update({
        where: { id: dutyId },
        data: {
          ...this.activityData(
            input.draft,
            input.effectiveFrom,
            options.recurrenceOverride
          ),
          configurationVersion: { increment: 1 },
          rosterVersion: { increment: 1 },
          lastMutationKey: input.requestKey,
          participants: {
            create: input.draft.participantIds.map((userId, position) => ({
              userId,
              position,
            })),
          },
        },
        include: dutyWithParticipantsInclude,
      });
      const reconciliation = await DutyReconcilerService.reconcileInTransaction(
        tx,
        updated,
        { referenceDate, horizonEnd, removeObsolete: true }
      );
      const preview = this.buildPreview(
        input.draft,
        participants,
        referenceDate,
        input.effectiveFrom,
        [],
        options.recurrenceOverride
      );
      const regeneratedCount = this.plannedAssignmentCount(
        input.draft,
        input.effectiveFrom,
        horizonEnd,
        options.recurrenceOverride
      );
      return {
        duty: toDutyRotationDto(updated),
        reconciliation,
        impact: this.impactResponse(impact, preview, regeneratedCount),
        idempotentReplay: false,
      };
    });
  }

  static async previewStatus(
    dutyId: string,
    isActive: boolean,
    expectedVersion: number,
    referenceDate = new Date()
  ) {
    return prisma.$transaction(async tx => {
      const duty = await tx.dutyRotation.findUnique({
        where: { id: dutyId },
        include: dutyWithParticipantsInclude,
      });
      if (!duty) throw new AppError('No se pudo encontrar la actividad', 404);
      this.assertExpectedVersion(duty, expectedVersion);
      if (isActive) DutyReconcilerService.assertConfigurationValid(duty);
      const today = DutyPlannerPolicy.todayInLima(referenceDate);
      const impact = await DutyReconcilerService.previewImpact(
        tx,
        dutyId,
        DutyPlannerPolicy.addDays(today, 1),
        DutyPlannerPolicy.addDays(today, 3650),
        referenceDate
      );
      return {
        isActive,
        removableCount: isActive ? 0 : impact.removable.length,
        preservedCount: impact.preserved.length,
        conflictCount: impact.conflicts.length,
        conflicts: impact.conflicts.map(assignment =>
          this.impactAssignmentResponse(assignment, assignment.protectionReason)
        ),
      };
    });
  }

  static async setStatus(
    dutyId: string,
    isActive: boolean,
    expectedVersion: number,
    requestKey: string,
    referenceDate = new Date()
  ) {
    return DutyReconcilerService.withSerializableRetry(async tx => {
      const duty = await tx.dutyRotation.findUnique({
        where: { id: dutyId },
        include: dutyWithParticipantsInclude,
      });
      if (!duty) throw new AppError('No se pudo encontrar la actividad', 404);
      if (duty.lastMutationKey === requestKey) {
        return {
          duty: toDutyRotationDto(duty),
          reconciliation: null,
          idempotentReplay: true,
        };
      }
      this.assertExpectedVersion(duty, expectedVersion);
      const today = DutyPlannerPolicy.todayInLima(referenceDate);
      let deletedCount = 0;
      let conflicts: DutyImpactPreview['conflicts'] = [];
      let planningStartsOn = DutyPlannerPolicy.formatDate(
        duty.planningStartsOn
      );
      if (!isActive) {
        const impact = await DutyReconcilerService.previewImpact(
          tx,
          dutyId,
          DutyPlannerPolicy.addDays(today, 1),
          DutyPlannerPolicy.addDays(today, 3650),
          referenceDate
        );
        conflicts = impact.conflicts;
        if (impact.removable.length) {
          const result = await tx.dutyRotationAssignment.deleteMany({
            where: {
              id: { in: impact.removable.map(assignment => assignment.id) },
            },
          });
          deletedCount = result.count;
        }
      } else {
        const configuration = DutyReconcilerService.planningConfiguration(duty);
        const nextOccurrence = DutyPlannerPolicy.plan(
          configuration,
          DutyPlannerPolicy.addDays(today, 1),
          DutyPlannerPolicy.addDays(today, 730)
        )[0];
        planningStartsOn =
          nextOccurrence?.occurrenceKey ?? DutyPlannerPolicy.addDays(today, 1);
      }
      const updated = await tx.dutyRotation.update({
        where: { id: dutyId },
        data: {
          isActive,
          planningStartsOn: DutyPlannerPolicy.parseDate(planningStartsOn),
          configurationVersion: { increment: 1 },
          lastMutationKey: requestKey,
        },
        include: dutyWithParticipantsInclude,
      });
      let reconciliation: ReconciliationSummary | null = null;
      if (isActive) {
        reconciliation = await DutyReconcilerService.reconcileInTransaction(
          tx,
          updated,
          {
            referenceDate,
            horizonEnd: DutyPlannerPolicy.horizonEnd(referenceDate),
          }
        );
      }
      return {
        duty: toDutyRotationDto(updated),
        deletedCount,
        conflicts: conflicts.map(assignment =>
          this.impactAssignmentResponse(assignment, assignment.protectionReason)
        ),
        reconciliation,
        idempotentReplay: false,
      };
    });
  }

  static repair(dutyId: string, referenceDate = new Date()) {
    return DutyReconcilerService.reconcileDuty(dutyId, {
      referenceDate,
      removeObsolete: true,
    });
  }

  private static recurrenceDraft(recurrence: DutyRecurrence) {
    if (recurrence.frequency === 'WEEKLY') {
      const { weekStartsOn: _weekStartsOn, ...draft } = recurrence;
      return draft;
    }
    return recurrence;
  }

  private static async rosterSyncPlan(dutyId: string, expectedVersion: number) {
    const duty = await prisma.dutyRotation.findUnique({
      where: { id: dutyId },
      include: dutyWithParticipantsInclude,
    });
    if (!duty) throw new AppError('No se pudo encontrar la actividad', 404);
    this.assertExpectedVersion(duty, expectedVersion);
    if (duty.participantSource !== 'ACTIVE_ELIGIBLE_SYNC') {
      throw new AppError(
        'Esta actividad usa una lista explicita y no admite sincronizacion automatica',
        409
      );
    }
    const recurrence = DutyReconcilerService.assertConfigurationValid(duty);
    const active = await this.activeEligibleParticipants(prisma);
    const activeIds = new Set(active.map(participant => participant.id));
    const currentIds = duty.participants.map(participant => participant.userId);
    const preservedIds = currentIds.filter(userId => activeIds.has(userId));
    const preservedSet = new Set(preservedIds);
    const addedIds = active
      .map(participant => participant.id)
      .filter(userId => !preservedSet.has(userId));
    const removedIds = currentIds.filter(userId => !activeIds.has(userId));
    const participantIds = [...preservedIds, ...addedIds];
    const slots = recurrence.slots.map(slot => ({
      ...slot,
      eligibleParticipantIds: slot.eligibleParticipantIds?.filter(userId =>
        activeIds.has(userId)
      ),
    }));
    const synchronizedRecurrence = dutyRecurrenceSchema.parse({
      ...recurrence,
      slots,
    });
    const draft = {
      name: duty.name,
      description: duty.description,
      capabilityKey: duty.capabilityKey,
      accessWindowDays: duty.accessWindowDays,
      assignmentStrategy: duty.assignmentStrategy,
      participantSource: duty.participantSource,
      evidencePolicy: duty.evidencePolicy,
      validFrom: DutyPlannerPolicy.formatDate(duty.validFrom),
      validUntil: duty.validUntil
        ? DutyPlannerPolicy.formatDate(duty.validUntil)
        : null,
      recurrence: this.recurrenceDraft(synchronizedRecurrence),
      participantIds,
      excludedOccurrenceKeys: duty.excludedOccurrenceKeys,
    } satisfies DutyDraft;
    return {
      duty,
      draft,
      addedIds,
      removedIds,
      preservedIds,
      recurrence: synchronizedRecurrence,
      rosterFingerprint: this.rosterFingerprint(
        active.map(participant => participant.id)
      ),
    };
  }

  static async previewRosterSync(
    dutyId: string,
    input: {
      effectiveFrom: string;
      expectedVersion: number;
      rosterFingerprint: string;
    },
    referenceDate = new Date()
  ) {
    const plan = await this.rosterSyncPlan(dutyId, input.expectedVersion);
    if (plan.rosterFingerprint !== input.rosterFingerprint) {
      throw new AppError(
        'El personal activo cambio. Actualice la lista antes de continuar',
        409
      );
    }
    const impact = await this.previewEdit(
      dutyId,
      {
        draft: plan.draft,
        effectiveFrom: input.effectiveFrom,
        expectedVersion: input.expectedVersion,
        requestKey: randomUUID(),
      },
      referenceDate,
      { recurrenceOverride: plan.recurrence }
    );
    return {
      addedIds: plan.addedIds,
      removedIds: plan.removedIds,
      preservedIds: plan.preservedIds,
      rosterFingerprint: plan.rosterFingerprint,
      impact,
    };
  }

  static async confirmRosterSync(
    dutyId: string,
    input: {
      effectiveFrom: string;
      expectedVersion: number;
      rosterFingerprint: string;
      requestKey: string;
    },
    referenceDate = new Date()
  ) {
    const current = await prisma.dutyRotation.findUnique({
      where: { id: dutyId },
      include: dutyWithParticipantsInclude,
    });
    if (!current) throw new AppError('No se pudo encontrar la actividad', 404);
    if (current.lastMutationKey === input.requestKey) {
      const preservedIds = current.participants.map(
        participant => participant.userId
      );
      return {
        duty: toDutyRotationDto(current),
        reconciliation: null,
        idempotentReplay: true,
        addedIds: [],
        removedIds: [],
        preservedIds,
        rosterFingerprint: this.rosterFingerprint(preservedIds),
      };
    }
    const plan = await this.rosterSyncPlan(dutyId, input.expectedVersion);
    if (plan.rosterFingerprint !== input.rosterFingerprint) {
      throw new AppError(
        'El personal activo cambio. Vuelva a previsualizar la sincronizacion',
        409
      );
    }
    const result = await this.update(
      dutyId,
      {
        draft: plan.draft,
        effectiveFrom: input.effectiveFrom,
        expectedVersion: input.expectedVersion,
        requestKey: input.requestKey,
      },
      referenceDate,
      { recurrenceOverride: plan.recurrence }
    );
    return {
      ...result,
      addedIds: plan.addedIds,
      removedIds: plan.removedIds,
      preservedIds: plan.preservedIds,
      rosterFingerprint: plan.rosterFingerprint,
    };
  }

  private static async occurrenceExclusionPlan(
    tx: DutyTransactionClient,
    dutyId: string,
    occurrenceKey: string,
    excludedUserIds: number[],
    expectedVersion: number,
    referenceDate = new Date()
  ) {
    const duty = await tx.dutyRotation.findUnique({
      where: { id: dutyId },
      include: dutyWithParticipantsInclude,
    });
    if (!duty) throw new AppError('No se pudo encontrar la actividad', 404);
    this.assertExpectedVersion(duty, expectedVersion);
    if (duty.assignmentStrategy !== 'DISTRIBUTE_PARTICIPANTS') {
      throw new AppError(
        'Las ausencias por ocurrencia solo aplican a actividades que distribuyen a todos los participantes',
        409
      );
    }
    const configuration = DutyReconcilerService.planningConfiguration(duty);
    const occurrence = DutyPlannerPolicy.plan(
      configuration,
      occurrenceKey,
      DutyPlannerPolicy.addDays(occurrenceKey, 31)
    ).find(item => item.occurrenceKey === occurrenceKey);
    if (!occurrence) {
      throw new AppError(
        'La clave indicada no corresponde a una ocurrencia completa de la actividad',
        409
      );
    }
    const participantIds = new Set(
      duty.participants.map(participant => participant.userId)
    );
    if (excludedUserIds.some(userId => !participantIds.has(userId))) {
      throw new AppError(
        'Solo se pueden excluir participantes de esta actividad',
        409
      );
    }
    const currentAssignments = await tx.dutyRotationAssignment.findMany({
      where: { dutyId, occurrenceKey },
      include: { swapRequests: { select: { id: true } } },
      orderBy: { slotKey: 'asc' },
    });
    const today = DutyPlannerPolicy.todayInLima(referenceDate);
    const protectedAssignments = currentAssignments.filter(assignment =>
      Boolean(DutyReconcilerService.protectionReason(assignment, today))
    );
    const excludedSet = new Set(excludedUserIds);
    const conflicts = protectedAssignments
      .filter(assignment => excludedSet.has(assignment.assignedUserId))
      .map(assignment => ({
        assignmentId: assignment.id,
        assignedUserId: assignment.assignedUserId,
        slotKey: assignment.slotKey,
        reason:
          DutyReconcilerService.protectionReason(assignment, today) ??
          'La asignacion esta protegida',
      }));
    if (occurrence.periodStart <= today) {
      conflicts.push({
        assignmentId: '',
        assignedUserId: 0,
        slotKey: '',
        reason:
          'La ocurrencia ya comenzo; solo se pueden redistribuir ocurrencias futuras',
      });
    }
    const available = duty.participants
      .filter(participant => !excludedSet.has(participant.userId))
      .map(participant => ({
        id: participant.userId,
        position: participant.position,
      }));
    const history = await tx.dutyRotationAssignment.findMany({
      where: {
        dutyId,
        periodStart: {
          lt: DutyPlannerPolicy.parseDate(occurrence.periodStart),
        },
        baseSlotKey: { not: null },
      },
      select: {
        baseSlotKey: true,
        assignedUserId: true,
      },
      orderBy: [{ periodStart: 'asc' }, { slotKey: 'asc' }],
    });
    let allocation;
    try {
      allocation = DutyAllocationPolicy.allocate(
        configuration.recurrence.slots,
        available,
        history.flatMap(item =>
          item.baseSlotKey ? [{ ...item, baseSlotKey: item.baseSlotKey }] : []
        ),
        protectedAssignments
          .filter(assignment => !excludedSet.has(assignment.assignedUserId))
          .map(assignment => ({
            slotKey: assignment.slotKey,
            assignedUserId: assignment.assignedUserId,
          }))
      );
    } catch (error) {
      if (error instanceof DutyAllocationError) {
        throw new AppError(error.message, 409);
      }
      throw error;
    }
    const participantById = new Map(
      duty.participants.map(participant => [
        participant.userId,
        participant.user,
      ])
    );
    const existingExclusions =
      await tx.dutyRotationOccurrenceExclusion.findMany({
        where: { dutyId, occurrenceKey },
        select: { userId: true, reason: true },
        orderBy: { userId: 'asc' },
      });
    return {
      duty,
      occurrence,
      existingExclusions,
      excludedUserIds,
      canApply: conflicts.length === 0,
      conflicts,
      removableIds: currentAssignments
        .filter(
          assignment =>
            !DutyReconcilerService.protectionReason(assignment, today)
        )
        .map(assignment => assignment.id),
      warnings: allocation.warnings,
      assignments: allocation.assignments.map(assignment => ({
        ...assignment,
        assignedUser: participantById.get(assignment.assignedUserId) ?? null,
      })),
    };
  }

  private static occurrenceExclusionResponse(
    plan: Awaited<
      ReturnType<typeof DutyRotationService.occurrenceExclusionPlan>
    >
  ) {
    return {
      dutyId: plan.duty.id,
      dutyName: plan.duty.name,
      configurationVersion: plan.duty.configurationVersion,
      rosterVersion: plan.duty.rosterVersion,
      occurrence: plan.occurrence,
      existingExclusions: plan.existingExclusions,
      excludedUserIds: plan.excludedUserIds,
      canApply: plan.canApply,
      conflicts: plan.conflicts,
      replacedCount: plan.removableIds.length,
      warnings: plan.warnings,
      assignments: plan.assignments,
    };
  }

  static async getOccurrence(
    dutyId: string,
    occurrenceKey: string,
    referenceDate = new Date()
  ) {
    return prisma.$transaction(async tx => {
      const duty = await tx.dutyRotation.findUnique({
        where: { id: dutyId },
        include: dutyWithParticipantsInclude,
      });
      if (!duty) throw new AppError('No se pudo encontrar la actividad', 404);
      const exclusions = await tx.dutyRotationOccurrenceExclusion.findMany({
        where: { dutyId, occurrenceKey },
        select: { userId: true },
      });
      const plan = await this.occurrenceExclusionPlan(
        tx,
        dutyId,
        occurrenceKey,
        exclusions.map(item => item.userId),
        duty.configurationVersion,
        referenceDate
      );
      const assignments = await tx.dutyRotationAssignment.findMany({
        where: { dutyId, occurrenceKey },
        include: dutyAssignmentInclude,
        orderBy: { slotKey: 'asc' },
      });
      return {
        ...this.occurrenceExclusionResponse(plan),
        persistedAssignments: toDutyAssignmentDtos(assignments),
      };
    });
  }

  static async previewOccurrenceExclusions(
    dutyId: string,
    occurrenceKey: string,
    input: { excludedUserIds: number[]; expectedVersion: number },
    referenceDate = new Date()
  ) {
    return prisma.$transaction(async tx =>
      this.occurrenceExclusionResponse(
        await this.occurrenceExclusionPlan(
          tx,
          dutyId,
          occurrenceKey,
          input.excludedUserIds,
          input.expectedVersion,
          referenceDate
        )
      )
    );
  }

  static async updateOccurrenceExclusions(
    dutyId: string,
    occurrenceKey: string,
    input: {
      excludedUserIds: number[];
      reason?: string;
      expectedVersion: number;
      requestKey: string;
    },
    createdById: number,
    referenceDate = new Date()
  ) {
    return DutyReconcilerService.withSerializableRetry(async tx => {
      const current = await tx.dutyRotation.findUnique({
        where: { id: dutyId },
        include: dutyWithParticipantsInclude,
      });
      if (!current)
        throw new AppError('No se pudo encontrar la actividad', 404);
      if (current.lastMutationKey === input.requestKey) {
        const exclusions = await tx.dutyRotationOccurrenceExclusion.findMany({
          where: { dutyId, occurrenceKey },
          select: { userId: true },
        });
        const replayPlan = await this.occurrenceExclusionPlan(
          tx,
          dutyId,
          occurrenceKey,
          exclusions.map(item => item.userId),
          current.configurationVersion,
          referenceDate
        );
        const replayAssignments = await tx.dutyRotationAssignment.findMany({
          where: { dutyId, occurrenceKey },
          include: dutyAssignmentInclude,
          orderBy: { slotKey: 'asc' },
        });
        return {
          ...this.occurrenceExclusionResponse(replayPlan),
          persistedAssignments: toDutyAssignmentDtos(replayAssignments),
          idempotentReplay: true,
        };
      }
      const plan = await this.occurrenceExclusionPlan(
        tx,
        dutyId,
        occurrenceKey,
        input.excludedUserIds,
        input.expectedVersion,
        referenceDate
      );
      if (!plan.canApply) {
        throw new AppError(
          'La ausencia entra en conflicto con asignaciones protegidas',
          409
        );
      }
      if (plan.removableIds.length) {
        await tx.dutyRotationAssignment.deleteMany({
          where: { id: { in: plan.removableIds } },
        });
      }
      await tx.dutyRotationOccurrenceExclusion.deleteMany({
        where: { dutyId, occurrenceKey },
      });
      if (input.excludedUserIds.length) {
        await tx.dutyRotationOccurrenceExclusion.createMany({
          data: input.excludedUserIds.map(userId => ({
            dutyId,
            occurrenceKey,
            userId,
            createdById,
            reason: input.reason?.trim() || null,
          })),
        });
      }
      const updated = await tx.dutyRotation.update({
        where: { id: dutyId },
        data: {
          configurationVersion: { increment: 1 },
          lastMutationKey: input.requestKey,
        },
        include: dutyWithParticipantsInclude,
      });
      const reconciliation = await DutyReconcilerService.reconcileInTransaction(
        tx,
        updated,
        {
          referenceDate,
          horizonEnd:
            plan.occurrence.periodEnd >
            DutyPlannerPolicy.horizonEnd(referenceDate)
              ? plan.occurrence.periodEnd
              : DutyPlannerPolicy.horizonEnd(referenceDate),
        }
      );
      const refreshedPlan = await this.occurrenceExclusionPlan(
        tx,
        dutyId,
        occurrenceKey,
        input.excludedUserIds,
        updated.configurationVersion,
        referenceDate
      );
      const assignments = await tx.dutyRotationAssignment.findMany({
        where: { dutyId, occurrenceKey },
        include: dutyAssignmentInclude,
        orderBy: { slotKey: 'asc' },
      });
      return {
        ...this.occurrenceExclusionResponse(refreshedPlan),
        persistedAssignments: toDutyAssignmentDtos(assignments),
        reconciliation,
        idempotentReplay: false,
      };
    });
  }

  static async reconcileActiveDuties(referenceDate = new Date()) {
    const dutyIds = await prisma.dutyRotation.findMany({
      where: { isActive: true },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    const summaries: ReconciliationSummary[] = [];
    const failures: Array<{ dutyId: string; message: string }> = [];
    for (const { id } of dutyIds) {
      try {
        summaries.push(
          await DutyReconcilerService.reconcileDuty(id, {
            referenceDate,
            removeObsolete: true,
          })
        );
      } catch (error) {
        failures.push({
          dutyId: id,
          message: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }
    return {
      processedCount: dutyIds.length,
      createdCount: summaries.reduce(
        (total, item) => total + item.createdCount,
        0
      ),
      deletedCount: summaries.reduce(
        (total, item) => total + item.deletedCount,
        0
      ),
      conflictCount: summaries.reduce(
        (total, item) => total + item.conflictCount,
        0
      ),
      failures,
      summaries,
    };
  }
}

export default DutyRotationService;

import type { DutyWithParticipants } from '@/services/rotations/dutyReconciler.service';
import {
  dutyRecurrenceSchema,
  dutyRotationDtoSchema,
  type DutyConfigurationIssue,
  type DutyRecurrence,
  type DutyRotationDto,
} from '@/services/rotations/duty.schema';
import DutyAllocationPolicy, {
  DutyAllocationError,
} from '@/services/rotations/dutyAllocation.policy';

interface PersistedDutyConfiguration {
  id: string;
  frequency: string;
  assignmentStrategy: string;
  recurrenceRule: unknown;
  participants?: ReadonlyArray<{ userId: number }>;
}

export type DutyConfigurationInspection =
  | { isValid: true; recurrence: DutyRecurrence; issues: [] }
  | {
      isValid: false;
      recurrence: null;
      issues: DutyConfigurationIssue[];
    };

export const inspectDutyConfiguration = (
  duty: PersistedDutyConfiguration
): DutyConfigurationInspection => {
  const issues: DutyConfigurationIssue[] = [];
  const recurrence = dutyRecurrenceSchema.safeParse(duty.recurrenceRule);

  if (!recurrence.success) {
    issues.push({
      code: 'INVALID_RECURRENCE_RULE',
      field: 'recurrenceRule',
      message: 'La regla guardada no cumple el contrato vigente.',
    });
  } else if (recurrence.data.frequency !== duty.frequency) {
    issues.push({
      code: 'FREQUENCY_MISMATCH',
      field: 'frequency',
      message: 'La frecuencia no coincide con la regla guardada.',
    });
  }

  if (recurrence.success) {
    const distributed = duty.assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS';
    let allocationIsValid = recurrence.data.slots.every(
      slot => !slot.capacity && !slot.eligibleParticipantIds?.length
    );
    if (distributed) {
      const participants = duty.participants ?? [];
      try {
        DutyAllocationPolicy.allocate(
          recurrence.data.slots,
          participants.map((participant, position) => ({
            id: participant.userId,
            position,
          }))
        );
        allocationIsValid =
          new Set(participants.map(participant => participant.userId)).size ===
          participants.length;
      } catch (error) {
        if (!(error instanceof DutyAllocationError)) throw error;
        allocationIsValid = false;
      }
    }
    if (!allocationIsValid) {
      issues.push({
        code: 'INVALID_ALLOCATION_RULE',
        field: 'recurrenceRule.slots',
        message: 'Los grupos guardados no cumplen la estrategia de reparto.',
      });
    }
  }

  if (!Array.isArray(duty.participants) || duty.participants.length === 0) {
    issues.push({
      code: 'NO_PARTICIPANTS',
      field: 'participants',
      message: 'La actividad no tiene participantes ordenados.',
    });
  }

  if (issues.length > 0 || !recurrence.success) {
    return { isValid: false, recurrence: null, issues };
  }

  return { isValid: true, recurrence: recurrence.data, issues: [] };
};

const formatDateOnly = (value: Date) => value.toISOString().slice(0, 10);

export const toDutyRotationDto = (
  duty: DutyWithParticipants
): DutyRotationDto => {
  const inspection = inspectDutyConfiguration(duty);
  const isValid = inspection.isValid;
  const normalizedWeekStartsOn =
    inspection.recurrence?.frequency === 'WEEKLY'
      ? inspection.recurrence.weekStartsOn
      : duty.weekStartsOn;
  const dto = {
    id: duty.id,
    name: duty.name,
    description: duty.description,
    capabilityKey: duty.capabilityKey,
    accessWindowDays: duty.accessWindowDays,
    frequency: duty.frequency,
    assignmentStrategy: duty.assignmentStrategy,
    participantSource: duty.participantSource,
    evidencePolicy: duty.evidencePolicy,
    rosterVersion: duty.rosterVersion,
    weekStartsOn: normalizedWeekStartsOn,
    validFrom: formatDateOnly(duty.validFrom),
    validUntil: duty.validUntil ? formatDateOnly(duty.validUntil) : null,
    planningStartsOn: formatDateOnly(duty.planningStartsOn),
    excludedOccurrenceKeys: duty.excludedOccurrenceKeys,
    configurationVersion: duty.configurationVersion,
    isActive: duty.isActive,
    lastReconciledAt: duty.lastReconciledAt?.toISOString() ?? null,
    participants: duty.participants.map(participant => ({
      id: participant.id,
      dutyId: participant.dutyId,
      userId: participant.userId,
      position: participant.position,
      user: {
        id: participant.user.id,
        email: participant.user.email,
        status: participant.user.status,
        profile: participant.user.profile
          ? {
              firstName: participant.user.profile.firstName,
              lastName: participant.user.profile.lastName,
            }
          : null,
        role: participant.user.role
          ? {
              id: participant.user.role.id,
              name: participant.user.role.name,
            }
          : null,
      },
    })),
    createdAt: duty.createdAt.toISOString(),
    updatedAt: duty.updatedAt.toISOString(),
    _count: duty._count,
    allowedActions: {
      inspect: true,
      edit: isValid,
      repair: isValid,
      deactivate: duty.isActive,
      reactivate: !duty.isActive && isValid,
    },
    configurationStatus: isValid ? ('VALID' as const) : ('INVALID' as const),
    configurationIssues: inspection.issues,
    recurrenceRule: inspection.recurrence,
  };

  return dutyRotationDtoSchema.parse(dto);
};

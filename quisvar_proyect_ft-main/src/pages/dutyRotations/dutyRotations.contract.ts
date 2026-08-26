import type {
  DutyAssignmentDuty,
  DutyAssignmentEvidence,
  DutyAssignmentStrategy,
  DutyBulkDeleteAssignmentsResponse,
  DutyConfigurationIssue,
  DutyImpactAssignment,
  DutyImpactResponse,
  DutyMutationResponse,
  DutyPreviewOccurrence,
  DutyPreviewResponse,
  DutyEligibleRosterResponse,
  DutyOccurrenceExclusionResponse,
  DutyRosterSyncPreviewResponse,
  DutyReconciliationResponse,
  DutyRotationEntitlement,
  DutyStatusPreviewResponse,
  DutyStatusMutationResponse,
  DutySwapRequest,
  DutyFrequency,
  DutyParticipant,
  DutyParticipantSource,
  DutyEvidencePolicy,
  DutyRecurrence,
  DutyRoleOption,
  DutyRotation,
  DutyRotationAssignment,
  DutyRotationAllowedActions,
  DutyUser,
  DutyWeekday,
} from './models/dutyRotations.types';

const frequencies = new Set<DutyFrequency>([
  'ONCE',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
]);
const strategies = new Set<DutyAssignmentStrategy>([
  'ONE_OWNER_PER_PERIOD',
  'ONE_OWNER_PER_SLOT',
  'DISTRIBUTE_PARTICIPANTS',
]);
const participantSources = new Set<DutyParticipantSource>([
  'EXPLICIT',
  'ACTIVE_ELIGIBLE_SYNC',
]);
const evidencePolicies = new Set<DutyEvidencePolicy>([
  'NONE',
  'OPTIONAL_PHOTO',
  'REQUIRED_PHOTO',
]);
const evidenceMimeTypes: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const isEvidenceMimeType = (
  value: unknown
): value is DutyAssignmentEvidence['mimeType'] =>
  typeof value === 'string' && evidenceMimeTypes.has(value);
const weekdays = new Set<DutyWeekday>([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]);
const decodeWeekday = (value: unknown): DutyWeekday | null =>
  weekdays.has(value as DutyWeekday) ? (value as DutyWeekday) : null;
const assignmentStatuses = new Set([
  'PENDING',
  'COMPLETED',
  'NO_SHOW',
  'OPEN_POOL',
] as const);
const assignmentOrigins = new Set([
  'AUTO',
  'MANUAL',
  'SWAP',
  'OPEN_POOL',
] as const);
const swapStatuses = new Set([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CLAIMED',
] as const);
const configurationIssueCodes = new Set<DutyConfigurationIssue['code']>([
  'INVALID_RECURRENCE_RULE',
  'FREQUENCY_MISMATCH',
  'NO_PARTICIPANTS',
  'INVALID_ALLOCATION_RULE',
  'INVALID_RESPONSE',
]);

const safeActions: DutyRotationAllowedActions = {
  inspect: false,
  edit: false,
  repair: false,
  deactivate: false,
  reactivate: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOnlyKeys = (
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>
) => Object.keys(value).every(key => allowedKeys.has(key));

const optionalString = (value: unknown) =>
  typeof value === 'string' ? value : null;

const positiveInteger = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : null;

const nonnegativeInteger = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;

const dateOnly = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const candidate = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return null;
  const parsed = new Date(`${candidate}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === candidate
    ? candidate
    : null;
};

const stringArray = (value: unknown) =>
  Array.isArray(value) && value.every(item => typeof item === 'string')
    ? value
    : null;

const decodeActions = (value: unknown) => {
  if (!isRecord(value)) return null;
  const keys: Array<keyof DutyRotationAllowedActions> = [
    'inspect',
    'edit',
    'repair',
    'deactivate',
    'reactivate',
  ];
  if (keys.some(key => typeof value[key] !== 'boolean')) return null;
  return {
    inspect: value.inspect as boolean,
    edit: value.edit as boolean,
    repair: value.repair as boolean,
    deactivate: value.deactivate as boolean,
    reactivate: value.reactivate as boolean,
  };
};

const decodeRole = (value: unknown): DutyRoleOption | null => {
  if (!isRecord(value)) return null;
  const id = positiveInteger(value.id);
  if (!id || typeof value.name !== 'string') return null;
  return { id, name: value.name };
};

const decodeUser = (value: unknown): DutyUser | null => {
  if (!isRecord(value)) return null;
  const id = positiveInteger(value.id);
  if (!id) return null;
  const profile = isRecord(value.profile)
    ? {
        firstName:
          typeof value.profile.firstName === 'string'
            ? value.profile.firstName
            : '',
        lastName:
          typeof value.profile.lastName === 'string'
            ? value.profile.lastName
            : '',
      }
    : null;
  return {
    id,
    email: typeof value.email === 'string' ? value.email : undefined,
    status: typeof value.status === 'boolean' ? value.status : undefined,
    roleId: positiveInteger(value.roleId),
    role: decodeRole(value.role),
    profile,
  };
};

const decodeParticipants = (value: unknown) => {
  if (!Array.isArray(value)) return null;
  const participants: DutyParticipant[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const userId = positiveInteger(item.userId);
    const position = nonnegativeInteger(item.position);
    if (
      typeof item.id !== 'string' ||
      typeof item.dutyId !== 'string' ||
      !userId ||
      position === null
    ) {
      return null;
    }
    participants.push({
      id: item.id,
      dutyId: item.dutyId,
      userId,
      position,
      user: decodeUser(item.user),
    });
  }
  return participants;
};

const decodeRecurrence = (value: unknown): DutyRecurrence | null => {
  if (!isRecord(value) || !frequencies.has(value.frequency as DutyFrequency)) {
    return null;
  }
  const frequency = value.frequency as DutyFrequency;
  const allowedKeys = new Set(
    frequency === 'ONCE'
      ? ['frequency', 'date', 'slots']
      : frequency === 'MONTHLY'
      ? ['frequency', 'daysOfMonth', 'slots']
      : frequency === 'WEEKLY'
      ? ['frequency', 'weekStartsOn', 'weekdays', 'slots']
      : ['frequency', 'weekdays', 'slots']
  );
  if (!hasOnlyKeys(value, allowedKeys)) return null;

  const rawSlots = value.slots;
  if (!Array.isArray(rawSlots) || rawSlots.length === 0) return null;
  const slots = rawSlots.flatMap(slot => {
    if (
      !isRecord(slot) ||
      typeof slot.key !== 'string' ||
      slot.key.length === 0 ||
      typeof slot.label !== 'string' ||
      slot.label.length === 0 ||
      !hasOnlyKeys(
        slot,
        new Set([
          'key',
          'label',
          'instructions',
          'capacity',
          'eligibleParticipantIds',
        ])
      )
    ) {
      return [];
    }
    const capacity = isRecord(slot.capacity)
      ? slot.capacity.mode === 'REMAINDER' &&
        hasOnlyKeys(slot.capacity, new Set(['mode']))
        ? ({ mode: 'REMAINDER' } as const)
        : slot.capacity.mode === 'FIXED' &&
          hasOnlyKeys(slot.capacity, new Set(['mode', 'count'])) &&
          positiveInteger(slot.capacity.count)
        ? ({
            mode: 'FIXED',
            count: slot.capacity.count as number,
          } as const)
        : null
      : undefined;
    const eligibleParticipantIds =
      slot.eligibleParticipantIds === undefined
        ? undefined
        : Array.isArray(slot.eligibleParticipantIds) &&
          slot.eligibleParticipantIds.every(id => positiveInteger(id)) &&
          new Set(slot.eligibleParticipantIds).size ===
            slot.eligibleParticipantIds.length
        ? (slot.eligibleParticipantIds as number[])
        : null;
    const instructions =
      slot.instructions === undefined
        ? undefined
        : slot.instructions === null ||
          (typeof slot.instructions === 'string' &&
            slot.instructions.trim().length > 0 &&
            slot.instructions.trim().length <= 500)
        ? slot.instructions
        : undefined;
    if (
      capacity === null ||
      eligibleParticipantIds === null ||
      (slot.instructions !== undefined && instructions === undefined)
    ) {
      return [];
    }
    return [
      {
        key: slot.key,
        label: slot.label,
        ...(instructions !== undefined ? { instructions } : {}),
        ...(capacity ? { capacity } : {}),
        ...(eligibleParticipantIds ? { eligibleParticipantIds } : {}),
      },
    ];
  });
  if (
    slots.length !== rawSlots.length ||
    new Set(slots.map(slot => slot.key)).size !== slots.length
  ) {
    return null;
  }

  if (frequency === 'ONCE') {
    const date = dateOnly(value.date);
    return date ? { frequency: 'ONCE', date, slots } : null;
  }
  if (frequency === 'MONTHLY') {
    if (
      !Array.isArray(value.daysOfMonth) ||
      value.daysOfMonth.length === 0 ||
      !value.daysOfMonth.every(
        day => Number.isInteger(day) && Number(day) >= 1 && Number(day) <= 31
      ) ||
      new Set(value.daysOfMonth).size !== value.daysOfMonth.length
    ) {
      return null;
    }
    return {
      frequency: 'MONTHLY',
      daysOfMonth: value.daysOfMonth as number[],
      slots,
    };
  }
  if (
    !Array.isArray(value.weekdays) ||
    value.weekdays.length === 0 ||
    !value.weekdays.every(day => weekdays.has(day as DutyWeekday)) ||
    new Set(value.weekdays).size !== value.weekdays.length
  ) {
    return null;
  }
  if (frequency === 'WEEKLY') {
    const weekStartsOn = decodeWeekday(value.weekStartsOn);
    if (!weekStartsOn) return null;
    return {
      frequency,
      weekStartsOn,
      weekdays: value.weekdays as DutyWeekday[],
      slots,
    };
  }
  return {
    frequency,
    weekdays: value.weekdays as DutyWeekday[],
    slots,
  };
};

const decodeIssues = (value: unknown): DutyConfigurationIssue[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap(issue => {
    if (
      !isRecord(issue) ||
      typeof issue.code !== 'string' ||
      !configurationIssueCodes.has(
        issue.code as DutyConfigurationIssue['code']
      ) ||
      typeof issue.field !== 'string' ||
      typeof issue.message !== 'string'
    ) {
      return [];
    }
    return [
      {
        code: issue.code as DutyConfigurationIssue['code'],
        field: issue.field,
        message: issue.message,
      },
    ];
  });
};

const invalidDuty = (
  value: unknown,
  index: number,
  issue: DutyConfigurationIssue,
  trustBackendActions = false
): DutyRotation => {
  const record = isRecord(value) ? value : {};
  const frequency = frequencies.has(record.frequency as DutyFrequency)
    ? (record.frequency as DutyFrequency)
    : isRecord(record.recurrenceRule) &&
      frequencies.has(record.recurrenceRule.frequency as DutyFrequency)
    ? (record.recurrenceRule.frequency as DutyFrequency)
    : null;
  const participants = decodeParticipants(record.participants) ?? [];
  const backendIssues = decodeIssues(record.configurationIssues);
  return {
    id:
      typeof record.id === 'string' && record.id.length > 0
        ? record.id
        : `invalid-duty-${index + 1}`,
    name:
      typeof record.name === 'string' && record.name.trim()
        ? record.name
        : `Actividad incompatible ${index + 1}`,
    description: optionalString(record.description),
    capabilityKey: optionalString(record.capabilityKey),
    accessWindowDays: nonnegativeInteger(record.accessWindowDays) ?? 0,
    frequency,
    assignmentStrategy: strategies.has(
      record.assignmentStrategy as DutyAssignmentStrategy
    )
      ? (record.assignmentStrategy as DutyAssignmentStrategy)
      : null,
    participantSource: participantSources.has(
      record.participantSource as DutyParticipantSource
    )
      ? (record.participantSource as DutyParticipantSource)
      : null,
    evidencePolicy: evidencePolicies.has(
      record.evidencePolicy as DutyEvidencePolicy
    )
      ? (record.evidencePolicy as DutyEvidencePolicy)
      : null,
    rosterVersion: positiveInteger(record.rosterVersion),
    weekStartsOn: decodeWeekday(record.weekStartsOn),
    recurrenceRule: null,
    validFrom: dateOnly(record.validFrom),
    validUntil: dateOnly(record.validUntil),
    planningStartsOn: dateOnly(record.planningStartsOn),
    excludedOccurrenceKeys: stringArray(record.excludedOccurrenceKeys) ?? [],
    configurationVersion: positiveInteger(record.configurationVersion),
    isActive: typeof record.isActive === 'boolean' ? record.isActive : false,
    lastReconciledAt: optionalString(record.lastReconciledAt),
    participants,
    createdAt: optionalString(record.createdAt) ?? '',
    updatedAt: optionalString(record.updatedAt) ?? '',
    _count:
      isRecord(record._count) &&
      nonnegativeInteger(record._count.assignments) !== null
        ? { assignments: record._count.assignments as number }
        : null,
    allowedActions: trustBackendActions
      ? decodeActions(record.allowedActions) ?? safeActions
      : safeActions,
    configurationStatus: 'INVALID',
    configurationIssues: [...backendIssues, issue],
  };
};

const decodeDuty = (value: unknown, index: number): DutyRotation => {
  if (!isRecord(value)) {
    return invalidDuty(value, index, {
      code: 'INVALID_RESPONSE',
      field: `[${index}]`,
      message: 'El elemento recibido no es una actividad válida.',
    });
  }

  if (value.configurationStatus !== 'VALID') {
    const isNewInvalidDto = value.configurationStatus === 'INVALID';
    return invalidDuty(
      value,
      index,
      {
        code: isNewInvalidDto ? 'INVALID_RECURRENCE_RULE' : 'INVALID_RESPONSE',
        field: isNewInvalidDto ? 'recurrenceRule' : 'contract',
        message: isNewInvalidDto
          ? 'El backend marcó esta actividad como incompatible.'
          : 'La respuesta no cumple el contrato actual de rotaciones.',
      },
      isNewInvalidDto
    );
  }

  const id = typeof value.id === 'string' ? value.id : null;
  const name = typeof value.name === 'string' ? value.name : null;
  const frequency = frequencies.has(value.frequency as DutyFrequency)
    ? (value.frequency as DutyFrequency)
    : null;
  const assignmentStrategy = strategies.has(
    value.assignmentStrategy as DutyAssignmentStrategy
  )
    ? (value.assignmentStrategy as DutyAssignmentStrategy)
    : null;
  const participantSource = participantSources.has(
    value.participantSource as DutyParticipantSource
  )
    ? (value.participantSource as DutyParticipantSource)
    : null;
  const evidencePolicy = evidencePolicies.has(
    value.evidencePolicy as DutyEvidencePolicy
  )
    ? (value.evidencePolicy as DutyEvidencePolicy)
    : null;
  const rosterVersion = positiveInteger(value.rosterVersion);
  const recurrenceRule = decodeRecurrence(value.recurrenceRule);
  const dtoWeekStartsOn = decodeWeekday(value.weekStartsOn);
  const weekStartsOn =
    recurrenceRule?.frequency === 'WEEKLY'
      ? recurrenceRule.weekStartsOn
      : dtoWeekStartsOn;
  const participants = decodeParticipants(value.participants);
  const validFrom = dateOnly(value.validFrom);
  const validUntil =
    value.validUntil === null ? null : dateOnly(value.validUntil);
  const planningStartsOn = dateOnly(value.planningStartsOn);
  const configurationVersion = positiveInteger(value.configurationVersion);
  const accessWindowDays = nonnegativeInteger(value.accessWindowDays);
  const excludedOccurrenceKeys = stringArray(value.excludedOccurrenceKeys);
  const allowedActions = decodeActions(value.allowedActions);
  const assignmentCount = isRecord(value._count)
    ? nonnegativeInteger(value._count.assignments)
    : null;

  if (
    !id ||
    !name ||
    !frequency ||
    !assignmentStrategy ||
    !participantSource ||
    !evidencePolicy ||
    !rosterVersion ||
    !weekStartsOn ||
    !recurrenceRule ||
    recurrenceRule.frequency !== frequency ||
    !participants ||
    participants.length === 0 ||
    participants.some(participant => participant.user === null) ||
    !validFrom ||
    !planningStartsOn ||
    !configurationVersion ||
    accessWindowDays === null ||
    !excludedOccurrenceKeys ||
    !allowedActions ||
    typeof value.isActive !== 'boolean' ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    assignmentCount === null
  ) {
    return invalidDuty(
      value,
      index,
      {
        code: 'INVALID_RESPONSE',
        field: 'activity',
        message:
          'La actividad nueva llegó incompleta o con tipos incompatibles.',
      },
      true
    );
  }

  return {
    id,
    name,
    description: optionalString(value.description),
    capabilityKey: optionalString(value.capabilityKey),
    accessWindowDays,
    frequency,
    assignmentStrategy,
    participantSource,
    evidencePolicy,
    rosterVersion,
    weekStartsOn,
    recurrenceRule,
    validFrom,
    validUntil,
    planningStartsOn,
    excludedOccurrenceKeys,
    configurationVersion,
    isActive: value.isActive,
    lastReconciledAt: optionalString(value.lastReconciledAt),
    participants,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    _count: { assignments: assignmentCount },
    allowedActions,
    configurationStatus: 'VALID',
    configurationIssues: [],
  };
};

export class DutyRotationContractError extends Error {
  readonly code = 'DUTY_ROTATION_CONTRACT_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'DutyRotationContractError';
  }
}

export const decodeDutyRotationsResponse = (value: unknown): DutyRotation[] => {
  if (!Array.isArray(value)) {
    throw new DutyRotationContractError(
      'El servidor devolvió una forma inesperada para la lista de actividades.'
    );
  }
  return value.map(decodeDuty);
};

const decodeEmbeddedDutySwapRequest = (
  value: unknown,
  index: number
): Omit<DutySwapRequest, 'assignment'> => {
  if (!isRecord(value)) {
    throw new DutyRotationContractError(
      `La solicitud de cambio ${index + 1} no tiene una forma válida.`
    );
  }
  const requesterUserId = positiveInteger(value.requesterUserId);
  const targetUserId =
    value.targetUserId === null ? null : positiveInteger(value.targetUserId);
  const status = swapStatuses.has(value.status as DutySwapRequest['status'])
    ? (value.status as DutySwapRequest['status'])
    : null;
  if (
    typeof value.id !== 'string' ||
    typeof value.assignmentId !== 'string' ||
    !requesterUserId ||
    (value.targetUserId !== null && targetUserId === null) ||
    !status ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string'
  ) {
    throw new DutyRotationContractError(
      `La solicitud de cambio ${index + 1} llegó incompleta.`
    );
  }
  return {
    id: value.id,
    assignmentId: value.assignmentId,
    requesterUserId,
    requesterUser: decodeUser(value.requesterUser) ?? undefined,
    targetUserId,
    targetUser: decodeUser(value.targetUser),
    status,
    reason: optionalString(value.reason),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};

const decodeAssignmentDuty = (value: unknown): DutyAssignmentDuty | null => {
  if (!isRecord(value)) return null;
  const participants = decodeParticipants(value.participants);
  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    (value.capabilityKey !== null && typeof value.capabilityKey !== 'string') ||
    !participants
  ) {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    capabilityKey: value.capabilityKey,
    participants,
  };
};

const decodeDutyAssignmentEvidence = (value: unknown, index: number) => {
  if (!isRecord(value)) {
    throw new DutyRotationContractError(
      `La evidencia ${index + 1} no tiene una forma válida.`
    );
  }
  const sizeBytes = positiveInteger(value.sizeBytes);
  const submittedById = positiveInteger(value.submittedById);
  if (
    typeof value.id !== 'string' ||
    typeof value.assignmentId !== 'string' ||
    typeof value.originalName !== 'string' ||
    !isEvidenceMimeType(value.mimeType) ||
    !sizeBytes ||
    !submittedById ||
    typeof value.createdAt !== 'string' ||
    typeof value.contentUrl !== 'string'
  ) {
    throw new DutyRotationContractError(
      `La evidencia ${index + 1} llegó incompleta o con tipos incompatibles.`
    );
  }
  return {
    id: value.id,
    originalName: value.originalName,
    mimeType: value.mimeType,
    sizeBytes,
    submittedById,
    createdAt: value.createdAt,
    contentUrl: value.contentUrl,
  };
};

const decodeDutyAssignment = (
  value: unknown,
  index: number
): DutyRotationAssignment => {
  if (!isRecord(value)) {
    throw new DutyRotationContractError(
      `El turno ${index + 1} no tiene una forma válida.`
    );
  }
  const assignedUserId = positiveInteger(value.assignedUserId);
  const executedByUserId =
    value.executedByUserId === null
      ? null
      : positiveInteger(value.executedByUserId);
  const configurationVersion = positiveInteger(value.configurationVersion);
  const rosterVersion = positiveInteger(value.rosterVersion);
  const evidencePolicy = evidencePolicies.has(
    value.evidencePolicy as DutyEvidencePolicy
  )
    ? (value.evidencePolicy as DutyEvidencePolicy)
    : null;
  const periodStart = dateOnly(value.periodStart);
  const periodEnd = dateOnly(value.periodEnd);
  const dueOn = dateOnly(value.dueOn);
  const status = assignmentStatuses.has(
    value.status as DutyRotationAssignment['status']
  )
    ? (value.status as DutyRotationAssignment['status'])
    : null;
  const origin = assignmentOrigins.has(
    value.origin as DutyRotationAssignment['origin']
  )
    ? (value.origin as DutyRotationAssignment['origin'])
    : null;
  const swapRequests =
    value.swapRequests === undefined
      ? []
      : Array.isArray(value.swapRequests)
      ? value.swapRequests.map(decodeEmbeddedDutySwapRequest)
      : null;
  const duty = decodeAssignmentDuty(value.duty);
  const baseSlotKey =
    value.baseSlotKey === null || typeof value.baseSlotKey === 'string'
      ? value.baseSlotKey
      : undefined;
  const slotInstructions =
    value.slotInstructions === null ||
    typeof value.slotInstructions === 'string'
      ? value.slotInstructions
      : undefined;
  const slotPosition =
    value.slotPosition === null
      ? null
      : typeof value.slotPosition === 'number'
      ? positiveInteger(value.slotPosition) ?? undefined
      : undefined;
  const evidences = Array.isArray(value.evidences)
    ? value.evidences.map(decodeDutyAssignmentEvidence)
    : null;

  if (
    typeof value.id !== 'string' ||
    typeof value.dutyId !== 'string' ||
    typeof value.occurrenceKey !== 'string' ||
    typeof value.slotKey !== 'string' ||
    typeof value.slotLabel !== 'string' ||
    !assignedUserId ||
    !configurationVersion ||
    !rosterVersion ||
    !evidencePolicy ||
    !periodStart ||
    !periodEnd ||
    !dueOn ||
    !status ||
    !origin ||
    !swapRequests ||
    !duty ||
    !evidences ||
    baseSlotKey === undefined ||
    slotInstructions === undefined ||
    slotPosition === undefined ||
    typeof value.isLocked !== 'boolean' ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string'
  ) {
    throw new DutyRotationContractError(
      `El turno ${index + 1} llegó incompleto o con tipos incompatibles.`
    );
  }

  return {
    id: value.id,
    dutyId: value.dutyId,
    duty,
    occurrenceKey: value.occurrenceKey,
    periodStart,
    periodEnd,
    dueOn,
    slotKey: value.slotKey,
    slotLabel: value.slotLabel,
    slotInstructions,
    baseSlotKey,
    slotPosition,
    assignedUserId,
    assignedUser: decodeUser(value.assignedUser),
    executedByUserId,
    executedByUser: decodeUser(value.executedByUser),
    status,
    configurationVersion,
    rosterVersion,
    evidencePolicy,
    origin,
    isLocked: value.isLocked,
    resolutionNotes: optionalString(value.resolutionNotes),
    coverageStart: dateOnly(value.coverageStart) ?? undefined,
    coverageEnd: dateOnly(value.coverageEnd) ?? undefined,
    coverageLabel:
      typeof value.coverageLabel === 'string' ? value.coverageLabel : undefined,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    swapRequests,
    evidences,
  };
};

export const decodeDutyAssignmentsResponse = (
  value: unknown
): DutyRotationAssignment[] =>
  requireArrayResponse(value, 'la lista de turnos').map(decodeDutyAssignment);

export const decodeDutyAssignmentResponse = (
  value: unknown
): DutyRotationAssignment => decodeDutyAssignment(value, 0);

const requireRecord = (value: unknown, resourceLabel: string) => {
  if (!isRecord(value)) {
    throw new DutyRotationContractError(
      `El servidor devolvió una forma inesperada para ${resourceLabel}.`
    );
  }
  return value;
};

const decodePreviewOccurrence = (
  value: unknown,
  index: number
): DutyPreviewOccurrence => {
  const record = requireRecord(value, `la ocurrencia ${index + 1}`);
  const periodStart = dateOnly(record.periodStart);
  const periodEnd = dateOnly(record.periodEnd);
  const dueOn = dateOnly(record.dueOn);
  const assignedUser = decodeUser(record.assignedUser);
  const baseSlotKey =
    record.baseSlotKey === null || typeof record.baseSlotKey === 'string'
      ? record.baseSlotKey
      : undefined;
  const slotInstructions =
    record.slotInstructions === null ||
    typeof record.slotInstructions === 'string'
      ? record.slotInstructions
      : undefined;
  const slotPosition =
    record.slotPosition === null
      ? null
      : typeof record.slotPosition === 'number'
      ? positiveInteger(record.slotPosition) ?? undefined
      : undefined;
  if (
    typeof record.occurrenceKey !== 'string' ||
    typeof record.slotKey !== 'string' ||
    typeof record.slotLabel !== 'string' ||
    !periodStart ||
    !periodEnd ||
    !dueOn ||
    !assignedUser ||
    baseSlotKey === undefined ||
    slotInstructions === undefined ||
    slotPosition === undefined
  ) {
    throw new DutyRotationContractError(
      `La ocurrencia ${index + 1} llegó incompleta.`
    );
  }
  return {
    occurrenceKey: record.occurrenceKey,
    periodStart,
    periodEnd,
    dueOn,
    slotKey: record.slotKey,
    slotLabel: record.slotLabel,
    slotInstructions,
    baseSlotKey,
    slotPosition,
    assignedUser,
  };
};

const decodeDistributionWarning = (value: unknown, index: number) => {
  const record = requireRecord(value, `el aviso de distribución ${index + 1}`);
  const occurrenceKey = dateOnly(record.occurrenceKey);
  const periodStart = dateOnly(record.periodStart);
  const periodEnd = dateOnly(record.periodEnd);
  const repeatedParticipantCount = positiveInteger(
    record.repeatedParticipantCount
  );
  if (
    !occurrenceKey ||
    !periodStart ||
    !periodEnd ||
    !repeatedParticipantCount
  ) {
    throw new DutyRotationContractError(
      `El aviso de distribución ${index + 1} llegó incompleto.`
    );
  }
  return {
    occurrenceKey,
    periodStart,
    periodEnd,
    repeatedParticipantCount,
  };
};

export const decodeDutyPreviewResponse = (
  value: unknown
): DutyPreviewResponse => {
  const record = requireRecord(value, 'la vista previa');
  const warnings = stringArray(record.warnings);
  const horizonEnd = dateOnly(record.horizonEnd);
  const adjustedStart =
    record.adjustedStart === null ? null : dateOnly(record.adjustedStart);
  const participantSnapshot = Array.isArray(record.participantSnapshot)
    ? record.participantSnapshot.map(decodeUser)
    : null;
  if (
    !Array.isArray(record.occurrences) ||
    !Array.isArray(record.distributionWarnings) ||
    !warnings ||
    !horizonEnd ||
    typeof record.rosterFingerprint !== 'string' ||
    !participantSnapshot ||
    participantSnapshot.some(participant => participant === null)
  ) {
    throw new DutyRotationContractError('La vista previa llegó incompleta.');
  }
  return {
    occurrences: record.occurrences.map(decodePreviewOccurrence),
    warnings,
    distributionWarnings: record.distributionWarnings.map(
      decodeDistributionWarning
    ),
    adjustedStart,
    horizonEnd,
    rosterFingerprint: record.rosterFingerprint,
    participantSnapshot: participantSnapshot as DutyUser[],
  };
};

export const decodeDutyEligibleRosterResponse = (
  value: unknown
): DutyEligibleRosterResponse => {
  const record = requireRecord(value, 'el personal elegible');
  if (
    !Array.isArray(record.participants) ||
    typeof record.rosterFingerprint !== 'string' ||
    !/^[a-f0-9]{64}$/.test(record.rosterFingerprint)
  ) {
    throw new DutyRotationContractError('El padrón elegible llegó incompleto.');
  }
  const participants = record.participants.map(decodeUser);
  if (participants.some(participant => participant === null)) {
    throw new DutyRotationContractError(
      'El padrón elegible contiene usuarios incompatibles.'
    );
  }
  return {
    participants: participants as DutyUser[],
    rosterFingerprint: record.rosterFingerprint,
  };
};

export const decodeDutyOccurrenceExclusionResponse = (
  value: unknown
): DutyOccurrenceExclusionResponse => {
  const record = requireRecord(value, 'la distribución de la ocurrencia');
  const configurationVersion = positiveInteger(record.configurationVersion);
  const rosterVersion = positiveInteger(record.rosterVersion);
  const occurrence = requireRecord(record.occurrence, 'la ocurrencia');
  const periodStart = dateOnly(occurrence.periodStart);
  const periodEnd = dateOnly(occurrence.periodEnd);
  const dueOn = dateOnly(occurrence.dueOn);
  const excludedUserIds = Array.isArray(record.excludedUserIds)
    ? record.excludedUserIds.map(positiveInteger)
    : null;
  if (
    typeof record.dutyId !== 'string' ||
    typeof record.dutyName !== 'string' ||
    !configurationVersion ||
    !rosterVersion ||
    typeof occurrence.occurrenceKey !== 'string' ||
    !periodStart ||
    !periodEnd ||
    !dueOn ||
    !excludedUserIds ||
    excludedUserIds.some(id => id === null) ||
    !Array.isArray(record.assignments) ||
    !Array.isArray(record.conflicts) ||
    !Array.isArray(record.existingExclusions) ||
    typeof record.canApply !== 'boolean' ||
    nonnegativeInteger(record.replacedCount) === null ||
    !stringArray(record.warnings)
  ) {
    throw new DutyRotationContractError(
      'La distribución de la ocurrencia llegó incompleta.'
    );
  }
  const assignments = record.assignments.map((value, index) => {
    const item = requireRecord(value, `la tarea distribuida ${index + 1}`);
    const assignedUserId = positiveInteger(item.assignedUserId);
    const slotPosition = positiveInteger(item.slotPosition);
    const slotInstructions =
      item.slotInstructions === null ||
      typeof item.slotInstructions === 'string'
        ? item.slotInstructions
        : undefined;
    if (
      typeof item.slotKey !== 'string' ||
      typeof item.slotLabel !== 'string' ||
      typeof item.baseSlotKey !== 'string' ||
      slotInstructions === undefined ||
      !assignedUserId ||
      !slotPosition
    ) {
      throw new DutyRotationContractError(
        `La tarea distribuida ${index + 1} llegó incompleta.`
      );
    }
    return {
      slotKey: item.slotKey,
      slotLabel: item.slotLabel,
      slotInstructions,
      baseSlotKey: item.baseSlotKey,
      slotPosition,
      assignedUserId,
      assignedUser: decodeUser(item.assignedUser),
    };
  });
  const conflicts = record.conflicts.map((value, index) => {
    const item = requireRecord(value, `el conflicto ${index + 1}`);
    const assignedUserId = nonnegativeInteger(item.assignedUserId);
    if (
      typeof item.assignmentId !== 'string' ||
      assignedUserId === null ||
      typeof item.slotKey !== 'string' ||
      typeof item.reason !== 'string'
    ) {
      throw new DutyRotationContractError(
        `El conflicto ${index + 1} llegó incompleto.`
      );
    }
    return {
      assignmentId: item.assignmentId,
      assignedUserId,
      slotKey: item.slotKey,
      reason: item.reason,
    };
  });
  const existingExclusions = record.existingExclusions.map((value, index) => {
    const item = requireRecord(value, `la ausencia ${index + 1}`);
    const userId = positiveInteger(item.userId);
    if (!userId) {
      throw new DutyRotationContractError(
        `La ausencia ${index + 1} llegó incompleta.`
      );
    }
    return { userId, reason: optionalString(item.reason) };
  });
  return {
    dutyId: record.dutyId,
    dutyName: record.dutyName,
    configurationVersion,
    rosterVersion,
    occurrence: {
      occurrenceKey: occurrence.occurrenceKey,
      periodStart,
      periodEnd,
      dueOn,
    },
    existingExclusions,
    excludedUserIds: excludedUserIds as number[],
    canApply: record.canApply,
    conflicts,
    replacedCount: record.replacedCount as number,
    warnings: record.warnings as string[],
    assignments,
    persistedAssignments: Array.isArray(record.persistedAssignments)
      ? record.persistedAssignments.map(decodeDutyAssignment)
      : undefined,
    idempotentReplay:
      typeof record.idempotentReplay === 'boolean'
        ? record.idempotentReplay
        : undefined,
  };
};

export const decodeDutyReconciliationResponse = (
  value: unknown
): DutyReconciliationResponse => {
  const record = requireRecord(value, 'la reconciliación');
  const createdCount = nonnegativeInteger(record.createdCount);
  const preservedCount = nonnegativeInteger(record.preservedCount);
  const deletedCount = nonnegativeInteger(record.deletedCount);
  const conflictCount = nonnegativeInteger(record.conflictCount);
  const createdIds = stringArray(record.createdIds);
  const deletedIds = stringArray(record.deletedIds);
  if (
    typeof record.dutyId !== 'string' ||
    createdCount === null ||
    preservedCount === null ||
    deletedCount === null ||
    conflictCount === null ||
    !createdIds ||
    !deletedIds ||
    !Array.isArray(record.conflicts)
  ) {
    throw new DutyRotationContractError('La reconciliación llegó incompleta.');
  }
  const conflicts = record.conflicts.map((conflict, index) => {
    const item = requireRecord(conflict, `el conflicto ${index + 1}`);
    if (
      typeof item.assignmentId !== 'string' ||
      typeof item.occurrenceKey !== 'string' ||
      typeof item.slotKey !== 'string' ||
      typeof item.reason !== 'string'
    ) {
      throw new DutyRotationContractError(
        `El conflicto ${index + 1} llegó incompleto.`
      );
    }
    return {
      assignmentId: item.assignmentId,
      occurrenceKey: item.occurrenceKey,
      slotKey: item.slotKey,
      reason: item.reason,
    };
  });
  return {
    dutyId: record.dutyId,
    createdCount,
    preservedCount,
    deletedCount,
    conflictCount,
    createdIds,
    deletedIds,
    conflicts,
  };
};

const decodeImpactAssignment = (
  value: unknown,
  index: number
): DutyImpactAssignment => {
  const record = requireRecord(value, `la asignación de impacto ${index + 1}`);
  const periodStart = dateOnly(record.periodStart);
  const periodEnd = dateOnly(record.periodEnd);
  const dueOn = dateOnly(record.dueOn);
  const assignedUserId = positiveInteger(record.assignedUserId);
  const status = assignmentStatuses.has(
    record.status as DutyImpactAssignment['status']
  )
    ? (record.status as DutyImpactAssignment['status'])
    : null;
  const origin = assignmentOrigins.has(
    record.origin as DutyImpactAssignment['origin']
  )
    ? (record.origin as DutyImpactAssignment['origin'])
    : null;
  if (
    typeof record.id !== 'string' ||
    typeof record.dutyId !== 'string' ||
    typeof record.occurrenceKey !== 'string' ||
    typeof record.slotKey !== 'string' ||
    typeof record.slotLabel !== 'string' ||
    !periodStart ||
    !periodEnd ||
    !dueOn ||
    !assignedUserId ||
    !status ||
    !origin ||
    typeof record.isLocked !== 'boolean'
  ) {
    throw new DutyRotationContractError(
      `La asignación de impacto ${index + 1} llegó incompleta.`
    );
  }
  return {
    id: record.id,
    dutyId: record.dutyId,
    occurrenceKey: record.occurrenceKey,
    periodStart,
    periodEnd,
    dueOn,
    slotKey: record.slotKey,
    slotLabel: record.slotLabel,
    assignedUserId,
    status,
    origin,
    isLocked: record.isLocked,
    protectionReason: optionalString(record.protectionReason) ?? undefined,
  };
};

export const decodeDutyImpactResponse = (
  value: unknown
): DutyImpactResponse => {
  const record = requireRecord(value, 'el impacto de edición');
  const preservedCount = nonnegativeInteger(record.preservedCount);
  const removedCount = nonnegativeInteger(record.removedCount);
  const regeneratedCount = nonnegativeInteger(record.regeneratedCount);
  const conflictCount = nonnegativeInteger(record.conflictCount);
  if (
    preservedCount === null ||
    removedCount === null ||
    regeneratedCount === null ||
    conflictCount === null ||
    !Array.isArray(record.preserved) ||
    !Array.isArray(record.removed) ||
    !Array.isArray(record.conflicts)
  ) {
    throw new DutyRotationContractError(
      'El impacto de edición llegó incompleto.'
    );
  }
  return {
    preservedCount,
    removedCount,
    regeneratedCount,
    conflictCount,
    preserved: record.preserved.map(decodeImpactAssignment),
    removed: record.removed.map(decodeImpactAssignment),
    conflicts: record.conflicts.map(decodeImpactAssignment),
    preview: decodeDutyPreviewResponse(record.preview),
  };
};

export const decodeDutyRosterSyncPreviewResponse = (
  value: unknown
): DutyRosterSyncPreviewResponse => {
  const record = requireRecord(value, 'la sincronización de personal');
  const addedIds = Array.isArray(record.addedIds)
    ? record.addedIds.map(positiveInteger)
    : null;
  const removedIds = Array.isArray(record.removedIds)
    ? record.removedIds.map(positiveInteger)
    : null;
  const preservedIds = Array.isArray(record.preservedIds)
    ? record.preservedIds.map(positiveInteger)
    : null;
  if (
    !addedIds ||
    !removedIds ||
    !preservedIds ||
    [...addedIds, ...removedIds, ...preservedIds].some(id => id === null) ||
    typeof record.rosterFingerprint !== 'string'
  ) {
    throw new DutyRotationContractError(
      'La sincronización de personal llegó incompleta.'
    );
  }
  return {
    addedIds: addedIds as number[],
    removedIds: removedIds as number[],
    preservedIds: preservedIds as number[],
    rosterFingerprint: record.rosterFingerprint,
    impact: decodeDutyImpactResponse(record.impact),
  };
};

export const decodeDutyMutationResponse = (
  value: unknown
): DutyMutationResponse => {
  const record = requireRecord(value, 'la confirmación de actividad');
  if (typeof record.idempotentReplay !== 'boolean') {
    throw new DutyRotationContractError(
      'La confirmación de actividad llegó incompleta.'
    );
  }
  const duty = decodeDuty(record.duty, 0);
  if (duty.configurationStatus !== 'VALID') {
    throw new DutyRotationContractError(
      'La actividad creada o editada no cumple el contrato vigente.'
    );
  }
  return {
    duty,
    reconciliation:
      record.reconciliation === null
        ? null
        : decodeDutyReconciliationResponse(record.reconciliation),
    impact:
      record.impact === undefined
        ? undefined
        : decodeDutyImpactResponse(record.impact),
    idempotentReplay: record.idempotentReplay,
  };
};

export const decodeDutyStatusMutationResponse = (
  value: unknown
): DutyStatusMutationResponse => {
  const record = requireRecord(value, 'la confirmación de estado');
  if (typeof record.idempotentReplay !== 'boolean') {
    throw new DutyRotationContractError(
      'La confirmación de estado llegó incompleta.'
    );
  }
  const deletedCount =
    record.deletedCount === undefined
      ? undefined
      : nonnegativeInteger(record.deletedCount);
  if (
    deletedCount === null ||
    (record.conflicts !== undefined && !Array.isArray(record.conflicts))
  ) {
    throw new DutyRotationContractError(
      'La confirmación de estado llegó incompleta.'
    );
  }
  return {
    duty: decodeDuty(record.duty, 0),
    deletedCount,
    conflicts: Array.isArray(record.conflicts)
      ? record.conflicts.map(decodeImpactAssignment)
      : undefined,
    reconciliation:
      record.reconciliation === null
        ? null
        : decodeDutyReconciliationResponse(record.reconciliation),
    idempotentReplay: record.idempotentReplay,
  };
};

export const decodeDutyStatusPreviewResponse = (
  value: unknown
): DutyStatusPreviewResponse => {
  const record = requireRecord(value, 'el impacto de estado');
  const removableCount = nonnegativeInteger(record.removableCount);
  const preservedCount = nonnegativeInteger(record.preservedCount);
  const conflictCount = nonnegativeInteger(record.conflictCount);
  if (
    typeof record.isActive !== 'boolean' ||
    removableCount === null ||
    preservedCount === null ||
    conflictCount === null ||
    !Array.isArray(record.conflicts)
  ) {
    throw new DutyRotationContractError(
      'El impacto de estado llegó incompleto.'
    );
  }
  return {
    isActive: record.isActive,
    removableCount,
    preservedCount,
    conflictCount,
    conflicts: record.conflicts.map(decodeImpactAssignment),
  };
};

const decodeSwapRequest = (value: unknown, index: number): DutySwapRequest => {
  const record = requireRecord(value, `el intercambio ${index + 1}`);
  const decoded = decodeEmbeddedDutySwapRequest(record, index);
  return {
    ...decoded,
    assignment:
      record.assignment === undefined
        ? undefined
        : decodeDutyAssignment(record.assignment, index),
  };
};

export const decodeDutySwapResponse = (value: unknown): DutySwapRequest =>
  decodeSwapRequest(value, 0);

export const decodeDutySwapsResponse = (value: unknown): DutySwapRequest[] =>
  requireArrayResponse(value, 'la bolsa de turnos').map(decodeSwapRequest);

export const decodeDutyEntitlementsResponse = (
  value: unknown
): DutyRotationEntitlement[] =>
  requireArrayResponse(value, 'los permisos temporales').map((item, index) => {
    const record = requireRecord(item, `el permiso ${index + 1}`);
    const periodStart = dateOnly(record.periodStart);
    const periodEnd = dateOnly(record.periodEnd);
    const accessDeadline = dateOnly(record.accessDeadline);
    if (!periodStart || !periodEnd || !accessDeadline) {
      throw new DutyRotationContractError(
        `El permiso ${index + 1} llegó incompleto.`
      );
    }
    return {
      assignment: decodeDutyAssignment(record.assignment, index),
      capabilityKey: optionalString(record.capabilityKey),
      periodStart,
      periodEnd,
      coverageLabel: optionalString(record.coverageLabel) ?? undefined,
      accessDeadline,
    };
  });

export const decodeBulkDeleteAssignmentsResponse = (
  value: unknown
): DutyBulkDeleteAssignmentsResponse => {
  const record = requireRecord(value, 'la eliminación de turnos');
  const deletedCount = nonnegativeInteger(record.deletedCount);
  const protectedCount = nonnegativeInteger(record.protectedCount);
  const requestedCount = nonnegativeInteger(record.requestedCount);
  const deletedIds = stringArray(record.deletedIds);
  if (
    deletedCount === null ||
    protectedCount === null ||
    requestedCount === null ||
    !deletedIds
  ) {
    throw new DutyRotationContractError(
      'La eliminación de turnos llegó incompleta.'
    );
  }
  return { deletedCount, protectedCount, requestedCount, deletedIds };
};

export const requireArrayResponse = (
  value: unknown,
  resourceLabel: string
): unknown[] => {
  if (!Array.isArray(value)) {
    throw new DutyRotationContractError(
      `El servidor devolvió una forma inesperada para ${resourceLabel}.`
    );
  }
  return value;
};

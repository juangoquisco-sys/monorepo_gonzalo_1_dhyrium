import { z } from 'zod';

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Debe usar el formato AAAA-MM-DD')
  .refine(value => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, 'La fecha no existe');

export const dutyWeekdaySchema = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]);

const dutyFixedCapacitySchema = z
  .object({ mode: z.literal('FIXED'), count: z.number().int().min(1).max(500) })
  .strict();

const dutyRemainderCapacitySchema = z
  .object({ mode: z.literal('REMAINDER') })
  .strict();

const dutyCapacitySchema = z.discriminatedUnion('mode', [
  dutyFixedCapacitySchema,
  dutyRemainderCapacitySchema,
]);

export const dutySlotSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9][a-z0-9_-]*$/, 'La clave del bloque no es valida'),
    label: z.string().trim().min(1).max(100),
    instructions: z.string().trim().min(1).max(500).nullable().optional(),
    capacity: dutyCapacitySchema.optional(),
    eligibleParticipantIds: z
      .array(z.number().int().positive())
      .max(500)
      .refine(
        ids => new Set(ids).size === ids.length,
        'Los participantes restringidos no pueden repetirse'
      )
      .optional(),
  })
  .strict();

const slotsSchema = z
  .array(dutySlotSchema)
  .min(1, 'Debe configurar al menos un bloque')
  .max(20)
  .superRefine((slots, context) => {
    const keys = new Set<string>();
    slots.forEach((slot, index) => {
      if (keys.has(slot.key)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'key'],
          message: 'Las claves de bloque no pueden repetirse',
        });
      }
      keys.add(slot.key);
    });
  });

const uniqueWeekdaysSchema = z
  .array(dutyWeekdaySchema)
  .min(1, 'Debe seleccionar al menos un dia')
  .max(7)
  .refine(
    days => new Set(days).size === days.length,
    'Los dias no pueden repetirse'
  );

export const onceRecurrenceSchema = z
  .object({
    frequency: z.literal('ONCE'),
    date: dateOnlySchema,
    slots: slotsSchema,
  })
  .strict();

export const dailyRecurrenceSchema = z
  .object({
    frequency: z.literal('DAILY'),
    weekdays: uniqueWeekdaysSchema,
    slots: slotsSchema,
  })
  .strict();

export const weeklyRecurrenceSchema = z
  .object({
    frequency: z.literal('WEEKLY'),
    weekStartsOn: dutyWeekdaySchema,
    weekdays: uniqueWeekdaysSchema,
    slots: slotsSchema,
  })
  .strict();

export const weeklyDraftRecurrenceSchema = z
  .object({
    frequency: z.literal('WEEKLY'),
    weekdays: uniqueWeekdaysSchema,
    slots: slotsSchema,
  })
  .strict();

export const monthlyRecurrenceSchema = z
  .object({
    frequency: z.literal('MONTHLY'),
    daysOfMonth: z
      .array(z.number().int().min(1).max(31))
      .min(1, 'Debe seleccionar al menos un dia del mes')
      .max(31)
      .refine(
        days => new Set(days).size === days.length,
        'Los dias del mes no pueden repetirse'
      ),
    slots: slotsSchema,
  })
  .strict();

export const dutyRecurrenceSchema = z.discriminatedUnion('frequency', [
  onceRecurrenceSchema,
  dailyRecurrenceSchema,
  weeklyRecurrenceSchema,
  monthlyRecurrenceSchema,
]);

export const dutyDraftRecurrenceSchema = z.discriminatedUnion('frequency', [
  onceRecurrenceSchema,
  dailyRecurrenceSchema,
  weeklyDraftRecurrenceSchema,
  monthlyRecurrenceSchema,
]);

export const dutyConfigurationIssueSchema = z
  .object({
    code: z.enum([
      'INVALID_RECURRENCE_RULE',
      'INVALID_ALLOCATION_RULE',
      'FREQUENCY_MISMATCH',
      'NO_PARTICIPANTS',
    ]),
    field: z.string().trim().min(1),
    message: z.string().trim().min(1),
  })
  .strict();

const dutyUserDtoSchema = z
  .object({
    id: z.number().int().positive(),
    email: z.string(),
    status: z.boolean(),
    profile: z
      .object({
        firstName: z.string(),
        lastName: z.string(),
      })
      .strict()
      .nullable(),
    role: z
      .object({ id: z.number().int().positive(), name: z.string() })
      .strict()
      .nullable(),
  })
  .strict();

const dutyParticipantDtoSchema = z
  .object({
    id: z.string().uuid(),
    dutyId: z.string().uuid(),
    userId: z.number().int().positive(),
    position: z.number().int().nonnegative(),
    user: dutyUserDtoSchema,
  })
  .strict();

const dutyAssignmentUserDtoSchema = z
  .object({
    id: z.number().int().positive(),
    email: z.string(),
    profile: z
      .object({ firstName: z.string(), lastName: z.string() })
      .strict()
      .nullable(),
  })
  .strict();

const dutyAssignmentParticipantDtoSchema = z
  .object({
    id: z.string().uuid(),
    dutyId: z.string().uuid(),
    userId: z.number().int().positive(),
    position: z.number().int().nonnegative(),
    user: dutyAssignmentUserDtoSchema,
  })
  .strict();

export const dutyAssignmentDutyDtoSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    capabilityKey: z.string().nullable(),
    participants: z.array(dutyAssignmentParticipantDtoSchema),
  })
  .strict();

const embeddedDutySwapRequestDtoSchema = z
  .object({
    id: z.string().uuid(),
    assignmentId: z.string().uuid(),
    requesterUserId: z.number().int().positive(),
    requesterUser: dutyAssignmentUserDtoSchema,
    targetUserId: z.number().int().positive().nullable(),
    targetUser: dutyAssignmentUserDtoSchema.nullable(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CLAIMED']),
    reason: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

const dutyAssignmentEvidenceDtoSchema = z
  .object({
    id: z.string().uuid(),
    assignmentId: z.string().uuid(),
    submittedById: z.number().int().positive(),
    originalName: z.string(),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    sizeBytes: z.number().int().positive(),
    contentUrl: z.string(),
    createdAt: z.string().datetime(),
  })
  .strict();

export const dutyAssignmentDtoSchema = z
  .object({
    id: z.string().uuid(),
    dutyId: z.string().uuid(),
    duty: dutyAssignmentDutyDtoSchema,
    occurrenceKey: z.string(),
    periodStart: dateOnlySchema,
    periodEnd: dateOnlySchema,
    dueOn: dateOnlySchema,
    slotKey: z.string(),
    slotLabel: z.string(),
    slotInstructions: z.string().nullable(),
    baseSlotKey: z.string().nullable(),
    slotPosition: z.number().int().positive().nullable(),
    assignedUserId: z.number().int().positive(),
    assignedUser: dutyAssignmentUserDtoSchema,
    executedByUserId: z.number().int().positive().nullable(),
    executedByUser: dutyAssignmentUserDtoSchema.nullable(),
    status: z.enum(['PENDING', 'COMPLETED', 'NO_SHOW', 'OPEN_POOL']),
    configurationVersion: z.number().int().positive(),
    rosterVersion: z.number().int().positive(),
    evidencePolicy: z.enum(['NONE', 'OPTIONAL_PHOTO', 'REQUIRED_PHOTO']),
    origin: z.enum(['AUTO', 'MANUAL', 'SWAP', 'OPEN_POOL']),
    isLocked: z.boolean(),
    resolutionNotes: z.string().nullable(),
    coverageStart: dateOnlySchema,
    coverageEnd: dateOnlySchema,
    coverageLabel: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    swapRequests: z.array(embeddedDutySwapRequestDtoSchema),
    evidences: z.array(dutyAssignmentEvidenceDtoSchema),
  })
  .strict();

const dutyAllowedActionsSchema = z
  .object({
    inspect: z.boolean(),
    edit: z.boolean(),
    repair: z.boolean(),
    deactivate: z.boolean(),
    reactivate: z.boolean(),
  })
  .strict();

const dutyRotationDtoBaseSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    capabilityKey: z.string().nullable(),
    accessWindowDays: z.number().int().nonnegative(),
    frequency: z.enum(['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY']),
    assignmentStrategy: z.enum([
      'ONE_OWNER_PER_PERIOD',
      'ONE_OWNER_PER_SLOT',
      'DISTRIBUTE_PARTICIPANTS',
    ]),
    participantSource: z.enum(['EXPLICIT', 'ACTIVE_ELIGIBLE_SYNC']),
    evidencePolicy: z.enum(['NONE', 'OPTIONAL_PHOTO', 'REQUIRED_PHOTO']),
    rosterVersion: z.number().int().positive(),
    weekStartsOn: dutyWeekdaySchema,
    validFrom: dateOnlySchema,
    validUntil: dateOnlySchema.nullable(),
    planningStartsOn: dateOnlySchema,
    excludedOccurrenceKeys: z.array(z.string()),
    configurationVersion: z.number().int().positive(),
    isActive: z.boolean(),
    lastReconciledAt: z.string().datetime().nullable(),
    participants: z.array(dutyParticipantDtoSchema),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    _count: z.object({ assignments: z.number().int().nonnegative() }).strict(),
    allowedActions: dutyAllowedActionsSchema,
  })
  .strict();

export const validDutyRotationDtoSchema = dutyRotationDtoBaseSchema.extend({
  configurationStatus: z.literal('VALID'),
  configurationIssues: z.array(dutyConfigurationIssueSchema).length(0),
  recurrenceRule: dutyRecurrenceSchema,
});

export const invalidDutyRotationDtoSchema = dutyRotationDtoBaseSchema.extend({
  configurationStatus: z.literal('INVALID'),
  configurationIssues: z.array(dutyConfigurationIssueSchema).min(1),
  recurrenceRule: z.null(),
});

export const dutyRotationDtoSchema = z.discriminatedUnion(
  'configurationStatus',
  [validDutyRotationDtoSchema, invalidDutyRotationDtoSchema]
);

export const dutyDraftSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(1000).nullable().optional(),
    capabilityKey: z.string().trim().max(120).nullable().optional(),
    accessWindowDays: z.number().int().min(0).max(365).default(14),
    assignmentStrategy: z.enum([
      'ONE_OWNER_PER_PERIOD',
      'ONE_OWNER_PER_SLOT',
      'DISTRIBUTE_PARTICIPANTS',
    ]),
    participantSource: z
      .enum(['EXPLICIT', 'ACTIVE_ELIGIBLE_SYNC'])
      .default('EXPLICIT'),
    evidencePolicy: z
      .enum(['NONE', 'OPTIONAL_PHOTO', 'REQUIRED_PHOTO'])
      .default('NONE'),
    validFrom: dateOnlySchema,
    validUntil: dateOnlySchema.nullable().optional(),
    recurrence: dutyDraftRecurrenceSchema,
    participantIds: z
      .array(z.number().int().positive())
      .min(1, 'Debe seleccionar al menos un participante')
      .max(500)
      .refine(
        userIds => new Set(userIds).size === userIds.length,
        'Un participante no puede repetirse'
      ),
    excludedOccurrenceKeys: z
      .array(z.string().trim().min(1).max(120))
      .max(500)
      .default([]),
  })
  .strict()
  .superRefine((draft, context) => {
    if (draft.validUntil && draft.validUntil < draft.validFrom) {
      context.addIssue({
        code: 'custom',
        path: ['validUntil'],
        message: 'La fecha final no puede ser anterior a la fecha inicial',
      });
    }
    if (
      draft.recurrence.frequency === 'ONCE' &&
      draft.recurrence.date !== draft.validFrom
    ) {
      context.addIssue({
        code: 'custom',
        path: ['recurrence', 'date'],
        message: 'La fecha unica debe coincidir con el inicio de vigencia',
      });
    }
    const slots = draft.recurrence.slots;
    if (draft.assignmentStrategy === 'ONE_OWNER_PER_PERIOD') {
      if (slots.length !== 1) {
        context.addIssue({
          code: 'custom',
          path: ['recurrence', 'slots'],
          message:
            'Una responsabilidad por periodo debe tener un unico bloque interno',
        });
      }
    } else if (draft.assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS') {
      const remainderSlots = slots.filter(
        slot => slot.capacity?.mode === 'REMAINDER'
      );
      if (remainderSlots.length !== 1) {
        context.addIssue({
          code: 'custom',
          path: ['recurrence', 'slots'],
          message:
            'La distribucion debe tener exactamente un grupo para el personal restante',
        });
      }
      slots.forEach((slot, index) => {
        if (!slot.capacity) {
          context.addIssue({
            code: 'custom',
            path: ['recurrence', 'slots', index, 'capacity'],
            message: 'Cada grupo debe definir su cupo',
          });
        }
        const restricted = slot.eligibleParticipantIds ?? [];
        const unknown = restricted.filter(
          userId => !draft.participantIds.includes(userId)
        );
        if (unknown.length) {
          context.addIssue({
            code: 'custom',
            path: ['recurrence', 'slots', index, 'eligibleParticipantIds'],
            message:
              'Las restricciones solo pueden incluir participantes de la actividad',
          });
        }
        if (
          slot.capacity?.mode === 'FIXED' &&
          restricted.length > 0 &&
          restricted.length < slot.capacity.count
        ) {
          context.addIssue({
            code: 'custom',
            path: ['recurrence', 'slots', index, 'eligibleParticipantIds'],
            message: 'El grupo no tiene suficientes participantes permitidos',
          });
        }
      });
      const fixedCapacity = slots.reduce(
        (total, slot) =>
          total + (slot.capacity?.mode === 'FIXED' ? slot.capacity.count : 0),
        0
      );
      if (fixedCapacity > draft.participantIds.length) {
        context.addIssue({
          code: 'custom',
          path: ['recurrence', 'slots'],
          message: 'Los cupos fijos superan la cantidad de participantes',
        });
      }
    } else {
      slots.forEach((slot, index) => {
        if (slot.capacity || slot.eligibleParticipantIds?.length) {
          context.addIssue({
            code: 'custom',
            path: ['recurrence', 'slots', index],
            message:
              'Los cupos y restricciones solo aplican al reparto de participantes',
          });
        }
      });
    }
  });

const dutyIdParamsSchema = z.object({ id: z.string().uuid() }).strict();
const assignmentIdParamsSchema = z.object({ id: z.string().uuid() }).strict();
const swapIdParamsSchema = z.object({ id: z.string().uuid() }).strict();
const emptyBodySchema = z.object({}).strict();
const emptyQuerySchema = z.object({}).strict();

export const listDutiesRequestSchema = z.object({
  query: z
    .object({
      includeInactive: z
        .enum(['true', 'false'])
        .transform(value => value === 'true')
        .optional(),
    })
    .strict(),
});

export const previewDutyRequestSchema = z.object({ body: dutyDraftSchema });
export const createDutyRequestSchema = z.object({
  body: z
    .object({ draft: dutyDraftSchema, requestKey: z.string().uuid() })
    .strict(),
});

const editDutyBodySchema = z
  .object({
    draft: dutyDraftSchema,
    effectiveFrom: dateOnlySchema,
    expectedVersion: z.number().int().positive(),
    requestKey: z.string().uuid(),
  })
  .strict();

export const previewDutyEditRequestSchema = z.object({
  params: dutyIdParamsSchema,
  body: editDutyBodySchema,
});

export const updateDutyRequestSchema = z.object({
  params: dutyIdParamsSchema,
  body: editDutyBodySchema,
});

const dutyStatusPreviewBodySchema = z
  .object({
    isActive: z.boolean(),
    expectedVersion: z.number().int().positive(),
  })
  .strict();

const dutyStatusBodySchema = z
  .object({
    isActive: z.boolean(),
    expectedVersion: z.number().int().positive(),
    requestKey: z.string().uuid(),
  })
  .strict();

export const previewDutyStatusRequestSchema = z.object({
  params: dutyIdParamsSchema,
  body: dutyStatusPreviewBodySchema,
});

export const updateDutyStatusRequestSchema = z.object({
  params: dutyIdParamsSchema,
  body: dutyStatusBodySchema,
});

export const repairDutyRequestSchema = z.object({
  params: dutyIdParamsSchema,
  body: emptyBodySchema,
});

export const listAssignmentsRequestSchema = z.object({
  query: z
    .object({
      dateFrom: dateOnlySchema.optional(),
      dateTo: dateOnlySchema.optional(),
      status: z
        .enum(['PENDING', 'COMPLETED', 'NO_SHOW', 'OPEN_POOL'])
        .optional(),
      dutyId: z.string().uuid().optional(),
      userId: z.coerce.number().int().positive().optional(),
    })
    .strict(),
});

export const myUpcomingRequestSchema = z.object({ query: emptyQuerySchema });
export const myEntitlementsRequestSchema = z.object({
  query: z
    .object({ capabilityKey: z.string().trim().min(1).max(120).optional() })
    .strict(),
});

export const completeAssignmentRequestSchema = z.object({
  params: assignmentIdParamsSchema,
  body: z
    .object({
      executedByUserId: z.coerce.number().int().positive().optional(),
      resolutionNotes: z.string().trim().max(1000).optional(),
      requestKey: z.string().uuid(),
    })
    .strict(),
});

export const reassignAssignmentRequestSchema = z.object({
  params: assignmentIdParamsSchema,
  body: z.object({ assignedUserId: z.number().int().positive() }).strict(),
});

export const bulkDeleteAssignmentsRequestSchema = z.object({
  body: z
    .object({
      ids: z.array(z.string().uuid()).min(1).max(500),
      dutyId: z.string().uuid().optional(),
      allowCurrentDay: z.boolean().optional(),
      deleteOnlyDeletable: z.boolean().optional(),
    })
    .strict(),
});

export const createSwapRequestSchema = z.object({
  params: assignmentIdParamsSchema,
  body: z
    .object({
      targetUserId: z.number().int().positive().nullable().optional(),
      reason: z.string().trim().max(1000).optional(),
    })
    .strict(),
});

export const swapActionRequestSchema = z.object({
  params: swapIdParamsSchema,
  body: emptyBodySchema,
});

export const listOpenPoolRequestSchema = z.object({ query: emptyQuerySchema });
export const listPendingDirectedSwapRequestsSchema = z.object({
  query: emptyQuerySchema,
});
export const claimOpenPoolRequestSchema = z.object({
  params: z.object({ swapRequestId: z.string().uuid() }).strict(),
  body: emptyBodySchema,
});

const occurrenceParamsSchema = z
  .object({
    id: z.string().uuid(),
    occurrenceKey: z.string().trim().min(1).max(120),
  })
  .strict();

const rosterMutationBodySchema = z
  .object({
    effectiveFrom: dateOnlySchema,
    expectedVersion: z.number().int().positive(),
    rosterFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    requestKey: z.string().uuid(),
  })
  .strict();

export const previewRosterSyncRequestSchema = z.object({
  params: dutyIdParamsSchema,
  body: rosterMutationBodySchema.omit({ requestKey: true }),
});

export const confirmRosterSyncRequestSchema = z.object({
  params: dutyIdParamsSchema,
  body: rosterMutationBodySchema,
});

const occurrenceExclusionsBodySchema = z
  .object({
    excludedUserIds: z
      .array(z.number().int().positive())
      .max(500)
      .refine(ids => new Set(ids).size === ids.length, 'No repita usuarios'),
    reason: z.string().trim().max(500).optional(),
    expectedVersion: z.number().int().positive(),
    requestKey: z.string().uuid().optional(),
  })
  .strict();

export const previewOccurrenceExclusionsRequestSchema = z.object({
  params: occurrenceParamsSchema,
  body: occurrenceExclusionsBodySchema.omit({ requestKey: true }),
});

export const updateOccurrenceExclusionsRequestSchema = z.object({
  params: occurrenceParamsSchema,
  body: occurrenceExclusionsBodySchema.extend({
    requestKey: z.string().uuid(),
  }),
});

export const getOccurrenceRequestSchema = z.object({
  params: occurrenceParamsSchema,
});

export const getEvidenceContentRequestSchema = z.object({
  params: z
    .object({
      id: z.string().uuid(),
      evidenceId: z.string().uuid(),
    })
    .strict(),
});

export type DutyWeekday = z.infer<typeof dutyWeekdaySchema>;
export type DutySlot = z.infer<typeof dutySlotSchema>;
export type DutyRecurrence = z.infer<typeof dutyRecurrenceSchema>;
export type DutyDraft = z.infer<typeof dutyDraftSchema>;
export type EditDutyInput = z.infer<typeof editDutyBodySchema>;
export type DutyConfigurationIssue = z.infer<
  typeof dutyConfigurationIssueSchema
>;
export type DutyRotationDto = z.infer<typeof dutyRotationDtoSchema>;
export type DutyAssignmentDto = z.infer<typeof dutyAssignmentDtoSchema>;

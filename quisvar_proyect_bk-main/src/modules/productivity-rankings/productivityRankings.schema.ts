import { z } from 'zod';

export const rankingConfigUpdateSchema = z.object({
  body: z
    .object({
      topN: z.number().int().min(1).max(100).optional(),
      minWeightDaysToQualify: z.number().min(0).optional(),
      excludedRoleIds: z.array(z.number().int().positive()).optional(),
      excludedUserIds: z.array(z.number().int().positive()).optional(),
      rankingEligibleUnitIds: z.array(z.string().uuid()).optional(),
    })
    .strict(),
});

export const rankingPeriodQuerySchema = z.object({
  query: z
    .object({
      periodId: z.string().uuid().optional(),
    })
    .strict(),
});

export const entryDetailParamsSchema = z.object({
  params: z
    .object({
      userId: z.coerce.number().int().positive(),
    })
    .strict(),
  query: z
    .object({
      periodId: z.string().uuid().optional(),
    })
    .strict(),
});

export const closeRankingPeriodParamsSchema = z.object({
  params: z
    .object({
      id: z.string().uuid(),
    })
    .strict(),
});

export const createRankingPeriodSchema = z.object({
  body: z
    .object({
      periodStart: z.coerce.date(),
      periodEnd: z.coerce.date(),
    })
    .strict()
    .refine(data => data.periodEnd > data.periodStart, {
      message: 'periodEnd debe ser posterior a periodStart',
      path: ['periodEnd'],
    }),
});

export const createNonTaskActivitySchema = z.object({
  body: z
    .object({
      type: z.string().trim().min(1).max(60),
      description: z.string().trim().max(1000).optional(),
      proposedDays: z.number().positive().max(365),
      periodDate: z.coerce.date(),
    })
    .strict(),
});

export const reviewNonTaskActivitySchema = z.object({
  params: z
    .object({
      id: z.string().uuid(),
    })
    .strict(),
  body: z
    .object({
      status: z.enum(['APPROVED', 'REJECTED']),
      approvedDays: z.number().positive().max(365).optional(),
      feedback: z.string().trim().max(1000).optional(),
    })
    .strict()
    .refine(data => data.status !== 'APPROVED' || data.approvedDays !== undefined, {
      message: 'approvedDays es obligatorio al aprobar la actividad',
      path: ['approvedDays'],
    }),
});

export type RankingConfigUpdateBody = z.infer<
  typeof rankingConfigUpdateSchema
>['body'];
export type CreateNonTaskActivityBody = z.infer<
  typeof createNonTaskActivitySchema
>['body'];
export type ReviewNonTaskActivityBody = z.infer<
  typeof reviewNonTaskActivitySchema
>['body'];

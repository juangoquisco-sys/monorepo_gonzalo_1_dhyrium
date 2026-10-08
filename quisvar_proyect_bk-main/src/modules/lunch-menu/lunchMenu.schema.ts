import { z } from 'zod';

const serviceDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const lunchMenuServiceDateParamsSchema = z
  .object({ serviceDate: serviceDateSchema })
  .strict();

const durationMinutesSchema = z.number().int().min(1).max(1_440);
const optionalMenuNameSchema = z.string().trim().max(180).optional();
const lunchMenuAccompanimentsSchema = z.object({
  wantsSoup: z.boolean(),
  wantsDessert: z.boolean().optional().default(true),
  wantsRefreshment: z.boolean().optional().default(true),
});

export const publishLunchMenuRequestSchema = z.object({
  body: z
    .object({
      serviceDate: serviceDateSchema,
      seconds: z.array(z.string().trim().min(1).max(180)).min(1).max(20),
      soupAvailable: z.boolean(),
      soupName: optionalMenuNameSchema,
      dessertAvailable: z.boolean().optional().default(true),
      dessertName: optionalMenuNameSchema,
      refreshmentName: optionalMenuNameSchema,
      durationMinutes: durationMinutesSchema.optional(),
    })
    .strict(),
});

export const reopenLunchMenuRequestSchema = z.object({
  params: lunchMenuServiceDateParamsSchema,
  body: z.object({ durationMinutes: durationMinutesSchema.optional() }).strict(),
});

export const selectOwnLunchMenuRequestSchema = z.object({
  params: lunchMenuServiceDateParamsSchema,
  body: z
    .object({ lunchMenuSecondId: z.number().int().positive() })
    .merge(lunchMenuAccompanimentsSchema)
    .strict(),
});

export const assignLunchMenuRequestSchema = z.object({
  params: lunchMenuServiceDateParamsSchema.extend({
    userId: z.coerce.number().int().positive(),
  }),
  body: z
    .object({ lunchMenuSecondId: z.number().int().positive() })
    .merge(lunchMenuAccompanimentsSchema)
    .strict(),
});

export const assignMostRequestedLunchMenuRequestSchema = z.object({
  params: lunchMenuServiceDateParamsSchema,
  body: z.object({
    assignments: z.array(z.object({ userId: z.number().int().positive() }).merge(lunchMenuAccompanimentsSchema).strict()).min(1).optional(),
  }).strict(),
});

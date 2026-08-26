import { z } from 'zod';

const positiveIdSchema = z.coerce.number().int().positive();

export const preLiquidationStagesRequestSchema = z.object({
  query: z
    .object({
      projectId: positiveIdSchema.optional(),
      stageId: positiveIdSchema.optional(),
    })
    .strict(),
});

export const stageLiquidationRequestSchema = z.object({
  params: z
    .object({
      stageId: positiveIdSchema,
    })
    .strict(),
});

const createLiquidationBodySchema = z
  .object({
    stageId: positiveIdSchema,
    title: z.string().trim().min(1).max(300),
    header: z.string().trim().min(1).max(500),
    description: z.string().max(2_000_000),
  })
  .strict();

const jsonLiquidationBodySchema = z
  .string()
  .max(2_100_000)
  .transform((value, context) => {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Los datos de la solicitud no contienen JSON valido.',
      });
      return z.NEVER;
    }
  });

export const createLiquidationRequestSchema = z.object({
  body: z
    .object({
      data: jsonLiquidationBodySchema.pipe(createLiquidationBodySchema),
    })
    .strict(),
});

export const unamortizedAdvancesRequestSchema = z.object({
  params: z
    .object({
      userId: positiveIdSchema,
    })
    .strict(),
});

export const reconcileLiquidationRequestSchema = z.object({
  params: z
    .object({
      payrollId: positiveIdSchema,
    })
    .strict(),
  body: z
    .object({
      liquidationReportId: positiveIdSchema,
      advanceReportIds: z.array(positiveIdSchema).max(500).default([]),
    })
    .strict(),
});

export type CreateLiquidationBody = z.infer<typeof createLiquidationBodySchema>;

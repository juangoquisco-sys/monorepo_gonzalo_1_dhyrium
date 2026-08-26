import { z } from 'zod';

const idParams = z.object({
  unitId: z.string().uuid(),
  projectId: z.coerce.number().int().positive(),
  stageId: z.coerce.number().int().positive(),
});

const targetSchema = z
  .object({
    levelId: z.coerce.number().int().positive().optional(),
    subTaskId: z.coerce.number().int().positive().optional(),
    includeDescendants: z.preprocess(
      value => (value === 'true' ? true : value === 'false' ? false : value),
      z.boolean().optional().default(false)
    ),
  })
  .strict()
  .refine(
    value => Boolean(value.levelId) !== Boolean(value.subTaskId),
    'Cada destino debe ser un nivel o una tarea'
  )
  .refine(
    value => !value.includeDescendants || Boolean(value.levelId),
    'Solo un nivel puede incluir descendientes'
  );

const targetsSchema = z.preprocess(value => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}, z.array(targetSchema).min(1).max(100));

export const basicResourceListRequestSchema = z.object({
  params: idParams,
  query: z.object({ q: z.string().trim().max(100).optional() }).strict(),
});

export const basicResourceCreateRequestSchema = z.object({
  params: idParams,
  body: z
    .object({
      title: z.string().trim().max(180).optional(),
      description: z.string().trim().max(1000).optional(),
      targets: targetsSchema,
    })
    .strict(),
});

export const basicResourceUpdateRequestSchema = z.object({
  params: z.object({
    unitId: z.string().uuid(),
    resourceId: z.string().uuid(),
  }),
  body: z
    .object({
      title: z.string().trim().max(180).nullable().optional(),
      description: z.string().trim().max(1000).nullable().optional(),
      targets: targetsSchema.optional(),
    })
    .strict(),
});

export const basicResourceIdRequestSchema = z.object({
  params: z.object({
    unitId: z.string().uuid(),
    resourceId: z.string().uuid(),
  }),
});

export type BasicResourceTargetInput = z.infer<typeof targetSchema>;

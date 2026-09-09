import { z } from 'zod';
import { FOLIATION_POSITIONS } from '@/services/foliation.services';

const rootTypeSchema = z.enum(['level', 'stage']);

export const generateExpedienteFoliationRequestSchema = z.object({
  params: z
    .object({
      rootType: rootTypeSchema,
      id: z.coerce.number().int().positive(),
    })
    .strict(),
  query: z
    .object({
      position: z.enum(FOLIATION_POSITIONS).default('TOP_RIGHT'),
      marginX: z.coerce.number().int().min(0).max(200).default(10),
      marginY: z.coerce.number().int().min(0).max(200).default(10),
    })
    .strict(),
});

export const getExpedienteFoliationRequestSchema = z.object({
  params: z
    .object({ rootType: rootTypeSchema, id: z.coerce.number().int().positive() })
    .strict(),
});

export const reprintExpedienteFoliationRequestSchema = z.object({
  params: z
    .object({ rootType: rootTypeSchema, id: z.coerce.number().int().positive() })
    .strict(),
  body: z.discriminatedUnion('scope', [
    z.object({ scope: z.literal('LEVEL'), levelId: z.number().int().positive() }).strict(),
    z.object({ scope: z.literal('TASK'), taskId: z.number().int().positive() }).strict(),
    z.object({ scope: z.literal('FILE'), fileId: z.number().int().positive() }).strict(),
    z.object({
      scope: z.literal('PAGE'),
      pageNumbers: z.array(z.number().int().positive()).min(1).max(500),
    }).strict(),
  ]),
});

export type ExpedienteRootType = z.infer<typeof rootTypeSchema>;
export type ReprintSelection = z.infer<
  typeof reprintExpedienteFoliationRequestSchema
>['body'];

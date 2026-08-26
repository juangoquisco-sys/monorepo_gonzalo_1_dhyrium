import { z } from 'zod';
import { taskDocumentKindSchema } from './taskDocuments.schema';

const taskParams = z
  .object({
    taskKind: taskDocumentKindSchema,
    taskId: z.coerce.number().int().positive(),
  })
  .strict();

const sessionParams = z.object({ sessionId: z.string().uuid() }).strict();

const publicSessionParams = z
  .object({
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    fileName: z.string().trim().min(1).max(300).optional(),
  })
  .strict();

export const createTaskDocumentOfficeSessionSchema = z.object({
  params: taskParams,
  body: z
    .object({
      provider: z.literal('WORD_DESKTOP'),
      sourceFileId: z.number().int().positive(),
    })
    .strict(),
});

export const ensureTaskDocumentOriginalVersionSchema = z.object({
  params: taskParams,
  body: z.object({ sourceFileId: z.number().int().positive() }).strict(),
});

export const taskDocumentOfficeSessionSchema = z.object({
  params: sessionParams,
});

export const taskDocumentOfficeFileSchema = z.object({
  params: publicSessionParams,
});

export const listTaskDocumentFileVersionsSchema = z.object({
  params: taskParams,
  query: z
    .object({
      sourceFileId: z.coerce.number().int().positive(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .strict(),
});

export const restoreTaskDocumentFileVersionSchema = z.object({
  params: taskParams.extend({
    versionNumber: z.coerce.number().int().positive(),
  }),
  query: z
    .object({ sourceFileId: z.coerce.number().int().positive() })
    .strict(),
});

export type CreateTaskDocumentOfficeSession = z.infer<
  typeof createTaskDocumentOfficeSessionSchema
>;

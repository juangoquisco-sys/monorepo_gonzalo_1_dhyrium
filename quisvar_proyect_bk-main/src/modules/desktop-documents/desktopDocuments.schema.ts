import { z } from 'zod';

const desktopSourceKindSchema = z.enum(['TASK_FILE', 'BASIC_FILE']);
const opaqueTicketSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const createDesktopDocumentLaunchSchema = z.object({
  body: z
    .object({
      sourceKind: desktopSourceKindSchema,
      sourceFileId: z.coerce.number().int().positive(),
    })
    .strict(),
});

export const redeemDesktopDocumentLaunchSchema = z.object({
  params: z.object({ ticket: opaqueTicketSchema }).strict(),
});

export const desktopDocumentContentSchema = z.object({
  params: z
    .object({
      documentId: z.string().uuid(),
      versionId: z.string().uuid(),
    })
    .strict(),
});

export const saveDesktopDocumentVersionSchema = z.object({
  params: z.object({ documentId: z.string().uuid() }).strict(),
  body: z
    .object({
      baseVersionId: z.string().uuid(),
    })
    .strict(),
});

export type DesktopDocumentLaunchInput = z.infer<
  typeof createDesktopDocumentLaunchSchema
>;

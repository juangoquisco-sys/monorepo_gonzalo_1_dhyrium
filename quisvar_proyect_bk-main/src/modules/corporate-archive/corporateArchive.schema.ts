import { z } from 'zod';

export const corporateArchiveScopeSchema = z.enum(['COMPANY', 'CONSORTIUM']);
export const corporateArchiveCategorySchema = z.enum([
  'IDENTITY',
  'MANAGEMENT',
  'ADMINISTRATION',
  'PEOPLE',
  'COMMERCIAL',
  'COMPLIANCE',
  'EXPERIENCE',
  'CONTRACTS',
]);

const uuid = z.string().uuid();
const positiveId = z.coerce.number().int().positive();
const booleanQuery = z.preprocess(
  value => (value === 'true' ? true : value === 'false' ? false : value),
  z.boolean().optional().default(false)
);

export const resolveArchiveRootRequestSchema = z.object({
  params: z.object({
    scopeType: corporateArchiveScopeSchema,
    scopeId: positiveId,
    categoryKey: corporateArchiveCategorySchema,
  }).strict(),
});

export const archiveRootIdRequestSchema = z.object({
  params: z.object({ rootId: uuid }).strict(),
});

export const archiveTreeRequestSchema = z.object({
  params: z.object({ rootId: uuid }).strict(),
  query: z.object({ includeArchived: booleanQuery }).strict(),
});

export const archiveContentsRequestSchema = z.object({
  params: z.object({ rootId: uuid }).strict(),
  query: z.object({
    folderId: uuid.optional(),
    recursive: booleanQuery,
    includeArchived: booleanQuery,
    q: z.string().trim().min(1).max(120).optional(),
  }).strict(),
});

export const createArchiveFolderRequestSchema = z.object({
  params: z.object({ rootId: uuid }).strict(),
  body: z.object({
    parentId: uuid.optional(),
    name: z.string().trim().min(1).max(180),
  }).strict(),
});

export const updateArchiveFolderRequestSchema = z.object({
  params: z.object({ id: uuid }).strict(),
  body: z.object({ name: z.string().trim().min(1).max(180) }).strict(),
});

export const moveArchiveFolderRequestSchema = z.object({
  params: z.object({ id: uuid }).strict(),
  body: z.object({ targetFolderId: uuid }).strict(),
});

export const archiveFolderActionRequestSchema = z.object({
  params: z.object({ id: uuid }).strict(),
});

export const createArchiveDocumentsRequestSchema = z.object({
  params: z.object({ id: uuid }).strict(),
  body: z.object({ displayName: z.string().trim().min(1).max(300).optional() }).strict(),
});

export const archiveDocumentIdRequestSchema = z.object({
  params: z.object({ id: uuid }).strict(),
});

export const createArchiveVersionRequestSchema = z.object({
  params: z.object({ id: uuid }).strict(),
  body: z.object({ expectedCurrentVersionId: uuid }).strict(),
});

export const moveArchiveDocumentRequestSchema = z.object({
  params: z.object({ id: uuid }).strict(),
  body: z.object({ targetFolderId: uuid }).strict(),
});

export type CorporateArchiveScope = z.infer<typeof corporateArchiveScopeSchema>;
export type CorporateArchiveCategory = z.infer<typeof corporateArchiveCategorySchema>;

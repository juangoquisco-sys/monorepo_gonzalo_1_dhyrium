import { z } from 'zod';

const name = z.string().trim().min(1).max(180);
export const resolveLetterArchiveSchema = z.object({ params: z.object({ companyId: z.coerce.number().int().positive(), documentCode: z.string().trim().min(1).max(120) }) });
export const rootIdSchema = z.object({ params: z.object({ rootId: z.string().uuid() }) });
export const createFolderSchema = z.object({ params: z.object({ rootId: z.string().uuid() }), body: z.object({ name, parentId: z.string().uuid().nullable().optional() }) });
export const folderIdSchema = z.object({ params: z.object({ folderId: z.string().uuid() }) });
export const renameFolderSchema = z.object({ params: z.object({ folderId: z.string().uuid() }), body: z.object({ name }) });
export const moveFolderSchema = z.object({ params: z.object({ folderId: z.string().uuid() }), body: z.object({ direction: z.enum(['up', 'down']) }) });
export const documentIdSchema = z.object({ params: z.object({ documentId: z.string().uuid() }) });
const letterRecordBody = z.object({
  code: z.string().trim().min(1).max(120),
  type: z.string().trim().min(1).max(120),
  recordType: z.enum(['Reciente', 'Histórica']),
  date: z.coerce.date(),
  entity: z.string().trim().max(300),
  location: z.string().trim().max(180),
  subject: z.string().trim().max(10_000),
  status: z.enum(['En revisión', 'Enviada', 'Respondida', 'Archivada']),
  content: z.string().max(100_000),
});
export const listLetterRecordsSchema = z.object({ params: z.object({ companyId: z.coerce.number().int().positive() }) });
export const getLetterRecordSchema = z.object({ params: z.object({ companyId: z.coerce.number().int().positive(), rootId: z.string().uuid() }) });
export const saveLetterRecordSchema = z.object({ params: z.object({ companyId: z.coerce.number().int().positive(), rootId: z.string().uuid() }), body: letterRecordBody });
export const restoreLetterRecordVersionSchema = z.object({ params: z.object({ companyId: z.coerce.number().int().positive(), rootId: z.string().uuid(), versionNumber: z.coerce.number().int().positive() }) });

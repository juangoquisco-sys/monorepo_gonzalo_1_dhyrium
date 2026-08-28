import type { Request, Response } from 'express';
import LetterArchiveService from './letterArchive.service';
import { createFolderSchema, documentIdSchema, folderIdSchema, getLetterRecordSchema, listLetterRecordsSchema, moveFolderSchema, renameFolderSchema, resolveLetterArchiveSchema, restoreLetterRecordVersionSchema, rootIdSchema, saveLetterRecordSchema } from './letterArchive.schema';
import { removeLetterArchiveStagedFile } from './letterArchive.storage';

class LetterArchiveController {
  static async resolveRoot(req: Request, res: Response) { const input = resolveLetterArchiveSchema.parse({ params: req.params }); res.status(201).json(await LetterArchiveService.resolveRoot(input.params.companyId, input.params.documentCode)); }
  static async tree(req: Request, res: Response) { const input = rootIdSchema.parse({ params: req.params }); res.json(await LetterArchiveService.tree(input.params.rootId)); }
  static async listRecords(req: Request, res: Response) { const input = listLetterRecordsSchema.parse({ params: req.params }); res.json({ records: await LetterArchiveService.listRecords(input.params.companyId) }); }
  static async getRecord(req: Request, res: Response) { const input = getLetterRecordSchema.parse({ params: req.params }); res.json(await LetterArchiveService.getRecord(input.params.companyId, input.params.rootId)); }
  static async saveRecord(req: Request, res: Response) { const input = saveLetterRecordSchema.parse({ params: req.params, body: req.body }); res.json({ record: await LetterArchiveService.saveRecord(input.params.companyId, input.params.rootId, input.body) }); }
  static async restoreRecordVersion(req: Request, res: Response) { const input = restoreLetterRecordVersionSchema.parse({ params: req.params }); res.status(201).json({ record: await LetterArchiveService.restoreRecordVersion(input.params.companyId, input.params.rootId, input.params.versionNumber) }); }
  static async createFolder(req: Request, res: Response) { const input = createFolderSchema.parse({ params: req.params, body: req.body }); res.status(201).json(await LetterArchiveService.createFolder(input.params.rootId, input.body.name, input.body.parentId)); }
  static async renameFolder(req: Request, res: Response) { const input = renameFolderSchema.parse({ params: req.params, body: req.body }); res.json(await LetterArchiveService.renameFolder(input.params.folderId, input.body.name)); }
  static async duplicateFolder(req: Request, res: Response) { const input = folderIdSchema.parse({ params: req.params }); res.status(201).json(await LetterArchiveService.duplicateFolder(input.params.folderId)); }
  static async moveFolder(req: Request, res: Response) { const input = moveFolderSchema.parse({ params: req.params, body: req.body }); res.json(await LetterArchiveService.moveFolder(input.params.folderId, input.body.direction)); }
  static async deleteFolder(req: Request, res: Response) { const input = folderIdSchema.parse({ params: req.params }); await LetterArchiveService.deleteFolder(input.params.folderId); res.status(204).send(); }
  static async createDocuments(req: Request, res: Response) { const files = (req.files || []) as Express.Multer.File[]; try { const input = folderIdSchema.parse({ params: req.params }); const documents = await LetterArchiveService.createDocuments(input.params.folderId, files); res.status(201).json({ documents: documents.map((document) => { const archiveDocument = document as { sizeBytes: bigint } & Record<string, unknown>; return { ...archiveDocument, sizeBytes: archiveDocument.sizeBytes.toString() }; }) }); } catch (error) { await Promise.all(files.map(file => removeLetterArchiveStagedFile(file.path))); throw error; } }
  static async download(req: Request, res: Response) { const input = documentIdSchema.parse({ params: req.params }); const file = await LetterArchiveService.download(input.params.documentId); res.type(file.mimeType).download(file.absolutePath, file.originalName); }
}
export default LetterArchiveController;

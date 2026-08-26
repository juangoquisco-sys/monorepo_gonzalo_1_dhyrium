import { Request, Response } from 'express';
import type { UserType } from '@/middlewares/auth.middleware';
import CorporateArchiveService from './corporateArchive.service';
import { removeCorporateArchiveStagedFile } from './corporateArchive.storage';
import {
  archiveContentsRequestSchema,
  archiveDocumentIdRequestSchema,
  archiveFolderActionRequestSchema,
  archiveTreeRequestSchema,
  createArchiveDocumentsRequestSchema,
  createArchiveFolderRequestSchema,
  createArchiveVersionRequestSchema,
  moveArchiveDocumentRequestSchema,
  moveArchiveFolderRequestSchema,
  resolveArchiveRootRequestSchema,
  updateArchiveFolderRequestSchema,
} from './corporateArchive.schema';

const actor = (res: Response) => res.locals.userInfo as UserType;

class CorporateArchiveController {
  static async categories(_req: Request, res: Response) { res.status(200).json({ categories: CorporateArchiveService.categories() }); }
  static async resolveRoot(req: Request, res: Response) {
    const input = resolveArchiveRootRequestSchema.parse({ params: req.params });
    const result = await CorporateArchiveService.resolveRoot(actor(res), input.params);
    res.status(result.created ? 201 : 200).json(result);
  }
  static async tree(req: Request, res: Response) {
    const input = archiveTreeRequestSchema.parse({ params: req.params, query: req.query });
    res.status(200).json(await CorporateArchiveService.tree(input.params.rootId, input.query.includeArchived));
  }
  static async contents(req: Request, res: Response) {
    const input = archiveContentsRequestSchema.parse({ params: req.params, query: req.query });
    res.status(200).json(await CorporateArchiveService.contents(input.params.rootId, input.query));
  }
  static async createFolder(req: Request, res: Response) {
    const input = createArchiveFolderRequestSchema.parse({ params: req.params, body: req.body });
    res.status(201).json(await CorporateArchiveService.createFolder(actor(res), input.params.rootId, input.body));
  }
  static async renameFolder(req: Request, res: Response) {
    const input = updateArchiveFolderRequestSchema.parse({ params: req.params, body: req.body });
    res.status(200).json(await CorporateArchiveService.renameFolder(input.params.id, input.body.name));
  }
  static async moveFolder(req: Request, res: Response) {
    const input = moveArchiveFolderRequestSchema.parse({ params: req.params, body: req.body });
    res.status(200).json(await CorporateArchiveService.moveFolder(input.params.id, input.body.targetFolderId));
  }
  static async archiveFolder(req: Request, res: Response) {
    const input = archiveFolderActionRequestSchema.parse({ params: req.params });
    res.status(200).json(await CorporateArchiveService.setFolderArchived(actor(res), input.params.id, true));
  }
  static async restoreFolder(req: Request, res: Response) {
    const input = archiveFolderActionRequestSchema.parse({ params: req.params });
    res.status(200).json(await CorporateArchiveService.setFolderArchived(actor(res), input.params.id, false));
  }
  static async createDocuments(req: Request, res: Response) {
    const files = (req.files || []) as Express.Multer.File[];
    try {
      const input = createArchiveDocumentsRequestSchema.parse({ params: req.params, body: req.body || {} });
      res.status(201).json({ documents: await CorporateArchiveService.createDocuments(actor(res), input.params.id, files, input.body.displayName) });
    } catch (error) {
      await Promise.all(files.map(file => removeCorporateArchiveStagedFile(file.path)));
      throw error;
    }
  }
  static async documentVersions(req: Request, res: Response) {
    const input = archiveDocumentIdRequestSchema.parse({ params: req.params });
    res.status(200).json(await CorporateArchiveService.documentVersions(input.params.id));
  }
  static async createVersion(req: Request, res: Response) {
    try {
      const input = createArchiveVersionRequestSchema.parse({ params: req.params, body: req.body || {} });
      res.status(201).json(await CorporateArchiveService.createVersion(actor(res), input.params.id, req.file, input.body.expectedCurrentVersionId));
    } catch (error) {
      if (req.file) await removeCorporateArchiveStagedFile(req.file.path);
      throw error;
    }
  }
  static async moveDocument(req: Request, res: Response) {
    const input = moveArchiveDocumentRequestSchema.parse({ params: req.params, body: req.body });
    res.status(200).json(await CorporateArchiveService.moveDocument(input.params.id, input.body.targetFolderId));
  }
  static async archiveDocument(req: Request, res: Response) {
    const input = archiveDocumentIdRequestSchema.parse({ params: req.params });
    res.status(200).json(await CorporateArchiveService.setDocumentArchived(actor(res), input.params.id, true));
  }
  static async restoreDocument(req: Request, res: Response) {
    const input = archiveDocumentIdRequestSchema.parse({ params: req.params });
    res.status(200).json(await CorporateArchiveService.setDocumentArchived(actor(res), input.params.id, false));
  }
  static async download(req: Request, res: Response) {
    const input = archiveDocumentIdRequestSchema.parse({ params: req.params });
    const file = await CorporateArchiveService.download(input.params.id);
    res.type(file.mimeType).download(file.absolutePath, file.originalName);
  }
}

export default CorporateArchiveController;

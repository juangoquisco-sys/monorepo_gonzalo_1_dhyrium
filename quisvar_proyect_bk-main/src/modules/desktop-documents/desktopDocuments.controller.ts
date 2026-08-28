import type { Request, Response } from 'express';
import type { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import { quoteDesktopDownloadName } from './desktopDocuments.domain';
import {
  createDesktopDocumentLaunchSchema,
  desktopDocumentContentSchema,
  redeemDesktopDocumentLaunchSchema,
  saveDesktopDocumentVersionSchema,
} from './desktopDocuments.schema';
import DesktopDocumentsService from './desktopDocuments.service';

const getUser = (res: Response) => res.locals.userInfo as UserType;

class DesktopDocumentsController {
  static async createLaunch(req: Request, res: Response) {
    const input = createDesktopDocumentLaunchSchema.parse({ body: req.body });
    const launch = await DesktopDocumentsService.createLaunch({
      sourceKind: input.body.sourceKind,
      sourceFileId: input.body.sourceFileId,
      user: getUser(res),
    });
    res.status(201).json({ launch });
  }

  static async redeemLaunch(req: Request, res: Response) {
    const input = redeemDesktopDocumentLaunchSchema.parse({ params: req.params });
    const launch = await DesktopDocumentsService.redeemLaunch({
      ticket: input.params.ticket,
      user: getUser(res),
    });
    res.status(200).json({ launch });
  }

  static async versionContent(req: Request, res: Response) {
    const input = desktopDocumentContentSchema.parse({ params: req.params });
    const file = await DesktopDocumentsService.downloadVersion({
      documentId: input.params.documentId,
      versionId: input.params.versionId,
      user: getUser(res),
    });
    const quotedName = quoteDesktopDownloadName(file.version.originalName);
    res.set({
      'Content-Type': file.version.mimeType,
      'Content-Disposition': `attachment; filename="${quotedName}"`,
      'Content-Length': String(file.buffer.length),
      ETag: `"${file.version.checksumSha256}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    });
    res.status(200).send(file.buffer);
  }

  static async saveVersion(req: Request, res: Response) {
    const input = saveDesktopDocumentVersionSchema.parse({
      params: req.params,
      body: req.body,
    });
    if (!req.file) {
      throw new AppError(
        'Debe adjuntar el archivo que desea guardar.',
        422,
        'DESKTOP_DOCUMENT_FILE_REQUIRED'
      );
    }
    const version = await DesktopDocumentsService.saveVersion({
      documentId: input.params.documentId,
      baseVersionId: input.body.baseVersionId,
      file: req.file,
      user: getUser(res),
    });
    res.status(201).json({ version });
  }
}

export default DesktopDocumentsController;

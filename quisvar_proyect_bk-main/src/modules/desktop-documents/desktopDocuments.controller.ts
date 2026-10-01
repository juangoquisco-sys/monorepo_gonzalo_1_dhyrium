import type { NextFunction, Request, Response } from 'express';
import type { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import { sendDesktopVersion } from './desktopDocuments.download';
import {
  createDesktopDocumentLaunchSchema,
  desktopDocumentContentSchema,
  desktopDocumentLockParamsSchema,
  redeemDesktopDocumentLaunchSchema,
  saveDesktopDocumentVersionSchema,
} from './desktopDocuments.schema';
import DesktopDocumentsService from './desktopDocuments.service';
import { desktopTransfers } from './desktopDocuments.transfers';
import {
  createDesktopTransferSchema,
  desktopTransferParamsSchema,
  desktopTransferChunkParamsSchema,
} from './desktopDocuments.schema';

const getUser = (res: Response) => res.locals.userInfo as UserType;

class DesktopDocumentsController {
  static async authorizeLegacyUpload(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { documentId } = createDesktopTransferSchema.shape.params.parse(
      req.params
    );
    await DesktopDocumentsService.authorizeTransfer(documentId, getUser(res));
    next();
  }
  static async createTransfer(req: Request, res: Response) {
    const input = createDesktopTransferSchema.parse({
      params: req.params,
      body: req.body,
    });
    const transfer = await DesktopDocumentsService.createTransfer(
      input.body,
      input.params.documentId,
      getUser(res)
    );
    res.status(201).json({ transfer });
  }

  static async transferStatus(req: Request, res: Response) {
    const params = desktopTransferParamsSchema.parse(req.params);
    await DesktopDocumentsService.authorizeTransfer(
      params.documentId,
      getUser(res)
    );
    const transfer = await desktopTransfers.load(
      params.transferId,
      params.documentId,
      getUser(res).id
    );
    res.json({ transfer: await desktopTransfers.status(transfer) });
  }

  static async transferChunk(req: Request, res: Response) {
    if (!req.is('application/octet-stream'))
      throw new AppError(
        'El bloque debe enviarse como archivo binario.',
        415,
        'DESKTOP_TRANSFER_CONTENT_TYPE'
      );
    const params = desktopTransferChunkParamsSchema.parse(req.params);
    await DesktopDocumentsService.authorizeTransfer(
      params.documentId,
      getUser(res)
    );
    const transfer = await desktopTransfers.load(
      params.transferId,
      params.documentId,
      getUser(res).id
    );
    await desktopTransfers.putChunk(transfer, params.index, req);
    res.status(204).end();
  }

  static async completeTransfer(req: Request, res: Response) {
    const params = desktopTransferParamsSchema.parse(req.params);
    const transfer = await desktopTransfers.load(
      params.transferId,
      params.documentId,
      getUser(res).id
    );
    const version = await DesktopDocumentsService.completeTransfer(
      transfer,
      getUser(res)
    );
    res.status(201).json({ version });
  }

  static async cancelTransfer(req: Request, res: Response) {
    const params = desktopTransferParamsSchema.parse(req.params);
    await DesktopDocumentsService.authorizeTransfer(
      params.documentId,
      getUser(res)
    );
    await desktopTransfers.load(
      params.transferId,
      params.documentId,
      getUser(res).id
    );
    await desktopTransfers.remove(params.transferId);
    res.status(204).end();
  }
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
    const input = redeemDesktopDocumentLaunchSchema.parse({
      params: req.params,
    });
    const launch = await DesktopDocumentsService.redeemLaunch({
      ticket: input.params.ticket,
      user: getUser(res),
    });
    res.status(200).json({ launch });
  }

  static async heartbeatLock(req: Request, res: Response) {
    const input = desktopDocumentLockParamsSchema.parse({ params: req.params });
    await DesktopDocumentsService.heartbeatLock(
      input.params.documentId,
      getUser(res)
    );
    res.status(204).end();
  }

  static async releaseLock(req: Request, res: Response) {
    const input = desktopDocumentLockParamsSchema.parse({ params: req.params });
    await DesktopDocumentsService.releaseLock(
      input.params.documentId,
      getUser(res)
    );
    res.status(204).end();
  }

  static async versionContent(req: Request, res: Response) {
    const input = desktopDocumentContentSchema.parse({ params: req.params });
    const file = await DesktopDocumentsService.downloadVersion({
      documentId: input.params.documentId,
      versionId: input.params.versionId,
      user: getUser(res),
    });
    sendDesktopVersion(res, file.contentPath, file.version);
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

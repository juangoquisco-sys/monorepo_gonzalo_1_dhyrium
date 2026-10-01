import type { Request, Response } from 'express';
import type { UserType } from '@/middlewares/auth.middleware';
import { z } from 'zod';
import AppError from '@/utils/appError';
import { authorizeDesktopRecovery, desktopRecoveries, recoveryParams } from './desktopDocuments.recovery';
import { sendDesktopVersion } from './desktopDocuments.download';

export class DesktopRecoveryController {
  static async list(req: Request, res: Response) {
    const documentId = z.string().uuid().parse(req.params.documentId);
    const user = res.locals.userInfo as UserType;
    await authorizeDesktopRecovery(documentId, user);
    res.json({ recoveries: await desktopRecoveries.list(documentId, user.id) });
  }

  static async save(req: Request, res: Response) {
    const { documentId, checksum } = recoveryParams.parse(req.params);
    const baseVersionId = z.string().uuid().parse(req.get('X-Base-Version-Id'));
    const user = res.locals.userInfo as UserType;
    await authorizeDesktopRecovery(documentId, user);
    if (!req.is('application/octet-stream')) throw new AppError('Envíe la copia como archivo binario.', 415, 'DESKTOP_RECOVERY_CONTENT_TYPE');
    const recovery = await desktopRecoveries.save(documentId, user.id, checksum, baseVersionId, req);
    res.status(201).json({ recovery });
  }

  static async content(req: Request, res: Response) {
    const { documentId, checksum } = recoveryParams.parse(req.params);
    const user = res.locals.userInfo as UserType;
    const document = await authorizeDesktopRecovery(documentId, user);
    const recovery = await desktopRecoveries.content(documentId, user.id, checksum);
    sendDesktopVersion(res, recovery.path, { originalName: 'Recuperacion-' + document.originalName,
      mimeType: 'application/octet-stream', checksumSha256: checksum });
  }
}

import { Request, Response } from 'express';
import type { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import DocumentComposerService from './documentComposer.service';
import { parseThumbnailRequest } from './documentComposer.schema';

const getUserId = (res: Response) => (res.locals.userInfo as UserType).id;

class DocumentComposerController {
  static async registerPdfSource(req: Request, res: Response) {
    if (!req.file) {
      throw new AppError(
        'Selecciona un archivo PDF.',
        400,
        'DOCUMENT_FILE_MISSING'
      );
    }
    const artifact = await DocumentComposerService.registerPdfSource({
      ownerId: getUserId(res),
      name: typeof req.body.name === 'string' ? req.body.name : undefined,
      idempotencyKey:
        typeof req.body.idempotencyKey === 'string'
          ? req.body.idempotencyKey
          : undefined,
      file: req.file,
    });
    res.status(201).json({ artifact });
  }

  static async compose(req: Request, res: Response) {
    const files = Array.isArray(req.files) ? req.files : [];
    const artifact = await DocumentComposerService.compose({
      ownerId: getUserId(res),
      name: String(req.body.name || ''),
      idempotencyKey:
        typeof req.body.idempotencyKey === 'string'
          ? req.body.idempotencyKey
          : undefined,
      manifest: req.body.manifest,
      files,
    });
    res.status(201).json({ artifact });
  }

  static async metadata(req: Request, res: Response) {
    const artifact = await DocumentComposerService.getMetadata(
      getUserId(res),
      req.params.artifactId
    );
    res.status(200).json({ artifact });
  }

  static async download(req: Request, res: Response) {
    const { artifact, absolutePath } =
      await DocumentComposerService.getDownload(
        getUserId(res),
        req.params.artifactId
      );
    res.download(absolutePath, artifact.safeName);
  }

  static async thumbnail(req: Request, res: Response) {
    const input = parseThumbnailRequest({ params: req.params });
    const thumbnail = await DocumentComposerService.getThumbnail(
      getUserId(res),
      input.params.artifactId,
      input.params.pageNumber
    );

    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (thumbnail.state === 'pending') {
      res.setHeader('Retry-After', String(thumbnail.retryAfterSeconds));
      res.status(202).end();
      return;
    }

    res.setHeader('Content-Type', thumbnail.contentType);
    res.setHeader('Content-Length', String(thumbnail.buffer.length));
    res.status(200).end(thumbnail.buffer);
  }

  static async remove(req: Request, res: Response) {
    await DocumentComposerService.deleteTemporary(
      getUserId(res),
      req.params.artifactId
    );
    res.status(204).send();
  }
}

export default DocumentComposerController;

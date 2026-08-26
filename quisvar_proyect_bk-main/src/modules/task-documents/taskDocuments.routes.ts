import express, { Router, type Request, type Response } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import TaskDocumentsController from './taskDocuments.controller';
import {
  taskDocumentAssetUpload,
  taskDocumentPreviewUpload,
} from './taskDocuments.upload';

const router = Router();

router.all('/office-edit/:token', async (req: Request, res: Response) => {
  switch (req.method.toUpperCase()) {
    case 'OPTIONS':
      return TaskDocumentsController.officeCollectionOptions(req, res);
    case 'PROPFIND':
      return TaskDocumentsController.officeCollectionProperties(req, res);
    default:
      res.set('Allow', 'OPTIONS, PROPFIND');
      return res.status(405).send();
  }
});

router.put(
  '/office-edit/:token/:fileName',
  TaskDocumentsController.validateOfficeFileSession,
  express.raw({ type: () => true, limit: '100mb' }),
  TaskDocumentsController.officeFileSave
);
router.all(
  '/office-edit/:token/:fileName',
  async (req: Request, res: Response) => {
    switch (req.method.toUpperCase()) {
      case 'GET':
      case 'HEAD':
        return TaskDocumentsController.officeFile(req, res);
      case 'OPTIONS':
        return TaskDocumentsController.officeFileOptions(req, res);
      case 'PROPFIND':
        return TaskDocumentsController.officeFileProperties(req, res);
      case 'LOCK':
        return TaskDocumentsController.officeFileLock(req, res);
      case 'UNLOCK':
        return TaskDocumentsController.officeFileUnlock(req, res);
      default:
        res.set('Allow', 'OPTIONS, GET, HEAD, PUT, PROPFIND, LOCK, UNLOCK');
        return res.status(405).send();
    }
  }
);

router.use(authenticateHandler);
router.get('/office-capabilities', TaskDocumentsController.capabilities);
router.post(
  '/preview/docx-to-pdf',
  taskDocumentPreviewUpload,
  TaskDocumentsController.preview
);
router.post(
  '/:taskKind/:taskId/assets',
  TaskDocumentsController.validateCanEditTaskDocument,
  taskDocumentAssetUpload,
  TaskDocumentsController.asset
);
router.get(
  '/:taskKind/:taskId/assets/:fileName',
  TaskDocumentsController.assetContent
);
router.get(
  '/office-sessions/:sessionId',
  TaskDocumentsController.officeSession
);
router.delete(
  '/office-sessions/:sessionId',
  TaskDocumentsController.releaseOfficeSession
);
router.post(
  '/:taskKind/:taskId/office-sessions',
  TaskDocumentsController.createOfficeSession
);
router.get(
  '/:taskKind/:taskId/file-versions',
  TaskDocumentsController.fileVersions
);
router.post(
  '/:taskKind/:taskId/file-versions/original',
  TaskDocumentsController.ensureOriginalFileVersion
);
router.get(
  '/:taskKind/:taskId/file-versions/:versionNumber/content',
  TaskDocumentsController.fileVersionContent
);
router.post(
  '/:taskKind/:taskId/file-versions/:versionNumber/restore',
  TaskDocumentsController.restoreFileVersion
);
router.get('/:taskKind/:taskId/versions', TaskDocumentsController.versions);
router.post(
  '/:taskKind/:taskId/versions/:versionNumber/restore',
  TaskDocumentsController.restore
);
router.get('/:taskKind/:taskId', TaskDocumentsController.get);
router.put('/:taskKind/:taskId', TaskDocumentsController.save);

export default router;

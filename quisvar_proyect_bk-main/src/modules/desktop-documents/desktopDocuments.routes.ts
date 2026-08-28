import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import DesktopDocumentsController from './desktopDocuments.controller';
import { desktopDocumentUpload } from './desktopDocuments.upload';

const router = Router();

router.use(authenticateHandler);
router.post('/documents/launches', DesktopDocumentsController.createLaunch);
router.post(
  '/documents/launches/:ticket/redeem',
  DesktopDocumentsController.redeemLaunch
);
router.get(
  '/documents/:documentId/versions/:versionId/content',
  DesktopDocumentsController.versionContent
);
router.post(
  '/documents/:documentId/versions',
  desktopDocumentUpload,
  DesktopDocumentsController.saveVersion
);

export default router;

import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import DesktopDocumentsController from './desktopDocuments.controller';
import { desktopDocumentUpload } from './desktopDocuments.upload';
import { DesktopRecoveryController } from './desktopDocuments.recoveryController';

const router = Router();

router.use(authenticateHandler);
router.get('/documents/:documentId/recoveries', DesktopRecoveryController.list);
router.put('/documents/:documentId/recoveries/:checksum', DesktopRecoveryController.save);
router.get('/documents/:documentId/recoveries/:checksum/content', DesktopRecoveryController.content);
router.post(
  '/documents/:documentId/transfers',
  DesktopDocumentsController.createTransfer
);
router.get(
  '/documents/:documentId/transfers/:transferId',
  DesktopDocumentsController.transferStatus
);
router.put(
  '/documents/:documentId/transfers/:transferId/chunks/:index',
  DesktopDocumentsController.transferChunk
);
router.post(
  '/documents/:documentId/transfers/:transferId/complete',
  DesktopDocumentsController.completeTransfer
);
router.delete(
  '/documents/:documentId/transfers/:transferId',
  DesktopDocumentsController.cancelTransfer
);
router.post('/documents/launches', DesktopDocumentsController.createLaunch);
router.post(
  '/documents/launches/:ticket/redeem',
  DesktopDocumentsController.redeemLaunch
);
router.post(
  '/documents/:documentId/lock/heartbeat',
  DesktopDocumentsController.heartbeatLock
);
router.delete(
  '/documents/:documentId/lock',
  DesktopDocumentsController.releaseLock
);
router.get(
  '/documents/:documentId/versions/:versionId/content',
  DesktopDocumentsController.versionContent
);
router.post(
  '/documents/:documentId/versions',
  DesktopDocumentsController.authorizeLegacyUpload,
  desktopDocumentUpload,
  DesktopDocumentsController.saveVersion
);

export default router;

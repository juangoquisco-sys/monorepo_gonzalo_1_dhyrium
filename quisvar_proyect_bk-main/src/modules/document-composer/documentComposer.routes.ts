import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import DocumentComposerController from './documentComposer.controller';
import { imageUpload, pdfUpload } from './documentComposer.upload';

const router = Router();

router.use(authenticateHandler);
router.post(
  '/sources/pdf',
  pdfUpload,
  DocumentComposerController.registerPdfSource
);
router.post('/artifacts', imageUpload, DocumentComposerController.compose);
router.get('/artifacts/:artifactId', DocumentComposerController.metadata);
router.get(
  '/artifacts/:artifactId/download',
  DocumentComposerController.download
);
router.get(
  '/artifacts/:artifactId/pages/:pageNumber/thumbnail',
  DocumentComposerController.thumbnail
);
router.delete('/artifacts/:artifactId', DocumentComposerController.remove);

export default router;

import { Router } from 'express';
import authMiddleware from '@/middlewares/auth.middleware';
import ExpedienteFoliationController from './expedienteFoliation.controller';

const router = Router();

router.use(authMiddleware);
router.post('/:rootType/:id/generate', ExpedienteFoliationController.generate);
router.get('/:rootType/:id', ExpedienteFoliationController.status);
router.get('/:rootType/:id/download', ExpedienteFoliationController.download);
router.post('/:rootType/:id/reprint', ExpedienteFoliationController.reprint);

export default router;

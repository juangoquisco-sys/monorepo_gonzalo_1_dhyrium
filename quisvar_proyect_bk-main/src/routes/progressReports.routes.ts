import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import ProgressReportsControllers from '@/controllers/progressReports.controllers';

const router = Router();

router.use(authenticateHandler);

router.get(
  '/workspace',
  role.RoleHandler(['MOD', 'MEMBER', 'USER', 'VIEWER'], 'grupos'),
  ProgressReportsControllers.workspace
);
router.get(
  '/:id',
  role.RoleHandler(['MOD', 'MEMBER', 'USER', 'VIEWER'], 'grupos'),
  ProgressReportsControllers.find
);
router.post(
  '/',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  ProgressReportsControllers.create
);
router.patch(
  '/:id',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  ProgressReportsControllers.update
);
router.post(
  '/:id/ready',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  ProgressReportsControllers.markReady
);
router.post(
  '/:id/save-as-template',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  ProgressReportsControllers.saveAsTemplate
);
router.delete(
  '/:id',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  ProgressReportsControllers.deleteDraft
);

export default router;

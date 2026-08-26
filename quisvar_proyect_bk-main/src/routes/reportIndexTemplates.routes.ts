import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import ProgressReportsControllers from '@/controllers/progressReports.controllers';

const router = Router();

router.use(authenticateHandler);

router.get(
  '/',
  role.RoleHandler(['MOD', 'MEMBER', 'VIEWER', 'USER'], 'grupos'),
  ProgressReportsControllers.listIndexTemplates
);
router.post(
  '/',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  ProgressReportsControllers.createIndexTemplate
);
router.patch(
  '/:id',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  ProgressReportsControllers.updateIndexTemplate
);
router.delete(
  '/:id',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  ProgressReportsControllers.deleteIndexTemplate
);

export default router;

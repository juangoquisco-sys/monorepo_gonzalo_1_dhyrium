import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import ProgressReportsControllers from '@/controllers/progressReports.controllers';

const router = Router();

router.use(authenticateHandler);

router.get(
  '/',
  role.RoleHandler(['MOD', 'MEMBER', 'VIEWER', 'USER'], 'grupos'),
  ProgressReportsControllers.listTemplates
);
router.post(
  '/',
  role.RoleHandler(['MOD'], 'grupos'),
  ProgressReportsControllers.createTemplate
);

export default router;

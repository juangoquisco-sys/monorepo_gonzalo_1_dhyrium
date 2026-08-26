import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import uploads from '@/middlewares/upload.middleware';
import {
  basicResourcesSummary,
  createBasicResources,
  deleteBasicResource,
  downloadBasicResource,
  listBasicResources,
  updateBasicResource,
} from './basicResources.controller';

const router = Router();

router.use(authenticateHandler);
router.use(role.RoleHandler(['MOD', 'MEMBER', 'VIEWER', 'USER'], 'grupos'));

router.get('/:unitId/projects/:projectId/stages/:stageId', listBasicResources);
router.get(
  '/:unitId/projects/:projectId/stages/:stageId/summary',
  basicResourcesSummary
);
router.post(
  '/:unitId/projects/:projectId/stages/:stageId',
  uploads.basicResources().array('files', 20),
  createBasicResources
);
router.patch('/:unitId/:resourceId', updateBasicResource);
router.delete('/:unitId/:resourceId', deleteBasicResource);
router.get('/:unitId/:resourceId/download', downloadBasicResource);

export default router;

import { Router } from 'express';

import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import LiquidationsController from './liquidations.controller';
import { liquidationUpload } from './liquidations.upload';

const router = Router();

router.use(authenticateHandler);
router.get('/pre-stages', LiquidationsController.preLiquidationStages);
router.get(
  '/pre-stages/:stageId/tasks',
  LiquidationsController.preLiquidationStageTasks
);
router.post(
  '/pre-stages/:stageId/grant-conformity',
  role.RoleHandler(['MOD'], 'mis-tareas', 'tecnicas'),
  LiquidationsController.grantStageConformity
);
router.get('/eligible-stages', LiquidationsController.eligibleStages);
router.get('/preview/:stageId', LiquidationsController.preview);
router.post(
  '/create-request',
  liquidationUpload.fields([
    { name: 'mainProcedure', maxCount: 1 },
    { name: 'fileMail', maxCount: 10 },
  ]),
  LiquidationsController.createRequest
);
router.get(
  '/unamortized-advances/:userId',
  LiquidationsController.unamortizedAdvances
);

export default router;

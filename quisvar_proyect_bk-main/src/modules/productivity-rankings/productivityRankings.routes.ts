import { Router } from 'express';

import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import ProductivityRankingsController from './productivityRankings.controller';

const router = Router();

router.use(authenticateHandler);
router.use(
  role.RoleHandler(['MOD', 'USER'], 'control-asistencia', 'rankings-productividad')
);

router.get('/config', ProductivityRankingsController.getConfig);
router.patch('/config', ProductivityRankingsController.updateConfig);

router.get('/periods', ProductivityRankingsController.listPeriods);
router.post('/periods', ProductivityRankingsController.createPeriod);
router.post('/periods/:id/close', ProductivityRankingsController.closePeriod);

router.get('/top', ProductivityRankingsController.top);
router.get('/offices/top', ProductivityRankingsController.officeTop);
router.get('/me', ProductivityRankingsController.me);
router.get('/entries', ProductivityRankingsController.allEntries);
router.get('/entries/:userId', ProductivityRankingsController.entryDetail);

router.post('/non-task-activities', ProductivityRankingsController.createNonTaskActivity);
router.get('/non-task-activities/me', ProductivityRankingsController.myNonTaskActivities);
router.get(
  '/non-task-activities/pending',
  ProductivityRankingsController.pendingNonTaskActivities
);
router.patch(
  '/non-task-activities/:id/review',
  ProductivityRankingsController.reviewNonTaskActivity
);

export default router;

import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import {
  deleteCallConfig,
  deleteWeekdayOverride,
  getResolvedCalls,
  listCallConfigs,
  upsertCallConfig,
  upsertWeekdayOverride,
} from '@/controllers/attendanceCallConfig.controller';

const router = Router();
router.use(authenticateHandler);
router.use(role.RoleHandler(['MOD'], 'control-asistencia', 'registro'));

router.get('/', listCallConfigs);
router.get('/resolved', getResolvedCalls);
router.put('/:position', upsertCallConfig);
router.delete('/:id', deleteCallConfig);
router.put('/:id/weekday-overrides/:weekday', upsertWeekdayOverride);
router.delete('/weekday-overrides/:id', deleteWeekdayOverride);

export default router;

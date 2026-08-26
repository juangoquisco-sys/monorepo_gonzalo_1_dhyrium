import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import CalendarControllers from '@/controllers/calendar.controllers';

const router = Router();

router.use(authenticateHandler);

router.post(
  '/',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  CalendarControllers.createActivity
);
router.patch(
  '/:id',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  CalendarControllers.updateActivity
);
router.delete(
  '/:id',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  CalendarControllers.deleteActivity
);

export default router;

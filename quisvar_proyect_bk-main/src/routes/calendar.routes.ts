import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import CalendarControllers from '@/controllers/calendar.controllers';

const router = Router();

router.use(authenticateHandler);

router.get(
  '/',
  role.RoleHandler(['MOD', 'MEMBER', 'VIEWER', 'USER'], 'grupos'),
  CalendarControllers.list
);

export default router;

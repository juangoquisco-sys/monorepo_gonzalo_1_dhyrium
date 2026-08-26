import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import MeetingExternalContactsControllers from '@/controllers/meetingExternalContacts.controllers';

const router = Router();

router.use(authenticateHandler);

router.get(
  '/',
  role.RoleHandler(['MOD', 'MEMBER', 'VIEWER', 'USER'], 'grupos'),
  MeetingExternalContactsControllers.list
);
router.post(
  '/',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingExternalContactsControllers.create
);

export default router;

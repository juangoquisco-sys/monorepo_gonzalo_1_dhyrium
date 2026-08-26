import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import MeetingsControllers from '@/controllers/meetings.controllers';

const router = Router();

router.use(authenticateHandler);

router.post(
  '/',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingsControllers.create
);
router.get(
  '/',
  role.RoleHandler(['MOD', 'MEMBER', 'VIEWER', 'USER'], 'grupos'),
  MeetingsControllers.list
);
router.get(
  '/:id/participant-candidates',
  role.RoleHandler(['MOD', 'MEMBER', 'VIEWER', 'USER'], 'grupos'),
  MeetingsControllers.participantCandidates
);
router.get(
  '/:id',
  role.RoleHandler(['MOD', 'MEMBER', 'VIEWER', 'USER'], 'grupos'),
  MeetingsControllers.find
);
router.patch(
  '/:id',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingsControllers.update
);
router.post(
  '/:id/start',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingsControllers.start
);
router.post(
  '/:id/end',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingsControllers.end
);
router.patch(
  '/:id/scope',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingsControllers.updateScope
);
router.post(
  '/:id/resume',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingsControllers.resume
);
router.put(
  '/:id/attendance',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingsControllers.updateAttendance
);
router.post(
  '/:id/participants',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingsControllers.addParticipants
);
router.delete(
  '/:id/participants/:participantId',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingsControllers.removeParticipant
);
router.put(
  '/:id/minutes',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingsControllers.updateMinutes
);
router.put(
  '/:id/projects/:projectId/minutes',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingsControllers.updateProjectMinutes
);
router.post(
  '/:id/agenda-items',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingsControllers.addAgendaItem
);
router.patch(
  '/:id/agenda-items/:itemId',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  MeetingsControllers.updateAgendaItem
);

export default router;

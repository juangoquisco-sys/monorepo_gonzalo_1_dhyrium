import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import CommitmentsControllers from '@/controllers/commitments.controllers';

const router = Router();

router.use(authenticateHandler);

router.get(
  '/',
  role.RoleHandler(['MOD', 'MEMBER', 'VIEWER', 'USER'], 'grupos'),
  CommitmentsControllers.list
);
router.post(
  '/',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  CommitmentsControllers.create
);
router.post(
  '/proposals',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  CommitmentsControllers.createProposal
);
router.patch(
  '/:id',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  CommitmentsControllers.update
);
router.post(
  '/:id/reviews',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  CommitmentsControllers.review
);
router.patch(
  '/:id/reviews/comment',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  CommitmentsControllers.updateReviewComment
);
router.post(
  '/:id/confirm',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  CommitmentsControllers.confirm
);
router.post(
  '/:id/attach-meeting',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  CommitmentsControllers.attachMeeting
);
router.patch(
  '/:id/status',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  CommitmentsControllers.updateStatus
);
router.delete(
  '/:id',
  role.RoleHandler(['MOD', 'MEMBER', 'USER'], 'grupos'),
  CommitmentsControllers.delete
);

export default router;

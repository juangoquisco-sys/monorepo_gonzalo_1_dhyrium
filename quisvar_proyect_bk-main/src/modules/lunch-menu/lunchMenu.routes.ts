import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import LunchMenuController from './lunchMenu.controller';

const router = Router();

router.use(authenticateHandler);

router.get('/current', LunchMenuController.current);

router.post(
  '/',
  role.RoleHandler(['MOD'], 'cocina', 'lista'),
  LunchMenuController.publish
);
router.post(
  '/:serviceDate/close',
  role.RoleHandler(['MOD'], 'cocina', 'lista'),
  LunchMenuController.close
);
router.post(
  '/:serviceDate/reopen',
  role.RoleHandler(['MOD'], 'cocina', 'lista'),
  LunchMenuController.reopen
);
router.get(
  '/:serviceDate/moderation',
  role.RoleHandler(['MOD'], 'cocina', 'lista'),
  LunchMenuController.moderation
);
router.get(
  '/:serviceDate/consolidated',
  role.RoleHandler(['MOD'], 'cocina', 'lista'),
  LunchMenuController.consolidated
);
router.post(
  '/:serviceDate/selections/:userId',
  role.RoleHandler(['MOD'], 'cocina', 'lista'),
  LunchMenuController.assignPending
);
router.post(
  '/:serviceDate/assign-most-requested',
  role.RoleHandler(['MOD'], 'cocina', 'lista'),
  LunchMenuController.assignMostRequestedPending
);
router.get(
  '/:serviceDate/assign-most-requested-preview',
  role.RoleHandler(['MOD'], 'cocina', 'lista'),
  LunchMenuController.previewMostRequestedPending
);
router.get(
  '/:serviceDate',
  role.RoleHandler(['MOD'], 'cocina', 'formulario'),
  LunchMenuController.getOwn
);
router.post(
  '/:serviceDate/selections',
  role.RoleHandler(['MOD'], 'cocina', 'formulario'),
  LunchMenuController.selectOwn
);

export default router;

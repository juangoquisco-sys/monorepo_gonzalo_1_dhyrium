import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import {
  _employee_role,
  _admin_role,
  _mod_role,
} from '@/middlewares/role.middleware';
import DuplicateControllers, {
  duplicateLevels,
  duplicateProject,
  duplicateStages,
  duplicateSubtask,
} from '@/controllers/duplicates.controllers';

const { basicLevels } = new DuplicateControllers();

const router = Router();
router.use(authenticateHandler);
//EMPLOYEE ROLE
router.use(_employee_role);
//MODERATOR ROLE
router.use(_mod_role);
router.post('/basic-level/:id', basicLevels);
router.post('/project/:id', duplicateProject);
router.post('/stage/:id', duplicateStages);
router.post('/level/:id', duplicateLevels);
router.post('/subtask/:id', duplicateSubtask);
//ADMIN ROLE
router.use(_admin_role);

export default router;

import { Router } from 'express';
import {
  createUser,
  deleteUser,
  showTaskByUser,
  showUser,
  showUsers,
  updateUser,
  showSubTasksByUser,
} from '@/controllers/users.controllers';
import authenticateHandler from '@/middlewares/auth.middleware';

import LogsMiddleware from '@/middlewares/logs.middleware';
import uploads from '@/middlewares/upload.middleware';
import { showAllByMenuPoints } from '@/controllers/users.controllers';
import {
  getUserCenterUserOptions,
  getUserLookupOptions,
} from '@/controllers/userLookup.controllers';

const router = Router();
router.use(authenticateHandler);
//EMPLOYEE ROLE
// router.use(_employee_role);
router.get('/', showUsers);
router.get('/menupoints', showAllByMenuPoints);
// Deprecated alias kept temporarily for existing clients.
router.get('/options/admin', getUserCenterUserOptions);
router.get('/options/:context', getUserLookupOptions);
router.get('/:id/tasks', showTaskByUser);
router.get('/:id/subTasks', showSubTasksByUser);
//MOD ROLE
// router.use(_mod_role);
router.get('/:id', showUser);
//ADMIN ROLE
// router.use(_admin_role);
router.post(
  '/',
  // acceptFormData,
  // verifyUniqueParam,
  uploads.fileUser.fields([
    { name: 'fileUserCv' },
    { name: 'fileUserDeclaration' },
  ]),
  createUser
);
router.patch('/:id', LogsMiddleware.role, updateUser);
router.delete('/:id', deleteUser);
export default router;

import { Router } from 'express';
import {
  createTypeSpeciality,
  deleteTypeSpeciality,
  showTypeSpecialities,
  showTypeSpeciality,
  updateTypeSpeciality,
} from '@/controllers/typeSpecialities.controllers';
import authenticateHandler from '@/middlewares/auth.middleware';
import { _mod_role, _employee_role } from '@/middlewares/role.middleware';

const router = Router();
router.use(authenticateHandler);
//EMPLOYEE ROLE
router.use(_employee_role);
router.get('/', showTypeSpecialities);
router.get('/:id', showTypeSpeciality);
//MOD ROLE
router.use(_mod_role);
router.post('/', createTypeSpeciality);
router.put('/:id', updateTypeSpeciality);
router.delete('/:id', deleteTypeSpeciality);
export default router;

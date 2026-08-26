import { Router } from 'express';
import {
  createSpeciality,
  deleteSpeciality,
  showSpecialities,
  showSpeciality,
  updateSpeciality,
} from '@/controllers/speacialities.controllers';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';

const router = Router();
router.use(authenticateHandler);
//EMPLOYEE ROLE
router.use(role.RoleHandler(['MEMBER', 'MOD'], 'especialidades'));
router.get('/', showSpecialities);
router.get('/:id', showSpeciality);
//MOD ROLE
router.use(role.RoleHandler(['MOD'], 'especialidades'));
router.post('/', createSpeciality);
router.put('/:id', updateSpeciality);
router.delete('/:id', deleteSpeciality);
export default router;

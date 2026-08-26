import { Router } from 'express';
import {
  createSector,
  deleteSector,
  showSectors,
  updateSector,
} from '@/controllers/sector.controllers';
import authenticateHandler from '@/middlewares/auth.middleware';
import { _mod_role, _employee_role } from '@/middlewares/role.middleware';

const router = Router();
router.use(authenticateHandler);
//EMPLOYEE ROLE
router.use(_employee_role);
router.get('/', showSectors);
// router.get('/:id', showSpeciality);
//MOD ROLE
router.use(_mod_role);
router.post('/', createSector);
router.put('/:id', updateSector);
router.delete('/:id', deleteSector);
export default router;

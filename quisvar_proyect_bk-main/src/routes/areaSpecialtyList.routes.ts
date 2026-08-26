import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import {
  createAreaSpecialtyList,
  deleteAreaSpecialtyList,
  // getAllSpecialistBySpeciality,
  getAreaSpecialtyList,
  // updateAreaSpecialtyList,
} from '@/controllers/areaSpecialtyList.controller';
import { _admin_role } from '@/middlewares/role.middleware';
const router = Router();
router.use(authenticateHandler);
router.use(_admin_role);
router.get('/:id', getAreaSpecialtyList);
// router.get('/filter/:id', getAllSpecialistBySpeciality);
router.post('/:specialtyId', createAreaSpecialtyList);
// router.patch('/:id', updateAreaSpecialtyList);
router.delete('/:id', deleteAreaSpecialtyList);
export default router;

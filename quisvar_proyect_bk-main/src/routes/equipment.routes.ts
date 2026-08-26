import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import {
  createEquipment,
  getEquipment,
  updateEquipment,
  deleteEquipment,
} from '@/controllers/equipment.controller';
import { _admin_role } from '@/middlewares/role.middleware';
import uploads from '@/middlewares/upload.middleware';
const router = Router();
router.use(authenticateHandler);
router.use(_admin_role);
router.get('/:id', getEquipment);
router.post('/', uploads.equipment.fields([{ name: 'file' }]), createEquipment);
router.patch('/:id', updateEquipment);
router.delete('/:id', deleteEquipment);
export default router;

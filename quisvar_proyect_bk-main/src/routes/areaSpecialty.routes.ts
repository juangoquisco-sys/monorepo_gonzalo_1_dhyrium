import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import {
  createAreaSpecialty,
  deleteAreaSpecialty,
  getAreaSpecialty,
  uploadAreaSpecialty,
} from '@/controllers/areaSpecialty.controller';
import { _admin_role } from '@/middlewares/role.middleware';
import uploads from '@/middlewares/upload.middleware';
const router = Router();
router.use(authenticateHandler);
router.use(_admin_role);
router.get('/:id', getAreaSpecialty);
router.post(
  '/',
  uploads.areaSpecialty.fields([{ name: 'file' }]),
  createAreaSpecialty
);
router.patch('/:id', uploadAreaSpecialty);
router.delete('/:id', deleteAreaSpecialty);
export default router;

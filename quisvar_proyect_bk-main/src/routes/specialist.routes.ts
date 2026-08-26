import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import {
  createSpecialist,
  deleteSpecialist,
  getSpecialist,
  getSpecialistByDNI,
  getSpecialistById,
  getSpecialistHistory,
  updateSpecialist,
} from '@/controllers/specialist.controller';
import { _admin_role } from '@/middlewares/role.middleware';
import uploads from '@/middlewares/upload.middleware';
const router = Router();
router.use(authenticateHandler);
router.use(_admin_role);
router.get('/', getSpecialist);
router.patch('/:id', updateSpecialist);
router.get('/dni/:dni', getSpecialistByDNI);
router.get('/information/:id', getSpecialistById);
router.get('/history/:id', getSpecialistHistory);
router.post(
  '/',
  uploads.fileSpecialist.fields([
    { name: 'fileAgreement' },
    { name: 'fileCv' },
  ]),
  createSpecialist
);
router.delete('/delete/:id', deleteSpecialist);
export default router;

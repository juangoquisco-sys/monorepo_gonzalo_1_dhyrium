import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import {
  createWorkStation,
  getWorkStation,
  updateWorkStation,
  deleteWorkStation,
} from '@/controllers/workStation.controllers';
import { _admin_role } from '@/middlewares/role.middleware';
import uploads from '@/middlewares/upload.middleware';
const router = Router();
router.use(authenticateHandler);
router.use(_admin_role);
router.get('/', getWorkStation);
router.post(
  '/',
  uploads.workStation.fields([{ name: 'file' }]),
  createWorkStation
);
router.patch('/:id', updateWorkStation);
router.delete('/:id', deleteWorkStation);
export default router;

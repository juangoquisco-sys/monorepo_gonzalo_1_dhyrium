import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import uploads from '@/middlewares/upload.middleware';
import {
  createMetradoDraft,
  deleteMetradoProject,
  getMetradoById,
  importMetradoExcel,
  listMetrados,
} from '@/controllers/metrados.controllers';

const router = Router();

router.use(authenticateHandler);
router.use(role.RoleHandler(['MOD'], 'metrados'));

router.get('/', listMetrados);
router.get('/:id', getMetradoById);
router.post('/', createMetradoDraft);
router.post(
  '/import/excel',
  uploads.blobFiles.single('file'),
  importMetradoExcel
);
router.delete('/:id', deleteMetradoProject);

export default router;

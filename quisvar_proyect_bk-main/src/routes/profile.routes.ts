import { Router } from 'express';

import authenticateHandler from '@/middlewares/auth.middleware';
import { _employee_role, _admin_role } from '@/middlewares/role.middleware';
import { showProfile, updateProfile } from '@/controllers/profile.controllers';
// import { upload, uploadFile } from '../middlewares/upload.middleware';

const router = Router();
// router.get('/download', downloadProfile);
// router.post('/upload', upload.single('awa'), uploadFile);
router.use(authenticateHandler);
//EMPLOYEE ROLE
router.use(_admin_role);

router.use(_employee_role);
router.put('/:id', updateProfile);
router.get('/', showProfile);
//ADMIN ROLE
router.use(_admin_role);

export default router;

import { ProfessionController } from '@/controllers/profession.controller';
import { Router } from 'express';

import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';

const professionController = new ProfessionController();
const router = Router();
router.use(authenticateHandler);
//EMPLOYEE ROLE
router.use(role.RoleHandler(['MOD'], 'centro-de-usuarios'));

router.get('/', professionController.getAll);
router.post('/', professionController.create);
router.delete('/:id', professionController.delete);
router.patch('/:id', professionController.update);

export default router;

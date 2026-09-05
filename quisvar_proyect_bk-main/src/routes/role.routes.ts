import { RoleController } from '@/controllers/role.controller';
import { Router } from 'express';

import authenticateHandler from '@/middlewares/auth.middleware';
import roleManagementHandler from '@/middlewares/roleManagement.middleware';
// import { _mod_role, _employee_role } from '../middlewares/role.middleware';

const roleController = new RoleController();
const router = Router();
router.use(authenticateHandler);
//EMPLOYEE ROLE
router.get('/form', roleController.showsForForm);
router.use(roleManagementHandler);
router.get('/menu', roleController.showMenus);
router.get('/menuPoints', roleController.showMenusPoints);
router.get('/menu/:id', roleController.showMenu);
router.get('/menusGeneral', roleController.showMenusGeneral);
router.get('/:id', roleController.show);
router.put('/:id', roleController.update);
router.put('/hierarchy/:id/:hierarchy', roleController.updateHierarchy);
router.delete('/:id', roleController.delete);

router.post('/', roleController.create);
export default router;

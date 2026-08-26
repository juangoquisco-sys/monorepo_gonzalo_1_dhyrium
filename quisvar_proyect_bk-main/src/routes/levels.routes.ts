import { Router } from 'express';
import LevelsControllers from '@/controllers/levels.controllers';
import authenticateHandler from '@/middlewares/auth.middleware';

import {
  _employee_role,
  // _admin_role,
  _mod_role,
} from '@/middlewares/role.middleware';

class LevelsRouter {
  public router: Router;
  constructor() {
    this.router = Router();
    this.setUpRoutes();
  }
  private setUpRoutes() {
    this.router.post('/', LevelsControllers.create);
    this.router.get('/:id', LevelsControllers.findById);
    this.router.post('/:id', LevelsControllers.addUpperOrLower);
    this.router.post('/approved/:id', LevelsControllers.addUpperOrLower);
    this.router.put('/:id', LevelsControllers.update);
    this.router.patch('/updates-covers', LevelsControllers.updateCovers);
    this.router.patch('/:id', LevelsControllers.updateTypeItem);
    this.router.delete('/:id', LevelsControllers.delete);
    this.router.use(authenticateHandler);
  }
}

const { router } = new LevelsRouter();
export default router;
// router.post('/:id', addToUp);
// router.use(authenticateHandler);
// //EMPLOYEE ROLE
// router.use(_employee_role);
// // router.patch('/status/:id', updateTaskStatus);
// router.get('/:id', showLevel);
// // router.get('/:id/subtasks', showSubtasksByIndexTask);
// // router.patch('/:id', taskVerify, assignedTask);
// //MOD ROLE
// router.use(_mod_role);
// router.put('/:id', updateLevel);
// router.patch('/:id', updateTypeItem);
// // router.patch('/updates-covers', updateCover);
// router.patch('/updates-days', updateDays);
// router.post('/', createLevel);
// router.delete('/:id', deleteLevel);
// export default router;

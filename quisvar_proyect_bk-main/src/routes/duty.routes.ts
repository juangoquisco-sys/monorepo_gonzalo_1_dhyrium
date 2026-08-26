import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import DutyControllers from '@/controllers/duty.controllers';
class DutyRoutes {
  public router: Router;
  constructor() {
    this.router = Router();
    this.setUpRouter();
  }
  protected setUpRouter(): void {
    this.router.use(authenticateHandler);

    this.router.use(role.RoleHandler(['MOD'], 'grupos'));
    this.router.post('/:groupId/:projectId', DutyControllers.createDuty);
    this.router.patch('/items/:id', DutyControllers.updateDuty);
    this.router.delete('/:id', DutyControllers.deleteDuty);
    //Duty projects
    this.router.get('/projects', DutyControllers.getProjects);
  }
}
const { router } = new DutyRoutes();
export default router;

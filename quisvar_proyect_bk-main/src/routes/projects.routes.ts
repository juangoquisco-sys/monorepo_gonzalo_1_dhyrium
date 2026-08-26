import { Router } from 'express';
import ProjectsControllers from '@/controllers/projects.controllers';
import authenticateHandler from '@/middlewares/auth.middleware';
import { _mod_role, _employee_role } from '@/middlewares/role.middleware';

class ProjectsRoutes {
  constructor(public router = Router()) {
    this.setupRoutes();
  }

  private setupRoutes() {
    this.router.use(authenticateHandler);
    //EMPLOYEE ROLE
    this.router.use(_employee_role);
    this.router.get('/', ProjectsControllers.showAll);
    this.router.get('/:id', ProjectsControllers.showOne);
    //MOD ROLE
    this.router.use(_mod_role);
    this.router.post('/', ProjectsControllers.create);
    this.router.put('/:id', ProjectsControllers.update);
    this.router.delete('/:id', ProjectsControllers.remove);
  }
}

const { router } = new ProjectsRoutes();
export default router;

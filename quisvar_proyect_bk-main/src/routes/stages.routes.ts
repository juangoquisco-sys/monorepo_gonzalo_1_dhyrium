import { Router } from 'express';
import { addNewStage } from '@/controllers/duplicates.controllers';
import StagesControllers from '@/controllers/stages.controllers';
import authenticateHandler from '@/middlewares/auth.middleware';
import { _mod_role, _employee_role } from '@/middlewares/role.middleware';

class StagesRoutes {
  constructor(public router = Router()) {
    this.setUpRoutes();
  }
  private setUpRoutes() {
    this.router.use(authenticateHandler);
    //EMPLOYEE ROLE
    this.router.get('/', StagesControllers.showAll);
    this.router.use(_employee_role);
    this.router.get('/lastVisited', StagesControllers.showLastVisited);
    this.router.post('/:id/visit', StagesControllers.createLastLastVisited);
    this.router.get('/details/:id', StagesControllers.details);
    this.router.get('/:id', StagesControllers.show);
    this.router.get('/basics/:id', StagesControllers.showBasics);
    this.router.get('/report/:id', StagesControllers.showReport);
    //MOD ROLE
    this.router.use(_mod_role);
    this.router.post('/', StagesControllers.create);
    this.router.post('/new/:id', addNewStage);
    this.router.post('/add-budget/:id', StagesControllers.addBudget);
    this.router.patch('/:id', StagesControllers.update);
    this.router.patch('/details/:id', StagesControllers.updateDetails);
    this.router.delete('/:id', StagesControllers.delete);
  }
}

const { router } = new StagesRoutes();
export default router;

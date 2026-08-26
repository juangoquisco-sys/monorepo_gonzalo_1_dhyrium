import { Router } from 'express';
import PhasesControllers from '@/controllers/phases.controllers';
import authenticateHandler from '@/middlewares/auth.middleware';

class PhasesRouter {
  public router = Router();

  constructor() {
    this.router = Router();
    this.setUpRoutes();
  }

  private setUpRoutes() {
    this.router.use(authenticateHandler);
    this.router.get('/', PhasesControllers.getAll);
    this.router.post('/', PhasesControllers.create);
    this.router.put('/:id', PhasesControllers.update);
    this.router.delete('/:id', PhasesControllers.remove);
  }
}
const { router } = new PhasesRouter();
export default router;

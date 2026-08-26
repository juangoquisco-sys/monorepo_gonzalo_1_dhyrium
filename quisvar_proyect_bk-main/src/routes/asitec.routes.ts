import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import AsitecControllers from '@/controllers/asitec.controller';
class AsitecRoutes {
  public router: Router;
  constructor() {
    this.router = Router();
    this.setUpRouter();
  }
  protected setUpRouter(): void {
    this.router.use(authenticateHandler);

    this.router.post('/:id', AsitecControllers.createDuty);
  }
}
const { router } = new AsitecRoutes();
export default router;

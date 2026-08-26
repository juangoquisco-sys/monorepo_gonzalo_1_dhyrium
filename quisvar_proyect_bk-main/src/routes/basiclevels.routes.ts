import { Router } from 'express';
import BasicLevelsController from '@/controllers/basiclevels.controller';
import authenticateHandler from '@/middlewares/auth.middleware';
const {
  create,
  update,
  upperOrLower,
  delete: deleteStage,
  findById,
  updateCover,
  updateDays,
  updateTypeItem,
} = BasicLevelsController;

class BasicLevelsRouter {
  public router: Router;
  constructor() {
    this.router = Router();
    this.setUpRoutes();
  }

  private setUpRoutes() {
    this.router.use(authenticateHandler);
    this.router.post('/', create);
    this.router.patch('/updates-covers', updateCover);
    this.router.patch('/updates-days', updateDays);
    this.router.get('/:id', findById);
    this.router.post('/:id', upperOrLower);
    this.router.put('/:id', update);
    this.router.patch('/:id', updateTypeItem);
    this.router.delete('/:id', deleteStage);
  }
}
const { router } = new BasicLevelsRouter();
export default router;

import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import OfficeControllers from '@/controllers/office.controllers';
const { showAll, create, remove, update } = OfficeControllers;
class PDFGenerateRouter {
  public router: Router;
  constructor() {
    this.router = Router();
    this.setUpRoutes();
  }

  private setUpRoutes() {
    this.router.use(authenticateHandler);
    this.router.get('/', showAll);
    this.router.post('/', create);
    this.router.put('/:id', update);
    this.router.delete('/:id', remove);
  }
}

const { router } = new PDFGenerateRouter();
export default router;

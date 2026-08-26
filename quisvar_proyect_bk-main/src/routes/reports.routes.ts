import { Router } from 'express';

import authenticateHandler from '@/middlewares/auth.middleware';
import { _employee_role, _admin_role } from '@/middlewares/role.middleware';
import ReportsControllers from '@/controllers/reports.controllers';

class ReportRouter {
  public router: Router;
  constructor() {
    this.router = Router();
    this.setUpRoutes();
  }

  private setUpRoutes() {
    this.router.use(authenticateHandler);
    // this.router.get('/user/:id', showListReportByUser);
    // this.router.get('/:id', showListReportByUser);
    //----------------------------------------------------------------------
    this.router.get('/:id', ReportsControllers.findById);
    this.router.get('/self/:userId', ReportsControllers.findByUser);
    this.router.post('/', ReportsControllers.create);
    this.router.put('/update-items/:id', ReportsControllers.updateItems);
    this.router.put('/authorized-items/:id', ReportsControllers.authorizedItem);
    this.router.put('/:id', ReportsControllers.removeItems);
    this.router.delete('/:id', ReportsControllers.remove);
  }
}
const { router } = new ReportRouter();
export default router;

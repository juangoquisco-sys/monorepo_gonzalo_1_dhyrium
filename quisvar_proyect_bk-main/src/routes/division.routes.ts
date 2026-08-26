import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import DivisionControllers from '@/controllers/division.controller';
class DivisionRoutes {
  public router: Router;
  constructor() {
    this.router = Router();
    this.setUpRouter();
  }
  protected setUpRouter(): void {
    this.router.use(authenticateHandler);
    this.router.get('/users', DivisionControllers.getDivisions);
    this.router.use(role.RoleHandler(['MOD'], 'asistencia'));
    this.router.post('/', DivisionControllers.create);
    this.router.get('/', DivisionControllers.getAll);
    this.router.patch('/:id', DivisionControllers.edit);
    this.router.delete('/:id', DivisionControllers.delete);
    /* --------------------------------- lEADER --------------------------------- */
    this.router.get('/:id/leader', DivisionControllers.getLeader);
    this.router.patch('/leader/:id/:leaderId', DivisionControllers.makeLeader);
    this.router.delete(
      '/leader/:id/:leaderId',
      DivisionControllers.deleteLeader
    );
    /* -------------------------------- RELATION -------------------------------- */
    this.router.patch(
      '/relation/:divisionId/:groupId',
      DivisionControllers.assingDivision
    );
    this.router.delete(
      '/relation/:divisionId/:groupId',
      DivisionControllers.deleteDivision
    );
    /* -------------------------------- PROJECTS -------------------------------- */
    this.router.get('/projects/:id', DivisionControllers.getProjects);
  }
}
const { router } = new DivisionRoutes();
export default router;

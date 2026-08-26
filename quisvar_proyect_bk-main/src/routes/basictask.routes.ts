import { Router } from 'express';
import BasicTaskControllers from '@/controllers/basictask.controllers';
import BasicTaskOnUserControllers from '@/controllers/basictaskOnUser.controllers';
import authenticateHandler from '@/middlewares/auth.middleware';
const {
  create,
  find,
  delete: deleteTask,
  update,
  upperOrLower,
  restore,
  findUserColabs,
  assignmentContext,
  sortTasks,
} = BasicTaskControllers;
const {
  addUser,
  removeUser,
  addMod,
  removeMod,
  addColabs,
  changeStatus,
  history,
} = BasicTaskOnUserControllers;
class BasicLevelsRouter {
  public router: Router;
  constructor() {
    this.router = Router();
    this.setUpRoutes();
  }

  private setUpRoutes() {
    this.router.use(authenticateHandler);
    this.router.get('/:id/assignment-context', assignmentContext);
    this.router.get('/:id', find);
    this.router.get('/report-user/:id', history);
    this.router.get('/groups-users/:id', findUserColabs);
    this.router.post('/', create);
    this.router.patch('/sorting-task', sortTasks);
    this.router.post('/add-user', addUser);
    this.router.post('/add-mod', addMod);
    this.router.post('/add-colabs/:id', addColabs);
    this.router.post('/:id', upperOrLower);
    this.router.put('/user-status', changeStatus);
    this.router.put('/:id', update);
    this.router.delete('/:id', deleteTask);
    this.router.delete('/restore/:id/', restore);
    this.router.delete('/remove-user/:id', removeUser);
    this.router.delete('/remove-mod/:id', removeMod);
  }
}
const { router } = new BasicLevelsRouter();
export default router;

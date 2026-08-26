import { Router } from 'express';
import SubtaskControllers from '@/controllers/subtasks.controllers';
import SubTaskOnUserControllers from '@/controllers/taskOnUsers.controllers';
import authenticateHandler from '@/middlewares/auth.middleware';

import {
  _employee_role,
  // _admin_role,
  _mod_role,
} from '@/middlewares/role.middleware';

class SubtaskRouter {
  public router: Router;
  constructor() {
    this.router = Router();
    this.setUpRoutes();
  }
  private setUpRoutes() {
    this.router.use(authenticateHandler);
    this.router.get('/lastVisited', SubtaskControllers.showLastVisited);
    this.router.post('/:id/visit', SubtaskControllers.createLastLastVisited);
    this.router.get(
      '/:id/assignment-context',
      SubtaskControllers.assignmentContext
    );

    this.router.get('/:id', SubtaskControllers.find);
    this.router.get('/report-mod/:id', SubtaskControllers.taskListByMod);
    this.router.get('/report-user/:id', SubtaskControllers.taskListByUser);
    this.router.post('/', SubtaskControllers.create);
    this.router.post('/:id', SubtaskControllers.upperOrLower);
    this.router.put('/:id', SubtaskControllers.update);
    this.router.patch('/sorting-task', SubtaskControllers.sortTasks);
    this.router.patch('/updates-days', SubtaskControllers.updateDays);
    this.router.patch('/updates-prices', SubtaskControllers.updatePrices);
    this.router.delete('/:id', SubtaskControllers.delete);
    this.router.delete('/restore/:id', SubtaskControllers.restore);
    //----------------- with user interaction --------------------------
    this.router.get('/groups-users/:id', SubtaskControllers.findUserColabs);
    this.router.post('/approved/:id', SubtaskControllers.approved);
    this.router.post('/add-user', SubTaskOnUserControllers.addUser);
    this.router.post('/change-user', SubTaskOnUserControllers.changeUser);
    this.router.post('/add-mod', SubTaskOnUserControllers.addMod);
    this.router.post('/add-colabs/:id', SubTaskOnUserControllers.addColabs);
    this.router.delete(
      '/remove-user/:userId',
      SubTaskOnUserControllers.removeUser
    );
    this.router.delete(
      '/remove-mod/:userId',
      SubTaskOnUserControllers.removeMod
    );
  }
}

const { router } = new SubtaskRouter();
export default router;

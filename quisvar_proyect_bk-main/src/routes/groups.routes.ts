import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import GroupsControllers, {
  createGroup,
  getAll,
  getById,
  updateGroup,
  deleteGroup,
  createRelation,
  updateRelation,
  deleteRelation,
  findProjects,
  getUserTask,
  editOrder,
  getGroupsSelect,
  // deleteMod,
} from '@/controllers/groups.controller';
import { _admin_role } from '@/middlewares/role.middleware';

class GroupRouter {
  public router: Router;
  constructor() {
    this.router = Router();
    this.setUpRoutes();
  }
  private setUpRoutes() {
    this.router.use(authenticateHandler);
    //Employ role
    this.router.get('/all', getAll);
    this.router.get('/select', getGroupsSelect);
    //Admin role
    this.router.use(_admin_role);
    this.router.post('/', createGroup);
    this.router.put('/order', editOrder);
    this.router.get('/:id', getById);
    this.router.get('/owner/:id', GroupsControllers.getOwner);
    this.router.get('/task/:id/:contractId', getUserTask);
    this.router.patch('/:id', updateGroup);
    // this.router.delete('/mod/:id', deleteMod);
    this.router.delete('/:id', deleteGroup);
    this.router.post('/relation/:userId/:groupId', createRelation);
    this.router.patch('/relation/:userId/:groupId', updateRelation);
    this.router.delete('/relation/:userId/:groupId', deleteRelation);
    this.router.get('/projects/:groupId', findProjects);
  }
}
const { router } = new GroupRouter();
export default router;

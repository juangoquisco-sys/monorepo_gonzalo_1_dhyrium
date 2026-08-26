import { Router } from 'express';
import OperationalTasksControllers from '@/controllers/operationaltask.controllers';
import authenticateHandler from '@/middlewares/auth.middleware';
import uploads from '@/middlewares/upload.middleware';
const {
  create,
  remove,
  update,
  createFile,
  createItem,
  removeItem,
  updateItem,
  getById,
  showItems,
  removeFile,
  getByUser,
  updateTaskPosition,
} = OperationalTasksControllers;

class OperationalTasksRoutes {
  constructor(public router = Router()) {
    this.setUpRoutes();
  }

  private setUpRoutes() {
    this.router.use(authenticateHandler);
    this.router.get('/:id', getById);
    this.router.get('/self/:userId', getByUser);
    this.router.get('/:taskId/items', showItems);
    this.router.post('/', create);
    this.router.post('/item', createItem);
    this.router.post('/files/:id', uploads.invoices.single('file'), createFile);
    this.router.put('/:id', update);
    this.router.put('/item/:id', updateItem);
    this.router.patch('/position', updateTaskPosition);
    this.router.delete('/:id', remove);
    this.router.delete('/item/:id', removeItem);
    this.router.delete('/files/:id', removeFile);
  }
}
const { router } = new OperationalTasksRoutes();
export default router;

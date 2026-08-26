import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import FolderVideosControllers from '@/controllers/folderVideos.controller';
class FolderVideosRoutes {
  public router: Router;
  constructor() {
    this.router = Router();
    this.setUpRouter();
  }
  protected setUpRouter(): void {
    this.router.use(authenticateHandler);

    this.router.get(
      '/',
      role.RoleHandler(['MOD', 'VIEWER'], 'tutorials'),
      FolderVideosControllers.getAll
    );
    this.router.use(role.RoleHandler(['MOD'], 'tutorials'));
    this.router.post('/', FolderVideosControllers.create);
    this.router.patch('/:id', FolderVideosControllers.edit);
    this.router.delete('/:id', FolderVideosControllers.delete);
  }
}
const { router } = new FolderVideosRoutes();
export default router;

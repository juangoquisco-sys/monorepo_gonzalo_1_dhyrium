import { Router } from 'express';
import DownloadController from '@/controllers/download.controller';
import authenticateHandler from '@/middlewares/auth.middleware';

const {
  firstRoute,
  redirect,
  mergePdfLevel,
  level,
  basicLevel,
  mergePdfBasicLevel,
  downloadBySubTask,
} = new DownloadController('level');
const {
  level: stage,
  basicLevel: basicStage,
  mergePdfLevel: mergeStage,
  mergePdfBasicLevel: mergeBasicStage,
} = new DownloadController('stage');

class BasicLevelsRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.setUpRoutes();
  }

  private setUpRoutes() {
    this.router.use(authenticateHandler);
    this.router.get('/first-route', firstRoute);
    this.router.get('/redirect/:uuid', redirect);

    this.router.get('/basic-level/:id', basicLevel);
    this.router.get('/basic-stage/:id', basicStage);
    this.router.get('/merge-basic-stage/:id', mergeBasicStage);
    this.router.get('/merge-basic-level/:id', mergePdfBasicLevel);

    this.router.get('/level/:id', level);
    this.router.get('/stage/:id', stage);
    this.router.get('/task/:id', downloadBySubTask);
    this.router.get('/merge-stage/:id', mergeStage);
    this.router.get('/merge-level/:id', mergePdfLevel);
  }
}

const { router } = new BasicLevelsRouter();
export default router;

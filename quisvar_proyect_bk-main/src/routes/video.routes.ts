import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import uploads from '@/middlewares/upload.middleware';
import VideoControllers from '@/controllers/video.controller';
import {
  validateTutorialMaterials,
  withTutorialUploadCleanup,
} from '@/middlewares/tutorialMaterials.middleware';
class VideoRoutes {
  public router: Router;
  constructor() {
    this.router = Router();
    this.setUpRouter();
  }
  protected setUpRouter(): void {
    this.router.use(authenticateHandler);

    this.router.get(
      '/:id',
      role.RoleHandler(['MOD', 'VIEWER'], 'tutorials'),
      VideoControllers.getByFolderId
    );
    this.router.get(
      '/info/:id',
      role.RoleHandler(['MOD', 'VIEWER'], 'tutorials'),
      VideoControllers.getVideo
    );
    this.router.use(role.RoleHandler(['MOD'], 'tutorials'));
    this.router.post(
      '/',
      withTutorialUploadCleanup(
        uploads.videoTutorials.fields([
          { name: 'url', maxCount: 1 },
          { name: 'miniature', maxCount: 1 },
          { name: 'docs', maxCount: 15 },
        ])
      ),
      validateTutorialMaterials(false),
      VideoControllers.create
    );
    this.router.patch('/:id', VideoControllers.edit);
    this.router.delete('/:id', VideoControllers.delete);
    /* ---------------------------------- Docs ---------------------------------- */
    this.router.post(
      '/doc/:id',
      withTutorialUploadCleanup(
        uploads.tutorialMaterials.fields([{ name: 'docs', maxCount: 15 }])
      ),
      validateTutorialMaterials(true),
      VideoControllers.addDocs
    );
    this.router.delete('/doc/:id', VideoControllers.deleteDoc);
    /* --------------------------------- Videos --------------------------------- */
    this.router.patch(
      '/url/:id',
      withTutorialUploadCleanup(
        uploads.videoTutorials.fields([
          { name: 'url', maxCount: 1 },
          { name: 'miniature', maxCount: 1 },
        ])
      ),
      VideoControllers.addVideo
    );
    this.router.delete('/url/:id', VideoControllers.deleteOnlyVideo);
  }
}
const { router } = new VideoRoutes();
export default router;

import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import {
  _employee_role,
  _admin_role,
  _mod_role,
} from '@/middlewares/role.middleware';
import FeedbackBasicControllers from '@/controllers/feedback-basic.controllers';
import FeedbackControllers from '@/controllers/feedbacks.controllers';
import uploads from '@/middlewares/upload.middleware';

class FeedbackRouter {
  public router: Router;
  constructor() {
    this.router = Router();
    this.setUpRoutes();
  }

  private setUpRoutes() {
    this.router.use(authenticateHandler);
    this.router.get('/task/:id', FeedbackControllers.getByTask);
    this.router.patch('/task/:id', FeedbackControllers.review);
    this.router.post(
      '/task/:id',
      uploads.taskFiles('REVIEW').array('files'),
      FeedbackControllers.create
    );

    this.router.get('/basic-task/:id', FeedbackBasicControllers.getByTask);
    this.router.patch('/basic-task/:id', FeedbackBasicControllers.review);
    this.router.post(
      '/basic-task/:id',
      uploads.basicFiles('REVIEW').array('files'),
      FeedbackBasicControllers.create
    );
    /* ----------------------------- UPDATE FEEDBACK ---------------------------- */
    this.router.patch('/feedback/:id', FeedbackControllers.editFeedback);
  }
}

const { router } = new FeedbackRouter();

export default router;

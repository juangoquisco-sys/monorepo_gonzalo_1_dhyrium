import { Router } from 'express';
import AuthController from '@/controllers/auth.controllers';
import authenticateHandler from '@/middlewares/auth.middleware';

class AuthRouter {
  public readonly router: Router;

  constructor() {
    this.router = Router();
    this.setUp();
  }

  public setUp() {
    const { login, recoverPassword, forgotPassword, newPassword } =
      AuthController;
    this.router.post('/login', login);
    this.router.post('/forgot-password', forgotPassword);
    this.router.post('/new-password', newPassword);
    this.router.use(authenticateHandler);
    this.router.post('/recovery', recoverPassword);
  }
}

const { router } = new AuthRouter();

export default router;

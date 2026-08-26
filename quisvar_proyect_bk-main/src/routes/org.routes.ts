import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import { _admin_role } from '@/middlewares/role.middleware';
import OrgControllers from '@/controllers/org.controllers';

class OrgRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
    this.setUpRoutes();
  }

  private setUpRoutes() {
    this.router.use(authenticateHandler);

    this.router.get('/tree', OrgControllers.getTree);
    this.router.get('/units/:id/members', OrgControllers.getMembers);
    this.router.get('/users/active', OrgControllers.getActiveUsers);
    this.router.get('/users/:legacyId/units', OrgControllers.getUserUnits);

    this.router.use(_admin_role);
    this.router.post('/units', OrgControllers.createUnit);
    this.router.patch('/units/:id', OrgControllers.updateUnit);
    this.router.delete('/units/:id', OrgControllers.deactivateUnit);
    this.router.patch('/units/:id/move', OrgControllers.moveUnit);
    this.router.post('/memberships', OrgControllers.createMembership);
    this.router.patch('/memberships/:id', OrgControllers.updateMembership);
    this.router.patch(
      '/memberships/:id/terminate',
      OrgControllers.terminateMembership
    );
    this.router.delete('/memberships/:id', OrgControllers.deleteMembership);
  }
}

const { router } = new OrgRoutes();
export default router;

import { Router } from 'express';
import PayrollsControllers from '@/controllers/payrolls.controllers';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import uploads from '@/middlewares/upload.middleware';

class PayrollsRoutes {
  public router: Router;
  constructor() {
    this.router = Router();
    this.setUpRouter();
  }
  private setUpRouter() {
    this.router.use(authenticateHandler);
    this.router.get('/', PayrollsControllers.getAll);
    this.router.get('/last-pad', PayrollsControllers.lastPad);
    this.router.get(
      '/monthly-bridge/candidates',
      PayrollsControllers.monthlyBridgeCandidates
    );
    this.router.post(
      '/monthly-bridge',
      PayrollsControllers.createMonthlyBridge
    );
    this.router.post(
      '/monthly-bridge/download-zip',
      PayrollsControllers.downloadMonthlyBridgeZip
    );
    this.router.get(
      '/monthly-bridge/tasks/:taskId/workspace-link',
      PayrollsControllers.monthlyBridgeTaskWorkspaceLink
    );
    this.router.use(
      '/self-submission',
      role.RoleHandler(['USER'], 'tramites', 'planilla')
    );
    this.router.get(
      '/self-submission/active-payroll',
      PayrollsControllers.selfSubmissionActivePayroll
    );
    this.router.get(
      '/self-submission/technical-tasks',
      PayrollsControllers.selfSubmissionTechnicalTasks
    );
    this.router.post(
      '/self-submission/technical',
      PayrollsControllers.createSelfSubmissionTechnical
    );
    this.router.get(
      '/self-submission/administrative-preview',
      PayrollsControllers.selfSubmissionAdministrativePreview
    );
    this.router.post(
      '/self-submission/administrative',
      PayrollsControllers.createSelfSubmissionAdministrative
    );
    this.router.get(
      '/self-submission/submissions',
      PayrollsControllers.selfSubmissionSubmissions
    );
    this.router.get(
      '/self-submission/history',
      PayrollsControllers.selfSubmissionHistory
    );
    this.router.get(
      '/self-submission/paymessages/:paymessageId/attachments',
      PayrollsControllers.selfSubmissionAttachments
    );
    this.router.post(
      '/self-submission/paymessages/:paymessageId/attachments',
      uploads.fileMail.fields([{ name: 'fileMail' }]),
      PayrollsControllers.uploadSelfSubmissionAttachments
    );
    this.router.delete(
      '/self-submission/paymessages/:paymessageId/attachments/:fileId',
      PayrollsControllers.deleteSelfSubmissionAttachment
    );
    this.router.delete(
      '/self-submission/reports/:reportId',
      PayrollsControllers.removeSelfSubmissionReport
    );
    this.router.get(
      '/:id/personnel-requests',
      PayrollsControllers.monthlyBridgePersonnelRequests
    );
    this.router.post(
      '/:payrollId/personnel-requests/administrative',
      PayrollsControllers.createPersonnelAdministrativeRequests
    );
    this.router.put(
      '/:payrollId/paymessages/send-to-elaboration',
      PayrollsControllers.sendPaymessagesToElaboration
    );
    this.router.put(
      '/:payrollId/paymessages/return-to-requests',
      PayrollsControllers.returnPaymessagesToRequests
    );
    this.router.patch(
      '/:payrollId/paymessages/:paymessageId/org-unit',
      PayrollsControllers.setPaymessageOrgUnit
    );
    this.router.get(
      '/:id/penalties/summary',
      PayrollsControllers.penaltySummary
    );
    this.router.get('/:id', PayrollsControllers.getById);
    this.router.post('/', PayrollsControllers.create);
    this.router.post(
      '/:payrollId/reconcile-liquidation',
      role.RoleHandler(['MOD'], 'tramites', 'planilla'),
      PayrollsControllers.reconcileLiquidation
    );
    this.router.post('/add-report/:id', PayrollsControllers.addReport);
    this.router.delete('/remove-report/:id', PayrollsControllers.removeItem);
    this.router.put(
      '/return-to-elaboration/:id',
      PayrollsControllers.returnToElaboration
    );
    this.router.put('/step-payment/', PayrollsControllers.paymentGroup);
    this.router.put(
      '/step-authorized-group/',
      PayrollsControllers.authorizedGroup
    );
    this.router.put(
      '/step-authorized-items/',
      PayrollsControllers.authorizedITems
    );
    this.router.put(
      '/step-authorized-items/:id',
      PayrollsControllers.authorizedITemById
    );
    this.router.patch('/:id', PayrollsControllers.update);
    this.router.patch('/change-status/:id', PayrollsControllers.changeStatus);
    this.router.delete('/:id', PayrollsControllers.remove);
  }
}
const { router } = new PayrollsRoutes();
export default router;

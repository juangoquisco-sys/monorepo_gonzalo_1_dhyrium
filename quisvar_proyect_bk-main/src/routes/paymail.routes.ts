import { Router } from 'express';
import { InitialRouter } from '@/types/patterns';
import authenticateHandler from '@/middlewares/auth.middleware';
import uploads from '@/middlewares/upload.middleware';
import PayMailControllers from '@/controllers/paymail.controllers';

const {
  showMessages,
  showMessage,
  archivedMessage,
  createMessage,
  createReplyMessage,
  createPaymentFiles,
  declineVoucher,
  createSeal,
  doneMessage,
  quantityFiles,
  updateMessage,
  showHoldingMessages,
  updateHoldingStage,
  archivedList,
  declineHoldingStage,
  updatePdfPayment,
  createRXHFile,
  removeRXHFile,
  updatePdfData,
} = PayMailControllers;

class PayMailRoutes implements InitialRouter {
  public router: Router;

  constructor() {
    // super();
    this.router = Router();
    this.setUpRouter();
  }

  private readonly optionMulter = [
    { name: 'mainProcedure', maxCount: 1 },
    { name: 'fileMail' },
  ];

  private readonly optionMulterPay = [{ name: 'fileMail' }];

  protected setUpRouter(): void {
    this.router.use(authenticateHandler);
    // this.router.use(role.employee);
    //EMPLOYEE ROLE
    // router.use(role.RoleHandler('USER', 'tramites', 'tramite-de-pago'));
    this.router.get('/', showMessages);
    this.router.get('/holding', showHoldingMessages);
    this.router.get('/:id', showMessage);
    this.router.get('/imbox/quantity', quantityFiles);
    this.router.post(
      '/',
      uploads.fileMail.fields(this.optionMulter),
      createMessage
    );
    this.router.put('/holding', updateHoldingStage);
    this.router.put('/decline/:id', declineHoldingStage);
    this.router.put(
      '/:id',
      uploads.fileMail.fields(this.optionMulter),
      updateMessage
    );
    this.router.post(
      '/payment-files/:id',
      uploads.fileVoucher.fields(this.optionMulterPay),
      createPaymentFiles
    );

    this.router.post(
      '/payment-rxh/:id',
      uploads.fileVoucher.single('rxh'),
      createRXHFile
    );
    this.router.delete('/payment-rxh/:id', removeRXHFile);
    this.router.patch('/payment-pdf/:id', updatePdfPayment);
    this.router.patch('/concept/:id', updatePdfData);
    //MOD ROLE
    // router.use(role.RoleHandler('MOD', 'tramites', 'tramite-de-pago'));
    this.router.patch('/archived/list', archivedList);
    this.router.patch('/archived/:id', archivedMessage);
    this.router.patch('/done/:id', doneMessage);
    this.router.delete('/voucher/:id', declineVoucher);
    this.router.post(
      '/reply',
      uploads.fileMail.fields(this.optionMulter),
      createReplyMessage
    );
    this.router.post(
      '/reply-seal',
      uploads.fileMail.fields([{ name: 'fileMail' }]),
      createSeal
    );
  }
}
const { router } = new PayMailRoutes();
export default router;

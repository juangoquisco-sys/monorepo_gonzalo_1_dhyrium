import { Router } from 'express';
import MailControllers from '@/controllers/mail.controllers';
import authenticateHandler from '@/middlewares/auth.middleware';

import uploads from '@/middlewares/upload.middleware';
import {
  verifyMailAccessByMessageId,
  verifyMailAccessByMessageIds,
  verifyMailAccessFromQuery,
  verifyMailBodyCategory,
  verifyStaticMailAccess,
} from '@/middlewares/mail.middleware';
const {
  showMessages,
  showMessage,
  archivedMessage,
  createMessage,
  createReplyMessage,
  createSeal,
  doneMessage,
  quantityFiles,
  updateMessage,
  showHoldingMessages,
  updateHoldingStage,
  declineHoldingStage,
  archivedList,
} = new MailControllers();
class MailRoutes {
  public router: Router;
  constructor() {
    this.router = Router();
    this.setUpRouter();
  }

  private readonly optionMulter = [
    { name: 'mainProcedure', maxCount: 1 },
    { name: 'fileMail' },
  ];

  protected setUpRouter(): void {
    this.router.use(authenticateHandler);
    this.router.get('/imbox/quantity', quantityFiles);
    this.router.get(
      '/',
      verifyMailAccessFromQuery(['USER', 'MOD']),
      showMessages
    );
    this.router.get(
      '/holding',
      verifyStaticMailAccess('DIRECT', ['USER', 'MOD']),
      showHoldingMessages
    );
    this.router.get(
      '/:id',
      verifyMailAccessByMessageId(['USER', 'MOD']),
      showMessage
    );
    this.router.post(
      '/',
      verifyMailAccessFromQuery(['USER', 'MOD']),
      uploads.fileMail.fields(this.optionMulter),
      verifyMailBodyCategory,
      createMessage
    );
    this.router.put(
      '/holding',
      verifyStaticMailAccess('DIRECT', ['USER', 'MOD']),
      updateHoldingStage
    );
    this.router.put(
      '/decline/:id',
      verifyMailAccessByMessageId(['USER', 'MOD']),
      declineHoldingStage
    );
    this.router.put(
      '/:id',
      verifyMailAccessByMessageId(['USER', 'MOD']),
      uploads.fileMail.fields(this.optionMulter),
      updateMessage
    );
    this.router.post(
      '/:id/reply',
      verifyMailAccessByMessageId(['USER', 'MOD']),
      uploads.fileMail.fields(this.optionMulter),
      createReplyMessage
    );
    this.router.post(
      '/reply-seal',
      verifyStaticMailAccess('DIRECT', ['USER', 'MOD']),
      uploads.fileMail.fields(this.optionMulter),
      createSeal
    );
    //MOD ROLE
    this.router.patch(
      '/archived/list',
      verifyMailAccessByMessageIds(['MOD']),
      archivedList
    );
    this.router.patch(
      '/archived/:id',
      verifyMailAccessByMessageId(['MOD']),
      archivedMessage
    );
    this.router.patch(
      '/done/:id',
      verifyMailAccessByMessageId(['MOD']),
      doneMessage
    );
  }
}
const { router } = new MailRoutes();

export default router;

import { Router } from 'express';
import PDFGenerateController from '@/controllers/pdfgenerate.controller';
import uploads from '@/middlewares/upload.middleware';
import authenticateHandler from '@/middlewares/auth.middleware';

const {
  pagesInPage,
  pagesInCover,
  pagesInSeal,
  pagesInSealMail,
  pageWithCoverV2,
} = new PDFGenerateController();
class PDFGenerateRouter {
  public router: Router;
  constructor() {
    this.router = Router();
    this.setUpRoutes();
  }

  private setUpRoutes() {
    this.router.use(authenticateHandler);
    this.router.use(uploads.blobFiles.single('file'));
    this.router.post('/two-pages', pagesInPage);
    this.router.post('/cover', pagesInCover);
    this.router.post('/coverV2', pageWithCoverV2);
    this.router.post('/seal-paymessage/:id', pagesInSeal);
    this.router.post('/seal-message/:id', pagesInSealMail);
  }
}

const { router } = new PDFGenerateRouter();
export default router;

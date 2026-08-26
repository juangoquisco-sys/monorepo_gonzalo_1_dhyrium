import { Router } from 'express';
// import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { setUpSwagger } from '@/docs/settings.swagger';

class Docs {
  public readonly router: Router;
  constructor() {
    this.router = Router();
    this.setUpRouter();
  }

  setUpRouter() {
    this.router.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.serveFiles(),
      swaggerUi.setup(setUpSwagger, {
        // explorer:true,
        customSiteTitle: 'DHIRYUM API ',
        swaggerOptions: {
          // defaultModelExpandDepth: -1,
          docExpansion: 'none',
          // operationsSorter: 'alpha',
          // defaultModelsExpandDepth: -1,
        },
      })
    );
  }
}

const { router } = new Docs();
export default router;

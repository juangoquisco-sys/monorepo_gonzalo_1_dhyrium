import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import ComeyaMenuController from './comeyaMenu.controller';

const router = Router();
router.use(authenticateHandler);
router.get('/catalog', ComeyaMenuController.catalog);
router.get('/restaurants/:restaurantKey/menu', ComeyaMenuController.listProducts);
router.post('/restaurants/:restaurantKey/menu', ComeyaMenuController.createProduct);
router.patch('/restaurants/:restaurantKey/menu/:productId', ComeyaMenuController.updateProduct);
router.delete('/restaurants/:restaurantKey/menu/:productId', ComeyaMenuController.deleteProduct);

export default router;

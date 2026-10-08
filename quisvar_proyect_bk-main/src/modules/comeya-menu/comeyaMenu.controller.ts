import type { Request, Response } from 'express';
import { createMenuProductSchema, menuProductParamsSchema, menuRestaurantParamsSchema, updateMenuProductSchema } from './comeyaMenu.schema';
import ComeyaMenuService from './comeyaMenu.service';

class ComeyaMenuController {
  static async catalog(_req: Request, res: Response) { res.status(200).json(await ComeyaMenuService.catalog()); }
  static async listProducts(req: Request, res: Response) { const input = menuRestaurantParamsSchema.parse({ params: req.params }); res.status(200).json(await ComeyaMenuService.listProducts(input.params.restaurantKey)); }
  static async createProduct(req: Request, res: Response) { const input = createMenuProductSchema.parse({ params: req.params, body: req.body }); res.status(201).json(await ComeyaMenuService.createProduct(input.params.restaurantKey, input.body)); }
  static async updateProduct(req: Request, res: Response) { const input = updateMenuProductSchema.parse({ params: req.params, body: req.body }); res.status(200).json(await ComeyaMenuService.updateProduct(input.params.restaurantKey, input.params.productId, input.body)); }
  static async deleteProduct(req: Request, res: Response) { const input = menuProductParamsSchema.parse({ params: req.params }); await ComeyaMenuService.deleteProduct(input.params.restaurantKey, input.params.productId); res.status(204).send(); }
}

export default ComeyaMenuController;

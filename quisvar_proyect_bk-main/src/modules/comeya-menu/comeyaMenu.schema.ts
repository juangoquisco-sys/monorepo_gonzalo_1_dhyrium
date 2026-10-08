import { z } from 'zod';

const restaurantKey = z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/);
const productId = z.string().trim().min(10).max(100);
const productBody = z.object({
  menuName: z.string().trim().min(2).max(80).optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  categoryId: z.string().trim().min(10).max(100),
  price: z.coerce.number().positive().max(10000),
  available: z.boolean().optional(),
}).strict();

export const menuRestaurantParamsSchema = z.object({ params: z.object({ restaurantKey }).strict() });
export const menuProductParamsSchema = z.object({ params: z.object({ restaurantKey, productId }).strict() });
export const createMenuProductSchema = z.object({ params: z.object({ restaurantKey }).strict(), body: productBody });
export const updateMenuProductSchema = z.object({ params: z.object({ restaurantKey, productId }).strict(), body: productBody.partial().refine(value => Object.keys(value).length > 0) });

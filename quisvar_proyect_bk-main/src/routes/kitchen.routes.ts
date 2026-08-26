import { Router } from 'express';
import authenticateHandler from '@/middlewares/auth.middleware';
import role from '@/middlewares/role.middleware';
import {
  allMealsOrderByDate,
  kitchenHistory,
  kitchenHistoryByUser,
  myMealsOrder,
  myMealsOrderMonth,
  orderMealPickupByUser,
  orderMealsBulk,
  orderMeals,
  orderMealsByUser,
  orderMealsDisabled,
} from '@/controllers/kitchen.controllers';

const router = Router();
router.use(authenticateHandler);

router.get(
  '/my-meal-order',
  role.RoleHandler(['MOD'], 'cocina', 'formulario'),
  myMealsOrder
);
router.get(
  '/my-meal-order/month',
  role.RoleHandler(['MOD'], 'cocina', 'formulario'),
  myMealsOrderMonth
);
router.get(
  '/all-meal-order-by-date',
  role.RoleHandler(['MOD'], 'cocina', 'lista'),
  allMealsOrderByDate
);
router.get(
  '/history',
  role.RoleHandler(['MOD'], 'cocina', 'historial'),
  kitchenHistory
);
router.get(
  '/history/user/:userId',
  role.RoleHandler(['MOD'], 'cocina', 'historial'),
  kitchenHistoryByUser
);
router.post(
  '/order-meal',
  role.RoleHandler(['MOD'], 'cocina', 'formulario'),
  orderMeals
);
router.post(
  '/order-meal/bulk',
  role.RoleHandler(['MOD'], 'cocina', 'formulario'),
  orderMealsBulk
);
router.post(
  '/order-meal/disabled',
  role.RoleHandler(['MOD'], 'cocina', 'lista'),
  orderMealsDisabled
);
router.post(
  '/order-meal/user/:userId',
  role.RoleHandler(['MOD'], 'cocina', 'lista'),
  orderMealsByUser
);
router.post(
  '/order-meal/pickup/user/:userId',
  role.RoleHandler(['MOD'], 'cocina', 'lista'),
  orderMealPickupByUser
);

export default router;

import { UserType } from '@/middlewares/auth.middleware';
import KitchenServices from '@/services/kitchen.services';
import { ControllerFunction } from '@/types/patterns';

export const myMealsOrder: ControllerFunction = async (req, res) => {
  const { date } = req.query;
  const userInfo: UserType = res.locals.userInfo;
  const query = await KitchenServices.myMealsOrder(
    userInfo.id,
    userInfo.userType,
    date as string
  );
  res.status(200).json(query);
};
export const myMealsOrderMonth: ControllerFunction = async (req, res) => {
  const { month } = req.query;
  const userInfo: UserType = res.locals.userInfo;
  const query = await KitchenServices.myMealsOrderMonth(
    userInfo.id,
    userInfo.userType,
    month as string
  );
  res.status(200).json(query);
};
export const allMealsOrderByDate: ControllerFunction = async (req, res) => {
  const { date } = req.query;
  const query = await KitchenServices.allMealsOrderByDate(date as string);
  res.status(200).json(query);
};
export const kitchenHistory: ControllerFunction = async (req, res) => {
  const { dateFrom, dateTo, mealType, userType, search, pickupStatus } =
    req.query;

  const query = await KitchenServices.kitchenHistory({
    dateFrom: dateFrom as string,
    dateTo: dateTo as string,
    mealType: mealType as string | undefined,
    userType: userType as UserType['userType'] | 'Todos' | undefined,
    search: search as string | undefined,
    pickupStatus:
      (pickupStatus as
        | 'Todos'
        | 'PICKED_UP'
        | 'NOT_PICKED_UP'
        | 'RESERVED'
        | 'PENDING_PICKUP'
        | 'NO_SERVICE'
        | 'MISSED_CLOSE'
        | 'OPEN') || 'Todos',
  });
  res.status(200).json(query);
};
export const kitchenHistoryByUser: ControllerFunction = async (req, res) => {
  const { dateFrom, dateTo, mealType } = req.query;

  const query = await KitchenServices.kitchenHistoryByUser(+req.params.userId, {
    dateFrom: dateFrom as string,
    dateTo: dateTo as string,
    mealType: mealType as string | undefined,
  });
  res.status(200).json(query);
};
export const orderMeals: ControllerFunction = async (req, res) => {
  const { body } = req;
  const userInfo: UserType = res.locals.userInfo;

  const query = await KitchenServices.orderMeal({
    ...body,
    userId: userInfo.id,
  });
  res.status(200).json(query);
};
export const orderMealsBulk: ControllerFunction = async (req, res) => {
  const { body } = req;
  const userInfo: UserType = res.locals.userInfo;

  const query = await KitchenServices.orderMealBulk({
    ...body,
    userId: userInfo.id,
  });
  res.status(200).json(query);
};
export const orderMealsDisabled: ControllerFunction = async (req, res) => {
  const { disabled, ...data } = req.body;
  const query = await KitchenServices.orderMealDisabled(disabled, data);
  res.status(200).json(query);
};
export const orderMealsByUser: ControllerFunction = async (req, res) => {
  const { body, params } = req;

  const query = await KitchenServices.orderMeal({
    ...body,
    userId: +params.userId,
  });
  res.status(200).json(query);
};

export const orderMealPickupByUser: ControllerFunction = async (req, res) => {
  const { body, params } = req;

  const query = await KitchenServices.orderMealPickup({
    ...body,
    userId: +params.userId,
  });
  res.status(200).json(query);
};

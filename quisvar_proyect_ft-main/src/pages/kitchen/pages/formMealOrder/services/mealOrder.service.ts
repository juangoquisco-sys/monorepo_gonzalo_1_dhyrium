import { axiosInstance } from '@/services/axiosInstance';
import type {
  BulkMealOrderPayload,
  BulkMealOrderResponse,
  Meal,
  MonthlyMealOrdersResponse,
} from '../interfaces/mealOrder.types';

export const getMyMealOrdersByDate = async (
  date: string,
  signal?: AbortSignal
): Promise<Meal[]> => {
  const res = await axiosInstance.get('/kitchen/my-meal-order', {
    params: {
      date,
    },
    headers: {
      noLoader: true,
    },
    signal,
  });

  return res.data;
};

export const getMyMealOrdersByMonth = async (
  month: string,
  signal?: AbortSignal
): Promise<MonthlyMealOrdersResponse> => {
  const res = await axiosInstance.get('/kitchen/my-meal-order/month', {
    params: {
      month,
    },
    headers: {
      noLoader: true,
    },
    signal,
  });

  return res.data;
};

export const saveBulkMealOrders = async (payload: BulkMealOrderPayload) => {
  const { data } = await axiosInstance.post<BulkMealOrderResponse>(
    '/kitchen/order-meal/bulk',
    payload,
    {
      headers: {
        noLoader: true,
      },
    }
  );

  return data;
};

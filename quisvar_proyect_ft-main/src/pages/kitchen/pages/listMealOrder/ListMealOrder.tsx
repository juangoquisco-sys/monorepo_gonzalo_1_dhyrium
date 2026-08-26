import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import './listMealOrder.css';
import { _date } from '@/utils/formatDate';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { axiosInstance } from '@/services/axiosInstance';
import type { Meal } from '../formMealOrder/interfaces/mealOrder.types';
import { isBeforeTodayFn } from '@/utils/dayjsSpanish';
import ListMealOrderHeader from './components/listMealOrderHeader/ListMealOrderHeader';
import TableListMealOrder from './components/tableListMealOrder/TableListMealOrder';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import LoaderOnly from '@/components/loaderOnly/LoaderOnly';
import TableNoData from '@/components/table/TableNoData';
import {
  ListMealOrderContext,
  type OrderFilters,
} from './ListMealOrderContext';

const today = _date(new Date());

const ListMealOrder = () => {
  const [date, setDate] = useState(today);
  const [filters, setFilters] = useState<OrderFilters>({
    orderStatus: 'Todos',
    pickupStatus: 'Todos',
  });
  const [searchText, setSearchText] = useState('');
  const [mealsOrder, setMealsOrder] = useState<Meal[] | null>(null);
  const [mealOrderSelected, setMealOrderSelected] = useState<Meal | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTogglingMealClose, setIsTogglingMealClose] = useState(false);
  const isBeforeToday = isBeforeTodayFn(date);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getOrderMealByDate(today);
  }, []);

  const onChangeFilter = ({ target }: ChangeEvent<HTMLSelectElement>) => {
    const { value, name } = target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectMeal = (meal: Meal) => {
    setMealOrderSelected(meal);
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const handleDate = (currentDate: string) => {
    getOrderMealByDate(currentDate);
    setDate(currentDate);
  };

  const getOrderMealByDate = async (currentDate: string) => {
    try {
      setIsLoading(true);
      const res = await axiosInstance.get<Meal[]>(
        `/kitchen/all-meal-order-by-date`,
        {
          params: {
            date: currentDate,
          },
          headers: {
            noLoader: true,
          },
        }
      );

      setMealsOrder(res.data);

      if (res.data.length === 0) {
        setMealOrderSelected(null);
        return;
      }

      if (mealOrderSelected) {
        setMealOrderSelected(
          res.data.find(meal => meal.id === mealOrderSelected.id) || res.data[0]
        );
        return;
      }

      setMealOrderSelected(res.data[0]);
    } catch (error) {
      setMealsOrder([]);
      setMealOrderSelected(null);
    } finally {
      setIsLoading(false);
    }
  };

  const onToggleMealClose = async () => {
    if (!mealOrderSelected || isBeforeToday) return;

    const shouldClose = !mealOrderSelected.order?.isClose;

    try {
      setIsTogglingMealClose(true);
      await axiosInstance.post(`/kitchen/order-meal/disabled`, {
        disabled: shouldClose,
        mealOrderId: mealOrderSelected.order?.id,
        mealId: mealOrderSelected.id,
        orderDate: date,
      });
      SnackbarUtilities.success(
        shouldClose ? 'Pedido cerrado correctamente' : 'Pedido reabierto'
      );
      await getOrderMealByDate(date);
    } finally {
      setIsTogglingMealClose(false);
    }
  };

  const hasMeals = (mealsOrder?.length || 0) > 0;
  const hasLoadedMeals = mealsOrder !== null;
  const showInitialLoading = isLoading && !hasLoadedMeals;

  return (
    <ListMealOrderContext.Provider
      value={{
        date,
        mealOrderSelected,
        onGetMeal: () => getOrderMealByDate(date),
        divRef,
        mealsOrder,
        handleDate,
        isBeforeToday,
        handleSelectMeal,
        onToggleMealClose,
        filters,
        onChangeFilter,
        searchText,
        handleSearchChange,
        isLoading,
        isTogglingMealClose,
      }}
    >
      <div
        className="listMealOrder"
        style={{
          cursor: isLoading ? 'progress' : 'default',
        }}
      >
        <ListMealOrderHeader />
        {showInitialLoading ? (
          <div className="listMealOrder-feedback">
            <LoaderForComponent width={90} />
          </div>
        ) : (
          <div
            className={`listMealOrder-resultsBody ${
              isLoading ? 'listMealOrder-resultsBody-loading' : ''
            }`}
          >
            <LoaderOnly position="absolute" left={2} top={1.5} />
            {hasMeals ? (
              <TableListMealOrder />
            ) : (
              <div className="listMealOrder-feedback">
                <TableNoData text="No hay pedidos registrados para esta fecha." />
              </div>
            )}
          </div>
        )}
      </div>
    </ListMealOrderContext.Provider>
  );
};

export default ListMealOrder;

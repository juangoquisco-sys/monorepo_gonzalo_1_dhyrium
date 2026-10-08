import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';

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
import LunchMenuProviderSummary from '../../lunch-menu/LunchMenuProviderSummary';
import LunchMenuModerationPanel from '../../lunch-menu/LunchMenuModerationPanel';
import { getLunchMenuModeration } from '../../lunch-menu/lunchMenu.service';
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
    lunchMenuOrder: 'Orden original',
  });
  const [activeView, setActiveView] = useState<'delivery' | 'menu'>('delivery');
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
  const isLunchSelected = mealOrderSelected?.type.toLowerCase() === 'almuerzo';
  const menuStateQuery = useQuery({
    queryKey: ['lunch-menu-moderation', date],
    queryFn: ({ signal }) => getLunchMenuModeration(date, signal),
    enabled: isLunchSelected,
    retry: false,
  });
  const viewDefaultKey = useRef<string | null>(null);
  const showInitialLoading = isLoading && !hasLoadedMeals;

  useEffect(() => {
    if (!mealOrderSelected) return;
    setFilters(previous => ({
      ...previous,
      orderStatus:
        mealOrderSelected.type.toLowerCase() === 'almuerzo' ? 'Si' : 'Todos',
      pickupStatus: 'Todos',
      lunchMenuOrder: 'Orden original',
    }));
  }, [mealOrderSelected?.id]);

  useEffect(() => {
    if (!isLunchSelected || menuStateQuery.isLoading) {
      if (!isLunchSelected) setActiveView('delivery');
      return;
    }

    const viewKey = `${date}-${mealOrderSelected?.id}`;
    if (viewDefaultKey.current === viewKey) return;

    viewDefaultKey.current = viewKey;
    setActiveView(menuStateQuery.data?.isOpen ? 'menu' : 'delivery');
  }, [date, isLunchSelected, mealOrderSelected?.id, menuStateQuery.data?.isOpen, menuStateQuery.isLoading]);

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
        activeView,
        setActiveView,
      }}
    >
      <div
        className="listMealOrder"
        style={{
          cursor: isLoading ? 'progress' : 'default',
        }}
      >
        <ListMealOrderHeader />
        <main className="listMealOrder-results">
          {isLunchSelected && (
            <nav className="listMealOrder-viewTabs" aria-label="Vistas de almuerzo">
              <button
                type="button"
                className={activeView === 'menu' ? 'listMealOrder-viewTab listMealOrder-viewTab--active' : 'listMealOrder-viewTab'}
                aria-current={activeView === 'menu' ? 'page' : undefined}
                onClick={() => setActiveView('menu')}
              >
                Selección de almuerzos
              </button>
              <button
                type="button"
                className={activeView === 'delivery' ? 'listMealOrder-viewTab listMealOrder-viewTab--active' : 'listMealOrder-viewTab'}
                aria-current={activeView === 'delivery' ? 'page' : undefined}
                onClick={() => setActiveView('delivery')}
              >
                Entrega y lista SI/NO
              </button>
            </nav>
          )}
          {isLunchSelected && activeView === 'menu' ? (
            <section className="listMealOrder-menuView" aria-label="Administración del menú de almuerzo">
              <LunchMenuProviderSummary date={date} />
              <LunchMenuModerationPanel date={date} />
            </section>
          ) : showInitialLoading ? (
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
        </main>
      </div>
    </ListMealOrderContext.Provider>
  );
};

export default ListMealOrder;

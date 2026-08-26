import { createContext, type ChangeEvent, type RefObject } from 'react';

import type { Meal } from '../formMealOrder/interfaces/mealOrder.types';

type OrderStatus = 'Todos' | 'Si' | 'No' | 'Sin respuesta';

type PickupStatusFilter =
  | 'Todos'
  | 'Recogió'
  | 'No recogió'
  | 'Reservado'
  | 'Pendiente retiro'
  | 'No servido'
  | 'Sin cierre'
  | 'Abierto'
  | 'No aplica';

export interface OrderFilters {
  orderStatus: OrderStatus;
  pickupStatus: PickupStatusFilter;
}

interface ListMealOrderContextProps {
  date: string;
  mealsOrder: Meal[] | null;
  mealOrderSelected: Meal | null;
  onGetMeal: () => void;
  divRef: RefObject<HTMLDivElement | null>;
  handleDate: (date: string) => void;
  isBeforeToday: boolean;
  handleSelectMeal: (meal: Meal) => void;
  onToggleMealClose: () => Promise<void>;
  filters: OrderFilters;
  onChangeFilter: (event: ChangeEvent<HTMLSelectElement>) => void;
  searchText: string;
  handleSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  isTogglingMealClose: boolean;
}

export const ListMealOrderContext = createContext(
  {} as ListMealOrderContextProps
);

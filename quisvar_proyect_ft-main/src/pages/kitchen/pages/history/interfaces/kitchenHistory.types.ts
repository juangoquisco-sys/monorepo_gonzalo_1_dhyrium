import { UserType } from '@/types/userType';
import {
  DeliveryStatus,
  MealPickupStatus,
} from '../../formMealOrder/interfaces/mealOrder.types';
import type { KitchenLicenseJustification } from '../../formMealOrder/interfaces/mealOrder.types';

export type HistoryMealTypeFilter = 'Todos' | 'Desayuno' | 'Almuerzo' | 'Cena';
export type HistoryUserTypeFilter =
  | 'Todos'
  | UserType.INTERINO
  | UserType.REGULAR;
export type HistoryPickupFilter =
  | 'Todos'
  | MealPickupStatus.PICKED_UP
  | MealPickupStatus.NOT_PICKED_UP
  | MealPickupStatus.RESERVED
  | DeliveryStatus.PENDING_PICKUP
  | DeliveryStatus.NO_SERVICE
  | DeliveryStatus.MISSED_CLOSE
  | DeliveryStatus.OPEN;

export interface HistoryFilters {
  dateFrom: Date | null;
  dateTo: Date | null;
  mealType: HistoryMealTypeFilter;
  userType: HistoryUserTypeFilter;
  pickupStatus: HistoryPickupFilter;
  search: string;
}

export interface KitchenHistoryTopOffender {
  userId: number;
  fullName: string;
  count: number;
}

export interface KitchenHistorySummary {
  totalOrders: number;
  totalIncumplimientos: number;
  totalNoService: number;
  totalMissedClose: number;
  totalOpenOrders: number;
  usersWithIncumplimientos: number;
  topOffender: KitchenHistoryTopOffender | null;
}

export interface KitchenHistoryRow {
  userId: number;
  fullName: string;
  dni: string;
  userType: UserType;
  requestedCount: number;
  pickedUpCount: number;
  notPickedUpCount: number;
  reservedCount: number;
  pendingPickupCount: number;
  noServiceCount: number;
  missedCloseCount: number;
  openOrderCount: number;
  notPickedUpRate: number;
  lastNotPickedUpAt: string | null;
}

export interface KitchenHistoryResponse {
  summary: KitchenHistorySummary;
  rows: KitchenHistoryRow[];
}

export interface KitchenHistoryUserDetailRecord {
  date: string;
  mealType: string;
  mealHour: string;
  amountOfFood: 'Poco' | 'Normal' | 'Harto';
  comment: string;
  mealStatus: boolean;
  pickupStatus: MealPickupStatus | null;
  deliveryStatus: DeliveryStatus;
  pickupUpdatedAt: string | null;
  licenseJustification?: KitchenLicenseJustification | null;
}

export interface KitchenHistoryUserDetailResponse {
  summary: Pick<
    KitchenHistoryRow,
    | 'requestedCount'
    | 'pickedUpCount'
    | 'notPickedUpCount'
    | 'reservedCount'
    | 'pendingPickupCount'
    | 'noServiceCount'
    | 'missedCloseCount'
    | 'openOrderCount'
    | 'notPickedUpRate'
  >;
  records: KitchenHistoryUserDetailRecord[];
}

export const HISTORY_MEAL_TYPES: HistoryMealTypeFilter[] = [
  'Todos',
  'Desayuno',
  'Almuerzo',
  'Cena',
];

export const HISTORY_USER_TYPES: HistoryUserTypeFilter[] = [
  'Todos',
  UserType.INTERINO,
  UserType.REGULAR,
];

export const HISTORY_PICKUP_FILTERS: HistoryPickupFilter[] = [
  'Todos',
  DeliveryStatus.PENDING_PICKUP,
  DeliveryStatus.NO_SERVICE,
  DeliveryStatus.MISSED_CLOSE,
  MealPickupStatus.NOT_PICKED_UP,
  MealPickupStatus.PICKED_UP,
  MealPickupStatus.RESERVED,
];

export const pickupStatusHistoryLabelMap: Record<
  Exclude<HistoryPickupFilter, 'Todos'>,
  string
> = {
  [MealPickupStatus.PICKED_UP]: 'Recogió',
  [MealPickupStatus.NOT_PICKED_UP]: 'No recogió',
  [MealPickupStatus.RESERVED]: 'Reservado',
  [DeliveryStatus.PENDING_PICKUP]: 'Pendiente retiro',
  [DeliveryStatus.NO_SERVICE]: 'No servido',
  [DeliveryStatus.MISSED_CLOSE]: 'Sin cierre',
  [DeliveryStatus.OPEN]: 'Abierto',
};

const deliveryStatusHistoryLabelMap: Record<DeliveryStatus, string> = {
  [DeliveryStatus.PICKED_UP]: 'Recogió',
  [DeliveryStatus.NOT_PICKED_UP]: 'No recogió',
  [DeliveryStatus.RESERVED]: 'Reservado',
  [DeliveryStatus.PENDING_PICKUP]: 'Pendiente retiro',
  [DeliveryStatus.NO_SERVICE]: 'No servido',
  [DeliveryStatus.MISSED_CLOSE]: 'Sin cierre',
  [DeliveryStatus.OPEN]: 'Abierto',
  [DeliveryStatus.NOT_APPLICABLE]: 'No aplica',
};

export const getDeliveryStatusHistoryLabel = (
  deliveryStatus: DeliveryStatus
) => {
  return deliveryStatusHistoryLabelMap[deliveryStatus];
};

export const getDeliveryStatusHistoryChipClass = (
  deliveryStatus: DeliveryStatus
) => {
  if (deliveryStatus === DeliveryStatus.PICKED_UP) {
    return 'kitchenHistory-chip--yes';
  }
  if (deliveryStatus === DeliveryStatus.NOT_PICKED_UP) {
    return 'kitchenHistory-chip--no';
  }
  if (deliveryStatus === DeliveryStatus.RESERVED) {
    return 'kitchenHistory-chip--reserved';
  }
  if (deliveryStatus === DeliveryStatus.NO_SERVICE) {
    return 'kitchenHistory-chip--noService';
  }
  if (deliveryStatus === DeliveryStatus.MISSED_CLOSE) {
    return 'kitchenHistory-chip--missedClose';
  }
  if (deliveryStatus === DeliveryStatus.OPEN) {
    return 'kitchenHistory-chip--open';
  }
  return 'kitchenHistory-chip--pending';
};

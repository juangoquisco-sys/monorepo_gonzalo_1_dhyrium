import {
  LicenseType,
  LicensesStatus,
  MealOrder,
  MealPickupStatus,
  UserType,
} from '@prisma/client';

export type DeliveryStatus =
  | 'PICKED_UP'
  | 'NOT_PICKED_UP'
  | 'RESERVED'
  | 'PENDING_PICKUP'
  | 'NO_SERVICE'
  | 'MISSED_CLOSE'
  | 'OPEN'
  | 'NOT_APPLICABLE';

export interface OrderMealBody {
  userId: number;
  mealOrderId?: number;
  mealId?: number;
  status: boolean;
  orderDate?: Date | string;
  comment?: string;
  amountOfFood?: 'Poco' | 'Normal' | 'Harto';
}

export interface BulkOrderMealItem {
  mealId: number;
  status: boolean;
  comment?: string;
  amountOfFood?: 'Poco' | 'Normal' | 'Harto';
}

export interface BulkOrderMealBody {
  userId: number;
  dates: Array<Date | string>;
  orders: BulkOrderMealItem[];
}

export interface MealPickupBody {
  userId: number;
  mealOrderId: number;
  pickupStatus: MealPickupStatus;
}

export interface KitchenLicenseJustification {
  id: number;
  type: LicenseType | null;
  reason: string | null;
  startDate: Date;
  untilDate: Date;
  status: LicensesStatus;
}

export interface KitchenHistoryFilters {
  dateFrom: Date | string;
  dateTo: Date | string;
  mealType?: string;
  userType?: UserType | 'Todos';
  search?: string;
  pickupStatus?:
    | MealPickupStatus
    | 'PENDING_PICKUP'
    | 'NO_SERVICE'
    | 'MISSED_CLOSE'
    | 'OPEN'
    | 'Todos';
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
  lastNotPickedUpAt: Date | null;
}

export interface KitchenHistoryResponse {
  summary: KitchenHistorySummary;
  rows: KitchenHistoryRow[];
}

export interface KitchenHistoryDetailRecord {
  date: Date;
  mealType: string;
  mealHour: string;
  amountOfFood: 'Poco' | 'Normal' | 'Harto';
  comment: string;
  mealStatus: boolean;
  pickupStatus: MealPickupStatus | null;
  deliveryStatus: DeliveryStatus;
  pickupUpdatedAt: Date | null;
  licenseJustification: KitchenLicenseJustification | null;
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
  records: KitchenHistoryDetailRecord[];
}

export type KitchenMonthlyMealVisualStatus =
  | 'yes'
  | 'no'
  | 'pending'
  | 'closed';

export interface KitchenMonthlyMealOrderUser {
  status: boolean;
  comment: string;
  amountOfFood: 'Poco' | 'Normal' | 'Harto';
  pickupStatus: MealPickupStatus | null;
  pickupUpdatedAt: Date | null;
}

export interface KitchenMonthlyMealOrder {
  id: number;
  mealId: number;
  type: string;
  orderTime: string;
  orderDate: Date;
  isClose: boolean;
  mealOrderOnUsers: KitchenMonthlyMealOrderUser[];
}

export interface KitchenMonthlyMeal {
  mealId: number;
  type: string;
  hour: string;
  order: KitchenMonthlyMealOrder | null;
  visualStatus: KitchenMonthlyMealVisualStatus;
  editable: boolean;
}

export interface KitchenMonthlyDay {
  date: string;
  isToday: boolean;
  isPast: boolean;
  meals: KitchenMonthlyMeal[];
}

export interface KitchenMonthlySummary {
  confirmed: number;
  declined: number;
  pending: number;
  closed: number;
}

export interface KitchenMonthlyResponse {
  month: string;
  summary: KitchenMonthlySummary;
  days: KitchenMonthlyDay[];
}

export type MealOrderBody = Omit<MealOrder, 'id' | 'createdAt' | 'isClose'>;

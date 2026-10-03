import { UserType } from '@/types/userType';
import type { Profile, UserProfile } from '@/types/types';

export interface Meal {
  hour: string;
  id: number;
  order?: Order;
  type: string;
}

export enum AmountOfFood {
  LITTLE = 'Poco',
  NORMAL = 'Normal',
  FED_UP = 'Harto',
}

export enum MealPickupStatus {
  PICKED_UP = 'PICKED_UP',
  NOT_PICKED_UP = 'NOT_PICKED_UP',
  RESERVED = 'RESERVED',
}

export enum DeliveryStatus {
  PICKED_UP = 'PICKED_UP',
  NOT_PICKED_UP = 'NOT_PICKED_UP',
  RESERVED = 'RESERVED',
  PENDING_PICKUP = 'PENDING_PICKUP',
  NO_SERVICE = 'NO_SERVICE',
  MISSED_CLOSE = 'MISSED_CLOSE',
  OPEN = 'OPEN',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export interface KitchenLicenseJustification {
  id: number;
  type: string | null;
  reason: string | null;
  startDate: string | Date;
  untilDate: string | Date;
  status: string;
}

export type StatusOrder = 'yes' | 'no' | null;

export interface MealDraft {
  status: StatusOrder;
  comment: string;
  amountOfFood: AmountOfFood;
}

export type MealDraftsByMealId = Record<number, MealDraft>;

export interface MealWithDraft {
  meal: Meal;
  draft: MealDraft;
  hasChanges: boolean;
  isLocked: boolean;
}

export interface BulkMealOrderItem {
  mealId: number;
  status: boolean;
  comment: string;
  amountOfFood: AmountOfFood;
}

export interface BulkMealOrderPayload {
  dates: string[];
  orders: BulkMealOrderItem[];
}

export interface BulkMealOrderResponse {
  processedDates: number;
  processedOrders: number;
  skippedClosedCount: number;
  skippedClosed: Array<{
    date: string;
    mealId: number;
    mealType: string;
  }>;
}

export interface Order {
  id: number;
  mealId: number;
  type: string;
  orderTime: string;
  orderDate: Date;
  createdAt?: Date;
  isClose: boolean;
  mealOrderOnUsers: MealOrderOnUser[];
  users?: UserMeal[];
}

export interface MealOrderOnUser {
  status: boolean;
  comment: string;
  amountOfFood: AmountOfFood;
  pickupStatus?: MealPickupStatus | null;
  pickupUpdatedAt?: Date | string | null;
}

export interface UserMeal extends UserProfile {
  userType: UserType;
  mealStatus?: boolean;
  profile: Profile;
  mealComment?: string;
  amountOfFood: AmountOfFood | null;
  pickupStatus: MealPickupStatus | null;
  deliveryStatus: DeliveryStatus;
  pickupUpdatedAt?: Date | string | null;
  licenseJustification?: KitchenLicenseJustification | null;
}

export type MonthlyMealVisualStatus = 'yes' | 'no' | 'pending' | 'closed';

export interface MonthlyMeal {
  mealId: number;
  type: string;
  hour: string;
  order: Order | null;
  visualStatus: MonthlyMealVisualStatus;
  editable: boolean;
}

export interface MonthlyDay {
  date: string;
  isToday: boolean;
  isPast: boolean;
  meals: MonthlyMeal[];
}

export interface MonthlyMealSummary {
  confirmed: number;
  declined: number;
  pending: number;
  closed: number;
}

export interface MonthlyMealOrdersResponse {
  month: string;
  summary: MonthlyMealSummary;
  days: MonthlyDay[];
}

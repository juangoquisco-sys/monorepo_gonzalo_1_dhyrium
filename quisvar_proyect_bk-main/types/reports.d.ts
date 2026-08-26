import { PayMessageStatus, Reports, ReportUserType } from '@prisma/client';
import { DateOptions, PaginationOptions } from '@/types/types';

/**
 * @interface ParametersByUser
 * @description - Interface for handling pagination options and additional parameters
 * for filtering reports by userId and date range.
 * @summary - all properties are optional
 * @author `Jean Ticona`
 */
export interface ParametersByUser extends PaginationOptions, DateOptions {
  type?: Reports['type'];
  withoutpayments?: boolean;
}
export interface CreateForm {
  userId: number;
  percentage: number;
  attendanceDiscount: number;
  licensesDiscount: number;
  type: ReportUserType;
  initialDate: Date;
  untilDate: Date;
  userId: Users['id'];
  officeId: Reports['officeId'];
  price: number;
  ids: { id: number; price: number; item: string }[];
}

export interface ReportsByOffices<T> {
  id: number | string;
  name: string | null;
  type?: string;
  source?: 'ORG_UNIT' | 'LEGACY_OFFICE';
  payMessages: T[];
  status?: boolean;
  statusGroup?: boolean;
}

export interface ReportsByIdParameters {
  officeId?: number | string;
  mods?: boolean;
  userinfo?: boolean;
  type?: ReportUserType;
  evidence?: 'technical' | 'administrative';
  isAuthorizedGrop?: boolean;
  paymentGroup?: boolean;
  paymessageStatus?: PayMessageStatus;
}

export interface UpdateItemsByReport {
  id: number;
  price: number;
  days: number;
  percentage: number;
  priceTask: number;
}

export interface UpdateReport {
  ids: UpdateItemsByReport[];
  total: number;
  subtotal: number;
  earlyPaymentDiscount?: number;
  isAuthorized?: boolean;
  percentagePayment: number;
  licensesDiscount: Reports['licensesDiscount'];
  attendanceDiscount: Reports['attendanceDiscount'];
  preserveRequestedAmount?: boolean;
}

export interface ReportSortByWeek<T> {
  id: number;
  initialDateWeek: Date;
  finalDateWeek: Date;
  days: T[];
}

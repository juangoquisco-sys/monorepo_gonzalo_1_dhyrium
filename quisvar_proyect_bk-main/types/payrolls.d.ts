import { Payrolls, Reports } from '@prisma/client';
import { DateOptions, PaginationOptions } from '@/types/types';

export interface PayrollOptionsQuantity {
  status?: Payrolls['status'];
  padStart?: number;
  startOfYear?: Date;
  endOfYear?: Date;
}

export interface AddReportsOnPayroll {
  ids: {
    id: Reports['id'];
    // senderId: number;
    // receiverId: number;
    // officeId: number;
    officeName: string;
    // historyOfficesIds: number[];
  }[];
}

export interface ParamPayrolls extends DateOptions, PaginationOptions {
  status?: boolean;
  isAuthorizedGrop?: boolean;
  paymentGroup?: boolean;
  paymentGroupFinished?: boolean;
}

export interface IPayrollWithPaymessage {
  id: number;
  paymentGroup?: string | null; //
  paymentGroupDate?: Date | null; //
  isAuthorized: boolean; //
  isAuthorizedGrop: boolean; //
  paymentId: number | null; //
  paymentColor: string; //
  office: {
    id: number | string;
    name: string;
    type?: string;
    source?: 'ORG_UNIT' | 'LEGACY_OFFICE';
    quantity?: number;
  } | null;
  legacyOffice?: {
    id: number | string;
    name: string | null;
  } | null;
  orgUnit?: {
    id: string;
    name: string;
    type: string;
    source: 'ORG_UNIT' | 'LEGACY_OFFICE';
  } | null;
  orgUnitOverride?: {
    id: string;
    name: string;
    type: string;
    source: 'ORG_UNIT' | 'LEGACY_OFFICE';
  } | null;
  beforeOffice: string | null;
  status: string;
  title: string;
  header: string;
  userInit: {
    user: {
      id: number;
      profile: {
        description: string | null;
        firstName: string;
        lastName: string;
        dni: string;
        degree: string;
      } | null;
    };
  };
  reports: Reports[];
}

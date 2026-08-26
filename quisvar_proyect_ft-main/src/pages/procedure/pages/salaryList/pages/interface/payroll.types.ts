import type { Degree, Profession } from '@/types/types';
import type { LiquidationScopeSnapshot } from '@/pages/myTasks/pages/recaudadorGrande/recaudadorGrande.types';

export interface PayrollResponse {
  id: number;
  name: string;
  pad: number;
  status: boolean;
  createdAt: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  subtotal: number;
  spending: number;
  total: number;
  offices: Office[];
}

export interface Office {
  id: number | string;
  name: string;
  type?: string;
  source?: 'ORG_UNIT' | 'LEGACY_OFFICE';
  payMessages: PayMessages[];
  status: boolean;
  statusGroup: boolean;
}

export interface PayMessages {
  id: number;
  isAuthorized: boolean;
  isAuthorizedGrop: boolean;
  paymentGroup: string | null;
  paymentGroupDate: string | null;
  paymentId: number | null;
  paymentColor: string;
  office: SimpleOffice;
  legacyOffice?: SimpleOffice | null;
  orgUnit?: OrgUnitPayroll | null;
  orgUnitOverride?: OrgUnitPayroll | null;
  beforeOffice: SimpleOffice | null;
  status: string;
  title: string;
  header: string;
  userInit: UserInit | null;
  reports: Report[];
  total: number;
}

export interface SimpleOffice {
  id: number;
  name: string;
}

export interface OrgUnitPayroll {
  id: string;
  name: string;
  type: string;
  source: 'ORG_UNIT';
}

export interface UserInit {
  user: User;
}

export interface User {
  id: number;
  ruc?: string | null;
  address?: string | null;
  payrollInfo?: {
    contractStartDate?: string | null;
    contractEndDate?: string | null;
    monthlySalary?: number | string | null;
    contractType?: string | null;
    status?: boolean;
  } | null;
  profile: UserProfile;
}

export interface UserProfile {
  id: number;
  degree: Degree;
  description: string;
  job: Profession;
  firstName: string;
  firstNameRef: string;
  lastNameRef: string;
  phoneRef: string;
  addressRef: string;
  lastName: string;
  dni: string;
  phone: string;
  userPc: string;
  userId: number;
  department: string;
  province: string;
  district: string;
  room: string;
  gender: string;
}

export interface Report {
  id: number;
  name: string;
  price: number;
  subprice: number;
  percentage: number;
  attendanceDiscount: number;
  licensesDiscount: number;
  earlyPaymentDiscount: number;
  initialDate: string;
  untilDate: string;
  type: string;
  userId: number;
  createdAt: string;
  payrollId: number;
  paymessageId: number;
  officeId: number;
  isAuthorized: boolean;
  isAuthorizedGrop: boolean;
  paymentGroup: string | null;
  paymentGroupDate: string | null;
  task?: { id: number }[];
  basictask?: { id: number }[];
  operationalTasks?: { id: number }[];
  amortizedAmount?: number;
  liquidationScopeSnapshot?: LiquidationScopeSnapshot | null;
}

export enum TypePayroll {
  UNAPPROVED = 'UNAPPROVED',
  APPROVED = 'APPROVED',
  UNPAID = 'UNPAID',
}

export type PayrollDetail = PayrollResponse;

import type { MailTypeProcedure } from '../models/types';

export interface Payroll {
  total: number;
  id: number;
  name: string;
  status: boolean;
  createdAt: Date;
  periodStart?: string | Date | null;
  periodEnd?: string | Date | null;
  pad: number;
  hasPaidPaymessages?: boolean;
}

export interface QueryProcedure {
  typeMail: MailTypeProcedure;
  status: string;
  typeMessage: string;
  office: number | null;
  onHolding: string;
}

export interface OutletProcedureContext {
  officeId: number | null;
}

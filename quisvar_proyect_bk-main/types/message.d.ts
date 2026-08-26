import { Mail, Messages } from '@prisma/client';
import { PaginationOptions } from '@/types/types';

export interface MailParams extends PaginationOptions {
  officeId?: Messages['officeId'];
  typeMessage?: Messages['type'];
  type?: Mail['type'];
  status?: Messages['status'];
  assignedAt?: 'asc' | 'desc';
  onHolding?: boolean;
  search?: string;
}

import { MessageHistory, Office, PayMessages, Users } from '@prisma/client';
import { PaginationOptions } from '@/types/types';

export interface PayMailParams extends PaginationOptions {
  type?: PayMail['type'];
  officeId?: PayMessages['officeId'];
  typeMessage?: PayMessages['type'];
  status?: PayMessages['status'];
  assignedAt?: 'asc' | 'desc';
  onHolding?: boolean;
  search?: string;
}

export interface PaymailFormCreate
  extends Pick<PayMessages, 'title' | 'header' | 'description' | 'type'> {
  senderId: Users['id'];
  officeId: Office['id'];
  secondaryReceiver: { userId: number }[];
  // reportId: number;
  reports: number[];
}
export type PaymailFilesReplyType = Pick<
  FilesMessage,
  'name' | 'path' | 'originalname'
>;

export interface PaymailFilesType extends PaymailFilesReplyType {
  attempt?: string;
}

export interface PaymailReplyForm
  extends Pick<MessageHistory, 'title' | 'header'> {
  senderId: Users['id'];
  officeId: PayMessages['officeId'];
  status?: PayMessages['status'];
  paymessageId: PayMessages['id'];
}

export interface SealType {
  title: string;
  header: string;
  officeId: number;
  paymessageId: number;
  observations?: string;
  title: string;
  numberPage?: number;
  to: string;
}

export interface PDFPaymentForm {
  paymentPdfData: string;
  ordenNumber: number;
  companyId: number;
}

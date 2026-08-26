import type {
  Degree,
  MessageSender,
  MessageStatus,
  MessageTypeImbox,
  Office,
  Profession,
  UserProfile,
} from '@/types/types';
import type { Report } from '../../listPersonalReports/interface/report.types';

export type MailTypeProcedure =
  | 'RECEIVER'
  | 'SENDER'
  | 'ARCHIVER'
  | 'RECEPTION';
export type MailTypeProcedureSpanish =
  | 'RECIBIDOS'
  | 'ENVIADOS'
  | 'ARCHIVADOS'
  | 'MESA DE PARTES';
export interface OptionsMailHeader {
  id: number;
  iconOn: string;
  iconOff: string;
  text: MailTypeProcedureSpanish;
  isActive: boolean;
  funcion: () => void;
}
export interface ToData {
  name: string;
  degree: Degree;
  position: string;
  job: Profession;
}

export type TypeProcedure =
  | 'comunication'
  | 'regularProcedure'
  | 'payProcedure';

export interface OfficeSelect {
  value: string;
  label: string;
  manager: UserProfile;
  quantity: number;
  id: number;
  isDisabled?: boolean;
}

export interface userSelect extends UserProfile {
  value: string;
  label: string;
  isDisabled?: boolean;
}
export type Contact = OfficeSelect | userSelect;

export interface Reception {
  id: number;
  header: string;
  status: MessageStatus;
  office: Office;
  type: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  onHolding: boolean;
  onHoldingDate: Date;
  users: UserElement[];
}

export interface UserElement {
  type: string;
  role: string;
  status: boolean;
  userInit: boolean;
  user: UserProfile;
}

export interface MessageFunction {
  typeMail?: MessageSender;
  statusMsg?: MessageStatus | null;
  typeMsg?: MessageTypeImbox | null;
  officeMsg?: string | null;
  skip?: number;
  holdingReception?: 'yes' | 'no' | null;
}

export interface ReceptionMailNumeration {
  mailList: Reception[];
  total: number;
}

export interface MessageSendType {
  title: string;
  header: string;
  description?: string;
  receiver?: Contact;
  secondaryReceiver?: Contact[];
  signature: boolean;
  type: MessageTypeImbox;
  numberDocument: number;
  reports?: Report[];
}

export interface Procedure extends MessageSendType {
  officeId?: number;
  receiverId?: number;
  secondaryReceiver?: {
    userId: number;
  }[];
  reports: number[];
}

export interface ProcedureSubmit {
  values: Procedure;
  fileUploadFiles: File[];
  mainFile: blob;
}

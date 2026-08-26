import type { OptionSelect } from '@/types/option.types';
import type { TypeStatus } from '../../myTasks/pages/listPersonalTask/interface/listPersonalTask.types';
import type { LiquidationScopeSnapshot } from '../../myTasks/pages/recaudadorGrande/recaudadorGrande.types';

export interface ReportResponse {
  id: number;
  name: string;
  price: number;
  percentage: number;
  initialDate: Date;
  untilDate: Date;
  type: string;
  userId: number;
  createdAt: Date;
}

export type Report = ReportResponse & Omit<OptionSelect, 'id'>;

export interface Reporting {
  id: number;
  name: string;
  price: number;
  totalHours: number;
  subprice: number;
  percentage: number;
  attendanceDiscount: number;
  licensesDiscount: number;
  earlyPaymentDiscount: number;
  initialDate: string;
  untilDate: string;
  type: TypeStatus;
  userId: number;
  createdAt: string;
  payrollId: null;
  data: ReportingProject[] | TechnicalEvidenceProject[] | TaskKanban[];
  parcialPrice: number;
  balance: number;
  totalDiscount: number;
  priceWithDiscount: number;
  amortizedAmount?: number;
  liquidationScopeSnapshot?: LiquidationScopeSnapshot | null;
}

export interface TaskItems {
  id: number;
  order: number;
  name: string;
  createdAt: string;
  description: string;
  status: 'UNRESOLVED' | 'RESOLVED';
  projectName: string | null;
}

export interface DayKanban {
  id: number;
  date: string;
  _id: number;
  title: string;
  isActive: boolean;
  tasks: TaskItems[];
}

export interface TaskKanban {
  id: number;
  initialDateWeek: string;
  finalDateWeek: string;
  days: DayKanban[];
}
export interface ReportingProject {
  id: number;
  name: string;
  projectId: number;
  budget: number;
  cui: string;
  levels: LevelProject[];
  tasks: ReportingTask[];
}

interface LevelProject {
  id: number;
  item: string;
  parentLevels: string[];
  stageId: number;
  tasks: ReportingTask[];
}
export interface ReportingTask {
  id: number;
  stagePrice: number;
  taskId: number;
  projectId: number;
  stageId: number;
  subtaskId: null;
  status: boolean;
  statusPayment: boolean;
  userId: number;
  groupId: string;
  percentage: number;
  percentagePayment: number;
  reportId: number;
  assignedAt: string;
  finishedAt: string;
  item: string;
  price: number;
  updatedAt: string;
  taskInfo: TaskInfo;
  projectName?: string;
  parentLevels?: string[];
  isAuthorized: boolean;
}

export type TechnicalEvidenceTask = Omit<ReportingTask, 'status'> & {
  name?: string;
  status?: string;
  item?: string;
  subTaskOnUserId?: number;
};

export type TechnicalEvidenceLevel = Omit<LevelProject, 'tasks'> & {
  name?: string;
  tasks: TechnicalEvidenceTask[];
};

export type TechnicalEvidenceProject = Omit<
  ReportingProject,
  'levels' | 'tasks'
> & {
  levels: TechnicalEvidenceLevel[];
  tasks: TechnicalEvidenceTask[];
};

export type TechnicalEvidenceReporting = Omit<Reporting, 'data'> & {
  data: TechnicalEvidenceProject[];
};

export interface TaskInfo {
  name: string;
  price: number;
  status: string;
  days: number;
  initialCost: number;
  initialCostPerMonth: number;
  coordinator: {
    firstName: string;
    lastName: string;
    dni: string;
    description: string | null;
    degree: string;
  };
}

export interface FooterData {
  licensesDiscount: number | string;
  attendanceDiscount: number | string;
  percentagePayment: number | string;
  totalPartialPrice: number | string;
  earlyPaymentDiscount: number | string;
}
// export interface ReportingTask {
//   id: number;
//   taskId: number;
//   subtaskId: null;
//   status: boolean;
//   statusPayment: boolean;
//   userId: number;
//   groupId: null;
//   percentage: number;
//   percentagePayment: number;
//   reportId: number;
//   assignedAt: Date;
//   finishedAt: Date;
//   item: string;
//   price: number;
//   updatedAt: Date;
// }

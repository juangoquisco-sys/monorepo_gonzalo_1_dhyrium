import {
  Contratc,
  Files,
  FilesMessage,
  Levels,
  PayMail,
  MessageHistory,
  Messages,
  Stages,
  SubTasks,
  Supervisor,
  Users,
  PayMessages,
  Mail,
  BasicLevels,
  BasicTasks,
  BasicFiles,
  Office,
  SubMenuPoints,
  MenuPoints,
  Companies,
} from '@prisma/client';
import { NextFunction, Request, Response } from 'express';

export type CheckRoleType = (
  req: Request,
  res: Response,
  next: NextFunction
) => void;
export type TypeFileUser = keyof Pick<
  User,
  'contract' | 'cv' | 'declaration' | 'withdrawalDeclaration'
>;

export type PickSubtask = Pick<
  SubTasks,
  'id' | 'name' | 'item' | 'description' | 'price' | 'status'
> & { users: User[] };
export type PickCompanyInvoice = Pick<
  Companies,
  'id' | 'color' | 'phone' | 'email'
>;

export type StageParse = {
  name: string;
  id: number;
} | null;

export type User = {
  percentage: number;
  user: {
    id: number;
    profile: {
      firstName: string;
      lastName: string;
      dni: string;
      phone: string | null;
    } | null;
  };
};
export type CatchAsync = <T>(
  handler: Function
) => (...args: T[]) => Promise<void>;

export type TypeTables =
  | 'indexTasks'
  | 'workAreas'
  | 'tasks'
  | 'task_lvl_2'
  | 'task_lvl_3'
  | 'task_lvl_4'
  | 'task_lvl_5'
  | 'task_lvl_6'
  | 'task_lvl_7'
  | 'task_lvl_8'
  | 'task_lvl_9'
  | 'task_lvl_10';

export type ProjectDir = 'MODEL' | 'REVIEW' | 'UPLOADS';
export interface Level {
  id: number;
  item: string;
  name: string;
  rootId: number;
  spending: number;
  balance: number;
  percentage: number;
  total: number;
  isProject: boolean;
  isInclude: boolean;
  isArea: boolean;
  price: number;
  level: number;
  listUsers: usersCount[];
  rootLevel: number;
  stagesId: number;
  userId: null;
  days: number;

  // details: Details;
  nextLevel?: Level[];
}
export interface LevelBasic extends BasicLevels {
  item: string;
  spending: number;
  balance: number;
  percentage: number;
  total: number;
  price: number;
  days: number;
  listUsers: usersCount[];
  nextLevel?: LevelBasic[];
  subTasks?: unknown[];
}
export interface LevelInfoDetails {
  spending: number;
  balance: number;
  percentage: number;
  total: number;
  price: number;
  days: number;
}
export interface GetBasicLevelStage
  extends GetFilterBasicLevels,
    LevelInfoDetails {
  item: string;
  listUsers: usersCount[];
  nextLevel?: GetBasicLevelStage[];
}

export interface Details {
  UNRESOLVED: number;
  PROCESS: number;
  INREVIEW: number;
  DENIED: number;
  LIQUIDATION: number;
  DONE: number;
  TOTAL: number;
}

export type SupervisorPick = Pick<Supervisor, 'type'> & { userId: Users['id'] };
export type updateReports = Pick<Reports, 'status' | 'stage'> & {
  supervisorId: Supervisor['id'];
  comments: string;
};

export type ReportByUserPick = {
  userId: Users['id'];
  name: string;
  supervisorId: number;
};

export interface DuplicateLevel {
  name: string;
  id: number;
  stagesId: number;
  type: 'ROOT' | 'ID';
}

export interface GetFilterLevels extends Levels {
  subTasks?: SubTaskFilter[];
}
export interface GetFilterBasicLevels extends BasicLevels {
  subTasks?: BasicTaskFilter[];
}
export interface GetFolderBasicLevels extends BasicLevels {
  subTasks: BasicTaskFolder[];
}
export interface GetFolderLevels extends BasicLevels {
  subTasks: TaskFolder[];
}

export interface BasicTaskFolder extends BasicTasks {
  files: BasicFiles[];
  feedBacks?: { files: BasicFiles[] }[];
}

export interface TaskFolder extends SubTasks {
  files: Files[];
  feedBacks?: { files: Files[] }[];
}

export interface GetListBasicsByStage extends BasicLevels {
  spending: number;
  balance: number;
  price: number;
  days: number;
  percentage: number;
  item: string;
  total: number;
  subTasks: BasicTasks[];
  listUsers: usersCount[];
  // nextLevel?: GetListBasicsByStage[];
}

export interface FolderLevels {
  id: number;
  index: number;
  name: string;
}
export interface MergeLevels {
  id: number;
  name: string;
  cover: boolean;
}

export interface BasicFilesForm {
  dir: string;
  type: BasicFiles['type'];
  originalname?: string;
  subTasksId: number;
  name: string;
  author: string | null;
  // userId: number | null;
}

export type TypeIdsList = number | TypeIdsList[];
export interface GetDuplicateLevels extends Levels {
  subTasks?: SubTaskFiles[];
  next?: GetDuplicateLevels[];
}
export interface GetDuplicateBasicLevels extends BasicLevels {
  subTasks?: BasicTaskFiles[];
  next?: GetDuplicateBasicLevels[];
}

export interface GeneratePathAtributtes {
  rootId: number;
  rootLevel: number;
  item: string;
  path: string;
}

// id: number;
//     status: $Enums.TaskRole;
//     name: string;
//     index: number;
//     typeItem: $Enums.TypeItem;
//     days: number;
//     price: number;
//     createdAt: Date;
//     updatedAt: Date;
//     levels_Id: number;
export interface SubTaskFilter extends Omit<SubTasks, 'item' | 'description'> {
  users: {
    percentage: number;
    userId: number;
    statusPayment: boolean;
    user?: {
      id: number;
      profile: {
        firstName: string;
        lastName: string;
        dni: string;
        phone: string | null;
        degree: string | null;
        description: string | null;
      } | null;
    };
  }[];
}

export interface BasicTaskFilter extends BasicTasks {
  users: {
    percentage: number;
    userId: number;
    statusPayment: boolean;
    user?: {
      id: number;
      profile: {
        firstName: string;
        lastName: string;
        dni: string;
        phone: string | null;
        degree: string | null;
        description: string | null;
      } | null;
    };
  }[];
}
export interface SubTaskFiles extends SubTasks {
  files: Files[];
}
export interface BasicTaskFiles extends BasicTasks {
  files: BasicFiles[];
}
export type FilesProps = { [fieldname: string]: Express.Multer.File[] };

export interface ParametersReportUser {
  offset?: number;
  limit?: number;
  page?: number;
  projectId?: number;
  stageId?: number;
  untilDate?: Date | string;
  initialDate?: Date | string;
  status?: BasicTasks['status'];
  phaseId?: number;
  salaryAdvance?: boolean;
}

export interface ParametersPayMail {
  offset?: number;
  limit?: number;
  page?: number;
  type?: PayMail['type'];
  officeId?: PayMessages['officeId'];
  // status?: boolean;
  typeMessage?: PayMessages['type'];
  status?: PayMessages['status'];
  assignedAt?: 'asc' | 'desc';
  onHolding?: boolean;
  search?: string;
}
export interface ParametersMail {
  offset?: number;
  limit?: number;
  page?: number;
  type?: Mail['type'];
  officeId?: Messages['officeId'];
  typeMessage?: Messages['type'];
  status?: Messages['status'];
  assignedAt?: 'asc' | 'desc';
  onHolding?: boolean;
}
export interface PickMail extends Messages {
  senderId: Users['id'];
  receiverId: Users['id'];
  officeId: Office['id'];
  idMessageReply?: number;
  idMessageResend?: number;
  secondaryReceiver: { userId: number }[];
}
export interface PickPayMail extends PayMessages {
  senderId: Users['id'];
  receiverId: Users['id'];
  officeId: Office['id'];
  idMessageReply?: number;
  idMessageResend?: number;
  secondaryReceiver: { userId: number }[];
  // reportId: number;
  reports: number[];
}

export interface ReceiverTypePick {
  userId: number;
  role: PayMail['role'];
  status: PayMail['status'];
}
export interface ReceiverTypeMailPick {
  userId: number;
  role: Mail['role'];
  status: Mail['status'];
}
export interface PickMessageReply extends MessageHistory {
  // type?: Mail['type'];
  senderId: Users['id'];
  officeId?: Messages['officeId'];
  receiverId: Users['id'];
  status?: Messages['status'];
  messageId: Messages['id'];
}
export interface PickPayMessageReply extends MessageHistory {
  // type?: Mail['type'];
  senderId: Users['id'];
  officeId: PayMessages['officeId'];
  receiverId: Users['id'];
  status?: PayMessages['status'];
  paymessageId: PayMessages['id'];
}

export interface PickSealPayMessage {
  title: string;
  header: string;
  officeId: number;
  paymessageId: number;
  observations?: string;
  title: string;
  numberPage?: number;
  to: string;
}
export interface PickSealMessage {
  title: string;
  header: string;
  officeId: number;
  messageId: number;
  observations?: string;
  title: string;
  numberPage?: number;
  to: string;
}
export type FileMessagePick = Pick<
  FilesMessage,
  'name' | 'path' | 'originalname'
> & {
  attempt?: string;
};

export interface SealInterface {
  numberPage: number;
  pos: number;
  to: string;
  observation?: string;
  title: string;
}
export interface VerifyTokenT {
  id: number;
}
export type UpdateLevelBlock = Levels & {
  subTasks: {
    id: number;
    item: string;
    typeItem: SubTasks['typeItem'];
    index: number;
    files: {
      id: number;
      dir: string | null;
      name: string;
      type: Files['type'];
    }[];
  }[];
};

export interface usersCount {
  userId: number;
  firstName?: string;
  lastName?: string;
  count: number;
  dni?: string;
  degree?: string | null;
  percentage: number;
}

export type ContractForm = Pick<
  Contratc,
  | 'projectName'
  | 'type'
  | 'name'
  | 'cui'
  | 'amount'
  | 'createdAt'
  | 'indexContract'
  | 'department'
  | 'province'
  | 'district'
  | 'difficulty'
  | 'projectShortName'
  | 'companyId'
  | 'consortiumId'
  | 'municipality'
>;

export type TypeCost = 'bachelor' | 'professional' | 'intern' | 'graduate';
export interface ListCostType {
  cost?: number;
  bachelor: number;
  professional: number;
  intern: number;
  graduate: number;
}

export type StageUpdate = Pick<
  Stages,
  | 'bachelorCost'
  | 'professionalCost'
  | 'groupId'
  | 'graduateCost'
  | 'internCost'
  | 'budget'
> & {
  unitId?: string | null;
};
export type ObjectNumber = { [key: string]: number };
export type ObjectAny = {
  [key: string]: number | string;
};
export type DegreeTypes =
  | 'Titulado'
  | 'Magister'
  | 'Doctorado'
  | 'Egresado'
  | 'Bachiller'
  | 'Practicante';
export interface DegreeList {
  degree: TypeCost;
  values: { id: number; value: DegreeTypes }[];
}

export type CategoryMailType = 'GLOBAL' | 'DIRECT';

export type ReceiverT = Pick<Mail, 'type' | 'role' | 'status'>;
export type ReceiverT2 = Pick<Mail, 'role' | 'status'>;

export interface MergePDFBasicFiles {
  status?: BasicTasks['status'];
  typeFile?: 'all' | 'pdf' | 'no_pdf';
}

export interface FolderBasicLevelList {
  id: number;
  index: number;
  path: string;
  subtasks: {
    id: number;
    index: number;
    name: string;
    path: string;
    files: { id: number; oldPath: string; newPath: string }[];
  }[];
  next: FolderBasicLevelList[];
}

export interface configurationSealPDF {
  x: number;
  y: number;
  title?: string;
  numberPage: number;
  to: string;
  date: string;
  observation?: string;
}

export interface ProfileByRoleType {
  subMenuId?: number;
  typeRol?: MenuPoints['typeRol'];
  subTypeRol?: SubMenuPoints['typeRol'];
  menuId?: number;
  includeSelf: boolean;
}
export interface OptionsTaskFilters {
  status?: SubTasks['status'];
  equal?: boolean;
  type?: SubTasks['type'];
  includeFiles?: boolean;
  reviewFiles?: boolean;
  includeUsers?: boolean;
  endsWith?: string;
}

export interface OptionsMergePdfs {
  createFiles?: boolean;
  createCover?: boolean;
}

export interface OptionsBasicFilters {
  status?: BasicTasks['status'];
  equal?: boolean;
  type?: BasicFiles['type'];
  includeFiles?: boolean;
  reviewFiles?: boolean;
  includeUsers?: boolean;
  endsWith?: string;
}
export interface LevelAttributes extends OptionsTaskFilters {
  sourceDir: string;
  itemLevel?: string;
  createFiles?: boolean;
}

export interface BasicLevelAttributes extends OptionsBasicFilters {
  sourceDir: string;
  itemLevel?: string;
  createFiles?: boolean;
}
export interface MergePdfLevelAttributes
  extends OptionsTaskFilters,
    OptionsMergePdfs {
  sourceDir: string;
  itemLevel?: string;
}
export interface MergePdfBasicLevelAttributes
  extends OptionsBasicFilters,
    OptionsMergePdfs {
  sourceDir: string;
  itemLevel?: string;
}

export interface percentageTaskFilter extends BasicTaskFilter {
  percentage: number;
  spending: number;
  balance: number;
  price: number;
  listUsers: usersCount[];
}

export interface ReportForm {
  userId: number;
  percentage: number;
  type: ReportUserType;
  initialDate: Date;
  untilDate: Date;
  userId: Users['id'];
  price: number;
  ids: number[];
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  page?: number;
}
export interface DateOptions<K = Date> {
  initialDate: Date | K;
  untilDate: Date | K;
}

export interface WeekDaysType {
  id: number;
  _id: number;
  date: Date;
  title: string;
  isActive: boolean;
}

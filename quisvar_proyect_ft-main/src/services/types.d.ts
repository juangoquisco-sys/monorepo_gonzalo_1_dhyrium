import type { TaskRes } from '@/pages/kanbanTask/types/types.response';
import { MyTask } from '@/pages/myTasks/interfaces/myTasks.types';
import { pdf } from '@react-pdf/renderer';
import {
  AddTask,
  AreaSpecialty,
  AttendanceRange,
  Contract,
  Equipment,
  OfficeClass,
  PeriodsSelect,
  Profession,
  Specialists,
  SubTask,
  TrainingSpecialty,
  User,
  WorkStation,
  licenseList,
} from '@/types/types';

type PdfDocumentElement = NonNullable<Parameters<typeof pdf>[0]>;

export interface OpenModal {
  isOpen: boolean;
}
export interface OpenWithId extends OpenModal {
  id?: number;
}
export interface ViewPdf extends OpenModal {
  pdfComponentFunction?: PdfDocumentElement;
  pdfBlob?: Blob;
  pdfUrl?: string;
  fileNamePdf: string;
}
export interface ViewHtmlToPdf extends OpenModal {
  htmlString?: string;
  pdfBlob?: Blob;
  fileNamePdf: string;
  size?: 'a4' | 'a5';
}

export interface CardRegisterPeriod extends OpenModal {
  data?: PeriodsSelect;
}
export interface CardRegisteProject {
  isOpen: boolean;
  typeSpecialityId: number | null;
  isDuplicate: boolean;
  idProject?: number;
}
export interface CardObservations extends OpenModal {
  observations: string;
}
export interface CardRegisteContract extends OpenModal {
  contract?: Contract;
}
export interface CardRegisteTask extends OpenModal {
  levelId: number | null;
  task?: SubTask;
  type?: AddTask;
}
export interface CardRegistePayroll extends OpenModal {
  ids: number[];
}
export interface CardAddCollaborator extends OpenModal {
  task: MyTask;
  onReloadList: () => void;
}
export interface CardAddReport extends OpenModal {}
export interface BulkMealOrderModalState extends OpenModal {
  date?: string;
}
export interface CardViewProps extends OpenModal {
  data: AttendanceRange[];
  daily?: string;
  position?: number;
  rangeDate?: { startDate: string; endDate: string };
  typeReport: 'range' | 'daily';
}
export interface CardLicenseProps extends OpenModal {
  type?: string;
  data?: licenseList;
}
export interface OpenCardFiles extends OpenModal {
  isAdmin?: boolean;
}
export interface ViewRegisterUser extends OpenModal {
  user?: User;
  roles: RoleForm[];
}
export interface CardSpecialistProps extends OpenModal {
  data?: Specialists;
  function?: () => void;
}
export interface OpenConfirmAction extends OpenModal {
  alertText?: string;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  function: () => unknown;
}
export interface AlertSummaryItem {
  label: string;
  value: string;
}
export interface OpenAlertConfirm extends OpenModal {
  title: string;
  description?: string;
  summaryItems?: AlertSummaryItem[];
  warningText?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => unknown;
}

export interface OpenEspecialistExperienceDescription extends OpenModal {
  id: number;
  data?: AreaSpecialty;
}
export interface OpenEspecialistTrainingDescription extends OpenModal {
  id: number;
  recordId?: number;
  data?: TrainingSpecialty;
}
export interface OpenProfessionCard extends OpenModal {
  data?: Profession;
}
export interface OpenOfficeCard extends OpenModal {
  data?: OfficeClass;
}
export interface OpenAssignCard extends OpenModal {
  id: number;
  data?: Equipment;
}
export interface CardWorkStationProps extends OpenModal {
  data?: WorkStation;
}

export interface OpenViewDocs extends OpenModal {
  user: User;
}
export interface CardAddVideo extends OpenModal {
  id?: number;
  folderId: number;
}
export interface CardDuplicateFrom extends OpenModal {
  id?: number;
}
export interface CardVideoPlayerProps extends OpenModal {
  url?: string;
}
export interface CardViewWidgetProps extends OpenModal {
  task: TaskRes;
}
export interface SelectProjectProps extends OpenModal {
  id?: number;
  temporal: boolean;
}
export interface DivisionLeaders extends OpenModal {
  id?: number;
  leaders: {
    profile: {
      id: number;
      firstName: string;
      lastName: string;
    };
  }[];
}

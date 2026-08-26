import SubjectManager from '@/models/subjectManager';
import type {
  CardAddCollaborator,
  CardAddReport,
  CardAddVideo,
  BulkMealOrderModalState,
  CardDuplicateFrom,
  CardLicenseProps,
  CardObservations,
  CardRegisteContract,
  CardRegistePayroll,
  CardRegisteProject,
  CardRegisterPeriod,
  CardRegisteTask,
  CardSpecialistProps,
  CardVideoPlayerProps,
  CardViewProps,
  CardViewWidgetProps,
  CardWorkStationProps,
  DivisionLeaders,
  OpenAssignCard,
  OpenAlertConfirm,
  OpenCardFiles,
  OpenConfirmAction,
  OpenEspecialistExperienceDescription,
  OpenEspecialistTrainingDescription,
  OpenOfficeCard,
  OpenProfessionCard,
  OpenViewDocs,
  OpenWithId,
  SelectProjectProps,
  ViewHtmlToPdf,
  ViewPdf,
  ViewRegisterUser,
} from './types';

export interface DownloadProgressState {
  id: string;
  fileName: string;
  loaded: number;
  total?: number;
  status: 'preparing' | 'downloading' | 'completed' | 'error';
  visible: boolean;
}

export const loader$ = new SubjectManager<boolean>();
export const downloadProgress$ = new SubjectManager<DownloadProgressState>();
export const toggle$ = new SubjectManager<boolean>();
export const isOpenModal$ = new SubjectManager<boolean>();
export const isOpenModalPeriod$ = new SubjectManager<CardRegisterPeriod>();
export const isGenerateExcelReport$ = new SubjectManager<string>();
export const isOpenCardRegisterUser$ = new SubjectManager<ViewRegisterUser>();
export const isOpenCardAddEquipment$ =
  new SubjectManager<CardWorkStationProps>();
export const isOpenCardAssing$ = new SubjectManager<OpenAssignCard>();
export const isOpenCardProfession$ = new SubjectManager<OpenProfessionCard>();
export const isOpenCardOffice$ = new SubjectManager<OpenOfficeCard>();
export const isOpenCardAddGroup$ = new SubjectManager<OpenWithId>();
export const isOpenCardDivisionLeader$ = new SubjectManager<DivisionLeaders>();
export const isOpenCardAddVideo$ = new SubjectManager<CardAddVideo>();
export const isOpenCardDuplicateFrom$ = new SubjectManager<CardDuplicateFrom>();
export const isOpenVideoPlayer$ = new SubjectManager<CardVideoPlayerProps>();
export const isOpenCardAddCompany$ = new SubjectManager<OpenWithId>();
export const isOpenCardGenerateReport$ = new SubjectManager<boolean>();
export const isOpenCardCompany$ = new SubjectManager<OpenWithId>();
export const isOpenCardConsortium$ = new SubjectManager<OpenWithId>();
export const isOpenCardSpecialist$ = new SubjectManager<CardSpecialistProps>();
export const isOpenCardViewPdf$ = new SubjectManager<CardViewProps>();
export const isOpenCardFiles$ = new SubjectManager<OpenCardFiles>();
export const isOpenAddExperience$ =
  new SubjectManager<OpenEspecialistExperienceDescription>();
export const isOpenAddTraining$ =
  new SubjectManager<OpenEspecialistTrainingDescription>();
export const isOpenButtonDelete$ = new SubjectManager<OpenConfirmAction>();
export const isOpenConfirmAction$ = new SubjectManager<OpenConfirmAction>();
export const isOpenAlertConfirm$ = new SubjectManager<OpenAlertConfirm>();
export const isOpenCardLicense$ = new SubjectManager<CardLicenseProps>();
export const isOpenViewDocs$ = new SubjectManager<OpenViewDocs>();
export const isOpenCardRegisteProject$ =
  new SubjectManager<CardRegisteProject>();
export const isOpenCardObservations$ = new SubjectManager<CardObservations>();
export const isOpenCardRegisteContract$ =
  new SubjectManager<CardRegisteContract>();
export const isOpenCardRegisteTask$ = new SubjectManager<CardRegisteTask>();
export const isOpenCardRegisterPayroll$ =
  new SubjectManager<CardRegistePayroll>();
export const isOpenCardAddCollaborator$ =
  new SubjectManager<CardAddCollaborator>();
export const isOpenCardViewWidget$ = new SubjectManager<CardViewWidgetProps>();
export const isOpenCardSelectProject$ =
  new SubjectManager<SelectProjectProps>();
export const isOpenCardAddReport$ = new SubjectManager<CardAddReport>();
export const isOpenBulkMealOrderModal$ =
  new SubjectManager<BulkMealOrderModalState>();
export const isOpenViewPdf$ = new SubjectManager<ViewPdf>();
export const isOpenViewHtmlToPdf$ = new SubjectManager<ViewHtmlToPdf>();
export const isTaskInformation$ = new SubjectManager<boolean>();
export const changeStatusTask$ = new SubjectManager();
export const errorToken$ = new SubjectManager();
export const isResizing$ = new SubjectManager<boolean>();

import { lazy, type ComponentType } from 'react';

type LazyRouteModule<TName extends string, TProps> = () => Promise<
  Record<TName, ComponentType<TProps>>
>;

const lazyNamed = <TName extends string, TProps>(
  loader: LazyRouteModule<TName, TProps>,
  name: TName
) =>
  lazy<ComponentType<TProps>>(async () => {
    const module = await loader();
    return { default: module[name] };
  });

const asLoader = <TName extends string, TProps>(
  loader: LazyRouteModule<TName, TProps>
) => loader;

export const routeLoaders = {
  Attendance: asLoader(() => import('@/pages/attendance/Attendance')),
  AttendanceIncidents: asLoader(() =>
    import('@/pages/controlAttendance/AttendanceIncidents').then(
      ({ default: AttendanceIncidents }) => ({ AttendanceIncidents })
    )
  ),
  AttendanceReconciliation: asLoader(() =>
    import('@/pages/controlAttendance/AttendanceReconciliation').then(
      ({ default: AttendanceReconciliation }) => ({
        AttendanceReconciliation,
      })
    )
  ),
  AuditLogsPage: asLoader(() =>
    import('@/pages/auditLogs/AuditLogsPage').then(
      ({ default: AuditLogsPage }) => ({ AuditLogsPage })
    )
  ),
  FrontendLogsPage: asLoader(() =>
    import('@/pages/frontendLogs/FrontendLogsPage').then(
      ({ default: FrontendLogsPage }) => ({ FrontendLogsPage })
    )
  ),
  BasicsPage: asLoader(
    () => import('@/pages/specialities/pages/project/pages/basics/BasicsPage')
  ),
  BudgetsPage: asLoader(
    () => import('@/pages/specialities/pages/project/pages/budgets/BudgetsPage')
  ),
  CalendarWorkspace: asLoader(
    () => import('@/pages/group/pages/calendarWorkspace/CalendarWorkspace')
  ),
  CommitmentProposalsWorkspace: asLoader(
    () =>
      import(
        '@/pages/group/pages/commitmentProposalsWorkspace/CommitmentProposalsWorkspace'
      )
  ),
  CommitmentsBoardWorkspace: asLoader(() =>
    import(
      '@/pages/group/pages/commitmentsBoardWorkspace/CommitmentsBoardWorkspace'
    ).then(({ default: CommitmentsBoardWorkspace }) => ({
      CommitmentsBoardWorkspace,
    }))
  ),
  CommingSoon: asLoader(() => import('@/pages/commingSoon/CommingSoon')),
  Communications: asLoader(() =>
    import('@/pages/procedure/pages/communications/Communications').then(
      ({ default: Communications }) => ({ Communications })
    )
  ),
  CommunicationInfo: asLoader(() =>
    import(
      '@/pages/procedure/pages/communications/pages/CommunicationInfo'
    ).then(({ default: CommunicationInfo }) => ({ CommunicationInfo }))
  ),
  Company: asLoader(() => import('@/pages/company/Company')),
  CompanyInformation: asLoader(
    () => import('@/pages/company/pages/infomation/CompanyInformation')
  ),
  CorporateArchive: asLoader(
    () => import('@/pages/company/pages/corporateArchive/CorporateArchive')
  ),
  Consortium: asLoader(
    () => import('@/pages/company/pages/consortium/Consortium')
  ),
  Contracts: asLoader(
    () => import('@/pages/generalIndex/pages/contracts/Contracts')
  ),
  ContractsLevels: asLoader(
    () =>
      import(
        '@/pages/generalIndex/pages/contracts/pages/contractsLevels/ContractsLevels'
      )
  ),
  ControlAttendanceLayout: asLoader(() =>
    import('@/pages/controlAttendance/ControlAttendanceLayout').then(
      ({ default: ControlAttendanceLayout }) => ({ ControlAttendanceLayout })
    )
  ),
  CustomizableInvoice: asLoader(
    () => import('@/pages/customizableInvoice/CustomizableInvoice')
  ),
  DetailsContracts: asLoader(
    () =>
      import(
        '@/pages/generalIndex/pages/contracts/pages/detailsContracts/DetailsContracts'
      )
  ),
  DutyRotationAttendanceRepair: asLoader(() =>
    import('@/pages/dutyRotations/DutyRotationAttendanceRepair').then(
      ({ default: DutyRotationAttendanceRepair }) => ({
        DutyRotationAttendanceRepair,
      })
    )
  ),
  DutyRotationsConfiguration: asLoader(() =>
    import('@/pages/dutyRotations/pages/DutyRotationsConfiguration').then(
      ({ default: DutyRotationsConfiguration }) => ({
        DutyRotationsConfiguration,
      })
    )
  ),
  DutyRotationsOperationalReport: asLoader(() =>
    import('@/pages/dutyRotations/pages/DutyRotationsOperationalReport').then(
      ({ default: DutyRotationsOperationalReport }) => ({
        DutyRotationsOperationalReport,
      })
    )
  ),
  MyDutyRotations: asLoader(() =>
    import('@/pages/dutyRotations/pages/MyDutyRotations').then(
      ({ default: MyDutyRotations }) => ({ MyDutyRotations })
    )
  ),
  DutyRotationsLayout: asLoader(() =>
    import('@/pages/dutyRotations/DutyRotationsLayout').then(
      ({ default: DutyRotationsLayout }) => ({ DutyRotationsLayout })
    )
  ),
  FormMealOrder: asLoader(() =>
    import('@/pages/kitchen/pages/formMealOrder/FormMealOrder').then(
      ({ default: FormMealOrder }) => ({ FormMealOrder })
    )
  ),
  GateControl: asLoader(() =>
    import('@/pages/gateControl/GateControl').then(
      ({ default: GateControl }) => ({ GateControl })
    )
  ),
  GateControlLayout: asLoader(() =>
    import('@/pages/gateControl/GateControlLayout').then(
      ({ default: GateControlLayout }) => ({ GateControlLayout })
    )
  ),
  GeneralData: asLoader(() =>
    import(
      '@/pages/specialities/pages/project/pages/generalData/GeneralData'
    ).then(({ default: GeneralData }) => ({ GeneralData }))
  ),
  GeneralIndex: asLoader(() => import('@/pages/generalIndex/GeneralIndex')),
  Group: asLoader(() => import('@/pages/group/Group')),
  GroupAttendanceFilter: asLoader(() =>
    import(
      '@/pages/group/pages/groupAttendanceFilter/GroupAttendanceFilter'
    ).then(({ default: GroupAttendanceFilter }) => ({ GroupAttendanceFilter }))
  ),
  GroupContent: asLoader(
    () => import('@/pages/group/pages/groupContent/GroupContent')
  ),
  GroupDaily: asLoader(
    () => import('@/pages/group/pages/groupDaily/GroupDaily')
  ),
  GroupMeetingFilter: asLoader(() =>
    import('@/pages/group/pages/groupMeetingFilter/GroupMeetingFilter').then(
      ({ default: GroupMeetingFilter }) => ({ GroupMeetingFilter })
    )
  ),
  GroupProjects: asLoader(
    () => import('@/pages/group/pages/groupProjects/GroupProjects')
  ),
  GroupTaskFilter: asLoader(() =>
    import('@/pages/group/pages/groupTaskFilter/GroupTaskFilter').then(
      ({ default: GroupTaskFilter }) => ({ GroupTaskFilter })
    )
  ),
  GroupWeekend: asLoader(
    () => import('@/pages/group/pages/groupWeekend/GroupWeekend')
  ),
  Home: asLoader(() => import('@/pages/home/Home')),
  Kitchen: asLoader(() =>
    import('@/pages/kitchen/Kitchen').then(({ default: Kitchen }) => ({
      Kitchen,
    }))
  ),
  KitchenHistory: asLoader(() =>
    import('@/pages/kitchen/pages/history/KitchenHistory').then(
      ({ default: KitchenHistory }) => ({ KitchenHistory })
    )
  ),
  LicensePage: asLoader(
    () => import('@/pages/procedure/pages/license/LicensePage')
  ),
  ListMealOrder: asLoader(() =>
    import('@/pages/kitchen/pages/listMealOrder/ListMealOrder').then(
      ({ default: ListMealOrder }) => ({ ListMealOrder })
    )
  ),
  ListPersonalReports: asLoader(() =>
    import('@/pages/listPersonalReports/ListPersonalReports').then(
      ({ default: ListPersonalReports }) => ({ ListPersonalReports })
    )
  ),
  ListPersonalTask: asLoader(
    () => import('@/pages/myTasks/pages/listPersonalTask/ListPersonalTask')
  ),
  LiquidationRequestPage: asLoader(
    () =>
      import('@/pages/myTasks/pages/recaudadorGrande/LiquidationRequestPage')
  ),
  Login: asLoader(() => import('@/pages/login/Login')),
  MailPage: asLoader(
    () => import('@/pages/procedure/pages/paymentProcessing/MailPage')
  ),
  MeetingWorkspace: asLoader(() =>
    import('@/pages/group/pages/meetingWorkspace/MeetingWorkspace').then(
      ({ default: MeetingWorkspace }) => ({ MeetingWorkspace })
    )
  ),
  MessagePage: asLoader(
    () =>
      import(
        '@/pages/procedure/pages/paymentProcessing/pages/message/MessagePage'
      )
  ),
  MetradoStructures: asLoader(() =>
    import('@/pages/metrados/MetradoStructures').then(
      ({ default: MetradoStructures }) => ({ MetradoStructures })
    )
  ),
  MyTasks: asLoader(() =>
    import('@/pages/myTasks/MyTasks').then(({ default: MyTasks }) => ({
      MyTasks,
    }))
  ),
  PreLiquidationPage: asLoader(
    () => import('@/pages/myTasks/pages/recaudadorGrande/PreLiquidationPage')
  ),
  PreLiquidationStageDetailPage: asLoader(
    () =>
      import(
        '@/pages/myTasks/pages/recaudadorGrande/PreLiquidationStageDetailPage'
      )
  ),
  RecaudadorGrandeLayout: asLoader(
    () =>
      import('@/pages/myTasks/pages/recaudadorGrande/RecaudadorGrandeLayout')
  ),
  AdministrativeTasks: asLoader(() =>
    import(
      '@/pages/myTasks/pages/administrativeTasks/AdministrativeTasks'
    ).then(({ default: AdministrativeTasks }) => ({ AdministrativeTasks }))
  ),
  NotFound: asLoader(() => import('@/pages/404/NotFound')),
  NotificationsList: asLoader(
    () => import('@/pages/notificationsList/NotificationsList')
  ),
  OfficeMeetings: asLoader(() =>
    import(
      '@/pages/group/pages/officeStats/views/officeMeetings/OfficeMeetings'
    ).then(({ default: OfficeMeetings }) => ({ OfficeMeetings }))
  ),
  OfficeMeetingsDetail: asLoader(() =>
    import(
      '@/pages/group/pages/officeMeetingsDetail/OfficeMeetingsDetail'
    ).then(({ default: OfficeMeetingsDetail }) => ({ OfficeMeetingsDetail }))
  ),
  OfficeProjects: asLoader(() =>
    import(
      '@/pages/group/pages/officeStats/views/officeProjects/OfficeProjects'
    ).then(({ default: OfficeProjects }) => ({ OfficeProjects }))
  ),
  OfficeProjectsAdmin: asLoader(() =>
    import('@/pages/group/pages/officeProjectsAdmin/OfficeProjectsAdmin').then(
      ({ default: OfficeProjectsAdmin }) => ({ OfficeProjectsAdmin })
    )
  ),
  OfficeStats: asLoader(() =>
    import('@/pages/group/pages/officeStats/OfficeStats').then(
      ({ default: OfficeStats }) => ({ OfficeStats })
    )
  ),
  OrgChart: asLoader(() =>
    import('@/pages/userCenter/pages/orgChart/OrgChart').then(
      ({ default: OrgChart }) => ({ OrgChart })
    )
  ),
  Procedure: asLoader(() =>
    import('@/pages/procedure/Procedure').then(({ default: Procedure }) => ({
      Procedure,
    }))
  ),
  ProductionBonusPage: asLoader(
    () => import('@/pages/procedure/pages/productionBonus/ProductionBonusPage')
  ),
  PayrollPage: asLoader(() =>
    import('@/pages/procedure/pages/salaryList/PayrollPage').then(
      ({ default: PayrollPage }) => ({ PayrollPage })
    )
  ),
  ProgressReportEditor: asLoader(() =>
    import(
      '@/pages/group/pages/progressReportEditor/ProgressReportEditor'
    ).then(({ default: ProgressReportEditor }) => ({ ProgressReportEditor }))
  ),
  ProgressReportsWorkspace: asLoader(() =>
    import(
      '@/pages/group/pages/progressReportsWorkspace/ProgressReportsWorkspace'
    ).then(({ default: ProgressReportsWorkspace }) => ({
      ProgressReportsWorkspace,
    }))
  ),
  Project: asLoader(() => import('@/pages/specialities/pages/project/Project')),
  RecoveryPassword: asLoader(() =>
    import('@/pages/login/pages/recoveryPassword/RecoveryPassword').then(
      ({ default: RecoveryPassword }) => ({ RecoveryPassword })
    )
  ),
  RegularProcedure: asLoader(() =>
    import('@/pages/procedure/pages/regularProcedure/RegularProcedure').then(
      ({ default: RegularProcedure }) => ({ RegularProcedure })
    )
  ),
  RegularProcedureInfo: asLoader(() =>
    import(
      '@/pages/procedure/pages/regularProcedure/pages/regularProcedureInfo/RegularProcedureInfo'
    ).then(({ default: RegularProcedureInfo }) => ({ RegularProcedureInfo }))
  ),
  ReportPersonalTask: asLoader(() =>
    import(
      '@/pages/listPersonalReports/pages/reportPersonalTask/ReportPersonalTask'
    ).then(({ default: ReportPersonalTask }) => ({ ReportPersonalTask }))
  ),
  RolesAndPermissions: asLoader(() =>
    import(
      '@/pages/userCenter/pages/rolesAndPermissions/RolesAndPermissions'
    ).then(({ default: RolesAndPermissions }) => ({ RolesAndPermissions }))
  ),
  SalaryDetail: asLoader(() =>
    import(
      '@/pages/procedure/pages/salaryList/pages/salaryDetail/SalaryDetail'
    ).then(({ default: SalaryDetail }) => ({ SalaryDetail }))
  ),
  SalaryList: asLoader(() =>
    import('@/pages/procedure/pages/salaryList/SalaryList').then(
      ({ default: SalaryList }) => ({ SalaryList })
    )
  ),
  PayrollMayBridge: asLoader(() =>
    import(
      '@/pages/procedure/pages/salaryList/pages/monthlyBridge/PayrollMayBridge'
    ).then(({ default: PayrollMayBridge }) => ({ PayrollMayBridge }))
  ),
  PayrollPersonnelRequests: asLoader(() =>
    import(
      '@/pages/procedure/pages/salaryList/pages/monthlyBridge/PayrollPersonnelRequests'
    ).then(({ default: PayrollPersonnelRequests }) => ({
      PayrollPersonnelRequests,
    }))
  ),
  PayrollElaboration: asLoader(() =>
    import(
      '@/pages/procedure/pages/salaryList/pages/monthlyBridge/PayrollElaboration'
    ).then(({ default: PayrollElaboration }) => ({ PayrollElaboration }))
  ),
  PayrollSelfSubmission: asLoader(() =>
    import(
      '@/pages/procedure/pages/salaryList/pages/monthlyBridge/PayrollSelfSubmission'
    ).then(({ default: PayrollSelfSubmission }) => ({ PayrollSelfSubmission }))
  ),
  Specialist: asLoader(
    () => import('@/pages/userCenter/pages/specialist/Specialist')
  ),
  SpecialistInformation: asLoader(
    () =>
      import(
        '@/pages/userCenter/pages/specialist/pages/specialistInformation/SpecialistInformation'
      )
  ),
  Specialities: asLoader(() => import('@/pages/specialities/Specialities')),
  Stage: asLoader(() => import('@/pages/specialities/pages/stage/Stage')),
  SystemLayout: asLoader(() =>
    import('@/pages/system/SystemLayout').then(({ default: SystemLayout }) => ({
      SystemLayout,
    }))
  ),
  SystemHealthPage: asLoader(() =>
    import('@/pages/system/SystemHealthPage').then(
      ({ default: SystemHealthPage }) => ({ SystemHealthPage })
    )
  ),
  SystemSocketUsersPage: asLoader(() =>
    import('@/pages/system/SystemSocketUsersPage').then(
      ({ default: SystemSocketUsersPage }) => ({ SystemSocketUsersPage })
    )
  ),
  Task: asLoader(
    () => import('@/pages/specialities/pages/project/pages/task/Task')
  ),
  TaskBasics: asLoader(
    () => import('@/pages/specialities/pages/project/pages/task/TaskBasics')
  ),
  TaskForReview: asLoader(() =>
    import('@/pages/myTasks/pages/taskForReview/TaskForReview').then(
      ({ default: TaskForReview }) => ({ TaskForReview })
    )
  ),
  TechnicalOfficeProjectsWorkspace: asLoader(() =>
    import(
      '@/pages/group/pages/technicalOfficeProjectsWorkspace/TechnicalOfficeProjectsWorkspace'
    ).then(({ default: TechnicalOfficeProjectsWorkspace }) => ({
      TechnicalOfficeProjectsWorkspace,
    }))
  ),
  UserCenter: asLoader(() =>
    import('@/pages/userCenter/UserCenter').then(({ default: UserCenter }) => ({
      UserCenter,
    }))
  ),
  UsersList: asLoader(() =>
    import('@/pages/userCenter/pages/users/UsersList').then(
      ({ default: UsersList }) => ({ UsersList })
    )
  ),
  UsersDirectory: asLoader(() =>
    import('@/pages/userCenter/pages/users/UsersDirectory').then(
      ({ default: UsersDirectory }) => ({ UsersDirectory })
    )
  ),
  InternalUsersDirectory: asLoader(() =>
    import('@/pages/userCenter/pages/users/InternalUsersDirectory').then(
      ({ default: InternalUsersDirectory }) => ({ InternalUsersDirectory })
    )
  ),
  VideoList: asLoader(() =>
    import('@/pages/videoTutorials/views/videoList/VideoList').then(
      ({ default: VideoList }) => ({ VideoList })
    )
  ),
  VideoTutorials: asLoader(() =>
    import('@/pages/videoTutorials/VideoTutorials').then(
      ({ default: VideoTutorials }) => ({ VideoTutorials })
    )
  ),
};

export const Attendance = lazyNamed(routeLoaders.Attendance, 'Attendance');
export const AttendanceIncidents = lazyNamed(
  routeLoaders.AttendanceIncidents,
  'AttendanceIncidents'
);
export const AttendanceReconciliation = lazyNamed(
  routeLoaders.AttendanceReconciliation,
  'AttendanceReconciliation'
);
export const AuditLogsPage = lazyNamed(
  routeLoaders.AuditLogsPage,
  'AuditLogsPage'
);
export const FrontendLogsPage = lazyNamed(
  routeLoaders.FrontendLogsPage,
  'FrontendLogsPage'
);
export const BasicsPage = lazyNamed(routeLoaders.BasicsPage, 'BasicsPage');
export const BudgetsPage = lazyNamed(routeLoaders.BudgetsPage, 'BudgetsPage');
export const CalendarWorkspace = lazyNamed(
  routeLoaders.CalendarWorkspace,
  'CalendarWorkspace'
);
export const CommitmentProposalsWorkspace = lazyNamed(
  routeLoaders.CommitmentProposalsWorkspace,
  'CommitmentProposalsWorkspace'
);
export const CommitmentsBoardWorkspace = lazyNamed(
  routeLoaders.CommitmentsBoardWorkspace,
  'CommitmentsBoardWorkspace'
);
export const CommingSoon = lazyNamed(routeLoaders.CommingSoon, 'CommingSoon');
export const Communications = lazyNamed(
  routeLoaders.Communications,
  'Communications'
);
export const CommunicationInfo = lazyNamed(
  routeLoaders.CommunicationInfo,
  'CommunicationInfo'
);
export const Company = lazyNamed(routeLoaders.Company, 'Company');
export const CompanyInformation = lazyNamed(
  routeLoaders.CompanyInformation,
  'CompanyInformation'
);
export const CorporateArchive = lazyNamed(
  routeLoaders.CorporateArchive,
  'CorporateArchive'
);
export const Consortium = lazyNamed(routeLoaders.Consortium, 'Consortium');
export const Contracts = lazyNamed(routeLoaders.Contracts, 'Contracts');
export const ContractsLevels = lazyNamed(
  routeLoaders.ContractsLevels,
  'ContractsLevels'
);
export const ControlAttendanceLayout = lazyNamed(
  routeLoaders.ControlAttendanceLayout,
  'ControlAttendanceLayout'
);
export const CustomizableInvoice = lazyNamed(
  routeLoaders.CustomizableInvoice,
  'CustomizableInvoice'
);
export const DetailsContracts = lazyNamed(
  routeLoaders.DetailsContracts,
  'DetailsContracts'
);
export const DutyRotationAttendanceRepair = lazyNamed(
  routeLoaders.DutyRotationAttendanceRepair,
  'DutyRotationAttendanceRepair'
);
export const DutyRotationsConfiguration = lazyNamed(
  routeLoaders.DutyRotationsConfiguration,
  'DutyRotationsConfiguration'
);
export const DutyRotationsOperationalReport = lazyNamed(
  routeLoaders.DutyRotationsOperationalReport,
  'DutyRotationsOperationalReport'
);
export const DutyRotationsLayout = lazyNamed(
  routeLoaders.DutyRotationsLayout,
  'DutyRotationsLayout'
);
export const MyDutyRotations = lazyNamed(
  routeLoaders.MyDutyRotations,
  'MyDutyRotations'
);
export const FormMealOrder = lazyNamed(
  routeLoaders.FormMealOrder,
  'FormMealOrder'
);
export const GateControl = lazyNamed(routeLoaders.GateControl, 'GateControl');
export const GateControlLayout = lazyNamed(
  routeLoaders.GateControlLayout,
  'GateControlLayout'
);
export const GeneralData = lazyNamed(routeLoaders.GeneralData, 'GeneralData');
export const GeneralIndex = lazyNamed(
  routeLoaders.GeneralIndex,
  'GeneralIndex'
);
export const Group = lazyNamed(routeLoaders.Group, 'Group');
export const GroupAttendanceFilter = lazyNamed(
  routeLoaders.GroupAttendanceFilter,
  'GroupAttendanceFilter'
);
export const GroupContent = lazyNamed(
  routeLoaders.GroupContent,
  'GroupContent'
);
export const GroupDaily = lazyNamed(routeLoaders.GroupDaily, 'GroupDaily');
export const GroupMeetingFilter = lazyNamed(
  routeLoaders.GroupMeetingFilter,
  'GroupMeetingFilter'
);
export const GroupProjects = lazyNamed(
  routeLoaders.GroupProjects,
  'GroupProjects'
);
export const GroupTaskFilter = lazyNamed(
  routeLoaders.GroupTaskFilter,
  'GroupTaskFilter'
);
export const GroupWeekend = lazyNamed(
  routeLoaders.GroupWeekend,
  'GroupWeekend'
);
export const Home = lazyNamed(routeLoaders.Home, 'Home');
export const Kitchen = lazyNamed(routeLoaders.Kitchen, 'Kitchen');
export const KitchenHistory = lazyNamed(
  routeLoaders.KitchenHistory,
  'KitchenHistory'
);
export const LicensePage = lazyNamed(routeLoaders.LicensePage, 'LicensePage');
export const ListMealOrder = lazyNamed(
  routeLoaders.ListMealOrder,
  'ListMealOrder'
);
export const ListPersonalReports = lazyNamed(
  routeLoaders.ListPersonalReports,
  'ListPersonalReports'
);
export const ListPersonalTask = lazyNamed(
  routeLoaders.ListPersonalTask,
  'ListPersonalTask'
);
export const LiquidationRequestPage = lazyNamed(
  routeLoaders.LiquidationRequestPage,
  'LiquidationRequestPage'
);
export const Login = lazyNamed(routeLoaders.Login, 'Login');
export const MailPage = lazyNamed(routeLoaders.MailPage, 'MailPage');
export const MeetingWorkspace = lazyNamed(
  routeLoaders.MeetingWorkspace,
  'MeetingWorkspace'
);
export const MessagePage = lazyNamed(routeLoaders.MessagePage, 'MessagePage');
export const MetradoStructures = lazyNamed(
  routeLoaders.MetradoStructures,
  'MetradoStructures'
);
export const MyTasks = lazyNamed(routeLoaders.MyTasks, 'MyTasks');
export const PreLiquidationPage = lazyNamed(
  routeLoaders.PreLiquidationPage,
  'PreLiquidationPage'
);
export const PreLiquidationStageDetailPage = lazyNamed(
  routeLoaders.PreLiquidationStageDetailPage,
  'PreLiquidationStageDetailPage'
);
export const RecaudadorGrandeLayout = lazyNamed(
  routeLoaders.RecaudadorGrandeLayout,
  'RecaudadorGrandeLayout'
);
export const AdministrativeTasks = lazyNamed(
  routeLoaders.AdministrativeTasks,
  'AdministrativeTasks'
);
export const NotFound = lazyNamed(routeLoaders.NotFound, 'NotFound');
export const NotificationsList = lazyNamed(
  routeLoaders.NotificationsList,
  'NotificationsList'
);
export const OfficeMeetings = lazyNamed(
  routeLoaders.OfficeMeetings,
  'OfficeMeetings'
);
export const OfficeMeetingsDetail = lazyNamed(
  routeLoaders.OfficeMeetingsDetail,
  'OfficeMeetingsDetail'
);
export const OfficeProjects = lazyNamed(
  routeLoaders.OfficeProjects,
  'OfficeProjects'
);
export const OfficeProjectsAdmin = lazyNamed(
  routeLoaders.OfficeProjectsAdmin,
  'OfficeProjectsAdmin'
);
export const OfficeStats = lazyNamed(routeLoaders.OfficeStats, 'OfficeStats');
export const OrgChart = lazyNamed(routeLoaders.OrgChart, 'OrgChart');
export const Procedure = lazyNamed(routeLoaders.Procedure, 'Procedure');
export const ProductionBonusPage = lazyNamed(
  routeLoaders.ProductionBonusPage,
  'ProductionBonusPage'
);
export const PayrollPage = lazyNamed(routeLoaders.PayrollPage, 'PayrollPage');
export const ProgressReportEditor = lazyNamed(
  routeLoaders.ProgressReportEditor,
  'ProgressReportEditor'
);
export const ProgressReportsWorkspace = lazyNamed(
  routeLoaders.ProgressReportsWorkspace,
  'ProgressReportsWorkspace'
);
export const Project = lazyNamed(routeLoaders.Project, 'Project');
export const RecoveryPassword = lazyNamed(
  routeLoaders.RecoveryPassword,
  'RecoveryPassword'
);
export const RegularProcedure = lazyNamed(
  routeLoaders.RegularProcedure,
  'RegularProcedure'
);
export const RegularProcedureInfo = lazyNamed(
  routeLoaders.RegularProcedureInfo,
  'RegularProcedureInfo'
);
export const ReportPersonalTask = lazyNamed(
  routeLoaders.ReportPersonalTask,
  'ReportPersonalTask'
);
export const RolesAndPermissions = lazyNamed(
  routeLoaders.RolesAndPermissions,
  'RolesAndPermissions'
);
export const SalaryDetail = lazyNamed(
  routeLoaders.SalaryDetail,
  'SalaryDetail'
);
export const SalaryList = lazyNamed(routeLoaders.SalaryList, 'SalaryList');
export const PayrollMayBridge = lazyNamed(
  routeLoaders.PayrollMayBridge,
  'PayrollMayBridge'
);
export const PayrollPersonnelRequests = lazyNamed(
  routeLoaders.PayrollPersonnelRequests,
  'PayrollPersonnelRequests'
);
export const PayrollElaboration = lazyNamed(
  routeLoaders.PayrollElaboration,
  'PayrollElaboration'
);
export const PayrollSelfSubmission = lazyNamed(
  routeLoaders.PayrollSelfSubmission,
  'PayrollSelfSubmission'
);
export const Specialist = lazyNamed(routeLoaders.Specialist, 'Specialist');
export const SpecialistInformation = lazyNamed(
  routeLoaders.SpecialistInformation,
  'SpecialistInformation'
);
export const Specialities = lazyNamed(
  routeLoaders.Specialities,
  'Specialities'
);
export const Stage = lazyNamed(routeLoaders.Stage, 'Stage');
export const SystemLayout = lazyNamed(
  routeLoaders.SystemLayout,
  'SystemLayout'
);
export const SystemHealthPage = lazyNamed(
  routeLoaders.SystemHealthPage,
  'SystemHealthPage'
);
export const SystemSocketUsersPage = lazyNamed(
  routeLoaders.SystemSocketUsersPage,
  'SystemSocketUsersPage'
);
export const Task = lazyNamed(routeLoaders.Task, 'Task');
export const TaskBasics = lazyNamed(routeLoaders.TaskBasics, 'TaskBasics');
export const TaskForReview = lazyNamed(
  routeLoaders.TaskForReview,
  'TaskForReview'
);
export const TechnicalOfficeProjectsWorkspace = lazyNamed(
  routeLoaders.TechnicalOfficeProjectsWorkspace,
  'TechnicalOfficeProjectsWorkspace'
);
export const UserCenter = lazyNamed(routeLoaders.UserCenter, 'UserCenter');
export const UsersList = lazyNamed(routeLoaders.UsersList, 'UsersList');
export const UsersDirectory = lazyNamed(
  routeLoaders.UsersDirectory,
  'UsersDirectory'
);
export const InternalUsersDirectory = lazyNamed(
  routeLoaders.InternalUsersDirectory,
  'InternalUsersDirectory'
);
export const VideoList = lazyNamed(routeLoaders.VideoList, 'VideoList');
export const VideoTutorials = lazyNamed(
  routeLoaders.VideoTutorials,
  'VideoTutorials'
);

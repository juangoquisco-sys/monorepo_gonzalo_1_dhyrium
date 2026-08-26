type RoutePreloader = () => Promise<unknown>;

const routePreloaders = {
  Attendance: () => import('@/pages/attendance/Attendance'),
  AttendanceIncidents: () =>
    import('@/pages/controlAttendance/AttendanceIncidents'),
  AttendanceReconciliation: () =>
    import('@/pages/controlAttendance/AttendanceReconciliation'),
  AuditLogsPage: () => import('@/pages/auditLogs/AuditLogsPage'),
  FrontendLogsPage: () => import('@/pages/frontendLogs/FrontendLogsPage'),
  BasicsPage: () =>
    import('@/pages/specialities/pages/project/pages/basics/BasicsPage'),
  BudgetsPage: () =>
    import('@/pages/specialities/pages/project/pages/budgets/BudgetsPage'),
  CalendarWorkspace: () =>
    import('@/pages/group/pages/calendarWorkspace/CalendarWorkspace'),
  Communications: () =>
    import('@/pages/procedure/pages/communications/Communications'),
  Company: () => import('@/pages/company/Company'),
  CompanyInformation: () =>
    import('@/pages/company/pages/infomation/CompanyInformation'),
  CorporateArchive: () =>
    import('@/pages/company/pages/corporateArchive/CorporateArchive'),
  Consortium: () => import('@/pages/company/pages/consortium/Consortium'),
  Contracts: () => import('@/pages/generalIndex/pages/contracts/Contracts'),
  ContractsLevels: () =>
    import(
      '@/pages/generalIndex/pages/contracts/pages/contractsLevels/ContractsLevels'
    ),
  ControlAttendanceLayout: () =>
    import('@/pages/controlAttendance/ControlAttendanceLayout'),
  CustomizableInvoice: () =>
    import('@/pages/customizableInvoice/CustomizableInvoice'),
  DutyRotationAttendanceRepair: () =>
    import('@/pages/dutyRotations/DutyRotationAttendanceRepair'),
  DutyRotationsConfiguration: () =>
    import('@/pages/dutyRotations/pages/DutyRotationsConfiguration'),
  DutyRotationsLayout: () =>
    import('@/pages/dutyRotations/DutyRotationsLayout'),
  DutyRotationsOperationalReport: () =>
    import('@/pages/dutyRotations/pages/DutyRotationsOperationalReport'),
  FormMealOrder: () =>
    import('@/pages/kitchen/pages/formMealOrder/FormMealOrder'),
  GateControl: () => import('@/pages/gateControl/GateControl'),
  GateControlLayout: () => import('@/pages/gateControl/GateControlLayout'),
  GeneralIndex: () => import('@/pages/generalIndex/GeneralIndex'),
  Group: () => import('@/pages/group/Group'),
  Home: () => import('@/pages/home/Home'),
  Kitchen: () => import('@/pages/kitchen/Kitchen'),
  KitchenHistory: () => import('@/pages/kitchen/pages/history/KitchenHistory'),
  LicensePage: () => import('@/pages/procedure/pages/license/LicensePage'),
  MyDutyRotations: () => import('@/pages/dutyRotations/pages/MyDutyRotations'),
  ListMealOrder: () =>
    import('@/pages/kitchen/pages/listMealOrder/ListMealOrder'),
  ListPersonalReports: () =>
    import('@/pages/listPersonalReports/ListPersonalReports'),
  ListPersonalTask: () =>
    import('@/pages/myTasks/pages/listPersonalTask/ListPersonalTask'),
  LiquidationRequestPage: () =>
    import('@/pages/myTasks/pages/recaudadorGrande/LiquidationRequestPage'),
  MailPage: () => import('@/pages/procedure/pages/paymentProcessing/MailPage'),
  MeetingWorkspace: () =>
    import('@/pages/group/pages/meetingWorkspace/MeetingWorkspace'),
  MessagePage: () =>
    import(
      '@/pages/procedure/pages/paymentProcessing/pages/message/MessagePage'
    ),
  MetradoStructures: () => import('@/pages/metrados/MetradoStructures'),
  MyTasks: () => import('@/pages/myTasks/MyTasks'),
  PreLiquidationPage: () =>
    import('@/pages/myTasks/pages/recaudadorGrande/PreLiquidationPage'),
  PreLiquidationStageDetailPage: () =>
    import(
      '@/pages/myTasks/pages/recaudadorGrande/PreLiquidationStageDetailPage'
    ),
  RecaudadorGrandeLayout: () =>
    import('@/pages/myTasks/pages/recaudadorGrande/RecaudadorGrandeLayout'),
  AdministrativeTasks: () =>
    import('@/pages/myTasks/pages/administrativeTasks/AdministrativeTasks'),
  OrgChart: () => import('@/pages/userCenter/pages/orgChart/OrgChart'),
  Procedure: () => import('@/pages/procedure/Procedure'),
  PayrollPage: () => import('@/pages/procedure/pages/salaryList/PayrollPage'),
  ProgressReportsWorkspace: () =>
    import(
      '@/pages/group/pages/progressReportsWorkspace/ProgressReportsWorkspace'
    ),
  Project: () => import('@/pages/specialities/pages/project/Project'),
  RegularProcedure: () =>
    import('@/pages/procedure/pages/regularProcedure/RegularProcedure'),
  ReportPersonalTask: () =>
    import(
      '@/pages/listPersonalReports/pages/reportPersonalTask/ReportPersonalTask'
    ),
  RolesAndPermissions: () =>
    import('@/pages/userCenter/pages/rolesAndPermissions/RolesAndPermissions'),
  SalaryDetail: () =>
    import(
      '@/pages/procedure/pages/salaryList/pages/salaryDetail/SalaryDetail'
    ),
  SalaryList: () => import('@/pages/procedure/pages/salaryList/SalaryList'),
  PayrollMayBridge: () =>
    import(
      '@/pages/procedure/pages/salaryList/pages/monthlyBridge/PayrollMayBridge'
    ),
  Specialist: () => import('@/pages/userCenter/pages/specialist/Specialist'),
  Specialities: () => import('@/pages/specialities/Specialities'),
  Stage: () => import('@/pages/specialities/pages/stage/Stage'),
  SystemLayout: () => import('@/pages/system/SystemLayout'),
  SystemHealthPage: () => import('@/pages/system/SystemHealthPage'),
  SystemSocketUsersPage: () => import('@/pages/system/SystemSocketUsersPage'),
  TaskForReview: () =>
    import('@/pages/myTasks/pages/taskForReview/TaskForReview'),
  TechnicalOfficeProjectsWorkspace: () =>
    import(
      '@/pages/group/pages/technicalOfficeProjectsWorkspace/TechnicalOfficeProjectsWorkspace'
    ),
  UserCenter: () => import('@/pages/userCenter/UserCenter'),
  UsersList: () => import('@/pages/userCenter/pages/users/UsersList'),
  VideoList: () => import('@/pages/videoTutorials/views/videoList/VideoList'),
  VideoTutorials: () => import('@/pages/videoTutorials/VideoTutorials'),
};

const preloadGroups: Record<string, RoutePreloader[]> = {
  home: [routePreloaders.Home],
  'centro-de-usuarios': [
    routePreloaders.UserCenter,
    routePreloaders.UsersList,
    routePreloaders.RolesAndPermissions,
    routePreloaders.OrgChart,
    routePreloaders.Specialist,
  ],
  tramites: [
    routePreloaders.Procedure,
    routePreloaders.LicensePage,
    routePreloaders.RegularProcedure,
    routePreloaders.Communications,
    routePreloaders.MailPage,
    routePreloaders.SalaryList,
  ],
  planilla: [
    routePreloaders.PayrollPage,
    routePreloaders.SalaryList,
    routePreloaders.PayrollMayBridge,
    routePreloaders.SalaryDetail,
    routePreloaders.MessagePage,
  ],
  cocina: [
    routePreloaders.Kitchen,
    routePreloaders.FormMealOrder,
    routePreloaders.ListMealOrder,
    routePreloaders.KitchenHistory,
  ],
  'mis-tareas': [
    routePreloaders.MyTasks,
    routePreloaders.ListPersonalTask,
    routePreloaders.RecaudadorGrandeLayout,
    routePreloaders.PreLiquidationPage,
    routePreloaders.PreLiquidationStageDetailPage,
    routePreloaders.LiquidationRequestPage,
    routePreloaders.TaskForReview,
    routePreloaders.AdministrativeTasks,
  ],
  'mis-reportes': [
    routePreloaders.ListPersonalReports,
    routePreloaders.ReportPersonalTask,
  ],
  especialidades: [
    routePreloaders.Specialities,
    routePreloaders.Stage,
    routePreloaders.Project,
    routePreloaders.BudgetsPage,
    routePreloaders.BasicsPage,
  ],
  'control-asistencia': [
    routePreloaders.ControlAttendanceLayout,
    routePreloaders.Attendance,
    routePreloaders.AttendanceIncidents,
    routePreloaders.AttendanceReconciliation,
  ],
  rotaciones: [
    routePreloaders.DutyRotationsLayout,
    routePreloaders.MyDutyRotations,
    routePreloaders.DutyRotationsConfiguration,
    routePreloaders.DutyRotationsOperationalReport,
    routePreloaders.DutyRotationAttendanceRepair,
  ],
  'control-puerta': [
    routePreloaders.GateControlLayout,
    routePreloaders.GateControl,
  ],
  empresas: [
    routePreloaders.Company,
    routePreloaders.CompanyInformation,
    routePreloaders.CorporateArchive,
    routePreloaders.Consortium,
  ],
  grupos: [
    routePreloaders.Group,
    routePreloaders.TechnicalOfficeProjectsWorkspace,
    routePreloaders.MeetingWorkspace,
    routePreloaders.ProgressReportsWorkspace,
    routePreloaders.CalendarWorkspace,
  ],
  'indice-general': [
    routePreloaders.GeneralIndex,
    routePreloaders.Contracts,
    routePreloaders.ContractsLevels,
  ],
  tutorials: [routePreloaders.VideoTutorials, routePreloaders.VideoList],
  factura: [routePreloaders.CustomizableInvoice],
  metrados: [routePreloaders.MetradoStructures],
  system: [
    routePreloaders.SystemLayout,
    routePreloaders.SystemHealthPage,
    routePreloaders.SystemSocketUsersPage,
    routePreloaders.AuditLogsPage,
    routePreloaders.FrontendLogsPage,
  ],
};

export const preloadRouteChunk = (route: string) => {
  const normalizedRoute = route.replace(/^\/+/, '').split(/[/?#]/)[0];

  const loaders = preloadGroups[normalizedRoute];
  if (!loaders) return;

  loaders.forEach(loader => {
    void loader();
  });
};

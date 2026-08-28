import userRouter from '@/routes/users.routes';
import authRouter from '@/routes/auth.routes';
import projectRouter from '@/routes/projects.routes';
import subTaskRouter from '@/routes/subtasks.routes';
import profileRouter from '@/routes/profile.routes';
import speacilitiesRouter from '@/routes/specialities.routes';
import filesRouter from '@/routes/files.routes';
import reportsRouter from '@/routes/reports.routes';
import feedbacksRouter from '@/routes/feedbacks.routes';
import duplicatesRouter from '@/routes/duplicates.routes';
import downloadRouter from '@/routes/download.routes';
import stagesRouter from '@/routes/stages.routes';
import sectorRouter from '@/routes/sector.routes';
import typeSpecialityRouter from '@/routes/typeSpecialities.routes';
import levelsRouter from '@/routes/levels.routes';
import listRouter from '@/routes/list.routes';
import MailRouter from '@/routes/mail.routes';
import licenseRouter from '@/routes/licenses.routes';
import productionBonusRouter from '@/routes/productionBonus.routes';
import metradosRouter from '@/routes/metrados.routes';
import companiesRouter from '@/routes/companies.routes';
import specialistRouter from '@/routes/specialist.routes';
import areaSpecialtyRouter from '@/routes/areaSpecialty.routes';
import areaSpecialtyListRouter from '@/routes/areaSpecialtyList.routes';
import trainingSpecialtyRouter from '@/routes/trainingSpecialty.routes';
import trainingSpecialtyListRouter from '@/routes/trainingSpecialtyList.routes';
import workStationRouter from '@/routes/workStation.routes';
import equipmentRouter from '@/routes/equipment.routes';
import contractRoutes from '@/routes/contract.routes';
import consortiumRoutes from '@/routes/consortium.routes';
import groupsRoutes from '@/routes/groups.routes';
import payMailRoutes from '@/routes/paymail.routes';
import AttendanceGroupRoutes from '@/routes/attendanceGroup.routes';
import DutyRoutes from '@/routes/duty.routes';
import DutyMembersRoutes from '@/routes/dutyMembers.routes';
import roleRoutes from '@/routes/role.routes';
import BasiclevelsRoutes from '@/routes/basiclevels.routes';
import BasicTasksRoutes from '@/routes/basictask.routes';
import PDFGenerateRouter from '@/routes/pdfgenerate.routes';
import EncryptRouter from '@/routes/encrypt.routes';
import ProfessionRouter from '@/routes/profession.routes';
import OfficeRouter from '@/routes/office.routes';
import ListSpecialtiesRoutes from '@/routes/ListSpecialties.routes';
import AsitecRoutes from '@/routes/asitec.routes';
import PhasesRoutes from '@/routes/phases.routes';
import FolderVideosRoutes from '@/routes/folderVideos.routes';
import VideoRoutes from '@/routes/video.routes';
import tutorialMediaRoutes from '@/routes/tutorialMedia.routes';
import PayrollsRoutes from '@/routes/payrolls.routes';
import DivisionRoutes from '@/routes/division.routes';
import OrgRoutes from '@/routes/org.routes';
import OperationalTasksRoutes from '@/routes/operationaltask.routes';
import kitchenRoutes from '@/routes/kitchen.routes';
import dutyRotationsRoutes from '@/routes/dutyRotations.routes';
import gateControlRoutes from '@/routes/gateControl.routes';
import attendanceControlRoutes from '@/routes/attendanceControl.routes';
import meetingUnitsRoutes from '@/routes/meetingUnits.routes';
import meetingsRoutes from '@/routes/meetings.routes';
import meetingExternalContactsRoutes from '@/routes/meetingExternalContacts.routes';
import progressReportsRoutes from '@/routes/progressReports.routes';
import reportItemTemplatesRoutes from '@/routes/reportItemTemplates.routes';
import reportIndexTemplatesRoutes from '@/routes/reportIndexTemplates.routes';
import commitmentsRoutes from '@/routes/commitments.routes';
import calendarRoutes from '@/routes/calendar.routes';
import calendarActivitiesRoutes from '@/routes/calendarActivities.routes';
import auditLogRoutes from '@/routes/auditLog.routes';
import frontendLogRoutes from '@/routes/frontendLog.routes';
import healthRouter from '@/routes/health.routes';
import systemHealthRouter from '@/routes/systemHealth.routes';
import systemSocketUsersRouter from '@/routes/systemSocketUsers.routes';
import basicResourcesRouter from '@/modules/basic-resources/basicResources.routes';
import documentComposerRouter from '@/modules/document-composer/documentComposer.routes';
import contractDocumentsRouter from '@/modules/contract-documents/contractDocuments.routes';
import taskDocumentsRouter from '@/modules/task-documents/taskDocuments.routes';
import desktopDocumentsRouter from '@/modules/desktop-documents/desktopDocuments.routes';
import liquidationsRouter from '@/modules/liquidations/liquidations.routes';
import corporateArchiveRouter from '@/modules/corporate-archive/corporateArchive.routes';

export const routesConfig = [
  { path: '/health', router: healthRouter },
  { path: '/auth', router: authRouter },
  { path: '/users', router: userRouter },
  { path: '/projects', router: projectRouter },
  { path: '/subtasks', router: subTaskRouter },
  { path: '/profile', router: profileRouter },
  { path: '/specialities', router: speacilitiesRouter },
  { path: '/files', router: filesRouter },
  { path: '/reports', router: reportsRouter },
  { path: '/feedbacks', router: feedbacksRouter },
  { path: '/duplicates', router: duplicatesRouter },
  { path: '/download', router: downloadRouter },
  { path: '/stages', router: stagesRouter },
  { path: '/typespecialities', router: typeSpecialityRouter },
  { path: '/sector', router: sectorRouter },
  { path: '/levels', router: levelsRouter },
  { path: '/list', router: listRouter },
  { path: '/license', router: licenseRouter },
  { path: '/production-bonus', router: productionBonusRouter },
  { path: '/metrados', router: metradosRouter },
  { path: '/mail', router: MailRouter },
  { path: '/paymail', router: payMailRoutes },
  { path: '/companies', router: companiesRouter },
  { path: '/specialists', router: specialistRouter },
  { path: '/areaSpecialty', router: areaSpecialtyRouter },
  { path: '/trainingSpecialty', router: trainingSpecialtyRouter },
  { path: '/areaSpecialtyList', router: areaSpecialtyListRouter },
  { path: '/trainingSpecialtyList', router: trainingSpecialtyListRouter },
  { path: '/workStation', router: workStationRouter },
  { path: '/equipment', router: equipmentRouter },
  { path: '/contract', router: contractRoutes },
  { path: '/consortium', router: consortiumRoutes },
  { path: '/groups', router: groupsRoutes },
  { path: '/attendanceGroup', router: AttendanceGroupRoutes },
  { path: '/duty', router: DutyRoutes },
  { path: '/dutyMembers', router: DutyMembersRoutes },
  { path: '/role', router: roleRoutes },
  { path: '/basiclevels', router: BasiclevelsRoutes },
  { path: '/basictasks', router: BasicTasksRoutes },
  { path: '/generate-pdf', router: PDFGenerateRouter },
  { path: '/encrypt', router: EncryptRouter },
  { path: '/profession', router: ProfessionRouter },
  { path: '/office', router: OfficeRouter },
  { path: '/listSpecialties', router: ListSpecialtiesRoutes },
  { path: '/asitec', router: AsitecRoutes },
  { path: '/phases', router: PhasesRoutes },
  { path: '/folderVideos', router: FolderVideosRoutes },
  { path: '/video', router: VideoRoutes },
  { path: '/tutorial-media', router: tutorialMediaRoutes },
  { path: '/payrolls', router: PayrollsRoutes },
  { path: '/division', router: DivisionRoutes },
  { path: '/org', router: OrgRoutes },
  { path: '/operationaltasks', router: OperationalTasksRoutes },
  { path: '/kitchen', router: kitchenRoutes },
  { path: '/duty-rotations', router: dutyRotationsRoutes },
  { path: '/gate-control', router: gateControlRoutes },
  { path: '/attendance-control', router: attendanceControlRoutes },
  { path: '/meeting-units', router: meetingUnitsRoutes },
  { path: '/basic-resources', router: basicResourcesRouter },
  { path: '/document-composer', router: documentComposerRouter },
  { path: '/contract-documents', router: contractDocumentsRouter },
  { path: '/task-documents', router: taskDocumentsRouter },
  { path: '/desktop', router: desktopDocumentsRouter },
  { path: '/liquidations', router: liquidationsRouter },
  { path: '/corporate-archive', router: corporateArchiveRouter },
  { path: '/meetings', router: meetingsRoutes },
  { path: '/meeting-external-contacts', router: meetingExternalContactsRoutes },
  { path: '/progress-reports', router: progressReportsRoutes },
  { path: '/report-item-templates', router: reportItemTemplatesRoutes },
  { path: '/report-index-templates', router: reportIndexTemplatesRoutes },
  { path: '/commitments', router: commitmentsRoutes },
  { path: '/calendar', router: calendarRoutes },
  { path: '/calendar-activities', router: calendarActivitiesRoutes },
  { path: '/audit-logs', router: auditLogRoutes },
  { path: '/system/health', router: systemHealthRouter },
  { path: '/system/socket-users', router: systemSocketUsersRouter },
  { path: '/system/frontend-logs', router: frontendLogRoutes },
];

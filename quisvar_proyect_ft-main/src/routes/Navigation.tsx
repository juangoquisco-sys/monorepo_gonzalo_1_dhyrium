import { Suspense, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import {
  Attendance,
  AttendanceIncidents,
  AttendanceReconciliation,
  AuditLogsPage,
  BasicsPage,
  BudgetsPage,
  CommingSoon,
  Company,
  CompanyInformation,
  CorporateArchive,
  Consortium,
  Contracts,
  ContractsLevels,
  CustomizableInvoice,
  DetailsContracts,
  DutyRotationAttendanceRepair,
  GeneralIndex,
  Group,
  GroupContent,
  GroupDaily,
  GroupProjects,
  GroupWeekend,
  Home,
  LicensePage,
  ListPersonalTask,
  LiquidationRequestPage,
  Login,
  MailPage,
  MessagePage,
  NotFound,
  NotificationsList,
  Project,
  Specialist,
  SpecialistInformation,
  Specialities,
  Stage,
  InternalUsersDirectory,
  SystemHealthPage,
  SystemLayout,
  SystemSocketUsersPage,
  Task,
  UsersDirectory,
  GeneralData,
  UserCenter,
  Procedure,
  RolesAndPermissions,
  GroupAttendanceFilter,
  GroupMeetingFilter,
  RegularProcedure,
  Communications,
  CommunicationInfo,
  RegularProcedureInfo,
  RecoveryPassword,
  TaskBasics,
  GroupTaskFilter,
  VideoTutorials,
  VideoList,
  ListPersonalReports,
  ReportPersonalTask,
  SalaryList,
  MyTasks,
  PreLiquidationPage,
  PreLiquidationStageDetailPage,
  RecaudadorGrandeLayout,
  AdministrativeTasks,
  TaskForReview,
  Kitchen,
  KitchenHistory,
  ListMealOrder,
  FormMealOrder,
  OfficeStats,
  OfficeMeetings,
  OfficeMeetingsDetail,
  OfficeProjects,
  MeetingWorkspace,
  OfficeProjectsAdmin,
  ProgressReportsWorkspace,
  ProgressReportEditor,
  CalendarWorkspace,
  CommitmentProposalsWorkspace,
  CommitmentsBoardWorkspace,
  TechnicalOfficeProjectsWorkspace,
  ControlAttendanceLayout,
  DutyRotationsConfiguration,
  DutyRotationsLayout,
  DutyRotationsOperationalReport,
  FrontendLogsPage,
  GateControl,
  GateControlLayout,
  MetradoStructures,
  MyDutyRotations,
  OrgChart,
  PayrollElaboration,
  PayrollMayBridge,
  PayrollPersonnelRequests,
  PayrollSelfSubmission,
  ProductionBonusPage,
  SalaryDetail,
} from './lazyRouteModules';
import ProtectedRole from '@/guards/ProtectedRole/ProtectedRole';
import { ProtectedRoute } from '@/guards/ProtectedRoute/ProtectedRoute';
import ProtectedSystemUser from '@/guards/ProtectedSystemUser/ProtectedSystemUser';
import NavigationSubMenu from './NavigationSubMenu';
import { ProjectProvider } from '@/pages/specialities/pages/project/context/ProjectContext';
import RouteLazyFallback from './RouteLazyFallback';
import RouteLogger from './RouteLogger';
import DhyriumDesktopPage from '@/pages/dhyriumDesktop/DhyriumDesktopPage';

const PublicRouteSuspense = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<RouteLazyFallback />}>{children}</Suspense>
);

const Navigation = () => {
  return (
    <>
      <HashRouter>
        <RouteLogger />
        <Routes>
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/login">
            <Route
              index
              element={
                <PublicRouteSuspense>
                  <Login />
                </PublicRouteSuspense>
              }
            />
            <Route
              path="recuperar-contraseña/:token"
              element={
                <PublicRouteSuspense>
                  <RecoveryPassword />
                </PublicRouteSuspense>
              }
            />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<Home />} />
            <Route path="/dhyrium-desktop" element={<DhyriumDesktopPage />} />
            {/* <Route path="/dashboard" element={<Dashboard />} /> */}

            <Route element={<ProtectedRole menuAccess="centro-de-usuarios" />}>
              <Route path="/centro-de-usuarios" element={<UserCenter />}>
                <Route
                  index
                  element={<Navigate to="usuarios/internos" replace />}
                />
                <Route
                  path="lista-de-usuarios"
                  element={<Navigate to="usuarios/internos" replace />}
                />
                <Route path="usuarios" element={<UsersDirectory />}>
                  <Route
                    index
                    element={<Navigate to="internos" replace />}
                  />
                  <Route path="internos" element={<InternalUsersDirectory />} />
                  <Route path="externos" element={<Specialist />}>
                    <Route
                      path="informacion/:infoId"
                      element={<SpecialistInformation />}
                    />
                  </Route>
                </Route>
                <Route
                  path="roles-y-permisos"
                  element={<RolesAndPermissions />}
                />
                <Route path="organigrama" element={<OrgChart />} />
                <Route
                  path="especialistas/*"
                  element={<Navigate to="usuarios/externos" replace />}
                />
              </Route>
            </Route>

            <Route element={<ProtectedRole menuAccess="tramites" />}>
              <Route path="/tramites" element={<Procedure />}>
                <Route index element={<NavigationSubMenu />} />
                <Route path="salidas" element={<LicensePage />} />
                <Route
                  element={
                    <ProtectedRole
                      menuAccess="tramites"
                      subMenuAccess="bono-produccion"
                    />
                  }
                >
                  <Route
                    path="bono-produccion"
                    element={<ProductionBonusPage />}
                  />
                </Route>
                <Route path="tramite-regular" element={<RegularProcedure />}>
                  <Route path=":messageId" element={<RegularProcedureInfo />} />
                </Route>
                <Route path="comunicado" element={<Communications />}>
                  <Route path=":messageId" element={<CommunicationInfo />} />
                </Route>
                <Route path="tramite-de-pago">
                  <Route path="" element={<MailPage />}>
                    <Route path=":paymessageId" element={<MessagePage />}>
                      <Route
                        path="report/:reportId"
                        element={<ReportPersonalTask />}
                      />
                    </Route>
                  </Route>
                  <Route
                    element={
                      <ProtectedRole
                        menuAccess="tramites"
                        subMenuAccess="planilla"
                        typeRol="MOD"
                      />
                    }
                  >
                    <Route path="planilla" element={<SalaryList />}>
                      <Route
                        path=":salaryId/recepcion"
                        element={<PayrollPersonnelRequests />}
                      />
                      <Route path="puente-mayo" element={<PayrollMayBridge />}>
                        <Route path="tarea/:taskId" element={<Task />} />
                      </Route>
                      <Route
                        path=":salaryId/elaboracion"
                        element={<PayrollElaboration />}
                      >
                        <Route path="tarea/:taskId" element={<Task />} />
                      </Route>
                      <Route path=":salaryId" element={<SalaryDetail />}>
                        <Route path=":paymessageId" element={<MessagePage />}>
                          <Route
                            path="report/:reportId"
                            element={<ReportPersonalTask />}
                          />
                        </Route>
                      </Route>
                    </Route>
                  </Route>
                </Route>
              </Route>
            </Route>
            <Route
              element={
                <ProtectedRole menuAccess="tramites" subMenuAccess="planilla" />
              }
            >
              <Route
                path="/planilla/mi-solicitud"
                element={<PayrollSelfSubmission />}
              />
            </Route>
            <Route
              element={
                <ProtectedRole
                  menuAccess="tramites"
                  subMenuAccess="planilla"
                  typeRol="MOD"
                />
              }
            >
              <Route path="/planilla" element={<SalaryList />}>
                <Route
                  path=":salaryId/recepcion"
                  element={<PayrollPersonnelRequests />}
                />
                <Route path="puente-mayo" element={<PayrollMayBridge />}>
                  <Route path="tarea/:taskId" element={<Task />} />
                </Route>
                <Route
                  path=":salaryId/elaboracion"
                  element={<PayrollElaboration />}
                >
                  <Route path="tarea/:taskId" element={<Task />} />
                </Route>
                <Route path=":salaryId" element={<SalaryDetail />}>
                  <Route path=":paymessageId" element={<MessagePage />}>
                    <Route
                      path="report/:reportId"
                      element={<ReportPersonalTask />}
                    />
                  </Route>
                </Route>
              </Route>
            </Route>
            <Route element={<ProtectedRole menuAccess="cocina" />}>
              <Route path="/cocina" element={<Kitchen />}>
                <Route index element={<NavigationSubMenu />} />
                <Route path="formulario" element={<FormMealOrder />} />
                <Route path="lista" element={<ListMealOrder />} />
                <Route
                  element={
                    <ProtectedRole
                      menuAccess="cocina"
                      subMenuAccess="historial"
                    />
                  }
                >
                  <Route path="historial" element={<KitchenHistory />} />
                </Route>
                {/* <Route path="formulario" element={<ListMealOrder />} /> */}
              </Route>
            </Route>
            <Route element={<ProtectedRole menuAccess="mis-tareas" />}>
              <Route path="/mis-tareas" element={<MyTasks />}>
                <Route index element={<NavigationSubMenu />} />
                <Route
                  element={
                    <ProtectedRole
                      menuAccess="mis-tareas"
                      subMenuAccess="tecnicas"
                    />
                  }
                >
                  <Route path="tecnicas" element={<ListPersonalTask />}>
                    <Route path="tarea/:taskId" element={<Task />} />
                  </Route>
                  <Route
                    path="tecnicas/recaudador-grande"
                    element={<RecaudadorGrandeLayout />}
                  >
                    <Route
                      index
                      element={<Navigate to="pre-liquidacion" replace />}
                    />
                    <Route
                      path="pre-liquidacion"
                      element={<PreLiquidationPage />}
                    />
                    <Route
                      path="pre-liquidacion/etapa/:stageId"
                      element={<PreLiquidationStageDetailPage />}
                    >
                      <Route path="tarea/:taskId" element={<Task />} />
                    </Route>
                    <Route
                      path="liquidacion"
                      element={<LiquidationRequestPage />}
                    />
                  </Route>
                </Route>
                <Route
                  element={
                    <ProtectedRole
                      menuAccess="mis-tareas"
                      subMenuAccess="para-revisar"
                    />
                  }
                >
                  <Route path="para-revisar" element={<TaskForReview />}>
                    <Route path="tarea/:taskId" element={<Task />} />
                  </Route>
                </Route>
                <Route
                  element={
                    <ProtectedRole
                      menuAccess="mis-tareas"
                      subMenuAccess="administrativas"
                    />
                  }
                >
                  <Route
                    path="administrativas"
                    element={<AdministrativeTasks />}
                  />
                </Route>
              </Route>
              <Route path="/mis-reportes" element={<ListPersonalReports />}>
                <Route path=":reportId" element={<ReportPersonalTask />}>
                  <Route path="tarea/:taskId" element={<Task />} />
                </Route>
              </Route>
            </Route>
            <Route element={<ProtectedRole menuAccess="especialidades" />}>
              <Route path="/especialidades" element={<Specialities />}>
                <Route path="proyecto/:projectId" element={<Stage />}>
                  <Route
                    path="etapa/:stageId"
                    element={
                      <ProjectProvider>
                        <Project />
                      </ProjectProvider>
                    }
                  >
                    <Route
                      index
                      element={<Navigate to="presupuestos" replace />}
                    />
                    <Route path="detalles" element={<GeneralData />} />
                    <Route path="basicos" element={<BasicsPage />}>
                      <Route path="tarea/:taskId" element={<TaskBasics />} />
                    </Route>
                    <Route path="presupuestos" element={<BudgetsPage />}>
                      <Route path="tarea/:taskId" element={<Task />} />
                    </Route>
                  </Route>
                </Route>
              </Route>
            </Route>

            <Route
              path="/asistencia"
              element={<Navigate to="/control-asistencia/registro" replace />}
            />

            <Route element={<ProtectedRole menuAccess="control-asistencia" />}>
              <Route
                path="/control-asistencia"
                element={<ControlAttendanceLayout />}
              >
                <Route index element={<NavigationSubMenu />} />
                <Route
                  element={
                    <ProtectedRole
                      menuAccess="control-asistencia"
                      subMenuAccess="registro"
                    />
                  }
                >
                  <Route path="registro" element={<Attendance />} />
                </Route>
                <Route
                  element={
                    <ProtectedRole
                      menuAccess="control-asistencia"
                      subMenuAccess="incidencias"
                    />
                  }
                >
                  <Route path="incidencias" element={<AttendanceIncidents />} />
                </Route>
                <Route
                  element={
                    <ProtectedRole
                      menuAccess="control-asistencia"
                      subMenuAccess="reconciliar-faltas"
                    />
                  }
                >
                  <Route
                    path="reconciliar-faltas"
                    element={<AttendanceReconciliation />}
                  />
                </Route>
              </Route>
            </Route>

            <Route element={<ProtectedRole menuAccess="rotaciones" />}>
              <Route path="/rotaciones" element={<DutyRotationsLayout />}>
                <Route index element={<NavigationSubMenu />} />
                <Route
                  element={
                    <ProtectedRole
                      menuAccess="rotaciones"
                      subMenuAccess="mis-turnos"
                    />
                  }
                >
                  <Route path="mis-turnos" element={<MyDutyRotations />} />
                  <Route
                    path="reparacion-asistencia"
                    element={<DutyRotationAttendanceRepair />}
                  />
                </Route>
                <Route
                  element={
                    <ProtectedRole
                      menuAccess="rotaciones"
                      subMenuAccess="configuracion"
                    />
                  }
                >
                  <Route
                    path="configuracion"
                    element={<DutyRotationsConfiguration />}
                  />
                </Route>
                <Route
                  element={
                    <ProtectedRole
                      menuAccess="rotaciones"
                      subMenuAccess="reporte-operativo"
                    />
                  }
                >
                  <Route
                    path="reporte-operativo"
                    element={<DutyRotationsOperationalReport />}
                  />
                </Route>
              </Route>
            </Route>

            <Route element={<ProtectedRole menuAccess="control-puerta" />}>
              <Route path="/control-puerta" element={<GateControlLayout />}>
                <Route index element={<NavigationSubMenu />} />
                <Route
                  element={
                    <ProtectedRole
                      menuAccess="control-puerta"
                      subMenuAccess="monitor"
                    />
                  }
                >
                  <Route
                    path="monitor"
                    element={<GateControl view="monitor" />}
                  />
                </Route>
                <Route
                  element={
                    <ProtectedRole
                      menuAccess="control-puerta"
                      subMenuAccess="regularizaciones"
                    />
                  }
                >
                  <Route
                    path="regularizaciones"
                    element={<GateControl view="regularizaciones" />}
                  />
                </Route>
                <Route
                  element={
                    <ProtectedRole
                      menuAccess="control-puerta"
                      subMenuAccess="historial"
                    />
                  }
                >
                  <Route
                    path="historial"
                    element={<GateControl view="historial" />}
                  />
                </Route>
                <Route
                  element={
                    <ProtectedRole
                      menuAccess="control-puerta"
                      subMenuAccess="mi-control"
                    />
                  }
                >
                  <Route
                    path="mi-control"
                    element={<GateControl view="mi-control" />}
                  />
                </Route>
              </Route>
            </Route>

            <Route element={<ProtectedRole menuAccess="empresas" />}>
              <Route path="/empresas" element={<Company />}>
                <Route
                  path="informacion/:infoId"
                  element={<CompanyInformation />}
                />
                <Route path="consorcio/:id" element={<Consortium />} />
                <Route
                  path="archivo/:entityKind/:entityId"
                  element={<CorporateArchive />}
                />
                <Route
                  path="archivo/:entityKind/:entityId/carpeta/:folderId"
                  element={<CorporateArchive />}
                />
              </Route>
            </Route>

            <Route element={<ProtectedRole menuAccess="grupos" />}>
              <Route path="/grupos" element={<Group />}>
                <Route
                  index
                  element={
                    <Navigate
                      to="/grupos/oficinas/workspace?tab=proyectos"
                      replace
                    />
                  }
                />
                <Route
                  path="oficinas/:unitId"
                  element={<OfficeMeetingsDetail />}
                />
                <Route
                  path="reuniones/:meetingId"
                  element={<MeetingWorkspace />}
                />
                <Route
                  path="proyectos-oficina"
                  element={<OfficeProjectsAdmin />}
                />
                <Route
                  path="oficinas/proyectos-tecnicos"
                  element={<TechnicalOfficeProjectsWorkspace />}
                />
                <Route
                  path="oficinas/workspace"
                  element={<TechnicalOfficeProjectsWorkspace />}
                />
                <Route
                  path="mis-informes"
                  element={<ProgressReportsWorkspace />}
                />
                <Route path="calendario" element={<CalendarWorkspace />} />
                <Route
                  path="compromisos"
                  element={<CommitmentsBoardWorkspace />}
                />
                <Route
                  path="propuestas"
                  element={<CommitmentProposalsWorkspace />}
                />
                <Route
                  path="informes/:reportId"
                  element={<ProgressReportEditor />}
                />
                <Route
                  path="resumen/reuniones"
                  element={<GroupMeetingFilter />}
                ></Route>
                <Route path="resumen/tareas" element={<GroupTaskFilter />}>
                  <Route path="tarea/:taskId" element={<Task />} />
                </Route>
                <Route
                  path="resumen/asistencias"
                  element={<GroupAttendanceFilter />}
                ></Route>
                <Route path="oficina/:divisionId" element={<OfficeStats />}>
                  <Route
                    path="reuniones/:divisionId"
                    element={<OfficeMeetings />}
                  />
                  <Route
                    path="proyectos/:divisionId"
                    element={<OfficeProjects />}
                  />
                </Route>
                <Route
                  path="contenido/:groupId/:name"
                  element={<GroupContent />}
                >
                  <Route
                    path="proyectos/:groupId"
                    element={<GroupProjects />}
                  />
                  <Route path="reuniones/:groupId" element={<GroupDaily />} />
                  <Route path="semanal/:groupId" element={<GroupWeekend />} />
                </Route>
              </Route>
            </Route>

            <Route element={<ProtectedRole menuAccess="indice-general" />}>
              <Route path="/indice-general" element={<GeneralIndex />}>
                <Route index element={<NavigationSubMenu />} />
                <Route path="contratos" element={<Contracts />}>
                  <Route
                    path="contrato/:contractId"
                    element={<ContractsLevels />}
                  >
                    <Route path="detalles" element={<DetailsContracts />} />
                  </Route>
                </Route>
              </Route>
            </Route>

            <Route>
              <Route
                path="/lista-de-notificaciones"
                element={<NotificationsList />}
              />
            </Route>
            <Route element={<ProtectedRole menuAccess="tutorials" />}>
              <Route path="/tutorials" element={<VideoTutorials />}>
                <Route path="list/:listId/:name" element={<VideoList />} />
              </Route>
            </Route>
            <Route path="/factura" element={<CustomizableInvoice />} />
            <Route
              element={<ProtectedRole menuAccess="metrados" typeRol="MOD" />}
            >
              <Route path="/metrados" element={<MetradoStructures />} />
            </Route>
            <Route element={<ProtectedSystemUser />}>
              <Route path="/system" element={<SystemLayout />}>
                <Route index element={<Navigate to="health" replace />} />
                <Route path="health" element={<SystemHealthPage />} />
                <Route
                  path="socket-users"
                  element={<SystemSocketUsersPage />}
                />
                <Route path="audit-logs" element={<AuditLogsPage />} />
                <Route path="frontend-logs" element={<FrontendLogsPage />} />
              </Route>
            </Route>
          </Route>
          <Route
            path="/reportes"
            element={
              <PublicRouteSuspense>
                <CommingSoon />
              </PublicRouteSuspense>
            }
          />
          <Route
            path="/*"
            element={
              <PublicRouteSuspense>
                <NotFound />
              </PublicRouteSuspense>
            }
          />
        </Routes>
      </HashRouter>
    </>
  );
};

export default Navigation;

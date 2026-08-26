# Modulo: Oficinas y Reuniones

## Proposito

El modulo `grupos`, renombrado visualmente a `Oficinas y Reuniones`, centraliza el seguimiento operativo de unidades organizacionales. Su objetivo es que gerencia pueda entrar a una unidad, ver sus proyectos activos, preparar o ejecutar reuniones presenciales, revisar informes de avance, registrar compromisos y consultar actividades de calendario.

El modulo no reemplaza los datos legacy de `Group`, `Duty`, `DutyMembers` o `DutyTasks`. Esos modelos quedan como compatibilidad historica. La base nueva del modulo es:

- `OrganizationalUnit`
- `OrganizationalMembership`
- `OrgUnitProjectFocus`
- `Meeting`
- `ProgressReport`
- `Commitment`
- `CalendarActivity`

La decision central es que una reunion puede ser administrativa o de proyecto. Por eso los proyectos son contexto opcional de la reunion, no una condicion obligatoria para crearla.

## Usuarios y permisos

El acceso funcional usa el sistema actual de permisos por menu:

- Menu: `grupos`
- Roles: `MOD`, `MEMBER`, `VIEWER`, `USER`

No se usan `GERENTE`, `JEFE`, `COORDINADOR`, `ESPECIALISTA`, `ASISTENTE` o `APOYO` como permisos funcionales. Esos valores de `OrganizationalMembershipRole` son metadata organizacional.

Reglas principales:

- `MOD`: administra el modulo completo. Puede crear reuniones, iniciar/finalizar, editar asistencia, minutas, compromisos, informes grupales, indices y proyectos por unidad.
- `MOD de unidad`: no es un `MenuRol`; es una membresia con `canManageUnitProjects = true`. Puede administrar proyectos, miembros, reuniones, actividades e informes grupales solo de su unidad.
- `MEMBER` / `USER`: puede crear y editar sus informes propios, participar en informes de equipo, proponer compromisos y actualizar estados de compromisos donde este asignado.
- `VIEWER`: solo lectura.

Archivo principal de permisos contextuales:

- `src/services/meetingPermission.services.ts`

Validaciones importantes:

- `assertCanReadUnit`: valida lectura de una unidad.
- `assertCanManageUnitProjects`: valida MOD global o MOD local de unidad.
- `assertCanCreateReport`: valida creacion de informes por tipo de presentador.
- `assertCanEditReport`: limita informes propios salvo MOD global o MOD local.
- `assertCanCreateCommitment`: limita compromisos oficiales.
- `assertCanProposeInUnit`: permite propuestas de compromisos a miembros de la unidad.
- `assertCanUpdateCommitmentStatus`: permite actualizar estado si el usuario esta asignado.

## Flujos principales

### 1. Vista global de unidades

1. El usuario entra a `/grupos`.
2. El backend consulta unidades desde `OrganizationalUnit`.
3. La vista muestra resumen global: unidades, proyectos activos, compromisos abiertos y reuniones proximas.
4. El usuario puede filtrar por tipo de unidad o buscar por nombre.
5. Al seleccionar una unidad entra al dashboard de esa unidad.

Resultado: gerencia obtiene una entrada rapida al estado de cada gerencia, oficina o grupo que el organigrama permita mostrar.

### 2. Administracion de proyectos por unidad

1. Un `MOD` global o MOD local de unidad entra a `Proyectos por oficina`.
2. Busca proyectos candidatos por CUI, nombre corto, proyecto o etapa.
3. Enlaza un proyecto a una unidad usando `OrgUnitProjectFocus`.
4. Marca el enlace como activo o inactivo.
5. Puede desenlazar el proyecto si ya no corresponde a esa unidad.

Regla actual: un proyecto debe estar enlazado a una sola unidad activa. Si ya esta enlazado a otra unidad, la UI debe mostrarlo como ocupado y no ofrecer enlace directo.

### 3. Nueva reunion presencial

1. El usuario crea una reunion desde una unidad.
2. El titulo por defecto combina unidad, fecha y hora, pero es editable.
3. Los proyectos son opcionales.
4. Se pueden agregar temas de agenda administrativos o generales.
5. Se precargan miembros de la unidad como asistentes.
6. Se pueden agregar usuarios invitados de otras unidades.
7. Se pueden agregar contactos externos reutilizables.
8. La reunion puede guardarse como borrador o iniciarse.

Resultado: una reunion puede tratar proyectos, temas administrativos o ambos.

### 4. Workspace de reunion

1. El workspace abre con `Agenda general`.
2. La asistencia esta ligada a la reunion, no a proyectos.
3. Los proyectos seleccionados aparecen como contexto opcional.
4. Al elegir un proyecto se muestran sus informes, compromisos y minuta de proyecto.
5. El usuario puede volver a agenda general desde el panel de agenda.
6. La minuta general y la minuta por proyecto se guardan separadas.
7. El boton `Finalizar reunion` cambia el estado de la reunion a terminada.

Resultado: la reunion queda como acta de trabajo, con participantes, minutas, agenda, compromisos e informes consultables.

### 5. Informes de avance

1. Cada miembro puede preparar informes antes de una reunion.
2. Lo comun es un informe por persona y por proyecto.
3. Puede haber varios borradores por proyecto.
4. Solo puede existir un informe `READY` por `unitId + projectId + presenterKey`.
5. El presentador puede ser:
   - `USER`: una persona.
   - `TEAM`: varias personas.
   - `GROUP`: toda la unidad.
6. Los informes `GROUP` requieren `MOD` global o MOD local de unidad.

Resultado: al iniciar una reunion, los informes listos aparecen automaticamente en el proyecto correspondiente.

### 6. Indices reutilizables de informes

Los informes pueden iniciar desde indices reutilizables:

- Globales: disponibles para todos, creados por MOD global.
- De unidad: disponibles dentro de una unidad, creados por MOD global o MOD local.
- Personales: disponibles solo para el usuario creador.

Ejemplos:

- `Especialidades ASITEC`
- `Basicos ASITEC`

El editor permite importar un indice o guardar la matriz actual como nuevo indice.

### 7. Compromisos

Los compromisos pueden ser:

- Generales de una unidad.
- Asociados a un proyecto.
- Asociados a una reunion.
- Propuestos antes o despues de una reunion.

Un compromiso oficial puede asignarse a:

- Una persona.
- Varias personas.
- Toda la unidad.

Los externos invitados a una reunion no son responsables de compromisos en v1.

Estados relevantes:

- `PENDING`
- `IN_PROGRESS`
- `DONE`
- `POSTPONED`
- `CANCELLED`

Los compromisos cumplidos deben mostrarse separados al final, similar a una lista de tareas completadas.

### 8. Propuestas de compromisos

1. Un miembro crea una propuesta en una unidad donde pertenece.
2. La propuesta nace con `confirmationStatus = PROPOSED`.
3. Un MOD global o MOD local puede confirmar, rechazar o vincularla a una reunion.
4. Al confirmarse, se vuelve compromiso oficial.

Resultado: los miembros pueden preparar compromisos sin convertirlos inmediatamente en acuerdos oficiales.

### 9. Calendario

El calendario normaliza tres tipos de items:

- `MEETING`
- `ACTIVITY`
- `COMMITMENT`

Scopes soportados:

- Persona.
- Unidad.
- Proyecto.

Las actividades pueden ser de unidad o de proyecto. Si se crea una actividad con `projectId`, el backend valida que el proyecto este enlazado activamente a esa unidad.

## Modelo de datos

### OrganizationalUnit

Representa una unidad del organigrama.

Campos importantes:

- `name`: nombre visible.
- `codemap`: codigo estable o referencia legacy.
- `type`: tipo de unidad.
- `parentId`: jerarquia.
- `isActive`: visibilidad operativa.

Tipos:

- `GERENCIA`
- `OFICINA`
- `GRUPO`

Nota operativa: el backfill legacy puede crear demasiadas unidades. En produccion debe revisarse el organigrama real antes de ejecutar o conservar ese resultado.

### OrganizationalMembership

Relaciona usuarios con unidades.

Campos importantes:

- `userId`
- `unitId`
- `role`: metadata organizacional.
- `isPrimary`
- `canManageUnitProjects`: permiso local para administrar esa unidad.
- `startDate`
- `endDate`

### OrgUnitProjectFocus

Representa el enlace entre una unidad y un proyecto/etapa.

Campos importantes:

- `unitId`
- `projectId`
- `stageId?`
- `shortName?`
- `isActive`

Se usa para decidir que proyectos aparecen como contexto de trabajo de la unidad.

### Meeting

Representa una reunion presencial.

Campos importantes:

- `unitId`
- `title`
- `scheduledAt`
- `startedAt`
- `endedAt`
- `status`
- `createdById`

Estados:

- `DRAFT`
- `SCHEDULED`
- `LIVE`
- `ENDED`
- `CANCELLED`

### MeetingProject

Relaciona una reunion con proyectos tratados. Es opcional: una reunion administrativa puede no tener proyectos.

### MeetingParticipant

Representa asistencia de una reunion.

Campos importantes:

- `meetingId`
- `participantType`: `USER` o `EXTERNAL`.
- `origin`: `UNIT_MEMBER` o `INVITED`.
- `userId?`
- `externalContactId?`
- `status`
- `displayName`, `position`, `organization`: snapshots para actas.

Reglas:

- Debe tener `userId` o `externalContactId`, nunca ambos.
- No debe duplicarse el mismo usuario o contacto en la misma reunion.
- Invitados externos no crean permisos ni membresias.

### MeetingExternalContact

Contacto externo reutilizable para asistentes que no existen como usuarios del sistema.

Campos importantes:

- `name`
- `position`
- `organization`
- `email?`
- `phone?`
- `document?`
- `notes?`
- `isActive`

### MeetingMinute

Guarda minutas separadas.

Scopes:

- `GENERAL`
- `PROJECT`

La minuta general pertenece a la reunion. La minuta de proyecto pertenece a `meetingId + projectId`.

### MeetingAgendaItem

Tema de agenda de una reunion.

Campos importantes:

- `meetingId`
- `projectId?`
- `activityId?`
- `commitmentId?`
- `title`
- `description?`
- `minutes?`
- `scope`
- `order`
- `status`

Scopes:

- `GENERAL`
- `PROJECT`
- `ACTIVITY`
- `COMMITMENT`

### ProgressReport

Informe de avance preparado antes o durante una reunion.

Campos importantes:

- `unitId`
- `projectId`
- `meetingId?`
- `title`
- `presenterType`
- `presenterUserId?`
- `presenterKey`
- `readyKey?`
- `overallProgress`
- `status`
- `createdById`

Regla de listo:

- Varios borradores pueden compartir proyecto y presentador.
- Solo un informe puede estar `READY` por `unitId + projectId + presenterKey`.

### ProgressReportParticipant

Participantes de un informe de equipo.

Roles:

- `PRESENTER`
- `SUPPORT`

### ProgressReportItem

Fila de la matriz de informe.

Campos importantes:

- `reportId`
- `name`
- `source`
- `status`
- `progress`
- `observations`
- `order`

Fuentes:

- `PROJECT_ONLY`
- `ASITEC`
- `REUSABLE_TEMPLATE`
- `CUSTOM`

### ReportIndexTemplate

Indice reutilizable de items de informe.

Scopes:

- `GLOBAL`
- `UNIT`
- `PERSONAL`

### Commitment

Compromiso operativo.

Campos importantes:

- `unitId`
- `projectId?`
- `meetingId?`
- `title`
- `description?`
- `dueAt?`
- `status`
- `priority`
- `confirmationStatus`
- `origin`
- `proposedById?`
- `confirmedById?`
- `confirmedAt?`

### CommitmentAssignee

Responsables de un compromiso.

Roles:

- `OWNER`
- `SUPPORT`
- `UNIT`

### CalendarActivity

Actividad simple de calendario.

Campos importantes:

- `unitId`
- `projectId?`
- `meetingId?`
- `title`
- `description?`
- `startAt`
- `endAt?`
- `allDay`
- `status`
- `priority`
- `createdById`

## Backend

Rutas principales:

### Unidades y proyectos

- `GET /meeting-units/overview`
- `GET /meeting-units/project-candidates`
- `GET /meeting-units/:unitId/dashboard`
- `GET /meeting-units/:unitId/projects`
- `GET /meeting-units/:unitId/project-focus`
- `POST /meeting-units/:unitId/project-focus`
- `PATCH /meeting-units/:unitId/project-focus/:focusId`
- `DELETE /meeting-units/:unitId/project-focus/:focusId`
- `GET /meeting-units/:unitId/project-moderators`
- `PATCH /meeting-units/:unitId/project-moderators/:membershipId`
- `GET /meeting-units/:unitId/member-candidates`
- `POST /meeting-units/:unitId/members`
- `DELETE /meeting-units/:unitId/members/:membershipId`

### Reuniones

- `POST /meetings`
- `GET /meetings/:id`
- `PATCH /meetings/:id`
- `POST /meetings/:id/start`
- `POST /meetings/:id/end`
- `PUT /meetings/:id/attendance`
- `POST /meetings/:id/participants`
- `DELETE /meetings/:id/participants/:participantId`
- `GET /meetings/:id/participant-candidates`
- `PUT /meetings/:id/minutes`
- `PUT /meetings/:id/projects/:projectId/minutes`
- `POST /meetings/:id/agenda-items`
- `PATCH /meetings/:id/agenda-items/:itemId`

### Contactos externos

- `GET /meeting-external-contacts`
- `POST /meeting-external-contacts`

### Informes

- `GET /progress-reports/workspace`
- `GET /progress-reports/:id`
- `POST /progress-reports`
- `PATCH /progress-reports/:id`
- `POST /progress-reports/:id/ready`
- `POST /progress-reports/:id/save-as-template`
- `DELETE /progress-reports/:id`

### Indices de informes

- `GET /report-index-templates`
- `POST /report-index-templates`
- `PATCH /report-index-templates/:id`
- `DELETE /report-index-templates/:id`

### Compromisos

- `GET /commitments`
- `POST /commitments`
- `POST /commitments/proposals`
- `PATCH /commitments/:id`
- `POST /commitments/:id/confirm`
- `POST /commitments/:id/attach-meeting`
- `PATCH /commitments/:id/status`
- `DELETE /commitments/:id`

### Calendario

- `GET /calendar`
- `POST /calendar-activities`
- `PATCH /calendar-activities/:id`
- `DELETE /calendar-activities/:id`

Archivos principales:

- `src/routes/meetingUnits.routes.ts`
- `src/routes/meetings.routes.ts`
- `src/routes/meetingExternalContacts.routes.ts`
- `src/routes/progressReports.routes.ts`
- `src/routes/reportIndexTemplates.routes.ts`
- `src/routes/commitments.routes.ts`
- `src/routes/calendar.routes.ts`
- `src/routes/calendarActivities.routes.ts`
- `src/controllers/meetingUnits.controllers.ts`
- `src/controllers/meetings.controllers.ts`
- `src/controllers/meetingExternalContacts.controllers.ts`
- `src/controllers/progressReports.controllers.ts`
- `src/controllers/commitments.controllers.ts`
- `src/controllers/calendar.controllers.ts`
- `src/services/meetingUnits.services.ts`
- `src/services/meetings.services.ts`
- `src/services/meetingExternalContacts.services.ts`
- `src/services/progressReports.services.ts`
- `src/services/commitments.services.ts`
- `src/services/calendar.services.ts`
- `src/services/meetingPermission.services.ts`
- `src/scripts/orgBackfill.ts`

## Frontend

Ruta principal:

- `/grupos`

Subrutas principales:

- `/grupos`
- `/grupos/oficinas/:unitId`
- `/grupos/proyectos-oficina`
- `/grupos/mis-informes`
- `/grupos/informes/:projectId/preparar`
- `/grupos/reuniones/:meetingId`
- `/grupos/calendario`
- `/grupos/propuestas-compromisos`

Pantallas principales:

- `Vista general`: resumen de unidades y tarjetas por gerencia/oficina/grupo.
- `Detalle de unidad`: dashboard con proyectos activos, reuniones, miembros, informes y compromisos.
- `Proyectos por oficina`: administracion de enlaces entre unidad y proyectos.
- `Mis informes`: workspace de borradores, pendientes, listos e informes de equipo/oficina.
- `Editor de informe`: matriz de avance con indices, filas custom, participantes y estado listo.
- `Nueva reunion`: panel para titulo editable, proyectos opcionales, agenda y asistentes.
- `Workspace de reunion`: asistencia, agenda, proyectos, minutas, informes y compromisos.
- `Calendario`: vista de reuniones, actividades y compromisos.
- `Propuestas de compromisos`: bandeja para confirmar, rechazar o vincular propuestas.

Archivos principales del frontend:

- `src/pages/group/Group.tsx`
- `src/pages/group/group.css`
- `src/pages/group/pages/officeMeetingsOverview/OfficeMeetingsOverview.tsx`
- `src/pages/group/pages/officeMeetingsDetail/OfficeMeetingsDetail.tsx`
- `src/pages/group/pages/officeProjectsAdmin/OfficeProjectsAdmin.tsx`
- `src/pages/group/pages/progressReportsWorkspace/ProgressReportsWorkspace.tsx`
- `src/pages/group/pages/progressReportEditor/ProgressReportEditor.tsx`
- `src/pages/group/pages/meetingWorkspace/MeetingWorkspace.tsx`
- `src/pages/group/pages/calendarWorkspace/CalendarWorkspace.tsx`
- `src/pages/group/pages/commitmentProposalsWorkspace/CommitmentProposalsWorkspace.tsx`
- `src/pages/group/services/officeMeetings.service.ts`
- `src/pages/group/types/officeMeetings.types.ts`

## Reglas y decisiones de dominio

- La ruta legacy `/grupos` se mantiene para no romper permisos ni navegacion.
- `Group`, `Duty`, `DutyMembers` y `DutyTasks` quedan como legacy.
- `OrganizationalMembershipRole` no decide permisos funcionales.
- El permiso principal del modulo es `MenuRol` sobre `grupos`.
- `canManageUnitProjects` permite un MOD local de unidad sin darle todo el poder de `MOD` global.
- Las reuniones son presenciales.
- Una reunion puede no tener proyectos.
- La asistencia pertenece a la reunion, no a proyectos.
- La minuta general y la minuta por proyecto se guardan separadas.
- Los invitados externos no son usuarios, no son miembros de unidad y no reciben compromisos en v1.
- Los compromisos creados dentro de un proyecto deben conservar `projectId`.
- Las propuestas de compromisos no son oficiales hasta confirmacion.
- Los informes basados directamente en tareas reales quedan fuera de esta version.
- Un informe puede tener varios borradores, pero solo un `READY` por proyecto, unidad y presentador.
- Los indices de informe permiten reutilizar estructuras como ASITEC sin duplicar filas manualmente.
- El calendario muestra compromisos como items especiales; no los duplica como actividades.

## Casos especiales

### Reunion administrativa sin proyectos

Debe poder crearse y ejecutarse con agenda general, asistencia, compromisos generales y minuta general. La UI no debe bloquear por `projectIds.length === 0`.

### Invitado externo

Si participa un alcalde, consultor o especialista externo, se crea o reutiliza un `MeetingExternalContact`. Su asistencia se guarda en `MeetingParticipant` con `participantType = EXTERNAL` y `origin = INVITED`.

### Usuario invitado de otra unidad

Un usuario registrado puede asistir como invitado sin convertirse en miembro de la unidad. Su `origin` debe ser `INVITED`.

### Informe listo duplicado

Al marcar un informe como `READY`, el backend calcula `presenterKey` y setea `readyKey`. Si ya existe otro informe listo con el mismo `unitId + projectId + presenterKey`, responde conflicto.

### Compromiso cumplido

Cuando un compromiso pasa a `DONE`, debe mostrarse en una seccion de cumplidos, separada de los pendientes.

### Proyecto enlazado a otra unidad

Mientras la regla sea un proyecto por una unidad activa, el buscador debe indicar que el proyecto ya esta enlazado y bloquear el enlace directo a otra unidad.

### Organigrama productivo

El script `orgBackfill.ts` es util para desarrollo o migracion inicial, pero puede crear unidades heredadas que no coincidan con el organigrama deseado. En produccion se debe revisar el resultado y ajustar el arbol antes de exponer el modulo.

## Pruebas recomendadas

### Automaticas

- Backend:
  - `npm run build`
  - `npx prisma validate`
  - `npx prisma db push`
- Frontend:
  - `npm run build`

### Manuales

- Entrar a `/grupos` con `MOD` y validar vista global.
- Entrar con `VIEWER` y confirmar que no pueda mutar datos.
- Crear una reunion administrativa sin proyectos.
- Crear una reunion con uno o mas proyectos.
- Iniciar y finalizar una reunion.
- Agregar asistentes de la unidad, usuarios invitados y contactos externos.
- Marcar asistencia de usuario y externo.
- Guardar minuta general.
- Guardar minuta por proyecto.
- Crear un informe personal y marcarlo listo.
- Intentar marcar listo un segundo informe del mismo proyecto y presentador; debe fallar.
- Crear informe de equipo con varios participantes.
- Crear informe de unidad como MOD global o MOD local.
- Importar un indice global como ASITEC.
- Guardar una matriz como indice personal.
- Enlazar un proyecto a una unidad y marcarlo activo.
- Intentar enlazar el mismo proyecto activo a otra unidad; debe bloquearse o mostrar ocupado.
- Crear compromiso general.
- Crear compromiso de proyecto.
- Marcar compromiso como cumplido y verificar que baja a seccion de cumplidos.
- Crear propuesta de compromiso como MEMBER.
- Confirmar o rechazar propuesta como MOD.
- Crear actividad de unidad y verla en calendario.
- Crear actividad de proyecto y validar que el proyecto pertenezca a la unidad.
- Confirmar que los endpoints devuelvan `401` sin token.

## Pendientes o mejoras futuras

- Crear pruebas unitarias para `MeetingPermissionService`.
- Agregar pruebas de integracion para reuniones sin proyectos.
- Agregar pruebas de conflicto para informes `READY`.
- Mejorar editor de minutas con markdown enriquecido tipo Notion.
- Soportar responsables externos en compromisos si el negocio lo requiere.
- Crear vista global avanzada de calendario para gerencia general.
- Permitir multi-unidad por proyecto si el modelo de trabajo cambia.
- Convertir informes basados en tareas reales en una version posterior.
- Agregar auditoria detallada de cambios de asistencia, minutas y compromisos.
- Hacer configurable el organigrama visible para no depender del backfill legacy.

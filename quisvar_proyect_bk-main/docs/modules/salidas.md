# Modulo: Salidas

## Proposito

El modulo `tramites/salidas` administra solicitudes de salida y permisos personales dentro del sistema. En codigo el dominio principal se llama `license`, y la tabla que sostiene el modulo es `Licenses`.

El objetivo actual es permitir que un usuario solicite una hoja de ruta o licencia, que un moderador la apruebe o rechace, y que el sistema refleje esa situacion en asistencia, en el home del usuario y en los reportes de tardanza o descuentos.

El modulo cubre cuatro situaciones principales:

- El usuario solicita una hoja de ruta por motivos de la empresa.
- El usuario solicita una licencia por motivos personales.
- El usuario solicita una salida o licencia recurrente, con varias ocurrencias dentro de un rango maximo de 1 mes.
- Un administrador asigna dia libre a todos los usuarios activos.
- El usuario marca su llegada desde el home cuando tiene una licencia activa o vencida sin cierre.

La decision central del modulo legado es que una salida o permiso se representa como un registro `Licenses`. El nuevo modulo `control-puerta` puede relacionar un `GatePass` con `Licenses` mediante `licenseId`, pero `tramites/salidas` todavia opera principalmente sobre `Licenses`.

## Usuarios y permisos

La ruta frontend esta dentro del menu `tramites` y submenu `salidas`:

- Ruta visual: `/#/tramites/salidas`
- Ruta React: `/tramites/salidas`
- Componente principal: `src/pages/procedure/pages/license/LicensePage.tsx`

Permisos de vista:

- Usuarios comunes pueden crear, editar y eliminar sus solicitudes mientras estan en `PROCESO`.
- Usuarios comunes pueden registrar su llegada cuando la solicitud esta `ACTIVO`.
- Usuarios con acceso `MOD` en `tramites/salidas` pueden ver solicitudes de todos, buscar por nombre, aprobar, rechazar y ejecutar verificacion de licencias vencidas.
- Usuarios con acceso `MOD` pueden finalizar una solicitud `ACTIVO` y registrar la llegada automaticamente con la fecha y hora actual.
- Usuarios con acceso `MOD` pueden cambiar a la vista interna `Reporte` para revisar penalizaciones de salidas por rango de fechas.
- Usuarios con acceso `MOD` pueden registrar una solicitud para uno o varios usuarios. En ese caso el modal permite buscar por nombre o DNI, agregar destinatarios como lista y al enviar queda aprobada automaticamente por el MOD que la creo.
- Toda solicitud para varios dias debe incluir una resolucion adjunta antes de completar motivo, fechas y horarios.
- Si una solicitud sigue en `PROCESO` y pasan 10 minutos desde su hora de salida sin aprobacion, backend la marca como `DENEGADO` con `feedback = No atendido`; la tabla la muestra como `No atendido` y oculta las acciones.
- Usuarios con `role.id <= 2` ven la accion adicional `Dia libre`.

Validaciones relevantes:

- Frontend usa `useRole('MOD', 'tramites', 'salidas')` para distinguir vista de empleado y vista administradora.
- Backend protege todas las rutas con `authenticateHandler`.
- Backend habilita primero rutas de empleado con `_employee_role` y luego rutas admin con `_admin_role`.

Archivos de permisos/menu:

- `src/routes/Navigation.tsx`
- `src/models/menuPoints.ts`
- `src/middlewares/role.middleware.ts`

## Flujos principales

### 1. Solicitud de hoja de ruta

1. El usuario abre `/#/tramites/salidas`.
2. Selecciona `Solicitar Hoja de ruta`.
3. El modal `CardLicense` abre con la opcion `Hoja de ruta`.
4. El usuario ingresa fecha y hora de salida, fecha y hora de retorno.
5. Selecciona motivo: `Salida de campo`, `Tramite documentario` u `Otro`.
6. El frontend envia `POST /license` con `type = SALIDA`.
7. Backend crea un registro `Licenses` con `status = PROCESO`.
8. La solicitud aparece en la lista del usuario y en la bandeja del moderador.

Resultado: la solicitud queda pendiente de aprobacion.

### 2. Solicitud de licencia personal

1. El usuario abre el mismo modal.
2. Cambia la opcion a `Licencia`.
3. Ingresa fecha de salida, fecha de retorno y motivo libre.
4. El frontend envia `POST /license` con `type = PERMISO`.
5. Backend crea el registro en `Licenses` con `status = PROCESO`.

Resultado: la solicitud queda pendiente de aprobacion.

### 2.1. Solicitud recurrente

1. El usuario abre `Solicitar Salida`.
2. Selecciona `Solicitud recurrente`.
3. El modal usa un flujo paso a paso para reducir carga visual:
   - Paso 1: tipo de solicitud y motivo.
   - Paso 2: fechas y horas.
   - Paso 3: revision antes de enviar.
4. El tipo de solicitud se divide en dos categorias: `Solicitud simple` para una sola fecha y `Solicitud recurrente` para pedidos personalizados de varios dias.
5. Antes de completar el motivo, debe subir una resolucion en PDF, JPG o PNG, maximo 10 MB.
6. Mantiene el mismo `Tipo de permiso`: salida de campo, tramite documentario, licencia personal u otros.
7. Elige un mes, marca dias directamente en el calendario y define horas base de salida/retorno.
8. Puede hacer click en dias sueltos o mantener click y arrastrar para seleccionar un tramo continuo.
9. La seleccion completa no puede superar 1 mes.
10. El modal genera una vista previa editable de ocurrencias.
11. Frontend envia una sola solicitud padre con `multipart/form-data`, `recurrence.enabled = true`, la lista de ocurrencias y el archivo `resolution`.
12. Backend guarda la solicitud padre en `PROCESO`, con `isRecurringParent = true`, `recurrenceRule` y `departureFile` apuntando a la resolucion.
13. MOD aprueba o rechaza una sola vez la solicitud padre.
14. Al aprobar, backend crea ocurrencias hijas `ACEPTADO` con `recurrenceParentId`.
15. Al rechazar, backend crea ocurrencias hijas `DENEGADO` o actualiza las existentes.
16. Si el usuario edita la solicitud padre antes de aprobarse, `CardLicense` carga `recurrenceRule`, vuelve al modo `Solicitud para varios dias`, muestra el calendario con los dias seleccionados y conserva la resolucion cargada salvo que el usuario la reemplace.

Resultado: el usuario ve una solicitud recurrente aprobada/rechazada, mientras las ocurrencias internas se activan automaticamente segun su fecha.

### 2.2. Solicitud registrada por MOD para usuarios

1. Un usuario con acceso `MOD` abre `Solicitar Salida`.
2. El modal muestra primero la decision `Solicitud personal` o `Solicitud para usuarios`.
3. Si elige `Solicitud personal`, el flujo se mantiene igual que para cualquier usuario y queda pendiente de aprobacion.
4. Si elige `Solicitud para usuarios`, aparece un buscador por nombre o DNI.
5. Al seleccionar un usuario, se agrega a una lista de destinatarios y el campo queda disponible para agregar otro.
6. El modal evita usuarios duplicados y permite quitar cualquier destinatario antes de enviar.
7. Luego el MOD completa el mismo formulario: solicitud simple o para varios dias, tipo de permiso, detalle, fecha y hora.
8. Si elige varios dias, tambien debe adjuntar la resolucion antes de completar la solicitud.
9. Frontend envia `POST /license` con `usersId` si hay un solo usuario o `usersIds` si hay varios, `supervisorId` del MOD y `autoApprove = true`.
10. Backend valida que ningun destinatario tenga licencia `ACTIVO` o `ACEPTADO` antes de crear el lote.
11. Backend crea una solicitud por cada usuario con `status = ACEPTADO` y `supervisorId` cargado.
12. Si la solicitud es para varios dias, backend tambien genera las ocurrencias hijas como `ACEPTADO` para cada destinatario usando la misma programacion y resolucion.

Resultado: cada permiso aparece en la tabla como una solicitud normal del usuario correspondiente, pero ya aprobada por el MOD que la registro. Cada usuario solo debe marcar llegada cuando su salida se active.

### 3. Aprobacion o rechazo por moderador

1. El moderador entra a `/#/tramites/salidas`.
2. La pantalla consulta `GET /license/status`.
3. Puede filtrar por nombre usando `searchName`.
4. Si una solicitud esta en `PROCESO`, puede escribir una observacion.
5. Presiona `Aprobar` o `Rechazar`.
6. El frontend envia `PATCH /license/approve/:id` con `status`, `feedback` y `supervisorId`.
7. El backend actualiza el registro.
8. Backend emite `server:license-update` y `server:gate-control-update` para refrescar listas abiertas de Salidas y Control de puerta.
9. El frontend tambien puede emitir `client:action-button` como respaldo legacy para refrescar vistas antiguas.

Resultado: la solicitud pasa a `ACEPTADO` o `DENEGADO`.

### 4. Activacion automatica de licencias

1. Varias pantallas ejecutan `POST /license/expired` o `GET /license/active`.
2. Backend compara la hora actual con `startDate` y `untilDate`.
3. Si una licencia esta `ACEPTADO` y ya entro en rango, cambia a `ACTIVO`.
4. Si esta `ACTIVO` o `ACEPTADO`, ya vencio y tiene llegada registrada, cambia a `INACTIVO`.
5. Si vencio y no tiene llegada registrada, se mantiene disponible para registrar llegada hasta 20 minutos despues del retorno previsto; pasado ese margen, cambia a `INACTIVO` con `fine = MUY_GRAVE`.

Resultado: el estado operativo se recalcula de forma oportunista, no por job programado.

### 5. Marcado de llegada desde Home

1. El home consulta `GET /license/employee/:id`.
2. Si la primera licencia esta `ACTIVO` o `INACTIVO` sin `fine`, muestra una tarjeta de `Licencia activa`.
3. El boton `Marcar llegada` se habilita cuando faltan menos de 2 horas para el retorno o si la licencia ya esta vencida.
4. Al marcar llegada, frontend calcula `fine`.
5. Envia `PATCH /license/checkout/:id` con `checkout`, `fine` y `status = INACTIVO`.

Resultado: la licencia queda cerrada con llegada y clasificacion de puntualidad o falta.

### 6. Impacto en asistencia

1. Al crear una lista, el backend actualiza licencias vencidas y consulta las
   licencias `ACTIVO` dentro de la misma operación de dominio.
2. La fotografía persistida en `ListOnUsers` inicia esos participantes como
   `SALIDA` o `PERMISO`, con origen `LICENSE`.
3. Quien no tiene licencia vigente inicia como `SIMPLE` provisional; el
   frontend no consulta `/license` para reconstruir ni filtrar la lista.
4. La lista administrativa bloquea los estados cuyo origen sigue siendo
   `LICENSE`.

Resultado: la licencia vigente queda incorporada en la fotografía de la lista
al crearla y no cambia retroactivamente por consultas posteriores del frontend.

### 7. Reporte de penalizaciones de salidas

1. El usuario MOD entra a `/#/tramites/salidas`.
2. Cambia la vista interna de `Solicitudes` a `Reporte`.
3. Puede filtrar por fecha inicio y fecha fin.
4. Frontend consulta `GET /license/report/fines`.
5. Backend devuelve todas las licencias no recurrentes padre con `fine` registrado, excluyendo solicitudes padre de varios dias.
6. La pantalla muestra tarjetas resumen solo para penalizaciones reales: puntual, tardanza, falta simple, falta grave y falta muy grave.
7. La matriz visual y el PDF conservan columnas `L` y `S` por compatibilidad con el formato de asistencia/exportacion.
8. En la matriz, `L` cuenta solicitudes de tipo licencia o permiso (`PERMISO`) y `S` cuenta solicitudes de salida de campo (`SALIDA`) por usuario. No suman multa porque su monto es `S/. 0.00`.

Resultado: el MOD puede revisar tardanzas, faltas simples, graves, muy graves, permisos y salidas de campo sin mezclarlo con la tabla operativa de solicitudes.

## Modelo de datos

### Licenses

Representa la solicitud y su ciclo operativo.

Campos importantes:

- `id`: identificador autoincremental.
- `usersId`: usuario solicitante.
- `supervisorId`: usuario que aprueba, rechaza o asigna dia libre.
- `reason`: motivo de salida o permiso.
- `feedback`: observacion del moderador.
- `type`: `SALIDA` o `PERMISO`.
- `status`: estado de aprobacion u operativo.
- `fine`: resultado al marcar llegada.
- `departureFile`, `arrivalFile`: campos existentes para archivos, actualmente no usados por la pantalla principal.
- `departureFile`: para solicitudes de varios dias se usa como ruta de la resolucion adjunta, relativa a `/file-user`.
- `arrivalFile`: campo legacy disponible, no usado por el flujo actual de resoluciones.
- `startDate`: fecha y hora de salida.
- `untilDate`: fecha y hora de retorno previsto.
- `checkout`: fecha y hora de llegada real.
- `createdAt`: fecha de creacion de la solicitud.
- `isRecurringParent`: indica que el registro es la solicitud padre de una recurrencia.
- `recurrenceParentId`: identifica una ocurrencia hija de una solicitud recurrente.
- `recurrenceGroupId`: agrupa la solicitud padre y sus ocurrencias.
- `recurrenceIndex`: orden de la ocurrencia dentro de la recurrencia.
- `recurrenceRule`: regla serializada con las ocurrencias generadas por el modal.
- `gatePasses`: relacion con `GatePass`.

Estados `LicensesStatus`:

- `PROCESO`: solicitud pendiente.
- `ACEPTADO`: solicitud aprobada, aun no activa.
- `ACTIVO`: solicitud dentro del rango de salida.
- `INACTIVO`: solicitud vencida o cerrada.
- `DENEGADO`: solicitud rechazada.
- `ACTIVE`, `INACTIVE`, `PROCESS`, `DENIED`: valores ingleses existen en el enum, pero el modulo actual usa los estados en espanol.

Tipos `LicenseType`:

- `SALIDA`: hoja de ruta por motivos de la empresa.
- `PERMISO`: licencia o permiso personal.

Valores `fine` desde `ListDetails`:

- `PUNTUAL`
- `TARDE`
- `SIMPLE`
- `GRAVE`
- `MUY_GRAVE`
- `PERMISO`
- `SALIDA`

### Users

`Licenses.usersId` no declara relacion Prisma explicita en el bloque actual, pero todo el modulo lo trata como referencia a `Users.id`.

Usos importantes:

- Buscar datos del solicitante en frontend con `useListUsers`.
- Buscar por nombre en backend desde `getLicensesByStatus`.
- Crear permisos masivos para todos los usuarios activos en `createFreeForAll`.

### GatePass

El modelo nuevo de `control-puerta` tiene `licenseId Int?` y relacion opcional con `Licenses`. Esto permite enlazar una salida operativa de puerta con una licencia o hoja de ruta existente.

El monitor de `control-puerta` no inserta licencias dentro de sus tablas operativas. En su lugar usa un transformador en tiempo de consulta: cada licencia aprobada o activa se proyecta como una fila compatible con `GatePass`, con id sintetico `license-{id}`, visible desde 15 minutos antes de su hora programada.

Cuando el controlador marca llegada desde Control de puerta sobre una fila traducida, no se crea ni actualiza un `GatePass`; se actualiza directamente la licencia original con `checkout`, `fine` y `status = INACTIVO`.

Una licencia `ACTIVO` sin llegada registrada permanece en `Salidas en curso` del monitor hasta 20 minutos despues del retorno previsto. Pasado ese margen, Salidas la cierra como `Ingreso no registrado` y el traductor deja de mostrarla en puerta.

## Backend

Rutas principales:

- `GET /license/licenses-user/:id`
- `GET /license/employee/:id`
- `GET /license/fee/:id`
- `GET /license/report/fines`
- `POST /license` (`multipart/form-data` cuando incluye resolucion; `usersIds` permite registro MOD en lote; `autoApprove = true` solo para registro MOD a favor de usuarios)
- `PATCH /license/:id`
- `PATCH /license/checkout/:id`
- `GET /license/active`
- `DELETE /license/:id`
- `POST /license/free`
- `PATCH /license/approve/:id`
- `GET /license`
- `GET /license/status`
- `POST /license/expired`

Archivos principales:

- `src/routes/licenses.routes.ts`
- `src/controllers/licenses.controllers.ts`
- `src/services/licenses.services.ts`
- `src/models/sockets.ts`
- `prisma/schema.prisma`

Servicios principales:

- `create`: crea una solicitud individual o un lote si recibe `usersIds`. Si `recurrence.enabled = true`, exige `departureFile` generado desde el archivo `resolution`.
- `createFreeForAll`: crea permisos `PERMISO` aceptados para usuarios activos sin licencia activa.
- `update`: edita solicitud y la devuelve a `PROCESO`.
- `updateApprove`: aprueba o deniega con feedback y supervisor.
- `updateCheckOut`: registra llegada, multa y estado.
- `getActiveLicensesForAttendance`: devuelve licencias activas y data para asistencia.
- `getByUser`: lista licencias por usuario y rango de fechas.
- `getLicensesByStatus`: lista general paginada, opcionalmente filtrada por estado o nombre.
- `getLicensesEmployee`: lista paginada del usuario.
- `getLicensesFee`: resume multas por usuario y rango de fechas.
- `activeLicenses`: cambia `ACEPTADO` a `ACTIVO` cuando corresponde.
- `deleteExpiredLicenses`: cambia `ACTIVO` o `ACEPTADO` a `INACTIVO` si vencieron.
- `deleteLicense`: elimina solicitud.

## Frontend

Ruta principal:

- `/tramites/salidas`

Pantallas y componentes:

- `LicensePage`: pagina principal, paginacion, buscador admin, apertura de modal y suscripcion a socket.
- `CardLicense`: modal para crear o editar hoja de ruta, licencia o dia libre.
- `LicenseListHeader`: cabecera de tabla, cambia columnas segun vista empleado/admin.
- `LicenseListItem`: fila de tabla, acciones de aprobar/rechazar o editar/eliminar.
- `Home`: tarjeta de licencia activa y marcado de llegada.
- Vista `Reporte` dentro de `LicensePage`: consolidado de penalizaciones de salidas para MOD.
- `Attendance`: consulta salidas activas para precargar asistencia.
- `AttendanceList`: bloquea opciones si el usuario tiene permiso o salida activa.

Archivos principales del frontend:

- `src/pages/procedure/pages/license/LicensePage.tsx`
- `src/pages/procedure/pages/license/LicensePage.css`
- `src/pages/procedure/pages/license/views/cardLicense/CardLicense.tsx`
- `src/pages/procedure/pages/license/views/cardLicense/CardLicense.css`
- `src/pages/procedure/pages/paymentProcessing/components/licenseHeader/LicenseListHeader.tsx`
- `src/pages/procedure/pages/paymentProcessing/components/licenseList/LicenseListItem.tsx`
- `src/pages/home/Home.tsx`
- `src/pages/attendance/Attendance.tsx`
- `src/pages/attendance/components/attendanceList/AttendanceList.tsx`
- `src/types/types.d.ts`

Columnas de la tabla:

- `item`
- `solicitante` solo en vista admin
- `Revisado por`
- `Tipo` solo en vista empleado
- `fecha de envio` solo en vista empleado
- `motivo`
- `estado`
- `salida`
- `retorno`
- `llegada`
- `observacion`
- `accion`

Formato de fechas:

- El formulario usa inputs `datetime-local`.
- Frontend envia fechas sin zona explicita.
- Backend ajusta `startDate` y `untilDate` restando 5 horas.
- Varias vistas vuelven a sumar 5 horas para mostrar en hora local.
- `checkout` desde Home se envia con `now.setHours(now.getHours() - 5)`.

## Reglas y decisiones de dominio

- Un usuario no puede crear una nueva licencia si ya tiene una con estado `ACTIVO` o `ACEPTADO`.
- Una solicitud nueva inicia en `PROCESO`.
- Una solicitud recurrente inicia como padre en `PROCESO`; sus ocurrencias se generan cuando MOD aprueba o rechaza.
- Solo solicitudes en `PROCESO` pueden editarse o eliminarse desde la vista de empleado.
- La edicion de una solicitud para varios dias conserva el registro padre y reemplaza `recurrenceRule` con la nueva programacion.
- Solo solicitudes en `PROCESO` pueden aprobarse o rechazarse desde la vista admin.
- Una solicitud en `PROCESO` no atendida dentro de los 10 minutos posteriores a su hora de salida se cierra como `DENEGADO` con `feedback = No atendido`; visualmente se muestra como `No atendido` y no se aprueba, rechaza, edita ni elimina desde la tabla.
- Editar una solicitud existente fuerza `status = PROCESO`.
- El dia libre masivo se crea como `PERMISO`, `ACEPTADO` y con `supervisorId`.
- La activacion y vencimiento se calculan por llamadas HTTP, no por proceso en segundo plano.
- La llegada puede marcarse desde Home y desde `tramites/salidas` cuando el estado y permisos lo permiten.
- La severidad de llegada tarde se calcula en frontend segun diferencia contra `untilDate`.
- En la columna `Llegada`, la tabla muestra un resumen visual en vez de la fecha completa. La fecha y hora exacta quedan disponibles al pasar el cursor.
- Los resumenes de llegada muestran el nombre directo de la clasificacion: llegada anticipada, puntual, tardanza, falta simple, falta grave o falta muy grave.
- Si pasan mas de 20 minutos desde la hora de retorno y el usuario no registro llegada, el backend marca automaticamente `fine = MUY_GRAVE`, conserva `checkout = null`, cambia el estado a `INACTIVO` y la columna `Llegada` muestra `Ingreso no registrado`.
- Los cambios se refrescan por socket usando `server:license-update` para Salidas y `server:gate-control-update` para Control de puerta.
- La vista de solicitudes tambien hace un refresco silencioso cada 30 segundos para capturar transiciones por tiempo, como `ACEPTADO -> ACTIVO`, solicitudes no atendidas o cierres automaticos.
- Asistencia usa licencias activas para marcar automaticamente `PERMISO` o `SALIDA`.

## Casos especiales

### Busqueda por nombre en admin

`GET /license/status` acepta `searchName`. Backend separa el texto en terminos y busca coincidencias en `Profiles.firstName` o `Profiles.lastName`. Actualmente usa `findFirst`, por lo que si hay varias coincidencias solo filtra por el primer usuario encontrado.

### Paginacion

Frontend mantiene `page`, `pageSize = 0`, `skip` y `total`. Backend convierte `pageSize` falsy a 20. La pantalla muestra rangos manuales en el footer.

### Fecha minima en formulario

`CardLicense` usa `min={formatDateAndHours()}` en ambos campos. Esto impide seleccionar fechas pasadas desde el navegador, pero no hay validacion visible de que `untilDate` sea posterior a `startDate`.

### Licencias vencidas sin llegada

Cuando una licencia vence sin llegada, `deleteExpiredLicenses` no la cambia a `INACTIVO` de inmediato. La mantiene disponible para marcar llegada hasta 20 minutos despues del retorno previsto; si sigue sin `checkout`, la cierra con `fine = MUY_GRAVE`, `checkout = null` y la tabla muestra `Ingreso no registrado`.

### Dia libre masivo

`createFreeForAll` intenta excluir usuarios con licencias activas, pero el filtro usa `AND: [{ status: 'ACTIVO' }, { status: 'ACEPTADO' }]`, condicion imposible para un mismo registro. Esto merece revision antes de ampliar la funcion.

### Inconsistencia potencial de estados

El enum Prisma incluye estados en espanol e ingles. El frontend y la logica actual esperan espanol. Cualquier mejora debe evitar mezclar `ACTIVE/INACTIVE/PROCESS/DENIED` con `ACTIVO/INACTIVO/PROCESO/DENEGADO`.

### Integracion con Control de puerta

`Licenses` sigue siendo la fuente de aprobacion de solicitudes. `GatePass` representa la salida operativa propia de puerta.

Para no mezclar tablas ni romper historiales, la integracion usa un traductor de datos:

Reglas actuales:

- Una licencia `PROCESO` aparece en el monitor como `Salidas pendientes` desde 15 minutos antes de su `startDate` y solo hasta 10 minutos despues de esa hora, permitiendo autorizacion operativa desde puerta.
- Si esa ventana vence sin aprobacion, backend la cierra como `DENEGADO` con `feedback = No atendido`.
- Una licencia `ACEPTADO` futura aparece en el monitor como `Salidas autorizadas`, en una seccion plegable informativa para que puerta se anticipe sin considerarla persona fuera.
- Una licencia `ACTIVO` aparece en `Salidas en curso`; recien ahi se habilita marcar llegada.
- El monitor devuelve esas licencias como filas compatibles con `GatePass`, pero no inserta registros en tablas de Control de puerta.
- Las filas traducidas activas usan id `license-{id}`; las autorizadas futuras usan `authorized-license-{id}` y las pendientes `pending-license-{id}`. No insertan registros `GatePass`.
- Las licencias `ACEPTADO` solo aparecen en `Salidas autorizadas` de Control de puerta desde 15 minutos antes de su hora programada. Cuando llega la hora de salida, el traductor las activa y pasan a `Salidas en curso`.
- Las filas pendientes usan id sintetico `pending-license-{id}` y no habilitan marcar llegada hasta que un controlador autorizado las apruebe.
- Al autorizar una fila pendiente desde Control de puerta, se actualiza la licencia original con `supervisorId`, `feedback = Autorizado desde Control de puerta` y estado `ACEPTADO` o `ACTIVO` segun corresponda.
- El traductor ajusta la convencion horaria de `Licenses` antes de calcular el cronometro de puerta, para que una solicitud no aparezca como vencida por desfase de zona horaria.
- Si la hora de salida ya llego, el monitor cambia la licencia a `ACTIVO` durante la traduccion.
- Control de puerta bloquea permisos rapidos cuando el usuario ya tiene una licencia aprobada/activa que se cruza con el horario solicitado.
- Al marcar llegada desde puerta sobre una fila traducida, se actualiza la licencia con llegada real, penalizacion y cierre.
- Al marcar llegada desde Home, Salidas o Control de puerta, se emiten `server:license-update` y `server:gate-control-update` para que ambos modulos retiren o actualicen la fila sin recarga manual.
- En solicitudes de varios dias, cada ocurrencia mantiene su propio `checkout` y `fine`; cerrar una llegada no debe cerrar las demas fechas del mismo grupo.

## Pruebas recomendadas

### Automaticas

- Crear tests de servicio para `LicenseServices.create`.
- Validar que no se permite nueva licencia si existe `ACTIVO` o `ACEPTADO`.
- Validar transicion `ACEPTADO -> ACTIVO`.
- Validar transicion `ACTIVO/ACEPTADO -> INACTIVO`.
- Validar `updateApprove` con `ACEPTADO` y `DENEGADO`.
- Validar `updateCheckOut` con `fine`.
- Validar `createFreeForAll`, especialmente exclusion de usuarios con licencias activas.
- Validar busqueda `searchName` con nombres compuestos.

### Manuales

- Crear hoja de ruta con motivo `Salida de campo`.
- Crear hoja de ruta con motivo `Otro`.
- Crear licencia personal.
- Editar una solicitud en `PROCESO` y confirmar que vuelve a aparecer pendiente.
- Eliminar una solicitud en `PROCESO`.
- Aprobar solicitud desde vista admin y confirmar `supervisorId`.
- Rechazar solicitud con observacion.
- Confirmar que el socket refresca otra sesion abierta en `tramites/salidas`.
- Confirmar que una solicitud aprobada pasa a `ACTIVO` cuando llega la hora de salida.
- Confirmar que una solicitud pendiente aparece en `control-puerta/monitor` desde 15 minutos antes de la salida.
- Confirmar que una solicitud aprobada aparece en `control-puerta/monitor` como autorizada solo desde 15 minutos antes de la salida.
- Confirmar que una solicitud autorizada pasa sola a `Salidas en curso` cuando llega su hora programada sin refrescar la pagina.
- Confirmar que marcar llegada desde Control de puerta cierra tambien la licencia relacionada.
- Confirmar que una solicitud vencida pasa a `INACTIVO`.
- Marcar llegada desde Home y revisar `checkout`, `fine` y `status`.
- Revisar asistencia con usuario en `SALIDA` activa.
- Revisar asistencia con usuario en `PERMISO` activo.
- Probar paginacion con mas de 20 registros.
- Probar busqueda admin por nombre y apellido.

## Pendientes o mejoras futuras

- Profundizar la integracion con `GatePass` para reportes cruzados entre Salidas y Control de puerta.
- Mover calculo de `fine` al backend para evitar manipulacion desde cliente.
- Normalizar manejo de zona horaria en backend y frontend.
- Corregir filtro de `createFreeForAll` para excluir correctamente `ACTIVO` o `ACEPTADO`.
- Agregar validacion de `untilDate > startDate`.
- Reemplazar estados ingleses no usados o migrarlos de forma explicita.
- Agregar relaciones Prisma explicitas entre `Licenses.usersId`, `Licenses.supervisorId` y `Users`.
- Revisar paginacion y remover `pageSize = 0` en frontend.
- Mejorar busqueda admin para devolver multiples usuarios coincidentes.
- Incorporar evidencias reales en `departureFile` y `arrivalFile` si el flujo las necesita.
- Agregar filtros por estado, tipo y rango de fechas en la pantalla principal.
- La pantalla principal incluye filtros por columnas, incluyendo `Tipo` y `Llegada` para separar sin registro, llegada anticipada, puntualidad, tardanzas, faltas e ingreso no registrado.
- En vista de usuario, la columna `Tipo` muestra `S` para salida de campo y `L` para licencia personal. El nombre completo aparece al pasar el cursor.
- Separar la tabla de `paymentProcessing/components` para que `Salidas` tenga componentes propios.

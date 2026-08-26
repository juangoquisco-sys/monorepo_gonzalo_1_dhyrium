# Modulo: Bono por produccion

## Proposito

El modulo `tramites/bono-produccion` administra la asignacion, control, validacion y consolidacion de trabajo extraordinario. El nombre visible del modulo sera `Bono por produccion`.

Su finalidad principal es que Gerencia o usuarios MOD designen quien o quienes deben quedarse a trabajar fuera de la jornada ordinaria, por ejemplo horas extras, jornada extendida, amanecida, domingo, feriado, dia libre operativo o apoyo excepcional por necesidad de produccion.

La decision central del modulo es que el bono nace como una asignacion o programacion autorizada, no como un pago directo. El bono reconocido aparece al final del flujo, cuando el trabajo extraordinario asignado fue ejecutado y validado con asistencia, control de puerta, evidencia o criterio administrativo.

El modulo puede aceptar regularizaciones iniciadas por el usuario, pero esas no son el flujo principal. El flujo principal debe ser gerencial: designar, controlar cumplimiento, validar horas y consolidar.

El modulo debe cuidar especialmente la UX/UI porque el flujo puede ser usado por usuarios comunes, moderadores y administracion. La pantalla debe reducir carga visual, separar claramente asignacion, regularizacion, validacion y liquidacion, y mostrar estados comprensibles sin obligar al usuario a interpretar reglas internas.

El modulo cubre estas situaciones principales:

- Gerencia o MOD asigna trabajo extraordinario a uno o varios usuarios.
- Gerencia o MOD designa usuarios para jornada extendida o amanecida.
- Gerencia o MOD designa usuarios para domingo, feriado o dia libre operativo.
- El usuario ve sus asignaciones y el estado de reconocimiento.
- El usuario puede solicitar regularizacion solo si el negocio lo permite.
- Un usuario MOD aprueba, rechaza u observa regularizaciones iniciadas por usuario.
- Un usuario MOD o area autorizada valida las horas reales trabajadas.
- Administracion consolida asignaciones y regularizaciones validadas para reporte o liquidacion.
- Se regulariza una jornada extraordinaria que ya ocurrio, con sustento obligatorio.

## Decision de ubicacion del modulo

El modulo debe ubicarse dentro de `Tramites de Usuario`, como una pestana hermana de `Salidas`.

Ubicacion sugerida:

- Menu: `Tramites de Usuario`
- Pestana: `Bono por produccion`
- Ruta visual: `/#/tramites/bono-produccion`

Justificacion:

- Aunque el Gerente sea quien designe el trabajo, el flujo sigue siendo administrativo: asignacion, revision, validacion y reporte.
- Comparte patron con `Salidas`: fechas, horarios, estados, observaciones, roles Usuario/MOD y bandeja con reporte.
- No pertenece a `Control de puerta`, porque puerta registra eventos operativos de salida/llegada en tiempo real.
- No deberia ir al home superior como modulo independiente en v1, porque su uso principal es de tramite/control interno y no una herramienta transversal de acceso rapido para todos.
- La cercania con `Salidas` ayuda a detectar cruces entre permisos, ausencias y trabajo extraordinario.

## Usuarios y permisos

El modulo debe usar siempre la estructura existente de roles, menus y submenus del sistema. No debe crear una logica paralela de permisos si la accion puede resolverse con los permisos actuales de Usuario o MOD.

Ruta visual propuesta:

- Ruta visual: `/#/tramites/bono-produccion`
- Ruta React: `/tramites/bono-produccion`
- Nombre visible: `Bono por produccion`

Permisos de vista sugeridos:

- Usuarios comunes pueden ver asignaciones propias, estado, horas reconocidas y observaciones.
- Usuarios comunes pueden adjuntar sustento cuando una asignacion lo requiera.
- Usuarios comunes pueden crear regularizaciones propias solo si la regla de negocio lo permite.
- Usuarios comunes pueden editar o eliminar regularizaciones propias mientras estan en `PROCESO` u `OBSERVADO`.
- Usuarios con acceso `MOD` en `tramites/bono-produccion` pueden ver asignaciones y regularizaciones de todos los usuarios.
- Usuarios con acceso `MOD` pueden buscar por nombre, DNI, area, tipo, estado y rango de fechas.
- Usuarios con acceso `MOD` pueden asignar trabajo extraordinario a uno o varios usuarios.
- Usuarios con acceso `MOD` pueden aprobar, rechazar, observar y validar regularizaciones segun el flujo definido.
- Usuarios con acceso `MOD` pueden anular o reprogramar asignaciones mientras no esten liquidadas.
- Usuarios con acceso `MOD` pueden acceder a la vista de reporte o consolidado.
- Si se requiere una etapa de liquidacion, debe definirse si pertenece al mismo permiso `MOD`, a Gerencia o a un permiso superior de administracion.

Validaciones relevantes:

- Frontend debe seguir el patron existente de permisos por rol, por ejemplo `useRole('MOD', 'tramites', 'bono-produccion')`.
- Backend debe proteger todas las rutas con `authenticateHandler`.
- Backend debe validar permisos de accion, no solo permisos visuales.
- El modulo debe evitar decisiones sensibles basadas solo en datos enviados desde frontend.

Archivos de permisos/menu que probablemente se tocarian en una implementacion futura:

- `src/routes/Navigation.tsx`
- `src/models/menuPoints.ts`
- `src/middlewares/role.middleware.ts`

## Experiencia de usuario y UI

La UX/UI debe ser tratada como una regla de dominio, no como una capa secundaria. Este modulo puede tener decisiones delicadas para el trabajador, por lo que el usuario debe entender en todo momento que solicito, quien revisa, que falta y cual sera el resultado.

### Regla obligatoria de diseno responsivo

Todo cambio visual del modulo debe priorizar diseno responsivo antes de considerarse terminado. Ningun boton, tooltip, modal, tabla, filtro, texto, tarjeta o accion debe quedar cortado, superpuesto o fuera del viewport en pantallas de escritorio, laptop, tablet o celular.

Checklist obligatorio antes de cerrar un cambio UI:

- Verificar que los elementos se adapten al ancho disponible con `flex-wrap`, `grid` responsivo, `minmax`, `max-width` y `overflow` controlado.
- Evitar tooltips en zonas donde puedan cortarse; si la explicacion es importante, preferir texto visible dentro del modal, drawer o detalle.
- No usar tooltips redundantes en botones claros por texto e icono.
- Los modales deben funcionar en alto y ancho reducidos, con scroll interno cuando sea necesario.
- Las tablas deben convertirse en filas responsivas o permitir scroll horizontal controlado, nunca romper el layout general.
- Los filtros y acciones deben bajar de linea en pantallas estrechas sin perder legibilidad.
- La prueba visual debe hacerse como minimo en desktop amplio, laptop mediana y ancho movil.

Principios de UX/UI:

- La primera pantalla debe ser la bandeja real del modulo, no una pantalla explicativa.
- El usuario comun debe ver primero sus asignaciones, estados y que accion le toca realizar, si existe.
- El usuario MOD debe ver primero una bandeja de asignaciones con filtros utiles desde el inicio.
- Los estados deben usar textos humanos: `Asignado`, `En curso`, `Por validar`, `Observado`, `Validado`, `Liquidado`.
- Cada asignacion debe mostrar el periodo programado, tipo de bono, horas asignadas, horas ejecutadas y horas validadas.
- La creacion de asignacion debe ser paso a paso si hay varios usuarios o reglas.
- La seleccion de tipo debe usar opciones claras: `Horas extra`, `Domingo`, `Feriado`, `Amanecida`, `Jornada extendida`, `Emergencia`, `Otro`.
- El formulario debe sugerir automaticamente el tipo cuando sea posible, por ejemplo domingo por fecha o madrugada por horario.
- Si la jornada ya ocurrio, la interfaz debe pedir sustento antes de permitir enviar.
- Las acciones MOD deben diferenciar visualmente asignacion, reprogramacion, anulacion, observacion y validacion.
- Las observaciones deben mostrarse cerca del estado, no escondidas en una columna dificil de revisar.
- El reporte debe separar asignaciones pendientes, regularizaciones pendientes y bonos reconocidos para evitar confusion con pagos reales.
- La pantalla debe ser usable en celular, especialmente para trabajadores que revisan asignaciones o adjuntan sustento fuera de oficina.
- Los formularios deben guardar contexto visual: usuario seleccionado, rango horario, tipo sugerido, horas estimadas y alerta de cruces.
- Las acciones destructivas o sensibles deben usar confirmacion clara: rechazar, anular, liquidar o reducir horas.
- Las tablas MOD deben priorizar accion rapida: filtros visibles, chips de estado, resumen por conteo y botones consistentes.
- Toda vista vacia debe indicar el siguiente paso disponible, por ejemplo `No tienes bonos asignados` para usuario o `No hay asignaciones pendientes` para MOD.
- El sistema debe mostrar alertas tempranas antes de enviar: cruce con licencia, jornada muy larga, falta de evidencia, fecha retroactiva o usuario duplicado.

Vistas internas sugeridas:

- `Mis bonos`: vista de usuario comun con asignaciones propias y regularizaciones.
- `Asignaciones`: bandeja principal MOD/Gerencia para programar y controlar trabajo extraordinario.
- `Regularizaciones`: casos iniciados por usuario o registrados despues del hecho.
- `Validacion`: asignaciones terminadas que necesitan confirmar horas reales.
- `Reporte`: consolidado por usuario, fecha, tipo y estado.

Resumenes visuales sugeridos:

- Usuario comun:
  - `Asignadas`: jornadas programadas por Gerencia/MOD.
  - `Por corregir`: regularizaciones observadas.
  - `Reconocidas`: asignaciones o regularizaciones validadas.
  - `Ultimo bono`: tarjeta compacta con estado, periodo y observacion.
- MOD:
  - `Asignadas hoy`: jornadas programadas para la fecha actual.
  - `En curso`: jornadas dentro de su rango horario.
  - `Por validar`: asignaciones o regularizaciones en `PENDIENTE_VALIDACION`.
  - `Regularizaciones`: casos de usuario pendientes de revision.
  - `Listas para reporte`: registros `VALIDADO`.

Columnas sugeridas de tabla:

- `item`
- `solicitante` solo en vista MOD.
- `tipo`
- `motivo`
- `origen`
- `asignado por`
- `fecha de asignacion`
- `inicio`
- `fin`
- `horas asignadas`
- `horas ejecutadas`
- `horas validadas`
- `estado`
- `validado por`
- `observacion`
- `accion`

Acciones rapidas sugeridas:

- Usuario comun: `Ver`, `Confirmar lectura`, `Adjuntar sustento`, `Corregir regularizacion`.
- MOD: `Asignar`, `Ver detalle`, `Reprogramar`, `Anular`, `Observar`, `Validar horas`, `Liquidar`.
- Regularizaciones MOD: `Aprobar`, `Rechazar`, `Observar`, `Convertir en asignacion`.
- Reporte: `Exportar`, `Marcar liquidado`, `Ver trazabilidad`.

Detalle de bono sugerido:

- Encabezado con solicitante, estado y tipo.
- Bloque de origen: asignado por Gerencia/MOD, regularizado por usuario o registrado por administracion.
- Bloque de periodo: inicio, fin, horas asignadas, ejecutadas y validadas.
- Bloque de sustento: archivos, notas y referencias a asistencia o puerta.
- Bloque de control: asignador, validador, fecha, observacion y cambios de horas.
- Linea de tiempo: eventos principales desde creacion hasta liquidacion.

Estados visuales sugeridos:

- `ASIGNADO`: chip informativo, texto `Asignado`.
- `EN_CURSO`: chip informativo, texto `En curso`.
- `PROCESO`: chip neutral, texto `Regularizacion pendiente`.
- `APROBADO`: chip informativo, texto `Regularizacion aprobada`.
- `OBSERVADO`: chip de advertencia, texto `Observado`.
- `PENDIENTE_VALIDACION`: chip de advertencia, texto `Por validar`.
- `VALIDADO`: chip positivo, texto `Validado`.
- `RECHAZADO`: chip negativo, texto `Rechazado`.
- `LIQUIDADO`: chip cerrado, texto `Liquidado`.
- `ANULADO`: chip apagado, texto `Anulado`.

La UI debe evitar depender solo del color. Cada estado debe tener texto claro y, si se usan iconos, deben tener tooltip.

## Flujos principales

### 1. Asignacion gerencial de bono por produccion

1. El Gerente o usuario MOD abre `/#/tramites/bono-produccion`.
2. Presiona `Asignar bono`.
3. El modal o drawer permite buscar usuarios por nombre, DNI o area.
4. Selecciona uno o varios trabajadores.
5. Define tipo: horas extra, domingo, feriado, amanecida, jornada extendida, emergencia u otro.
6. Ingresa fecha, hora de inicio, hora de fin, motivo y observacion interna si aplica.
7. El sistema calcula horas asignadas y muestra alertas de cruce con salidas, permisos, asistencia o asignaciones duplicadas.
8. El MOD revisa una vista previa por trabajador antes de confirmar.
9. Frontend envia `POST /production-bonus/assign` o ruta equivalente.
10. Backend crea una asignacion por cada usuario con `status = ASIGNADO`, `origin = ASSIGNED_BY_MANAGER` y `assignedById`.

Resultado: cada trabajador queda designado formalmente para trabajo extraordinario.

### 2. Vista del usuario asignado

1. El usuario abre `Bono por produccion`.
2. La pantalla muestra `Mis bonos` con asignaciones futuras, en curso, por validar y reconocidas.
3. Si tiene una asignacion activa o cercana, ve una tarjeta prioritaria con horario, tipo y estado.
4. Si el negocio lo requiere, puede presionar `Confirmar lectura`.
5. Si el MOD solicita sustento, puede adjuntar evidencia desde el detalle.

Resultado: el trabajador entiende que fue designado, que horario debe cumplir y que falta para el reconocimiento.

### 3. Reprogramacion o anulacion de asignacion

1. El MOD abre el detalle de una asignacion.
2. Si aun no fue liquidada, puede reprogramar horario, tipo o motivo.
3. Si el trabajo ya no se realizara, puede anular con observacion obligatoria.
4. Backend registra evento, actor y motivo.
5. El usuario afectado ve el cambio en `Mis bonos`.

Resultado: los cambios de Gerencia quedan trazados y no se pierden asignaciones anteriores.

### 4. Validacion posterior de horas reales

1. Una asignacion queda `PENDIENTE_VALIDACION` cuando termina el periodo programado.
2. El sistema compara contra asistencia, control de puerta o evidencia disponible.
3. MOD valida horas reales trabajadas.
4. Si hay diferencia, registra una observacion.
5. Backend guarda `validatedHours`, `validatedById`, `validatedAt` y `status = VALIDADO`.

Resultado: solo las horas validadas quedan listas para reporte o liquidacion.

### 5. Regularizacion posterior

1. El usuario o MOD registra una regularizacion de una jornada ya ocurrida.
2. La pantalla exige sustento antes de enviar.
3. La regularizacion queda en `PROCESO`.
4. MOD revisa el sustento y puede aprobar, observar o rechazar.
5. Si se aprueba, puede convertirse en asignacion reconocible o pasar a `PENDIENTE_VALIDACION`.

Resultado: el trabajo extraordinario ocurrido fuera del flujo normal queda trazable.

### 6. Consolidado para reporte o liquidacion

1. MOD o administracion abre `Reporte`.
2. Filtra por rango de fechas, usuario, area, tipo y estado.
3. El sistema muestra solo asignaciones o regularizaciones `VALIDADO` o `LIQUIDADO` para calculos finales.
4. La pantalla resume horas y montos si existe regla de calculo.
5. Al marcar como liquidado, backend bloquea cambios normales y registra `liquidatedAt`.

Resultado: administracion obtiene un consolidado confiable sin mezclar pendientes con bonos reconocidos.

### 7. Correccion de regularizacion observada

1. El MOD observa una regularizacion porque falta sustento, hay horas inconsistentes o existe un cruce de informacion.
2. El usuario recibe la regularizacion como `OBSERVADO`.
3. La vista del usuario muestra la observacion como mensaje principal del detalle.
4. El usuario corrige motivo, horario o adjunta sustento adicional.
5. Al reenviar, backend registra evento de correccion y devuelve la regularizacion a `PROCESO`.

Resultado: una observacion no cierra el caso; crea un ciclo claro de correccion.

### 8. Notificaciones y actualizacion de estado

1. Cuando una asignacion o regularizacion cambia de estado, el sistema debe notificar al usuario afectado.
2. Si la pantalla esta abierta, el frontend puede refrescar por socket o reconsulta.
3. El usuario comun debe ver rapidamente si su asignacion fue reprogramada, anulada, observada, validada o liquidada.
4. MOD debe ver conteos actualizados en sus bandejas operativas.

Resultado: se reduce la necesidad de refrescar manualmente y se evita que las asignaciones o regularizaciones queden olvidadas.

## Modelo de datos

### ProductionBonusRequest

Representa una asignacion o regularizacion de bono por produccion y su ciclo de control.

Campos sugeridos:

- `id`: identificador autoincremental.
- `userId`: usuario beneficiario.
- `origin`: origen del registro.
- `assignedById`: usuario que designa el trabajo extraordinario.
- `requestedById`: usuario que creo la regularizacion, si aplica.
- `supervisorId`: usuario que aprueba, rechaza u observa una regularizacion.
- `validatedById`: usuario que valida horas reales.
- `liquidatedById`: usuario que marca liquidacion, si aplica.
- `type`: tipo de bono.
- `status`: estado del flujo.
- `reason`: motivo de la asignacion o regularizacion.
- `feedback`: observacion del aprobador.
- `validationFeedback`: observacion de validacion.
- `workDate`: fecha principal de la jornada.
- `startDate`: fecha y hora de inicio.
- `endDate`: fecha y hora de fin.
- `assignedHours`: horas programadas por Gerencia o MOD.
- `requestedHours`: horas solicitadas en regularizacion, si aplica.
- `approvedHours`: horas aprobadas en regularizacion, si aplica.
- `executedHours`: horas detectadas por asistencia, puerta o evidencia.
- `validatedHours`: horas validadas.
- `amount`: monto calculado o reconocido, si el modulo llega a liquidacion.
- `evidenceFile`: sustento principal, si se mantiene un solo archivo.
- `createdAt`: fecha de creacion.
- `assignedAt`: fecha de asignacion.
- `approvedAt`: fecha de aprobacion.
- `validatedAt`: fecha de validacion.
- `liquidatedAt`: fecha de liquidacion.

Origenes sugeridos:

- `ASSIGNED_BY_MANAGER`: asignado por Gerencia o MOD.
- `REQUESTED_BY_USER`: solicitado por usuario como regularizacion.
- `REGISTERED_BY_ADMIN`: registrado por administracion despues del hecho.
- `IMPORTED`: importado desde una fuente externa, opcional para futuro.

Estados sugeridos:

- `BORRADOR`: regularizacion iniciada pero no enviada, opcional para una segunda etapa.
- `ASIGNADO`: trabajo extraordinario designado.
- `EN_CURSO`: asignacion dentro de su rango horario.
- `PROCESO`: regularizacion pendiente.
- `APROBADO`: regularizacion aprobada para reconocimiento o validacion.
- `RECHAZADO`: regularizacion denegada.
- `OBSERVADO`: requiere correccion o sustento adicional.
- `PENDIENTE_VALIDACION`: aprobada o registrada, pero falta validar horas reales.
- `VALIDADO`: horas reconocidas y listas para reporte.
- `ANULADO`: cancelada por usuario autorizado.
- `LIQUIDADO`: incluida en consolidado final.
- `CERRADO`: cierre administrativo posterior a liquidacion, opcional si se separa liquidacion de cierre.

Tipos sugeridos:

- `HORAS_EXTRA`
- `DOMINGO`
- `FERIADO`
- `MADRUGADA`
- `CORRIDO`
- `EMERGENCIA`
- `OTRO`

### ProductionBonusEvidence

Representa evidencias adjuntas a la asignacion o regularizacion.

Campos sugeridos:

- `id`
- `productionBonusRequestId`
- `type`
- `filePath`
- `note`
- `createdById`
- `createdAt`

Tipos sugeridos:

- `PHOTO`
- `DOCUMENT`
- `WHATSAPP_SCREENSHOT`
- `ATTENDANCE_REFERENCE`
- `GATE_CONTROL_REFERENCE`
- `NOTE`

### ProductionBonusEvent

Representa auditoria interna.

Eventos sugeridos:

- `ASSIGNMENT_CREATED`
- `ASSIGNMENT_UPDATED`
- `ASSIGNMENT_RESCHEDULED`
- `ASSIGNMENT_CANCELLED`
- `REQUEST_CREATED`
- `REQUEST_APPROVED`
- `REQUEST_REJECTED`
- `REQUEST_OBSERVED`
- `EVIDENCE_ATTACHED`
- `HOURS_VALIDATED`
- `REQUEST_CANCELLED`
- `REQUEST_LIQUIDATED`

### ProductionBonusRule

Representa reglas de calculo si el sistema debe calcular montos.

Campos sugeridos:

- `id`
- `type`
- `name`
- `multiplier`
- `fixedAmount`
- `maxHours`
- `requiresEvidence`
- `requiresValidation`
- `isActive`

Esta tabla puede dejarse para una segunda etapa si primero se requiere solo registrar y aprobar.

### ProductionBonusPeriod

Representa un periodo de corte para reporte o liquidacion. Es recomendable si administracion necesita cerrar semanas, quincenas o meses sin recalcular asignaciones o regularizaciones ya reportadas.

Campos sugeridos:

- `id`
- `name`
- `startDate`
- `endDate`
- `status`
- `closedById`
- `closedAt`

Estados sugeridos:

- `OPEN`: periodo abierto.
- `CLOSED`: periodo cerrado para cambios normales.
- `REOPENED`: periodo reabierto con autorizacion.

Esta tabla evita que reportes historicos cambien silenciosamente cuando se edita un registro antiguo.

## Integracion con modulos existentes

### Salidas

`Licenses` no debe ser la tabla principal de este modulo. Una licencia o salida representa permiso o ausencia temporal, mientras que `Bono por produccion` representa trabajo extraordinario.

Reglas sugeridas:

- No permitir bono si el usuario tiene una licencia `ACTIVO` o `ACEPTADO` cruzada con el horario solicitado.
- Mostrar advertencia si existe permiso, salida o dia libre en el mismo rango.
- No modificar licencias desde este modulo.

### Control de puerta

`GatePass` puede servir como evidencia de presencia o movimiento, pero no debe convertirse automaticamente en bono.

Reglas sugeridas:

- Consultar movimientos de puerta como referencia durante validacion.
- Mostrar salidas o retornos relevantes si cruzan con la jornada extraordinaria.
- No crear ni cerrar `GatePass` desde `Bono por produccion`.

### Asistencia

Asistencia debe ser el cruce principal para validar horas reales.

Reglas sugeridas:

- Validar si el usuario tuvo asistencia registrada en la fecha solicitada.
- Advertir si no existe marcacion.
- Permitir validacion manual con sustento cuando asistencia no sea suficiente.
- Evitar que el frontend calcule por si solo el resultado final reconocido.

### Usuarios y areas

El modulo debe aprovechar la estructura existente de usuario, perfil, rol y area si existe en el proyecto.

Reglas sugeridas:

- En vista MOD, permitir filtrar por area o cargo si esos datos ya existen.
- En asignaciones masivas, permitir seleccionar usuarios por busqueda individual y, en una segunda etapa, por area.
- Si un usuario esta inactivo, no debe aparecer como destinatario normal de nuevas asignaciones.
- Si se permite solicitar para usuarios inactivos por regularizacion historica, debe requerir permiso MOD y sustento.

## Backend

Rutas futuras sugeridas:

- `GET /production-bonus`
- `GET /production-bonus/status`
- `GET /production-bonus/employee/:id`
- `GET /production-bonus/report`
- `GET /production-bonus/summary`
- `GET /production-bonus/:id/events`
- `POST /production-bonus`
- `POST /production-bonus/assign`
- `POST /production-bonus/regularize`
- `PATCH /production-bonus/:id`
- `DELETE /production-bonus/:id`
- `PATCH /production-bonus/reschedule/:id`
- `PATCH /production-bonus/cancel/:id`
- `PATCH /production-bonus/approve/:id`
- `PATCH /production-bonus/observe/:id`
- `PATCH /production-bonus/validate/:id`
- `PATCH /production-bonus/liquidate/:id`
- `POST /production-bonus/:id/evidence`

Archivos futuros sugeridos:

- `src/routes/productionBonus.routes.ts`
- `src/controllers/productionBonus.controllers.ts`
- `src/services/productionBonus.services.ts`
- `src/services/productionBonus/domain/productionBonusPolicy.ts`
- `src/services/productionBonus/domain/productionBonusTimePolicy.ts`
- `prisma/schema.prisma`

Servicios principales sugeridos:

- `assign`: crea asignacion individual o lote desde Gerencia/MOD.
- `regularize`: crea regularizacion individual iniciada por usuario o MOD.
- `update`: edita asignacion o regularizacion permitida.
- `reschedule`: reprograma una asignacion.
- `cancel`: anula una asignacion con observacion.
- `approve`: aprueba, rechaza u observa.
- `validateHours`: valida horas reales reconocidas.
- `getByUser`: lista asignaciones y regularizaciones de un usuario.
- `getByStatus`: lista general para MOD.
- `getReport`: consolida asignaciones y regularizaciones por rango.
- `getSummary`: devuelve conteos para tarjetas de usuario y MOD.
- `attachEvidence`: agrega sustento sin reemplazar trazabilidad anterior.
- `liquidate`: bloquea registros validados incluidos en reporte final.

Politicas de dominio sugeridas:

- `productionBonusTimePolicy`: calcula horas, cruces de medianoche, madrugada y duracion maxima razonable.
- `productionBonusPermissionPolicy`: valida acciones por usuario, MOD y estado.
- `productionBonusConflictPolicy`: detecta cruces con licencias, asistencia, puerta y registros duplicados.
- `productionBonusReportPolicy`: decide que estados entran al consolidado.

## Frontend

Ruta principal:

- `/tramites/bono-produccion`

Pantallas y componentes futuros sugeridos:

- `ProductionBonusPage`: pagina principal, tabs, filtros y paginacion.
- `ProductionBonusAssignmentForm`: modal o drawer para asignar trabajo extraordinario.
- `ProductionBonusRegularizationForm`: modal o drawer para regularizaciones.
- `ProductionBonusListHeader`: cabecera de tabla.
- `ProductionBonusListItem`: fila de asignacion o regularizacion.
- `ProductionBonusAssignmentPanel`: acciones de asignacion, reprogramacion y anulacion.
- `ProductionBonusRegularizationPanel`: acciones de aprobacion MOD para regularizaciones.
- `ProductionBonusValidationPanel`: validacion de horas reales.
- `ProductionBonusReport`: consolidado por fecha, usuario, tipo y estado.
- `ProductionBonusSummaryCards`: resumen visible para usuario y MOD.
- `ProductionBonusTimeline`: historial de eventos del detalle.
- `ProductionBonusEvidenceList`: archivos, notas y referencias.

Archivos futuros sugeridos:

- `src/pages/procedure/pages/productionBonus/ProductionBonusPage.tsx`
- `src/pages/procedure/pages/productionBonus/ProductionBonusPage.css`
- `src/pages/procedure/pages/productionBonus/views/ProductionBonusAssignmentForm.tsx`
- `src/pages/procedure/pages/productionBonus/views/ProductionBonusRegularizationForm.tsx`
- `src/pages/procedure/pages/productionBonus/services/productionBonus.service.ts`
- `src/pages/procedure/pages/productionBonus/models/index.ts`

UX por dispositivo:

- En desktop, MOD debe trabajar principalmente con tabla densa, filtros y panel lateral de detalle.
- En mobile, usuario comun debe ver tarjetas compactas en vez de tabla ancha.
- El formulario debe tener campos grandes, ordenados y con resumen fijo al final.
- Los filtros avanzados pueden estar colapsados en mobile.
- Las acciones principales deben quedar visibles sin obligar a desplazarse demasiado.

## Reglas y decisiones de dominio

- El nombre visible del modulo sera siempre `Bono por produccion`.
- Una asignacion no equivale automaticamente a pago.
- El flujo minimo debe ser asignacion, ejecucion y validacion.
- Las regularizaciones de usuario son flujo secundario y deben pasar por revision MOD.
- Solo asignaciones o regularizaciones `VALIDADO` deben aparecer como reconocidas para reporte final.
- Registros `ASIGNADO`, `EN_CURSO`, `PROCESO`, `APROBADO`, `OBSERVADO` o `PENDIENTE_VALIDACION` no deben mostrarse como bono liquidado.
- El usuario comun solo puede editar o eliminar regularizaciones propias mientras no esten aprobadas, validadas o liquidadas.
- Un MOD puede asignar bono para otros usuarios, pero debe quedar trazado en `assignedById`.
- Si el MOD aprueba una regularizacion registrada para usuarios, debe quedar trazado en `supervisorId`.
- Las horas validadas pueden ser menores que las horas asignadas, solicitadas o aprobadas.
- Toda reduccion de horas debe guardar observacion.
- Las regularizaciones retroactivas deben exigir sustento.
- Las asignaciones o regularizaciones que crucen medianoche deben mostrarse claramente como jornada de dos fechas.
- El sistema debe sugerir `DOMINGO`, `FERIADO` o `MADRUGADA` segun fecha y horario, pero el usuario o MOD puede confirmar o ajustar segun permisos.
- No debe aprobarse una regularizacion ni crearse una asignacion si cruza con licencia, permiso o ausencia incompatible, salvo permiso especial con observacion.
- No debe liquidarse una asignacion o regularizacion sin validacion.
- Un registro `LIQUIDADO` no debe editarse desde el flujo normal.
- Todo cambio sensible debe registrar evento auditable.
- El sistema debe prevenir asignaciones o regularizaciones duplicadas para el mismo usuario, fecha, tipo y rango horario.
- El sistema debe advertir cuando una asignacion o regularizacion supera una duracion maxima razonable.
- La aprobacion de regularizacion no debe permitir `approvedHours` mayor que `requestedHours` sin observacion obligatoria.
- La validacion no debe permitir `validatedHours` mayor que `assignedHours` o `approvedHours` sin permiso especial y observacion.
- Si una asignacion cambia de horario despues de notificada, debe generar evento de reprogramacion.
- Si una regularizacion cambia de horario despues de aprobada, debe volver a `PROCESO` o generar una nueva revision.
- Si una asignacion o regularizacion pertenece a un periodo cerrado, solo debe modificarse mediante reapertura administrativa.
- Las notificaciones deben emitirse cuando cambia el estado de una asignacion o regularizacion.

## Reglas de calculo sugeridas

Estas reglas deben definirse antes de implementar liquidacion. Si no estan claras, la primera version debe registrar horas reconocidas sin calcular monto.

Decisiones a confirmar:

- Si el bono se paga por monto fijo, por horas, por multiplicador o por tipo.
- Si domingo y feriado se reconocen por dia completo o por horas reales.
- Si madrugada se calcula por rango horario fijo, por ejemplo desde 22:00 hasta 06:00.
- Si jornada extendida tiene tope maximo de horas reconocidas.
- Si horas extra requieren superar una jornada base registrada en asistencia.
- Si un caso puede tener mas de un tipo, por ejemplo domingo y madrugada.
- Si se permite redondeo de horas y cual sera la regla.
- Si el calculo cambia por area, cargo o contrato.

Recomendacion para v1:

- Registrar `assignedHours`, `executedHours` y `validatedHours`.
- Usar `requestedHours` y `approvedHours` solo para regularizaciones.
- No calcular `amount` automaticamente hasta tener reglas cerradas.
- Permitir exportar horas validadas por tipo para que administracion revise.

## Casos especiales

### Jornada extendida en amanecida

Si una jornada inicia un dia y termina al dia siguiente, la UI debe mostrar ambas fechas con claridad. El calculo de horas debe considerar cruce de medianoche y no ordenar mal el rango por usar solo horas.

### Domingo o feriado

Si la fecha corresponde a domingo o feriado configurado, el sistema puede sugerir automaticamente el tipo de bono. La regla de feriados deberia ser administrable si el negocio necesita precision anual.

### Regularizacion retroactiva

Si la fecha ya paso y no existe asignacion previa, el sistema debe pedir sustento obligatorio. La regularizacion no debe pasar directo a liquidacion aunque la cree un MOD.

### Cruce con salidas o permisos

Si el usuario tiene una licencia, permiso o salida dentro del horario solicitado, el sistema debe bloquear o advertir segun regla final de negocio.

### Asignacion masiva

Cuando MOD asigna a varios usuarios, cada beneficiario debe tener su propio registro para permitir validacion individual. No debe existir un unico registro compartido que impida ajustar horas por trabajador.

### Diferencia entre aprobado y validado

`APROBADO` significa que el caso fue autorizado. `VALIDADO` significa que las horas reales fueron reconocidas. La UI debe evitar que ambos estados parezcan equivalentes.

### Registro duplicado

Si un usuario ya tiene una asignacion o regularizacion en el mismo rango horario y tipo, el sistema debe bloquear duplicados o mostrar advertencia fuerte antes de continuar. En vista MOD, la advertencia debe mostrar el estado del registro existente.

### Periodo cerrado

Si una asignacion o regularizacion pertenece a un periodo ya liquidado o cerrado, la UI debe ocultar acciones normales de edicion. Cualquier cambio debe pasar por una accion administrativa especial y quedar auditado.

### Evidencia insuficiente

Si no hay asistencia, puerta ni archivo de sustento, el registro no debe validarse sin observacion obligatoria. La UI debe indicar exactamente que falta.

## Pruebas recomendadas

### Automaticas

- Crear asignacion individual en `ASIGNADO`.
- Crear asignacion MOD para multiples usuarios.
- Crear regularizacion individual en `PROCESO`.
- Validar permisos de usuario comun contra registros ajenos.
- Validar aprobacion MOD de regularizacion.
- Validar rechazo de regularizacion con observacion.
- Validar observacion y posterior correccion de regularizacion.
- Validar que no se edita un registro `LIQUIDADO`.
- Validar calculo de horas cruzando medianoche.
- Validar bloqueo por licencia o permiso cruzado.
- Validar bloqueo o alerta por registro duplicado.
- Validar que una regularizacion observada vuelva a `PROCESO` al corregirse.
- Validar que no se liquide un registro sin `validatedHours`.
- Validar que no se edite un registro en periodo cerrado.
- Validar resumen de conteos para Usuario y MOD.
- Validar reporte solo con registros `VALIDADO` o `LIQUIDADO`.

### Manuales

- Crear asignacion de horas extra.
- Crear asignacion de domingo.
- Crear asignacion de madrugada cruzando medianoche.
- Crear regularizacion retroactiva con sustento.
- Aprobar una regularizacion desde vista MOD.
- Observar una regularizacion y corregirla desde vista usuario.
- Validar menos horas que las solicitadas.
- Registrar asignacion para varios usuarios.
- Revisar reporte por rango de fechas.
- Confirmar que Usuario y MOD ven acciones distintas.
- Confirmar que la UI no mezcla pendientes con bonos reconocidos.
- Probar el formulario desde mobile.
- Probar estados vacios de Usuario y MOD.
- Probar advertencia por registro duplicado.
- Probar regularizacion observada, correccion y nueva aprobacion.
- Probar liquidacion y bloqueo de edicion posterior.

## Pendientes o mejoras futuras

- Definir si el modulo calculara montos o solo horas reconocidas.
- Definir reglas exactas para domingos, feriados y madrugada.
- Definir si liquidacion pertenece a MOD o a un rol administrativo superior.
- Crear calendario de feriados administrable.
- Integrar validacion automatica con asistencia.
- Integrar referencias de Control de puerta como evidencia secundaria.
- Agregar sockets si se necesita refresco en vivo de aprobaciones.
- Definir exportacion PDF o Excel para planilla.
- Definir si se permitiran reglas por area, cargo o tipo de trabajador.
- Definir periodos de corte: semanal, quincenal o mensual.
- Definir si se necesita firma digital o visto bueno adicional.
- Definir si se mostrara el monto estimado al usuario o solo horas reconocidas.
- Definir si se permitiran regularizaciones borrador.
- Definir politicas de notificacion: socket, campana interna, correo o solo refresco manual.

## MVP recomendado

Para reducir riesgo, la primera version deberia enfocarse en registrar y validar horas, no en calcular dinero automaticamente.

Alcance recomendado para v1:

- Ruta `/#/tramites/bono-produccion`.
- Vista Usuario con `Mis bonos`, detalle, sustento y regularizacion opcional.
- Vista MOD/Gerencia con asignacion masiva, filtros, reprogramacion, anulacion y validacion.
- Vista MOD para aprobar, observar o rechazar regularizaciones.
- Tipos basicos: `HORAS_EXTRA`, `DOMINGO`, `MADRUGADA`, `CORRIDO`, `OTRO`.
- Sustento por archivo o nota.
- Cruce preventivo con licencias activas o aprobadas.
- Registro de eventos de auditoria.
- Reporte de registros `VALIDADO` por rango de fechas.
- Exportacion simple si administracion la necesita desde el inicio.

Fuera de v1, salvo prioridad del negocio:

- Calculo automatico de monto.
- Calendario administrable de feriados.
- Periodos cerrados complejos.
- Reglas por area, cargo o contrato.
- Integracion automatica profunda con asistencia y control de puerta.

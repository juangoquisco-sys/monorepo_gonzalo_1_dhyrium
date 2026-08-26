# Modulo: Control de asistencia

## Proposito

El modulo `control-asistencia` centraliza el control operativo de asistencias, salidas e incidencias del personal. Su objetivo es que el seguimiento semanal o por periodo sea facil de revisar, corregir y auditar sin destruir los registros originales.

La primera etapa unifica dos experiencias existentes:

- `Asistencia`: pasa a ser el submodulo `registro`.
- `Salidas`: sale de `tramites` y pasa a ser el submodulo `salidas`.

`Control de puerta` queda fuera de esta unificacion por ahora. Ese modulo tiene reglas propias de controlador, evidencias, regularizaciones y penalidades en tiempo real, por lo que se integrara despues cuando el modelo de permisos este estabilizado.

La decision central es que una falta o tardanza perdonada no modifica directamente `ListOnUsers`. El sistema debe conservar el registro original y crear una reconciliacion trazable que permita calcular un estado efectivo para reportes y descuentos nuevos.

## Usuarios y permisos

El acceso funcional usa el sistema actual de permisos por menu y submenu:

- Menu: `control-asistencia`.
- Submenus:
  - `registro`: asistencia diaria, solo `MOD`.
  - `salidas`: solicitudes e historial de salidas, `MOD` y `USER`.
  - `incidencias`: consulta de faltas y tardanzas. `MOD` ve todo el personal activo; `USER` solo ve sus propias incidencias.
  - `reconciliar-faltas`: perdon de incidencias, solo `MOD`.

Compatibilidad inicial:

- Los roles con acceso al menu actual `asistencia` deben recibir acceso a `control-asistencia/registro`.
- Los roles con acceso a `tramites/salidas` deben recibir acceso a `control-asistencia/salidas`.
- La ruta antigua `/asistencia` debe redirigir a `/control-asistencia/registro`.
- La ruta antigua `/tramites/salidas` debe redirigir a `/control-asistencia/salidas`.

## Alcance v1

La version inicial se enfoca en reconciliar incidencias de asistencia de un usuario por periodo.

Estados reconciliables:

- `TARDE`
- `SIMPLE`
- `GRAVE`
- `MUY_GRAVE`

Estados no reconciliables:

- `PUNTUAL`
- `PERMISO`
- `SALIDA`

En v1, solo un `MOD` puede aplicar una reconciliacion directamente. Los usuarios pueden consultar sus incidencias, pero no solicitar ni aprobar perdones. La solicitud de usuario y el flujo de aprobacion quedan para una version posterior.

## Flujos principales

### 1. Consulta de incidencias como MOD

1. El MOD entra a `Control de asistencia > Incidencias`.
2. Selecciona un preset de periodo: `Ultima semana`, `Ultimo mes` o `Periodo libre`.
3. Opcionalmente filtra por usuario activo.
4. El sistema muestra faltas, tardanzas, faltas graves y muy graves del personal activo.
5. Cada fila muestra el estado original y el estado efectivo.

Resultado: el MOD puede revisar rapidamente el estado disciplinario operativo sin entrar a reportes individuales.

### 2. Consulta de incidencias como USER

1. El usuario entra a `Control de asistencia > Incidencias`.
2. Selecciona periodo.
3. El sistema solo muestra sus propias incidencias.
4. Si existe una reconciliacion activa, se muestra el estado original y el ajuste aplicado.

Resultado: el usuario puede entender que registros siguen vigentes y cuales fueron perdonados.

### 3. Reconciliacion de faltas

1. El MOD entra a `Control de asistencia > Reconciliar faltas`.
2. Busca un usuario activo.
3. Selecciona un periodo con presets rapidos o rango libre.
4. El sistema lista incidencias reconciliables del usuario.
5. El MOD selecciona una o varias incidencias.
6. Ingresa una justificacion obligatoria comun.
7. Confirma la reconciliacion.
8. El sistema crea un lote de reconciliacion y sus items asociados.

Resultado: varias faltas o tardanzas quedan perdonadas con una sola justificacion, manteniendo trazabilidad de quien, cuando y por que aplico la reduccion.

### 4. Anulacion de reconciliacion

1. El MOD abre el historial de reconciliaciones.
2. Selecciona una reconciliacion activa.
3. Ingresa una razon de anulacion.
4. El sistema marca la reconciliacion como anulada sin borrar registros.

Resultado: el estado efectivo vuelve a calcularse desde el registro original.

## Modelo de dominio

El contexto nuevo debe seguir una estructura DDD similar a `gateControl`:

- `src/services/attendanceControl/domain`
- `src/services/attendanceControl/application`
- `src/services/attendanceControl/infrastructure`
- `types/attendanceControl.d.ts`

Responsabilidades sugeridas:

- `domain`: reglas de estados reconciliables, validacion de periodo, validacion de seleccion y politicas de estado efectivo.
- `application`: casos de uso para listar incidencias, crear reconciliacion, listar reconciliaciones y anular reconciliacion.
- `infrastructure`: selects, includes y queries Prisma para asistencia, usuarios y reconciliaciones.

Modelos Prisma propuestos:

- `AttendanceReconciliation`

  - `id`
  - `userId`
  - `createdById`
  - `periodStart`
  - `periodEnd`
  - `reason`
  - `status`
  - `voidedAt`
  - `voidedById`
  - `voidReason`
  - `createdAt`
  - `updatedAt`

- `AttendanceReconciliationItem`
  - `id`
  - `reconciliationId`
  - `usersId`
  - `listId`
  - `originalStatus`
  - `resolvedStatus`
  - `createdAt`

Reglas:

- `AttendanceReconciliationItem` apunta a una incidencia real por la clave compuesta actual de `ListOnUsers`: `usersId + listId`.
- Una incidencia no puede tener mas de una reconciliacion activa.
- `originalStatus` conserva el estado encontrado al reconciliar.
- `resolvedStatus` en v1 sera `PUNTUAL`.
- Anular una reconciliacion no borra items; solo cambia el estado del lote.

## APIs planeadas

### `GET /attendance-control/incidents`

Consulta incidencias por periodo.

Query:

- `dateFrom`
- `dateTo`
- `userId`
- `statuses`
- `scope`

Reglas:

- `MOD` puede consultar cualquier usuario activo o todo el personal activo.
- `USER` ignora `userId` externo y solo consulta su propio usuario.
- La respuesta debe incluir `originalStatus`, `effectiveStatus` y datos de reconciliacion si existen.

### `POST /attendance-control/reconciliations`

Crea una reconciliacion.

Body:

- `userId`
- `periodStart`
- `periodEnd`
- `reason`
- `items`: lista de `{ usersId, listId }`

Reglas:

- Solo `MOD`.
- `reason` es obligatorio.
- Todos los items deben pertenecer al mismo usuario.
- Todos los items deben estar dentro del periodo declarado.
- Solo se aceptan estados reconciliables.
- Se debe rechazar una incidencia que ya tenga reconciliacion activa.

### `GET /attendance-control/reconciliations`

Lista reconciliaciones por usuario y periodo.

Query:

- `userId`
- `dateFrom`
- `dateTo`
- `status`

Reglas:

- `MOD` puede listar reconciliaciones de cualquier usuario activo.
- `USER` solo puede listar las suyas.

### `PATCH /attendance-control/reconciliations/:id/void`

Anula una reconciliacion.

Body:

- `reason`

Reglas:

- Solo `MOD`.
- La razon de anulacion es obligatoria.
- Una reconciliacion anulada no puede volver a anularse.

## Reportes y calculos

Los reportes nuevos deben diferenciar:

- `originalStatus`: estado guardado en `ListOnUsers`.
- `effectiveStatus`: estado calculado despues de aplicar una reconciliacion activa.

El conteo de faltas, tardanzas y descuentos debe usar `effectiveStatus` cuando exista. El registro original nunca se borra ni se sobrescribe.

Pantallas y reportes afectados:

- Reporte de asistencia por rango.
- Vista de incidencias de usuario.
- Calculos usados por reportes personales y adelantos cuando consultan asistencia.

## Frontend

La UI nueva debe usar los componentes del design system basado en Shadcn:

- `src/components/app-ui`
- `src/components/ui`
- Tokens de `src/index.css`

Patrones de uso:

- Filtros de periodo como botones de accion rapida: `Ultima semana`, `Ultimo mes`, `Periodo libre`.
- Tabla densa para incidencias y reconciliaciones.
- Badges para estados originales y efectivos.
- Confirmacion antes de aplicar una reconciliacion masiva.
- Justificacion obligatoria en un textarea o campo equivalente.

La pantalla de reconciliacion debe optimizar el flujo semanal: buscar usuario, elegir periodo, seleccionar multiples incidencias y aplicar una sola justificacion.

## Pruebas y aceptacion

Backend:

- Un `MOD` puede crear una reconciliacion con multiples incidencias de un usuario.
- El sistema rechaza reconciliaciones sin justificacion.
- El sistema rechaza `PUNTUAL`, `PERMISO` y `SALIDA`.
- El sistema rechaza items de varios usuarios en un mismo lote.
- El sistema rechaza doble reconciliacion activa sobre la misma incidencia.
- Anular una reconciliacion cambia el calculo efectivo sin borrar trazabilidad.
- Un `USER` no puede crear ni anular reconciliaciones.
- Un `USER` solo puede consultar sus propias incidencias.

Frontend:

- `MOD` ve incidencias de todo el personal activo.
- `USER` solo ve sus incidencias.
- Los presets de periodo actualizan fechas y resultados.
- La seleccion multiple permite una sola justificacion.
- La UI muestra estado original y estado efectivo.
- Las rutas legacy redirigen correctamente.

Verificacion final:

- Backend: `npm run build`.
- Frontend: `npm run build`.
- Pruebas unitarias del dominio de reconciliacion.
- Pruebas de permisos para endpoints nuevos.

## Pendientes para fases futuras

- Permitir que el usuario solicite reconciliacion y que un MOD la apruebe.
- Adjuntar archivos o evidencias a una reconciliacion.
- Integrar penalidades de `control-puerta`.
- Permitir reconciliaciones masivas de varios usuarios cuando exista una razon institucional comun.
- Agregar metricas de auditoria para frecuencia de perdones por usuario, periodo y moderador.

## Registro manual y captura biometrica ZKTeco v1

La captura biometrica reutiliza `List` y `ListOnUsers`; no crea sesiones,
participantes ni eventos biometricos adicionales. El `userId` configurado en el
equipo es el DNI del usuario. El sistema no sincroniza huellas ni persiste
plantillas, imagenes o datos biometricos.

### Ciclo de vida y fotografía de participantes

- Toda lista crea en la misma transaccion una fotografía en `ListOnUsers` de
  todos los usuarios activos presenciales. `REMOTO` se excluye mediante
  `activeNonRemoteUserWhere` en el backend; el frontend no decide elegibilidad.
- Una lista manual se crea como `MANUAL/OPEN`. Los administradores editan en
  `OPEN` y `POST /list/:id/finalize` la mueve directamente a `FINALIZED`.
- Una lista con huella se crea como `BIOMETRIC/OPEN`. `POST /list/:id/close`
  la mueve a `REVIEW`; las correcciones administrativas solo se permiten en
  `REVIEW` y `POST /list/:id/finalize` la mueve a `FINALIZED`.
- Quien no tiene licencia o salida vigente empieza internamente en `SIMPLE`
  con origen `SYSTEM_DEFAULT`. `PERMISO` y `SALIDA` usan origen `LICENSE`.
  En una lista abierta, la interfaz del usuario traduce el `SIMPLE` automático
  a “Pendiente de marcar huella” o “Pendiente de confirmación”; no es una falta
  definitiva hasta finalizar.
- Solo una lista pendiente puede existir globalmente, sin importar si es
  `MANUAL/OPEN`, `BIOMETRIC/OPEN` o `BIOMETRIC/REVIEW`. La regla evita que la
  interfaz y ADMS PUSH operen sobre llamados distintos y se refuerza con el
  indice parcial `List_one_pending_attendance_key` de
  `prisma/manual-db-push-constraints.sql`.
- Una huella valida cambia atomicamente `SIMPLE` a `PUNTUAL` y completa
  `biometricMarkedAt`, `biometricVerifyMode` y `biometricDeviceSerial`.
- `POST /list/:id/close` cambia `OPEN` a `REVIEW`; desde ese momento iClock
  sigue recibiendo `OK`, pero no altera la lista.
- `PATCH /list/:id/attendance/batch` confirma cambios administrativos. Solo
  admite `MANUAL/OPEN` y `BIOMETRIC/REVIEW`, deduplica por `userId` conservando
  el último cambio, valida todos los elementos antes de escribir y devuelve
  sus valores canónicos. Un elemento inválido revierte el batch completo.
- La finalización no acepta correcciones. El frontend cancela el debounce,
  confirma primero el batch pendiente y recién después finaliza.
- `DELETE /list/:id` descarta `MANUAL/OPEN`, `BIOMETRIC/OPEN` o
  `BIOMETRIC/REVIEW` y elimina en cascada sus participantes. Una lista
  `FINALIZED` no se puede descartar ni modificar.
- Ya no existe un borrado masivo de listas vacias. `POST /list` responde `409`
  si otra lista sigue pendiente; el usuario debe guardarla o descartarla de
  forma explicita.
- `GET /list/pending` devuelve esa lista pendiente sin limitarla al dia
  seleccionado, para que la interfaz bloquee tambien la creacion entre modos y
  fechas.
- `GET /list/attendance?startDate=YYYY-MM-DD` devuelve cada participante de la
  fotografía persistida junto con la identidad mínima necesaria para
  administrarlo. La interfaz no reconstruye la lista consultando usuarios o
  licencias vigentes: por eso un usuario que luego quede inactivo, remoto o
  cambie de licencia no desaparece retroactivamente de la lista creada. Los
  participantes se presentan primero por Gerencia General, luego gerentes y
  finalmente los demás, conservando el orden alfabético dentro de cada grupo.
- Reportes, incidencias, descuentos y planilla consultan exclusivamente listas
  `FINALIZED`.

La creación, batches, finalización, transiciones biométricas, descarte y
marcaciones usan transacciones serializables con reintento para evitar carreras
entre operaciones sobre la lista. Si dos administradores editan al mismo
tiempo, gana el último batch que el backend confirma.

### Origen y auditoría

`ListOnUsers.statusSource` es un `AttendanceStatusSource` persistido:

- `SYSTEM_DEFAULT`: estado automático inicial.
- `LICENSE`: licencia o salida vigente.
- `BIOMETRIC`: huella aceptada.
- `MANUAL`: primera asignación administrativa de una lista manual.
- `MANUAL_CORRECTION`: cambio administrativo posterior o cualquier corrección
  de una lista biométrica.

Una corrección no borra `biometricMarkedAt`, `biometricVerifyMode` ni
`biometricDeviceSerial`. Si el origen vigente es `BIOMETRIC`, el batch exige un
motivo individual.

Los eventos de dominio reutilizan `AuditLog` con acciones semánticas
`ATTENDANCE_*`. Apertura, huella aceptada, cierre, cada corrección, finalización
y descarte se escriben dentro de la misma transacción que el cambio. Las
correcciones registran lista, usuario afectado, valores y orígenes anterior y
nuevo, actor autenticado, motivo, `batchId`, modo y estado. La apertura registra
solo la cantidad de participantes; no genera una fila por cada `SIMPLE`
automático. Estos eventos aparecen en las herramientas existentes bajo el
módulo “Control asistencia”.

### Configuracion operativa

```env
ICLOCK_ALLOWED_SERIALS="SERIAL-REAL-1,SERIAL-REAL-2"
ICLOCK_FINGERPRINT_VERIFY_MODES="VALOR-CONFIRMADO"
ICLOCK_CLOCK_SKEW_SECONDS="30"
```

Los seriales y modos son listas separadas por comas. Ambas configuraciones
fallan de forma cerrada cuando estan vacias. El valor de `verifyMode` debe
confirmarse con el equipo real antes de habilitar produccion; no se presupone
que cualquier modo sea huella.

Las fechas del dispositivo se interpretan como hora local de Lima (`UTC-05:00`)
y deben estar entre `openedAt` y la hora actual mas la tolerancia configurada.
Un DNI desconocido, no convocado, con licencia, ya marcado, enviado por un
dispositivo no autorizado o recibido fuera de `OPEN` no modifica asistencia.

El equipo conserva la integracion ADMS PUSH existente fuera del prefijo de la
API: `POST /iclock/cdata?SN=<serial>&table=ATTLOG`. Cada fila se interpreta como
`DNI<TAB>fecha<TAB>status<TAB>verifyMode<TAB>workCode`. La respuesta es
`text/plain` con `OK`, incluso cuando no existe una lista abierta o la fila se
ignora por reglas de negocio. Los payloads ATTLOG/OPERLOG no se escriben en
logs; solo se registran conteos y resultados agregados.

### Sincronizacion basica de usuarios MB10-VL

Al crear un usuario, el backend crea en la misma transaccion una orden
`UPSERT_USER` por cada serial configurado en `ICLOCK_ALLOWED_SERIALS`. El DNI se
usa como `PIN` numerico y el nombre se normaliza al juego ASCII admitido por el
terminal. La respuesta administrativa conserva su contrato actual y no espera
que el dispositivo este conectado.

El MB10-VL recoge una orden por consulta mediante
`GET /iclock/getrequest?SN=<serial>`. La orden usa `DATA UPDATE USERINFO` y solo
sincroniza identidad basica: PIN, nombre, privilegio normal, grupo y zona
horaria predeterminados. No envia huellas, rostros, fotografias, tarjetas ni
plantillas biometricas.

Una orden entregada queda arrendada durante
`ICLOCK_COMMAND_LEASE_SECONDS` (60 segundos por defecto). Si no llega una
confirmacion, vuelve a estar disponible para evitar perderla por un corte de
red. El dispositivo confirma mediante
`POST /iclock/devicecmd?SN=<serial>` con `ID` y `Return`; retorno `0` marca la
orden como completada y cualquier otro retorno la marca como fallida.

La tabla `IclockDeviceCommand` requiere ejecutar `prisma db push` antes de
habilitar la funcion en un entorno. Si `ICLOCK_ALLOWED_SERIALS` esta vacio, los
usuarios se siguen creando normalmente pero no se generan ordenes ADMS.

Como alternativa al PUSH, el backend puede conectarse directamente al equipo
con `zkteco-js`. Esta conexion es opcional y se habilita al configurar:

```env
ZKTECO_DEVICE_IP="192.168.1.106"
ZKTECO_DEVICE_PORT="4370"
ZKTECO_DEVICE_TIMEOUT_MS="5200"
ZKTECO_DEVICE_INPORT="5000"
ZKTECO_REALTIME_VERIFY_MODE="VALOR-CONFIRMADO"
ZKTECO_RECONNECT_DELAY_MS="15000"
```

Al iniciar, el backend abre el socket, consulta el serial real del equipo,
recupera solo el conteo de registros historicos y activa la escucha en tiempo
real. No imprime el contenido historico ni DNIs. Cada evento en vivo se mapea al
mismo contrato interno de iClock y pasa por `markFromIclock`; por eso conserva
la validacion de serial, modo, ventana temporal, convocatoria e idempotencia.
`ZKTECO_REALTIME_VERIFY_MODE` es obligatorio para aplicar una marcacion porque
la version actual del SDK no incluye el modo de verificacion en el callback en
tiempo real. El valor tambien debe estar en
`ICLOCK_FINGERPRINT_VERIFY_MODES`. La conexion se mantiene durante la vida del
backend, se reintenta tras una desconexion y se cierra limpiamente con
`SIGINT`/`SIGTERM`.

Despues de `prisma db push` se debe ejecutar
`prisma/manual-db-push-constraints.sql`. No se ejecutan migraciones automaticas
para este repositorio.

Esta versión agrega el enum `AttendanceStatusSource` y la columna no nula
`ListOnUsers.statusSource` con valor predeterminado `SYSTEM_DEFAULT`. Siguiendo
el flujo operativo del repositorio, el despliegue debe ejecutar `prisma db push`
(no se agrega una carpeta de migración) antes de iniciar el backend actualizado.

### Tiempo real y recuperacion

Socket.IO emite:

- `server:attendance-list-opened`
- `server:attendance-marked`
- `server:attendance-status-updated`
- `server:attendance-list-closed`
- `server:attendance-list-finalized`
- `server:attendance-list-discarded`

Payloads semánticos:

- `server:attendance-list-opened|closed|finalized`:
  `{ listId, state }`.
- `server:attendance-marked`:
  `{ listId, state: "OPEN", userId, markedAt }`.
- `server:attendance-status-updated`:
  `{ listId, state, batchId }`; no transporta el estado como fuente de verdad.
- `server:attendance-list-discarded`: `{ listId }`.

La apertura, cierre, finalización y descarte se envían a las salas privadas de
todos los participantes, incluidos quienes tienen licencia o salida, y a los
MOD con permiso `control-asistencia/registro`. La marcación individual y el
cambio administrativo se envían a los usuarios afectados y a los MOD. Los
eventos se emiten solo después del commit y sirven para invalidar consultas;
el payload Socket.IO nunca sustituye a la lectura HTTP.

El aviso global usa `GET /list/attendance/current`, que obtiene el usuario de la
autenticación y devuelve únicamente su participación. Prioriza una lista
`OPEN/REVIEW` sin límite de fecha (para recuperar pendientes que crucen
medianoche); si no existe, devuelve la `FINALIZED` más reciente del día
operativo actual de Lima. Así no reaparecen listas históricas arbitrarias. El
frontend consulta al cargar, al reconectar, ante eventos y cada 30 segundos.
Una lista finalizada cerrada por el usuario se recuerda solo en ese navegador
con la clave versionada `attendance-finalized-dismissed:v1`; una lista con otro
ID vuelve a mostrarse.

El editor conserva pendientes locales por `userId`, aplica UI optimista y
reinicia un debounce de un segundo. Al fallar, revierte todo lo incluido en ese
batch a los últimos valores confirmados. Se acepta perder un debounce aún no
enviado al recargar o abandonar; no se usa `sessionStorage` ni `beforeunload`.
La pantalla administrativa mantiene las listas con React Query. Antes de
cambiar de lista o fecha confirma inmediatamente cualquier batch pendiente; si
esa confirmación falla conserva la selección actual y muestra el error. Los
eventos Socket.IO invalidan la consulta y HTTP vuelve a ser la fuente de verdad.

El evento histórico `client:call-notification`/`server:call-notification` fue
retirado. Duplicaba el estado de asistencia en memoria, no sobrevivía recargas y
podía dejar avisos obsoletos. El aviso persistente usa exclusivamente los seis
eventos `server:attendance-*` y `GET /list/attendance/current`.

### Verificacion focalizada

- `npm run test:biometric-attendance`
- `npm run test:iclock`
- `npm run test:zkteco-device`
- `npm run test:attendance-control`
- `npm run build`

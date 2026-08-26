# Modulo: Control de puerta

## Proposito

El modulo `control-puerta` administra permisos cortos de salida, normalmente de 5 o 10 minutos. Su objetivo es que el registro sea rapido en puerta, pero que ningun caso quede sin trazabilidad cuando el controlador no esta presente.

El modulo cubre tres situaciones principales:

- El controlador esta presente y registra salida y llegada.
- El usuario registra su salida o llegada desde `Mi control` porque el controlador no esta.
- El controlador revisa despues las regularizaciones y aprueba, rechaza o reduce penalidades con sustento.

La decision central es que una salida siempre se representa como un `GatePass`. Las solicitudes de regularizacion son detalles de revision asociados a esa misma salida, no salidas independientes.

## Usuarios y permisos

El acceso visual al modulo sigue usando permisos de menu y submenu del sistema. Sin embargo, las acciones reales de controlador estan protegidas en backend por DNI para evitar que cualquier usuario con un rol amplio pueda operar la puerta.

Controladores autorizados en codigo:

- Armando Quispe Condori: `70412578`
- Diego Romani Cotohuanca: `73520253`

Archivo principal:

- `src/services/gateControl/domain/gateControllerPolicy.ts`

Acciones protegidas por controlador:

- Buscar usuarios desde monitor.
- Crear permisos oficiales.
- Ver monitor operativo.
- Marcar llegadas.
- Ver historial, resumen y ranking.
- Aprobar o rechazar regularizaciones.
- Reducir penalidad con sustento.

Los usuarios comunes solo deben usar `Mi control` para auto-registrar salida o llegada.

## Flujos principales

### 1. Salida y llegada con controlador

1. El controlador busca al usuario por nombre, DNI o email.
2. Crea un permiso rapido de 5 o 10 minutos.
3. El sistema crea un `GatePass` con `source = CONTROLLER` y `status = ACTIVE`.
4. Al retorno, el controlador marca llegada.
5. El sistema calcula penalidad original y final.

Resultado: la salida queda `RETURNED`.

### 2. No hay controlador al salir ni al llegar

1. El usuario entra a `Mi control`.
2. Selecciona `Salir 5 min` o `Salir 10 min`.
3. Registra motivo y evidencia, preferentemente por WhatsApp.
4. El sistema crea un `GatePass` con `source = SELF_SERVICE` y `status = PENDING_EXIT_REVIEW`.
5. Tambien crea una solicitud `EXIT_REGULARIZATION`.
6. Cuando el usuario vuelve, envia llegada desde `Mi control`.
7. El sistema crea una solicitud `RETURN_REGULARIZATION` sobre el mismo `GatePass`.
8. En `Regularizaciones`, el controlador ve un solo caso: `Salida y llegada por validar`.
9. Si aprueba todo, se valida la salida, se calcula `dueAt`, se valida la llegada y se calcula la penalidad.

Resultado: la salida queda `RETURNED`, no aparecen dos casos separados.

### 3. Sale con controlador, vuelve sin controlador

1. El controlador crea el permiso oficial.
2. El usuario ve el permiso activo en `Mi control`.
3. Si al volver no esta el controlador, envia su llegada con evidencia.
4. El controlador revisa luego la solicitud `RETURN_REGULARIZATION`.

Resultado: la salida queda pendiente como `PENDING_RETURN_REVIEW` hasta aprobacion.

### 4. Sale sin controlador, vuelve con controlador

1. El usuario auto-registra salida.
2. La salida queda `PENDING_EXIT_REVIEW`.
3. Cuando vuelve, el controlador la ve en monitor.
4. El boton cambia a `Confirmar salida y llegada`.
5. El backend aprueba la salida pendiente y marca llegada en una sola transaccion.
6. El sistema emite un evento socket al usuario para refrescar `Mi control`.

Resultado: la salida queda `RETURNED`.

### 5. Actualizacion en vivo para el usuario

Cuando el controlador crea, cierra, aprueba, rechaza o ajusta una salida, el backend emite `server:gate-control-update` al room del usuario afectado. Cada socket ya se une al room con su `user.id`, por eso el frontend solo escucha ese evento desde `Mi control` y vuelve a consultar su estado.

Esto evita que el usuario tenga que refrescar la pagina para saber si ya le marcaron llegada o si tuvo tardanza.

El monitor tambien escucha `server:license-update`, porque las solicitudes creadas, aprobadas o cerradas desde `tramites/salidas` deben aparecer en puerta sin recargar la pagina. Ademas, el monitor refresca silenciosamente cada 30 segundos para cambios que dependen solo del reloj, como entrar a la ventana de 15 minutos, pasar de autorizada a en curso o vencer una solicitud pendiente.

## Modelo de datos

### GatePass

Representa la salida concreta de una persona. Es la entidad principal del modulo.

Campos importantes:

- `userId`: usuario que sale.
- `reason`: motivo de la salida.
- `requestedMinutes`: minutos permitidos.
- `source`: `CONTROLLER` o `SELF_SERVICE`.
- `status`: estado operativo de la salida.
- `actualExitAt`: hora oficial o declarada de salida.
- `dueAt`: hora limite calculada.
- `actualReturnAt`: hora oficial o aprobada de llegada.
- `originalPenaltyMinutes`: penalidad calculada antes de ajustes.
- `finalPenaltyMinutes`: penalidad final despues de reducciones.
- `createdById`, `departureMarkedById`, `returnMarkedById`: auditoria de actores.

Estados relevantes:

- `ACTIVE`: salida oficial abierta.
- `RETURNED`: salida cerrada.
- `CANCELLED`: salida rechazada o anulada.
- `PENDING_EXIT_REVIEW`: salida auto-registrada esperando aprobacion.
- `PENDING_RETURN_REVIEW`: llegada declarada esperando aprobacion.

### GateReviewRequest

Representa una solicitud de revision asociada a un `GatePass`.

Tipos:

- `EXIT_REGULARIZATION`: usuario declara una salida sin controlador.
- `RETURN_REGULARIZATION`: usuario declara una llegada sin controlador.
- `PENALTY_REDUCTION`: solicitud o ajuste para reducir penalidad.

La pantalla de `Regularizaciones` agrupa estas solicitudes por `gatePassId` para que el controlador vea un caso completo por salida.

### GateEvidence

Guarda evidencias de una salida o solicitud. Para la v1, WhatsApp no esta integrado por API. El sistema registra que el usuario envio evidencia por WhatsApp usando `WHATSAPP_SCREENSHOT` y una nota de texto.

Tipos usados:

- `WHATSAPP_SCREENSHOT`: evidencia enviada o indicada por WhatsApp.
- `PHOTO`: foto subida al sistema.
- `OTHER_FILE`: archivo general.
- `NOTE`: nota textual.

### GateEvent

Auditoria interna. Responde quien hizo que, cuando y con que motivo.

Eventos principales:

- `PASS_CREATED`
- `EXIT_MARKED`
- `RETURN_MARKED`
- `REQUEST_SUBMITTED`
- `REQUEST_APPROVED`
- `REQUEST_REJECTED`
- `PENALTY_REDUCED`

## Backend

Rutas principales:

- `GET /gate-control/users/search?query=...`
- `POST /gate-control/passes`
- `GET /gate-control/passes/active`
- `GET /gate-control/licenses/pending`
- `GET /gate-control/licenses/authorized`
- `PATCH /gate-control/licenses/:id/approve`
- `GET /gate-control/passes/my-active`
- `GET /gate-control/passes/my-history`
- `PATCH /gate-control/passes/:id/return`
- `GET /gate-control/passes/history`
- `GET /gate-control/summary`
- `GET /gate-control/tardiness-ranking`
- `POST /gate-control/passes/:id/review-requests`
- `GET /gate-control/review-requests?status=PENDING`
- `PATCH /gate-control/review-requests/:id/approve`
- `PATCH /gate-control/review-requests/:id/reject`
- `PATCH /gate-control/passes/:id/review-requests/approve-pending`
- `PATCH /gate-control/passes/:id/review-requests/reject-pending`
- `PATCH /gate-control/passes/:id/penalty-adjustment`

Archivos principales:

- `src/routes/gateControl.routes.ts`
- `src/controllers/gateControl.controllers.ts`
- `src/services/gateControl/application/gateControl.service.ts`
- `src/services/gateControl/domain/gateTimePolicy.ts`
- `src/services/gateControl/domain/gateControllerPolicy.ts`
- `src/services/gateControl/infrastructure/gateControl.repository.ts`
- `types/gateControl.d.ts`

## Frontend

Ruta principal:

- `/control-puerta`

Subrutas:

- `/control-puerta/monitor`
- `/control-puerta/regularizaciones`
- `/control-puerta/historial`
- `/control-puerta/mi-control`

Pantallas:

- `Monitor`: vista operativa del controlador para crear permisos y marcar retornos. Prioriza velocidad: buscador por teclado, motivo por defecto y tarjetas de estado.
- `Regularizaciones`: bandeja agrupada por salida para aprobar o rechazar casos.
- `Historial`: movimientos y ranking de tardanzas.
- `Mi control`: vista simple para usuarios que salen o llegan sin controlador.

En `Mi control`, el historial completo no se muestra de entrada para no sobrecargar la pantalla. Solo se muestra una tarjeta compacta de `Ultima salida`, con resultado puntual o minutos de tardanza. El resto del historial queda oculto detras de `Ver historial`.

En el `Monitor`, el buscador de usuarios soporta teclado para rapidez:

- `ArrowDown`: entra o avanza en las opciones.
- `ArrowUp`: retrocede.
- `Enter`: selecciona el usuario resaltado.
- `Escape`: cierra resultados.

El motivo `Ir a la tienda` queda seleccionado por defecto para reducir clics en el caso mas frecuente.

Archivos principales del frontend:

- `src/pages/gateControl/GateControl.tsx`
- `src/pages/gateControl/GateControlLayout.tsx`
- `src/pages/gateControl/gateControl.css`
- `src/pages/gateControl/services/gateControl.service.ts`
- `src/pages/gateControl/models/index.ts`

## Reglas y decisiones de dominio

- Los permisos rapidos no deben exceder 10 minutos.
- Una salida se modela siempre como un `GatePass`.
- Las licencias aprobadas desde `tramites/salidas` se muestran en el monitor mediante un transformador en tiempo de consulta, no como registros insertados en `GatePass`.
- Una licencia `ACEPTADO` futura aparece como `Salidas autorizadas` solo desde 15 minutos antes de su hora programada, en una seccion plegable informativa; no cuenta como persona fuera ni habilita llegada hasta que se active.
- La fila traducida activa usa el id sintetico `license-{id}` y aparece en `Salidas en curso` cuando la solicitud ya esta dentro de su rango horario.
- Una licencia activa sin llegada permanece visible en `Salidas en curso` hasta 20 minutos despues del retorno previsto; pasado ese margen, el modulo Salidas la cierra como `Ingreso no registrado` y el traductor deja de mostrarla.
- El transformador adapta la convencion horaria de `Licenses` al formato usado por `GatePass`, evitando que el cronometro marque `Tiempo excedido` por desfase.
- Si una licencia ya entro en su hora de salida, el monitor actualiza su estado a `ACTIVO` en `Licenses` para que Salidas y Control de puerta queden alineados.
- El controlador no puede crear un permiso rapido para un usuario que ya tiene un `GatePass` vigente o una licencia aprobada/activa que se cruza con el horario solicitado.
- Cuando el controlador marca llegada de una fila traducida desde Salidas, se actualiza `Licenses.checkout`, `Licenses.fine` y `Licenses.status = INACTIVO`, sin modificar tablas propias de Control de puerta.
- Cuando Salidas/Home registra la llegada de una licencia traducida, el monitor recibe `server:gate-control-update` y refresca la lista en curso.
- Las solicitudes de varios dias se traducen por ocurrencia; marcar llegada en una fecha no debe cerrar ni ocultar las demas fechas futuras del mismo grupo.
- Las solicitudes pendientes de `tramites/salidas` (`Licenses.status = PROCESO`) tambien pueden aparecer en el monitor como `Salidas pendientes` desde 15 minutos antes de su hora de salida.
- Una solicitud pendiente se oculta 10 minutos despues de su hora de salida si no fue autorizada; al vencer, el traductor la marca como `DENEGADO` con `feedback = No atendido` en la licencia original.
- Las filas pendientes se muestran mediante traductor con id sintetico `pending-license-{id}`; no crean ni modifican registros `GatePass`.
- El controlador puede autorizar una fila pendiente desde puerta. Esto actualiza la licencia original a `ACEPTADO` o `ACTIVO` segun la hora actual, registra `supervisorId` y refresca Salidas y Control de puerta por socket.
- Si al autorizar todavia no llego la hora de salida, la solicitud pasa a `Salidas autorizadas`; si ya esta dentro del rango, pasa a `Salidas en curso`.
- La transicion `Salidas autorizadas -> Salidas en curso` ocurre por el traductor al consultar el monitor, sin insertar filas en tablas propias de puerta.
- Control de puerta no autoriza padres recurrentes desde el monitor; solo ocurrencias concretas. La aprobacion completa de varios dias se mantiene en el modulo Salidas.
- La salida y la llegada declaradas por el usuario pueden generar dos solicitudes, pero deben mostrarse como un solo caso si pertenecen al mismo `GatePass`.
- Ningun ajuste de penalidad debe editar silenciosamente los tiempos. Debe crear una solicitud o evento auditable.
- La penalidad final se calcula como `originalPenaltyMinutes` menos reducciones aprobadas, sin bajar de cero.
- WhatsApp es evidencia preferida en UX, pero en v1 solo se registra como evidencia manual, sin integracion automatica.
- El permiso visual por rol no es suficiente para operar la puerta. Las acciones sensibles se validan por DNI en backend.
- Los cambios de una salida deben emitir `server:gate-control-update` al usuario afectado para mantener `Mi control` sincronizado.
- Los cambios originados en Salidas deben emitir tambien `server:gate-control-update`; Control de puerta escucha ese evento y `server:license-update` para mantener sincronizadas las secciones pendientes, autorizadas y en curso.

## Casos especiales

### El usuario ya envio llegada

`Mi control` debe mostrar un estado claro de `Llegada enviada para revision` y evitar reenvios duplicados.

### El controlador cierra una salida auto-registrada

Si el `GatePass` esta `PENDING_EXIT_REVIEW`, el monitor permite `Confirmar salida y llegada`. El backend aprueba la salida pendiente y registra la llegada en la misma transaccion.

Despues de cerrar la salida, `Mi control` se actualiza por socket y muestra la tarjeta de ultima salida con el resultado.

### Rechazo de caso agrupado

Si se rechaza una regularizacion que incluye salida pendiente, el `GatePass` queda `CANCELLED`. Si solo se rechaza llegada, la salida vuelve a quedar activa.

## Pruebas recomendadas

### Automaticas

- Backend: `npm run test:gate-control`
  - Valida duracion maxima de 10 minutos.
  - Valida calculo de vencimiento y penalidad.
  - Valida estados runtime (`ACTIVE`, `LATE`, `PENDING_REVIEW`).
  - Valida DNIs autorizados para controlador.
- Frontend e2e: `npm run test:e2e:gate-control`
  - Valida que `Ir a la tienda` este seleccionado por defecto.
  - Valida navegacion del buscador con `ArrowDown` y seleccion con `Enter`.

### Manuales

- Crear permiso oficial desde monitor y marcar retorno puntual.
- Crear permiso oficial y marcar retorno tarde.
- Auto-registrar salida desde `Mi control`.
- Auto-registrar salida y luego llegada sin controlador; verificar que regularizaciones muestre un solo caso agrupado.
- Aprobar caso agrupado y confirmar que el `GatePass` queda `RETURNED`.
- Rechazar caso agrupado y confirmar que el `GatePass` queda `CANCELLED`.
- Auto-registrar salida y marcar retorno desde monitor con `Confirmar salida y llegada`.
- Confirmar que `Mi control` se actualiza por socket cuando el controlador marca retorno.
- Confirmar que la ultima salida muestra puntualidad o minutos de tardanza sin abrir el historial.
- Enviar evidencia por WhatsApp y confirmar que se registra como `WHATSAPP_SCREENSHOT`.
- Intentar aprobar regularizacion con usuario que tenga rol permitido pero DNI no autorizado; debe fallar.
- Confirmar que Armando y Diego pueden operar como controladores.

## Pendientes o mejoras futuras

- Mover los DNIs de controladores a configuracion administrable en base de datos.
- Integrar WhatsApp real si se requiere trazabilidad automatica de mensajes.
- Agregar pruebas automatizadas de servicio para aprobacion agrupada y permisos por DNI.
- Separar componentes frontend de `GateControl.tsx` si el modulo sigue creciendo.
- Agregar filtros por fecha y estado en regularizaciones e historial.

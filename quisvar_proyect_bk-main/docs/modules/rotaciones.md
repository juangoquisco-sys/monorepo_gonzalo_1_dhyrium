# Rotaciones

## Alcance

Rotaciones materializa responsabilidades periódicas con un padrón explícito y versionado. El padrón puede seleccionarse manualmente o sincronizarse, con vista previa y confirmación, desde el personal activo presencial. Crear o editar una actividad genera solamente sus próximos turnos; el usuario no ejecuta un generador global ni administra el cron.

El módulo mantiene tres responsabilidades separadas:

- `dutyPlanner.policy.ts`: planificador puro. Convierte recurrencia, vigencia y rango en ocurrencias deterministas sin acceder a Prisma.
- `dutyAllocation.policy.ts`: asignador puro de todos los participantes entre grupos, cupos y restricciones.
- `dutyReconciler.service.ts`: compara el plan con turnos persistidos, conserva turnos protegidos y crea o elimina únicamente futuros automáticos seguros.
- `duty.service.ts`: casos de uso transaccionales para previsualizar, crear, editar, cambiar estado y reparar una actividad.

No se introdujeron repositorios pasivos, colas, workers ni dependencias nuevas.

## Actividades y recurrencia

Una actividad contiene nombre, descripción, capacidad opcional, días de acceso, frecuencia, estrategia de asignación, origen y versión del padrón, política de evidencia, vigencia, participantes ordenados, exclusiones y versión de configuración. La regla se valida con Zod al entrar por HTTP y también al leer JSON persistido.

`GET /duty-rotations/duties` no expone el JSON de Prisma directamente. Devuelve un DTO administrativo con `configurationStatus`, `configurationIssues` y `allowedActions`. Una regla inválida o incompleta se entrega como `INVALID`, con `recurrenceRule: null`. Puede inspeccionarse y, si está activa, desactivarse, pero no editarse desde un borrador, repararse ni reactivarse hasta corregir los datos.

Frecuencias:

- `ONCE`: una fecha exacta.
- `DAILY`: una ocurrencia por cada fecha cuyo día de semana esté habilitado.
- `WEEKLY`: un ciclo de siete días que comienza exactamente en `validFrom`. El backend deriva y persiste internamente `weekStartsOn` a partir de esa fecha. El periodo va desde el primer hasta el último día seleccionado según el orden relativo del ciclo y vence en ese último día.
- `MONTHLY`: una ocurrencia por cada día configurado. Un día inexistente, como 31 de febrero, se omite.

Solo se planifican periodos completos dentro de `validFrom` y `validUntil`. En semanal, `validFrom` siempre es la clave del primer ciclo y las siguientes claves avanzan siete días; un `validUntil` que corta el periodo final hace que ese ciclo se omita. Una exclusión semanal elimina la ocurrencia completa identificada por esa clave, sin recortarla ni moverla.

Los días semanales no consecutivos forman un único periodo continuo desde el primer hasta el último día seleccionado dentro del ciclo; no crean subperiodos ni asignaciones diarias. Toda regla persistida `WEEKLY` incluye `weekStartsOn`, sincronizado por el backend con `validFrom` al crear o editar la configuración de recurrencia. Una sincronización exclusiva del padrón conserva el anclaje semanal persistido.

## Participantes y orden

`DutyRotationParticipant` guarda `dutyId`, `userId` y `position`. Hay restricciones únicas por usuario y por posición dentro de cada actividad. El backend acepta únicamente participantes activos y elegibles; los roles se usan solo para facilitar la selección en la interfaz. `ACTIVE_ELIGIBLE_SYNC` sigue guardando personas concretas y no incorpora altas o bajas hasta que un administrador previsualiza y confirma la sincronización.

La primera unidad planificada usa el primer participante y las siguientes avanzan circularmente. `ONE_OWNER_PER_PERIOD` crea una sola asignación y normaliza su bloque técnico como `period / Periodo completo`; el usuario no configura tareas adicionales. En `ONE_OWNER_PER_SLOT`, cada bloque configurable consume una posición del orden. El índice se deriva del plan desde `planningStartsOn`, por lo que reparar una ocurrencia faltante produce el mismo responsable sin contar asignaciones de otras actividades.

`DISTRIBUTE_PARTICIPANTS` crea una tarea por persona y ocurrencia. Cada grupo define un cupo fijo o es el único grupo flexible que recibe al personal restante. Las restricciones opcionales son listas explícitas. Cada bloque puede incluir `instructions` opcionales de hasta 500 caracteres. El algoritmo evita repetir el grupo anterior cuando existe un emparejamiento completo, equilibra el historial y desempata por posición e identificador. Una restricción única adicional impide dos tareas para la misma persona en una ocurrencia. La vista previa conserva los avisos generales en `warnings` y expone las repeticiones inevitables por jornada en `distributionWarnings`, con periodo y cantidad de participantes afectados.

## Turnos persistidos

Cada `DutyRotationAssignment` conserva `occurrenceKey`, `periodStart`, `periodEnd`, `dueOn`, `slotKey`, grupo base, posición, etiqueta, `slotInstructions`, responsable, versiones de configuración y padrón, política de evidencia, estado, origen y bloqueo. Las instrucciones son un snapshot del bloque al generar: editar la actividad no cambia turnos históricos ni protegidos. La identidad única es `(dutyId, occurrenceKey, slotKey)`.

## Planificación y comunicación

Configuración muestra un listado compacto de actividades y separa las solicitudes dirigidas en una pestaña. El detalle de una actividad agrupa los turnos materializados como jornada, zona o tarea y personas, con vistas de próximas ocurrencias e historial. Esta agrupación usa únicamente periodos e instrucciones persistidos.

El configurador puede generar una imagen PNG operativa. En distribución completa se genera una página por jornada; en las demás estrategias puede incluir hasta ocho ocurrencias o treinta asignaciones por página. La imagen incluye nombre completo, periodo, vencimiento, tarea e instrucciones, pero excluye correo, documento, teléfono, identificadores, versiones y estados internos. La consulta se actualiza antes de capturar. Si Web Share con archivos no está disponible —por ejemplo, en HTTP de red local— se descargan los PNG y se abre WhatsApp solo con el texto de acompañamiento para adjuntarlos manualmente.

El reporte operativo continúa siendo un documento de auditoría filtrable y no se reutiliza como aviso visual. Su botón Compartir permanece disponible con el mismo fallback de descarga.

Los endpoints de asignaciones no exponen la actividad Prisma ni reutilizan el DTO administrativo. Devuelven un `DutyAssignmentDuty` validado con Zod que contiene solo identificador, nombre, capacidad y participantes requeridos por los flujos personales. La recurrencia vigente no forma parte de ese resumen.

Los consumidores usan el periodo persistido; editar la regla nunca reinterpreta turnos históricos. Los rangos se consultan por superposición:

```text
periodStart <= dateTo AND periodEnd >= dateFrom
```

Un turno se puede completar entre `periodStart` y `dueOn`, ambos inclusive. Permanece visible mientras `periodEnd >= hoy` y pasa a `NO_SHOW` solo cuando `dueOn < hoy`.

El cumplimiento es individual. `REQUIRED_PHOTO` exige de una a tres imágenes JPG, PNG o WebP de hasta 5 MB; `completionRequestKey` hace idempotente el reintento. Los metadatos se guardan en `DutyRotationAssignmentEvidence`, el archivo permanece en almacenamiento privado y el contenido se sirve mediante autorización por asignación. Si el backend opera con varias instancias, el directorio debe montarse como almacenamiento compartido; el disco local solo es válido para una instancia única.

## Edición, protección y estado

La edición requiere una fecha de aplicación que identifique una ocurrencia futura completa y una `configurationVersion` vigente. La previsualización devuelve turnos conservados, eliminables, conflictos y responsables resultantes. La confirmación incrementa la versión dentro de la misma transacción.

Nunca se reemplazan automáticamente turnos pasados o en curso, completados, vencidos, en bolsa, reasignados, intercambiados, bloqueados ni con historial de intercambio. Solo se pueden eliminar turnos futuros, pendientes, de origen `AUTO`, sin bloqueo ni intercambio.

Desactivar detiene el horizonte y elimina únicamente futuros automáticos seguros. Reactivar comienza en la siguiente ocurrencia válida y no recrea historia.

## Bandeja personal e intercambios

`Mis turnos` obtiene los participantes directamente desde cada asignación y no
depende del lookup administrativo de Configuración. Presenta el periodo y los
días continuos comprendidos usando `periodStart` y `periodEnd`, sin reconstruir
la cobertura desde la recurrencia actual. La bolsa personal devuelve
solo turnos de actividades en las que el usuario autenticado es participante
activo y presencial; también excluye los turnos que ese mismo usuario liberó y
los que ya superaron su fecha de vencimiento.

Un cambio dirigido permanece pendiente y bloquea el turno hasta que un usuario
con acceso a Configuración lo aprueba o rechaza. La bandeja administrativa usa
`GET /duty-rotations/swap-requests/pending-directed`. Aprobar vuelve a validar
estado, vigencia y elegibilidad del destinatario antes de reasignar.
El backend rechaza una nueva solicitud mientras el turno conserve cualquier
solicitud de cambio pendiente.

En actividades distribuidas no se usa bolsa. Un cambio dirigido o una reasignación administrativa intercambia atómicamente las tareas de dos participantes de la misma ocurrencia para conservar la unicidad.

## Padrón y ausencias por ocurrencia

`GET /eligible-roster` entrega el personal activo no REMOTO y una huella. `roster-sync-preview` y `roster-sync` usan esa huella, `configurationVersion` y una ocurrencia futura para evitar confirmaciones obsoletas. El cron no sincroniza el padrón.

`DutyRotationOccurrenceExclusion` registra una ausencia solo para una ocurrencia distribuida futura. La vista previa reutiliza el mismo asignador y la confirmación reemplaza únicamente tareas automáticas seguras. Una asignación protegida del usuario excluido produce conflicto y evita la mutación.

## Automatización y concurrencia

Crear una actividad genera hasta hoy más 60 días dentro de una transacción serializable. El cron diario de `server.ts`, en `America/Lima`, ejecuta el mismo reconciliador por cada actividad activa y extiende el mismo horizonte.

La reconciliación toma un bloqueo por actividad, reintenta conflictos serializables o de unicidad y utiliza la restricción única como defensa final. Solicitar, aprobar, rechazar o reclamar cambios, reasignar y eliminar turnos seguros también revalidan el estado dentro de una transacción serializable para evitar decisiones basadas en lecturas obsoletas. `creationKey`, `lastMutationKey` y `configurationVersion` cubren reintentos HTTP y vistas previas obsoletas. Ejecutar el cron dos veces conserva responsables y no duplica turnos.

La acción administrativa “Reparar próximos turnos” invoca exactamente ese reconciliador; no existe una lógica paralela.

Antes de planificar, reparar o reactivar, el reconciliador valida otra vez la regla persistida. Una configuración inválida produce el error operacional identificable `DUTY_CONFIGURATION_INVALID`; el cron registra solamente el identificador y los códigos del problema, omite esa actividad y continúa con las demás.

## Operación del esquema

El módulo usa exclusivamente ocurrencias, periodos persistidos y bloques normalizados. La ampliación grupal agrega enums, columnas de padrón/evidencia, exclusiones, evidencias y el snapshot nullable `slotInstructions`. Generar Prisma no modifica la base; `db push`, scripts y seeds quedan fuera de la operación automática hasta verificar el destino. El SQL no destructivo pendiente está en `prisma/manual-duty-rotation-distribution.sql`.

# Diagnóstico histórico: edición de Word dentro de Dhyrium

> **Sustituido por REV-33–35 el 11 de agosto de 2026.** El diagnóstico se conserva para explicar por qué Word Desktop no puede incrustarse como motor web. La solución canónica posterior es un editor web propio de Dhyrium, sin Office, Microsoft 365, ONLYOFFICE ni WebDAV como dependencias de edición.

Fecha de corte: 2026-08-11

## Resultado ejecutivo

La pantalla observada no contiene un editor de Word. Contiene dos superficies
visuales independientes:

1. una cinta de referencia cuyos comandos están deshabilitados; y
2. una vista PDF paginada, dibujada en canvas y sin cursor de texto.

Por eso Pegar, Fuente, Párrafo, Estilos, Buscar y los demás comandos no pueden
modificar el documento. No existe un modelo de edición, selección, caret,
historial de deshacer ni motor OOXML conectado a esos controles.

El intento de abrir Microsoft Word de escritorio también falló en la sesión
auditada. Dhyrium creó la sesión, pero Word no hizo ninguna solicitud WebDAV.
Solo se registró la apertura de la sesión; no aparecieron solicitudes de
descubrimiento, lectura, bloqueo o guardado.

Microsoft no ofrece una API soportada para incrustar la ventana nativa de
`WINWORD.EXE` dentro de una página web. Hay que elegir entre:

- Word de escritorio real, con máxima fidelidad, en una ventana separada; o
- Word para la web, embebido mediante una integración Microsoft autorizada,
  con menos funciones que Word de escritorio.

## Evidencia del código actual

### Cinta

`OfficeWordRibbon.tsx` genera botones con `aria-disabled="true"` y
`data-command-mode="word-desktop-only"`. Los comandos no reciben una instancia
de editor, selección ni manejador `onClick`. Solamente las pestañas cambian el
panel visual mediante `setActiveTab`.

El E2E `dhyrium-writer-word-desktop-canonical.spec.ts` exige expresamente que
los comandos permanezcan deshabilitados. Por tanto, el comportamiento de la
captura no es un fallo accidental de un botón: es el contrato implementado.

### Documento visible

`DocxOriginalPreview.tsx` envía el DOCX al conversor de vista previa y recibe un
PDF. `PdfPaginatedPreview.tsx` representa sus páginas con PDF.js sobre elementos
`canvas`. No existe `contentEditable`, área de texto, selección editable ni
caret. El canvas solo puede mostrar píxeles; no puede ejecutar comandos Word.

### Apertura en Word

`OfficeTaskDocumentEditor.tsx` crea una sesión y recibe un URI de la forma
`ms-word:ofe|u|https://...`. El clic registra localmente que se intentó abrir
Word, pero el navegador no puede confirmar por sí mismo que Word arrancó o que
abrió el archivo. Dhyrium solo puede confirmarlo cuando recibe actividad WebDAV.

La sesión auditada permaneció `ACTIVE/PREPARED` y solo tuvo el evento
`SESSION_OPENED`. No hubo `OPTIONS`, `HEAD`, `GET`, `PROPFIND`, `LOCK`, `PUT` ni
`UNLOCK` procedentes de Word. El Word abierto en la estación tampoco contenía
el DOCX objetivo.

### Recuperación incompleta

El navegador conserva únicamente el identificador de sesión y la fecha del
intento. No persiste el URI firmado, lo cual es correcto por seguridad. Sin
embargo, `GET /office-sessions/:id` tampoco devuelve un URI nuevo. Después de
recargar la página, una sesión `PREPARED` puede recuperarse sin
`wordDesktop.launchUri`; la interfaz queda en “Esperando” y ya no puede
reintentar el lanzamiento.

Este es un defecto funcional independiente de la decisión de motor. La
corrección segura consiste en dejar de reutilizar localmente esa sesión
`PREPARED` sin URI, limpiar su referencia del navegador y exigir un nuevo clic
para preparar otra sesión. El nuevo `POST` permite que el backend decida mediante
una operación atómica si la sesión anterior sigue realmente sin actividad y se
puede reemplazar. El frontend no debe enviar un `DELETE` automático: Word podría
estar arrancando en paralelo. Una sesión que ya esté `CONTACTED`, `LOCKED` o
`SAVED` nunca debe cerrarse automáticamente.

## Diagnóstico de la estación actual

El diagnóstico de solo lectura produjo:

- 10 controles aprobados;
- 2 advertencias; y
- 2 fallos.

Word está instalado y licenciado, el protocolo `ms-word:` está registrado y el
servicio WebClient está activo. El canal actual usa HTTP, Windows lo clasifica
como zona Internet y no existe una política administrada para el lanzamiento
del protocolo externo. La estación es compatible, pero no está lista para una
apertura fluida y confiable.

El URI actual apunta a `http://172.16.10.177:8081`. Antes de certificar Word de
escritorio se necesita un origen HTTPS estable, certificado confiable y una
prueba real de `LOCK -> editar -> PUT -> UNLOCK`.

## Opciones oficiales evaluadas

| Opción                                | Dentro de Dhyrium web                     | Word instalado | Evaluación                                                                                                                                                                 |
| ------------------------------------- | ----------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ms-word:` + WebDAV                   | No; abre otra ventana                     | Sí             | Conserva la fidelidad y funciones del Word local. Requiere HTTPS, protocolo permitido y WebDAV certificado.                                                                |
| Office Add-in / Office.js             | Dhyrium aparece dentro de Word            | Sí             | Dirección inversa. Es la mejor ampliación si la prioridad es conservar Word de escritorio.                                                                                 |
| Microsoft 365 para la web + WOPI/CSPP | Sí, en iframe oficial                     | No             | Es la vía oficial para un Word editable embebido. Requiere aprobación CSPP, WOPI completo, licencias y operación cloud.                                                    |
| SharePoint Embedded + Graph           | Office web o escritorio mediante `webUrl` | Opcional       | Adecuado para aplicaciones empresariales, pero requiere tenant, Entra, consentimiento, almacenamiento Microsoft y facturación. No garantiza un iframe editable arbitrario. |
| Graph `preview` beta con `allowEdit`  | Potencialmente                            | No             | API beta; Microsoft indica que no está soportada para producción. Solo sirve como spike controlado.                                                                        |
| Office Online Server                  | Sí, Word web on-premises                  | No             | Se retira el 31 de diciembre de 2026. No es una base razonable para una arquitectura nueva.                                                                                |
| Canvas/HTML propio                    | Sí                                        | No             | No es Word y el round-trip actual pierde estructura OOXML. No satisface fidelidad.                                                                                         |

## Restricción fundamental

Los dos requisitos siguientes no se pueden cumplir simultáneamente con una API
Microsoft soportada:

1. usar exactamente el Word de escritorio instalado, con todas sus funciones;
2. alojarlo completamente dentro de la página web de Dhyrium.

Si la prioridad absoluta es la paridad con Word instalado, la solución es abrir
Word fuera del navegador y agregar un complemento Dhyrium dentro de Word. Si la
prioridad absoluta es permanecer dentro del navegador, la solución es Word para
la web mediante WOPI/CSPP o una arquitectura basada en SharePoint Embedded,
aceptando sus diferencias funcionales.

## Arquitectura recomendada

### Ruta A: máxima fidelidad

Mantener Dhyrium como gestor de tarea, permisos, versiones y auditoría. Abrir el
DOCX en Word de escritorio mediante HTTPS/WebDAV y añadir un Office Add-in o
VSTO firmado que muestre dentro de Word las acciones Dhyrium: guardar versión,
enviar a revisión, comentar, aprobar y volver a la tarea.

### Ruta B: editor realmente embebido

Antes de programar, confirmar con Microsoft la elegibilidad CSPP o aprobar un
piloto de SharePoint Embedded. Un host WOPI de edición necesita como mínimo:

- IDs de archivo y versiones persistentes;
- `CheckFileInfo`, `GetFile`, `PutFile` y `PutRelativeFile`;
- `Lock`, `Unlock`, `UnlockAndRelock` y `RefreshLock`;
- tokens breves por usuario y archivo, enviados por POST;
- validación de proof keys;
- HTTPS, auditoría, conflicto, versionado y recuperación;
- página host con iframe y comunicación PostMessage soportada.

La cinta falsa de Dhyrium debe retirarse de esta ruta. La cinta real debe ser la
que renderice Word para la web dentro de su iframe.

## Correcciones inmediatas seguras

1. Recuperar correctamente una sesión `PREPARED` sin URI: dejar de reutilizar su
   referencia local y habilitar “Preparar nueva sesión”, sin `DELETE` automático.
2. No cerrar automáticamente sesiones que Word ya contactó, bloqueó o guardó.
3. No presentar la cinta de referencia como ejecutable.
4. No hacer el PDF `contentEditable` ni conectar la cinta al editor Canvas
   heredado.
5. No almacenar tokens o URI firmados en `localStorage`.
6. No declarar edición embebida hasta probar caret, selección, comandos,
   guardado DOCX y reapertura con un motor real.

## Criterios de aceptación del futuro editor embebido

- La página contiene un motor de edición real, no un PDF/canvas.
- Existe caret y selección de texto verificables.
- Inicio, Insertar, Diseño, Disposición, Referencias y Revisar ejecutan comandos
  del motor seleccionado.
- Un cambio de texto y uno de formato sobreviven guardar, cerrar y reabrir.
- El DOCX conserva secciones, encabezados, pies, tablas, imágenes, relaciones y
  propiedades OOXML soportadas.
- El servidor recibe un recibo de versión durable antes de indicar “Guardado”.
- Dos usuarios respetan locks o coautoría sin sobrescritura silenciosa.
- El flujo dispone de pruebas E2E y evidencia visual en las resoluciones
  soportadas.

## Fuentes oficiales

- Office URI schemes: https://learn.microsoft.com/en-us/office/client-developer/office-uri-schemes
- Microsoft 365 for the web y WOPI: https://learn.microsoft.com/en-us/microsoft-365/cloud-storage-partner-program/online/overview
- Página host WOPI: https://learn.microsoft.com/en-us/microsoft-365/cloud-storage-partner-program/online/hostpage
- Requisitos WOPI: https://learn.microsoft.com/en-us/microsoft-365/cloud-storage-partner-program/online/wopi-requirements
- SharePoint Embedded: https://learn.microsoft.com/en-us/sharepoint/dev/embedded/overview
- Apertura de Office desde SharePoint Embedded: https://learn.microsoft.com/en-us/sharepoint/dev/embedded/development/content-experiences/user-experiences-overview
- Office Add-ins: https://learn.microsoft.com/en-us/office/dev/add-ins/overview/office-add-ins
- Comparación Word web/escritorio: https://support.microsoft.com/en-us/word/word-features-comparison-word-for-the-web-vs-desktop
- Ciclo de vida de Office Online Server: https://learn.microsoft.com/en-us/lifecycle/products/office-online-server
- WebDAV: https://www.rfc-editor.org/info/rfc4918/

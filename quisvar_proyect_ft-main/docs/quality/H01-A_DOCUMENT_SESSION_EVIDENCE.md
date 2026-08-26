# Evidencia histórica H01-A — sesión documental DOCX con Microsoft Word

> **Sustituida por REV-33–35 el 11 de agosto de 2026.** Esta evidencia conserva el experimento Word Desktop/WebDAV únicamente para trazabilidad. No describe el motor canónico actual, que es Dhyrium Writer web independiente, y no autoriza reactivar Microsoft Office como dependencia.

Fecha: 11 de agosto de 2026  
Entorno: desarrollo `172.16.10.177`  
Producción `172.16.10.250`: no consultada ni modificada

## Resultado

La ruta canónica ya no transforma el DOCX a HTML o Canvas. El adjunto se
importa una vez a una bóveda inmutable y Microsoft Word trabaja sobre ese
binario mediante una sesión temporal. Dhyrium conserva permisos, lease,
versiones y auditoría.

La superficie vigente presenta:

- selector explícito del adjunto DOCX, sin montar Canvas por defecto;
- launcher de Word: URI `ms-word:ofe|u|URL` con canal WebDAV temporal;
- versión vigente como previsualización predeterminada y original protegido como
  consulta auxiliar separada, ambos de solo lectura;
- descargas Word/PDF;
- historial y restauración mediante versiones inmutables.

## Garantías verificadas

- La versión `ORIGINAL_IMPORT` no se reemplaza.
- El token público tiene 256 bits y en base se almacena su hash SHA-256.
- El token y su TTL se validan antes de recibir el cuerpo `PUT` de hasta 100 MB
  y se vuelven a validar antes de guardar.
- La identidad del adjunto incluye tabla de origen y `sourceFileId`.
- Una sesión no puede guardar por el canal de otro proveedor.
- El historial distingue `ORIGINAL_IMPORT`, `WORD_DESKTOP` y `RESTORE`.
- Restaurar crea una versión nueva.
- Los tokens de las rutas públicas se redactan en auditoría, Morgan y Nginx;
  la query del request tampoco se escribe en el access log.
- La sesión expone `PREPARED`, `CONTACTED`, `LOCKED`, `SAVED`, `CLOSED`,
  `EXPIRED`, `CONFLICT` y `FAILED` sin afirmar que Word abrió antes de observar
  tráfico WebDAV.
- `PUT` exige el lock token persistido en `If`, valida `If-Match` cuando Word lo
  presenta y devuelve ETag y recibo de versión.
- El timeout del lock se renueva solo con `LOCK`; el TTL inactivo de la sesión
  se desliza hasta un tope absoluto.
- Reabrir no puede cerrar una sesión propia que Word ya contactó; solo reemplaza
  una preparación sin actividad WebDAV.

## Pruebas vigentes

| Prueba                                                              | Estado                                                                |
| ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Build backend (`tsc` + alias)                                       | pasa                                                                  |
| Build frontend (`tsc -b` + Vite)                                    | pasa                                                                  |
| Pruebas focalizadas de sesión/identidad/middleware                  | 19/19 pasan                                                           |
| Pruebas focalizadas de redacción HTTP                               | 5/5 pasan                                                             |
| ESLint dirigido de frontend y backend                               | pasa sin advertencias                                                 |
| Playwright: workspace, versión vigente, fases, cleanup y reconexión | 7/7 pasan                                                             |
| Playwright focal posterior al ajuste final                          | 3/3 pasan                                                             |
| Nginx                                                               | `nginx -t` pasa; petición real no expone token ni query               |
| Word instalado detectado                                            | `Word2021Volume` x64, `16.0.14334.20806`                              |
| Asociación `ms-word:`                                               | registrada mediante `protocolhandler.exe`                             |
| Preflight de estación read-only                                     | 10 PASS / 2 WARN / 2 FAIL; HTTP y certificado bloquean edición fluida |
| Producción                                                          | no tocada                                                             |

La prueba Playwright valida la selección del DOCX, el registro del original, el
contrato `WORD_DESKTOP`, el binding del adjunto y la ausencia real de Canvas en
el DOM. Usa mocks de los endpoints documentales: no demuestra todavía que Word
haya abierto, bloqueado, guardado y cerrado el archivo.

## Limitaciones

- La apertura exige Microsoft Word instalado y asociación del
  protocolo `ms-word:`.
- En producción, la URL temporal debe ser HTTPS y accesible desde Word.
- Fuentes, impresora y versión de Word pueden alterar la paginación.
- La semántica WebDAV y sus precondiciones tienen pruebas de contrato, pero aún
  deben probarse con LOCK/PUT/UNLOCK emitidos por Word real en la estación
  objetivo.
- Esta PC usa HTTP, queda en zona Internet y no tiene certificado HTTPS
  evaluable; por eso `seamlessEditingReady=false` sin reducir protecciones.
- La validación DOCX actual es mínima (firma ZIP y marcador OOXML); antes de
  producción faltan validación ZIP/OPC, límites expandidos y política antimalware.
- La aplicación Word no se automatiza desde las pruebas actuales; apertura,
  guardado, reapertura y paginación deben comprobarse en la estación objetivo.

## Archivos principales

- Frontend: `TaskPrincipal.tsx`, `OfficeTaskDocumentEditor.tsx`,
  `officeTaskDocumentEditor.css`, `DocxOriginalPreview.tsx` y
  `taskDocument.service.ts`.
- Backend: `prisma/schema.prisma`, `src/config/env.ts`,
  `src/middlewares/auditLogger.middleware.ts`, `src/routes/routeRegistry.ts` y
  el módulo `src/modules/task-documents`.
- Pruebas: `taskDocumentOffice.domain.test.ts`,
  `taskDocumentOffice.middleware.test.ts`, `taskDocumentOffice.schema.test.ts`,
  `taskDocumentOffice.policy.test.ts`, `httpLogger.test.ts` y
  `dhyrium-writer-word-desktop-canonical.spec.ts` y
  `tests/desktop/test-word-station-readiness.ps1`.

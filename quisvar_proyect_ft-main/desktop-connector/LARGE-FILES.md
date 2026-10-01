# Dhyrium Desktop 0.2.0: archivos grandes y paquetes ArcMap

## Comportamiento

- Límite de archivo configurable en la API mediante `DESKTOP_DOCUMENT_MAX_BYTES`; valor inicial 4294967296 bytes (4 GiB), máximo admitido por configuración 8 GiB.
- Lectura, importación, descarga y almacenamiento mediante streams y archivos temporales. No se cargan archivos completos en RAM.
- Descarga autenticada con Range/If-Range sobre versiones inmutables. Desktop conserva la descarga parcial, comprueba tamaño y SHA-256 y abre el archivo únicamente después de verificarla.
- Envíos nuevos por bloques de 8 MiB, reintentos idempotentes, estado persistente y verificación final SHA-256. Cada transferencia pertenece a un usuario, documento y versión base. Hasta tres transferencias activas por usuario; vencen a las 24 horas.
- Un conector antiguo conserva el endpoint multipart, ahora con almacenamiento temporal en disco. Los clientes nuevos requieren metadatos de tamaño/huella válidos; la API actual ya los proporcionaba.
- Desktop crea una copia estable del archivo antes de enviarlo. Pausar o cerrar conserva las copias pendientes. Cancelar una entrega elimina su snapshot y transferencia, conservando el archivo local de trabajo.
- Las versiones se confirman con control de concurrencia. El reemplazo de la copia visible se hace después del commit, bajo el mismo bloqueo PostgreSQL que los guardados. Un diario durable permite reintentar publicaciones interrumpidas cada minuto. No se borra la versión confirmada si falla la publicación de esa copia.

## ArcMap

Un MPK es un paquete: ArcMap trabaja sobre su contenido extraído. Para MPK se deshabilita el guardado automático del archivo vigilado. La ventana ofrece **Entregar paquete actualizado**, que solicita un MPK regenerado desde ArcMap y crea una versión de ese paquete. No se promete sincronización automática de MXD, geodatabases o carpetas extraídas.

La asociación de `.mpk` con ArcMap debe existir en la PC del usuario. El conector no instala ArcMap ni modifica esa asociación.

## API

Todas las rutas se encuentran bajo `/api/v1/desktop` y requieren la sesión y permiso contextual del documento, antes de recibir bloques.

- `POST /documents/:documentId/transfers`: `baseVersionId`, `originalName`, `sizeBytes`, `checksumSha256`.
- `GET /documents/:documentId/transfers/:transferId`: bloques confirmados, tamaño de bloque y vencimiento.
- `PUT /documents/:documentId/transfers/:transferId/chunks/:index`: binario `application/octet-stream`; acepta repetir un bloque idéntico y rechaza reemplazarlo por otro contenido.
- `POST /documents/:documentId/transfers/:transferId/complete`: ensambla y verifica; confirma versión. Repetir tras perder la respuesta no crea otra versión cuando la cabeza corresponde a esa misma entrega.
- `DELETE /documents/:documentId/transfers/:transferId`: libera la transferencia del usuario.
- `GET /documents/:documentId/versions/:versionId/content`: contenido inmutable con Range, ETag, Content-Disposition y cache privado.

La respuesta de canje agrega `transferPath` y `maxFileBytes`. Los endpoints existentes se conservan.

## Despliegue coordinado pendiente

1. Desplegar backend y web/proxy juntos; no se requiere cambio de esquema Prisma.
2. La ubicación `/api/v1/desktop/` del proxy desactiva buffering y permite cuerpos hasta 4100 MiB para compatibilidad multipart. Si se configura un límite mayor de 4 GiB, ajustar también ese proxy. Los clientes nuevos envían cuerpos de 8 MiB.
3. Mantener `uploads/desktop-documents` en almacenamiento persistente y privado, compartido por las instancias API que atiendan el mismo cliente. Mantener `.transfers`, `.publication` y el almacén de versiones fuera de rutas estáticas públicas.
4. Reservar espacio para versiones y temporales. Una finalización puede necesitar los bloques, el ensamblado y la versión simultáneamente (aproximadamente tres veces el tamaño, además de versiones anteriores). La PC necesita espacio para descarga/caché, snapshot y la extracción de ArcMap.
5. Instalar/probar Desktop 0.2.0 en la PC con ArcMap. El paquete local generado es piloto y no está firmado.

## Evidencia y límites de validación

El 10/09/2026 se transfirió localmente un MPK real de 2417326618 bytes. Descarga y envío se interrumpieron deliberadamente y se reanudaron. La huella SHA-256 recibida coincide con la original: `d9ae2816a219d5deb90dbea917909d60bb8dfa3b4f218f50a9b7683e235b0ace`.

La ejecución aislada tardó aproximadamente 91 s y alcanzó 72 MiB de memoria en Desktop y 283 MiB en Node (incluido el runtime de pruebas TypeScript). Son mediciones locales, no una estimación de rendimiento en la red de producción.

La prueba usa el código de streaming, rangos y bloques del producto con servidor y autenticación de prueba. Los conflictos y la recuperación del diario se prueban con un doble transaccional, sin conectarse a la base real. La apertura del editor se simula en esta máquina; ArcMap y la regeneración del paquete deben validarse en otra PC.

## Pruebas reproducibles

- Backend: `npm run test:desktop-documents`.
- Desktop: `Dhyrium.Desktop.Connector.exe --self-test`.
- MPK real aislado: ejecutar `tests/desktopDocuments.largeFileHarness.ts <ruta-mpk> <directorio-prueba>` con ts-node y tsconfig-paths; luego `Dhyrium.Desktop.Connector.exe --self-test-large-file <directorio-prueba>/harness.json`.
- Ventana con editor simulado: `--self-test-transfer-ui <directorio-prueba>/harness.json`.

La prueba de archivo grande lee el original y escribe solo en el directorio de prueba. El servidor de prueba escucha exclusivamente en loopback.

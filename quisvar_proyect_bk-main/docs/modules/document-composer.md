# Compositor documental y documentos contractuales

## Alcance

El módulo vertical `document-composer` registra PDFs fuente, compone PDFs a
partir de imágenes JPEG y páginas de otros PDFs, conserva artefactos temporales
por 24 horas y entrega descargas y miniaturas autorizadas. `contract-documents`
mantiene el árbol documental estable de contratos y publica versiones de forma
atómica.

No realiza OCR, edición de imagen ni conversión Base64.

## Persistencia

- `DocumentArtifact`: artefacto privado, propietario, manifiesto, checksum,
  expiración, estado y ubicación controlada.
- `ContractDocument`: destino único por contrato y código de nivel.
- `ContractDocumentVersion`: historial inmutable; `currentVersionId` apunta a
  la versión publicada.
- Archivos persistentes: `uploads/document-composer`.
- Caché privado y efímero de miniaturas: directorio temporal del sistema,
  fuera de las rutas estáticas.

El contenedor de producción debe montar `uploads` en almacenamiento
persistente. El job diario elimina el contenido de artefactos temporales
vencidos, conserva su registro como expirado y limpia cachés de miniaturas con
más de 24 horas. Eliminar o expirar un artefacto también invalida su caché.

## Endpoints

Los endpoints de `document-composer` requieren autenticación y verifican que el
usuario sea propietario del artefacto. Los endpoints de `contract-documents`
requieren además autorización `MOD` del módulo `indice-general`.

- `POST /api/v1/document-composer/sources/pdf`
- `POST /api/v1/document-composer/artifacts`
- `GET /api/v1/document-composer/artifacts/:artifactId`
- `GET /api/v1/document-composer/artifacts/:artifactId/download`
- `GET /api/v1/document-composer/artifacts/:artifactId/pages/:pageNumber/thumbnail`
- `DELETE /api/v1/document-composer/artifacts/:artifactId`
- `GET /api/v1/contract-documents/scopes`
- `GET /api/v1/contract-documents/contracts`
- `GET /api/v1/contract-documents/contracts/:contractId`
- `GET /api/v1/contract-documents/contracts/:contractId/tree`
- `POST /api/v1/contract-documents/contracts/:contractId/nodes/:levelCode/attachments`
- `POST /api/v1/contract-documents/contracts/:contractId/nodes/:levelCode/edit-source`
- `POST /api/v1/contract-documents/contracts/:contractId/nodes/:levelCode/replacements`
- `GET /api/v1/contract-documents/contracts/:contractId/nodes/:levelCode/download`
- `DELETE /api/v1/contract-documents/contracts/:contractId/nodes/:levelCode/attachments/current`

Swagger contiene los DTO, respuestas y códigos de error públicos.

## Procesamiento seguro

- El manifiesto es la fuente de verdad del orden.
- Se validan orden continuo, IDs, duplicados, archivos faltantes, magic bytes,
  dimensiones y límites.
- `pdf-lib` convierte JPEG a páginas coherentes.
- `qpdf` valida, extrae y combina mediante `execFile`, sin shell y con un
  arreglo de argumentos, timeout y directorios temporales únicos.
- `pdftoppm` renderiza solamente la página solicitada a JPEG de hasta 200 px de
  ancho y calidad 75. Las generaciones concurrentes de la misma página
  comparten un único trabajo.
- Las miniaturas se escriben primero en un temporal privado, se validan y se
  publican mediante un movimiento atómico.
- Nunca se aceptan rutas de filesystem desde el cliente.
- Una asociación fallida conserva el artefacto para reintentar sin reenviar.

## Compatibilidad y despliegue

`qpdf` y `poppler-utils` están instalados en la imagen Docker. El host de
desarrollo debe instalar `qpdf` y `pdftoppm`, o ejecutar el backend con esa
imagen. `PDFTOPPM_PATH` permite indicar opcionalmente otra ubicación del
ejecutable; por defecto se usa `pdftoppm` desde `PATH`. La carpeta `uploads` ya
está montada por `docker-compose.yml`.

Para importar PDFs legados:

```powershell
npm run contracts:backfill-documents
npm run contracts:backfill-documents -- --apply --owner-id=<id> --legacy-root=<ruta>
```

La primera ejecución es solo una previsualización. El proceso copia y valida
archivos; no elimina los originales.

# DEC-DOCUMENT-ENGINE-DHYRIUM-NATIVE

Estado: aceptada por decisión explícita del usuario; H01-WEB en desarrollo y
producción bloqueada

Fecha: 11 de agosto de 2026

Sustituye como decisión editorial a
`DEC-DOCUMENT-ENGINE-WORD-DESKTOP` y
`DEC-DOCUMENT-ENGINE-UNIFIED-WEB`.

## Contexto

El requisito vigente es editar documentos Word desde Dhyrium en cualquier PC
autorizada, sin depender de Microsoft Office, Microsoft 365, SharePoint,
OneDrive, ONLYOFFICE, Collabora ni otra suite o almacenamiento externo. Word se
mantiene únicamente como referencia de presentación y comportamiento.

La ruta existente Mammoth → HTML → Canvas → HTML → `altChunk` permite edición
básica, pero no conserva de forma segura un paquete OOXML complejo. Por tanto no
puede ser el pipeline canónico de DOCX.

## Decisión

Dhyrium Writer será un motor documental web propio:

- una sola sesión editable y una sola cabeza durable por documento;
- original DOCX inmutable y versiones confirmadas por recibo durable;
- modelo interno tipado, comandos transaccionales y undo/redo atómico;
- importador/exportador OOXML incremental y preservativo;
- partes no comprendidas preservadas sin ejecución o bloqueadas con diagnóstico;
- macros, ActiveX, OLE y relaciones externas nunca se ejecutan;
- PostgreSQL y el almacenamiento de Dhyrium son las únicas fuentes operativas;
- la aplicación funciona en navegadores compatibles de otras PC de la red.

`@hufe921/canvas-editor` (MIT) se admite como runtime provisional encapsulado
para caret, selección, paginación y edición del perfil inicial. No define el
modelo durable ni autoriza a guardar DOCX reconstruidos desde HTML como si
fueran round-trip fiel.

## Perfil inicial

El perfil `DHYRIUM-WEB-CORE-1` comienza con texto, párrafos, fuente, tamaño,
énfasis, color, resaltado, alineación, listas simples, tablas básicas, imágenes
embebidas, saltos de página, márgenes y encabezado/pie básicos. Cada capacidad
se clasifica como:

- `editable`: se importa, edita, exporta y reabre con prueba;
- `preserved`: permanece en el paquete, pero no se modifica;
- `blocked`: no puede garantizarse y se impide guardar;
- `unsupported`: no se promete ni se presenta como ejecutable.

`.doc` binario legado queda fuera de H01-WEB. `.docm` y contenido activo se
bloquean hasta una decisión y threat model específicos.

## Invariantes

1. El editor nunca reconoce “Guardado” sin `VersionReceipt` committed.
2. Ningún flujo mantiene cabezas paralelas Canvas/JSON y DOCX.
3. Importar y exportar no elimina silenciosamente partes o relaciones.
4. Toda mutación pasa por un comando autorizado y una transacción reversible.
5. El acceso a documento, versión y recurso valida usuario, tarea y documento.
6. El inspector ZIP/OPC aplica límites antes de descomprimir.
7. El original importado jamás se sobrescribe.

## Puertas antes de producción

- ACL contextual y aislamiento de recursos probados con usuarios distintos;
- inspector ZIP/OPC contra traversal, duplicados, cifrado y zip bombs;
- modelo durable y serialización canónica sin `altChunk`;
- corpus Tier A con comparación estructural y visual de ida y vuelta;
- comandos del perfil con undo/redo, guardado, recarga y conflictos E2E;
- accesibilidad WCAG 2.2 AA, rendimiento, autosave y recuperación;
- threat model de uploads, OOXML, imágenes, fuentes y exportadores.

Hasta cerrar estas puertas, el editor se identifica como fase de desarrollo y
la importación/exportación DOCX básica no se presenta como fidelidad completa.


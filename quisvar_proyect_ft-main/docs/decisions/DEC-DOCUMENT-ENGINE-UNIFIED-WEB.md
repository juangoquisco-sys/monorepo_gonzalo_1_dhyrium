# DEC-DOCUMENT-ENGINE-UNIFIED-WEB

Estado: sustituida por `DEC-DOCUMENT-ENGINE-DHYRIUM-NATIVE`

Fecha: 11 de agosto de 2026

Registro histórico. Sustituida finalmente el 11 de agosto de 2026 por la
decisión explícita de construir el motor nativo Dhyrium. Antes fue sustituida
por la decisión de usar únicamente
Microsoft Word local para la edición DOCX y no integrar ONLYOFFICE.

## Contexto

La estrategia anterior convirtió Microsoft Word de escritorio en la única
superficie canónica de edición. La dirección de producto aprobada posteriormente
requiere que el usuario permanezca en una sola superficie web con cinta, página
editable, regla, estado, selección de archivo, versiones y exportaciones. Las
pantallas intermedias dedicadas a seleccionar un DOCX o preparar Word no forman
parte de la experiencia objetivo.

El ADR sustituido se conserva como registro de la decisión anterior y como
evidencia de las capacidades ya construidas para Word Desktop y WebDAV.

## Decisión

`DhyriumWriterWorkspace` será la única superficie principal de Dhyrium Writer.
El workspace mostrará siempre el encabezado, la cinta, el viewport documental y
la barra de estado. Seleccionar otro DOCX, consultar el original, abrir Word,
administrar versiones y exportar serán acciones dentro de esa superficie; no
serán pantallas editoriales independientes.

El DOCX/OOXML binario permanece como fuente canónica, el original importado
permanece inmutable y todos los resultados durables pertenecen a una única
secuencia de versiones. Esta decisión no convierte la representación
HTML/Canvas actual en fuente canónica ni acredita round-trip DOCX.

Microsoft Word de escritorio se conserva como fallback de fidelidad para
capacidades no soportadas por el perfil web. Abrir Word puede iniciar una sesión
temporal controlada por Dhyrium, pero no reemplaza la superficie web ni prueba
por sí solo que el documento se abrió o se guardó.

## Perfil web explícito

La superficie declarará un perfil `WEB-COMPATIBLE-V1`. Cada capacidad documental
y cada comando se clasificará como una de las siguientes:

- `editable`: la edición, undo/redo y persistencia binaria están probados;
- `preserved-not-editable`: el contenido permanece en el paquete y visible,
  pero el perfil web no permite modificarlo;
- `fallback-word`: requiere Microsoft Word para una edición fiel;
- `unsupported`: no puede conservarse o ejecutarse con garantías y se rechaza
  de forma explícita.

La semejanza visual con Word LTSC 2021 no amplía el perfil funcional. Un control
sin una operación real del motor debe permanecer deshabilitado y explicar la
limitación. No se afirmará identidad completa con Microsoft Word, sus
complementos, VBA, OLE, SmartArt, campos ni cualquier capacidad no verificada.

## Sesión y propiedad de datos

- Solo existe una cabeza durable por documento y una única línea de versiones.
- El estado Canvas/JSON no puede avanzar como una cabeza paralela al DOCX.
- `Guardado` exige un recibo de versión binaria committed; un autoguardado local
  o de JSON no es suficiente.
- Las exportaciones e impresiones se generan desde una versión durable, no desde
  memoria pendiente del navegador.
- Web y Word comparten identidad, ACL, lease, conflicto, auditoría y lineage.
- Cambiar de motor no puede cambiar silenciosamente el archivo, la versión o el
  conjunto de partes OOXML preservadas.

## Compuerta del motor y round-trip

La edición web de DOCX complejos y su promoción a producción permanecen
bloqueadas hasta demostrar, con fixtures identificados:

1. apertura sin sustituir el original ni crear una segunda representación
   canónica;
2. edición, selección, comandos, undo y redo del alcance declarado `editable`;
3. guardado binario validado y recibo durable antes de mostrar `Guardado`;
4. cierre, reapertura en Dhyrium y reapertura en Word sin solicitud de
   reparación;
5. preservación de partes, relaciones y contenido no tocados, incluidos los
   elementos `preserved-not-editable`;
6. comportamiento definido para secciones, encabezados, pies, formas, imágenes,
   tablas, estilos, campos y contenido desconocido del corpus objetivo;
7. conflicto, guardados sucesivos, cierre tardío, recuperación y lease único;
8. validación ZIP/OPC, límites de tamaño, defensa contra zip bombs y política de
   contenido activo y macros;
9. evidencia funcional, visual, documental, de seguridad y accesibilidad.

Mammoth → HTML → Canvas y la reconstrucción de DOCX desde HTML no satisfacen
esta compuerta. Pueden permanecer como compatibilidad limitada, extracción o
migración no destructiva mientras su alcance se rotule con honestidad.

## Producción

Esta decisión aprueba la dirección del producto, no certifica la implementación
actual. Dhyrium Writer no está listo para producción por este ADR. Word Desktop
mantiene además sus propias compuertas de HTTPS, WebDAV, TTL y Trust Center
cuando se utilice como fallback.

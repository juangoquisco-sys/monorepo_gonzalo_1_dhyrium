# Pipeline DOCX

## Principio

El DOCX original es un paquete OPC/OOXML inmutable. Dhyrium no lo degrada
silenciosamente a HTML ni usa Microsoft/Office como almacenamiento o motor.

## Flujo canónico objetivo

1. Autorizar usuario, tarea, documento y operación.
2. Validar extensión, MIME, tamaño, firma y estructura ZIP/OPC con límites
   previos a descompresión.
3. Calcular SHA-256 y registrar el original inmutable.
4. Generar manifiesto de partes, relaciones, edición y riesgos.
5. Importar el perfil `DHYRIUM-WEB-CORE-1` al modelo tipado.
6. Preservar partes seguras no editables; bloquear contenido que no pueda
   garantizarse.
7. Aplicar cambios únicamente mediante comandos/transacciones.
8. Exportar OOXML nativo sin `altChunk`, validar, comparar preservación y crear
   una versión inmutable.
9. Emitir `VersionReceipt` solo después del commit durable.

## Compatibilidad transitoria

Mammoth → HTML → Canvas y `html-docx-js` quedan como importación/exportación
básica no canónica. La UI debe rotular esa limitación y no puede promover el
resultado a versión fiel de un DOCX complejo.

## Partes protegidas

Relaciones, imágenes, temas, estilos, headers/footers, secciones, DrawingML,
AlternateContent, VML, campos, comentarios, cambios controlados, ecuaciones y
contenido activo. Macros, ActiveX y OLE nunca se ejecutan.

## Seguridad

- Límites de cantidad, tamaño total, tamaño por entrada y ratio antes de inflar.
- Rechazo de traversal, rutas absolutas, NUL, duplicados y entradas cifradas.
- Recursos y previews detrás de autorización contextual.
- Original, procedencia y checksum conservados.
- Archivo exportado revalidado antes de entrar al vault.


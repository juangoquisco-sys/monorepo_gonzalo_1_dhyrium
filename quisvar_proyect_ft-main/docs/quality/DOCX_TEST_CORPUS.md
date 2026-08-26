# Corpus dorado DOCX

Los archivos grandes o confidenciales no se versionan. Se registra checksum, origen controlado y resultado esperado.

| ID | Características | Estado |
|---|---|---|
| golden.cover.anchored | carátula, formas, imágenes ancladas, VML/DrawingML | disponible localmente |
| golden.tables.complex | anchos fijos, celdas combinadas, bordes | pendiente |
| golden.sections | secciones, orientación, columnas, headers/footers | pendiente |
| golden.fields | índices, campos, notas y referencias | parcial en documento de carátula |
| golden.math | ecuaciones y símbolos | pendiente |
| golden.review | comentarios y control de cambios | pendiente |
| golden.docm | macros preservadas y nunca ejecutadas | pendiente |
| golden.scale.1 | 1 página | pendiente |
| golden.scale.10 | 10 páginas | pendiente |
| golden.scale.75 | 75 páginas | pendiente |
| golden.scale.150 | 150 páginas | pendiente |
| golden.scale.300 | 300 páginas | pendiente |

## Protocolo por archivo

1. Abrir y validar paquete.
2. Renderizar y comparar.
3. Editar un elemento compatible.
4. Guardar y reabrir.
5. Verificar persistencia del cambio.
6. Comparar contenido no editado.
7. Validar nuevamente el paquete.
8. Comparar listado/checksum de partes desconocidas.
9. Registrar incompatibilidades y riesgo.
10. Guardar evidencia y métricas.

## Caso disponible

`02.02.02D.BLOQUE B.docx`: 49 páginas, 85 recursos multimedia, DrawingML, VML, cuadros de texto, tablas, headers/footers, índices e hipervínculos. La vista fiel de las tres primeras páginas está validada; round-trip editable pertenece al Hito 07.


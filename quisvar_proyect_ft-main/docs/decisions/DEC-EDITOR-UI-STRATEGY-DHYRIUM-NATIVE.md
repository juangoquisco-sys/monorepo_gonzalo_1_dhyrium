# DEC-EDITOR-UI-STRATEGY-DHYRIUM-NATIVE

Estado: aceptada por decisión explícita del usuario; verificación incremental

Fecha: 11 de agosto de 2026

Sustituye a `DEC-EDITOR-UI-STRATEGY-WORD-DESKTOP` y
`DEC-EDITOR-UI-STRATEGY-UNIFIED-WEB`.

## Decisión

`DhyriumWriterWorkspace` es una sola superficie web editable. No abre ni
embebe Microsoft Word y no muestra una previsualización PDF como si fuera el
editor. La marca visible es **Dhyrium Writer · editor web independiente**.

La referencia visual de Word sirve para estudiar jerarquía, densidad, grupos y
flujo de trabajo; no autoriza copiar código, CSS, iconos, logos o recursos
propietarios de Microsoft.

## Reglas de interacción

- La hoja editable contiene caret, selección y entrada de teclado reales.
- Cada botón habilitado ejecuta un comando real sobre el documento activo.
- Un comando no implementado permanece deshabilitado y explica el motivo de
  forma accesible; no hay controles decorativos que aparenten funcionar.
- El estado visible distingue `cambios locales`, `guardando`, `guardado` y
  `error/conflicto`; “guardado” exige recibo durable del backend.
- Undo/redo opera por transacciones, incluso en comandos compuestos.
- Original, versión vigente, historial, exportación y compatibilidad se agrupan
  en el mismo workspace sin crear una segunda superficie editable.
- Los permisos efectivos proceden del backend y no se infieren solo de la UI.
- El diseño responde a escritorio y portátil sin clipping ni scroll horizontal
  global; teclado y WCAG 2.2 AA se prueban desde el primer perfil.

## Presentación de compatibilidad

Antes de editar un DOCX, la UI muestra el diagnóstico del paquete y las
capacidades `editable`, `preserved`, `blocked` y `unsupported`. La ruta heredada
Mammoth/HTML se rotula explícitamente como importación básica sin round-trip y
no puede promoverse silenciosamente a versión canónica.

## Evidencia mínima por control

Un control solo pasa a “completo” cuando tiene:

1. comando y payload tipados;
2. mutación observable y undo/redo;
3. persistencia, recarga y recibo durable;
4. importación/exportación correspondiente cuando afecte DOCX;
5. prueba funcional, de teclado y visual.


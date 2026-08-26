# Arquitectura de cinta

## Módulos

- `RibbonSchema`: definición declarativa de pestañas, grupos y controles.
- `CommandRegistry`: ejecución y estado centralizados.
- `EditorStateAdapter`: traduce estado del motor sin filtrarlo a la UI.
- `RibbonLayoutEngine`: mide el espacio y decide modo por prioridad.
- `ContextualTabController`: visibilidad contextual por selección.
- `KeyTipManager`: navegación Alt/F10 y KeyTips.
- `IconRegistry`: Fluent Regular/Filled con tamaño controlado.
- `FluentThemeProvider`: claro, oscuro, alto contraste y reduced motion.

## Tipos visuales

`RibbonControl`, `RibbonGallery`, `RibbonMenu`, `RibbonSplitButton` y `RibbonOverflow` consumen esquema y registro. No contienen reglas del documento.

## Layout

Cada grupo declara prioridad y anchos medidos/candidatos. El motor degrada en este orden:

`full → compact → collapsed → overflow`.

La decisión se recalcula con `ResizeObserver`; no usa únicamente breakpoints fijos. Overflow es interno a la cinta, nunca al documento o aplicación.

## Teclado

- `Ctrl+F1`: contraer/expandir.
- `Alt` o `F10`: entrar y mostrar KeyTips de pestañas.
- Tras elegir una pestaña, `KeyTipManager` conserva la sesión y cambia al ámbito de comandos; `Escape` retorna primero a pestañas y después al foco de origen.
- Flechas/Home/End: navegación roving tabindex.
- Enter/Espacio: ejecutar.
- `Alt+Flecha abajo`: abrir listas y split buttons sin activar KeyTips.
- Escape: cerrar superficie y restaurar foco.

## Transición

Hito 01 migra Inicio. Las pestañas posteriores pueden permanecer adaptadas temporalmente, pero no se marcan verificadas hasta usar la misma arquitectura.

## Implementación del Hito 01

La implementación vive en `quisvar_proyect_ft-main/src/pages/specialities/pages/project/pages/task/components/taskDocumentEditor/ribbon/`. `CanvasWordRibbon.tsx` consume el esquema, el registro y el motor de layout; los cinco grupos de Inicio no modifican directamente el documento.

`EditorStateAdapter` calcula selección y estado booleano mixto desde el rango y los elementos seleccionados. `CommandRegistry` informa `canExecute`, estado activo/mixto, valor actual, motivo de deshabilitación, pendiente, atajo, KeyTip y política de undo.

El registro no sustituye una operación documental por otra visualmente parecida. En el cierre del Hito 01, lista multinivel, aumentar/disminuir sangría, sombreado y borde de párrafo permanecen deshabilitados con razón accesible porque `canvas-editor` no expone una transacción fiel para esas propiedades. Esto evita que sombreado se degrade a resaltado, que borde se degrade a separador o que sangría altere el tipo de lista.

La validación integrada se mantiene en `tests/e2e/dhyrium-writer-hito-01.spec.ts`; la evidencia visual está listada en `docs/quality/VISUAL_ACCEPTANCE.md`.

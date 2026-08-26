import {
  ElementType,
  ListStyle,
  ListType,
  RowFlex,
  type IRangeStyle,
} from '@hufe921/canvas-editor';

import { CommandRegistry } from './CommandRegistry';
import type { RibbonCommandContext } from './RibbonRuntime';
import { homeGroups } from './RibbonSchema';

const editorRequired = (context: RibbonCommandContext) => context.adapter.available;
const selectionRequired = (context: RibbonCommandContext) => context.adapter.hasSelection;
const editorReason = (context: RibbonCommandContext) =>
  context.adapter.available ? undefined : 'El editor todavía no está disponible.';
const selectionReason = (context: RibbonCommandContext) =>
  context.adapter.hasSelection ? undefined : 'Seleccione texto para utilizar este comando.';
const unsupportedParagraphReason = (feature: string) => () =>
  `${feature} todavía no puede conservarse fielmente con el motor documental actual.`;
const stringPayload = (payload: unknown) => typeof payload === 'string' ? payload : '';
const numberPayload = (payload: unknown) => typeof payload === 'number' ? payload : Number(payload);
const style = (context: RibbonCommandContext) => context.adapter.rangeStyle;
const isActive = (property: keyof IRangeStyle) => (context: RibbonCommandContext) =>
  context.adapter.booleanState(property).active;
const isMixed = (property: keyof IRangeStyle) => (context: RibbonCommandContext) =>
  context.adapter.booleanState(property).mixed;

export const createHomeCommandRegistry = (context: RibbonCommandContext) => {
  const registry = new CommandRegistry(() => context);
  const metadata = new Map(
    homeGroups.flatMap(group => group.controls).map(control => [control.commandId, control])
  );
  const register = (
    id: string,
    options: Parameters<typeof registry.register>[0]
  ) => {
    const control = metadata.get(id);
    return registry.register({
      ...options,
      id,
      label: control?.label ?? options.label,
      shortcut: control?.shortcut,
      keyTip: control?.keyTip,
    });
  };

  register('home.clipboard.paste', {
    id: '', label: '', tooltip: 'Inserta el contenido del Portapapeles conservando el formato compatible.',
    execute: ({ adapter }) => adapter.command?.executePaste(), canExecute: editorRequired,
    disabledReason: editorReason, undoTransaction: 'editor-native',
  });
  register('home.clipboard.cut', {
    id: '', label: '', tooltip: 'Quita la selección y la coloca en el Portapapeles.',
    execute: ({ adapter }) => adapter.command?.executeCut(), canExecute: selectionRequired,
    disabledReason: selectionReason, undoTransaction: 'editor-native',
  });
  register('home.clipboard.copy', {
    id: '', label: '', tooltip: 'Copia la selección al Portapapeles.',
    execute: ({ adapter }) => adapter.command?.executeCopy(), canExecute: selectionRequired,
    disabledReason: selectionReason, undoTransaction: 'none',
  });
  register('home.clipboard.formatPainter', {
    id: '', label: '', tooltip: 'Copia el formato de la selección para aplicarlo a otro texto.',
    execute: ({ adapter }) => adapter.command?.executePainter({ isDblclick: false }),
    canExecute: selectionRequired, disabledReason: selectionReason, undoTransaction: 'editor-native',
  });

  register('home.font.family', {
    id: '', label: '', tooltip: 'Cambia la familia tipográfica de la selección.',
    execute: ({ actions, adapter }, payload) => {
      const font = stringPayload(payload);
      adapter.command?.executeFont(font);
      actions.patchRangeStyle({ font });
    },
    canExecute: editorRequired, disabledReason: editorReason,
    currentValue: context => style(context).font ?? 'Carlito', undoTransaction: 'editor-native',
  });
  register('home.font.size', {
    id: '', label: '', tooltip: 'Cambia el tamaño de fuente en puntos.',
    execute: ({ actions, adapter }, payload) => {
      const size = (numberPayload(payload) * 96) / 72;
      adapter.command?.executeSize(size);
      actions.patchRangeStyle({ size });
    },
    canExecute: editorRequired, disabledReason: editorReason,
    currentValue: context => Math.round(((style(context).size ?? 14.6667) * 72) / 96),
    undoTransaction: 'editor-native',
  });
  register('home.font.grow', {
    id: '', label: '', tooltip: 'Aumenta un nivel el tamaño de la selección.',
    execute: ({ adapter }) => adapter.command?.executeSizeAdd(), canExecute: editorRequired,
    disabledReason: editorReason, undoTransaction: 'editor-native',
  });
  register('home.font.shrink', {
    id: '', label: '', tooltip: 'Reduce un nivel el tamaño de la selección.',
    execute: ({ adapter }) => adapter.command?.executeSizeMinus(), canExecute: editorRequired,
    disabledReason: editorReason, undoTransaction: 'editor-native',
  });
  register('home.font.changeCase', {
    id: '', label: '', tooltip: 'Cambia el uso de mayúsculas del texto seleccionado.',
    execute: ({ actions }, payload) => actions.changeCase(stringPayload(payload) as Parameters<typeof actions.changeCase>[0]),
    canExecute: selectionRequired, disabledReason: selectionReason, undoTransaction: 'editor-native',
  });
  register('home.font.clear', {
    id: '', label: '', tooltip: 'Quita el formato directo y conserva el texto.',
    execute: ({ actions, adapter }) => {
      adapter.command?.executeFormat();
      actions.patchRangeStyle({ bold: false, italic: false, underline: false, strikeout: false, color: null, highlight: null });
    }, canExecute: editorRequired,
    disabledReason: editorReason, undoTransaction: 'editor-native',
  });

  const toggles: Array<{
    id: string;
    property?: keyof IRangeStyle;
    execute: (context: RibbonCommandContext) => void;
    active?: (context: RibbonCommandContext) => boolean;
  }> = [
    { id: 'home.font.bold', property: 'bold', execute: ({ adapter }) => adapter.command?.executeBold() },
    { id: 'home.font.italic', property: 'italic', execute: ({ adapter }) => adapter.command?.executeItalic() },
    { id: 'home.font.underline', property: 'underline', execute: ({ adapter }) => adapter.command?.executeUnderline() },
    { id: 'home.font.strike', property: 'strikeout', execute: ({ adapter }) => adapter.command?.executeStrikeout() },
    { id: 'home.font.subscript', execute: ({ adapter }) => adapter.command?.executeSubscript(), active: context => style(context).type === ElementType.SUBSCRIPT },
    { id: 'home.font.superscript', execute: ({ adapter }) => adapter.command?.executeSuperscript(), active: context => style(context).type === ElementType.SUPERSCRIPT },
  ];
  toggles.forEach(toggle => register(toggle.id, {
    id: '', label: '', tooltip: metadata.get(toggle.id)?.label ?? toggle.id,
    execute: context => {
      toggle.execute(context);
      if (toggle.property) {
        context.actions.patchRangeStyle({
          [toggle.property]: !Boolean(style(context)[toggle.property]),
        } as Partial<IRangeStyle>);
      } else if (toggle.id === 'home.font.subscript') {
        context.actions.patchRangeStyle({ type: ElementType.SUBSCRIPT });
      } else if (toggle.id === 'home.font.superscript') {
        context.actions.patchRangeStyle({ type: ElementType.SUPERSCRIPT });
      }
    }, canExecute: editorRequired, disabledReason: editorReason,
    isActive: toggle.active ?? (toggle.property ? isActive(toggle.property) : undefined),
    isMixed: toggle.property ? isMixed(toggle.property) : undefined,
    undoTransaction: 'editor-native',
  }));

  register('home.font.color', {
    id: '', label: '', tooltip: 'Cambia el color de la fuente.',
    execute: ({ actions, adapter }, payload) => {
      const color = stringPayload(payload) || null;
      adapter.command?.executeColor(color);
      actions.patchRangeStyle({ color });
    },
    canExecute: editorRequired, disabledReason: editorReason,
    currentValue: context => style(context).color ?? '#000000', undoTransaction: 'editor-native',
  });
  register('home.font.highlight', {
    id: '', label: '', tooltip: 'Cambia o quita el color de resaltado.',
    execute: ({ actions, adapter }, payload) => {
      const highlight = stringPayload(payload) || null;
      adapter.command?.executeHighlight(highlight);
      actions.patchRangeStyle({ highlight });
    },
    canExecute: editorRequired, disabledReason: editorReason,
    currentValue: context => style(context).highlight ?? null, undoTransaction: 'editor-native',
  });

  register('home.paragraph.bullets', {
    id: '', label: '', tooltip: 'Crea o cambia una lista con viñetas.',
    execute: ({ actions, adapter }, payload) => {
      const listStyle = stringPayload(payload);
      if (!listStyle) {
        adapter.command?.executeList(null);
        actions.patchRangeStyle({ listType: null });
      } else {
        adapter.command?.executeList(ListType.UL, listStyle as ListStyle);
        actions.patchRangeStyle({ listType: ListType.UL });
      }
    },
    canExecute: editorRequired, disabledReason: editorReason,
    isActive: context => style(context).listType === ListType.UL, undoTransaction: 'editor-native',
  });
  register('home.paragraph.numbering', {
    id: '', label: '', tooltip: 'Crea o cambia una lista numerada.',
    execute: ({ actions, adapter }, payload) => {
      const listStyle = stringPayload(payload);
      if (!listStyle) {
        adapter.command?.executeList(null);
        actions.patchRangeStyle({ listType: null });
      } else {
        adapter.command?.executeList(ListType.OL, listStyle as ListStyle);
        actions.patchRangeStyle({ listType: ListType.OL });
      }
    },
    canExecute: editorRequired, disabledReason: editorReason,
    isActive: context => style(context).listType === ListType.OL, undoTransaction: 'editor-native',
  });
  register('home.paragraph.multilevel', {
    id: '', label: '', tooltip: 'Organiza elementos y subniveles en una lista.',
    execute: () => undefined,
    canExecute: () => false,
    disabledReason: unsupportedParagraphReason('La lista multinivel'),
    undoTransaction: 'none',
  });
  register('home.paragraph.outdent', {
    id: '', label: '', tooltip: 'Mueve el elemento un nivel hacia la izquierda.',
    execute: () => undefined,
    canExecute: () => false,
    disabledReason: unsupportedParagraphReason('La disminución de sangría'),
    undoTransaction: 'none',
  });
  register('home.paragraph.indent', {
    id: '', label: '', tooltip: 'Mueve el elemento un nivel hacia la derecha.',
    execute: () => undefined,
    canExecute: () => false,
    disabledReason: unsupportedParagraphReason('El aumento de sangría'),
    undoTransaction: 'none',
  });
  register('home.paragraph.sort', {
    id: '', label: '', tooltip: 'Ordena alfabética y numéricamente las líneas seleccionadas.',
    execute: ({ actions }) => actions.sortSelection(), canExecute: selectionRequired,
    disabledReason: selectionReason, undoTransaction: 'editor-native',
  });
  register('home.paragraph.marks', {
    id: '', label: '', tooltip: 'Muestra u oculta marcas de párrafo y espacios.',
    execute: ({ actions }) => actions.toggleFormattingMarks(), canExecute: editorRequired,
    disabledReason: editorReason, isActive: context => context.showFormattingMarks,
    undoTransaction: 'none',
  });

  const alignments: Array<[string, RowFlex]> = [
    ['home.paragraph.alignLeft', RowFlex.LEFT],
    ['home.paragraph.alignCenter', RowFlex.CENTER],
    ['home.paragraph.alignRight', RowFlex.RIGHT],
    ['home.paragraph.justify', RowFlex.ALIGNMENT],
  ];
  alignments.forEach(([id, alignment]) => register(id, {
    id: '', label: '', tooltip: metadata.get(id)?.label ?? id,
    execute: ({ actions, adapter }) => {
      adapter.command?.executeRowFlex(alignment);
      actions.patchRangeStyle({ rowFlex: alignment });
    },
    canExecute: editorRequired, disabledReason: editorReason,
    isActive: context => style(context).rowFlex === alignment, undoTransaction: 'editor-native',
  }));
  register('home.paragraph.spacing', {
    id: '', label: '', tooltip: 'Cambia el interlineado del párrafo actual.',
    execute: ({ actions, adapter }, payload) => {
      const rowMargin = numberPayload(payload);
      adapter.command?.executeRowMargin(rowMargin);
      actions.patchRangeStyle({ rowMargin });
    },
    canExecute: editorRequired, disabledReason: editorReason,
    currentValue: context => style(context).rowMargin ?? 1.15, undoTransaction: 'editor-native',
  });
  register('home.paragraph.shading', {
    id: '', label: '', tooltip: 'Aplica un color de fondo al contenido compatible.',
    execute: () => undefined,
    canExecute: () => false,
    disabledReason: unsupportedParagraphReason('El sombreado de párrafo'),
    undoTransaction: 'none',
  });
  register('home.paragraph.borders', {
    id: '', label: '', tooltip: 'Inserta una línea de borde en la posición actual.',
    execute: () => undefined,
    canExecute: () => false,
    disabledReason: unsupportedParagraphReason('El borde de párrafo'),
    undoTransaction: 'none',
  });
  register('home.styles.gallery', {
    id: '', label: '', tooltip: 'Aplica el estilo seleccionado.',
    execute: ({ actions }, payload) => actions.applyStyle(stringPayload(payload)),
    canExecute: editorRequired, disabledReason: editorReason, undoTransaction: 'editor-native',
  });
  register('home.editing.find', {
    id: '', label: '', tooltip: 'Busca texto dentro del documento.',
    execute: ({ actions }) => actions.openEditing('search'), canExecute: editorRequired,
    disabledReason: editorReason, undoTransaction: 'none',
  });
  register('home.editing.replace', {
    id: '', label: '', tooltip: 'Busca y reemplaza texto dentro del documento.',
    execute: ({ actions }) => actions.openEditing('replace'), canExecute: editorRequired,
    disabledReason: editorReason, undoTransaction: 'editor-native',
  });
  register('home.editing.select', {
    id: '', label: '', tooltip: 'Selecciona todo el contenido editable.',
    execute: ({ actions, adapter }) => {
      adapter.command?.executeSelectAll();
      actions.patchRangeStyle({});
    }, canExecute: editorRequired,
    disabledReason: editorReason, undoTransaction: 'none',
  });
  register('home.editing.search.next', {
    id: '', label: 'Buscar siguiente', tooltip: 'Busca la siguiente coincidencia dentro del documento.',
    execute: ({ actions }, payload) => actions.searchNext(stringPayload(payload)),
    canExecute: (current, payload) => editorRequired(current) && Boolean(stringPayload(payload).trim()),
    disabledReason: current => editorReason(current) ?? 'Escriba el texto que desea buscar.',
    undoTransaction: 'none',
  });
  register('home.editing.replace.current', {
    id: '', label: 'Reemplazar', tooltip: 'Reemplaza la coincidencia seleccionada.',
    execute: ({ actions }, payload) => {
      const values = Array.isArray(payload) ? payload : [];
      actions.replaceCurrent(String(values[0] ?? ''), String(values[1] ?? ''));
    },
    canExecute: (current, payload) => editorRequired(current) && Array.isArray(payload) && Boolean(String(payload[0] ?? '').trim()),
    disabledReason: current => editorReason(current) ?? 'Escriba el texto que desea reemplazar.',
    undoTransaction: 'editor-native',
  });
  register('home.editing.close', {
    id: '', label: 'Cerrar búsqueda', tooltip: 'Cierra las herramientas de búsqueda y reemplazo.',
    execute: ({ actions }) => actions.closeEditing(), canExecute: editorRequired,
    disabledReason: editorReason, undoTransaction: 'none',
  });

  return registry;
};

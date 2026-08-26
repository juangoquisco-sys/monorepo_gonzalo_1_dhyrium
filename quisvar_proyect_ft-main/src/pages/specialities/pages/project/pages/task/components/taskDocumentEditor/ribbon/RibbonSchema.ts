import type { RibbonGroup, RibbonSchema, RibbonTab } from './ribbonTypes';

const control = (
  id: string,
  label: string,
  type: RibbonGroup['controls'][number]['type'],
  icon: string,
  keyTip: string,
  priority: number,
  shortcut?: string
) => ({ id, commandId: id, label, type, icon, keyTip, priority, shortcut });

export const homeGroups: RibbonGroup[] = [
  {
    id: 'home.clipboard', label: 'Portapapeles', icon: 'clipboard-paste', priority: 100,
    preferredWidths: { full: 170, compact: 148, collapsed: 64 },
    controls: [
      { ...control('home.clipboard.paste', 'Pegar', 'split-button', 'clipboard-paste', 'V', 100, 'Ctrl+V'), large: true },
      control('home.clipboard.cut', 'Cortar', 'button', 'cut', 'X', 90, 'Ctrl+X'),
      control('home.clipboard.copy', 'Copiar', 'button', 'copy', 'C', 90, 'Ctrl+C'),
      control('home.clipboard.formatPainter', 'Copiar formato', 'button', 'format-painter', 'FP', 70),
    ],
  },
  {
    id: 'home.font', label: 'Fuente', icon: 'font', priority: 100,
    preferredWidths: { full: 430, compact: 380, collapsed: 64 },
    controls: [
      control('home.font.family', 'Fuente', 'combo', 'font', 'FF', 100),
      control('home.font.size', 'Tamaño', 'combo', 'font-size', 'FS', 100),
      control('home.font.grow', 'Aumentar tamaño', 'button', 'font-grow', 'FG', 80, 'Ctrl+Mayús+>'),
      control('home.font.shrink', 'Disminuir tamaño', 'button', 'font-shrink', 'FK', 80, 'Ctrl+Mayús+<'),
      control('home.font.changeCase', 'Cambiar mayúsculas', 'menu', 'change-case', 'FC', 60),
      control('home.font.clear', 'Borrar formato', 'button', 'clear-formatting', 'FE', 60, 'Ctrl+Espacio'),
      control('home.font.bold', 'Negrita', 'toggle', 'bold', '1', 100, 'Ctrl+B'),
      control('home.font.italic', 'Cursiva', 'toggle', 'italic', '2', 100, 'Ctrl+I'),
      control('home.font.underline', 'Subrayado', 'split-button', 'underline', '3', 100, 'Ctrl+U'),
      control('home.font.strike', 'Tachado', 'toggle', 'strike', '4', 50),
      control('home.font.subscript', 'Subíndice', 'toggle', 'subscript', '5', 50),
      control('home.font.superscript', 'Superíndice', 'toggle', 'superscript', '6', 50),
      control('home.font.color', 'Color de fuente', 'split-button', 'font-color', '7', 80),
      control('home.font.highlight', 'Resaltado', 'split-button', 'highlight', '8', 80),
    ],
  },
  {
    id: 'home.paragraph', label: 'Párrafo', icon: 'paragraph', priority: 90,
    preferredWidths: { full: 390, compact: 310, collapsed: 64 },
    controls: [
      control('home.paragraph.bullets', 'Viñetas', 'split-button', 'bullets', 'U', 80),
      control('home.paragraph.numbering', 'Numeración', 'split-button', 'numbering', 'N', 80),
      control('home.paragraph.multilevel', 'Lista multinivel', 'menu', 'multilevel', 'M', 60),
      control('home.paragraph.outdent', 'Disminuir sangría', 'button', 'outdent', 'AO', 60),
      control('home.paragraph.indent', 'Aumentar sangría', 'button', 'indent', 'AI', 60),
      control('home.paragraph.sort', 'Ordenar', 'button', 'sort', 'SO', 40),
      control('home.paragraph.marks', 'Mostrar todo', 'toggle', 'paragraph', '9', 50, 'Ctrl+Mayús+8'),
      control('home.paragraph.alignLeft', 'Alinear a la izquierda', 'toggle', 'align-left', 'AL', 100, 'Ctrl+L'),
      control('home.paragraph.alignCenter', 'Centrar', 'toggle', 'align-center', 'AC', 100, 'Ctrl+E'),
      control('home.paragraph.alignRight', 'Alinear a la derecha', 'toggle', 'align-right', 'AR', 100, 'Ctrl+R'),
      control('home.paragraph.justify', 'Justificar', 'toggle', 'align-justify', 'AJ', 100, 'Ctrl+J'),
      control('home.paragraph.spacing', 'Interlineado', 'menu', 'line-spacing', 'PS', 70),
      control('home.paragraph.shading', 'Sombreado', 'split-button', 'shading', 'PH', 50),
      control('home.paragraph.borders', 'Bordes', 'split-button', 'borders', 'PB', 50),
    ],
  },
  {
    id: 'home.styles', label: 'Estilos', icon: 'styles', priority: 60, canOverflow: true,
    preferredWidths: { full: 520, compact: 320, collapsed: 64 },
    controls: [control('home.styles.gallery', 'Galería de estilos', 'gallery', 'styles', 'S', 70, 'Ctrl+Mayús+S')],
  },
  {
    id: 'home.editing', label: 'Edición', icon: 'search', priority: 50, canOverflow: true,
    preferredWidths: { full: 135, compact: 112, collapsed: 64 },
    controls: [
      control('home.editing.find', 'Buscar', 'split-button', 'search', 'B', 90, 'Ctrl+F'),
      control('home.editing.replace', 'Reemplazar', 'button', 'replace', 'R', 70, 'Ctrl+H'),
      control('home.editing.select', 'Seleccionar', 'menu', 'select-all', 'SEL', 60, 'Ctrl+A'),
    ],
  },
];

const standardTabs: RibbonTab[] = [
  { id: 'file', label: 'Archivo', keyTip: 'A', groups: [] },
  { id: 'home', label: 'Inicio', keyTip: 'O', groups: homeGroups },
  { id: 'insert', label: 'Insertar', keyTip: 'N', groups: [] },
  { id: 'draw', label: 'Dibujar', keyTip: 'D', groups: [] },
  { id: 'design', label: 'Diseño', keyTip: 'G', groups: [] },
  { id: 'layout', label: 'Disposición', keyTip: 'P', groups: [] },
  { id: 'references', label: 'Referencias', keyTip: 'S', groups: [] },
  { id: 'mailings', label: 'Correspondencia', keyTip: 'C', groups: [] },
  { id: 'review', label: 'Revisar', keyTip: 'R', groups: [] },
  { id: 'view', label: 'Vista', keyTip: 'W', groups: [] },
  { id: 'help', label: 'Ayuda', keyTip: 'Y', groups: [] },
];

const contextualTabs: RibbonTab[] = [
  { id: 'table', label: 'Tabla', keyTip: 'JT', groups: [], contextual: true, context: 'table' },
  { id: 'image', label: 'Imagen', keyTip: 'JP', groups: [], contextual: true, context: 'image' },
  { id: 'shape', label: 'Forma', keyTip: 'JF', groups: [], contextual: true, context: 'shape' },
  { id: 'chart', label: 'Gráfico', keyTip: 'JG', groups: [], contextual: true, context: 'chart' },
  { id: 'header-footer', label: 'Encabezado y pie', keyTip: 'JE', groups: [], contextual: true, context: 'header-footer' },
];

export const writerRibbonSchema: RibbonSchema = {
  version: 1,
  tabs: [...standardTabs, ...contextualTabs],
};


import {
  createElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Tooltip } from '@fluentui/react-components';
import {
  ChevronDown12Regular as FluentChevronDownIcon,
  type FluentIcon,
} from '@fluentui/react-icons';
import type Editor from '@hufe921/canvas-editor';
import {
  EditorZone,
  ElementType,
  ImageDisplay,
  ListStyle,
  PageMode,
  PaperDirection,
  RowFlex,
  TitleLevel,
  splitText,
  type IElement,
  type IRangeStyle,
} from '@hufe921/canvas-editor';
import {
  Baseline,
  Bookmark,
  BookMarked,
  BookOpen,
  BookOpenText,
  Box,
  CalendarClock,
  Camera,
  ChartColumnBig,
  Check,
  ChevronDown,
  Columns3,
  Cuboid,
  Eraser,
  FileText,
  FileInput,
  FilePlus2,
  FileSignature,
  FileType2,
  Grid3X3,
  Hash,
  Heading1,
  Highlighter,
  ImagePlus,
  LayoutPanelTop,
  Library,
  Link2,
  ListTree,
  Maximize2,
  MessageSquarePlus,
  Minimize2,
  PanelBottom,
  PanelLeft,
  PanelTop,
  Pilcrow,
  Ruler,
  Search,
  Shapes,
  Sigma,
  Table2,
  TextCursorInput,
  TypeOutline,
  Video,
  WandSparkles,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from 'lucide-react';

import type { FileTask } from '@/types/types';
import type {
  TaskDocumentDto,
  TaskDocumentKind,
  TaskDocumentVersionDto,
} from '../../services/taskDocument.service';

import CanvasWordBackstage, {
  type BackstageTemplate,
} from './CanvasWordBackstage';
import { ContextualTabController } from './ribbon/ContextualTabController';
import { EditorStateAdapter } from './ribbon/EditorStateAdapter';
import { DhyriumFluentThemeProvider } from './ribbon/FluentThemeProvider';
import { KeyTipManager, useKeyTip } from './ribbon/KeyTipManager';
import { writerIconRegistry } from './ribbon/IconRegistry';
import { useRibbonLayoutEngine } from './ribbon/RibbonLayoutEngine';
import { RibbonOverflow } from './ribbon/RibbonOverflow';
import {
  RibbonRuntimeProvider,
  useRibbonCommandRegistry,
} from './ribbon/RibbonRuntime';
import { homeGroups, writerRibbonSchema } from './ribbon/RibbonSchema';
import { createHomeCommandRegistry } from './ribbon/homeCommandRegistry';
import type { RibbonLayoutMode, RibbonTabId } from './ribbon/ribbonTypes';

import '@fontsource/caladea/latin-400.css';
import '@fontsource/caladea/latin-400-italic.css';
import '@fontsource/caladea/latin-700.css';
import '@fontsource/caladea/latin-700-italic.css';
import '@fontsource/carlito/latin-400.css';
import '@fontsource/carlito/latin-400-italic.css';
import '@fontsource/carlito/latin-700.css';
import '@fontsource/carlito/latin-700-italic.css';

import './canvasWordRibbon.css';

type RibbonTab = RibbonTabId;

interface CanvasWordRibbonProps {
  document: TaskDocumentDto | null | undefined;
  documentTitle: string;
  editor: Editor | null;
  rangeStyle: Partial<IRangeStyle>;
  isExporting: boolean;
  isFullscreen: boolean;
  isVersionsLoading: boolean;
  showNavigationPane: boolean;
  showRuler: boolean;
  sourceFile?: FileTask | null;
  saveStatus: string;
  taskId: number;
  taskKind: TaskDocumentKind;
  versions: TaskDocumentVersionDto[];
  zoom: number;
  wordCount: number;
  onBackstageChange: (open: boolean) => void;
  onCreateDocument: (template: BackstageTemplate) => void;
  onDownloadPdf: () => void;
  onDownloadWord: () => void;
  onInsertImage: () => void;
  onReplaceImage: () => void;
  onInsertVideo: () => void;
  onPrint: () => void;
  onRangeStylePatch: (patch: Partial<IRangeStyle>) => void;
  onReload: () => void;
  onRestoreVersion: (versionNumber: number) => void;
  onSave: () => void;
  onSaveAs: (title: string) => void;
  onToggleFullscreen: () => void;
  onToggleNavigationPane: () => void;
  onToggleRuler: () => void;
  onZoomChange: (zoom: number) => void;
}

interface RibbonButtonProps {
  active?: boolean;
  commandId?: string;
  description?: string;
  disabled?: boolean;
  icon: RibbonIcon;
  keyTip?: string;
  label?: string;
  large?: boolean;
  shortcut?: string;
  title: string;
  onClick?: () => void;
}

interface RibbonPopoverProps {
  active?: boolean;
  children: ReactElement;
  commandId?: string;
  description?: string;
  disabled?: boolean;
  icon: RibbonIcon;
  keyTip?: string;
  label?: string;
  large?: boolean;
  panelClassName?: string;
  shortcut?: string;
  title: string;
}

type RibbonIcon = LucideIcon | FluentIcon;
type RibbonDensity = 'expanded' | 'compact' | 'condensed';

const requireFluentIcon = (id: string) => {
  const icon = writerIconRegistry.resolve(id);
  if (!icon)
    throw new Error(`El icono Fluent de cinta "${id}" no está registrado.`);
  return icon;
};

const homeControlIconIds = new Map(
  homeGroups.flatMap(group =>
    group.controls.map(control => [control.commandId, control.icon])
  )
);
const FluentPasteIcon = requireFluentIcon('clipboard-paste');
const FluentCutIcon = requireFluentIcon('cut');
const FluentCopyIcon = requireFluentIcon('copy');
const FluentFormatPainterIcon = requireFluentIcon('format-painter');
const FluentFontIcon = requireFluentIcon('font');
const FluentFontSizeIncreaseIcon = requireFluentIcon('font-grow');
const FluentFontSizeDecreaseIcon = requireFluentIcon('font-shrink');
const FluentChangeCaseIcon = requireFluentIcon('change-case');
const FluentClearFormattingIcon = requireFluentIcon('clear-formatting');
const FluentBoldIcon = requireFluentIcon('bold');
const FluentItalicIcon = requireFluentIcon('italic');
const FluentUnderlineIcon = requireFluentIcon('underline');
const FluentStrikethroughIcon = requireFluentIcon('strike');
const FluentSubscriptIcon = requireFluentIcon('subscript');
const FluentSuperscriptIcon = requireFluentIcon('superscript');
const FluentFontColorIcon = requireFluentIcon('font-color');
const FluentHighlightIcon = requireFluentIcon('highlight');
const FluentBulletListIcon = requireFluentIcon('bullets');
const FluentNumberListIcon = requireFluentIcon('numbering');
const FluentMultilevelListIcon = requireFluentIcon('multilevel');
const FluentIndentDecreaseIcon = requireFluentIcon('outdent');
const FluentIndentIncreaseIcon = requireFluentIcon('indent');
const FluentSortIcon = requireFluentIcon('sort');
const FluentParagraphIcon = requireFluentIcon('paragraph');
const FluentAlignLeftIcon = requireFluentIcon('align-left');
const FluentAlignCenterIcon = requireFluentIcon('align-center');
const FluentAlignRightIcon = requireFluentIcon('align-right');
const FluentAlignJustifyIcon = requireFluentIcon('align-justify');
const FluentLineSpacingIcon = requireFluentIcon('line-spacing');
const FluentShadingIcon = requireFluentIcon('shading');
const FluentBorderAllIcon = requireFluentIcon('borders');
const FluentStylesIcon = requireFluentIcon('styles');
const FluentSearchIcon = requireFluentIcon('search');
const FluentSelectAllIcon = requireFluentIcon('select-all');

const RibbonIconView = ({ icon }: { icon: RibbonIcon }) =>
  createElement(icon, { 'aria-hidden': true });

const RibbonTooltip = ({
  children,
  description,
  shortcut,
  title,
}: {
  children: ReactElement;
  description?: string;
  shortcut?: string;
  title: string;
}) => (
  <Tooltip
    content={{
      children: (
        <span className="canvas-word-ribbon__tooltip-content">
          <strong>{title}</strong>
          {description && <span>{description}</span>}
          {shortcut && <kbd>{shortcut}</kbd>}
        </span>
      ),
    }}
    positioning="below"
    relationship="description"
    showDelay={500}
  >
    {children}
  </Tooltip>
);

const RibbonButton = ({
  active,
  commandId,
  description,
  disabled,
  icon: FallbackIcon,
  keyTip,
  label,
  large,
  shortcut,
  title,
  onClick,
}: RibbonButtonProps) => {
  const registry = useRibbonCommandRegistry();
  const definition = commandId ? registry.get(commandId) : undefined;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const effectiveKeyTip = keyTip ?? definition?.keyTip;
  const showKeyTip = useKeyTip(effectiveKeyTip, buttonRef);
  const commandDisabled = commandId ? !registry.canExecute(commandId) : false;
  const effectiveDisabled = Boolean(
    disabled || commandDisabled || (!commandId && !onClick)
  );
  const effectiveActive = commandId
    ? registry.isActive(commandId)
    : Boolean(active);
  const mixed = commandId ? registry.isMixed(commandId) : false;
  const schemaIconId = commandId
    ? homeControlIconIds.get(commandId)
    : undefined;
  const Icon = schemaIconId
    ? writerIconRegistry.resolve(schemaIconId, effectiveActive) ?? FallbackIcon
    : FallbackIcon;
  const effectiveTitle = definition?.label ?? title;
  const effectiveDescription =
    commandId && commandDisabled
      ? registry.disabledReason(commandId)
      : definition?.tooltip ?? description;
  const effectiveShortcut = definition?.shortcut ?? shortcut;

  return (
    <RibbonTooltip
      description={effectiveDescription}
      shortcut={effectiveShortcut}
      title={effectiveTitle}
    >
      <button
        ref={buttonRef}
        type="button"
        className={
          'canvas-word-ribbon__button' +
          (large ? ' is-large' : '') +
          (effectiveActive ? ' is-active' : '') +
          (mixed ? ' is-mixed' : '')
        }
        data-command-id={commandId}
        disabled={effectiveDisabled}
        aria-label={effectiveTitle}
        aria-description={effectiveDescription}
        aria-pressed={mixed ? 'mixed' : effectiveActive ? true : undefined}
        aria-keyshortcuts={effectiveShortcut}
        onMouseDown={event => event.preventDefault()}
        onClick={() =>
          commandId ? void registry.execute(commandId) : onClick?.()
        }
      >
        <RibbonIconView icon={Icon} />
        {label && <span>{label}</span>}
        {showKeyTip && effectiveKeyTip && (
          <kbd className="canvas-word-ribbon__keytip">{effectiveKeyTip}</kbd>
        )}
      </button>
    </RibbonTooltip>
  );
};

const RibbonPopover = ({
  active,
  children,
  commandId,
  description,
  disabled,
  icon: FallbackIcon,
  keyTip,
  label,
  large,
  panelClassName = '',
  shortcut,
  title,
}: RibbonPopoverProps) => {
  const registry = useRibbonCommandRegistry();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusMenuOnOpenRef = useRef(false);
  const definition = commandId ? registry.get(commandId) : undefined;
  const effectiveKeyTip = keyTip ?? definition?.keyTip;
  const showKeyTip = useKeyTip(effectiveKeyTip, triggerRef);
  const commandDisabled = commandId ? !registry.canExecute(commandId) : false;
  const effectiveDisabled = Boolean(disabled || commandDisabled);
  const effectiveActive = commandId
    ? registry.isActive(commandId)
    : Boolean(active);
  const schemaIconId = commandId
    ? homeControlIconIds.get(commandId)
    : undefined;
  const Icon = schemaIconId
    ? writerIconRegistry.resolve(schemaIconId, effectiveActive) ?? FallbackIcon
    : FallbackIcon;
  const effectiveTitle = definition?.label ?? title;
  const effectiveDescription =
    commandId && commandDisabled
      ? registry.disabledReason(commandId)
      : definition?.tooltip ?? description;

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelWidth = panelClassName.includes('is-ribbon-group')
        ? Math.min(720, window.innerWidth - 16)
        : panelClassName.includes('is-wide')
        ? 292
        : 224;
      setPosition({
        left: Math.max(
          8,
          Math.min(rect.left, window.innerWidth - panelWidth - 8)
        ),
        top: rect.bottom + 4,
      });
    };
    const closeFromOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const closeFromEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    };
    updatePosition();
    panelRef.current
      ?.querySelectorAll<HTMLButtonElement>('button:not([role])')
      .forEach(button => button.setAttribute('role', 'menuitem'));
    if (focusMenuOnOpenRef.current) {
      requestAnimationFrame(() => {
        panelRef.current
          ?.querySelector<HTMLElement>(
            '[role="menuitem"]:not([aria-disabled="true"]), button:not(:disabled), input:not(:disabled), select:not(:disabled)'
          )
          ?.focus();
      });
    }
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('pointerdown', closeFromOutside);
    document.addEventListener('keydown', closeFromEscape);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('pointerdown', closeFromOutside);
      document.removeEventListener('keydown', closeFromEscape);
    };
  }, [open, panelClassName]);

  const portalHost =
    typeof document !== 'undefined'
      ? document.fullscreenElement ?? document.body
      : null;
  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"]), button:not(:disabled), input:not(:disabled), select:not(:disabled)'
      )
    ).filter(
      (control, index, collection) =>
        control.offsetParent !== null && collection.indexOf(control) === index
    );
    if (controls.length === 0) return;
    const currentIndex = Math.max(
      0,
      controls.indexOf(document.activeElement as HTMLElement)
    );
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
        ? controls.length - 1
        : event.key === 'ArrowUp'
        ? (currentIndex - 1 + controls.length) % controls.length
        : (currentIndex + 1) % controls.length;
    event.preventDefault();
    controls[nextIndex].focus();
  };

  return (
    <>
      <RibbonTooltip
        description={effectiveDescription}
        shortcut={definition?.shortcut ?? shortcut}
        title={effectiveTitle}
      >
        <button
          ref={triggerRef}
          type="button"
          className={`canvas-word-ribbon__popover-trigger${
            large ? ' is-large' : ''
          }${effectiveActive ? ' is-active' : ''}`}
          data-command-id={commandId}
          disabled={effectiveDisabled}
          aria-label={effectiveTitle}
          aria-description={effectiveDescription}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onMouseDown={event => event.preventDefault()}
          onClick={event => {
            const nextOpen = !open;
            focusMenuOnOpenRef.current = nextOpen && event.detail === 0;
            setOpen(nextOpen);
          }}
        >
          <RibbonIconView icon={Icon} />
          {label && <span>{label}</span>}
          <FluentChevronDownIcon
            className="canvas-word-ribbon__popover-chevron"
            aria-hidden="true"
          />
          {showKeyTip && effectiveKeyTip && (
            <kbd className="canvas-word-ribbon__keytip">{effectiveKeyTip}</kbd>
          )}
        </button>
      </RibbonTooltip>
      {open &&
        portalHost &&
        createPortal(
          <div
            ref={panelRef}
            id={menuId}
            className={`canvas-word-ribbon__popover ${panelClassName}`}
            style={{ left: position.left, top: position.top }}
            role="menu"
            aria-label={effectiveTitle}
            onKeyDown={handleMenuKeyDown}
            onClick={event => {
              if (
                !(event.target as Element).closest(
                  'button, [role="menuitem"], input[type="color"]'
                )
              )
                return;
              setOpen(false);
              requestAnimationFrame(() => triggerRef.current?.focus());
            }}
          >
            {children}
          </div>,
          portalHost
        )}
    </>
  );
};

const RibbonGroup = ({
  children,
  collapse = false,
  id,
  icon,
  label,
  mode = 'full',
}: {
  children: ReactNode;
  collapse?: boolean;
  id?: string;
  icon?: RibbonIcon;
  label: string;
  mode?: RibbonLayoutMode;
}) => (
  <div
    aria-label={label}
    className={`canvas-word-ribbon__group${collapse ? ' is-collapsed' : ''}${
      mode === 'overflow' ? ' is-overflow' : ''
    }`}
    data-ribbon-group-id={id}
    data-ribbon-mode={mode}
    role="toolbar"
  >
    <div className="canvas-word-ribbon__group-content">
      {collapse && icon ? (
        <RibbonPopover
          description={`Mostrar todos los comandos del grupo ${label}.`}
          icon={icon}
          label={label}
          large
          panelClassName="is-ribbon-group"
          title={`${label}: más comandos`}
        >
          <div className="canvas-word-ribbon__group-popover-content">
            {children}
          </div>
        </RibbonPopover>
      ) : (
        children
      )}
    </div>
    <span className="canvas-word-ribbon__group-label">{label}</span>
  </div>
);

const RibbonTabButton = ({
  active,
  keyTip,
  label,
  onClick,
  tabId,
}: {
  active: boolean;
  keyTip: string;
  label: string;
  onClick: () => void;
  tabId: RibbonTab;
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const showKeyTip = useKeyTip(keyTip, ref, 'tabs');
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      id={`dhyrium-ribbon-tab-${tabId}`}
      aria-controls={`dhyrium-ribbon-panel-${tabId}`}
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      className={active ? 'is-active' : ''}
      onClick={onClick}
    >
      {label}
      {showKeyTip && <kbd className="canvas-word-ribbon__keytip">{keyTip}</kbd>}
    </button>
  );
};

const TABLE_PICKER_ROWS = 8;
const TABLE_PICKER_COLUMNS = 10;

const TableGridPicker = ({
  onSelect,
}: {
  onSelect: (rows: number, columns: number) => void;
}) => {
  const [selection, setSelection] = useState({ rows: 3, columns: 3 });

  return (
    <div
      className="canvas-word-ribbon__table-picker"
      onMouseLeave={() => setSelection({ rows: 3, columns: 3 })}
    >
      <strong>
        {selection.columns} x {selection.rows} Tabla
      </strong>
      <div
        className="canvas-word-ribbon__table-picker-grid"
        role="grid"
        aria-label="Seleccionar tamaÃ±o de tabla"
        style={
          { '--table-picker-columns': TABLE_PICKER_COLUMNS } as CSSProperties
        }
      >
        {Array.from({ length: TABLE_PICKER_ROWS }, (_, rowIndex) =>
          Array.from({ length: TABLE_PICKER_COLUMNS }, (_, columnIndex) => {
            const rows = rowIndex + 1;
            const columns = columnIndex + 1;
            const selected =
              rows <= selection.rows && columns <= selection.columns;
            return (
              <button
                key={`${rows}-${columns}`}
                type="button"
                role="gridcell"
                className={selected ? 'is-selected' : ''}
                aria-selected={selected}
                aria-label={`Insertar tabla de ${columns} columnas por ${rows} filas`}
                onFocus={() => setSelection({ rows, columns })}
                onMouseEnter={() => setSelection({ rows, columns })}
                onMouseDown={event => event.preventDefault()}
                onClick={() => onSelect(rows, columns)}
              />
            );
          })
        )}
      </div>
      <span>Use las flechas o el puntero para elegir el tamaÃ±o.</span>
    </div>
  );
};

const OFFICE_THEME_COLORS = [
  '#000000',
  '#ffffff',
  '#44546a',
  '#5b9bd5',
  '#ed7d31',
  '#a5a5a5',
  '#ffc000',
  '#4472c4',
  '#70ad47',
  '#7f7f7f',
  '#d9e2f3',
  '#deebf7',
  '#fce4d6',
  '#e7e6e6',
  '#fff2cc',
  '#d9e1f2',
  '#e2f0d9',
  '#595959',
  '#b4c6e7',
  '#9dc3e6',
  '#f4b183',
  '#c9c9c9',
  '#ffe699',
  '#8eaadb',
  '#a9d18e',
  '#c00000',
  '#ff0000',
  '#ffc000',
  '#ffff00',
  '#92d050',
  '#00b050',
  '#00b0f0',
  '#0070c0',
  '#002060',
  '#7030a0',
];

const OfficeColorPicker = ({
  commandId,
  icon,
  title,
  value,
  allowNone = false,
  onChange,
}: {
  commandId?: string;
  icon: RibbonIcon;
  title: string;
  value: string;
  allowNone?: boolean;
  onChange?: (color: string | null) => void;
}) => {
  const registry = useRibbonCommandRegistry();
  const applyColor = (color: string | null) => {
    if (commandId) void registry.execute(commandId, color);
    else onChange?.(color);
  };
  return (
    <RibbonPopover
      commandId={commandId}
      icon={icon}
      title={title}
      panelClassName="is-wide"
    >
      <div
        className="canvas-word-ribbon__color-menu"
        onClick={event => event.stopPropagation()}
      >
        <header>{title}</header>
        <button
          type="button"
          className="canvas-word-ribbon__automatic-color"
          onMouseDown={event => event.preventDefault()}
          onClick={() => applyColor(allowNone ? null : '#000000')}
        >
          <span style={{ background: allowNone ? 'transparent' : '#000000' }} />
          {allowNone ? 'Sin color' : 'Automático'}
        </button>
        <p>Colores del tema</p>
        <div className="canvas-word-ribbon__color-swatches">
          {OFFICE_THEME_COLORS.map((color, index) => (
            <button
              key={`${color}-${index}`}
              type="button"
              className={value.toLowerCase() === color ? 'is-active' : ''}
              style={{ background: color }}
              title={color}
              aria-label={`Color ${color}`}
              onMouseDown={event => event.preventDefault()}
              onClick={() => applyColor(color)}
            />
          ))}
        </div>
        <label
          className="canvas-word-ribbon__more-colors"
          onClick={event => event.stopPropagation()}
        >
          Más colores…
          <input
            type="color"
            value={value || '#000000'}
            onChange={event => applyColor(event.target.value)}
          />
        </label>
      </div>
    </RibbonPopover>
  );
};

interface FontOption {
  family: string;
  group: 'Dhyrium' | 'Fuentes del sistema' | 'Clásicas' | 'Técnicas';
  description: string;
  fallback: 'sans-serif' | 'serif' | 'monospace';
}

const fontOptions: FontOption[] = [
  {
    family: 'Carlito',
    group: 'Dhyrium',
    description: 'Compatible con Calibri · incluida sin Internet',
    fallback: 'sans-serif',
  },
  {
    family: 'Caladea',
    group: 'Dhyrium',
    description: 'Compatible con Cambria · incluida sin Internet',
    fallback: 'serif',
  },
  {
    family: 'Aptos',
    group: 'Fuentes del sistema',
    description: 'Sans serif moderna',
    fallback: 'sans-serif',
  },
  {
    family: 'Aptos Display',
    group: 'Fuentes del sistema',
    description: 'Títulos modernos',
    fallback: 'sans-serif',
  },
  {
    family: 'Aptos Narrow',
    group: 'Fuentes del sistema',
    description: 'Texto compacto',
    fallback: 'sans-serif',
  },
  {
    family: 'Calibri',
    group: 'Fuentes del sistema',
    description: 'Texto de interfaz y documentos',
    fallback: 'sans-serif',
  },
  {
    family: 'Calibri Light',
    group: 'Fuentes del sistema',
    description: 'Títulos ligeros',
    fallback: 'sans-serif',
  },
  {
    family: 'Cambria',
    group: 'Fuentes del sistema',
    description: 'Documentos formales',
    fallback: 'serif',
  },
  {
    family: 'Cambria Math',
    group: 'Fuentes del sistema',
    description: 'Fórmulas y matemáticas',
    fallback: 'serif',
  },
  {
    family: 'Candara',
    group: 'Fuentes del sistema',
    description: 'Humanista y legible',
    fallback: 'sans-serif',
  },
  {
    family: 'Century Gothic',
    group: 'Fuentes del sistema',
    description: 'Geométrica y limpia',
    fallback: 'sans-serif',
  },
  {
    family: 'Constantia',
    group: 'Fuentes del sistema',
    description: 'Lectura prolongada',
    fallback: 'serif',
  },
  {
    family: 'Corbel',
    group: 'Fuentes del sistema',
    description: 'Presentaciones modernas',
    fallback: 'sans-serif',
  },
  {
    family: 'Segoe UI',
    group: 'Fuentes del sistema',
    description: 'Interfaz del sistema',
    fallback: 'sans-serif',
  },
  {
    family: 'Arial',
    group: 'Clásicas',
    description: 'Universal y profesional',
    fallback: 'sans-serif',
  },
  {
    family: 'Arial Narrow',
    group: 'Clásicas',
    description: 'Texto compacto',
    fallback: 'sans-serif',
  },
  {
    family: 'Arial Black',
    group: 'Clásicas',
    description: 'Titulares de alto impacto',
    fallback: 'sans-serif',
  },
  {
    family: 'Times New Roman',
    group: 'Clásicas',
    description: 'Informes y documentos formales',
    fallback: 'serif',
  },
  {
    family: 'Georgia',
    group: 'Clásicas',
    description: 'Serif optimizada para pantalla',
    fallback: 'serif',
  },
  {
    family: 'Garamond',
    group: 'Clásicas',
    description: 'Editorial y elegante',
    fallback: 'serif',
  },
  {
    family: 'Book Antiqua',
    group: 'Clásicas',
    description: 'Estilo editorial tradicional',
    fallback: 'serif',
  },
  {
    family: 'Palatino Linotype',
    group: 'Clásicas',
    description: 'Clásica de lectura cómoda',
    fallback: 'serif',
  },
  {
    family: 'Tahoma',
    group: 'Clásicas',
    description: 'Clara en pantalla',
    fallback: 'sans-serif',
  },
  {
    family: 'Verdana',
    group: 'Clásicas',
    description: 'Alta legibilidad',
    fallback: 'sans-serif',
  },
  {
    family: 'Trebuchet MS',
    group: 'Clásicas',
    description: 'Informal y legible',
    fallback: 'sans-serif',
  },
  {
    family: 'Franklin Gothic Medium',
    group: 'Clásicas',
    description: 'Títulos institucionales',
    fallback: 'sans-serif',
  },
  {
    family: 'Gill Sans MT',
    group: 'Clásicas',
    description: 'Presentaciones y portadas',
    fallback: 'sans-serif',
  },
  {
    family: 'Comic Sans MS',
    group: 'Clásicas',
    description: 'Material didáctico',
    fallback: 'sans-serif',
  },
  {
    family: 'Impact',
    group: 'Clásicas',
    description: 'Titulares condensados',
    fallback: 'sans-serif',
  },
  {
    family: 'Consolas',
    group: 'Técnicas',
    description: 'Código y datos técnicos',
    fallback: 'monospace',
  },
  {
    family: 'Courier New',
    group: 'Técnicas',
    description: 'Monoespaciada clásica',
    fallback: 'monospace',
  },
  {
    family: 'Lucida Console',
    group: 'Técnicas',
    description: 'Texto técnico compacto',
    fallback: 'monospace',
  },
];
const sizeOptions = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72];

type LocalIllustrationKind = 'shape' | 'icon' | 'model' | 'smartart' | 'chart';
type TextCaseMode = 'sentence' | 'lower' | 'upper' | 'title' | 'toggle';

interface CanvasStylePreset {
  id: string;
  label: string;
  preview: string;
  className?: string;
  level: TitleLevel | null;
  font: string;
  size: number;
  bold?: boolean;
  italic?: boolean;
  color?: string;
  rowMargin?: number;
}

const canvasStylePresets: CanvasStylePreset[] = [
  {
    id: 'normal',
    label: 'Normal',
    preview: 'AaBbCcDd',
    level: null,
    font: 'Carlito',
    size: 14.6667,
    rowMargin: 1.15,
  },
  {
    id: 'no-spacing',
    label: 'Sin espacio',
    preview: 'AaBbCcDd',
    level: null,
    font: 'Carlito',
    size: 14.6667,
    rowMargin: 1,
  },
  {
    id: 'heading-1',
    label: 'Título 1',
    preview: 'AaBbCcDd',
    level: TitleLevel.FIRST,
    font: 'Caladea',
    size: 21.3333,
    bold: true,
    color: '#2f5496',
  },
  {
    id: 'heading-2',
    label: 'Título 2',
    preview: 'AaBbCcDd',
    level: TitleLevel.SECOND,
    font: 'Caladea',
    size: 17.3333,
    color: '#2f5496',
  },
  {
    id: 'heading-3',
    label: 'Título 3',
    preview: 'AaBbCcDd',
    level: TitleLevel.THIRD,
    font: 'Caladea',
    size: 16,
    color: '#1f3763',
  },
  {
    id: 'title',
    label: 'Título',
    preview: 'AaBbCc',
    className: 'is-title',
    level: TitleLevel.FIRST,
    font: 'Caladea',
    size: 34.6667,
    color: '#1f4e79',
  },
  {
    id: 'subtitle',
    label: 'Subtítulo',
    preview: 'AaBbCcDd',
    className: 'is-subtitle',
    level: TitleLevel.SECOND,
    font: 'Carlito',
    size: 14.6667,
    italic: true,
    color: '#5b6573',
  },
  {
    id: 'subtle',
    label: 'Énfasis sutil',
    preview: 'AaBbCcDd',
    className: 'is-subtle',
    level: null,
    font: 'Carlito',
    size: 14.6667,
    italic: true,
    color: '#5b6573',
  },
  {
    id: 'emphasis',
    label: 'Énfasis',
    preview: 'AaBbCcDd',
    className: 'is-emphasis',
    level: null,
    font: 'Carlito',
    size: 14.6667,
    bold: true,
    color: '#2f5496',
  },
  {
    id: 'strong',
    label: 'Énfasis intenso',
    preview: 'AaBbCcDd',
    className: 'is-strong',
    level: null,
    font: 'Carlito',
    size: 14.6667,
    bold: true,
    italic: true,
    color: '#1f3763',
  },
  {
    id: 'quote',
    label: 'Cita',
    preview: 'AaBbCcDd',
    className: 'is-quote',
    level: null,
    font: 'Caladea',
    size: 14.6667,
    italic: true,
    color: '#44546a',
    rowMargin: 1.5,
  },
];

const localIllustrationSvg = (kind: LocalIllustrationKind) => {
  const commonStart =
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">';
  const commonEnd = '</svg>';
  const illustrations: Record<LocalIllustrationKind, string> = {
    shape:
      '<rect x="90" y="65" width="460" height="230" rx="28" fill="#eaf2fb" stroke="#2b579a" stroke-width="8"/><text x="320" y="192" text-anchor="middle" font-family="Arial" font-size="42" fill="#17365d">FORMA</text>',
    icon: '<circle cx="320" cy="180" r="118" fill="#2b579a"/><path d="M255 184l43 43 91-100" fill="none" stroke="#fff" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>',
    model:
      '<path d="M320 45l170 90-170 92-170-92z" fill="#d9e9f8" stroke="#2b579a" stroke-width="7"/><path d="M150 135v125l170 58V227z" fill="#9dc3e6" stroke="#2b579a" stroke-width="7"/><path d="M490 135v125l-170 58V227z" fill="#5b9bd5" stroke="#2b579a" stroke-width="7"/>',
    smartart:
      '<g font-family="Arial" font-size="25" text-anchor="middle"><rect x="35" y="130" width="150" height="90" rx="12" fill="#d9e9f8" stroke="#2b579a" stroke-width="5"/><rect x="245" y="45" width="150" height="90" rx="12" fill="#5b9bd5" stroke="#2b579a" stroke-width="5"/><rect x="455" y="130" width="150" height="90" rx="12" fill="#d9e9f8" stroke="#2b579a" stroke-width="5"/><rect x="245" y="225" width="150" height="90" rx="12" fill="#9dc3e6" stroke="#2b579a" stroke-width="5"/><path d="M185 165l60-52m150 0l60 52m-135-30v90" stroke="#2b579a" stroke-width="7" fill="none"/><text x="110" y="185">Idea</text><text x="320" y="100" fill="#fff">Proceso</text><text x="530" y="185">Resultado</text><text x="320" y="280">Control</text></g>',
    chart:
      '<line x1="90" y1="290" x2="565" y2="290" stroke="#536174" stroke-width="5"/><line x1="90" y1="55" x2="90" y2="290" stroke="#536174" stroke-width="5"/><rect x="145" y="190" width="70" height="100" fill="#9dc3e6"/><rect x="260" y="125" width="70" height="165" fill="#5b9bd5"/><rect x="375" y="75" width="70" height="215" fill="#2b579a"/><rect x="490" y="155" width="70" height="135" fill="#4472c4"/>',
  };
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `${commonStart}${illustrations[kind]}${commonEnd}`
  )}`;
};

const styledText = (text: string, style: Partial<IElement> = {}): IElement[] =>
  splitText(text).map(value => ({ ...style, value }));

interface FontPickerProps {
  disabled?: boolean;
  disabledReason?: string;
  value: string;
  onChange: (font: string) => void;
}

const FontPicker = ({
  disabled = false,
  disabledReason,
  value,
  onChange,
}: FontPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const visibleFonts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('es');
    const availableFonts = fontOptions.some(option => option.family === value)
      ? fontOptions
      : [
          {
            family: value,
            group: 'Dhyrium' as const,
            description: 'Fuente del documento',
            fallback: 'sans-serif' as const,
          },
          ...fontOptions,
        ];
    return normalizedSearch
      ? availableFonts.filter(option =>
          `${option.family} ${option.description}`
            .toLocaleLowerCase('es')
            .includes(normalizedSearch)
        )
      : availableFonts;
  }, [search, value]);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 342;
      setPosition({
        left: Math.max(
          8,
          Math.min(rect.left, window.innerWidth - menuWidth - 8)
        ),
        top: rect.bottom + 4,
      });
    };
    const closeFromOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const closeFromEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('pointerdown', closeFromOutside);
    document.addEventListener('keydown', closeFromEscape);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('pointerdown', closeFromOutside);
      document.removeEventListener('keydown', closeFromEscape);
    };
  }, [open]);

  const fontStyle = (font: FontOption): CSSProperties => ({
    fontFamily: `"${font.family}", ${font.fallback}`,
  });
  const groups: FontOption['group'][] = [
    'Dhyrium',
    'Fuentes del sistema',
    'Clásicas',
    'Técnicas',
  ];
  const portalHost =
    typeof document !== 'undefined'
      ? document.fullscreenElement ?? document.body
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-command-id="home.font.family"
        className="canvas-word-ribbon__font-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={`Fuente actual: ${value}`}
        aria-description={disabledReason}
        title="Seleccionar fuente"
        onMouseDown={event => event.preventDefault()}
        onClick={() => setOpen(current => !current)}
      >
        <span style={{ fontFamily: `"${value}", sans-serif` }}>{value}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open &&
        portalHost &&
        createPortal(
          <div
            ref={menuRef}
            className="canvas-word-ribbon__font-menu"
            style={{ left: position.left, top: position.top }}
            role="dialog"
            aria-label="Selector de fuente"
          >
            <label className="canvas-word-ribbon__font-search">
              <Search aria-hidden="true" />
              <input
                autoFocus
                value={search}
                placeholder="Buscar una fuente"
                onChange={event => setSearch(event.target.value)}
              />
            </label>
            <div className="canvas-word-ribbon__font-menu-header">
              <strong>Fuentes</strong>
              <span>{visibleFonts.length} disponibles</span>
            </div>
            <div
              id={listboxId}
              className="canvas-word-ribbon__font-list"
              role="listbox"
              aria-label="Fuentes disponibles"
            >
              {groups.map(group => {
                const groupFonts = visibleFonts.filter(
                  font => font.group === group
                );
                if (!groupFonts.length) return null;
                return (
                  <div
                    key={group}
                    className="canvas-word-ribbon__font-section"
                    role="group"
                    aria-label={group}
                  >
                    <p>{group}</p>
                    {groupFonts.map(font => (
                      <button
                        key={font.family}
                        type="button"
                        className={font.family === value ? 'is-active' : ''}
                        role="option"
                        aria-selected={font.family === value}
                        onClick={() => {
                          onChange(font.family);
                          setOpen(false);
                          setSearch('');
                          requestAnimationFrame(() =>
                            triggerRef.current?.focus()
                          );
                        }}
                      >
                        <span className="canvas-word-ribbon__font-check">
                          {font.family === value && (
                            <Check aria-hidden="true" />
                          )}
                        </span>
                        <span
                          className="canvas-word-ribbon__font-preview"
                          style={fontStyle(font)}
                        >
                          {font.family}
                        </span>
                        <small>{font.description}</small>
                      </button>
                    ))}
                  </div>
                );
              })}
              {!visibleFonts.length && (
                <p className="canvas-word-ribbon__font-empty">
                  No se encontró esa fuente.
                </p>
              )}
            </div>
            <footer>
              Carlito y Caladea están incluidas en Dhyrium y funcionan sin
              Internet.
            </footer>
          </div>,
          portalHost
        )}
    </>
  );
};

const CanvasWordRibbon = ({
  document,
  documentTitle,
  editor,
  rangeStyle,
  isExporting,
  isFullscreen,
  isVersionsLoading,
  saveStatus,
  showNavigationPane,
  showRuler,
  sourceFile,
  taskId,
  taskKind,
  versions,
  zoom,
  wordCount,
  onBackstageChange,
  onCreateDocument,
  onDownloadPdf,
  onDownloadWord,
  onInsertImage,
  onReplaceImage,
  onInsertVideo,
  onPrint,
  onRangeStylePatch,
  onReload,
  onRestoreVersion,
  onSave,
  onSaveAs,
  onToggleFullscreen,
  onToggleNavigationPane,
  onToggleRuler,
  onZoomChange,
}: CanvasWordRibbonProps) => {
  const [activeTab, setActiveTab] = useState<RibbonTab>('home');
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [editingMode, setEditingMode] = useState<'search' | 'replace' | null>(
    null
  );
  const [traceEnabled, setTraceEnabled] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedImage, setSelectedImage] = useState<IElement | null>(null);
  const [editorZone, setEditorZone] = useState<EditorZone>(EditorZone.MAIN);
  const [showFormattingMarks, setShowFormattingMarks] = useState(false);
  const [legacyRibbonDensity, setLegacyRibbonDensity] =
    useState<RibbonDensity>('expanded');
  const ribbonRef = useRef<HTMLDivElement>(null);
  const command = editor?.command;
  const editorStateAdapter = useMemo(
    () => new EditorStateAdapter(editor, rangeStyle),
    [editor, rangeStyle]
  );
  const displayedTab: RibbonTab =
    (activeTab === 'table' && !editorStateAdapter.isInTable) ||
    (activeTab === 'image' && !selectedImage) ||
    (activeTab === 'header-footer' && editorZone === EditorZone.MAIN)
      ? 'home'
      : activeTab;
  const homeLayout = useRibbonLayoutEngine(
    ribbonRef,
    homeGroups,
    displayedTab === 'home' && !isCollapsed
  );
  const ribbonDensity: RibbonDensity =
    displayedTab !== 'home'
      ? legacyRibbonDensity
      : Object.values(homeLayout).some(
          mode => mode === 'collapsed' || mode === 'overflow'
        )
      ? 'condensed'
      : Object.values(homeLayout).some(mode => mode === 'compact')
      ? 'compact'
      : 'expanded';
  const homeGroupMode = (groupId: string): RibbonLayoutMode =>
    homeLayout[groupId] ?? 'full';

  useEffect(() => {
    onBackstageChange(displayedTab === 'file');
    return () => onBackstageChange(false);
  }, [displayedTab, onBackstageChange]);

  useEffect(() => {
    if (!editor) return;
    let imageMouseEvent: MouseEvent | null = null;
    const clearImageSelection = (event: MouseEvent) => {
      queueMicrotask(() => {
        if (imageMouseEvent !== event) setSelectedImage(null);
        imageMouseEvent = null;
      });
    };
    const handleImageSelection = ({
      evt,
      element,
    }: {
      evt: MouseEvent;
      element: IElement;
    }) => {
      imageMouseEvent = evt;
      setSelectedImage(element);
      setActiveTab('image');
    };
    const handleZoneChange = (zone: EditorZone) => {
      setEditorZone(zone);
      if (zone !== EditorZone.MAIN) setActiveTab('header-footer');
    };
    editor.eventBus.on('mousedown', clearImageSelection);
    editor.eventBus.on('imageMousedown', handleImageSelection);
    editor.eventBus.on('zoneChange', handleZoneChange);
    return () => {
      editor.eventBus.off('mousedown', clearImageSelection);
      editor.eventBus.off('imageMousedown', handleImageSelection);
      editor.eventBus.off('zoneChange', handleZoneChange);
    };
  }, [editor]);

  useEffect(() => {
    const ribbon = ribbonRef.current;
    if (!ribbon || typeof ResizeObserver === 'undefined') return;

    const updateDensity = (width: number) => {
      setLegacyRibbonDensity(
        width >= 1720 ? 'expanded' : width >= 1200 ? 'compact' : 'condensed'
      );
    };
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) updateDensity(entry.contentRect.width);
    });
    updateDensity(ribbon.getBoundingClientRect().width);
    observer.observe(ribbon);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleRibbonShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey && event.key === 'F1')) return;
      event.preventDefault();
      setIsCollapsed(value => !value);
    };
    window.document.addEventListener('keydown', handleRibbonShortcut, true);
    return () =>
      window.document.removeEventListener(
        'keydown',
        handleRibbonShortcut,
        true
      );
  }, []);

  const fontSizePt = useMemo(
    () => Math.max(5, Math.round(((rangeStyle.size ?? 14.6667) * 72) / 96)),
    [rangeStyle.size]
  );

  const insertHyperlink = () => {
    if (!command) return;
    const selectedText = command.getRangeText().trim();
    const text =
      selectedText || window.prompt('Texto del vínculo:', '')?.trim();
    if (!text) return;
    const url = window.prompt('Dirección del vínculo:', 'https://')?.trim();
    if (!url) return;
    command.executeHyperlink({
      url,
      valueList: splitText(text).map(value => ({
        value,
        size: rangeStyle.size ?? 14.6667,
      })),
    });
  };

  const addWatermark = () => {
    if (!command) return;
    const data = window
      .prompt('Texto de la marca de agua:', 'BORRADOR')
      ?.trim();
    if (!data) return;
    command.executeAddWatermark({
      data,
      color: '#b6bcc6',
      size: 96,
      opacity: 0.18,
    });
  };

  const replaceSelectedText = (text: string) => {
    if (!command) return;
    command.executeBackspace();
    command.executeInsertElementList(
      splitText(text).map(value => ({
        value,
        font: rangeStyle.font,
        size: rangeStyle.size,
        bold: rangeStyle.bold,
        italic: rangeStyle.italic,
        underline: rangeStyle.underline,
        strikeout: rangeStyle.strikeout,
        color: rangeStyle.color ?? undefined,
        highlight: rangeStyle.highlight ?? undefined,
      }))
    );
  };

  const changeSelectionCase = (mode: TextCaseMode) => {
    const selectedText = command?.getRangeText();
    if (!selectedText) return;

    const transformations: Record<TextCaseMode, (text: string) => string> = {
      sentence: text =>
        text
          .toLocaleLowerCase('es')
          .replace(
            /(^|[.!?]\s+)([a-záéíóúñü])/giu,
            (_match, prefix: string, letter: string) =>
              `${prefix}${letter.toLocaleUpperCase('es')}`
          ),
      lower: text => text.toLocaleLowerCase('es'),
      upper: text => text.toLocaleUpperCase('es'),
      title: text =>
        text
          .toLocaleLowerCase('es')
          .replace(
            /(^|\s)(\p{L})/gu,
            (_match, prefix: string, letter: string) =>
              `${prefix}${letter.toLocaleUpperCase('es')}`
          ),
      toggle: text =>
        Array.from(text)
          .map(character =>
            character === character.toLocaleUpperCase('es')
              ? character.toLocaleLowerCase('es')
              : character.toLocaleUpperCase('es')
          )
          .join(''),
    };

    replaceSelectedText(transformations[mode](selectedText));
  };

  const sortSelectedLines = () => {
    const selectedText = command?.getRangeText();
    if (!selectedText) return;
    const collator = new Intl.Collator('es', {
      sensitivity: 'base',
      numeric: true,
    });
    replaceSelectedText(
      selectedText.split(/\r?\n/).sort(collator.compare).join('\n')
    );
  };

  const toggleFormattingMarks = () => {
    if (!command) return;
    const next = !showFormattingMarks;
    setShowFormattingMarks(next);
    command.executeUpdateOptions({
      whiteSpace: {
        disabled: !next,
        color: '#7a8699',
        radius: 1.4,
      },
    });
  };

  const applyStylePreset = (preset: CanvasStylePreset) => {
    if (!command) return;
    command.executeFormat();
    command.executeTitle(preset.level);
    command.executeFont(preset.font);
    command.executeSize(preset.size);
    command.executeColor(preset.color ?? '#000000');
    command.executeRowMargin(preset.rowMargin ?? 1.15);
    if (preset.bold) command.executeBold();
    if (preset.italic) command.executeItalic();
    onRangeStylePatch({
      bold: Boolean(preset.bold),
      color: preset.color ?? '#000000',
      font: preset.font,
      italic: Boolean(preset.italic),
      level: preset.level,
      rowMargin: preset.rowMargin ?? 1.15,
      size: preset.size,
    });
  };

  const insertCoverPage = () => {
    if (!command) return;
    command.executeInsertElementList([
      ...styledText('\n\n', { rowFlex: RowFlex.CENTER }),
      ...styledText('TÍTULO DEL DOCUMENTO\n', {
        bold: true,
        color: '#1f4e79',
        font: 'Caladea',
        rowFlex: RowFlex.CENTER,
        size: 42,
      }),
      ...styledText('Subtítulo o descripción del proyecto\n\n', {
        color: '#526176',
        italic: true,
        rowFlex: RowFlex.CENTER,
        size: 22,
      }),
      ...styledText('Dhyrium Software\n', {
        bold: true,
        rowFlex: RowFlex.CENTER,
        size: 18,
      }),
      ...styledText(
        new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(
          new Date()
        ),
        {
          rowFlex: RowFlex.CENTER,
          size: 14.6667,
        }
      ),
      { type: ElementType.PAGE_BREAK, value: '' },
    ]);
  };

  const insertBlankPage = () => {
    command?.executePageBreak();
    command?.executePageBreak();
  };

  const insertLocalIllustration = (kind: LocalIllustrationKind) => {
    command?.executeImage({
      value: localIllustrationSvg(kind),
      width: 420,
      height: 236,
    });
  };

  const insertScreenshot = async () => {
    if (!command || !navigator.mediaDevices?.getDisplayMedia) return;
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const video = window.document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      await new Promise<void>(resolve => {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) resolve();
        else
          video.addEventListener('loadeddata', () => resolve(), { once: true });
      });
      const maxWidth = 720;
      const ratio = Math.min(1, maxWidth / Math.max(1, video.videoWidth));
      const canvas = window.document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(video.videoWidth * ratio));
      canvas.height = Math.max(1, Math.round(video.videoHeight * ratio));
      canvas
        .getContext('2d')
        ?.drawImage(video, 0, 0, canvas.width, canvas.height);
      command.executeImage({
        value: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height,
      });
    } catch {
      // El usuario puede cancelar el selector nativo sin alterar el documento.
    } finally {
      stream?.getTracks().forEach(track => track.stop());
    }
  };

  const insertLocalTemplate = () => {
    command?.executeInsertElementList([
      ...styledText('SECCIÓN TÉCNICA\n', {
        bold: true,
        color: '#1f4e79',
        size: 24,
      }),
      ...styledText('Objetivo\n', { bold: true, size: 16 }),
      ...styledText('Describa aquí el objetivo de esta sección.\n\n'),
      ...styledText('Desarrollo\n', { bold: true, size: 16 }),
      ...styledText('Agregue aquí el contenido técnico.\n'),
    ]);
  };

  const insertBookmark = () => {
    if (!command?.getRangeText()) return;
    command.executeSetGroup();
  };

  const insertCrossReference = async () => {
    if (!command) return;
    const catalog = await command.getCatalog();
    const firstHeading = catalog?.[0];
    if (!firstHeading) return;
    command.executeHyperlink({
      url: `#${firstHeading.id}`,
      valueList: styledText(firstHeading.name, {
        color: '#0563c1',
        underline: true,
        size: rangeStyle.size ?? 14.6667,
      }),
    });
  };

  const insertCommentMark = () => {
    if (!command?.getRangeText()) return;
    command.executeHighlight('#fff2a8');
    command.executeSetGroup();
  };

  const enablePageNumbers = () => {
    command?.executeUpdateOptions({
      pageNumber: {
        disabled: false,
        format: 'Página {pageNo} de {pageCount}',
        font: 'Carlito',
        size: 11,
        color: '#5f6b7a',
        rowFlex: RowFlex.CENTER,
      },
    });
  };

  const insertTextBox = () => {
    command?.executeInsertArea({
      area: {
        backgroundColor: '#f8fbff',
        borderColor: '#5b9bd5',
        top: 8,
      },
      value: styledText('Escriba aquí el contenido del cuadro de texto.', {
        size: 14.6667,
      }),
    });
  };

  const insertQuickPart = () => {
    command?.executeInsertElementList([
      ...styledText('PROYECTO: ', { bold: true }),
      ...styledText('Nombre del proyecto\n'),
      ...styledText('RESPONSABLE: ', { bold: true }),
      ...styledText('Nombre del responsable\n'),
    ]);
  };

  const insertWordArt = () => {
    command?.executeInsertElementList(
      styledText('TEXTO ARTÍSTICO', {
        bold: true,
        color: '#2b579a',
        font: 'Caladea',
        rowFlex: RowFlex.CENTER,
        size: 34,
      })
    );
  };

  const insertSignatureLine = () => {
    command?.executeInsertElementList([
      ...styledText('\n____________________________\n', {
        rowFlex: RowFlex.CENTER,
      }),
      ...styledText('Firma y sello\n', {
        italic: true,
        rowFlex: RowFlex.CENTER,
        size: 12,
      }),
    ]);
  };

  const insertDateTime = () => {
    const formatted = new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date());
    command?.executeInsertElementList([
      {
        type: ElementType.DATE,
        value: '',
        dateFormat: 'yyyy-MM-dd HH:mm',
        valueList: styledText(formatted, { size: rangeStyle.size ?? 14.6667 }),
      },
    ]);
  };

  const insertObjectMarker = () => {
    command?.executeInsertElementList(
      styledText('[Objeto local de Dhyrium]', {
        bold: true,
        color: '#2b579a',
        underline: true,
      })
    );
  };

  const insertEquation = () => {
    command?.executeInsertElementList([
      {
        type: ElementType.LATEX,
        value: '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
      },
    ]);
  };

  const insertSymbol = () => {
    command?.executeInsertElementList(
      styledText('Ω', {
        font: 'Segoe UI Symbol',
        size: 24,
      })
    );
  };

  const homeCommandRegistry = createHomeCommandRegistry({
    adapter: editorStateAdapter,
    showFormattingMarks,
    actions: {
      applyStyle: styleId => {
        const preset = canvasStylePresets.find(item => item.id === styleId);
        if (preset) applyStylePreset(preset);
      },
      changeCase: changeSelectionCase,
      closeEditing: () => {
        command?.executeSearch(null);
        setEditingMode(null);
      },
      openEditing: setEditingMode,
      patchRangeStyle: onRangeStylePatch,
      replaceCurrent: (query, replacement) => {
        command?.executeSearch(query.trim(), { isIgnoreCase: true });
        command?.executeReplace(replacement);
      },
      searchNext: query => {
        command?.executeSearch(query.trim(), { isIgnoreCase: true });
        command?.executeSearchNavigateNext();
      },
      sortSelection: sortSelectedLines,
      toggleFormattingMarks,
    },
  });
  const contextualTabController = useMemo(
    () => new ContextualTabController(),
    []
  );
  const implementedTabs = useMemo(
    () =>
      new Set<RibbonTab>([
        'file',
        'home',
        'insert',
        'design',
        'layout',
        'references',
        'review',
        'view',
        'table',
        'image',
        'header-footer',
        'help',
      ]),
    []
  );
  const tabs = contextualTabController
    .visibleTabs(writerRibbonSchema, {
      table: editorStateAdapter.isInTable,
      image: Boolean(selectedImage),
      shape: false,
      chart: false,
      'header-footer': editorZone !== EditorZone.MAIN,
    })
    .filter(tab => implementedTabs.has(tab.id));
  const homeOverflowGroups = homeGroups.filter(
    group => homeGroupMode(group.id) === 'overflow'
  );
  const commandUiState = (commandId: string) => {
    const definition = homeCommandRegistry.get(commandId);
    const disabled = !homeCommandRegistry.canExecute(commandId);
    return {
      'aria-description': disabled
        ? homeCommandRegistry.disabledReason(commandId)
        : definition?.tooltip,
      'aria-keyshortcuts': definition?.shortcut,
      'aria-label': definition?.label ?? commandId,
      disabled,
      title: definition?.label ?? commandId,
    };
  };

  const handleTabListKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    );
    if (buttons.length === 0) return;
    const currentIndex = Math.max(
      0,
      buttons.indexOf(window.document.activeElement as HTMLButtonElement)
    );
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
        ? buttons.length - 1
        : event.key === 'ArrowLeft'
        ? (currentIndex - 1 + buttons.length) % buttons.length
        : (currentIndex + 1) % buttons.length;
    event.preventDefault();
    buttons[nextIndex].focus();
    buttons[nextIndex].click();
  };

  const handleRibbonPanelKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    const activeControl = target.closest<HTMLElement>(
      'button:not(:disabled), [role="button"]:not([aria-disabled="true"])'
    );
    if (!activeControl || !event.currentTarget.contains(activeControl)) return;
    if (
      event.altKey &&
      event.key === 'ArrowDown' &&
      activeControl.getAttribute('aria-haspopup')
    ) {
      event.preventDefault();
      activeControl.click();
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [role="button"]:not([aria-disabled="true"])'
      )
    ).filter(control => control.offsetParent !== null);
    if (controls.length === 0) return;
    const currentIndex = Math.max(0, controls.indexOf(activeControl));
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
        ? controls.length - 1
        : event.key === 'ArrowLeft'
        ? (currentIndex - 1 + controls.length) % controls.length
        : (currentIndex + 1) % controls.length;
    event.preventDefault();
    controls[nextIndex].focus();
  };

  if (displayedTab === 'file') {
    return (
      <DhyriumFluentThemeProvider>
        <KeyTipManager>
          <RibbonRuntimeProvider registry={homeCommandRegistry}>
            <div
              className="canvas-word-ribbon canvas-word-ribbon--backstage"
              data-writer-focus-surface="ribbon"
              tabIndex={-1}
              aria-label="Archivo del documento"
            >
              <CanvasWordBackstage
                document={document}
                documentTitle={documentTitle}
                isExporting={isExporting}
                isFullscreen={isFullscreen}
                isVersionsLoading={isVersionsLoading}
                saveStatus={saveStatus}
                showNavigationPane={showNavigationPane}
                showRuler={showRuler}
                sourceFile={sourceFile}
                taskId={taskId}
                taskKind={taskKind}
                versions={versions}
                wordCount={wordCount}
                zoom={zoom}
                onBackToDocument={() => setActiveTab('home')}
                onCreateDocument={onCreateDocument}
                onDownloadPdf={onDownloadPdf}
                onDownloadWord={onDownloadWord}
                onPrint={onPrint}
                onReload={onReload}
                onRestoreVersion={onRestoreVersion}
                onSave={onSave}
                onSaveAs={onSaveAs}
                onToggleFullscreen={onToggleFullscreen}
                onToggleNavigationPane={onToggleNavigationPane}
                onToggleRuler={onToggleRuler}
                onZoomChange={onZoomChange}
              />
            </div>
          </RibbonRuntimeProvider>
        </KeyTipManager>
      </DhyriumFluentThemeProvider>
    );
  }

  return (
    <DhyriumFluentThemeProvider>
      <KeyTipManager>
        <RibbonRuntimeProvider registry={homeCommandRegistry}>
          <div
            ref={ribbonRef}
            className="canvas-word-ribbon"
            data-ribbon-density={ribbonDensity}
            data-writer-focus-surface="ribbon"
            tabIndex={-1}
            aria-label="Cinta de opciones del documento"
            role="region"
          >
            <nav
              className="canvas-word-ribbon__tabs"
              aria-label="Pestañas del editor"
              role="tablist"
              onKeyDown={handleTabListKeyDown}
            >
              {tabs.map(tab => (
                <RibbonTabButton
                  key={tab.id}
                  active={displayedTab === tab.id}
                  keyTip={tab.keyTip}
                  label={tab.label}
                  onClick={() => setActiveTab(tab.id)}
                  tabId={tab.id}
                />
              ))}
              <button
                type="button"
                className="canvas-word-ribbon__collapse"
                title={isCollapsed ? 'Mostrar la cinta' : 'Minimizar la cinta'}
                aria-label={
                  isCollapsed ? 'Mostrar la cinta' : 'Minimizar la cinta'
                }
                aria-keyshortcuts="Control+F1"
                onClick={() => setIsCollapsed(value => !value)}
              >
                <FluentChevronDownIcon
                  aria-hidden="true"
                  className={isCollapsed ? '' : 'is-expanded'}
                />
              </button>
            </nav>

            {!isCollapsed && (
              <div
                id={`dhyrium-ribbon-panel-${displayedTab}`}
                className={`canvas-word-ribbon__panel is-${displayedTab}`}
                role="tabpanel"
                aria-labelledby={`dhyrium-ribbon-tab-${displayedTab}`}
                onKeyDown={handleRibbonPanelKeyDown}
              >
                {displayedTab === 'home' && (
                  <>
                    <RibbonGroup
                      id="home.clipboard"
                      mode={homeGroupMode('home.clipboard')}
                      collapse={['collapsed', 'overflow'].includes(
                        homeGroupMode('home.clipboard')
                      )}
                      icon={FluentPasteIcon}
                      label="Portapapeles"
                    >
                      <div className="canvas-word-ribbon__home-clipboard">
                        <RibbonButton
                          commandId="home.clipboard.paste"
                          large
                          icon={FluentPasteIcon}
                          label="Pegar"
                          title="Pegar"
                        />
                        <div className="canvas-word-ribbon__stack">
                          <RibbonButton
                            commandId="home.clipboard.cut"
                            icon={FluentCutIcon}
                            label="Cortar"
                            title="Cortar"
                          />
                          <RibbonButton
                            commandId="home.clipboard.copy"
                            icon={FluentCopyIcon}
                            label="Copiar"
                            title="Copiar"
                          />
                          <RibbonButton
                            commandId="home.clipboard.formatPainter"
                            icon={FluentFormatPainterIcon}
                            label="Copiar formato"
                            title="Copiar formato"
                          />
                        </div>
                      </div>
                    </RibbonGroup>

                    <RibbonGroup
                      id="home.font"
                      mode={homeGroupMode('home.font')}
                      collapse={['collapsed', 'overflow'].includes(
                        homeGroupMode('home.font')
                      )}
                      icon={FluentFontIcon}
                      label="Fuente"
                    >
                      <div className="canvas-word-ribbon__home-font">
                        <div className="canvas-word-ribbon__home-font-row is-top">
                          <FontPicker
                            disabled={
                              commandUiState('home.font.family').disabled
                            }
                            disabledReason={
                              commandUiState('home.font.family')[
                                'aria-description'
                              ]
                            }
                            value={rangeStyle.font ?? 'Aptos'}
                            onChange={font =>
                              void homeCommandRegistry.execute(
                                'home.font.family',
                                font
                              )
                            }
                          />
                          <select
                            {...commandUiState('home.font.size')}
                            aria-label="Tamaño de fuente"
                            data-command-id="home.font.size"
                            value={
                              sizeOptions.includes(fontSizePt) ? fontSizePt : 11
                            }
                            onChange={event =>
                              void homeCommandRegistry.execute(
                                'home.font.size',
                                Number(event.target.value)
                              )
                            }
                          >
                            {sizeOptions.map(size => (
                              <option key={size}>{size}</option>
                            ))}
                          </select>
                          <RibbonButton
                            commandId="home.font.grow"
                            icon={FluentFontSizeIncreaseIcon}
                            title="Aumentar tamaño de fuente"
                          />
                          <RibbonButton
                            commandId="home.font.shrink"
                            icon={FluentFontSizeDecreaseIcon}
                            title="Disminuir tamaño de fuente"
                          />
                          <RibbonPopover
                            commandId="home.font.changeCase"
                            icon={FluentChangeCaseIcon}
                            title="Cambiar mayúsculas y minúsculas"
                          >
                            <div className="canvas-word-ribbon__command-menu">
                              <header>Cambiar mayúsculas y minúsculas</header>
                              <button
                                type="button"
                                onMouseDown={event => event.preventDefault()}
                                onClick={() =>
                                  void homeCommandRegistry.execute(
                                    'home.font.changeCase',
                                    'sentence'
                                  )
                                }
                              >
                                Tipo oración
                              </button>
                              <button
                                type="button"
                                onMouseDown={event => event.preventDefault()}
                                onClick={() =>
                                  void homeCommandRegistry.execute(
                                    'home.font.changeCase',
                                    'lower'
                                  )
                                }
                              >
                                minúsculas
                              </button>
                              <button
                                type="button"
                                onMouseDown={event => event.preventDefault()}
                                onClick={() =>
                                  void homeCommandRegistry.execute(
                                    'home.font.changeCase',
                                    'upper'
                                  )
                                }
                              >
                                MAYÚSCULAS
                              </button>
                              <button
                                type="button"
                                onMouseDown={event => event.preventDefault()}
                                onClick={() =>
                                  void homeCommandRegistry.execute(
                                    'home.font.changeCase',
                                    'title'
                                  )
                                }
                              >
                                Poner En Mayúsculas Cada Palabra
                              </button>
                              <button
                                type="button"
                                onMouseDown={event => event.preventDefault()}
                                onClick={() =>
                                  void homeCommandRegistry.execute(
                                    'home.font.changeCase',
                                    'toggle'
                                  )
                                }
                              >
                                Alternar mayúsculas/minúsculas
                              </button>
                            </div>
                          </RibbonPopover>
                          <RibbonButton
                            commandId="home.font.clear"
                            icon={FluentClearFormattingIcon}
                            title="Borrar todo el formato"
                          />
                        </div>
                        <div className="canvas-word-ribbon__home-font-row is-bottom">
                          <RibbonButton
                            commandId="home.font.bold"
                            icon={FluentBoldIcon}
                            title="Negrita"
                          />
                          <RibbonButton
                            commandId="home.font.italic"
                            icon={FluentItalicIcon}
                            title="Cursiva"
                          />
                          <RibbonButton
                            commandId="home.font.underline"
                            icon={FluentUnderlineIcon}
                            title="Subrayado"
                          />
                          <RibbonButton
                            commandId="home.font.strike"
                            icon={FluentStrikethroughIcon}
                            title="Tachado"
                          />
                          <RibbonButton
                            commandId="home.font.subscript"
                            icon={FluentSubscriptIcon}
                            title="Subíndice"
                          />
                          <RibbonButton
                            commandId="home.font.superscript"
                            icon={FluentSuperscriptIcon}
                            title="Superíndice"
                          />
                          <OfficeColorPicker
                            commandId="home.font.color"
                            icon={FluentFontColorIcon}
                            title="Color de fuente"
                            value={rangeStyle.color ?? '#000000'}
                          />
                          <OfficeColorPicker
                            commandId="home.font.highlight"
                            icon={FluentHighlightIcon}
                            title="Color de resaltado de texto"
                            value={rangeStyle.highlight ?? '#fff2a8'}
                            allowNone
                          />
                        </div>
                      </div>
                    </RibbonGroup>

                    <RibbonGroup
                      id="home.paragraph"
                      mode={homeGroupMode('home.paragraph')}
                      collapse={['collapsed', 'overflow'].includes(
                        homeGroupMode('home.paragraph')
                      )}
                      icon={FluentParagraphIcon}
                      label="Párrafo"
                    >
                      <div className="canvas-word-ribbon__paragraph-grid">
                        <RibbonPopover
                          commandId="home.paragraph.bullets"
                          icon={FluentBulletListIcon}
                          title="Viñetas"
                        >
                          <div className="canvas-word-ribbon__list-gallery">
                            <header>Biblioteca de viñetas</header>
                            <button
                              type="button"
                              onMouseDown={event => event.preventDefault()}
                              onClick={() =>
                                void homeCommandRegistry.execute(
                                  'home.paragraph.bullets',
                                  ''
                                )
                              }
                            >
                              Ninguna
                            </button>
                            <button
                              type="button"
                              onMouseDown={event => event.preventDefault()}
                              onClick={() =>
                                void homeCommandRegistry.execute(
                                  'home.paragraph.bullets',
                                  ListStyle.DISC
                                )
                              }
                            >
                              Disco
                            </button>
                            <button
                              type="button"
                              onMouseDown={event => event.preventDefault()}
                              onClick={() =>
                                void homeCommandRegistry.execute(
                                  'home.paragraph.bullets',
                                  ListStyle.CIRCLE
                                )
                              }
                            >
                              Círculo
                            </button>
                            <button
                              type="button"
                              onMouseDown={event => event.preventDefault()}
                              onClick={() =>
                                void homeCommandRegistry.execute(
                                  'home.paragraph.bullets',
                                  ListStyle.SQUARE
                                )
                              }
                            >
                              Cuadrado
                            </button>
                          </div>
                        </RibbonPopover>
                        <RibbonPopover
                          commandId="home.paragraph.numbering"
                          icon={FluentNumberListIcon}
                          title="Numeración"
                        >
                          <div className="canvas-word-ribbon__list-gallery">
                            <header>Biblioteca de numeración</header>
                            <button
                              type="button"
                              onMouseDown={event => event.preventDefault()}
                              onClick={() =>
                                void homeCommandRegistry.execute(
                                  'home.paragraph.numbering',
                                  ''
                                )
                              }
                            >
                              Ninguna
                            </button>
                            <button
                              type="button"
                              onMouseDown={event => event.preventDefault()}
                              onClick={() =>
                                void homeCommandRegistry.execute(
                                  'home.paragraph.numbering',
                                  ListStyle.DECIMAL
                                )
                              }
                            >
                              1.
                              <br />
                              2.
                              <br />
                              3.
                            </button>
                          </div>
                        </RibbonPopover>
                        <RibbonPopover
                          commandId="home.paragraph.multilevel"
                          icon={FluentMultilevelListIcon}
                          title="Lista multinivel"
                        >
                          <div className="canvas-word-ribbon__command-menu">
                            <header>Lista multinivel</header>
                            <button
                              type="button"
                              onMouseDown={event => event.preventDefault()}
                              onClick={() =>
                                void homeCommandRegistry.execute(
                                  'home.paragraph.multilevel',
                                  'unordered'
                                )
                              }
                            >
                              Lista multinivel con viñetas
                            </button>
                            <button
                              type="button"
                              onMouseDown={event => event.preventDefault()}
                              onClick={() =>
                                void homeCommandRegistry.execute(
                                  'home.paragraph.multilevel',
                                  'ordered'
                                )
                              }
                            >
                              Lista multinivel numerada
                            </button>
                          </div>
                        </RibbonPopover>
                        <RibbonButton
                          commandId="home.paragraph.outdent"
                          icon={FluentIndentDecreaseIcon}
                          title="Disminuir nivel de lista"
                        />
                        <RibbonButton
                          commandId="home.paragraph.indent"
                          icon={FluentIndentIncreaseIcon}
                          title="Aumentar nivel de lista"
                        />
                        <RibbonButton
                          commandId="home.paragraph.sort"
                          icon={FluentSortIcon}
                          title="Ordenar"
                        />
                        <RibbonButton
                          commandId="home.paragraph.marks"
                          icon={FluentParagraphIcon}
                          title="Mostrar todo"
                        />
                        <RibbonButton
                          commandId="home.paragraph.alignLeft"
                          icon={FluentAlignLeftIcon}
                          title="Alinear a la izquierda"
                        />
                        <RibbonButton
                          commandId="home.paragraph.alignCenter"
                          icon={FluentAlignCenterIcon}
                          title="Centrar"
                        />
                        <RibbonButton
                          commandId="home.paragraph.alignRight"
                          icon={FluentAlignRightIcon}
                          title="Alinear a la derecha"
                        />
                        <RibbonButton
                          commandId="home.paragraph.justify"
                          icon={FluentAlignJustifyIcon}
                          title="Justificar"
                        />
                        <RibbonPopover
                          commandId="home.paragraph.spacing"
                          icon={FluentLineSpacingIcon}
                          title="Espaciado entre líneas y párrafos"
                        >
                          <div className="canvas-word-ribbon__command-menu is-compact">
                            <header>Interlineado</header>
                            {[1, 1.15, 1.5, 2, 2.5, 3].map(value => (
                              <button
                                key={value}
                                type="button"
                                className={
                                  rangeStyle.rowMargin === value
                                    ? 'is-active'
                                    : ''
                                }
                                onMouseDown={event => event.preventDefault()}
                                onClick={() =>
                                  void homeCommandRegistry.execute(
                                    'home.paragraph.spacing',
                                    value
                                  )
                                }
                              >
                                {String(value).replace('.', ',')}
                              </button>
                            ))}
                          </div>
                        </RibbonPopover>
                        <OfficeColorPicker
                          commandId="home.paragraph.shading"
                          icon={FluentShadingIcon}
                          title="Sombreado"
                          value={rangeStyle.highlight ?? '#ffffff'}
                          allowNone
                        />
                        <RibbonButton
                          commandId="home.paragraph.borders"
                          icon={FluentBorderAllIcon}
                          title="Bordes"
                        />
                      </div>
                    </RibbonGroup>

                    <RibbonGroup
                      id="home.styles"
                      mode={homeGroupMode('home.styles')}
                      collapse={['collapsed', 'overflow'].includes(
                        homeGroupMode('home.styles')
                      )}
                      icon={FluentStylesIcon}
                      label="Estilos"
                    >
                      <div className="canvas-word-ribbon__styles">
                        {canvasStylePresets.map(preset => (
                          <button
                            key={preset.id}
                            type="button"
                            data-command-id="home.styles.gallery"
                            className={
                              rangeStyle.level === preset.level &&
                              (preset.level || preset.id === 'normal')
                                ? 'is-active'
                                : ''
                            }
                            title={`Aplicar estilo ${preset.label}`}
                            aria-label={`Aplicar estilo ${preset.label}`}
                            aria-description={
                              commandUiState('home.styles.gallery')[
                                'aria-description'
                              ]
                            }
                            disabled={
                              commandUiState('home.styles.gallery').disabled
                            }
                            onMouseDown={event => event.preventDefault()}
                            onClick={() =>
                              void homeCommandRegistry.execute(
                                'home.styles.gallery',
                                preset.id
                              )
                            }
                          >
                            <b className={preset.className}>{preset.preview}</b>
                            <span>{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </RibbonGroup>

                    <RibbonGroup
                      id="home.editing"
                      mode={homeGroupMode('home.editing')}
                      collapse={['collapsed', 'overflow'].includes(
                        homeGroupMode('home.editing')
                      )}
                      icon={FluentSearchIcon}
                      label="Edición"
                    >
                      <div className="canvas-word-ribbon__editing">
                        {editingMode ? (
                          <div className="canvas-word-ribbon__editing-form">
                            <label>
                              <FluentSearchIcon aria-hidden="true" />
                              <input
                                autoFocus
                                value={searchText}
                                placeholder="Buscar"
                                onChange={event =>
                                  setSearchText(event.target.value)
                                }
                                onKeyDown={event =>
                                  event.key === 'Enter' &&
                                  void homeCommandRegistry.execute(
                                    'home.editing.search.next',
                                    searchText
                                  )
                                }
                              />
                            </label>
                            {editingMode === 'replace' && (
                              <input
                                value={replaceText}
                                placeholder="Reemplazar con"
                                onChange={event =>
                                  setReplaceText(event.target.value)
                                }
                              />
                            )}
                            <div>
                              <button
                                type="button"
                                disabled={!searchText.trim()}
                                onClick={() =>
                                  void homeCommandRegistry.execute(
                                    'home.editing.search.next',
                                    searchText
                                  )
                                }
                              >
                                Buscar
                              </button>
                              {editingMode === 'replace' && (
                                <button
                                  type="button"
                                  disabled={!searchText.trim()}
                                  onClick={() =>
                                    void homeCommandRegistry.execute(
                                      'home.editing.replace.current',
                                      [searchText, replaceText]
                                    )
                                  }
                                >
                                  Reemplazar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  void homeCommandRegistry.execute(
                                    'home.editing.close'
                                  )
                                }
                              >
                                Cerrar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="canvas-word-ribbon__editing-actions">
                            <button
                              type="button"
                              data-command-id="home.editing.find"
                              {...commandUiState('home.editing.find')}
                              onClick={() =>
                                void homeCommandRegistry.execute(
                                  'home.editing.find'
                                )
                              }
                            >
                              <FluentSearchIcon aria-hidden="true" />{' '}
                              <span>Buscar</span>
                              <FluentChevronDownIcon aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              data-command-id="home.editing.replace"
                              {...commandUiState('home.editing.replace')}
                              onClick={() =>
                                void homeCommandRegistry.execute(
                                  'home.editing.replace'
                                )
                              }
                            >
                              <FluentSearchIcon aria-hidden="true" />{' '}
                              <span>Reemplazar</span>
                            </button>
                            <button
                              type="button"
                              data-command-id="home.editing.select"
                              {...commandUiState('home.editing.select')}
                              onClick={() =>
                                void homeCommandRegistry.execute(
                                  'home.editing.select'
                                )
                              }
                            >
                              <FluentSelectAllIcon aria-hidden="true" />{' '}
                              <span>Seleccionar</span>
                              <FluentChevronDownIcon aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </div>
                    </RibbonGroup>
                    <RibbonOverflow
                      groups={homeOverflowGroups}
                      styleItems={canvasStylePresets.map(preset => ({
                        id: preset.id,
                        label: preset.label,
                      }))}
                    />
                  </>
                )}

                {displayedTab === 'insert' && (
                  <>
                    <RibbonGroup
                      collapse={ribbonDensity !== 'expanded'}
                      icon={FileType2}
                      label="Páginas"
                    >
                      <RibbonButton
                        large
                        icon={FileType2}
                        label="Portada"
                        title="Insertar portada"
                        onClick={insertCoverPage}
                      />
                      <RibbonButton
                        large
                        icon={FilePlus2}
                        label="Página en blanco"
                        title="Insertar página en blanco"
                        onClick={insertBlankPage}
                      />
                      <RibbonButton
                        large
                        icon={FileText}
                        label="Salto de página"
                        title="Insertar salto de página"
                        onClick={() => command?.executePageBreak()}
                      />
                    </RibbonGroup>
                    <RibbonGroup
                      collapse={ribbonDensity !== 'expanded'}
                      icon={Table2}
                      label="Tablas"
                    >
                      <RibbonPopover
                        icon={Table2}
                        label="Tabla"
                        large
                        panelClassName="is-table-picker"
                        title="Insertar tabla"
                        description="Elija el nÃºmero de filas y columnas antes de insertarla."
                      >
                        <TableGridPicker
                          onSelect={(rows, columns) =>
                            command?.executeInsertTable(rows, columns)
                          }
                        />
                      </RibbonPopover>
                    </RibbonGroup>
                    <RibbonGroup
                      collapse={ribbonDensity !== 'expanded'}
                      icon={ImagePlus}
                      label="Ilustraciones"
                    >
                      <RibbonButton
                        large
                        icon={ImagePlus}
                        label="Imágenes"
                        title="Insertar imagen"
                        onClick={onInsertImage}
                      />
                      <RibbonButton
                        large
                        icon={Shapes}
                        label="Formas"
                        title="Insertar forma vectorial local"
                        onClick={() => insertLocalIllustration('shape')}
                      />
                      <RibbonButton
                        large
                        icon={BookMarked}
                        label="Iconos"
                        title="Insertar icono vectorial local"
                        onClick={() => insertLocalIllustration('icon')}
                      />
                      <RibbonButton
                        large
                        icon={Cuboid}
                        label="Modelos 3D"
                        title="Insertar modelo isométrico local"
                        onClick={() => insertLocalIllustration('model')}
                      />
                      <RibbonButton
                        large
                        icon={WandSparkles}
                        label="SmartArt"
                        title="Insertar diagrama SmartArt local"
                        onClick={() => insertLocalIllustration('smartart')}
                      />
                      <RibbonButton
                        large
                        icon={ChartColumnBig}
                        label="Gráfico"
                        title="Insertar gráfico local"
                        onClick={() => insertLocalIllustration('chart')}
                      />
                      <RibbonButton
                        large
                        icon={Camera}
                        label="Captura"
                        title="Insertar captura de pantalla"
                        onClick={() => void insertScreenshot()}
                      />
                    </RibbonGroup>
                    <RibbonGroup
                      collapse={ribbonDensity !== 'expanded'}
                      icon={Box}
                      label="Complementos"
                    >
                      <RibbonButton
                        large
                        icon={Box}
                        label="Plantilla"
                        title="Insertar plantilla técnica local"
                        onClick={insertLocalTemplate}
                      />
                      <RibbonButton
                        large
                        icon={Library}
                        label="Biblioteca"
                        title="Insertar contenido de la biblioteca local de Dhyrium"
                        onClick={insertLocalTemplate}
                      />
                    </RibbonGroup>
                    <RibbonGroup
                      collapse={ribbonDensity !== 'expanded'}
                      icon={Video}
                      label="Multimedia"
                    >
                      <RibbonButton
                        large
                        icon={Video}
                        label="Video local"
                        title="Insertar video desde esta computadora"
                        onClick={onInsertVideo}
                      />
                    </RibbonGroup>
                    <RibbonGroup
                      collapse={ribbonDensity !== 'expanded'}
                      icon={Link2}
                      label="Vínculos"
                    >
                      <RibbonButton
                        large
                        icon={Link2}
                        label="Vínculo"
                        title="Insertar hipervínculo"
                        onClick={insertHyperlink}
                      />
                      <RibbonButton
                        large
                        icon={Bookmark}
                        label="Marcador"
                        title="Crear marcador con el texto seleccionado"
                        onClick={insertBookmark}
                      />
                      <RibbonButton
                        large
                        icon={BookOpen}
                        label="Referencia"
                        title="Insertar referencia al primer título"
                        onClick={() => void insertCrossReference()}
                      />
                    </RibbonGroup>
                    <RibbonGroup
                      collapse={ribbonDensity !== 'expanded'}
                      icon={MessageSquarePlus}
                      label="Comentarios"
                    >
                      <RibbonButton
                        large
                        icon={MessageSquarePlus}
                        label="Comentario"
                        title="Marcar selección para comentario"
                        onClick={insertCommentMark}
                      />
                    </RibbonGroup>
                    <RibbonGroup
                      collapse={ribbonDensity !== 'expanded'}
                      icon={PanelTop}
                      label="Encabezado y pie de página"
                    >
                      <RibbonButton
                        large
                        icon={PanelTop}
                        label="Encabezado"
                        title="Editar encabezado"
                        onClick={() =>
                          command?.executeSetZone(EditorZone.HEADER)
                        }
                      />
                      <RibbonButton
                        large
                        icon={PanelBottom}
                        label="Pie de página"
                        title="Editar pie de página"
                        onClick={() =>
                          command?.executeSetZone(EditorZone.FOOTER)
                        }
                      />
                      <RibbonButton
                        large
                        icon={Hash}
                        label="Número de página"
                        title="Activar números de página"
                        onClick={enablePageNumbers}
                      />
                    </RibbonGroup>
                    <RibbonGroup collapse icon={TextCursorInput} label="Texto">
                      <RibbonButton
                        large
                        icon={TextCursorInput}
                        label="Cuadro de texto"
                        title="Insertar cuadro de texto"
                        onClick={insertTextBox}
                      />
                      <RibbonButton
                        large
                        icon={Box}
                        label="Elementos rápidos"
                        title="Insertar datos rápidos del proyecto"
                        onClick={insertQuickPart}
                      />
                      <RibbonButton
                        large
                        icon={TypeOutline}
                        label="Texto artístico"
                        title="Insertar texto artístico"
                        onClick={insertWordArt}
                      />
                      <RibbonButton
                        large
                        icon={Heading1}
                        label="Letra capital"
                        title="Aplicar letra capital"
                        onClick={() =>
                          command?.getRangeText()
                            ? command.executeSize(48)
                            : command?.executeInsertElementList(
                                styledText('A', { bold: true, size: 48 })
                              )
                        }
                      />
                      <RibbonButton
                        large
                        icon={FileSignature}
                        label="Línea de firma"
                        title="Insertar línea de firma"
                        onClick={insertSignatureLine}
                      />
                      <RibbonButton
                        large
                        icon={CalendarClock}
                        label="Fecha y hora"
                        title="Insertar fecha y hora local"
                        onClick={insertDateTime}
                      />
                      <RibbonButton
                        large
                        icon={FileInput}
                        label="Objeto"
                        title="Insertar referencia a un objeto local"
                        onClick={insertObjectMarker}
                      />
                    </RibbonGroup>
                    <RibbonGroup
                      collapse={ribbonDensity !== 'expanded'}
                      icon={Sigma}
                      label="Símbolos"
                    >
                      <RibbonButton
                        large
                        icon={Sigma}
                        label="Ecuación"
                        title="Insertar ecuación"
                        onClick={insertEquation}
                      />
                      <RibbonButton
                        large
                        icon={TypeOutline}
                        label="Símbolo"
                        title="Insertar símbolo"
                        onClick={insertSymbol}
                      />
                    </RibbonGroup>
                  </>
                )}

                {displayedTab === 'design' && (
                  <>
                    <RibbonGroup label="Formato del documento">
                      <div className="canvas-word-ribbon__theme-gallery">
                        <button
                          type="button"
                          onClick={() => command?.executeFont('Aptos')}
                        >
                          <b>Aa</b>
                          <span>Moderno</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => command?.executeFont('Calibri')}
                        >
                          <b>Aa</b>
                          <span>Clásico</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => command?.executeFont('Georgia')}
                        >
                          <b>Aa</b>
                          <span>Elegante</span>
                        </button>
                      </div>
                    </RibbonGroup>
                    <RibbonGroup label="Fondo de página">
                      <RibbonButton
                        large
                        icon={Baseline}
                        label="Marca de agua"
                        title="Agregar marca de agua"
                        onClick={addWatermark}
                      />
                      <label className="canvas-word-ribbon__large-color">
                        <Highlighter />
                        <span>Color de página</span>
                        <input
                          type="color"
                          defaultValue="#ffffff"
                          onChange={event =>
                            command?.executeUpdateOptions({
                              background: { color: event.target.value },
                            })
                          }
                        />
                      </label>
                      <RibbonButton
                        large
                        icon={Eraser}
                        label="Quitar marca"
                        title="Quitar marca de agua"
                        onClick={() => command?.executeDeleteWatermark()}
                      />
                    </RibbonGroup>
                  </>
                )}

                {displayedTab === 'layout' && (
                  <>
                    <RibbonGroup label="Configurar página">
                      <RibbonButton
                        large
                        icon={FileText}
                        label="A4"
                        title="Tamaño A4"
                        onClick={() => command?.executePaperSize(794, 1123)}
                      />
                      <RibbonButton
                        large
                        icon={FileText}
                        label="Carta"
                        title="Tamaño Carta"
                        onClick={() => command?.executePaperSize(816, 1056)}
                      />
                      <RibbonButton
                        large
                        icon={LayoutPanelTop}
                        label="Vertical"
                        title="Orientación vertical"
                        onClick={() =>
                          command?.executePaperDirection(
                            PaperDirection.VERTICAL
                          )
                        }
                      />
                      <RibbonButton
                        large
                        icon={LayoutPanelTop}
                        label="Horizontal"
                        title="Orientación horizontal"
                        onClick={() =>
                          command?.executePaperDirection(
                            PaperDirection.HORIZONTAL
                          )
                        }
                      />
                      <RibbonButton
                        large
                        icon={Columns3}
                        label="1 columna"
                        title="Una columna"
                        onClick={() => command?.executeSetColumns({ count: 1 })}
                      />
                      <RibbonButton
                        large
                        icon={Columns3}
                        label="2 columnas"
                        title="Dos columnas"
                        onClick={() =>
                          command?.executeSetColumns({ count: 2, gap: 24 })
                        }
                      />
                    </RibbonGroup>
                    <RibbonGroup label="Márgenes">
                      <button
                        type="button"
                        className="canvas-word-ribbon__preset"
                        onClick={() =>
                          command?.executeSetPaperMargin([96, 96, 96, 96])
                        }
                      >
                        <strong>Normal</strong>
                        <span>2,54 cm</span>
                      </button>
                      <button
                        type="button"
                        className="canvas-word-ribbon__preset"
                        onClick={() =>
                          command?.executeSetPaperMargin([48, 48, 48, 48])
                        }
                      >
                        <strong>Estrecho</strong>
                        <span>1,27 cm</span>
                      </button>
                      <button
                        type="button"
                        className="canvas-word-ribbon__preset"
                        onClick={() =>
                          command?.executeSetPaperMargin([96, 48, 96, 48])
                        }
                      >
                        <strong>Moderado</strong>
                        <span>Vertical 2,54 cm</span>
                      </button>
                    </RibbonGroup>
                  </>
                )}

                {displayedTab === 'references' && (
                  <>
                    <RibbonGroup label="Tabla de contenido">
                      <RibbonButton
                        large
                        icon={ListTree}
                        label="Navegación"
                        title="Mostrar tabla de contenido"
                        active={showNavigationPane}
                        onClick={onToggleNavigationPane}
                      />
                      <RibbonButton
                        large
                        icon={Heading1}
                        label="Título 1"
                        title="Marcar como Título 1"
                        onClick={() => command?.executeTitle(TitleLevel.FIRST)}
                      />
                      <RibbonButton
                        large
                        icon={Heading1}
                        label="Título 2"
                        title="Marcar como Título 2"
                        onClick={() => command?.executeTitle(TitleLevel.SECOND)}
                      />
                    </RibbonGroup>
                    <RibbonGroup label="Notas y citas">
                      <div className="canvas-word-ribbon__info-card">
                        <strong>Referencias del documento</strong>
                        <span>
                          Use los estilos de título para construir
                          automáticamente el panel de navegación.
                        </span>
                      </div>
                    </RibbonGroup>
                  </>
                )}

                {displayedTab === 'review' && (
                  <>
                    <RibbonGroup label="Revisión">
                      <div
                        className="canvas-word-ribbon__info-card"
                        role="status"
                        aria-label={`${wordCount} palabras en el documento`}
                      >
                        <strong>{wordCount} palabras</strong>
                        <span>
                          El conteo se actualiza con el contenido del documento.
                        </span>
                      </div>
                      <RibbonButton
                        large
                        icon={Search}
                        label="Buscar"
                        title="Buscar en el documento"
                        onClick={() => setActiveTab('home')}
                      />
                    </RibbonGroup>
                    <RibbonGroup label="Seguimiento">
                      <RibbonButton
                        large
                        icon={Pilcrow}
                        label="Control de cambios"
                        title="Activar o desactivar control de cambios"
                        active={traceEnabled}
                        onClick={() => {
                          const next = !traceEnabled;
                          setTraceEnabled(next);
                          command?.executeToggleTrace(next);
                        }}
                      />
                    </RibbonGroup>
                  </>
                )}

                {displayedTab === 'view' && (
                  <>
                    <RibbonGroup label="Vistas">
                      <RibbonButton
                        large
                        icon={FileText}
                        label="Impresión"
                        title="Diseño de impresión"
                        onClick={() =>
                          command?.executePageMode(PageMode.PAGING)
                        }
                      />
                      <RibbonButton
                        large
                        icon={BookOpenText}
                        label="Web"
                        title="Diseño web continuo"
                        onClick={() =>
                          command?.executePageMode(PageMode.CONTINUITY)
                        }
                      />
                    </RibbonGroup>
                    <RibbonGroup label="Mostrar">
                      <RibbonButton
                        large
                        icon={Ruler}
                        label="Regla"
                        title="Mostrar u ocultar la regla"
                        active={showRuler}
                        onClick={onToggleRuler}
                      />
                      <RibbonButton
                        large
                        icon={PanelLeft}
                        label="Navegación"
                        title="Mostrar panel de navegación"
                        active={showNavigationPane}
                        onClick={onToggleNavigationPane}
                      />
                    </RibbonGroup>
                    <RibbonGroup label="Zoom">
                      <RibbonButton
                        icon={ZoomOut}
                        title="Alejar"
                        onClick={() => onZoomChange(Math.max(50, zoom - 10))}
                      />
                      <button
                        type="button"
                        className="canvas-word-ribbon__zoom"
                        onClick={() => onZoomChange(100)}
                      >
                        {zoom}%
                      </button>
                      <RibbonButton
                        icon={ZoomIn}
                        title="Acercar"
                        onClick={() => onZoomChange(Math.min(200, zoom + 10))}
                      />
                      <RibbonButton
                        large
                        icon={isFullscreen ? Minimize2 : Maximize2}
                        label={isFullscreen ? 'Restaurar' : 'Pantalla completa'}
                        title={
                          isFullscreen ? 'Restaurar vista' : 'Pantalla completa'
                        }
                        onClick={onToggleFullscreen}
                      />
                    </RibbonGroup>
                  </>
                )}

                {displayedTab === 'table' && (
                  <>
                    <RibbonGroup label="Filas y columnas">
                      <RibbonButton
                        large
                        icon={Table2}
                        label="Fila arriba"
                        title="Insertar fila arriba"
                        onClick={() => command?.executeInsertTableTopRow()}
                      />
                      <RibbonButton
                        large
                        icon={Table2}
                        label="Fila abajo"
                        title="Insertar fila abajo"
                        onClick={() => command?.executeInsertTableBottomRow()}
                      />
                      <RibbonButton
                        large
                        icon={Columns3}
                        label="Columna izq."
                        title="Insertar columna a la izquierda"
                        onClick={() => command?.executeInsertTableLeftCol()}
                      />
                      <RibbonButton
                        large
                        icon={Columns3}
                        label="Columna der."
                        title="Insertar columna a la derecha"
                        onClick={() => command?.executeInsertTableRightCol()}
                      />
                    </RibbonGroup>
                    <RibbonGroup label="Combinar">
                      <RibbonButton
                        large
                        icon={Grid3X3}
                        label="Combinar"
                        title="Combinar celdas"
                        onClick={() => command?.executeMergeTableCell()}
                      />
                      <RibbonButton
                        large
                        icon={Grid3X3}
                        label="Dividir"
                        title="Dividir celdas"
                        onClick={() => command?.executeCancelMergeTableCell()}
                      />
                    </RibbonGroup>
                    <RibbonGroup label="Tamaño">
                      <RibbonButton
                        large
                        icon={Grid3X3}
                        label="Autoajustar"
                        title="Autoajustar a la página"
                        onClick={() => command?.executeTableAutoFitToPage()}
                      />
                    </RibbonGroup>
                  </>
                )}

                {displayedTab === 'image' && selectedImage && (
                  <>
                    <RibbonGroup label="Cambiar imagen">
                      <RibbonButton
                        large
                        icon={ImagePlus}
                        label="Reemplazar"
                        title="Reemplazar la imagen seleccionada"
                        onClick={onReplaceImage}
                      />
                      <RibbonButton
                        large
                        icon={FileInput}
                        label="Guardar imagen"
                        title="Descargar la imagen seleccionada"
                        onClick={() => command?.executeSaveAsImageElement()}
                      />
                    </RibbonGroup>
                    <RibbonGroup label="Organizar texto">
                      <RibbonButton
                        large
                        icon={LayoutPanelTop}
                        label="En línea"
                        title="Colocar la imagen en línea con el texto"
                        active={
                          selectedImage.imgDisplay === ImageDisplay.INLINE ||
                          !selectedImage.imgDisplay
                        }
                        onClick={() =>
                          command?.executeChangeImageDisplay(
                            selectedImage,
                            ImageDisplay.INLINE
                          )
                        }
                      />
                      <RibbonButton
                        large
                        icon={PanelTop}
                        label="En bloque"
                        title="Colocar la imagen en un bloque independiente"
                        active={selectedImage.imgDisplay === ImageDisplay.BLOCK}
                        onClick={() =>
                          command?.executeChangeImageDisplay(
                            selectedImage,
                            ImageDisplay.BLOCK
                          )
                        }
                      />
                      <RibbonButton
                        large
                        icon={Columns3}
                        label="Ajustar texto"
                        title="Permitir que el texto rodee la imagen"
                        active={
                          selectedImage.imgDisplay === ImageDisplay.SURROUND
                        }
                        onClick={() =>
                          command?.executeChangeImageDisplay(
                            selectedImage,
                            ImageDisplay.SURROUND
                          )
                        }
                      />
                    </RibbonGroup>
                    <RibbonGroup label="Descripción">
                      <RibbonButton
                        large
                        icon={TextCursorInput}
                        label="Título"
                        title="Agregar o editar la descripción de la imagen"
                        onClick={() => {
                          const caption = window.prompt(
                            'Descripción de la imagen',
                            selectedImage.imgCaption?.value ?? ''
                          );
                          if (caption !== null)
                            command?.executeSetImageCaption({ value: caption });
                        }}
                      />
                    </RibbonGroup>
                  </>
                )}

                {displayedTab === 'header-footer' && (
                  <>
                    <RibbonGroup label="Encabezado y pie de página">
                      <RibbonButton
                        large
                        icon={PanelTop}
                        label="Encabezado"
                        title="Editar el encabezado"
                        active={editorZone === EditorZone.HEADER}
                        onClick={() =>
                          command?.executeSetZone(EditorZone.HEADER)
                        }
                      />
                      <RibbonButton
                        large
                        icon={PanelBottom}
                        label="Pie de página"
                        title="Editar el pie de página"
                        active={editorZone === EditorZone.FOOTER}
                        onClick={() =>
                          command?.executeSetZone(EditorZone.FOOTER)
                        }
                      />
                      <RibbonButton
                        large
                        icon={Hash}
                        label="Número de página"
                        title="Activar números de página"
                        onClick={enablePageNumbers}
                      />
                    </RibbonGroup>
                    <RibbonGroup label="Contenido">
                      <RibbonButton
                        large
                        icon={ImagePlus}
                        label="Imagen"
                        title="Insertar una imagen en esta zona"
                        onClick={onInsertImage}
                      />
                      <RibbonButton
                        large
                        icon={TextCursorInput}
                        label="Volver al cuerpo"
                        title="Cerrar encabezado y pie de página"
                        onClick={() => command?.executeSetZone(EditorZone.MAIN)}
                      />
                    </RibbonGroup>
                  </>
                )}

                {displayedTab === 'help' && (
                  <RibbonGroup label="Ayuda de Dhyrium">
                    <div className="canvas-word-ribbon__help">
                      <strong>Editor de documentos Dhyrium</strong>
                      <span>
                        Atajos: Ctrl+B negrita · Ctrl+I cursiva · Ctrl+U
                        subrayado · Ctrl+Z deshacer · Ctrl+P imprimir.
                      </span>
                      <span>
                        El documento se guarda automáticamente y también puede
                        crear versiones con Guardar.
                      </span>
                    </div>
                  </RibbonGroup>
                )}
              </div>
            )}
          </div>
        </RibbonRuntimeProvider>
      </KeyTipManager>
    </DhyriumFluentThemeProvider>
  );
};

export default CanvasWordRibbon;

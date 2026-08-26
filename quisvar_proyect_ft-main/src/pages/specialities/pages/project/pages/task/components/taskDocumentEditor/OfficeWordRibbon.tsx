import { useId, useState, type ReactNode } from 'react';
import {
  ArrowDown20Regular,
  ArrowRepeatAll20Regular,
  ArrowSort20Regular,
  ArrowUp20Regular,
  BookOpen24Regular,
  BorderAll20Regular,
  ChatHelp24Regular,
  ChevronDown12Regular,
  ClipboardPaste24Regular,
  ColorBackground20Regular,
  Copy20Regular,
  Cut20Regular,
  DesignIdeas24Regular,
  Document24Regular,
  DocumentAdd24Regular,
  DocumentPageBreak24Regular,
  DrawShape24Regular,
  Eye24Regular,
  Highlight20Regular,
  Mail24Regular,
  PaintBrush20Regular,
  Search20Regular,
  SelectAllOn20Regular,
  TextAlignCenter20Regular,
  TextAlignJustify20Regular,
  TextAlignLeft20Regular,
  TextAlignRight20Regular,
  TextBold20Regular,
  TextBulletList20Regular,
  TextBulletListTree20Regular,
  TextChangeCase20Regular,
  TextClearFormatting20Regular,
  TextColor20Regular,
  TextEditStyle20Regular,
  TextEffects20Regular,
  TextFont20Regular,
  TextFontSize20Regular,
  TextIndentDecreaseLtr20Regular,
  TextIndentIncreaseLtr20Regular,
  TextItalic20Regular,
  TextLineSpacing20Regular,
  TextNumberListLtr20Regular,
  TextParagraph20Regular,
  TextProofingTools24Regular,
  TextStrikethrough20Regular,
  TextSubscript20Regular,
  TextSuperscript20Regular,
  TextUnderline20Regular,
  type FluentIcon,
} from '@fluentui/react-icons';

import { writerRibbonSchema } from './ribbon/RibbonSchema';

interface OfficeWordRibbonProps {
  hasDocument: boolean;
  statusLabel: string;
}

interface OfficeRibbonGroup {
  label: string;
  controls: string[];
}

interface RibbonCommandProps {
  accent?: 'font' | 'highlight';
  className?: string;
  icon: FluentIcon;
  label: string;
  large?: boolean;
  reasonId: string;
  showLabel?: boolean;
  split?: boolean;
  title: string;
}

interface RibbonValueControlProps {
  icon: FluentIcon;
  label: string;
  reasonId: string;
  title: string;
  value: string;
  wide?: boolean;
}

interface RibbonGroupProps {
  children: ReactNode;
  className: string;
  label: string;
}

const OFFICE_GROUPS: Record<string, OfficeRibbonGroup[]> = {
  file: [
    { label: 'Archivo', controls: ['Información', 'Guardar como', 'Imprimir'] },
    { label: 'Exportar', controls: ['Documento Word', 'Documento PDF'] },
  ],
  insert: [
    { label: 'Páginas', controls: ['Portada', 'Página', 'Salto'] },
    { label: 'Tablas', controls: ['Tabla'] },
    { label: 'Ilustraciones', controls: ['Imágenes', 'Formas', 'Gráfico'] },
    { label: 'Texto', controls: ['Cuadro de texto', 'WordArt', 'Símbolo'] },
  ],
  draw: [
    { label: 'Herramientas', controls: ['Seleccionar', 'Borrador'] },
    { label: 'Lápices', controls: ['Lápiz', 'Resaltador', 'Color'] },
  ],
  design: [
    {
      label: 'Formato del documento',
      controls: ['Temas', 'Colores', 'Fuentes'],
    },
    {
      label: 'Fondo de página',
      controls: ['Marca de agua', 'Color', 'Bordes'],
    },
  ],
  layout: [
    {
      label: 'Configurar página',
      controls: ['Márgenes', 'Orientación', 'Tamaño'],
    },
    { label: 'Párrafo', controls: ['Sangría', 'Espaciado'] },
    { label: 'Organizar', controls: ['Posición', 'Ajustar texto'] },
  ],
  references: [
    {
      label: 'Tabla de contenido',
      controls: ['Tabla', 'Agregar texto', 'Actualizar'],
    },
    { label: 'Notas al pie', controls: ['Insertar nota', 'Siguiente nota'] },
    { label: 'Citas', controls: ['Insertar cita', 'Bibliografía'] },
  ],
  mailings: [
    { label: 'Crear', controls: ['Sobres', 'Etiquetas'] },
    {
      label: 'Combinar correspondencia',
      controls: ['Iniciar', 'Destinatarios', 'Finalizar'],
    },
  ],
  review: [
    { label: 'Revisión', controls: ['Ortografía', 'Idioma', 'Comentarios'] },
    {
      label: 'Seguimiento',
      controls: ['Control de cambios', 'Aceptar', 'Rechazar'],
    },
  ],
  view: [
    { label: 'Vistas', controls: ['Impresión', 'Web', 'Esquema'] },
    { label: 'Mostrar', controls: ['Regla', 'Navegación'] },
    { label: 'Zoom', controls: ['100 %', 'Una página', 'Varias páginas'] },
  ],
  help: [
    {
      label: 'Ayuda',
      controls: ['Ayuda de Word', 'Aprendizaje', 'Comentarios'],
    },
  ],
};

const GENERIC_TAB_ICONS: Record<string, FluentIcon> = {
  file: Document24Regular,
  insert: DocumentAdd24Regular,
  draw: DrawShape24Regular,
  design: DesignIdeas24Regular,
  layout: DocumentPageBreak24Regular,
  references: BookOpen24Regular,
  mailings: Mail24Regular,
  review: TextProofingTools24Regular,
  view: Eye24Regular,
  help: ChatHelp24Regular,
};

const STYLE_PRESETS = [
  { label: 'Normal', sample: 'AaBbCcDd' },
  { label: 'Sin espacio', sample: 'AaBbCcDd' },
  { label: 'Título 1', sample: 'AaBbCc' },
  { label: 'Título 2', sample: 'AaBbCc' },
  { label: 'Título', sample: 'AaBbCc' },
] as const;

const RibbonCommand = ({
  accent,
  className = '',
  icon: Icon,
  label,
  large = false,
  reasonId,
  showLabel = false,
  split = false,
  title,
}: RibbonCommandProps) => (
  <button
    type="button"
    className={`office-word-ribbon__command${large ? ' is-large' : ''}${
      showLabel ? ' has-label' : ''
    }${split ? ' is-split' : ''}${accent ? ` has-${accent}-accent` : ''}${
      className ? ` ${className}` : ''
    }`}
    aria-describedby={reasonId}
    aria-disabled="true"
    aria-label={label}
    data-command-mode="word-desktop-only"
    data-ribbon-command={label}
    title={title}
  >
    <span className="office-word-ribbon__command-main">
      <span className="office-word-ribbon__command-icon" aria-hidden="true">
        <Icon />
      </span>
      {(showLabel || large) && (
        <span className="office-word-ribbon__command-label">{label}</span>
      )}
    </span>
    {split && (
      <span className="office-word-ribbon__split" aria-hidden="true">
        <ChevronDown12Regular />
      </span>
    )}
  </button>
);

const RibbonValueControl = ({
  icon: Icon,
  label,
  reasonId,
  title,
  value,
  wide = false,
}: RibbonValueControlProps) => (
  <button
    type="button"
    className={`office-word-ribbon__value${wide ? ' is-wide' : ''}`}
    aria-describedby={reasonId}
    aria-disabled="true"
    aria-label={`${label}: ${value}`}
    data-command-mode="word-desktop-only"
    data-ribbon-command={label}
    title={title}
  >
    <Icon aria-hidden="true" />
    <span>{value}</span>
    <ChevronDown12Regular aria-hidden="true" />
  </button>
);

const RibbonGroup = ({ children, className, label }: RibbonGroupProps) => (
  <section
    className={`office-word-ribbon__group ${className}`}
    aria-label={label}
    role="group"
  >
    <div className="office-word-ribbon__group-body">{children}</div>
    <span className="office-word-ribbon__group-label">{label}</span>
  </section>
);

const HomeRibbon = ({
  reasonId,
  title,
}: {
  reasonId: string;
  title: string;
}) => (
  <div
    className="office-word-ribbon__home"
    data-testid="office-word-ribbon-home"
  >
    <RibbonGroup className="is-clipboard" label="Portapapeles">
      <div className="office-word-ribbon__clipboard-layout">
        <RibbonCommand
          icon={ClipboardPaste24Regular}
          label="Pegar"
          large
          reasonId={reasonId}
          split
          title={title}
        />
        <div className="office-word-ribbon__vertical-commands">
          <RibbonCommand
            icon={Cut20Regular}
            label="Cortar"
            reasonId={reasonId}
            showLabel
            title={title}
          />
          <RibbonCommand
            icon={Copy20Regular}
            label="Copiar"
            reasonId={reasonId}
            showLabel
            title={title}
          />
          <RibbonCommand
            icon={PaintBrush20Regular}
            label="Copiar formato"
            reasonId={reasonId}
            showLabel
            title={title}
          />
        </div>
      </div>
    </RibbonGroup>

    <RibbonGroup className="is-font" label="Fuente">
      <div className="office-word-ribbon__matrix is-font-matrix">
        <div className="office-word-ribbon__row is-font-values">
          <RibbonValueControl
            icon={TextFont20Regular}
            label="Fuente"
            reasonId={reasonId}
            title={title}
            value="Calibri (Cuerpo)"
            wide
          />
          <RibbonValueControl
            icon={TextFontSize20Regular}
            label="Tamaño de fuente"
            reasonId={reasonId}
            title={title}
            value="11"
          />
          <RibbonCommand
            icon={ArrowUp20Regular}
            label="Aumentar tamaño de fuente"
            reasonId={reasonId}
            title={title}
          />
          <RibbonCommand
            icon={ArrowDown20Regular}
            label="Disminuir tamaño de fuente"
            reasonId={reasonId}
            title={title}
          />
          <RibbonCommand
            icon={TextChangeCase20Regular}
            label="Cambiar mayúsculas y minúsculas"
            reasonId={reasonId}
            split
            title={title}
          />
          <RibbonCommand
            icon={TextClearFormatting20Regular}
            label="Borrar todo el formato"
            reasonId={reasonId}
            title={title}
          />
        </div>
        <div className="office-word-ribbon__row is-font-formatting">
          <RibbonCommand
            icon={TextBold20Regular}
            label="Negrita"
            reasonId={reasonId}
            title={title}
          />
          <RibbonCommand
            icon={TextItalic20Regular}
            label="Cursiva"
            reasonId={reasonId}
            title={title}
          />
          <RibbonCommand
            icon={TextUnderline20Regular}
            label="Subrayado"
            reasonId={reasonId}
            split
            title={title}
          />
          <RibbonCommand
            icon={TextStrikethrough20Regular}
            label="Tachado"
            reasonId={reasonId}
            title={title}
          />
          <RibbonCommand
            icon={TextSubscript20Regular}
            label="Subíndice"
            reasonId={reasonId}
            title={title}
          />
          <RibbonCommand
            icon={TextSuperscript20Regular}
            label="Superíndice"
            reasonId={reasonId}
            title={title}
          />
          <RibbonCommand
            icon={TextEffects20Regular}
            label="Efectos de texto y tipografía"
            reasonId={reasonId}
            title={title}
          />
          <RibbonCommand
            accent="highlight"
            icon={Highlight20Regular}
            label="Color de resaltado del texto"
            reasonId={reasonId}
            split
            title={title}
          />
          <RibbonCommand
            accent="font"
            icon={TextColor20Regular}
            label="Color de fuente"
            reasonId={reasonId}
            split
            title={title}
          />
        </div>
      </div>
    </RibbonGroup>

    <RibbonGroup className="is-paragraph" label="Párrafo">
      <div className="office-word-ribbon__matrix is-paragraph-matrix">
        <div className="office-word-ribbon__row">
          <RibbonCommand
            icon={TextBulletList20Regular}
            label="Viñetas"
            reasonId={reasonId}
            split
            title={title}
          />
          <RibbonCommand
            icon={TextNumberListLtr20Regular}
            label="Numeración"
            reasonId={reasonId}
            split
            title={title}
          />
          <RibbonCommand
            icon={TextBulletListTree20Regular}
            label="Lista multinivel"
            reasonId={reasonId}
            split
            title={title}
          />
          <RibbonCommand
            icon={TextIndentDecreaseLtr20Regular}
            label="Disminuir sangría"
            reasonId={reasonId}
            title={title}
          />
          <RibbonCommand
            icon={TextIndentIncreaseLtr20Regular}
            label="Aumentar sangría"
            reasonId={reasonId}
            title={title}
          />
          <RibbonCommand
            icon={ArrowSort20Regular}
            label="Ordenar"
            reasonId={reasonId}
            title={title}
          />
          <RibbonCommand
            icon={TextParagraph20Regular}
            label="Mostrar todo"
            reasonId={reasonId}
            title={title}
          />
        </div>
        <div className="office-word-ribbon__row">
          <RibbonCommand
            icon={TextAlignLeft20Regular}
            label="Alinear a la izquierda"
            reasonId={reasonId}
            title={title}
          />
          <RibbonCommand
            icon={TextAlignCenter20Regular}
            label="Centrar"
            reasonId={reasonId}
            title={title}
          />
          <RibbonCommand
            icon={TextAlignRight20Regular}
            label="Alinear a la derecha"
            reasonId={reasonId}
            title={title}
          />
          <RibbonCommand
            icon={TextAlignJustify20Regular}
            label="Justificar"
            reasonId={reasonId}
            title={title}
          />
          <RibbonCommand
            icon={TextLineSpacing20Regular}
            label="Espaciado entre líneas y párrafos"
            reasonId={reasonId}
            split
            title={title}
          />
          <RibbonCommand
            icon={ColorBackground20Regular}
            label="Sombreado"
            reasonId={reasonId}
            split
            title={title}
          />
          <RibbonCommand
            icon={BorderAll20Regular}
            label="Bordes"
            reasonId={reasonId}
            split
            title={title}
          />
        </div>
      </div>
    </RibbonGroup>

    <RibbonGroup className="is-styles" label="Estilos">
      <div className="office-word-ribbon__styles-gallery">
        {STYLE_PRESETS.map((style, index) => (
          <button
            key={style.label}
            type="button"
            className={`office-word-ribbon__style-card is-style-${index + 1}`}
            aria-describedby={reasonId}
            aria-disabled="true"
            aria-label={`Estilo ${style.label}`}
            data-command-mode="word-desktop-only"
            title={title}
          >
            <span>{style.sample}</span>
            <small>{style.label}</small>
          </button>
        ))}
        <RibbonCommand
          className="office-word-ribbon__more-styles"
          icon={TextEditStyle20Regular}
          label="Más estilos"
          reasonId={reasonId}
          split
          title={title}
        />
      </div>
    </RibbonGroup>

    <RibbonGroup className="is-editing" label="Edición">
      <div className="office-word-ribbon__vertical-commands is-editing-stack">
        <RibbonCommand
          icon={Search20Regular}
          label="Buscar"
          reasonId={reasonId}
          showLabel
          split
          title={title}
        />
        <RibbonCommand
          icon={ArrowRepeatAll20Regular}
          label="Reemplazar"
          reasonId={reasonId}
          showLabel
          title={title}
        />
        <RibbonCommand
          icon={SelectAllOn20Regular}
          label="Seleccionar"
          reasonId={reasonId}
          showLabel
          split
          title={title}
        />
      </div>
    </RibbonGroup>
  </div>
);

const GenericRibbon = ({
  activeTab,
  reasonId,
  title,
}: {
  activeTab: string;
  reasonId: string;
  title: string;
}) => {
  const groups = OFFICE_GROUPS[activeTab] ?? OFFICE_GROUPS.insert;
  const Icon = GENERIC_TAB_ICONS[activeTab] ?? Document24Regular;

  return (
    <div className="office-word-ribbon__generic">
      {groups.map(group => (
        <RibbonGroup
          key={group.label}
          className="is-generic"
          label={group.label}
        >
          <div className="office-word-ribbon__generic-commands">
            {group.controls.map(control => (
              <RibbonCommand
                key={control}
                icon={Icon}
                label={control}
                large
                reasonId={reasonId}
                showLabel
                title={title}
              />
            ))}
          </div>
        </RibbonGroup>
      ))}
    </div>
  );
};

const OfficeWordRibbon = ({
  hasDocument,
  statusLabel,
}: OfficeWordRibbonProps) => {
  const [activeTab, setActiveTab] = useState('home');
  const tabs = writerRibbonSchema.tabs.filter(tab => !tab.contextual);
  const panelId = useId();
  const reasonId = useId();
  const unavailableReason = hasDocument
    ? 'Vista previa no editable: este comando solo funciona en la ventana real de Microsoft Word de escritorio.'
    : 'Seleccione un DOCX y ábralo en Microsoft Word; la cinta web es solo una referencia visual.';

  return (
    <div
      className="office-word-ribbon"
      aria-label="Cinta de referencia para Microsoft Word"
      data-testid="office-word-ribbon"
      role="region"
    >
      <div className="office-word-ribbon__tabs-row">
        <nav
          className="office-word-ribbon__tabs"
          aria-label="Pestañas del documento Word"
          role="tablist"
        >
          {tabs.map(tab => {
            const selected = activeTab === tab.id;
            const tabId = `${panelId}-${tab.id}`;
            return (
              <button
                key={tab.id}
                type="button"
                id={tabId}
                className={`office-word-ribbon__tab${
                  selected ? ' is-active' : ''
                }`}
                aria-controls={panelId}
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                tabIndex={selected ? 0 : -1}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
        <span
          className="office-word-ribbon__status"
          aria-live="polite"
          role="status"
          title={statusLabel}
        >
          {statusLabel}
        </span>
      </div>

      <div
        id={panelId}
        className="office-word-ribbon__panel"
        aria-labelledby={`${panelId}-${activeTab}`}
        data-active-tab={activeTab}
        role="tabpanel"
      >
        {activeTab === 'home' ? (
          <HomeRibbon reasonId={reasonId} title={unavailableReason} />
        ) : (
          <GenericRibbon
            activeTab={activeTab}
            reasonId={reasonId}
            title={unavailableReason}
          />
        )}
      </div>

      <p id={reasonId} className="sr-only">
        {unavailableReason}
      </p>
    </div>
  );
};

export default OfficeWordRibbon;

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Database,
  Download,
  FileDown,
  FilePlus2,
  FileText,
  FolderOpen,
  History,
  Home,
  Info,
  MessageSquareText,
  MonitorUp,
  PanelLeft,
  Printer,
  Ruler,
  Save,
  SaveAll,
  Server,
  Settings2,
  Share2,
  ShieldCheck,
  Upload,
  UserCircle2,
  X,
  type LucideIcon,
} from 'lucide-react';

import type { FileTask } from '@/types/types';
import type {
  TaskDocumentDto,
  TaskDocumentKind,
  TaskDocumentVersionDto,
} from '../../services/taskDocument.service';

import './canvasWordBackstage.css';

export type BackstageTemplate =
  | 'blank'
  | 'technical-report'
  | 'memorandum'
  | 'meeting-minutes';

type BackstageSection =
  | 'home'
  | 'new'
  | 'open'
  | 'info'
  | 'save'
  | 'save-as'
  | 'save-pdf'
  | 'history'
  | 'print'
  | 'share'
  | 'export'
  | 'close'
  | 'account'
  | 'comments'
  | 'options';

interface CanvasWordBackstageProps {
  document: TaskDocumentDto | null | undefined;
  documentTitle: string;
  isExporting: boolean;
  isFullscreen: boolean;
  isVersionsLoading: boolean;
  saveStatus: string;
  showNavigationPane: boolean;
  showRuler: boolean;
  sourceFile?: FileTask | null;
  taskId: number;
  taskKind: TaskDocumentKind;
  versions: TaskDocumentVersionDto[];
  wordCount: number;
  zoom: number;
  onBackToDocument: () => void;
  onCreateDocument: (template: BackstageTemplate) => void;
  onDownloadPdf: () => void;
  onDownloadWord: () => void;
  onPrint: () => void;
  onReload: () => void;
  onRestoreVersion: (versionNumber: number) => void;
  onSave: () => void;
  onSaveAs: (title: string) => void;
  onToggleFullscreen: () => void;
  onToggleNavigationPane: () => void;
  onToggleRuler: () => void;
  onZoomChange: (zoom: number) => void;
}

interface BackstageNavItem {
  id: BackstageSection;
  label: string;
  icon: LucideIcon;
  separated?: boolean;
}

const navigation: BackstageNavItem[] = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'new', label: 'Nuevo', icon: FilePlus2 },
  { id: 'open', label: 'Abrir', icon: FolderOpen },
  { id: 'info', label: 'Información', icon: Info, separated: true },
  { id: 'save', label: 'Guardar', icon: Save },
  { id: 'save-as', label: 'Guardar como', icon: SaveAll },
  { id: 'save-pdf', label: 'Guardar como PDF', icon: FileDown },
  { id: 'history', label: 'Historial', icon: History },
  { id: 'print', label: 'Imprimir', icon: Printer, separated: true },
  { id: 'share', label: 'Compartir', icon: Share2 },
  { id: 'export', label: 'Exportar', icon: Download },
  { id: 'close', label: 'Cerrar', icon: X },
  { id: 'account', label: 'Cuenta', icon: UserCircle2, separated: true },
  { id: 'comments', label: 'Comentarios', icon: MessageSquareText },
  { id: 'options', label: 'Opciones', icon: Settings2 },
];

const templates: Array<{
  id: BackstageTemplate;
  name: string;
  description: string;
  className: string;
}> = [
  {
    id: 'blank',
    name: 'Documento en blanco',
    description: 'Una página limpia para comenzar.',
    className: 'is-blank',
  },
  {
    id: 'technical-report',
    name: 'Informe técnico',
    description: 'Portada y secciones técnicas.',
    className: 'is-report',
  },
  {
    id: 'memorandum',
    name: 'Memorando',
    description: 'Formato institucional breve.',
    className: 'is-memo',
  },
  {
    id: 'meeting-minutes',
    name: 'Acta de reunión',
    description: 'Acuerdos, responsables y fechas.',
    className: 'is-minutes',
  },
];

const formatDate = (value?: string) => {
  if (!value) return 'Todavía no guardado';
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const ensureDocxTitle = (value: string) => {
  const clean = value.trim();
  if (!clean) return '';
  return clean.toLowerCase().endsWith('.docx') ? clean : `${clean}.docx`;
};

const CanvasWordBackstage = ({
  document,
  documentTitle,
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
  wordCount,
  zoom,
  onBackToDocument,
  onCreateDocument,
  onDownloadPdf,
  onDownloadWord,
  onPrint,
  onReload,
  onRestoreVersion,
  onSave,
  onSaveAs,
  onToggleFullscreen,
  onToggleNavigationPane,
  onToggleRuler,
  onZoomChange,
}: CanvasWordBackstageProps) => {
  const [activeSection, setActiveSection] = useState<BackstageSection>('home');
  const [saveAsTitle, setSaveAsTitle] = useState(
    documentTitle.replace(/\.docx$/i, '')
  );
  const [linkCopied, setLinkCopied] = useState(false);
  const localLink = useMemo(() => window.location.href, []);

  const copyLocalLink = async () => {
    try {
      await navigator.clipboard.writeText(localLink);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2_000);
    } catch {
      const input = window.document.createElement('textarea');
      input.value = localLink;
      window.document.body.appendChild(input);
      input.select();
      window.document.execCommand('copy');
      input.remove();
      setLinkCopied(true);
    }
  };

  const runAndReturn = (action: () => void) => {
    action();
    onBackToDocument();
  };

  const renderTemplates = () => (
    <div className="canvas-word-backstage__templates">
      {templates.map(template => (
        <button
          key={template.id}
          type="button"
          className="canvas-word-backstage__template"
          onClick={() => runAndReturn(() => onCreateDocument(template.id))}
        >
          <span
            className={`canvas-word-backstage__template-preview ${template.className}`}
            aria-hidden="true"
          >
            <i />
            <i />
            <i />
            <i />
          </span>
          <strong>{template.name}</strong>
          <small>{template.description}</small>
        </button>
      ))}
    </div>
  );

  const renderVersions = (limit?: number) => {
    const visibleVersions =
      typeof limit === 'number' ? versions.slice(0, limit) : versions;
    if (isVersionsLoading)
      return (
        <p className="canvas-word-backstage__empty">
          Cargando versiones de Dhyrium…
        </p>
      );
    if (!visibleVersions.length)
      return (
        <p className="canvas-word-backstage__empty">
          Todavía no hay versiones guardadas.
        </p>
      );
    return (
      <div className="canvas-word-backstage__recent-list">
        {visibleVersions.map(version => (
          <button
            key={version.versionNumber}
            type="button"
            onClick={() => onRestoreVersion(version.versionNumber)}
          >
            <FileText aria-hidden="true" />
            <span>
              <strong>{version.title || documentTitle}</strong>
              <small>
                Versión {version.versionNumber} · {version.createdBy.name}
              </small>
            </span>
            <time>{formatDate(version.createdAt)}</time>
          </button>
        ))}
      </div>
    );
  };

  const renderActionPage = (
    title: string,
    description: string,
    Icon: LucideIcon,
    actionLabel: string,
    action: () => void,
    disabled = false
  ) => (
    <div className="canvas-word-backstage__action-page">
      <div className="canvas-word-backstage__action-icon">
        <Icon aria-hidden="true" />
      </div>
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
        <button
          type="button"
          className="canvas-word-backstage__primary"
          disabled={disabled}
          onClick={action}
        >
          <Icon aria-hidden="true" /> {actionLabel}
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return (
          <>
            <div className="canvas-word-backstage__heading">
              <div>
                <h1>Inicio</h1>
                <p>
                  Trabaje con documentos guardados en el servidor local de
                  Dhyrium.
                </p>
              </div>
              <span>
                <Server /> Servicio local
              </span>
            </div>
            <section>
              <h2>Nuevo</h2>
              {renderTemplates()}
            </section>
            <section>
              <div className="canvas-word-backstage__section-heading">
                <h2>Versiones recientes</h2>
                <button
                  type="button"
                  onClick={() => setActiveSection('history')}
                >
                  Ver todo
                </button>
              </div>
              {renderVersions(6)}
            </section>
          </>
        );
      case 'new':
        return (
          <>
            <div className="canvas-word-backstage__heading">
              <div>
                <h1>Nuevo</h1>
                <p>
                  Cree un borrador dentro de la tarea actual. La versión
                  anterior permanece en el historial.
                </p>
              </div>
            </div>
            <section>
              <h2>Plantillas locales de Dhyrium</h2>
              {renderTemplates()}
            </section>
          </>
        );
      case 'open':
        return (
          <>
            <div className="canvas-word-backstage__heading">
              <div>
                <h1>Abrir</h1>
                <p>
                  El archivo DOCX adjunto se lee en el editor web sin alterar
                  el original protegido.
                </p>
              </div>
            </div>
            <div className="canvas-word-backstage__open-grid">
              <button
                type="button"
                className="canvas-word-backstage__location"
                onClick={onBackToDocument}
              >
                <Database />
                <span>
                  <strong>Documento actual de Dhyrium</strong>
                  <small>{documentTitle}</small>
                </span>
              </button>
              {sourceFile && (
                <button
                  type="button"
                  className="canvas-word-backstage__location"
                  onClick={onBackToDocument}
                  title="Abrir el documento y leer su encabezado, pie e imágenes"
                >
                  <FileText />
                  <span>
                    <strong>Archivo adjunto de la tarea</strong>
                    <small>{sourceFile.originalname}</small>
                  </span>
                </button>
              )}
              <button
                type="button"
                className="canvas-word-backstage__location"
                disabled
                title="Seleccione un archivo DOCX desde los archivos de la tarea."
              >
                <Upload />
                <span>
                  <strong>Examinar este equipo</strong>
                  <small>Seleccione un archivo DOCX de la tarea</small>
                </span>
              </button>
            </div>
            <section>
              <h2>Versiones disponibles</h2>
              {renderVersions()}
            </section>
          </>
        );
      case 'info':
        return (
          <>
            <div className="canvas-word-backstage__heading">
              <div>
                <h1>Información</h1>
                <p>Propiedades y estado del documento actual.</p>
              </div>
            </div>
            <div className="canvas-word-backstage__info-grid">
              <article>
                <ShieldCheck />
                <div>
                  <strong>Protegido por Dhyrium</strong>
                  <span>Requiere una sesión válida de la plataforma.</span>
                </div>
              </article>
              <article>
                <Database />
                <div>
                  <strong>Guardado local</strong>
                  <span>PostgreSQL y archivos del servidor configurado.</span>
                </div>
              </article>
              <article>
                <History />
                <div>
                  <strong>Historial recuperable</strong>
                  <span>{versions.length} versión(es) disponible(s).</span>
                </div>
              </article>
            </div>
            <dl className="canvas-word-backstage__properties">
              <div>
                <dt>Nombre</dt>
                <dd>{documentTitle}</dd>
              </div>
              <div>
                <dt>Tarea</dt>
                <dd>
                  {taskKind} / {taskId}
                </dd>
              </div>
              <div>
                <dt>Versión</dt>
                <dd>{document?.versionNumber ?? 0}</dd>
              </div>
              <div>
                <dt>Revisión interna</dt>
                <dd>{document?.revision ?? 0}</dd>
              </div>
              <div>
                <dt>Última modificación</dt>
                <dd>{formatDate(document?.updatedAt)}</dd>
              </div>
              <div>
                <dt>Modificado por</dt>
                <dd>{document?.updatedBy.name ?? 'Usuario actual'}</dd>
              </div>
              <div>
                <dt>Palabras</dt>
                <dd>{wordCount}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{saveStatus}</dd>
              </div>
            </dl>
          </>
        );
      case 'save':
        return renderActionPage(
          'Guardar',
          'Guarda el contenido y crea una versión recuperable en el servidor de Dhyrium.',
          Save,
          'Guardar ahora',
          () => runAndReturn(onSave)
        );
      case 'save-as':
        return (
          <div className="canvas-word-backstage__form-page">
            <h1>Guardar como</h1>
            <p>
              Cambie el nombre del documento y guarde una nueva versión dentro
              de esta tarea.
            </p>
            <label>
              Nombre del documento
              <input
                value={saveAsTitle}
                maxLength={295}
                onChange={event => setSaveAsTitle(event.target.value)}
              />
            </label>
            <div className="canvas-word-backstage__destination">
              <Database />
              <span>
                <strong>Servidor local de Dhyrium</strong>
                <small>
                  La tarea conserva una sola copia vigente y todo su historial.
                </small>
              </span>
            </div>
            <button
              type="button"
              className="canvas-word-backstage__primary"
              disabled={!saveAsTitle.trim()}
              onClick={() =>
                runAndReturn(() => onSaveAs(ensureDocxTitle(saveAsTitle)))
              }
            >
              <SaveAll /> Guardar con este nombre
            </button>
          </div>
        );
      case 'save-pdf':
        return renderActionPage(
          'Guardar como PDF',
          'Genera una copia PDF en este equipo sin enviar el contenido a servicios externos.',
          FileDown,
          'Descargar PDF',
          onDownloadPdf
        );
      case 'history':
        return (
          <>
            <div className="canvas-word-backstage__heading">
              <div>
                <h1>Historial</h1>
                <p>
                  Seleccione una versión anterior para restaurarla como una
                  nueva versión.
                </p>
              </div>
              <button
                type="button"
                className="canvas-word-backstage__secondary"
                onClick={onReload}
              >
                Actualizar
              </button>
            </div>
            {renderVersions()}
          </>
        );
      case 'print':
        return renderActionPage(
          'Imprimir',
          'Abra la vista de impresión del navegador con el diseño paginado del documento.',
          Printer,
          'Imprimir documento',
          onPrint
        );
      case 'share':
        return (
          <div className="canvas-word-backstage__form-page">
            <h1>Compartir</h1>
            <p>
              Comparta la dirección de esta tarea dentro de la misma red. El
              destinatario deberá iniciar sesión en Dhyrium.
            </p>
            <label>
              Vínculo local o LAN
              <div className="canvas-word-backstage__copy-field">
                <input readOnly value={localLink} />
                <button type="button" onClick={() => void copyLocalLink()}>
                  {linkCopied ? <Check /> : <Copy />}
                  {linkCopied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </label>
            <div className="canvas-word-backstage__button-row">
              <button
                type="button"
                className="canvas-word-backstage__secondary"
                disabled={isExporting}
                onClick={onDownloadWord}
              >
                <FileText /> Enviar copia DOCX
              </button>
              <button
                type="button"
                className="canvas-word-backstage__secondary"
                onClick={onDownloadPdf}
              >
                <FileDown /> Enviar copia PDF
              </button>
            </div>
          </div>
        );
      case 'export':
        return (
          <div className="canvas-word-backstage__form-page">
            <h1>Exportar</h1>
            <p>Cree una copia independiente del documento actual.</p>
            <div className="canvas-word-backstage__export-grid">
              <button
                type="button"
                disabled={isExporting}
                onClick={onDownloadWord}
              >
                <FileText />
                <span>
                  <strong>Documento DOCX (.docx)</strong>
                  <small>Compatibilidad básica; sin round-trip fiel.</small>
                </span>
              </button>
              <button type="button" onClick={onDownloadPdf}>
                <FileDown />
                <span>
                  <strong>Documento PDF (.pdf)</strong>
                  <small>Formato fijo para compartir o imprimir.</small>
                </span>
              </button>
            </div>
          </div>
        );
      case 'close':
        return renderActionPage(
          'Cerrar Archivo',
          'Vuelva al documento. Los cambios pendientes continuarán guardándose automáticamente en Dhyrium.',
          X,
          'Volver al documento',
          onBackToDocument
        );
      case 'account':
        return (
          <>
            <div className="canvas-word-backstage__heading">
              <div>
                <h1>Cuenta</h1>
                <p>Sesión y almacenamiento utilizados por este documento.</p>
              </div>
            </div>
            <div className="canvas-word-backstage__account-card">
              <UserCircle2 />
              <div>
                <strong>{document?.updatedBy.name ?? 'Usuario Dhyrium'}</strong>
                <span>Cuenta autenticada en la plataforma local</span>
                <small>
                  Editor y almacenamiento administrados por Dhyrium.
                </small>
              </div>
            </div>
          </>
        );
      case 'comments':
        return (
          <div className="canvas-word-backstage__form-page">
            <h1>Comentarios</h1>
            <p>
              Los comentarios de revisión pertenecen a la tarea y se guardan en
              Dhyrium. Puede administrarlos desde el botón “Comentario” de la
              barra superior.
            </p>
            <button
              type="button"
              className="canvas-word-backstage__primary"
              onClick={onBackToDocument}
            >
              <MessageSquareText /> Volver a la revisión
            </button>
          </div>
        );
      case 'options':
        return (
          <div className="canvas-word-backstage__form-page">
            <h1>Opciones del editor</h1>
            <p>
              Ajuste la forma de trabajar. Estas opciones afectan la vista, no
              el contenido guardado.
            </p>
            <div className="canvas-word-backstage__option-list">
              <button
                type="button"
                className={showRuler ? 'is-active' : ''}
                onClick={onToggleRuler}
              >
                <Ruler />
                <span>
                  <strong>Regla</strong>
                  <small>{showRuler ? 'Visible' : 'Oculta'}</small>
                </span>
                <i>{showRuler ? 'Sí' : 'No'}</i>
              </button>
              <button
                type="button"
                className={showNavigationPane ? 'is-active' : ''}
                onClick={onToggleNavigationPane}
              >
                <PanelLeft />
                <span>
                  <strong>Panel de navegación</strong>
                  <small>Títulos y secciones</small>
                </span>
                <i>{showNavigationPane ? 'Sí' : 'No'}</i>
              </button>
              <button
                type="button"
                className={isFullscreen ? 'is-active' : ''}
                onClick={onToggleFullscreen}
              >
                <MonitorUp />
                <span>
                  <strong>Pantalla completa</strong>
                  <small>Oculta el resto de la aplicación</small>
                </span>
                <i>{isFullscreen ? 'Sí' : 'No'}</i>
              </button>
            </div>
            <label className="canvas-word-backstage__zoom">
              Zoom{' '}
              <input
                type="range"
                min="50"
                max="200"
                step="10"
                value={zoom}
                onChange={event => onZoomChange(Number(event.target.value))}
              />
              <output>{zoom}%</output>
            </label>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="canvas-word-backstage" aria-label="Archivo del documento">
      <aside className="canvas-word-backstage__sidebar">
        <button
          type="button"
          className="canvas-word-backstage__back"
          title="Volver al documento"
          aria-label="Volver al documento"
          onClick={onBackToDocument}
        >
          <ArrowLeft />
        </button>
        <nav aria-label="Opciones de Archivo">
          {navigation.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={
                  (activeSection === item.id ? 'is-active ' : '') +
                  (item.separated ? 'is-separated' : '')
                }
                onClick={() => setActiveSection(item.id)}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="canvas-word-backstage__content">{renderContent()}</main>
    </div>
  );
};

export default CanvasWordBackstage;

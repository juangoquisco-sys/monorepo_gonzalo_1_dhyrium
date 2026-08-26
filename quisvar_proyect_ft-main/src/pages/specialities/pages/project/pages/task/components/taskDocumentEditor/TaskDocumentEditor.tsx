import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import CanvasEditor, {
  BlockType,
  ElementType,
  PageMode,
  PaperDirection,
  RenderMode,
  getElementListByHTML,
  type ICatalogItem,
  type IEditorData,
  type IElement,
  type IEditorOption,
  type IRangeStyle,
} from '@hufe921/canvas-editor';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import DOMPurify from 'dompurify';
import { asBlob } from 'html-docx-js-typescript';
import html2pdf, { type Html2PdfOptions } from 'html2pdf.js';
import {
  Download,
  FileText,
  History,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Printer,
  RefreshCw,
  Save,
} from 'lucide-react';

import { AppButton } from '@/components/app-ui/app-button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { URL, axiosInstance } from '@/services/axiosInstance';
import type { FileTask } from '@/types/types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { downloadBlob } from '@/utils/tools';
import {
  getTaskDocument,
  listTaskDocumentVersions,
  restoreTaskDocumentVersion,
  saveTaskDocument,
  taskDocumentQueryKey,
  taskDocumentVersionsQueryKey,
  uploadTaskDocumentAsset,
  type CanvasTaskDocumentContent,
  type SaveTaskDocumentInput,
  type TaskDocumentDto,
  type TaskDocumentKind,
} from '../../services/taskDocument.service';
import CanvasWordRibbon from './CanvasWordRibbon';
import type { BackstageTemplate } from './CanvasWordBackstage';
import {
  mapCanvasResourceReferences,
  mapCanvasResourceReferencesAsync,
  resolveCanvasResourceReference,
  type CanvasResourceKind,
} from './canvasResourceReferences';
import { extractDocxOoxmlLayout } from './docxOoxmlImport';
import { getTaskFileExtension, getTaskFileUrl } from '../../services/taskFile.service';
import './taskDocumentEditor.css';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const DEFAULT_PAGE_WIDTH = 794;
const DEFAULT_PAGE_HEIGHT = 1123;
const DEFAULT_MARGINS: [number, number, number, number] = [96, 96, 96, 96];
const EMPTY_DATA: IEditorData = { main: [{ value: '\n' }] };
const DEFAULT_EDITOR_OPTIONS: IEditorOption = {
  locale: 'en',
  defaultFont: 'Carlito',
  defaultSize: 14.6667,
  defaultRowMargin: 1.15,
  width: DEFAULT_PAGE_WIDTH,
  height: DEFAULT_PAGE_HEIGHT,
  margins: DEFAULT_MARGINS,
  pageMode: PageMode.PAGING,
  paperDirection: PaperDirection.VERTICAL,
  pageGap: 24,
  scale: 1,
  renderMode: RenderMode.COMPATIBILITY,
  placeholder: { data: 'Empiece a escribir el documento de esta tarea…' },
  pageNumber: {
    format: 'Página {pageNo} de {pageCount}',
    font: 'Carlito',
    size: 11,
    color: '#6b7280',
  },
  header: { editable: true, top: 36 },
  footer: { editable: true, bottom: 36 },
  ruler: { disabled: false, height: 20 },
  background: { color: '#ffffff' },
  pageBorder: { disabled: true, color: '#9ca3af', lineWidth: 1 },
  accessibility: { disabled: false },
};

const BACKSTAGE_TEMPLATE_HTML: Record<BackstageTemplate, string> = {
  blank: '<p><br></p>',
  'technical-report': `
    <h1>INFORME TÉCNICO</h1>
    <p><strong>Proyecto:</strong> </p>
    <p><strong>Responsable:</strong> </p>
    <p><strong>Fecha:</strong> </p>
    <h2>1. Antecedentes</h2><p><br></p>
    <h2>2. Objetivo</h2><p><br></p>
    <h2>3. Desarrollo</h2><p><br></p>
    <h2>4. Conclusiones y recomendaciones</h2><p><br></p>
  `,
  memorandum: `
    <h1>MEMORANDO</h1>
    <p><strong>Para:</strong> </p>
    <p><strong>De:</strong> </p>
    <p><strong>Asunto:</strong> </p>
    <p><strong>Fecha:</strong> </p>
    <p><br></p><p>Por medio del presente:</p><p><br></p>
  `,
  'meeting-minutes': `
    <h1>ACTA DE REUNIÓN</h1>
    <p><strong>Proyecto:</strong> </p>
    <p><strong>Fecha y hora:</strong> </p>
    <p><strong>Participantes:</strong> </p>
    <h2>Agenda</h2><p><br></p>
    <h2>Acuerdos</h2><p><br></p>
    <h2>Responsables y plazos</h2><p><br></p>
  `,
};

type SaveState = 'loading' | 'saved' | 'saving' | 'error' | 'conflict';
type DocxImportState = 'idle' | 'loading' | 'ready' | 'error';

interface TaskDocumentEditorProps {
  taskId: number;
  taskName: string;
  taskKind: TaskDocumentKind;
  headerContent?: ReactNode;
  sourceFile?: FileTask | null;
}

interface EditorStats {
  characters: number;
  words: number;
  pageCount: number;
  currentPage: number;
}

interface EditorHtml {
  header: string;
  main: string;
  footer: string;
}

const safeFileName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*]/g, '')
    .split('')
    .filter(character => character.charCodeAt(0) >= 32)
    .join('')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 100) || 'documento_de_tarea';

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      }[character] ?? character)
  );

const pixelsToMillimeters = (value: number) => (value * 25.4) / 96;
const millimetersToTwips = (value: number) => Math.round(value * 56.6929);

const isCanvasDocument = (
  content: TaskDocumentDto['contentJson']
): content is CanvasTaskDocumentContent =>
  content?.type === 'canvas-editor' &&
  'data' in content &&
  Array.isArray(content.data?.main);

const normalizeTableSpan = (value: number | undefined) =>
  Number.isFinite(value) && Number(value) > 0
    ? Math.max(1, Math.trunc(Number(value)))
    : 1;

interface SimulatedTableCell {
  colIndex: number;
  colspan: number;
}

const getCanvasRequiredColumnCount = (table: IElement, columnCount: number) => {
  const simulatedRows: SimulatedTableCell[][] = [];
  let requiredColumnCount = 1;

  table.trList?.forEach((row, rowIndex) => {
    const simulatedCells: SimulatedTableCell[] = [];
    row.tdList?.forEach((cell, cellIndex) => {
      const colspan = normalizeTableSpan(cell.colspan);
      let colIndex = 0;

      if (rowIndex === 0) {
        const previousCell = simulatedCells[cellIndex - 1];
        if (previousCell)
          colIndex = previousCell.colIndex + previousCell.colspan;
      } else {
        const previousCell = simulatedCells[cellIndex - 1];
        const searchFrom = previousCell
          ? previousCell.colIndex + previousCell.colspan
          : cellIndex;

        for (
          let candidate = searchFrom;
          candidate < columnCount;
          candidate += 1
        ) {
          const coveredRowCount = simulatedRows.reduce(
            (count, previousRow) =>
              count +
              previousRow.filter(
                previous =>
                  candidate >= previous.colIndex &&
                  candidate < previous.colIndex + previous.colspan
              ).length,
            0
          );
          if (coveredRowCount === rowIndex) {
            colIndex = candidate;
            break;
          }
        }
      }

      simulatedCells.push({ colIndex, colspan });
      requiredColumnCount = Math.max(requiredColumnCount, colIndex + colspan);
    });
    simulatedRows.push(simulatedCells);
  });

  return requiredColumnCount;
};

/**
 * Word admite tablas irregulares que Mammoth puede convertir con menos
 * columnas declaradas que las usadas por sus celdas. Canvas Editor necesita
 * una entrada de colgroup por cada columna; si falta una intenta leer un ancho
 * inexistente y cancela toda la importacion. Se completan esas columnas sin
 * cambiar el ancho total de la tabla y se reparan tambien las tablas anidadas.
 */
const normalizeImportedTables = (
  elements: IElement[],
  fallbackWidth: number
) => {
  elements.forEach(element => {
    if (element.type !== ElementType.TABLE || !element.trList?.length) return;

    let requiredColumnCount = 1;
    let maximumRowspan = 1;
    element.trList.forEach(row => {
      let rowColumnCount = 0;
      row.tdList?.forEach(cell => {
        cell.colspan = normalizeTableSpan(cell.colspan);
        cell.rowspan = normalizeTableSpan(cell.rowspan);
        cell.positionList ??= [];
        maximumRowspan = Math.max(maximumRowspan, cell.rowspan);
        rowColumnCount += cell.colspan;
        normalizeImportedTables(cell.value ?? [], fallbackWidth);
      });
      requiredColumnCount = Math.max(requiredColumnCount, rowColumnCount);
    });

    const existingColumns = element.colgroup ?? [];
    if (requiredColumnCount > existingColumns.length && maximumRowspan > 1) {
      requiredColumnCount += maximumRowspan - 1;
    }
    requiredColumnCount = Math.max(requiredColumnCount, existingColumns.length);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const nextColumnCount = getCanvasRequiredColumnCount(
        element,
        requiredColumnCount
      );
      if (nextColumnCount <= requiredColumnCount) break;
      requiredColumnCount = nextColumnCount;
    }
    const hasValidExistingColumns =
      existingColumns.length >= requiredColumnCount &&
      existingColumns.every(
        column => Number.isFinite(column?.width) && column.width > 0
      );
    if (hasValidExistingColumns) return;

    const existingWidth = existingColumns.reduce(
      (total, column) =>
        total +
        (Number.isFinite(column.width) && column.width > 0 ? column.width : 0),
      0
    );
    const targetWidth = existingWidth > 0 ? existingWidth : fallbackWidth;
    const defaultColumnWidth = targetWidth / requiredColumnCount;
    const completedColumns = Array.from(
      { length: requiredColumnCount },
      (_, index) => ({
        ...existingColumns[index],
        width:
          Number.isFinite(existingColumns[index]?.width) &&
          existingColumns[index].width > 0
            ? existingColumns[index].width
            : defaultColumnWidth,
      })
    );
    const completedWidth = completedColumns.reduce(
      (total, column) => total + column.width,
      0
    );
    const widthScale = completedWidth > 0 ? targetWidth / completedWidth : 1;

    element.colgroup = completedColumns.map(column => ({
      ...column,
      width: Math.max(1, column.width * widthScale),
    }));
  });

  return elements;
};

const normalizeCanvasEditorData = (
  data: IEditorData,
  innerWidth: number
): IEditorData => {
  const normalizedData = structuredClone(data);
  normalizedData.main = normalizeImportedTables(
    normalizedData.main,
    innerWidth
  );
  if (normalizedData.header) {
    normalizedData.header = normalizeImportedTables(
      normalizedData.header,
      innerWidth
    );
  }
  if (normalizedData.footer) {
    normalizedData.footer = normalizeImportedTables(
      normalizedData.footer,
      innerWidth
    );
  }
  return normalizedData;
};

const createEditorOptions = (
  content?: CanvasTaskDocumentContent | null
): IEditorOption => ({
  ...DEFAULT_EDITOR_OPTIONS,
  width: content?.settings?.width ?? DEFAULT_PAGE_WIDTH,
  height: content?.settings?.height ?? DEFAULT_PAGE_HEIGHT,
  margins: content?.settings?.margins ?? DEFAULT_MARGINS,
  header: {
    editable: true,
    top:
      content?.settings?.headerTop ?? DEFAULT_EDITOR_OPTIONS.header?.top ?? 36,
  },
  footer: {
    editable: true,
    bottom:
      content?.settings?.footerBottom ??
      DEFAULT_EDITOR_OPTIONS.footer?.bottom ??
      36,
  },
  pageMode:
    content?.settings?.pageMode === 'continuity'
      ? PageMode.CONTINUITY
      : PageMode.PAGING,
  paperDirection:
    content?.settings?.paperDirection === 'horizontal'
      ? PaperDirection.HORIZONTAL
      : PaperDirection.VERTICAL,
  background: {
    color: content?.settings?.backgroundColor ?? '#ffffff',
  },
  pageBorder: {
    disabled: content?.settings?.pageBorder?.disabled ?? true,
    color: content?.settings?.pageBorder?.color ?? '#9ca3af',
    lineWidth: content?.settings?.pageBorder?.lineWidth ?? 1,
  },
  column: content?.settings?.columns ?? { count: 1 },
});

const htmlToEditorData = (html: string): IEditorData => ({
  main: normalizeImportedTables(
    getElementListByHTML(html, {
      innerWidth: DEFAULT_PAGE_WIDTH - DEFAULT_MARGINS[1] - DEFAULT_MARGINS[3],
    }),
    DEFAULT_PAGE_WIDTH - DEFAULT_MARGINS[1] - DEFAULT_MARGINS[3]
  ),
});

const readLegacyDocument = (storageKey: string) => {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
};

const removeLegacyDocument = (storageKey: string) => {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // El borrador local es opcional; el documento principal vive en Dhyrium.
  }
};

const getDocumentHtml = (
  title: string,
  html: EditorHtml,
  options: ReturnType<CanvasEditor['command']['getOptions']>
) => {
  const margins = options.margins ?? DEFAULT_MARGINS;
  const width = options.width ?? DEFAULT_PAGE_WIDTH;
  const height = options.height ?? DEFAULT_PAGE_HEIGHT;
  const header = html.header ? `<header>${html.header}</header>` : '';
  const footer = html.footer ? `<footer>${html.footer}</footer>` : '';

  return (
    '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    `<title>${escapeHtml(title)}</title><style>` +
    `@page{size:${pixelsToMillimeters(width)}mm ${pixelsToMillimeters(
      height
    )}mm;` +
    `margin:${pixelsToMillimeters(margins[0])}mm ${pixelsToMillimeters(
      margins[1]
    )}mm ` +
    `${pixelsToMillimeters(margins[2])}mm ${pixelsToMillimeters(
      margins[3]
    )}mm}` +
    'body{margin:0;color:#111827;background:#fff;font-family:Carlito,Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5}' +
    'header{margin-bottom:10mm}footer{margin-top:10mm;color:#667085;font-size:9pt}' +
    'table{width:100%;border-collapse:collapse}th,td{border:1px solid #808080;padding:5px;vertical-align:top}' +
    'img{max-width:100%;height:auto}a{color:#0563c1}.page-break{break-before:page;page-break-before:always}' +
    '</style></head><body>' +
    header +
    html.main +
    footer +
    '</body></html>'
  );
};

const buildCanvasPayload = (
  editor: CanvasEditor,
  docxZonesImported: boolean,
  docxSourceFileId: number | null,
  serializeAssetUrl: (value: string) => string = value => value
): CanvasTaskDocumentContent => {
  const value = editor.command.getValue();
  const options = editor.command.getOptions();
  const columns = editor.command.getColumns();
  return {
    type: 'canvas-editor',
    schemaVersion: 2,
    editorVersion: editor.version,
    data: mapCanvasResourceReferences(value.data, serializeAssetUrl),
    settings: {
      width: options.width,
      height: options.height,
      margins: options.margins,
      headerTop: options.header.top,
      footerBottom: options.footer.bottom,
      paperDirection: options.paperDirection,
      pageMode: options.pageMode,
      columns: columns
        ? {
            count: columns.count,
            gap: columns.gap,
            separator: columns.separator,
            separatorColor: columns.separatorColor,
            separatorWidth: columns.separatorWidth,
          }
        : null,
      backgroundColor: options.background.color,
      pageBorder: {
        color: options.pageBorder.color,
        lineWidth: options.pageBorder.lineWidth,
        disabled: options.pageBorder.disabled,
      },
      docxZonesImported,
      docxSourceFileId: docxSourceFileId ?? undefined,
    },
  };
};

const formatVersionDate = (value: string) =>
  new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));

const flattenCatalog = (
  items: ICatalogItem[],
  depth = 0
): Array<ICatalogItem & { depth: number }> =>
  items.flatMap(item => [
    { ...item, depth },
    ...flattenCatalog(item.subCatalog ?? [], depth + 1),
  ]);

const TaskDocumentEditor = ({
  taskId,
  taskName,
  taskKind,
  headerContent,
  sourceFile,
}: TaskDocumentEditorProps) => {
  const queryClient = useQueryClient();
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<CanvasEditor | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);
  const hasUnsavedChangesRef = useRef(false);
  const changeSequenceRef = useRef(0);
  const revisionRef = useRef<number | null>(null);
  const documentTitleRef = useRef(taskName);
  const docxZonesImportedRef = useRef(false);
  const docxSourceFileIdRef = useRef<number | null>(null);
  const importingDocxSourceRef = useRef<number | null>(null);
  const imageInputModeRef = useRef<'insert' | 'replace'>('insert');
  const durableToObjectAssetUrlRef = useRef(new Map<string, string>());
  const objectToDurableAssetUrlRef = useRef(new Map<string, string>());
  const pendingAssetLoadsRef = useRef(new Map<string, Promise<string>>());
  const assetLoaderDisposedRef = useRef(false);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveLatestRef = useRef<
    (createVersion?: boolean, notify?: boolean) => Promise<void>
  >(async () => undefined);
  const [editor, setEditor] = useState<CanvasEditor | null>(null);
  const [rangeStyle, setRangeStyle] = useState<Partial<IRangeStyle>>({
    font: 'Carlito',
    size: 14.6667,
    rowMargin: 1.15,
  });
  const [stats, setStats] = useState<EditorStats>({
    characters: 0,
    words: 0,
    pageCount: 1,
    currentPage: 1,
  });
  const [catalog, setCatalog] = useState<ICatalogItem[]>([]);
  const [saveState, setSaveState] = useState<SaveState>('loading');
  const [documentTitle, setDocumentTitle] = useState(taskName);
  const [isExporting, setIsExporting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNavigationPane, setShowNavigationPane] = useState(false);
  const [showRuler, setShowRuler] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [isBackstageOpen, setIsBackstageOpen] = useState(false);
  const [docxImportState, setDocxImportState] =
    useState<DocxImportState>('idle');

  const storageKey = useMemo(
    () => `dhyrium-task-document:${taskKind}:${taskId}`,
    [taskId, taskKind]
  );
  const documentName = useMemo(
    () => safeFileName(documentTitle.replace(/\.docx$/i, '')),
    [documentTitle]
  );

  const updateDocumentTitle = useCallback((title: string) => {
    documentTitleRef.current = title;
    setDocumentTitle(title);
  }, []);

  const markUnsavedChanges = useCallback(() => {
    changeSequenceRef.current += 1;
    hasUnsavedChangesRef.current = true;
  }, []);

  const loadProtectedAsset = useCallback(
    (durableUrl: string, kind: CanvasResourceKind) => {
      const resource = resolveCanvasResourceReference(durableUrl, kind, {
        taskKind,
        taskId,
      });
      if (!resource) {
        return Promise.reject(
          new Error('La referencia del recurso Canvas no es segura.')
        );
      }
      if (resource.type === 'inline') return Promise.resolve(resource.value);

      const cacheKey = resource.canonicalPath;
      const cached = durableToObjectAssetUrlRef.current.get(cacheKey);
      if (cached) return Promise.resolve(cached);
      const pending = pendingAssetLoadsRef.current.get(cacheKey);
      if (pending) return pending;

      const requestUrl = new globalThis.URL(
        resource.canonicalPath,
        `${URL}/`
      ).toString();

      const load = axiosInstance
        .get<Blob>(requestUrl, { responseType: 'blob' })
        .then(response => {
          const blob =
            response.data instanceof Blob
              ? response.data
              : new Blob([response.data as BlobPart]);
          const objectUrl = window.URL.createObjectURL(blob);
          if (assetLoaderDisposedRef.current) {
            window.URL.revokeObjectURL(objectUrl);
            throw new Error(
              'El editor fue cerrado antes de cargar el recurso.'
            );
          }
          durableToObjectAssetUrlRef.current.set(cacheKey, objectUrl);
          durableToObjectAssetUrlRef.current.set(durableUrl, objectUrl);
          objectToDurableAssetUrlRef.current.set(
            objectUrl,
            resource.canonicalPath
          );
          return objectUrl;
        })
        .finally(() => pendingAssetLoadsRef.current.delete(cacheKey));
      pendingAssetLoadsRef.current.set(cacheKey, load);
      return load;
    },
    [taskId, taskKind]
  );

  const hydrateProtectedAssets = useCallback(
    (value: IEditorData) =>
      mapCanvasResourceReferencesAsync(value, loadProtectedAsset),
    [loadProtectedAsset]
  );

  const serializeAssetUrl = useCallback(
    (value: string) => objectToDurableAssetUrlRef.current.get(value) ?? value,
    []
  );

  const serializeAssetUrlsInHtml = useCallback((html: string) => {
    const document = new DOMParser().parseFromString(html, 'text/html');
    document.querySelectorAll('img[src], video[src]').forEach(element => {
      const source = element.getAttribute('src');
      if (!source) return;
      const durableUrl = objectToDurableAssetUrlRef.current.get(source);
      if (durableUrl) element.setAttribute('src', durableUrl);
    });
    return document.body.innerHTML;
  }, []);

  const documentQuery = useQuery({
    queryKey: taskDocumentQueryKey(taskKind, taskId),
    queryFn: () => getTaskDocument(taskKind, taskId),
    staleTime: 15_000,
    retry: 1,
  });

  const versionsQuery = useQuery({
    queryKey: taskDocumentVersionsQueryKey(taskKind, taskId),
    queryFn: () => listTaskDocumentVersions(taskKind, taskId),
    enabled: versionsOpen || isBackstageOpen,
    staleTime: 5_000,
  });

  const saveMutation = useMutation({
    mutationFn: (input: SaveTaskDocumentInput) =>
      saveTaskDocument(taskKind, taskId, input),
  });

  const restoreMutation = useMutation({
    mutationFn: ({
      versionNumber,
      revision,
    }: {
      versionNumber: number;
      revision: number;
    }) => restoreTaskDocumentVersion(taskKind, taskId, versionNumber, revision),
  });

  const updateCachedDocument = useCallback(
    (document: TaskDocumentDto) => {
      revisionRef.current = document.revision;
      queryClient.setQueryData(
        taskDocumentQueryKey(taskKind, taskId),
        document
      );
    },
    [queryClient, taskId, taskKind]
  );

  const refreshEditorStats = useCallback(
    async (currentEditor: CanvasEditor) => {
      const text = currentEditor.command.getText().main ?? '';
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setStats(previous => ({
        ...previous,
        characters: text.length,
        words,
      }));
      setCatalog((await currentEditor.command.getCatalog()) ?? []);
    },
    []
  );

  const persistDocument = useCallback(
    (createVersion = false, notify = false) => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      const currentEditor = editorRef.current;
      if (!currentEditor || !hydratedRef.current) return Promise.resolve();
      setSaveState('saving');
      const html = currentEditor.command.getHTML() as EditorHtml;
      const text = currentEditor.command.getText();
      const input: SaveTaskDocumentInput = {
        title: documentTitleRef.current,
        contentJson: buildCanvasPayload(
          currentEditor,
          docxZonesImportedRef.current,
          docxSourceFileIdRef.current,
          serializeAssetUrl
        ),
        contentHtml: serializeAssetUrlsInHtml(html.main),
        plainText: [text.header, text.main, text.footer]
          .filter(Boolean)
          .join('\n'),
        expectedRevision: revisionRef.current,
        createVersion,
      };
      const savedSequence = changeSequenceRef.current;

      const queuedSave = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          try {
            const saved = await saveMutation.mutateAsync({
              ...input,
              expectedRevision: revisionRef.current,
            });
            updateCachedDocument(saved);
            const savedLatestChanges =
              changeSequenceRef.current === savedSequence;
            if (savedLatestChanges) {
              hasUnsavedChangesRef.current = false;
            }
            removeLegacyDocument(storageKey);
            setSaveState(savedLatestChanges ? 'saved' : 'saving');
            if (createVersion) {
              await queryClient.invalidateQueries({
                queryKey: taskDocumentVersionsQueryKey(taskKind, taskId),
              });
            }
            if (notify && savedLatestChanges) {
              SnackbarUtilities.success(
                createVersion
                  ? `Versión ${saved.versionNumber} guardada en Dhyrium.`
                  : 'Documento guardado en Dhyrium.'
              );
            }
          } catch (error) {
            const isConflict =
              isAxiosError(error) && error.response?.status === 409;
            setSaveState(isConflict ? 'conflict' : 'error');
            SnackbarUtilities.error(
              isConflict
                ? 'Otra persona guardó cambios. Recargue el documento antes de continuar.'
                : 'No se pudo guardar el documento en Dhyrium.'
            );
          }
        });

      saveQueueRef.current = queuedSave;
      return queuedSave;
    },
    [
      queryClient,
      saveMutation,
      serializeAssetUrl,
      serializeAssetUrlsInHtml,
      storageKey,
      taskId,
      taskKind,
      updateCachedDocument,
    ]
  );

  useEffect(() => {
    saveLatestRef.current = persistDocument;
  }, [persistDocument]);

  useEffect(() => {
    if (
      !documentQuery.isSuccess ||
      !canvasContainerRef.current ||
      editorRef.current
    )
      return;

    const remoteDocument = documentQuery.data;
    const remoteCanvasContent =
      remoteDocument && isCanvasDocument(remoteDocument.contentJson)
        ? remoteDocument.contentJson
        : null;
    docxZonesImportedRef.current =
      remoteCanvasContent?.settings?.docxZonesImported === true;
    docxSourceFileIdRef.current =
      remoteCanvasContent?.settings?.docxSourceFileId ?? null;
    const legacyDocument = readLegacyDocument(storageKey);
    const hasRemoteHtml = Boolean(remoteDocument?.contentHtml?.trim());
    const hasLegacyHtml = Boolean(legacyDocument?.trim());
    const editorOptions = createEditorOptions(remoteCanvasContent);
    const editorMargins = editorOptions.margins ?? DEFAULT_MARGINS;
    const editorInnerWidth =
      (editorOptions.width ?? DEFAULT_PAGE_WIDTH) -
      editorMargins[1] -
      editorMargins[3];
    const durableInitialData = remoteCanvasContent
      ? normalizeCanvasEditorData(remoteCanvasContent.data, editorInnerWidth)
      : hasRemoteHtml
      ? htmlToEditorData(remoteDocument!.contentHtml)
      : hasLegacyHtml
      ? htmlToEditorData(legacyDocument!)
      : EMPTY_DATA;
    const shouldMigrate =
      !remoteCanvasContent && (hasRemoteHtml || hasLegacyHtml);
    let cancelled = false;
    let currentEditor: CanvasEditor | null = null;

    const initializeEditor = async () => {
      const initialData = await hydrateProtectedAssets(durableInitialData);
      if (cancelled || !canvasContainerRef.current) return;

      currentEditor = new CanvasEditor(
        canvasContainerRef.current,
        initialData,
        editorOptions
      );
      editorRef.current = currentEditor;
      setEditor(currentEditor);
      updateDocumentTitle(remoteDocument?.title || taskName);
      revisionRef.current = remoteDocument?.revision ?? null;

      if (remoteCanvasContent?.settings?.columns) {
        currentEditor.command.executeSetColumns(
          remoteCanvasContent.settings.columns
        );
      }

      currentEditor.listener.rangeStyleChange = payload =>
        setRangeStyle(payload);
      currentEditor.listener.pageSizeChange = pageCount =>
        setStats(previous => ({
          ...previous,
          pageCount: Math.max(1, pageCount),
        }));
      currentEditor.listener.intersectionPageNoChange = pageNo =>
        setStats(previous => ({ ...previous, currentPage: pageNo + 1 }));
      currentEditor.listener.pageScaleChange = scale =>
        setZoom(Math.round(scale * 100));
      currentEditor.listener.saved = () =>
        void saveLatestRef.current(true, true);
      currentEditor.listener.contentChange = () => {
        if (!currentEditor) return;
        void refreshEditorStats(currentEditor);
        if (!hydratedRef.current) return;
        markUnsavedChanges();
        setSaveState('saving');
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => {
          void saveLatestRef.current(false, false);
        }, 1_200);
      };

      hydratedRef.current = true;
      setSaveState('saved');
      void refreshEditorStats(currentEditor);
      window.requestAnimationFrame(() =>
        canvasScrollRef.current?.scrollTo({ top: 0, left: 0 })
      );

      if (shouldMigrate) {
        markUnsavedChanges();
        window.setTimeout(() => void saveLatestRef.current(true, false), 0);
      }
    };

    void initializeEditor().catch(error => {
      if (cancelled) return;
      console.error('No se pudieron cargar los recursos protegidos.', error);
      setSaveState('error');
      SnackbarUtilities.error(
        'No se pudieron cargar los recursos protegidos del documento.'
      );
    });

    return () => {
      cancelled = true;
      if (hasUnsavedChangesRef.current) {
        void saveLatestRef.current(false, false);
      }
      hydratedRef.current = false;
      currentEditor?.destroy();
      editorRef.current = null;
      setEditor(null);
    };
    // La respuesta se usa solo para la hidratación inicial. Incluir `data` aquí
    // destruiría y reconstruiría el lienzo después de cada autoguardado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    documentQuery.isSuccess,
    hydrateProtectedAssets,
    markUnsavedChanges,
    refreshEditorStats,
    storageKey,
    taskName,
    updateDocumentTitle,
  ]);

  useEffect(() => {
    const currentEditor = editorRef.current;
    if (
      !currentEditor ||
      !sourceFile ||
      !documentQuery.isSuccess ||
      getTaskFileExtension(sourceFile) !== 'docx' ||
      importingDocxSourceRef.current === sourceFile.id ||
      (docxZonesImportedRef.current &&
        docxSourceFileIdRef.current === sourceFile.id)
    )
      return;

    let cancelled = false;
    importingDocxSourceRef.current = sourceFile.id;
    setDocxImportState('loading');

    const importSourceLayout = async () => {
      try {
        const response = await axiosInstance.get<ArrayBuffer>(
          getTaskFileUrl(sourceFile),
          {
            responseType: 'arraybuffer',
            headers: { noLoader: true },
          }
        );
        const layout = await extractDocxOoxmlLayout(
          response.data,
          image =>
            uploadTaskDocumentAsset(
              taskKind,
              taskId,
              image.blob,
              image.fileName
            )
        );
        if (cancelled || editorRef.current !== currentEditor) return;

        const options = currentEditor.command.getOptions();
        const innerWidth =
          options.width - options.margins[1] - options.margins[3];
        const importedZones = await hydrateProtectedAssets({
          main: EMPTY_DATA.main,
          header: layout.headerHtml
            ? normalizeImportedTables(
                getElementListByHTML(layout.headerHtml, { innerWidth }),
                innerWidth
              )
            : [],
          footer: layout.footerHtml
            ? normalizeImportedTables(
                getElementListByHTML(layout.footerHtml, { innerWidth }),
                innerWidth
              )
            : [],
        });
        if (cancelled || editorRef.current !== currentEditor) return;

        const currentData = currentEditor.command.getValue().data;
        currentEditor.command.executeSetValue(
          {
            ...currentData,
            header: importedZones.header,
            footer: importedZones.footer,
          },
          { isSetCursor: false }
        );
        if (layout.pageSetup) {
          currentEditor.command.executePaperSize(
            layout.pageSetup.width,
            layout.pageSetup.height
          );
          currentEditor.command.executeSetPaperMargin(
            layout.pageSetup.margins
          );
          currentEditor.command.executePaperDirection(
            layout.pageSetup.paperDirection === 'horizontal'
              ? PaperDirection.HORIZONTAL
              : PaperDirection.VERTICAL
          );
          currentEditor.command.executeUpdateOptions({
            header: {
              ...options.header,
              editable: true,
              top: layout.pageSetup.headerTop ?? options.header.top,
            },
            footer: {
              ...options.footer,
              editable: true,
              bottom: layout.pageSetup.footerBottom ?? options.footer.bottom,
            },
          });
        }

        docxZonesImportedRef.current = true;
        docxSourceFileIdRef.current = sourceFile.id;
        markUnsavedChanges();
        setDocxImportState('ready');
        await persistDocument(true, false);
        if (!cancelled) {
          SnackbarUtilities.success(
            layout.imageCount
              ? `Encabezado, pie e imágenes (${layout.imageCount}) importados del DOCX.`
              : 'Encabezado y pie importados del DOCX.'
          );
        }
      } catch (error) {
        if (cancelled) return;
        console.error('No se pudo importar el layout OOXML del DOCX.', error);
        setDocxImportState('error');
        SnackbarUtilities.error(
          'No se pudieron leer el encabezado, pie o las imágenes del DOCX.'
        );
      } finally {
        if (importingDocxSourceRef.current === sourceFile.id)
          importingDocxSourceRef.current = null;
      }
    };

    void importSourceLayout();
    return () => {
      cancelled = true;
    };
  }, [
    documentQuery.isSuccess,
    hydrateProtectedAssets,
    markUnsavedChanges,
    persistDocument,
    sourceFile,
    taskId,
    taskKind,
  ]);

  useEffect(() => {
    if (!documentQuery.isError) return;
    SnackbarUtilities.error(
      'No se pudo cargar el documento desde el servidor de Dhyrium.'
    );
  }, [documentQuery.isError]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === sectionRef.current;
      setIsFullscreen(active);
      document.body.classList.toggle('task-document-editor-fullscreen', active);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.body.classList.remove('task-document-editor-fullscreen');
    };
  }, []);

  useEffect(() => {
    const handleFullscreenEscape = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        document.fullscreenElement !== sectionRef.current
      )
        return;
      event.preventDefault();
      void document.exitFullscreen();
    };
    document.addEventListener('keydown', handleFullscreenEscape, true);
    return () =>
      document.removeEventListener('keydown', handleFullscreenEscape, true);
  }, []);

  useEffect(
    () => () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      assetLoaderDisposedRef.current = true;
      void saveQueueRef.current.finally(() => {
        objectToDurableAssetUrlRef.current.forEach((_durableUrl, objectUrl) =>
          window.URL.revokeObjectURL(objectUrl)
        );
        durableToObjectAssetUrlRef.current.clear();
        objectToDurableAssetUrlRef.current.clear();
        pendingAssetLoadsRef.current.clear();
      });
    },
    []
  );

  const handleToggleFullscreen = useCallback(async () => {
    if (!sectionRef.current) return;
    try {
      if (document.fullscreenElement === sectionRef.current)
        await document.exitFullscreen();
      else await sectionRef.current.requestFullscreen();
    } catch {
      SnackbarUtilities.error(
        'No se pudo abrir el documento en pantalla completa.'
      );
    }
  }, []);

  const handleDownloadWord = async () => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;
    setIsExporting(true);
    try {
      const options = currentEditor.command.getOptions();
      const html = currentEditor.command.getHTML() as EditorHtml;
      const margins = options.margins ?? DEFAULT_MARGINS;
      const document = await asBlob(
        getDocumentHtml(documentTitle, html, options),
        {
          orientation:
            options.paperDirection === PaperDirection.HORIZONTAL
              ? 'landscape'
              : 'portrait',
          margins: {
            top: millimetersToTwips(pixelsToMillimeters(margins[0])),
            right: millimetersToTwips(pixelsToMillimeters(margins[1])),
            bottom: millimetersToTwips(pixelsToMillimeters(margins[2])),
            left: millimetersToTwips(pixelsToMillimeters(margins[3])),
          },
        }
      );
      const blob =
        document instanceof Blob
          ? document
          : new Blob([new Uint8Array(document)], {
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
      downloadBlob(blob, `${documentName}.docx`);
      SnackbarUtilities.success(
        'Copia DOCX descargada con compatibilidad básica.'
      );
    } catch {
      SnackbarUtilities.error('No se pudo generar la copia DOCX.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = () => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;
    const options = currentEditor.command.getOptions();
    const html = currentEditor.command.getHTML() as EditorHtml;
    const margins = options.margins ?? DEFAULT_MARGINS;
    const pdfOptions: Html2PdfOptions = {
      margin: margins.map(pixelsToMillimeters) as [
        number,
        number,
        number,
        number
      ],
      filename: `${documentName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      pagebreak: { mode: 'avoid-all' },
      jsPDF: {
        unit: 'px',
        format: options.width === 816 ? 'letter' : 'a4',
        orientation:
          options.paperDirection === PaperDirection.HORIZONTAL ? 'l' : 'p',
      },
    };
    html2pdf()
      .set(pdfOptions)
      .from(getDocumentHtml(documentTitle, html, options))
      .save();
  };

  const handlePrint = () => {
    void editorRef.current?.command.executePrint();
  };

  const handleImageSelected = async (file: File | undefined) => {
    const currentEditor = editorRef.current;
    if (!file || !currentEditor) return;
    if (
      !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(
        file.type
      )
    ) {
      SnackbarUtilities.warning('Use una imagen JPG, PNG, GIF o WebP.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      SnackbarUtilities.warning('La imagen debe pesar menos de 8 MB.');
      return;
    }
    try {
      const imageUrl = await uploadTaskDocumentAsset(
        taskKind,
        taskId,
        file,
        file.name
      );
      const value = await loadProtectedAsset(imageUrl, 'image');
      if (imageInputModeRef.current === 'replace') {
        currentEditor.command.executeReplaceImageElement(value);
        SnackbarUtilities.success('Imagen reemplazada en el documento.');
        return;
      }
      const image = new Image();
      image.src = value;
      await image.decode();
      const options = currentEditor.command.getOptions();
      const maxWidth = options.width - options.margins[1] - options.margins[3];
      const ratio = Math.min(1, maxWidth / image.naturalWidth);
      currentEditor.command.executeImage({
        value,
        width: Math.round(image.naturalWidth * ratio),
        height: Math.round(image.naturalHeight * ratio),
      });
    } catch {
      SnackbarUtilities.error(
        imageInputModeRef.current === 'replace'
          ? 'No se pudo reemplazar la imagen seleccionada.'
          : 'No se pudo insertar la imagen en el documento.'
      );
    } finally {
      imageInputModeRef.current = 'insert';
    }
  };

  const handleVideoSelected = async (file: File | undefined) => {
    const currentEditor = editorRef.current;
    if (!file || !currentEditor) return;
    if (!['video/mp4', 'video/webm', 'video/ogg'].includes(file.type)) {
      SnackbarUtilities.warning('Use un video MP4, WebM u OGG.');
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      SnackbarUtilities.warning('El video debe pesar menos de 50 MB.');
      return;
    }
    try {
      const mediaUrl = await uploadTaskDocumentAsset(
        taskKind,
        taskId,
        file,
        file.name
      );
      const value = await loadProtectedAsset(mediaUrl, 'video');
      currentEditor.command.executeInsertElementList([
        {
          type: ElementType.BLOCK,
          value: '',
          width: 560,
          height: 315,
          block: {
            type: BlockType.VIDEO,
            videoBlock: { src: value },
          },
        },
      ]);
    } catch {
      SnackbarUtilities.error(
        'No se pudo insertar el video local en el documento.'
      );
    }
  };

  const handleCreateDocument = async (template: BackstageTemplate) => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;
    await persistDocument(true, false);
    const options = currentEditor.command.getOptions();
    const innerWidth = options.width - options.margins[1] - options.margins[3];
    const safeHtml = String(
      DOMPurify.sanitize(BACKSTAGE_TEMPLATE_HTML[template], {
        USE_PROFILES: { html: true },
      })
    );
    currentEditor.command.executeSetValue(
      { main: getElementListByHTML(safeHtml, { innerWidth }) },
      { isSetCursor: true }
    );
    const suffix = {
      blank: 'Documento en blanco',
      'technical-report': 'Informe técnico',
      memorandum: 'Memorando',
      'meeting-minutes': 'Acta de reunión',
    }[template];
    updateDocumentTitle(`${suffix} - ${taskName}.docx`);
    markUnsavedChanges();
    await persistDocument(true, true);
    window.requestAnimationFrame(() =>
      canvasScrollRef.current?.scrollTo({ top: 0, left: 0 })
    );
  };

  const handleSaveAs = (title: string) => {
    const normalizedTitle = title.trim().slice(0, 300);
    if (!normalizedTitle) return;
    updateDocumentTitle(normalizedTitle);
    markUnsavedChanges();
    void persistDocument(true, true);
  };

  const applyRemoteDocument = useCallback(
    async (document: TaskDocumentDto) => {
      const currentEditor = editorRef.current;
      if (!currentEditor) return;
      if (isCanvasDocument(document.contentJson)) {
        const options = currentEditor.command.getOptions();
        const innerWidth =
          options.width - options.margins[1] - options.margins[3];
        currentEditor.command.executeSetValue(
          await hydrateProtectedAssets(
            normalizeCanvasEditorData(document.contentJson.data, innerWidth)
          ),
          { isSetCursor: true }
        );
        const settings = document.contentJson.settings;
        if (settings?.width && settings?.height)
          currentEditor.command.executePaperSize(
            settings.width,
            settings.height
          );
        if (settings?.margins)
          currentEditor.command.executeSetPaperMargin(settings.margins);
        if (settings?.paperDirection)
          currentEditor.command.executePaperDirection(
            settings.paperDirection as PaperDirection
          );
        if (settings?.pageMode)
          currentEditor.command.executePageMode(settings.pageMode as PageMode);
        currentEditor.command.executeSetColumns(settings?.columns ?? null);
      } else {
        currentEditor.command.executeSetValue(
          await hydrateProtectedAssets(htmlToEditorData(document.contentHtml)),
          { isSetCursor: true }
        );
      }
      window.requestAnimationFrame(() =>
        canvasScrollRef.current?.scrollTo({ top: 0, left: 0 })
      );
      updateDocumentTitle(document.title);
      updateCachedDocument(document);
      changeSequenceRef.current += 1;
      hasUnsavedChangesRef.current = false;
      setSaveState('saved');
    },
    [hydrateProtectedAssets, updateCachedDocument, updateDocumentTitle]
  );

  const handleReloadDocument = async () => {
    const result = await documentQuery.refetch();
    if (!result.data) return;
    await applyRemoteDocument(result.data);
    SnackbarUtilities.success('Documento actualizado desde Dhyrium.');
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (revisionRef.current === null) return;
    try {
      const restored = await restoreMutation.mutateAsync({
        versionNumber,
        revision: revisionRef.current,
      });
      await applyRemoteDocument(restored);
      await queryClient.invalidateQueries({
        queryKey: taskDocumentVersionsQueryKey(taskKind, taskId),
      });
      SnackbarUtilities.success(
        `La versión ${versionNumber} se restauró como una versión nueva.`
      );
      setVersionsOpen(false);
    } catch (error) {
      setSaveState(
        isAxiosError(error) && error.response?.status === 409
          ? 'conflict'
          : 'error'
      );
      SnackbarUtilities.error('No se pudo restaurar la versión seleccionada.');
    }
  };

  const toggleRuler = () => {
    const next = !showRuler;
    setShowRuler(next);
    editorRef.current?.command.executeToggleRuler(next);
  };

  const toggleNavigation = async () => {
    const next = !showNavigationPane;
    setShowNavigationPane(next);
    if (next && editorRef.current)
      setCatalog((await editorRef.current.command.getCatalog()) ?? []);
  };

  const setEditorZoom = (value: number) => {
    editorRef.current?.command.executePageScale(value / 100);
    setZoom(value);
  };

  const displayedSaveState =
    documentQuery.isError && saveState === 'loading' ? 'error' : saveState;
  const statusText = {
    loading: 'Cargando desde Dhyrium…',
    saving: 'Guardando en Dhyrium…',
    saved: documentQuery.data
      ? `Guardado en Dhyrium · versión ${documentQuery.data.versionNumber}`
      : 'Listo para guardar en Dhyrium',
    error: 'No se pudo sincronizar con Dhyrium',
    conflict: 'Hay cambios de otra persona; debe recargar',
  }[displayedSaveState];
  const docxImportMessage = !sourceFile
    ? 'Sin archivo DOCX seleccionado; el documento original permanece protegido.'
    : docxImportState === 'loading'
    ? 'Leyendo encabezado, pie e imágenes del DOCX…'
    : docxImportState === 'ready'
    ? 'Encabezado, pie e imágenes del DOCX importados; original protegido.'
    : docxImportState === 'error'
    ? 'No se pudo importar el layout del DOCX; recargue para reintentar.'
    : 'Preparando la lectura del DOCX…';

  const handleSurfaceNavigation = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'F6') return;
    const root = sectionRef.current;
    if (!root) return;
    const surfaces = Array.from(
      root.querySelectorAll<HTMLElement>('[data-writer-focus-surface]')
    ).filter(surface => surface.offsetParent !== null);
    if (surfaces.length === 0) return;
    const current = surfaces.findIndex(surface =>
      surface.contains(window.document.activeElement)
    );
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex =
      current < 0
        ? 0
        : (current + direction + surfaces.length) % surfaces.length;
    const target = surfaces[nextIndex];
    event.preventDefault();
    if (target.dataset.writerFocusSurface === 'ribbon') {
      (
        target.querySelector<HTMLElement>(
          '[role="tab"][aria-selected="true"]'
        ) ?? target
      ).focus();
    } else {
      target.focus();
    }
  };

  return (
    <section
      ref={sectionRef}
      className={
        'task-document-editor task-document-editor--canvas' +
        (isFullscreen ? ' task-document-editor--fullscreen' : '')
      }
      aria-label="Editor del documento de tarea"
      data-editor-engine="canvas-editor"
      data-writer-product="Dhyrium Writer · editor web independiente"
      onKeyDown={handleSurfaceNavigation}
    >
      <header
        className="task-document-editor__header"
        data-writer-focus-surface="header"
        tabIndex={-1}
      >
        <div className="task-document-editor__identity">
          <p>Dhyrium Writer · editor web independiente</p>
          <span
            className="task-document-editor__document-title"
            title={documentTitle}
          >
            {documentTitle}
          </span>
        </div>

        {headerContent && (
          <div className="task-document-editor__header-content">
            {headerContent}
          </div>
        )}

        <div className="task-document-editor__actions">
          {(saveState === 'conflict' || saveState === 'error') && (
            <AppButton
              size="xs"
              variant="outline"
              onClick={() => void handleReloadDocument()}
            >
              <RefreshCw /> Recargar
            </AppButton>
          )}
          <Popover open={versionsOpen} onOpenChange={setVersionsOpen}>
            <PopoverTrigger asChild>
              <AppButton
                size="icon-xs"
                variant="ghost"
                aria-label="Historial de versiones"
                title="Historial de versiones"
              >
                <History />
              </AppButton>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="border-b px-3 py-2">
                <p className="text-sm font-semibold">Versiones del documento</p>
                <p className="text-xs text-muted-foreground">
                  Restaurar siempre crea una versión nueva.
                </p>
              </div>
              <div className="max-h-72 overflow-y-auto p-2">
                {versionsQuery.isLoading && (
                  <div className="flex items-center gap-2 p-3 text-xs">
                    <LoaderCircle className="animate-spin" /> Cargando…
                  </div>
                )}
                {!versionsQuery.isLoading && !versionsQuery.data?.length && (
                  <p className="p-3 text-xs text-muted-foreground">
                    Todavía no hay versiones guardadas.
                  </p>
                )}
                {versionsQuery.data?.map(version => (
                  <button
                    key={version.versionNumber}
                    type="button"
                    className="task-document-editor__version"
                    disabled={restoreMutation.isPending}
                    onClick={() =>
                      void handleRestoreVersion(version.versionNumber)
                    }
                  >
                    <span>
                      <strong>Versión {version.versionNumber}</strong>
                      <small>{formatVersionDate(version.createdAt)}</small>
                    </span>
                    <small>{version.createdBy.name}</small>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <AppButton
            size="xs"
            variant="ghost"
            onClick={() => void persistDocument(true, true)}
          >
            <Save /> Guardar
          </AppButton>
          <AppButton
            size="xs"
            variant="outline"
            disabled={isExporting}
            title="Descargar copia DOCX con compatibilidad básica"
            onClick={() => void handleDownloadWord()}
          >
            <FileText /> DOCX
          </AppButton>
          <AppButton size="xs" variant="outline" onClick={handleDownloadPdf}>
            <Download /> PDF
          </AppButton>
          <AppButton
            size="icon-xs"
            variant="ghost"
            aria-label="Imprimir documento"
            title="Imprimir"
            onClick={handlePrint}
          >
            <Printer />
          </AppButton>
          <AppButton
            size="icon-xs"
            variant="ghost"
            aria-label={isFullscreen ? 'Restaurar vista' : 'Pantalla completa'}
            title={
              isFullscreen
                ? 'Restaurar vista'
                : 'Pantalla completa (Esc para salir)'
            }
            onClick={() => void handleToggleFullscreen()}
          >
            {isFullscreen ? <Minimize2 /> : <Maximize2 />}
          </AppButton>
        </div>
      </header>

      <CanvasWordRibbon
        document={documentQuery.data}
        documentTitle={documentTitle}
        editor={editor}
        rangeStyle={rangeStyle}
        isExporting={isExporting}
        isFullscreen={isFullscreen}
        isVersionsLoading={versionsQuery.isLoading}
        saveStatus={statusText}
        showNavigationPane={showNavigationPane}
        showRuler={showRuler}
        sourceFile={sourceFile}
        taskId={taskId}
        taskKind={taskKind}
        versions={versionsQuery.data ?? []}
        zoom={zoom}
        wordCount={stats.words}
        onBackstageChange={setIsBackstageOpen}
        onCreateDocument={template => void handleCreateDocument(template)}
        onDownloadPdf={handleDownloadPdf}
        onDownloadWord={() => void handleDownloadWord()}
        onInsertImage={() => {
          imageInputModeRef.current = 'insert';
          imageInputRef.current?.click();
        }}
        onReplaceImage={() => {
          imageInputModeRef.current = 'replace';
          imageInputRef.current?.click();
        }}
        onInsertVideo={() => videoInputRef.current?.click()}
        onPrint={handlePrint}
        onRangeStylePatch={patch =>
          setRangeStyle(previous => ({ ...previous, ...patch }))
        }
        onReload={() => void handleReloadDocument()}
        onRestoreVersion={versionNumber =>
          void handleRestoreVersion(versionNumber)
        }
        onSave={() => void persistDocument(true, true)}
        onSaveAs={handleSaveAs}
        onToggleFullscreen={() => void handleToggleFullscreen()}
        onToggleNavigationPane={() => void toggleNavigation()}
        onToggleRuler={toggleRuler}
        onZoomChange={setEditorZoom}
      />

      {!isBackstageOpen && (
        <div
          className="task-document-editor__compatibility-bar"
          data-testid="dhyrium-writer-native-status"
          role="status"
          aria-label="Estado del editor web independiente"
          aria-live="polite"
        >
          <span className="task-document-editor__engine-state">
            <i aria-hidden="true" />
            Motor Dhyrium activo
          </span>
          <span
            className={`task-document-editor__save-state is-${displayedSaveState}`}
          >
            {statusText}
          </span>
          <span
            className={`task-document-editor__docx-import-status is-${docxImportState}`}
            data-testid="docx-import-status-message"
            title={docxImportMessage}
          >
            {docxImportMessage}
          </span>
          <span
            className="task-document-editor__docx-compatibility"
            title="La exportación DOCX actual ofrece compatibilidad básica y no garantiza round-trip fiel."
          >
            Exportar DOCX · compatibilidad básica
          </span>
        </div>
      )}

      {!isBackstageOpen && (
        <div
          className="task-document-editor__workspace-shell"
          data-writer-focus-surface="document"
          tabIndex={-1}
        >
          {showNavigationPane && (
            <aside
              className="task-document-editor__navigation"
              aria-label="Navegación del documento"
            >
              <strong>Navegación</strong>
              <small>Títulos del documento</small>
              <div>
                {catalog.length ? (
                  flattenCatalog(catalog).map(item => (
                    <button
                      key={item.id}
                      type="button"
                      style={{ paddingLeft: 10 + item.depth * 14 }}
                      onClick={() =>
                        editorRef.current?.command.executeLocationCatalog(
                          item.id
                        )
                      }
                    >
                      {item.name}
                      <small>{item.pageNo + 1}</small>
                    </button>
                  ))
                ) : (
                  <p>
                    Use Título 1, Título 2 o Título 3 para crear la navegación.
                  </p>
                )}
              </div>
            </aside>
          )}
          <div
            ref={canvasScrollRef}
            className="task-document-editor__canvas-scroll"
          >
            {documentQuery.isLoading && (
              <div className="task-document-editor__loading">
                <LoaderCircle className="animate-spin" /> Cargando documento
                Dhyrium…
              </div>
            )}
            <div
              ref={canvasContainerRef}
              className="task-document-editor__canvas"
            />
          </div>
        </div>
      )}

      {!isBackstageOpen && (
        <footer
          className="task-document-editor__statusbar"
          data-writer-focus-surface="statusbar"
          tabIndex={-1}
        >
          <span>{`Página ${stats.currentPage} de ${stats.pageCount}`}</span>
          <span>{stats.words} palabras</span>
          <span>{stats.characters} caracteres</span>
          <span className="task-document-editor__statusbar-spacer" />
          <span>Español (Perú)</span>
          <span>{zoom}%</span>
        </footer>
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={event => {
          void handleImageSelected(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg"
        className="sr-only"
        tabIndex={-1}
        onChange={event => {
          void handleVideoSelected(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </section>
  );
};

export default TaskDocumentEditor;

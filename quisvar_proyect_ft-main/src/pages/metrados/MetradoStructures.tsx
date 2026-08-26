import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type UIEvent,
} from 'react';
import { useSelector } from 'react-redux';
import {
  ArrowDown,
  ArrowUp,
  IndentDecrease,
  IndentIncrease,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import type { RootState } from '@/store/store.types';
import { axiosInstance } from '@/services/axiosInstance';
import './metradoStructures.css';

type ViewMode =
  | 'resumen'
  | 'general'
  | 'acero'
  | 'platformado'
  | 'configuracion'
  | 'validaciones'
  | 'exportaciones'
  | 'historial';

type CalculationType = 'general' | 'acero' | 'platformado' | 'manual' | 'mixto';
type CatalogView = 'todos' | 'titulos' | 'general' | 'acero' | 'platformado';
type ImportDecision = 'replace' | 'new' | 'cancel';
type ValidationStatus =
  | 'borrador'
  | 'pendiente_validacion'
  | 'observado'
  | 'validado'
  | 'aprobado';
type LineAssignmentKind = 'general' | 'acero';
type DetailInsertionTarget = {
  kind: LineAssignmentKind;
  blockId: string;
  itemId: string;
  lineId?: string;
};

interface WorkItem {
  id: string;
  itemCode: string;
  description: string;
  unit: string;
  level: number;
  calculationType: CalculationType;
  isHeading?: boolean;
}

type CatalogItemDraft = Pick<
  WorkItem,
  | 'itemCode'
  | 'description'
  | 'unit'
  | 'level'
  | 'calculationType'
  | 'isHeading'
>;

interface Block {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

interface MeasurementLine {
  id: string;
  itemId: string;
  blockId: string;
  description: string;
  times: number | '';
  unitCount: number | '';
  length: number | '';
  width: number | '';
  height: number | '';
  area: number | '';
  observation: string;
  validationStatus: ValidationStatus;
  rowVersion: number;
  sourceSheet?: string;
  sourceRow?: number;
  formulas?: Partial<
    Record<
      'times' | 'unitCount' | 'length' | 'width' | 'height' | 'area',
      string
    >
  >;
}

interface RebarLine {
  id: string;
  itemId: string;
  blockId: string;
  description: string;
  design: string;
  diameter: string;
  sameElements: number | '';
  piecesPerElement: number | '';
  pieceLength: number | '';
  observation: string;
  validationStatus: ValidationStatus;
  rowVersion: number;
  sourceSheet?: string;
  sourceRow?: number;
  formulas?: Partial<
    Record<'sameElements' | 'piecesPerElement' | 'pieceLength', string>
  >;
}

interface MetradoAttachmentAnchor {
  sheetName: string;
  editAs?: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  nativeStartRow?: number;
  nativeStartCol?: number;
  nativeEndRow?: number;
  nativeEndCol?: number;
  rowHeight?: number;
}

interface MetradoAttachment {
  id: string;
  kind: 'image';
  scope: 'measurement' | 'rebar' | 'project';
  blockId?: string;
  itemId?: string;
  lineId?: string;
  name: string;
  mimeType: string;
  extension: string;
  dataUrl: string;
  caption?: string;
  sourceSheet?: string;
  sourceRow?: number;
  anchor?: MetradoAttachmentAnchor;
  createdAt: string;
}

const getExcelImageExtension = (extension: string): 'jpeg' | 'png' | 'gif' => {
  const normalized = extension.replace('.', '').toLowerCase();
  if (normalized === 'jpg' || normalized === 'jpeg') return 'jpeg';
  if (normalized === 'gif') return 'gif';
  return 'png';
};

interface PlatformadoLine {
  id: string;
  alignment: string;
  progressive: string;
  cutArea: number | '';
  fillArea: number | '';
  distance: number | '';
  observation: string;
  validationStatus: ValidationStatus;
}

interface AuditEntry {
  id: string;
  entity: string;
  detail: string;
  createdAt: string;
}

interface FileHistoryEntry {
  id: string;
  name: string;
  size: number;
  type: string;
  action: 'referencia' | 'importacion_pendiente' | 'exportacion';
  createdAt: string;
}

interface ValidationIssue {
  id: string;
  sheetName: string;
  cellReference: string;
  issueType: string;
  originalFormula: string;
  suggestedFix: string;
  status: 'pendiente' | 'corregible' | 'resuelto';
  affectedCells?: number;
}

interface ExportEntry {
  id: string;
  filename: string;
  status: 'generado' | 'fallido';
  generatedAt: string;
}

interface MetradoDraft {
  projectName: string;
  institution: string;
  location: string;
  code: string;
  status: string;
  decimalPrecision: number;
  headerImage?: string;
  blocks: Block[];
  items: WorkItem[];
  measurementLines: MeasurementLine[];
  rebarLines: RebarLine[];
  platformadoLines: PlatformadoLine[];
  attachments: MetradoAttachment[];
  validationIssues: ValidationIssue[];
  fileHistory: FileHistoryEntry[];
  exports: ExportEntry[];
  audit: AuditEntry[];
}

interface MetradoProjectRecord {
  id: string;
  name: string;
  code: string;
  institution: string;
  location: string;
  updatedAt: string;
  draft: MetradoDraft;
}

type BackendCalculationType =
  | 'GENERAL'
  | 'ACERO'
  | 'PLATAFORMADO'
  | 'MANUAL'
  | 'MIXTO';
type BackendLineStatus =
  | 'DRAFT'
  | 'PENDING_VALIDATION'
  | 'OBSERVED'
  | 'VALIDATED';
type BackendIssueStatus = 'PENDING' | 'FIXABLE' | 'RESOLVED' | 'IGNORED';

interface BackendMetradoBlock {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

interface BackendMetradoItem {
  id: string;
  itemCode: string;
  description: string;
  unit?: string | null;
  level: number;
  calculationType: BackendCalculationType;
  isHeading: boolean;
}

interface BackendMeasurementLine {
  id: string;
  metradoItemId: string;
  metradoBlockId: string;
  description: string;
  times?: number | string | null;
  unitCount?: number | string | null;
  length?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  area?: number | string | null;
  validationStatus: BackendLineStatus;
  sourceSheet?: string | null;
  sourceRow?: number | null;
  formulas?: unknown;
}

interface BackendRebarLine {
  id: string;
  metradoItemId: string;
  metradoBlockId: string;
  description: string;
  design?: string | null;
  diameter?: string | null;
  sameElements?: number | string | null;
  piecesPerElement?: number | string | null;
  pieceLength?: number | string | null;
  validationStatus: BackendLineStatus;
  sourceSheet?: string | null;
  sourceRow?: number | null;
  formulas?: unknown;
}

interface BackendPlatformadoLine {
  id: string;
  alignment?: string | null;
  progressive: string;
  cutArea?: number | string | null;
  fillArea?: number | string | null;
  distance?: number | string | null;
  validationStatus: BackendLineStatus;
}

interface BackendMetradoAttachment {
  id: string;
  metradoBlockId?: string | null;
  metradoItemId?: string | null;
  metradoMeasurementLineId?: string | null;
  metradoRebarLineId?: string | null;
  kind: string;
  scope: string;
  name: string;
  mimeType: string;
  extension: string;
  dataUrl: string;
  caption?: string | null;
  sourceSheet?: string | null;
  sourceRow?: number | null;
  anchor?: unknown;
  createdAt?: string | null;
}

interface BackendValidationIssue {
  id: string;
  sheetName: string;
  cellReference?: string | null;
  issueType: string;
  originalFormula?: string | null;
  suggestedFix?: string | null;
  status: BackendIssueStatus;
  affectedCells?: number | null;
}

interface BackendMetradoProject {
  id: string;
  name: string;
  code: string;
  uniqueCode?: string | null;
  executingUnit?: string | null;
  educationalInstitution?: string | null;
  location?: string | null;
  decimalPrecision?: number;
  blocks: BackendMetradoBlock[];
  items: BackendMetradoItem[];
  measurementLines: BackendMeasurementLine[];
  rebarLines: BackendRebarLine[];
  platformadoLines?: BackendPlatformadoLine[];
  attachments?: BackendMetradoAttachment[];
  validations?: BackendValidationIssue[];
}

interface BackendMetradoImportResponse {
  projectId: string;
  imported: {
    blocks: number;
    items: number;
    measurementLines: number;
    rebarLines: number;
    platformadoLines?: number;
    attachments?: number;
    refIssues: number;
    repairedRefIssues: number;
    pendingRefIssues: number;
  };
  project: BackendMetradoProject | null;
}

const STORAGE_KEY = 'dhyrium:metrado-estructuras:draft';
const PROJECTS_STORAGE_KEY = 'dhyrium:metrado-estructuras:projects';
const ACTIVE_PROJECT_KEY = 'dhyrium:metrado-estructuras:active-project';

const InfoHint = ({ text }: { text: string }) => (
  <span className="metrado-info-hint" aria-label={text}>
    ?<span role="tooltip">{text}</span>
  </span>
);

const createCatalogItemDraft = (item?: WorkItem): CatalogItemDraft => ({
  itemCode: item?.itemCode ?? '',
  description: item?.description ?? '',
  unit: item?.unit ?? '',
  level: item?.level ?? 1,
  calculationType: item?.calculationType ?? 'general',
  isHeading: Boolean(item?.isHeading),
});

const rebarWeights: Record<string, number> = {
  '1/4"': 0.222,
  '8mm': 0.371,
  '3/8"': 0.56,
  '1/2"': 0.994,
  '5/8"': 1.552,
  '3/4"': 2.235,
  '1"': 3.735,
};

const defaultBlocks: Block[] = [
  {
    id: 'block-a',
    code: 'A',
    name: 'Guardiania, circulacion y SSHH',
    active: true,
  },
  {
    id: 'block-b',
    code: 'B',
    name: 'Aulas pedagogicas y circulacion',
    active: true,
  },
  {
    id: 'block-c',
    code: 'C',
    name: 'Escalera 01 y ambientes generales',
    active: true,
  },
  {
    id: 'block-d',
    code: 'D',
    name: 'Aulas y corredor posterior',
    active: true,
  },
  { id: 'block-e', code: 'E', name: 'SSHH y duchas', active: true },
  { id: 'block-f', code: 'F', name: 'Escalera 02 y circulacion', active: true },
  {
    id: 'block-g',
    code: 'G',
    name: 'Aulas, biblioteca y servicios',
    active: true,
  },
  { id: 'block-h', code: 'H', name: 'Duchas y vestidores', active: true },
  { id: 'block-i', code: 'I', name: 'SUM, comedor y cocina', active: true },
  { id: 'block-j', code: 'J', name: 'Cuarto electrico', active: true },
  { id: 'block-k', code: 'K', name: 'Escalera 03', active: true },
  { id: 'block-l', code: 'L', name: 'Tanque elevado', active: true },
  {
    id: 'block-m',
    code: 'M',
    name: 'Ingreso principal, losa y rampas',
    active: true,
  },
  { id: 'block-n', code: 'N', name: 'Cerco perimetrico', active: true },
  { id: 'block-o', code: 'O', name: 'Rampa con gradas', active: true },
  {
    id: 'block-p',
    code: 'P',
    name: 'Rampa con cobertura ligera',
    active: true,
  },
  { id: 'block-mc', code: 'M.C.', name: 'Muros de contencion', active: true },
];

const initialDraft: MetradoDraft = {
  projectName: 'IE AGROPECUARIO OCCORO CACHAYA',
  institution: 'Dhyrium SAA',
  location: 'Puno',
  code: 'MET-EST-001',
  status: 'borrador',
  decimalPrecision: 2,
  headerImage: '',
  blocks: defaultBlocks,
  attachments: [],
  items: [
    {
      id: 'item-01',
      itemCode: '02',
      description: 'Estructuras',
      unit: '',
      level: 1,
      calculationType: 'mixto',
      isHeading: true,
    },
    {
      id: 'item-01-01',
      itemCode: '02.01',
      description: 'Movimiento de tierras',
      unit: '',
      level: 2,
      calculationType: 'mixto',
      isHeading: true,
    },
    {
      id: 'item-01-02',
      itemCode: '02.01.01',
      description: 'Nivelacion de terreno',
      unit: '',
      level: 3,
      calculationType: 'general',
      isHeading: true,
    },
    {
      id: 'item-01-03',
      itemCode: '02.01.01.01',
      description: 'Nivelacion de terreno',
      unit: 'm2',
      level: 4,
      calculationType: 'general',
    },
    {
      id: 'item-01-04',
      itemCode: '02.01.02',
      description: 'Excavaciones',
      unit: '',
      level: 3,
      calculationType: 'general',
      isHeading: true,
    },
    {
      id: 'item-01-05',
      itemCode: '02.01.02.01',
      description: 'Excavaciones masivas',
      unit: '',
      level: 4,
      calculationType: 'general',
      isHeading: true,
    },
    {
      id: 'item-01-06',
      itemCode: '02.01.02.01.01',
      description: 'Excavacion de zanjas para zapatas c/maquinaria',
      unit: 'm3',
      level: 5,
      calculationType: 'general',
    },
    {
      id: 'item-01-07',
      itemCode: '02.01.02.01.03',
      description:
        'Excavacion de zanjas para vigas de cimentacion c/maquinaria',
      unit: 'm3',
      level: 5,
      calculationType: 'general',
    },
    {
      id: 'item-01-08',
      itemCode: '02.01.03.01',
      description:
        'Corte masivo c/maquinaria para plataforma en terreno natural',
      unit: 'm3',
      level: 4,
      calculationType: 'platformado',
    },
    {
      id: 'item-02',
      itemCode: '02.03',
      description: 'Obras de concreto armado',
      unit: '',
      level: 2,
      calculationType: 'mixto',
      isHeading: true,
    },
    {
      id: 'item-02-01',
      itemCode: '02.03.01',
      description: 'Zapatas',
      unit: '',
      level: 3,
      calculationType: 'mixto',
      isHeading: true,
    },
    {
      id: 'item-02-02',
      itemCode: '02.03.01.01.02',
      description:
        'Acero de refuerzo Fy=4200 kg/cm2 para zapatas Fc=210 kg/cm2',
      unit: 'kg',
      level: 4,
      calculationType: 'acero',
    },
  ],
  measurementLines: [
    {
      id: 'ml-1',
      itemId: 'item-01-03',
      blockId: 'block-a',
      description: 'Area total del bloque',
      times: 1,
      unitCount: '',
      length: 2.4,
      width: 1.8,
      height: '',
      area: 241.17,
      observation: '',
      validationStatus: 'borrador',
      rowVersion: 1,
    },
    {
      id: 'ml-2',
      itemId: 'item-01-06',
      blockId: 'block-a',
      description: 'ZA-A-01',
      times: 2,
      unitCount: '',
      length: 2.2,
      width: 1.5,
      height: 2.4,
      area: '',
      observation: '',
      validationStatus: 'borrador',
      rowVersion: 1,
    },
    {
      id: 'ml-3',
      itemId: 'item-01-06',
      blockId: 'block-b',
      description: 'ZA-B-01',
      times: 2,
      unitCount: '',
      length: 2,
      width: 1.5,
      height: 2.4,
      area: '',
      observation: '',
      validationStatus: 'borrador',
      rowVersion: 1,
    },
    {
      id: 'ml-4',
      itemId: 'item-01-07',
      blockId: 'block-a',
      description: 'Entre B-D',
      times: 2,
      unitCount: '',
      length: 1.78,
      width: 0.6,
      height: 2.4,
      area: '',
      observation: 'Considerar 0.60m de ancho para encofrado de viga',
      validationStatus: 'borrador',
      rowVersion: 1,
    },
    {
      id: 'ml-5',
      itemId: 'item-01-07',
      blockId: 'block-a',
      description: 'Descuento de vacio',
      times: -1,
      unitCount: '',
      length: 1.2,
      width: 0.6,
      height: 2.4,
      area: '',
      observation: '',
      validationStatus: 'borrador',
      rowVersion: 1,
    },
  ],
  rebarLines: [
    {
      id: 'rl-1',
      itemId: 'item-02-02',
      blockId: 'block-a',
      description: 'para refuerzo longitudinal inferior',
      design: 'ZA-A-01',
      diameter: '5/8"',
      sameElements: 2,
      piecesPerElement: 11,
      pieceLength: 2.56,
      observation: '',
      validationStatus: 'borrador',
      rowVersion: 1,
    },
    {
      id: 'rl-2',
      itemId: 'item-02-02',
      blockId: 'block-b',
      description: 'para refuerzo transversal inferior',
      design: 'ZA-B-01',
      diameter: '5/8"',
      sameElements: 1,
      piecesPerElement: 8,
      pieceLength: 1.86,
      observation: '',
      validationStatus: 'borrador',
      rowVersion: 1,
    },
  ],
  platformadoLines: [
    {
      id: 'pl-1',
      alignment: 'Eje principal',
      progressive: '0+000',
      cutArea: 12.5,
      fillArea: 3.2,
      distance: 0,
      observation: 'Punto inicial',
      validationStatus: 'borrador',
    },
    {
      id: 'pl-2',
      alignment: 'Eje principal',
      progressive: '0+020',
      cutArea: 14.1,
      fillArea: 2.4,
      distance: 20,
      observation: '',
      validationStatus: 'borrador',
    },
  ],
  validationIssues: [],
  fileHistory: [],
  exports: [],
  audit: [
    {
      id: 'audit-1',
      entity: 'documento',
      detail: 'Borrador inicial creado desde blueprint de metrado',
      createdAt: new Date().toISOString(),
    },
  ],
};

const safeNumber = (value: number | '' | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const productLikeExcel = (values: Array<number | '' | null | undefined>) => {
  const numericValues = values
    .filter(value => value !== '' && value !== null && value !== undefined)
    .map(Number)
    .filter(value => Number.isFinite(value));
  if (numericValues.length === 0) return 0;
  return numericValues.reduce((acc, value) => acc * value, 1);
};

const round = (value: number) => Math.round(value * 100) / 100;
const roundBy = (value: number, precision: number) => {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
};

function sanitizeValidationIssues(issues: ValidationIssue[] = []) {
  return issues.filter(issue => {
    const isOldPlaceholder =
      ['issue-1', 'issue-2'].includes(issue.id) ||
      issue.originalFormula === 'VLOOKUP(A15,#REF!,12,FALSE)' ||
      issue.originalFormula === 'IF($D15=$H$7,#REF!*$F15*$G15,0)' ||
      issue.issueType === 'Variable de cantidad perdida';
    return !isOldPlaceholder;
  });
}

const calculateMeasurement = (line: MeasurementLine) => {
  const partial = productLikeExcel([
    line.unitCount,
    line.length,
    line.width,
    line.height,
    line.area,
  ]);
  const total = safeNumber(line.times) * partial;
  return { partial: round(partial), total: round(total) };
};

const calculateRebar = (line: RebarLine) => {
  const lengthTotal =
    safeNumber(line.sameElements) *
    safeNumber(line.piecesPerElement) *
    safeNumber(line.pieceLength);
  const weightKg = lengthTotal * (rebarWeights[line.diameter] ?? 0);
  return { lengthTotal: round(lengthTotal), weightKg: round(weightKg) };
};

const calculatePlatformadoRows = (lines: PlatformadoLine[]) => {
  let cutAccumulated = 0;
  let fillAccumulated = 0;
  return lines.map((line, index) => {
    const previous = lines[index - 1];
    const distance = safeNumber(line.distance);
    const cutVolume = previous
      ? ((safeNumber(previous.cutArea) + safeNumber(line.cutArea)) / 2) *
        distance
      : 0;
    const fillVolume = previous
      ? ((safeNumber(previous.fillArea) + safeNumber(line.fillArea)) / 2) *
        distance
      : 0;
    cutAccumulated += cutVolume;
    fillAccumulated += fillVolume;
    return {
      line,
      cutVolume: round(cutVolume),
      fillVolume: round(fillVolume),
      cutAccumulated: round(cutAccumulated),
      fillAccumulated: round(fillAccumulated),
      total: round(cutAccumulated - fillAccumulated),
    };
  });
};

const asArray = <T,>(value: unknown, fallback: T[] = []): T[] =>
  Array.isArray(value) ? (value as T[]) : fallback;

const firstNonEmptyArray = <T,>(value: unknown, fallback: T[] = []): T[] => {
  const current = asArray<T>(value);
  return current.length ? current : fallback;
};

const uniqueBy = <T,>(items: T[], getKey: (item: T) => string) => {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = getKey(item);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const toSafeText = (value: unknown, fallback = '') =>
  value === null || value === undefined ? fallback : String(value);

const toSafePrecision = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(6, Math.max(0, Math.trunc(parsed)));
};

const normalizeDraft = (
  draftValue: Partial<MetradoDraft> | null | undefined
): MetradoDraft => {
  const draft =
    draftValue && typeof draftValue === 'object'
      ? draftValue
      : ({} as Partial<MetradoDraft>);

  return {
    ...initialDraft,
    ...draft,
    decimalPrecision: toSafePrecision(
      draft.decimalPrecision,
      initialDraft.decimalPrecision
    ),
    projectName: toSafeText(draft.projectName, initialDraft.projectName),
    institution: toSafeText(draft.institution, initialDraft.institution),
    location: toSafeText(draft.location, initialDraft.location),
    code: toSafeText(draft.code, initialDraft.code),
    status: toSafeText(draft.status, initialDraft.status),
    headerImage: toSafeText(draft.headerImage, initialDraft.headerImage),
    blocks: uniqueBy(
      firstNonEmptyArray<Block>(draft.blocks, initialDraft.blocks).map(
        block => ({
          ...block,
          code: toSafeText(block.code),
          name: toSafeText(block.name),
          active: block.active ?? true,
        })
      ),
      block => toSafeText(block.code).trim().toUpperCase()
    ),
    items: uniqueBy(
      firstNonEmptyArray<WorkItem>(draft.items, initialDraft.items).map(
        item => {
          const unit = toSafeText(item.unit);
          return {
            ...item,
            itemCode: toSafeText(item.itemCode),
            description: toSafeText(item.description),
            unit,
            level: item.level ?? 1,
            calculationType:
              item.calculationType ??
              (unit.toLowerCase() === 'kg' ? 'acero' : 'general'),
          };
        }
      ),
      item => toSafeText(item.itemCode).trim()
    ),
    measurementLines: asArray<MeasurementLine>(
      draft.measurementLines,
      initialDraft.measurementLines
    ).map(line => ({
      ...line,
      description: toSafeText(line.description),
      observation: toSafeText(line.observation),
      validationStatus: line.validationStatus ?? 'borrador',
      sourceSheet: line.sourceSheet ? toSafeText(line.sourceSheet) : undefined,
      sourceRow: Number.isFinite(Number(line.sourceRow))
        ? Number(line.sourceRow)
        : undefined,
    })),
    rebarLines: asArray<RebarLine>(
      draft.rebarLines,
      initialDraft.rebarLines
    ).map(line => ({
      ...line,
      description: toSafeText(line.description),
      design: toSafeText(line.design),
      diameter: toSafeText(line.diameter),
      observation: toSafeText(line.observation),
      validationStatus: line.validationStatus ?? 'borrador',
      sourceSheet: line.sourceSheet ? toSafeText(line.sourceSheet) : undefined,
      sourceRow: Number.isFinite(Number(line.sourceRow))
        ? Number(line.sourceRow)
        : undefined,
    })),
    platformadoLines: asArray<PlatformadoLine>(
      draft.platformadoLines,
      initialDraft.platformadoLines
    ).map(line => ({
      ...line,
      alignment: toSafeText(line.alignment),
      progressive: toSafeText(line.progressive),
      distance: line.distance ?? '',
      observation: toSafeText(line.observation),
      validationStatus: line.validationStatus ?? 'borrador',
    })),
    validationIssues: sanitizeValidationIssues(
      asArray<ValidationIssue>(
        draft.validationIssues,
        initialDraft.validationIssues
      )
    ),
    attachments: asArray<MetradoAttachment>(draft.attachments).filter(
      attachment =>
        attachment?.id &&
        attachment.kind === 'image' &&
        typeof attachment.dataUrl === 'string'
    ),
    fileHistory: asArray<FileHistoryEntry>(draft.fileHistory),
    exports: asArray<ExportEntry>(draft.exports),
    audit: asArray<AuditEntry>(draft.audit, initialDraft.audit),
  };
};

const hasAnchorableMeasurementLines = (draft: MetradoDraft) =>
  draft.measurementLines.some(
    line => Boolean(line.sourceSheet) && Number.isFinite(Number(line.sourceRow))
  );

const parseDraft = (value: string | null): MetradoDraft => {
  if (!value) return initialDraft;
  try {
    return normalizeDraft(JSON.parse(value) as MetradoDraft);
  } catch {
    return initialDraft;
  }
};

const parseProjectRecords = (value: string | null): MetradoProjectRecord[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as MetradoProjectRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(record => record?.id && record?.draft)
      .map(record => ({
        ...record,
        id: toSafeText(record.id, createId('project')),
        name: toSafeText(
          record.name || record.draft.projectName,
          'Metrado sin nombre'
        ),
        code: toSafeText(record.code || record.draft.code, 'SIN-CODIGO'),
        institution: toSafeText(record.institution || record.draft.institution),
        location: toSafeText(record.location || record.draft.location),
        updatedAt: toSafeText(record.updatedAt, new Date().toISOString()),
        draft: normalizeDraft(record.draft),
      }));
  } catch {
    return [];
  }
};

const safeSetLocalStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`No se pudo guardar ${key} en localStorage.`, error);
    return false;
  }
};

const getInitialDraft = () => {
  const projects = parseProjectRecords(
    localStorage.getItem(PROJECTS_STORAGE_KEY)
  );
  const activeProjectId = localStorage.getItem(ACTIVE_PROJECT_KEY);
  const activeProject =
    projects.find(project => project.id === activeProjectId) ?? projects[0];

  return activeProject?.draft ?? parseDraft(localStorage.getItem(STORAGE_KEY));
};

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

const createProjectRecord = (
  draft: MetradoDraft,
  id = createId('project')
): MetradoProjectRecord => ({
  id,
  name:
    toSafeText(draft.projectName, 'Metrado sin nombre') || 'Metrado sin nombre',
  code: toSafeText(draft.code, 'SIN-CODIGO') || 'SIN-CODIGO',
  institution: toSafeText(draft.institution),
  location: toSafeText(draft.location),
  updatedAt: new Date().toISOString(),
  draft,
});

const getParentItemCode = (itemCode: string) => {
  const parts = itemCode.split('.');
  return parts.length > 1 ? parts.slice(0, -1).join('.') : '';
};

const normalizeItemCode = (itemCode: string) =>
  itemCode
    .trim()
    .replace(/[^0-9.]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^\./, '')
    .replace(/\.$/, '');

const getItemCodeLevel = (itemCode: string) =>
  Math.max(1, normalizeItemCode(itemCode).split('.').filter(Boolean).length);

const compareItemCodes = (leftCode: string, rightCode: string) => {
  const leftParts = normalizeItemCode(leftCode).split('.').filter(Boolean);
  const rightParts = normalizeItemCode(rightCode).split('.').filter(Boolean);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const left = leftParts[index];
    const right = rightParts[index];
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      if (leftNumber !== rightNumber) return leftNumber - rightNumber;
      continue;
    }
    const textComparison = left.localeCompare(right);
    if (textComparison !== 0) return textComparison;
  }
  return 0;
};

const sortItemsByCode = (items: WorkItem[]) =>
  items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const codeComparison = compareItemCodes(
        left.item.itemCode,
        right.item.itemCode
      );
      return codeComparison === 0 ? left.index - right.index : codeComparison;
    })
    .map(entry => entry.item);

const renumberItemsByCurrentOrder = (items: WorkItem[]) => {
  const firstRoot = items.find(item => item.level === 1);
  const firstRootPart = normalizeItemCode(firstRoot?.itemCode ?? '').split(
    '.'
  )[0];
  const firstRootNumber = Number(firstRootPart);
  const rootStart =
    Number.isFinite(firstRootNumber) && firstRootNumber > 0
      ? firstRootNumber
      : 1;
  const rootWidth = Math.max(2, firstRootPart.length);
  const countersByParent = new Map<string, number>();
  const codeByLevel = new Map<number, string>();
  let rootCounter = 0;

  return items.map(item => {
    let level = Math.min(
      6,
      Math.max(1, Number(item.level) || getItemCodeLevel(item.itemCode))
    );
    while (level > 1 && !codeByLevel.has(level - 1)) {
      level -= 1;
    }

    const parentCode = level > 1 ? codeByLevel.get(level - 1) ?? '' : '';
    const parentKey = level === 1 ? '__root__' : parentCode;
    const nextCounter = (countersByParent.get(parentKey) ?? 0) + 1;
    countersByParent.set(parentKey, nextCounter);

    const itemCode =
      level === 1
        ? String(rootStart + rootCounter++).padStart(rootWidth, '0')
        : `${parentCode}.${String(nextCounter).padStart(2, '0')}`;

    codeByLevel.set(level, itemCode);
    for (let childLevel = level + 1; childLevel <= 6; childLevel += 1) {
      codeByLevel.delete(childLevel);
    }

    return {
      ...item,
      itemCode,
      level,
    };
  });
};

const getNearestParentCodeForLevel = (
  items: WorkItem[],
  beforeIndex: number,
  level: number
) => {
  if (level <= 1) return '';
  for (
    let index = Math.min(beforeIndex - 1, items.length - 1);
    index >= 0;
    index -= 1
  ) {
    if (items[index].level === level - 1) return items[index].itemCode;
  }
  return '';
};

const getItemSubtreeRange = (items: WorkItem[], startIndex: number) => {
  const item = items[startIndex];
  if (!item) return { start: startIndex, end: startIndex };
  let end = startIndex + 1;
  while (end < items.length && items[end].level > item.level) {
    end += 1;
  }
  return { start: startIndex, end };
};

const getNextSiblingCode = (
  items: WorkItem[],
  reference: WorkItem | null,
  level: number,
  parentCode: string
) => {
  const siblingNumbers = items
    .filter(
      item =>
        item.level === level &&
        getParentItemCode(item.itemCode) === parentCode &&
        /^\d+$/.test(item.itemCode.split('.').slice(-1)[0] ?? '')
    )
    .map(item => Number(item.itemCode.split('.').slice(-1)[0]))
    .filter(Number.isFinite);
  const nextNumber = siblingNumbers.length
    ? Math.max(...siblingNumbers) + 1
    : 1;
  const width = reference?.itemCode.split('.').slice(-1)[0]?.length ?? 2;
  const suffix = String(nextNumber).padStart(width, '0');
  return parentCode ? `${parentCode}.${suffix}` : suffix;
};

const createBlankItem = (
  items: WorkItem[],
  reference: WorkItem | null,
  mode: 'child' | 'sibling',
  options: { asHeading?: boolean } = {}
): WorkItem => {
  const level =
    mode === 'child' && reference
      ? Math.min(reference.level + 1, 6)
      : reference?.level ?? 1;
  const parentCode =
    mode === 'child' && reference
      ? reference.itemCode
      : reference
      ? getParentItemCode(reference.itemCode)
      : '';
  return {
    id: createId('item'),
    itemCode: getNextSiblingCode(items, reference, level, parentCode),
    description: options.asHeading ? 'Nueva subpartida' : 'Nueva partida',
    unit: '',
    level,
    calculationType: 'general',
    isHeading: Boolean(options.asHeading),
  };
};

const summaryLookupSheets: Record<string, string> = {
  A: 'B-A',
  B: 'B-B',
  C: 'B-C',
  D: 'B-D',
  E: 'B-E',
  F: 'B-F',
  G: 'B-G',
  H: 'B-H',
  I: 'B-I',
  J: 'B-J',
  K: 'B-K',
  L: 'B-L.',
  M: 'B-M',
  N: 'B-N',
  O: 'B-O',
  P: 'B-P',
  'M.C.': 'M.C.',
};

const getColumnName = (cellAddress: string) =>
  cellAddress.replace(/[0-9]/g, '');

const getRowNumber = (cellAddress: string) =>
  Number(cellAddress.replace(/[A-Z]/gi, ''));

const getFormula = (cell: ExcelJS.Cell) => {
  const value = cell.value as
    | { formula?: string; sharedFormula?: string; result?: unknown }
    | string
    | number
    | null;
  if (value && typeof value === 'object' && 'formula' in value) {
    return value.formula ?? '';
  }
  return '';
};

const getFormulaResult = (cell: ExcelJS.Cell) => {
  const value = cell.value as
    | { formula?: string; sharedFormula?: string; result?: unknown }
    | string
    | number
    | null;
  if (value && typeof value === 'object' && 'result' in value) {
    return value.result;
  }
  return value;
};

const getCellText = (cell: ExcelJS.Cell) => {
  const result = getFormulaResult(cell);
  if (result === null || result === undefined) return '';
  if (typeof result === 'object') {
    if ('richText' in result && Array.isArray(result.richText)) {
      return result.richText
        .map((part: { text?: string }) => part.text ?? '')
        .join('')
        .trim();
    }
    if ('text' in result && typeof result.text === 'string') {
      return result.text.trim();
    }
    return '';
  }
  return String(result).trim();
};

const getCellNumber = (cell: ExcelJS.Cell) => {
  const result = getFormulaResult(cell);
  const parsed = typeof result === 'number' ? result : Number(result);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getOptionalNumber = (cell: ExcelJS.Cell): number | '' => {
  if (
    cell.value === null ||
    cell.value === undefined ||
    getCellText(cell) === ''
  ) {
    return '';
  }
  const result = getFormulaResult(cell);
  const parsed = typeof result === 'number' ? result : Number(result);
  return Number.isFinite(parsed) ? parsed : '';
};

const toKey = (value: string) =>
  value
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const toIdPart = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const createItemIdFromCode = (itemCode: string, rowNumber: number) =>
  `item-${toIdPart(itemCode) || rowNumber}`;

const normalizeBlockCode = (value: string) =>
  value
    .replace(/^BLOQUE/i, '')
    .replace(/:/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(' ')
    .replace(/\s+y\s+/i, ' Y ')
    .toUpperCase();

const createValidationIssue = (
  issue: Omit<ValidationIssue, 'id'>
): ValidationIssue => ({
  id: createId('issue'),
  ...issue,
});

const buildSummaryRefIssues = (summary: ExcelJS.Worksheet) => {
  const groups = new Map<
    string,
    {
      column: string;
      count: number;
      firstRow: number;
      lastRow: number;
      sampleFormula: string;
      blockCode: string;
      targetSheet: string;
    }
  >();

  summary.eachRow(row => {
    row.eachCell(cell => {
      const formula = getFormula(cell);
      if (!formula.includes('#REF!') || !formula.includes('VLOOKUP')) return;

      const column = getColumnName(cell.address);
      const rowNumber = getRowNumber(cell.address);
      const blockCode =
        normalizeBlockCode(getCellText(summary.getCell(`${column}7`))) ||
        normalizeBlockCode(getCellText(summary.getCell(`${column}8`)));
      const targetSheet = summaryLookupSheets[blockCode] ?? blockCode;
      const key = `${column}-${blockCode}`;
      const group = groups.get(key);
      if (group) {
        group.count += 1;
        group.lastRow = rowNumber;
      } else {
        groups.set(key, {
          column,
          count: 1,
          firstRow: rowNumber,
          lastRow: rowNumber,
          sampleFormula: formula,
          blockCode,
          targetSheet,
        });
      }
    });
  });

  return [...groups.values()].map(group =>
    createValidationIssue({
      sheetName: 'Resumen',
      cellReference: `${group.column}${group.firstRow}:${group.column}${group.lastRow}`,
      issueType: `Referencia rota del bloque ${group.blockCode}`,
      originalFormula: group.sampleFormula,
      suggestedFix: `Usar la hoja '${group.targetSheet}' con la misma fila de Resumen. Formula base: IFERROR(VLOOKUP(A${group.firstRow},'${group.targetSheet}'!$A:$L,12,FALSE),0). En el modulo web se resuelve calculando por partida + bloque, sin copiar #REF!.`,
      status: 'corregible',
      affectedCells: group.count,
    })
  );
};

const buildSummaryTotalIssue = (summary: ExcelJS.Worksheet) => {
  let firstRow = 0;
  let lastRow = 0;
  let count = 0;

  for (let rowNumber = 12; rowNumber <= summary.rowCount; rowNumber += 1) {
    const unit = getCellText(summary.getCell(`D${rowNumber}`));
    const blockTotal = [
      'E',
      'F',
      'G',
      'H',
      'I',
      'J',
      'K',
      'L',
      'M',
      'N',
      'O',
      'P',
      'Q',
      'R',
      'S',
      'T',
      'U',
    ].reduce(
      (acc, column) =>
        acc + getCellNumber(summary.getCell(`${column}${rowNumber}`)),
      0
    );
    const summaryTotal = getCellNumber(summary.getCell(`V${rowNumber}`));
    if (!unit || blockTotal <= 0) continue;
    if (Math.abs(blockTotal - summaryTotal) <= 0.01) continue;
    count += 1;
    if (!firstRow) firstRow = rowNumber;
    lastRow = rowNumber;
  }

  if (!count) return [];

  return [
    createValidationIssue({
      sheetName: 'Resumen',
      cellReference: `V${firstRow}:V${lastRow}`,
      issueType: 'Metrado total no suma todos los bloques',
      originalFormula: `V${firstRow}=SUM(E${firstRow}:U${firstRow})`,
      suggestedFix:
        'El total debe ser SUM(E:U) por fila, tratando referencias rotas como 0. El modulo web aplica esta regla con la suma de bloques activos.',
      status: 'corregible',
      affectedCells: count,
    }),
  ];
};

const buildRebarRefIssues = (workbook: ExcelJS.Workbook) => {
  const groups = new Map<
    string,
    {
      sheetName: string;
      count: number;
      firstCell: string;
      lastCell: string;
      sampleFormula: string;
      missingVariable: string;
      suggestedFormula: string;
    }
  >();

  workbook.eachSheet(sheet => {
    sheet.eachRow(row => {
      row.eachCell(cell => {
        const formula = getFormula(cell);
        if (!formula.includes('#REF!') || !formula.startsWith('IF(')) return;
        const hasDiameterCheck =
          formula.includes('$D') &&
          (formula.includes('$H$7') ||
            formula.includes('$I$7') ||
            formula.includes('$J$7') ||
            formula.includes('$K$7') ||
            formula.includes('$L$7') ||
            formula.includes('$M$7') ||
            formula.includes('$N$7'));
        if (!hasDiameterCheck) return;

        const rowNumber = getRowNumber(cell.address);
        const hasElements = formula.includes(`$E${rowNumber}`);
        const hasPieces = formula.includes(`$F${rowNumber}`);
        const hasLength = formula.includes(`$G${rowNumber}`);
        const missingVariable = !hasElements
          ? 'numero de elementos'
          : !hasPieces
          ? 'piezas por elemento'
          : !hasLength
          ? 'longitud de pieza'
          : 'variable de acero';
        const suggestedFormula = `IF($D${rowNumber}=H$7,$E${rowNumber}*$F${rowNumber}*$G${rowNumber},0)`;
        const key = `${sheet.name}-${missingVariable}`;
        const group = groups.get(key);
        if (group) {
          group.count += 1;
          group.lastCell = cell.address;
        } else {
          groups.set(key, {
            sheetName: sheet.name,
            count: 1,
            firstCell: cell.address,
            lastCell: cell.address,
            sampleFormula: formula,
            missingVariable,
            suggestedFormula,
          });
        }
      });
    });
  });

  return [...groups.values()].map(group =>
    createValidationIssue({
      sheetName: group.sheetName,
      cellReference: `${group.firstCell}:${group.lastCell}`,
      issueType: `Formula de acero perdio ${group.missingVariable}`,
      originalFormula: group.sampleFormula,
      suggestedFix: `Usar elementos * piezas * longitud en la fila de acero: ${group.suggestedFormula}. La app calcula esa longitud total y luego multiplica por el peso por metro del diametro.`,
      status: 'corregible',
      affectedCells: group.count,
    })
  );
};

const buildOtherRefIssues = (workbook: ExcelJS.Workbook) => {
  const groups = new Map<
    string,
    {
      sheetName: string;
      count: number;
      firstCell: string;
      lastCell: string;
      sampleFormula: string;
    }
  >();

  workbook.eachSheet(sheet => {
    sheet.eachRow(row => {
      row.eachCell(cell => {
        const formula = getFormula(cell);
        if (!formula.includes('#REF!')) return;
        const isSummaryLookup =
          sheet.name === 'Resumen' && formula.includes('VLOOKUP');
        const isRebarFormula =
          formula.startsWith('IF(') &&
          formula.includes('$D') &&
          (formula.includes('$H$7') ||
            formula.includes('$I$7') ||
            formula.includes('$J$7') ||
            formula.includes('$K$7') ||
            formula.includes('$L$7') ||
            formula.includes('$M$7') ||
            formula.includes('$N$7'));
        if (isSummaryLookup || isRebarFormula) return;

        const group = groups.get(sheet.name);
        if (group) {
          group.count += 1;
          group.lastCell = cell.address;
        } else {
          groups.set(sheet.name, {
            sheetName: sheet.name,
            count: 1,
            firstCell: cell.address,
            lastCell: cell.address,
            sampleFormula: formula,
          });
        }
      });
    });
  });

  return [...groups.values()].map(group =>
    createValidationIssue({
      sheetName: group.sheetName,
      cellReference: `${group.firstCell}:${group.lastCell}`,
      issueType: 'Referencia heredada rota',
      originalFormula: group.sampleFormula,
      suggestedFix:
        'Normalizar nombre de hoja/bloque o recalcular desde datos capturados. Si el bloque no aplica al proyecto, registrar 0 y no copiar la formula rota.',
      status: 'pendiente',
      affectedCells: group.count,
    })
  );
};

const analyzeReferenceWorkbook = async (file: File) => {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer as any);

  const summary = workbook.getWorksheet('Resumen');
  const issues = [
    ...(summary ? buildSummaryRefIssues(summary) : []),
    ...(summary ? buildSummaryTotalIssue(summary) : []),
    ...buildRebarRefIssues(workbook),
    ...buildOtherRefIssues(workbook),
  ];

  if (summary && issues.length === 0) {
    return [
      createValidationIssue({
        sheetName: 'Resumen',
        cellReference: '-',
        issueType: 'Sin referencias rotas detectadas',
        originalFormula: file.name,
        suggestedFix:
          'El archivo no contiene formulas #REF! detectables. Puede usarse como referencia de importacion.',
        status: 'resuelto',
      }),
    ];
  }

  if (!summary) {
    return [
      createValidationIssue({
        sheetName: 'Importador',
        cellReference: '-',
        issueType: 'Hoja Resumen no encontrada',
        originalFormula: file.name,
        suggestedFix:
          'El archivo debe incluir una hoja llamada Resumen para comparar partidas, bloques y totales.',
        status: 'pendiente',
      }),
    ];
  }

  return issues;
};

const getRowText = (sheet: ExcelJS.Worksheet, rowNumber: number) => {
  const values: string[] = [];
  sheet.getRow(rowNumber).eachCell(cell => {
    const text = getCellText(cell);
    if (text && !values.includes(text)) values.push(text);
  });
  return values.join(' ').trim();
};

const findHeaderColumn = (
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  labels: string[]
) => {
  let found = 0;
  const keys = labels.map(toKey);
  sheet.getRow(rowNumber).eachCell(cell => {
    const text = toKey(getCellText(cell));
    if (!found && keys.some(label => text.includes(label))) {
      found = Number(cell.col);
    }
  });
  return found;
};

const detectSummaryColumns = (summary: ExcelJS.Worksheet) => {
  for (let rowNumber = 6; rowNumber <= 9; rowNumber += 1) {
    const itemCol = findHeaderColumn(summary, rowNumber, ['ITEM']);
    const descriptionCol = findHeaderColumn(summary, rowNumber, [
      'DESCRIPCION',
    ]);
    const unitCol = findHeaderColumn(summary, rowNumber, ['UND']);
    if (itemCol && descriptionCol) {
      return {
        headerRow: rowNumber,
        itemCol,
        descriptionCol,
        unitCol: unitCol || descriptionCol + 1,
      };
    }
  }
  return { headerRow: 7, itemCol: 2, descriptionCol: 3, unitCol: 4 };
};

const detectDetailColumns = (sheet: ExcelJS.Worksheet) => {
  for (let rowNumber = 6; rowNumber <= 9; rowNumber += 1) {
    const itemCol = findHeaderColumn(sheet, rowNumber, ['ITEM']);
    const descriptionCol = findHeaderColumn(sheet, rowNumber, ['DESCRIPCION']);
    if (itemCol && descriptionCol) {
      return {
        headerRow: rowNumber,
        itemCol,
        descriptionCol,
        unitCol: descriptionCol + 1,
        timesCol: descriptionCol + 2,
        unitCountCol: descriptionCol + 3,
        lengthCol: descriptionCol + 4,
        widthCol: descriptionCol + 5,
        heightCol: descriptionCol + 6,
        areaCol: descriptionCol + 7,
      };
    }
  }
  return {
    headerRow: 7,
    itemCol: 2,
    descriptionCol: 3,
    unitCol: 4,
    timesCol: 5,
    unitCountCol: 6,
    lengthCol: 7,
    widthCol: 8,
    heightCol: 9,
    areaCol: 10,
  };
};

const detectRebarColumns = (sheet: ExcelJS.Worksheet) => {
  for (let rowNumber = 6; rowNumber <= 9; rowNumber += 1) {
    const itemCol = findHeaderColumn(sheet, rowNumber, ['ITEM']);
    const descriptionCol = findHeaderColumn(sheet, rowNumber, ['DESCRIPCION']);
    const diameterCol = findHeaderColumn(sheet, rowNumber, ['Ø']);
    if (itemCol && descriptionCol && diameterCol) {
      return {
        headerRow: rowNumber,
        itemCol,
        descriptionCol,
        designCol: descriptionCol + 1,
        diameterCol,
        sameElementsCol: diameterCol + 1,
        piecesCol: diameterCol + 2,
        lengthCol: diameterCol + 3,
      };
    }
  }
  return {
    headerRow: 7,
    itemCol: 2,
    descriptionCol: 3,
    designCol: 4,
    diameterCol: 5,
    sameElementsCol: 6,
    piecesCol: 7,
    lengthCol: 8,
  };
};

const findWorksheet = (workbook: ExcelJS.Workbook, names: string[]) => {
  const normalized = names.map(name => toKey(name).replace(/\s+/g, ''));
  return workbook.worksheets.find(sheet =>
    normalized.includes(toKey(sheet.name).replace(/\s+/g, ''))
  );
};

const getGeneralSheetCandidates = (block: Block) => {
  if (block.code === 'M.C.') return ['M.C.', 'B-M.C.'];
  return [`B-${block.code}`, `B-${block.code}.`, block.code, `${block.code}.`];
};

const getRebarSheetCandidates = (block: Block) => {
  if (block.code === 'M.C.') return ['Ø-M.C.', 'Ø-M.C', 'Acero-M.C.'];
  return [`Ø-${block.code}`, `Ø-${block.code}.`, `Acero-${block.code}`];
};

const getExportGeneralSheetName = (block: Block) =>
  block.code === 'M.C.'
    ? 'M.C.'
    : block.code === 'L'
    ? 'B-L.'
    : `B-${block.code}`;

const getExportRebarSheetName = (block: Block) =>
  block.code === 'M.C.'
    ? 'Ø-M.C.'
    : block.code === 'L'
    ? 'Ø-L.'
    : `Ø-${block.code}`;

const extractBlocksFromSummary = (summary?: ExcelJS.Worksheet): Block[] => {
  if (!summary) return defaultBlocks;
  const columns = Array.from({ length: 17 }, (_, index) => 5 + index);
  const blocks = columns
    .map((column, index) => {
      const code =
        getCellText(summary.getCell(7, column)) || defaultBlocks[index]?.code;
      const name =
        getCellText(summary.getCell(8, column)) || defaultBlocks[index]?.name;
      if (!code || !name) return null;
      const normalizedCode = code
        .replace(/^BLOQUE\s*/i, '')
        .replace(':', '')
        .trim();
      return {
        id:
          defaultBlocks.find(block => block.code === normalizedCode)?.id ??
          `block-${toIdPart(normalizedCode)}`,
        code: normalizedCode,
        name,
        active: true,
      };
    })
    .filter(Boolean) as Block[];
  return blocks.length ? blocks : defaultBlocks;
};

const inferCalculationType = (
  unit: string,
  description: string,
  isHeading: boolean
) => {
  if (isHeading) return 'mixto';
  const normalizedUnit = (unit ?? '').toLowerCase();
  const normalizedDescription = toKey(description);
  if (normalizedUnit === 'kg') return 'acero';
  if (
    normalizedDescription.includes('PLATAFORMA') ||
    normalizedDescription.includes('CORTE MASIVO')
  ) {
    return 'platformado';
  }
  return 'general';
};

const extractItemsFromSummary = (summary?: ExcelJS.Worksheet): WorkItem[] => {
  if (!summary) return initialDraft.items;
  const columns = detectSummaryColumns(summary);
  const items: WorkItem[] = [];

  for (
    let rowNumber = columns.headerRow + 1;
    rowNumber <= summary.rowCount;
    rowNumber += 1
  ) {
    const itemCode = getCellText(summary.getCell(rowNumber, columns.itemCol));
    const description = getCellText(
      summary.getCell(rowNumber, columns.descriptionCol)
    );
    const unit = getCellText(summary.getCell(rowNumber, columns.unitCol));
    if (!itemCode || !description) continue;
    if (!/^\d/.test(itemCode)) continue;

    const level = Math.max(1, itemCode.split('.').filter(Boolean).length);
    const isHeading = !unit;
    items.push({
      id: createItemIdFromCode(itemCode, rowNumber),
      itemCode,
      description,
      unit,
      level,
      calculationType: inferCalculationType(unit, description, isHeading),
      isHeading,
    });
  }

  return items.length ? items : initialDraft.items;
};

const extractMeasurementLines = (
  workbook: ExcelJS.Workbook,
  blocks: Block[],
  items: WorkItem[]
) => {
  const itemByCode = new Map(items.map(item => [item.itemCode, item]));
  const lines: MeasurementLine[] = [];

  blocks.forEach(block => {
    const sheet = findWorksheet(workbook, getGeneralSheetCandidates(block));
    if (!sheet) return;
    const columns = detectDetailColumns(sheet);
    let currentItem: WorkItem | undefined;

    for (
      let rowNumber = columns.headerRow + 1;
      rowNumber <= sheet.rowCount;
      rowNumber += 1
    ) {
      const itemCode = getCellText(sheet.getCell(rowNumber, columns.itemCol));
      const description = getCellText(
        sheet.getCell(rowNumber, columns.descriptionCol)
      );
      if (itemCode && itemByCode.has(itemCode)) {
        currentItem = itemByCode.get(itemCode);
        continue;
      }
      if (
        !currentItem ||
        !description ||
        currentItem.calculationType === 'acero'
      )
        continue;

      const times = getOptionalNumber(
        sheet.getCell(rowNumber, columns.timesCol)
      );
      const unitCount = getOptionalNumber(
        sheet.getCell(rowNumber, columns.unitCountCol)
      );
      const length = getOptionalNumber(
        sheet.getCell(rowNumber, columns.lengthCol)
      );
      const width = getOptionalNumber(
        sheet.getCell(rowNumber, columns.widthCol)
      );
      const height = getOptionalNumber(
        sheet.getCell(rowNumber, columns.heightCol)
      );
      const area = getOptionalNumber(sheet.getCell(rowNumber, columns.areaCol));
      const hasMeasurement = [
        times,
        unitCount,
        length,
        width,
        height,
        area,
      ].some(value => value !== '');
      if (!hasMeasurement && currentItem.isHeading) continue;

      lines.push({
        id: `ml-${block.id}-${rowNumber}`,
        itemId: currentItem.id,
        blockId: block.id,
        description,
        times,
        unitCount,
        length,
        width,
        height,
        area,
        observation: '',
        validationStatus: 'borrador',
        rowVersion: 1,
        sourceSheet: sheet.name,
        sourceRow: rowNumber,
        formulas: {
          times:
            getFormula(sheet.getCell(rowNumber, columns.timesCol)) || undefined,
          unitCount:
            getFormula(sheet.getCell(rowNumber, columns.unitCountCol)) ||
            undefined,
          length:
            getFormula(sheet.getCell(rowNumber, columns.lengthCol)) ||
            undefined,
          width:
            getFormula(sheet.getCell(rowNumber, columns.widthCol)) || undefined,
          height:
            getFormula(sheet.getCell(rowNumber, columns.heightCol)) ||
            undefined,
          area:
            getFormula(sheet.getCell(rowNumber, columns.areaCol)) || undefined,
        },
      });
    }
  });

  return lines;
};

const extractRebarLines = (
  workbook: ExcelJS.Workbook,
  blocks: Block[],
  items: WorkItem[]
) => {
  const itemByCode = new Map(items.map(item => [item.itemCode, item]));
  const lines: RebarLine[] = [];

  blocks.forEach(block => {
    const sheet = findWorksheet(workbook, getRebarSheetCandidates(block));
    if (!sheet) return;
    const columns = detectRebarColumns(sheet);
    let currentItem: WorkItem | undefined;
    let currentDesign = '';

    for (
      let rowNumber = columns.headerRow + 1;
      rowNumber <= sheet.rowCount;
      rowNumber += 1
    ) {
      const itemCode = getCellText(sheet.getCell(rowNumber, columns.itemCol));
      const description = getCellText(
        sheet.getCell(rowNumber, columns.descriptionCol)
      );
      const diameter = getCellText(
        sheet.getCell(rowNumber, columns.diameterCol)
      );

      if (itemCode && itemByCode.has(itemCode)) {
        currentItem = itemByCode.get(itemCode);
        currentDesign = '';
        continue;
      }
      if (!currentItem || !description) continue;
      if (!diameter && /^[A-Z]{1,4}-/.test(description)) {
        currentDesign = description;
        continue;
      }
      if (!diameter || !(diameter in rebarWeights)) continue;

      lines.push({
        id: `rl-${block.id}-${rowNumber}`,
        itemId: currentItem.id,
        blockId: block.id,
        description,
        design:
          getCellText(sheet.getCell(rowNumber, columns.designCol)) ||
          currentDesign,
        diameter,
        sameElements: getOptionalNumber(
          sheet.getCell(rowNumber, columns.sameElementsCol)
        ),
        piecesPerElement: getOptionalNumber(
          sheet.getCell(rowNumber, columns.piecesCol)
        ),
        pieceLength: getOptionalNumber(
          sheet.getCell(rowNumber, columns.lengthCol)
        ),
        observation: '',
        validationStatus: 'borrador',
        rowVersion: 1,
        sourceSheet: sheet.name,
        sourceRow: rowNumber,
        formulas: {
          sameElements:
            getFormula(sheet.getCell(rowNumber, columns.sameElementsCol)) ||
            undefined,
          piecesPerElement:
            getFormula(sheet.getCell(rowNumber, columns.piecesCol)) ||
            undefined,
          pieceLength:
            getFormula(sheet.getCell(rowNumber, columns.lengthCol)) ||
            undefined,
        },
      });
    }
  });

  return lines;
};

const extractPlatformadoLines = (
  workbook: ExcelJS.Workbook
): PlatformadoLine[] => {
  const sheet = findWorksheet(workbook, ['PLATAFORMADO']);
  if (!sheet) return initialDraft.platformadoLines;
  const lines: PlatformadoLine[] = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const progressive =
      getCellText(sheet.getCell(rowNumber, 3)) ||
      getCellText(sheet.getCell(rowNumber, 2));
    const cutArea = getOptionalNumber(sheet.getCell(rowNumber, 4));
    const fillArea = getOptionalNumber(sheet.getCell(rowNumber, 5));
    const distance = getOptionalNumber(sheet.getCell(rowNumber, 6));
    if (!progressive && cutArea === '' && fillArea === '' && distance === '')
      continue;
    if (toKey(progressive).includes('PROGRESIVA')) continue;
    lines.push({
      id: `pl-${rowNumber}`,
      alignment: 'Eje principal',
      progressive,
      cutArea,
      fillArea,
      distance,
      observation: '',
      validationStatus: 'borrador',
    });
  }

  return lines.length ? lines : initialDraft.platformadoLines;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer | Uint8Array) => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
};

const getWorkbookMedia = (workbook: ExcelJS.Workbook) =>
  (workbook as unknown as { model?: { media?: any[] } }).model?.media ?? [];

const getWorkbookMediaEntry = (mediaEntries: any[], imageId: unknown) => {
  const numericImageId = Number(imageId);
  if (!Number.isFinite(numericImageId)) return undefined;

  return (
    mediaEntries[numericImageId] ??
    mediaEntries[numericImageId - 1] ??
    mediaEntries.find(media => Number(media?.index) === numericImageId) ??
    mediaEntries.find(media => Number(media?.id) === numericImageId)
  );
};

const getImageMimeType = (extensionValue: unknown) => {
  const extension = String(extensionValue || 'png')
    .replace('.', '')
    .toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  return `image/${extension}`;
};

const getMediaDataUrl = (media: any) => {
  if (!media) return '';
  const extension = String(media.extension || 'png')
    .replace('.', '')
    .toLowerCase();
  const base64 =
    typeof media.base64 === 'string'
      ? media.base64
      : media.buffer
      ? arrayBufferToBase64(media.buffer as ArrayBuffer | Uint8Array)
      : '';
  return base64 ? `data:${getImageMimeType(extension)};base64,${base64}` : '';
};

const getImageAnchor = (
  sheet: ExcelJS.Worksheet,
  image: any
): MetradoAttachmentAnchor => {
  const range = image.range ?? {};
  const tl = range.tl ?? {};
  const br = range.br ?? {};
  const rawStartRow = Number(tl.row ?? tl.nativeRow ?? 0);
  const rawStartCol = Number(tl.col ?? tl.nativeCol ?? 0);
  const rawEndRow = Number(br.row ?? br.nativeRow ?? rawStartRow);
  const rawEndCol = Number(br.col ?? br.nativeCol ?? rawStartCol);
  const startRow = Math.max(1, Math.floor(rawStartRow));
  const startCol = Math.max(1, Math.floor(rawStartCol));
  const endRow = Math.max(startRow, Math.ceil(rawEndRow));
  const endCol = Math.max(startCol, Math.ceil(rawEndCol));

  return {
    sheetName: sheet.name,
    editAs: range.editAs,
    startRow,
    startCol,
    endRow,
    endCol,
    nativeStartRow: Number.isFinite(Number(tl.nativeRow))
      ? Number(tl.nativeRow)
      : undefined,
    nativeStartCol: Number.isFinite(Number(tl.nativeCol))
      ? Number(tl.nativeCol)
      : undefined,
    nativeEndRow: Number.isFinite(Number(br.nativeRow))
      ? Number(br.nativeRow)
      : undefined,
    nativeEndCol: Number.isFinite(Number(br.nativeCol))
      ? Number(br.nativeCol)
      : undefined,
    rowHeight: sheet.getRow(Math.max(1, startRow + 1)).height,
  };
};

const findAttachmentLine = (
  lines: MeasurementLine[],
  block: Block,
  sheetName: string,
  anchor: MetradoAttachmentAnchor
) => {
  const sheetKey = normalizeAttachmentSheet(sheetName);
  const sheetLines = lines
    .filter(
      line =>
        line.blockId === block.id &&
        normalizeAttachmentSheet(line.sourceSheet) === sheetKey &&
        Number.isFinite(Number(line.sourceRow))
    )
    .sort((a, b) => Number(a.sourceRow) - Number(b.sourceRow));

  const anchorStart = Number(anchor.startRow);
  const anchorEnd = Number(anchor.endRow);
  const nativeStart = Number(anchor.nativeStartRow);
  const candidateRows = [
    anchorStart,
    anchorStart + 1,
    anchorEnd,
    anchorEnd + 1,
    nativeStart,
    nativeStart + 1,
  ].filter(Number.isFinite);

  const direct = sheetLines.find(line => {
    const row = Number(line.sourceRow);
    return (
      candidateRows.some(candidate => Math.abs(row - candidate) <= 1) ||
      (row >= anchorStart - 1 && row <= anchorEnd + 1)
    );
  });
  if (direct) return direct;

  const previous = [...sheetLines].reverse().find(line => {
    const row = Number(line.sourceRow);
    return row <= anchorStart + 1 && anchorStart - row <= 8;
  });
  if (previous) return previous;

  return sheetLines.find(line => {
    const row = Number(line.sourceRow);
    return row >= anchorStart - 1 && row - anchorStart <= 8;
  });
};

const extractWorkbookAttachments = (
  workbook: ExcelJS.Workbook,
  blocks: Block[],
  measurementLines: MeasurementLine[]
): MetradoAttachment[] => {
  const mediaEntries = getWorkbookMedia(workbook);
  const attachments: MetradoAttachment[] = [];

  blocks.forEach(block => {
    const sheet = findWorksheet(workbook, getGeneralSheetCandidates(block));
    if (!sheet || typeof (sheet as any).getImages !== 'function') return;

    ((sheet as any).getImages() as any[]).forEach((image, imageIndex) => {
      const anchor = getImageAnchor(sheet, image);
      if (anchor.startRow < 8) return;

      const media = getWorkbookMediaEntry(mediaEntries, image.imageId);
      const dataUrl = getMediaDataUrl(media);
      if (!dataUrl) return;

      const line = findAttachmentLine(
        measurementLines,
        block,
        sheet.name,
        anchor
      );
      const item = line
        ? undefined
        : measurementLines.find(entry => entry.blockId === block.id)?.itemId;

      attachments.push({
        id: `att-${block.id}-${anchor.startRow}-${image.imageId}-${imageIndex}`,
        kind: 'image',
        scope: 'measurement',
        blockId: block.id,
        itemId: line?.itemId ?? item,
        lineId: line?.id,
        name:
          media?.name ||
          `imagen-${sheet.name}-${anchor.startRow}.${
            media?.extension || 'png'
          }`,
        mimeType: getImageMimeType(media?.extension),
        extension: String(media?.extension || 'png')
          .replace('.', '')
          .toLowerCase(),
        dataUrl,
        caption:
          line?.description ||
          `Imagen anclada en ${sheet.name} fila ${anchor.startRow}`,
        sourceSheet: sheet.name,
        sourceRow: anchor.startRow,
        anchor,
        createdAt: new Date().toISOString(),
      });
    });
  });

  return attachments;
};

const extractWorkbookHeaderImage = (workbook: ExcelJS.Workbook) => {
  const mediaEntries = getWorkbookMedia(workbook);
  const summary = workbook.getWorksheet('Resumen');
  const summaryImage =
    summary && typeof (summary as any).getImages === 'function'
      ? ((summary as any).getImages() as any[]).find(image => {
          const anchor = getImageAnchor(summary, image);
          return anchor.startRow <= 6;
        })
      : undefined;
  const media = summaryImage
    ? getWorkbookMediaEntry(mediaEntries, summaryImage.imageId)
    : mediaEntries.find(
        entry => entry?.type === 'image' && (entry.buffer || entry.base64)
      );
  if (!media) return '';
  return getMediaDataUrl(media);
};

const extractWorkbookVisualAssets = async (
  file: File,
  draftForAnchors?: MetradoDraft
) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer as any);
    return {
      headerImage: extractWorkbookHeaderImage(workbook),
      attachments: draftForAnchors
        ? extractWorkbookAttachments(
            workbook,
            draftForAnchors.blocks,
            draftForAnchors.measurementLines
          )
        : [],
    };
  } catch {
    return { headerImage: '', attachments: [] };
  }
};

const importWorkbookDraft = async (file: File, currentDraft: MetradoDraft) => {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer as any);

  const summary = workbook.getWorksheet('Resumen');
  const blocks = extractBlocksFromSummary(summary);
  const items = extractItemsFromSummary(summary);
  const measurementLines = extractMeasurementLines(workbook, blocks, items);
  const rebarLines = extractRebarLines(workbook, blocks, items);
  const platformadoLines = extractPlatformadoLines(workbook);
  const attachments = extractWorkbookAttachments(
    workbook,
    blocks,
    measurementLines
  );
  const headerImage = extractWorkbookHeaderImage(workbook);

  return {
    ...currentDraft,
    projectName: summary
      ? getRowText(summary, 1).replace(/^"|"$/g, '') || currentDraft.projectName
      : currentDraft.projectName,
    institution: summary
      ? getRowText(summary, 2).replace(/UNIDAD EJECUTORA:\s*/i, '') ||
        currentDraft.institution
      : currentDraft.institution,
    blocks,
    items,
    measurementLines: measurementLines.length
      ? measurementLines
      : currentDraft.measurementLines,
    rebarLines: rebarLines.length ? rebarLines : currentDraft.rebarLines,
    platformadoLines,
    attachments,
    headerImage: headerImage || currentDraft.headerImage,
  };
};

const decimalToInput = (
  value: number | string | null | undefined
): number | '' => {
  if (value === null || value === undefined || value === '') return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : '';
};

const mapBackendCalculationType = (
  value: BackendCalculationType
): CalculationType => {
  const mapping: Record<BackendCalculationType, CalculationType> = {
    GENERAL: 'general',
    ACERO: 'acero',
    PLATAFORMADO: 'platformado',
    MANUAL: 'manual',
    MIXTO: 'mixto',
  };
  return mapping[value] ?? 'general';
};

const mapBackendLineStatus = (value: BackendLineStatus): ValidationStatus => {
  const mapping: Record<BackendLineStatus, ValidationStatus> = {
    DRAFT: 'borrador',
    PENDING_VALIDATION: 'pendiente_validacion',
    OBSERVED: 'observado',
    VALIDATED: 'validado',
  };
  return mapping[value] ?? 'borrador';
};

const mapBackendIssueStatus = (
  value: BackendIssueStatus
): ValidationIssue['status'] => {
  if (value === 'RESOLVED' || value === 'IGNORED') return 'resuelto';
  if (value === 'FIXABLE') return 'corregible';
  return 'pendiente';
};

const mapBackendProjectToDraft = (
  project: BackendMetradoProject,
  currentDraft: MetradoDraft,
  imported: BackendMetradoImportResponse['imported']
): MetradoDraft => {
  const nextDraft: MetradoDraft = {
    ...currentDraft,
    projectName: project.name || currentDraft.projectName,
    institution:
      project.executingUnit ||
      project.educationalInstitution ||
      currentDraft.institution,
    location: project.location || currentDraft.location,
    code: project.uniqueCode || project.code || currentDraft.code,
    status: 'importado',
    decimalPrecision: project.decimalPrecision ?? currentDraft.decimalPrecision,
    blocks: project.blocks.map(block => ({
      id: block.id,
      code: block.code,
      name: block.name,
      active: block.active,
    })),
    items: project.items.map(item => ({
      id: item.id,
      itemCode: item.itemCode,
      description: item.description,
      unit: item.unit ?? '',
      level: item.level,
      calculationType: mapBackendCalculationType(item.calculationType),
      isHeading: item.isHeading,
    })),
    measurementLines: project.measurementLines.map(line => ({
      id: line.id,
      itemId: line.metradoItemId,
      blockId: line.metradoBlockId,
      description: line.description,
      times: decimalToInput(line.times),
      unitCount: decimalToInput(line.unitCount),
      length: decimalToInput(line.length),
      width: decimalToInput(line.width),
      height: decimalToInput(line.height),
      area: decimalToInput(line.area),
      observation: '',
      validationStatus: mapBackendLineStatus(line.validationStatus),
      rowVersion: 1,
      sourceSheet: line.sourceSheet ?? undefined,
      sourceRow: line.sourceRow ?? undefined,
      formulas: (line.formulas ?? undefined) as MeasurementLine['formulas'],
    })),
    rebarLines: project.rebarLines.map(line => ({
      id: line.id,
      itemId: line.metradoItemId,
      blockId: line.metradoBlockId,
      description: line.description,
      design: line.design ?? '',
      diameter: line.diameter ?? '',
      sameElements: decimalToInput(line.sameElements),
      piecesPerElement: decimalToInput(line.piecesPerElement),
      pieceLength: decimalToInput(line.pieceLength),
      observation: '',
      validationStatus: mapBackendLineStatus(line.validationStatus),
      rowVersion: 1,
      sourceSheet: line.sourceSheet ?? undefined,
      sourceRow: line.sourceRow ?? undefined,
      formulas: (line.formulas ?? undefined) as RebarLine['formulas'],
    })),
    platformadoLines: (project.platformadoLines ?? []).map(line => ({
      id: line.id,
      alignment: line.alignment ?? '',
      progressive: line.progressive,
      cutArea: decimalToInput(line.cutArea),
      fillArea: decimalToInput(line.fillArea),
      distance: decimalToInput(line.distance),
      observation: '',
      validationStatus: mapBackendLineStatus(line.validationStatus),
    })),
    attachments: (project.attachments ?? []).map(attachment => ({
      id: attachment.id,
      kind: 'image',
      scope:
        attachment.scope === 'rebar' || attachment.scope === 'project'
          ? attachment.scope
          : 'measurement',
      blockId: attachment.metradoBlockId ?? undefined,
      itemId: attachment.metradoItemId ?? undefined,
      lineId:
        attachment.metradoMeasurementLineId ??
        attachment.metradoRebarLineId ??
        undefined,
      name: attachment.name,
      mimeType: attachment.mimeType,
      extension: attachment.extension,
      dataUrl: attachment.dataUrl,
      caption: attachment.caption ?? undefined,
      sourceSheet: attachment.sourceSheet ?? undefined,
      sourceRow: attachment.sourceRow ?? undefined,
      anchor: attachment.anchor as MetradoAttachment['anchor'],
      createdAt: attachment.createdAt ?? new Date().toISOString(),
    })),
    validationIssues: (project.validations ?? []).map(issue => ({
      id: issue.id,
      sheetName: issue.sheetName,
      cellReference: issue.cellReference ?? '-',
      issueType: issue.issueType,
      originalFormula: issue.originalFormula ?? '',
      suggestedFix: issue.suggestedFix ?? '',
      status: mapBackendIssueStatus(issue.status),
      affectedCells: issue.affectedCells ?? undefined,
    })),
    audit: [
      {
        id: createId('audit'),
        entity: 'excel',
        detail: `Importado en BD: ${imported.items} partidas, ${
          imported.measurementLines
        } lineas generales, ${imported.rebarLines} lineas de acero, ${
          imported.platformadoLines ?? 0
        } lineas de platformado, ${imported.repairedRefIssues} #REF reparados.`,
        createdAt: new Date().toISOString(),
      },
      ...currentDraft.audit,
    ].slice(0, 50),
  };

  return normalizeDraft(nextDraft);
};

const importWorkbookDraftFromApi = async (
  file: File,
  currentDraft: MetradoDraft
) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axiosInstance.post<BackendMetradoImportResponse>(
    '/metrados/import/excel',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );

  if (!data.project)
    throw new Error('La API no devolvio el proyecto importado.');
  return {
    projectId: data.projectId,
    draft: mapBackendProjectToDraft(data.project, currentDraft, data.imported),
  };
};

const getBackendImportedSummary = (project: BackendMetradoProject) => ({
  blocks: project.blocks.length,
  items: project.items.length,
  measurementLines: project.measurementLines.length,
  rebarLines: project.rebarLines.length,
  platformadoLines: project.platformadoLines?.length ?? 0,
  attachments: project.attachments?.length ?? 0,
  refIssues: project.validations?.length ?? 0,
  repairedRefIssues:
    project.validations?.filter(issue => issue.status === 'RESOLVED').length ??
    0,
  pendingRefIssues:
    project.validations?.filter(issue => issue.status !== 'RESOLVED').length ??
    0,
});

const fetchMetradoDraftFromApi = async (
  projectId: string,
  currentDraft: MetradoDraft
) => {
  const { data } = await axiosInstance.get<BackendMetradoProject>(
    `/metrados/${projectId}`
  );
  return mapBackendProjectToDraft(
    data,
    currentDraft,
    getBackendImportedSummary(data)
  );
};

const thinBorder = {
  top: { style: 'thin' as const, color: { argb: 'FF5F6978' } },
  left: { style: 'thin' as const, color: { argb: 'FF5F6978' } },
  bottom: { style: 'thin' as const, color: { argb: 'FF5F6978' } },
  right: { style: 'thin' as const, color: { argb: 'FF5F6978' } },
};

const dottedBorder = {
  top: { style: 'dotted' as const, color: { argb: 'FF5F6978' } },
  left: { style: 'dotted' as const, color: { argb: 'FF5F6978' } },
  bottom: { style: 'dotted' as const, color: { argb: 'FF5F6978' } },
  right: { style: 'dotted' as const, color: { argb: 'FF5F6978' } },
};

const escapeSheetName = (name: string) => name.replace(/'/g, "''");

const setCellValueOrFormula = (
  cell: ExcelJS.Cell,
  value: string | number | '',
  formula?: string
) => {
  if (formula) {
    cell.value = {
      formula,
      result: value === '' ? 0 : value,
    };
    return;
  }
  cell.value = value;
};

const setSheetHeader = (
  sheet: ExcelJS.Worksheet,
  draft: MetradoDraft,
  title: string,
  lastColumn: number
) => {
  sheet.mergeCells(1, 2, 1, lastColumn);
  sheet.mergeCells(2, 2, 2, lastColumn);
  sheet.mergeCells(3, 2, 3, Math.min(5, lastColumn));
  if (lastColumn >= 6) {
    sheet.mergeCells(3, 6, 3, Math.min(10, lastColumn));
  }
  if (lastColumn >= 11) {
    sheet.mergeCells(3, 11, 3, lastColumn);
  }
  sheet.mergeCells(4, 2, 4, Math.min(10, lastColumn));
  if (lastColumn >= 11) {
    sheet.mergeCells(4, 11, 4, lastColumn);
  }
  sheet.mergeCells(5, 2, 5, lastColumn);

  sheet.getCell(1, 2).value = `"${draft.projectName.toUpperCase()}"`;
  sheet.getCell(
    2,
    2
  ).value = `UNIDAD EJECUTORA: ${draft.institution.toUpperCase()}`;
  sheet.getCell(3, 2).value = `CODIGO: ${draft.code}`;
  if (lastColumn >= 6) sheet.getCell(3, 6).value = 'CODIGO LOCAL:';
  if (lastColumn >= 11) sheet.getCell(3, 11).value = 'CODIGO MODULAR:';
  sheet.getCell(
    4,
    2
  ).value = `INSTITUCION EDUCATIVA: ${draft.institution.toUpperCase()}`;
  if (lastColumn >= 11) {
    sheet.getCell(4, 11).value = `UBICACION: ${draft.location.toUpperCase()}`;
  } else {
    sheet.getCell(4, 2).value = `${
      sheet.getCell(4, 2).value
    } - ${draft.location.toUpperCase()}`;
  }
  sheet.getCell(5, 2).value = title.toUpperCase();

  [1, 2, 3, 4, 5].forEach(rowNumber => {
    const row = sheet.getRow(rowNumber);
    row.height = rowNumber === 1 ? 28 : 18;
    for (let column = 2; column <= lastColumn; column += 1) {
      const cell = sheet.getCell(rowNumber, column);
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.font = { bold: true, size: rowNumber === 1 ? 12 : 10 };
      cell.border = thinBorder;
      if (rowNumber === 1)
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE7D8F6' },
        };
      if (rowNumber === 2)
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDDFBFF' },
        };
      if (rowNumber === 5)
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD8F6D5' },
        };
    }
  });
};

const styleGrid = (
  sheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number
) => {
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    for (let column = startCol; column <= endCol; column += 1) {
      const cell = sheet.getCell(rowNumber, column);
      cell.border = dottedBorder;
      cell.alignment = { vertical: 'middle', wrapText: true };
      if (typeof cell.value === 'number') cell.numFmt = '#,##0.00';
    }
  }
};

const getBlockItemTotal = (
  draft: MetradoDraft,
  item: WorkItem,
  block: Block
) => {
  const measurementTotal = draft.measurementLines
    .filter(line => line.itemId === item.id && line.blockId === block.id)
    .reduce((acc, line) => acc + calculateMeasurement(line).total, 0);
  const rebarTotal = draft.rebarLines
    .filter(line => line.itemId === item.id && line.blockId === block.id)
    .reduce((acc, line) => acc + calculateRebar(line).weightKg, 0);
  if (item.calculationType === 'acero') return round(rebarTotal);
  if (item.calculationType === 'mixto')
    return round(measurementTotal + rebarTotal);
  return round(measurementTotal);
};

const normalizeAttachmentSheet = (value?: string) =>
  toKey(value ?? '').replace(/\s+/g, '');

const isAttachmentForMeasurementLine = (
  attachment: MetradoAttachment,
  line: MeasurementLine
) => {
  if (attachment.scope !== 'measurement') return false;
  if (attachment.lineId && attachment.lineId === line.id) return true;
  if (!attachment.sourceSheet || !line.sourceSheet) return false;

  const sameSheet =
    normalizeAttachmentSheet(attachment.sourceSheet) ===
    normalizeAttachmentSheet(line.sourceSheet);
  if (!sameSheet) return false;

  const attachmentRow = Number(attachment.sourceRow);
  const lineRow = Number(line.sourceRow);
  if (!Number.isFinite(attachmentRow) || !Number.isFinite(lineRow))
    return false;

  const anchorStart = Number(attachment.anchor?.startRow ?? attachmentRow);
  const anchorEnd = Number(attachment.anchor?.endRow ?? attachmentRow);
  const nativeStart = Number(attachment.anchor?.nativeStartRow);
  const candidateRows = [
    attachmentRow,
    attachmentRow + 1,
    anchorStart,
    anchorStart + 1,
    anchorEnd,
    anchorEnd + 1,
    nativeStart,
    nativeStart + 1,
  ].filter(Number.isFinite);

  return (
    candidateRows.some(candidate => Math.abs(candidate - lineRow) <= 1) ||
    (lineRow >= anchorStart - 1 && lineRow <= anchorEnd + 1) ||
    (lineRow <= anchorStart + 1 && anchorStart - lineRow <= 8)
  );
};

const getMeasurementLineAttachments = (
  draft: MetradoDraft,
  line: MeasurementLine
) =>
  draft.attachments.filter(attachment =>
    isAttachmentForMeasurementLine(attachment, line)
  );

const getImageBase64Payload = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
};

const applyItemRowStyle = (
  row: ExcelJS.Row,
  item: WorkItem,
  endCol: number
) => {
  const colors = ['FFFF0000', 'FF009688', 'FF1769FF', 'FFFF00FF', 'FF111827'];
  const fontColor = colors[Math.min(item.level - 1, colors.length - 1)];
  for (let column = 2; column <= endCol; column += 1) {
    const cell = row.getCell(column);
    cell.font = {
      bold: Boolean(item.isHeading),
      color: { argb: item.isHeading ? fontColor : 'FF111827' },
      size: 9,
    };
    if (item.isHeading) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDDEBF7' },
      };
    }
  }
};

const addSummarySheet = (
  workbook: ExcelJS.Workbook,
  draft: MetradoDraft,
  activeBlocks: Block[]
) => {
  const summary = workbook.addWorksheet('Resumen');
  const totalCol = 5 + activeBlocks.length;
  setSheetHeader(
    summary,
    draft,
    'Resumen general de metrados de estructuras',
    totalCol
  );
  summary.views = [{ state: 'frozen', xSplit: 4, ySplit: 8 }];
  summary.columns = [
    { width: 4 },
    { width: 14 },
    { width: 58 },
    { width: 8 },
    ...activeBlocks.map(() => ({ width: 11 })),
    { width: 13 },
  ];

  summary.mergeCells(6, 2, 8, 2);
  summary.mergeCells(6, 3, 8, 3);
  summary.mergeCells(6, 4, 8, 4);
  summary.mergeCells(6, 5, 6, totalCol - 1);
  summary.mergeCells(6, totalCol, 8, totalCol);
  summary.getCell(6, 2).value = 'ITEM';
  summary.getCell(6, 3).value = 'DESCRIPCION';
  summary.getCell(6, 4).value = 'UND';
  summary.getCell(6, 5).value = 'BLOQUE';
  summary.getCell(6, totalCol).value = 'METRADO TOTAL';
  activeBlocks.forEach((block, index) => {
    const column = 5 + index;
    summary.getCell(7, column).value = block.code;
    summary.getCell(8, column).value = block.name;
  });

  for (let rowNumber = 6; rowNumber <= 8; rowNumber += 1) {
    for (let column = 2; column <= totalCol; column += 1) {
      const cell = summary.getCell(rowNumber, column);
      cell.font = { bold: true, size: 9 };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE7E7E7' },
      };
      cell.border = thinBorder;
    }
  }

  let rowNumber = 12;
  draft.items.forEach((item, index) => {
    const row = summary.getRow(rowNumber);
    row.getCell(1).value = index + 1;
    row.getCell(2).value = item.itemCode;
    row.getCell(3).value = item.description;
    row.getCell(4).value = item.unit;
    activeBlocks.forEach((block, blockIndex) => {
      const column = 5 + blockIndex;
      const value = getBlockItemTotal(draft, item, block);
      const sheetName = getExportGeneralSheetName(block);
      row.getCell(column).value = {
        formula: `VLOOKUP(B${rowNumber},'${escapeSheetName(
          sheetName
        )}'!B:L,11,FALSE)`,
        result: value,
      };
    });
    row.getCell(totalCol).value = {
      formula: `SUM(E${rowNumber}:${
        summary.getColumn(totalCol - 1).letter
      }${rowNumber})`,
      result: activeBlocks.reduce(
        (acc, block) => acc + getBlockItemTotal(draft, item, block),
        0
      ),
    };
    applyItemRowStyle(row, item, totalCol);
    rowNumber += 1;
  });

  styleGrid(summary, 9, Math.max(rowNumber - 1, 12), 1, totalCol);
};

const addGeneralBlockSheet = (
  workbook: ExcelJS.Workbook,
  draft: MetradoDraft,
  block: Block
) => {
  const sheet = workbook.addWorksheet(getExportGeneralSheetName(block));
  setSheetHeader(sheet, draft, `Bloque ${block.code}: ${block.name}`, 12);
  sheet.views = [{ state: 'frozen', xSplit: 4, ySplit: 8 }];
  sheet.columns = [
    { width: 4 },
    { width: 14 },
    { width: 58 },
    { width: 8 },
    { width: 11 },
    { width: 11 },
    { width: 11 },
    { width: 11 },
    { width: 11 },
    { width: 11 },
    { width: 11 },
    { width: 12 },
  ];

  [
    [6, 2, 7, 2],
    [6, 3, 7, 3],
    [6, 4, 7, 4],
    [6, 5, 7, 5],
    [6, 6, 6, 10],
    [6, 11, 7, 11],
    [6, 12, 7, 12],
  ].forEach(([startRow, startCol, endRow, endCol]) => {
    sheet.mergeCells(startRow, startCol, endRow, endCol);
  });

  sheet.getCell(6, 2).value = 'ITEM';
  sheet.getCell(6, 3).value = 'DESCRIPCION';
  sheet.getCell(6, 4).value = 'UND';
  sheet.getCell(6, 5).value = 'NUMERO DE VECES';
  sheet.getCell(6, 6).value = 'FORMA DE MEDICION';
  sheet.getCell(7, 6).value = 'UNIDAD (und.)';
  sheet.getCell(7, 7).value = 'LARGO(m)';
  sheet.getCell(7, 8).value = 'ANCHO(m)';
  sheet.getCell(7, 9).value = 'ALTURA(m)';
  sheet.getCell(7, 10).value = 'AREA CAD.(m2)';
  sheet.getCell(6, 11).value = 'PARCIAL';
  sheet.getCell(6, 12).value = 'TOTAL';

  for (let rowNumber = 6; rowNumber <= 7; rowNumber += 1) {
    for (let column = 2; column <= 12; column += 1) {
      const cell = sheet.getCell(rowNumber, column);
      cell.font = { bold: true, size: 9 };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE7E7E7' },
      };
      cell.border = thinBorder;
    }
  }

  let rowNumber = 8;
  draft.items.forEach((item, index) => {
    const itemStartRow = rowNumber;
    const lines =
      item.calculationType === 'acero'
        ? []
        : draft.measurementLines.filter(
            line => line.itemId === item.id && line.blockId === block.id
          );
    const measurementDetailRows = lines.reduce(
      (acc, line) =>
        acc + 1 + getMeasurementLineAttachments(draft, line).length,
      0
    );
    const row = sheet.getRow(rowNumber);
    row.getCell(1).value = index + 1;
    row.getCell(2).value = item.itemCode;
    row.getCell(3).value = item.description;
    row.getCell(4).value = item.unit;
    const detailCount =
      item.calculationType === 'acero' && !item.isHeading
        ? 1
        : measurementDetailRows;
    row.getCell(12).value = {
      formula: detailCount
        ? `SUM(L${rowNumber + 1}:L${rowNumber + detailCount})`
        : '0',
      result:
        item.calculationType === 'acero'
          ? draft.rebarLines
              .filter(
                line => line.itemId === item.id && line.blockId === block.id
              )
              .reduce((acc, line) => acc + calculateRebar(line).weightKg, 0)
          : lines.reduce(
              (acc, line) => acc + calculateMeasurement(line).total,
              0
            ),
    };
    applyItemRowStyle(row, item, 12);
    rowNumber += 1;

    if (item.calculationType === 'acero' && !item.isHeading) {
      const detail = sheet.getRow(rowNumber);
      const rebarSheetName = getExportRebarSheetName(block);
      const total = draft.rebarLines
        .filter(line => line.itemId === item.id && line.blockId === block.id)
        .reduce((acc, line) => acc + calculateRebar(line).weightKg, 0);
      detail.getCell(3).value = 'Ver planilla de aceros';
      detail.getCell(5).value = 1;
      detail.getCell(11).value = {
        formula: `VLOOKUP(B${itemStartRow},'${escapeSheetName(
          rebarSheetName
        )}'!A:O,15,FALSE)`,
        result: total,
      };
      detail.getCell(12).value = {
        formula: `E${rowNumber}*K${rowNumber}`,
        result: total,
      };
      rowNumber += 1;
    }

    lines.forEach(line => {
      const lineStartRow = rowNumber;
      const result = calculateMeasurement(line);
      const hasMeasurement = [
        line.times,
        line.unitCount,
        line.length,
        line.width,
        line.height,
        line.area,
      ].some(value => value !== '');
      const detail = sheet.getRow(rowNumber);
      detail.getCell(3).value = line.description;
      setCellValueOrFormula(
        detail.getCell(5),
        line.times,
        line.formulas?.times
      );
      setCellValueOrFormula(
        detail.getCell(6),
        line.unitCount,
        line.formulas?.unitCount
      );
      setCellValueOrFormula(
        detail.getCell(7),
        line.length,
        line.formulas?.length
      );
      setCellValueOrFormula(
        detail.getCell(8),
        line.width,
        line.formulas?.width
      );
      setCellValueOrFormula(
        detail.getCell(9),
        line.height,
        line.formulas?.height
      );
      setCellValueOrFormula(detail.getCell(10), line.area, line.formulas?.area);
      if (hasMeasurement) {
        detail.getCell(11).value = {
          formula: `PRODUCT(F${rowNumber}:J${rowNumber})`,
          result: result.partial,
        };
        detail.getCell(12).value = {
          formula: `E${rowNumber}*K${rowNumber}`,
          result: result.total,
        };
      }
      rowNumber += 1;

      getMeasurementLineAttachments(draft, line).forEach(attachment => {
        const imagePayload = getImageBase64Payload(attachment.dataUrl);
        if (!imagePayload) return;
        const imageId = workbook.addImage({
          base64: imagePayload.base64,
          extension: getExcelImageExtension(attachment.extension),
        });
        const imageRow = sheet.getRow(rowNumber);
        imageRow.height = attachment.anchor?.rowHeight ?? 150;
        imageRow.getCell(3).value = attachment.caption || attachment.name;
        imageRow.getCell(3).font = {
          italic: true,
          color: { argb: 'FF5F6978' },
          size: 8,
        };
        imageRow.getCell(3).alignment = { vertical: 'top', wrapText: true };
        const startColumn = sheet.getColumn(
          Math.max(1, attachment.anchor?.startCol ?? 2) + 1
        ).letter;
        const endColumn = sheet.getColumn(
          Math.min(11, Math.max(6, attachment.anchor?.endCol ?? 10)) + 1
        ).letter;
        sheet.addImage(
          imageId,
          `${startColumn}${rowNumber}:${endColumn}${rowNumber + 1}`
        );
        rowNumber += 1;
      });

      if (lineStartRow + 1 < rowNumber) {
        for (let column = 2; column <= 12; column += 1) {
          sheet.getCell(lineStartRow, column).alignment = {
            vertical: 'middle',
            wrapText: true,
          };
        }
      }
    });

    if (item.isHeading && rowNumber === itemStartRow + 1) {
      sheet.getRow(itemStartRow).getCell(12).value = 0;
    }
  });

  styleGrid(sheet, 8, Math.max(rowNumber - 1, 8), 1, 12);
};

const addRebarBlockSheet = (
  workbook: ExcelJS.Workbook,
  draft: MetradoDraft,
  block: Block
) => {
  const sheet = workbook.addWorksheet(getExportRebarSheetName(block));
  setSheetHeader(sheet, draft, `Acero bloque ${block.code}: ${block.name}`, 15);
  sheet.views = [{ state: 'frozen', xSplit: 5, ySplit: 8 }];
  sheet.columns = [
    { width: 14 },
    { width: 52 },
    { width: 10 },
    { width: 8 },
    { width: 11 },
    { width: 11 },
    { width: 11 },
    ...Object.keys(rebarWeights).map(() => ({ width: 10 })),
    { width: 12 },
  ];
  [
    [6, 1, 8, 1],
    [6, 2, 8, 2],
    [6, 3, 8, 3],
    [6, 4, 8, 4],
    [6, 5, 8, 5],
    [6, 6, 8, 6],
    [6, 7, 8, 7],
    [6, 8, 6, 14],
    [6, 15, 8, 15],
  ].forEach(([startRow, startCol, endRow, endCol]) => {
    sheet.mergeCells(startRow, startCol, endRow, endCol);
  });

  sheet.getCell(6, 1).value = 'ITEM';
  sheet.getCell(6, 2).value = 'DESCRIPCION';
  sheet.getCell(6, 3).value = 'DISENO';
  sheet.getCell(6, 4).value = 'Ø';
  sheet.getCell(6, 5).value = 'N° DE ELEMENTOS IGUALES';
  sheet.getCell(6, 6).value = 'N° DE PIEZAS POR ELEMENTO';
  sheet.getCell(6, 7).value = 'LONGITUD DE PIEZA';
  sheet.getCell(6, 8).value = 'PESO POR METRO DE LONGITUD';
  sheet.getCell(6, 15).value = 'PESO(kg)';

  Object.keys(rebarWeights).forEach((diameter, index) => {
    sheet.getCell(7, index + 8).value = diameter;
  });
  Object.values(rebarWeights).forEach((weight, index) => {
    sheet.getCell(8, index + 8).value = weight;
  });
  for (let rowNumber = 6; rowNumber <= 8; rowNumber += 1) {
    for (let column = 1; column <= 15; column += 1) {
      const cell = sheet.getCell(rowNumber, column);
      cell.font = { bold: true, size: 9 };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE7E7E7' },
      };
      cell.border = thinBorder;
    }
  }

  let rowNumber = 9;
  draft.items.forEach(item => {
    if (item.calculationType !== 'acero') return;
    const lines = draft.rebarLines.filter(
      line => line.itemId === item.id && line.blockId === block.id
    );
    const row = sheet.getRow(rowNumber);
    row.getCell(1).value = item.itemCode;
    row.getCell(2).value = item.description;
    row.getCell(15).value = {
      formula: lines.length
        ? `SUM(O${rowNumber + 1}:O${rowNumber + lines.length})`
        : '0',
      result: lines.reduce(
        (acc, line) => acc + calculateRebar(line).weightKg,
        0
      ),
    };
    applyItemRowStyle(row, item, 15);
    rowNumber += 1;

    lines.forEach(line => {
      const detail = sheet.getRow(rowNumber);
      const result = calculateRebar(line);
      detail.getCell(2).value = line.description;
      detail.getCell(3).value = line.design;
      detail.getCell(4).value = line.diameter;
      setCellValueOrFormula(
        detail.getCell(5),
        line.sameElements,
        line.formulas?.sameElements
      );
      setCellValueOrFormula(
        detail.getCell(6),
        line.piecesPerElement,
        line.formulas?.piecesPerElement
      );
      setCellValueOrFormula(
        detail.getCell(7),
        line.pieceLength,
        line.formulas?.pieceLength
      );
      Object.keys(rebarWeights).forEach((diameter, index) => {
        const column = 8 + index;
        const headerColumn = sheet.getColumn(column).letter;
        detail.getCell(column).value = {
          formula: `IF($D${rowNumber}=${headerColumn}$7,$E${rowNumber}*$F${rowNumber}*$G${rowNumber},0)`,
          result: diameter === line.diameter ? result.lengthTotal : 0,
        };
      });
      detail.getCell(15).value = {
        formula: `H${rowNumber}*H$8+I${rowNumber}*I$8+J${rowNumber}*J$8+K${rowNumber}*K$8+L${rowNumber}*L$8+M${rowNumber}*M$8+N${rowNumber}*N$8`,
        result: result.weightKg,
      };
      rowNumber += 1;
    });
  });

  styleGrid(sheet, 9, Math.max(rowNumber - 1, 9), 1, 15);
};

const addPlatformadoSheet = (
  workbook: ExcelJS.Workbook,
  draft: MetradoDraft
) => {
  const sheet = workbook.addWorksheet('PLATAFORMADO');
  setSheetHeader(sheet, draft, 'Platformado', 9);
  sheet.columns = [
    { width: 4 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
  ];
  const headers = [
    'PROGRESIVA',
    'AREA DE CORTE (m2)',
    'AREA DE RELLENO (m2)',
    'VOLUMEN DE CORTE (m3)',
    'VOLUMEN DE RELLENO (m3)',
    'V. CORTE ACUMULADO (m3)',
    'V. RELLENO ACUMULADO (m3)',
    'VOLUMEN TOTAL (m3)',
  ];
  headers.forEach((header, index) => {
    sheet.getCell(7, index + 2).value = header;
  });
  for (let column = 2; column <= 9; column += 1) {
    const cell = sheet.getCell(7, column);
    cell.font = { bold: true };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E7E7' },
    };
    cell.border = thinBorder;
  }
  sheet.mergeCells(9, 2, 9, 9);
  sheet.getCell(9, 2).value = 'CUADRO DE METRADOS EN EL ALINEAMIENTO 01';
  sheet.getCell(9, 2).font = { bold: true };
  sheet.getCell(9, 2).alignment = { horizontal: 'center', vertical: 'middle' };
  let rowNumber = 10;
  calculatePlatformadoRows(draft.platformadoLines).forEach(row => {
    const { line } = row;
    sheet.getCell(rowNumber, 2).value = line.progressive;
    sheet.getCell(rowNumber, 3).value = line.cutArea;
    sheet.getCell(rowNumber, 4).value = line.fillArea;
    sheet.getCell(rowNumber, 5).value = row.cutVolume;
    sheet.getCell(rowNumber, 6).value = row.fillVolume;
    sheet.getCell(rowNumber, 7).value = row.cutAccumulated;
    sheet.getCell(rowNumber, 8).value = row.fillAccumulated;
    sheet.getCell(rowNumber, 9).value = {
      formula: `G${rowNumber}-H${rowNumber}`,
      result: row.total,
    };
    rowNumber += 1;
  });
  styleGrid(sheet, 8, Math.max(rowNumber - 1, 10), 1, 9);
};

const addValidationSheet = (
  workbook: ExcelJS.Workbook,
  draft: MetradoDraft
) => {
  const issues = workbook.addWorksheet('VALIDACIONES');
  issues.addRow([
    'Hoja',
    'Celda',
    'Celdas afectadas',
    'Tipo',
    'Formula original',
    'Sugerencia',
    'Estado',
  ]);
  draft.validationIssues.forEach(issue => {
    issues.addRow([
      issue.sheetName,
      issue.cellReference,
      issue.affectedCells ?? 1,
      issue.issueType,
      issue.originalFormula,
      issue.suggestedFix,
      issue.status,
    ]);
  });
  issues.columns = [
    { width: 18 },
    { width: 16 },
    { width: 16 },
    { width: 32 },
    { width: 42 },
    { width: 72 },
    { width: 14 },
  ];
  issues.getRow(1).font = { bold: true };
};

const downloadWorkbook = async (draft: MetradoDraft, filename: string) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Dhyrium';
  workbook.created = new Date();
  const activeBlocks = draft.blocks.filter(block => block.active);

  addSummarySheet(workbook, draft, activeBlocks);
  activeBlocks.forEach(block => {
    addGeneralBlockSheet(workbook, draft, block);
    addRebarBlockSheet(workbook, draft, block);
  });
  addPlatformadoSheet(workbook, draft);
  addValidationSheet(workbook, draft);

  const metadata = workbook.addWorksheet('_metadata');
  metadata.state = 'veryHidden';
  metadata.addRows([
    ['generatedAt', new Date().toISOString()],
    ['source', 'Dhyrium modulo metrados'],
    ['status', draft.status],
    ['validationIssues', draft.validationIssues.length],
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const MetradoStructures = () => {
  const { role, profile } = useSelector(
    (state: RootState) => state.userSession
  );
  const [draft, setDraft] = useState<MetradoDraft>(() => getInitialDraft());
  const [projects, setProjects] = useState<MetradoProjectRecord[]>(() => {
    const storedProjects = parseProjectRecords(
      localStorage.getItem(PROJECTS_STORAGE_KEY)
    );
    return storedProjects.length
      ? storedProjects
      : [createProjectRecord(draft, 'project-default')];
  });
  const [activeProjectId, setActiveProjectId] = useState(() => {
    const storedProjectId = localStorage.getItem(ACTIVE_PROJECT_KEY);
    return storedProjectId &&
      projects.some(project => project.id === storedProjectId)
      ? storedProjectId
      : projects[0]?.id ?? 'project-default';
  });
  const [viewMode, setViewMode] = useState<ViewMode>('resumen');
  const [activeBlockId, setActiveBlockId] = useState(draft.blocks[0]?.id ?? '');
  const [selectedItemId, setSelectedItemId] = useState(
    draft.items.find(item => !item.isHeading)?.id ?? draft.items[0]?.id ?? ''
  );
  const [projectFilter, setProjectFilter] = useState('');
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isProjectEditorOpen, setIsProjectEditorOpen] = useState(false);
  const [deleteProjectDialog, setDeleteProjectDialog] =
    useState<MetradoProjectRecord | null>(null);
  const [summaryQuickNav, setSummaryQuickNav] = useState<{
    itemId: string;
    blockId: string;
  } | null>(null);
  const [detailInsertionTarget, setDetailInsertionTarget] =
    useState<DetailInsertionTarget | null>(null);
  const [summaryBlockQuickNav, setSummaryBlockQuickNav] = useState<
    string | null
  >(null);
  const [itemContextMenu, setItemContextMenu] = useState<{
    itemId: string;
    x: number;
    y: number;
  } | null>(null);
  const [catalogActionMenu, setCatalogActionMenu] = useState<{
    itemId: string;
    x: number;
    y: number;
  } | null>(null);
  const [catalogDrag, setCatalogDrag] = useState<{
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [catalogFilter, setCatalogFilter] = useState('');
  const [catalogView, setCatalogView] = useState<CatalogView>('todos');
  const [isBlockFilterOpen, setIsBlockFilterOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [lineAssignmentEditor, setLineAssignmentEditor] = useState<{
    lineId: string;
    kind: LineAssignmentKind;
    query: string;
  } | null>(null);
  const [visibleBlockIds, setVisibleBlockIds] = useState<string[]>(() =>
    draft.blocks.filter(block => block.active).map(block => block.id)
  );
  const [isExporting, setIsExporting] = useState(false);
  const [blockCreator, setBlockCreator] = useState({
    open: false,
    name: '',
    general: true,
    acero: true,
  });
  const importDecisionResolver = useRef<
    ((decision: ImportDecision) => void) | null
  >(null);
  const hydratedProjectIds = useRef<Set<string>>(new Set());
  const detailTableScrollRef = useRef<HTMLDivElement | null>(null);
  const detailTopScrollRef = useRef<HTMLDivElement | null>(null);
  const isSyncingDetailScroll = useRef(false);
  const workbookBlocksRef = useRef<HTMLDivElement | null>(null);
  const activeWorkbookTabRef = useRef<HTMLDivElement | null>(null);
  const [detailRailWidth, setDetailRailWidth] = useState(0);
  const [importDecisionDialog, setImportDecisionDialog] = useState<{
    fileName: string;
    currentProjectName: string;
    importedProjectName: string;
    importedSummary: string;
  } | null>(null);

  const canEdit = useMemo(
    () =>
      role?.menuPoints?.some(
        menuPoint =>
          menuPoint.route === 'metrados' && menuPoint.typeRol === 'MOD'
      ),
    [role]
  );

  useEffect(() => {
    safeSetLocalStorage(STORAGE_KEY, JSON.stringify(draft));
    setProjects(currentProjects => {
      const nextRecord = createProjectRecord(draft, activeProjectId);
      const nextProjects = currentProjects.some(
        project => project.id === activeProjectId
      )
        ? currentProjects.map(project =>
            project.id === activeProjectId ? nextRecord : project
          )
        : [nextRecord, ...currentProjects];
      safeSetLocalStorage(PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
      safeSetLocalStorage(ACTIVE_PROJECT_KEY, activeProjectId);
      return nextProjects;
    });
  }, [draft, activeProjectId]);

  useEffect(() => {
    if (
      !isUuid(activeProjectId) ||
      hydratedProjectIds.current.has(activeProjectId)
    ) {
      return;
    }

    let cancelled = false;
    hydratedProjectIds.current.add(activeProjectId);

    fetchMetradoDraftFromApi(activeProjectId, draft)
      .then(nextDraft => {
        if (cancelled) return;
        const shouldHydrate =
          nextDraft.attachments.length > draft.attachments.length ||
          nextDraft.measurementLines.length > draft.measurementLines.length ||
          nextDraft.rebarLines.length > draft.rebarLines.length;

        if (!shouldHydrate) return;

        setDraft(nextDraft);
        setActiveBlockId(current =>
          nextDraft.blocks.some(block => block.id === current)
            ? current
            : nextDraft.blocks.find(block => block.active)?.id ??
              nextDraft.blocks[0]?.id ??
              ''
        );
        setSelectedItemId(current =>
          nextDraft.items.some(item => item.id === current)
            ? current
            : nextDraft.items.find(item => !item.isHeading)?.id ??
              nextDraft.items[0]?.id ??
              ''
        );
        setVisibleBlockIds(current => {
          const validVisibleIds = current.filter(id =>
            nextDraft.blocks.some(block => block.id === id && block.active)
          );
          return validVisibleIds.length
            ? validVisibleIds
            : nextDraft.blocks
                .filter(block => block.active)
                .map(block => block.id);
        });
      })
      .catch(() => {
        hydratedProjectIds.current.delete(activeProjectId);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);

  useEffect(
    () => () => {
      importDecisionResolver.current?.('cancel');
      importDecisionResolver.current = null;
    },
    []
  );

  const activeBlock =
    draft.blocks.find(block => block.id === activeBlockId) ?? draft.blocks[0];
  const activeBlocks = useMemo(
    () => draft.blocks.filter(block => block.active),
    [draft.blocks]
  );
  const displayedBlocks = useMemo(
    () => activeBlocks.filter(block => visibleBlockIds.includes(block.id)),
    [activeBlocks, visibleBlockIds]
  );

  useEffect(() => {
    if (!['general', 'acero'].includes(viewMode)) {
      return;
    }

    const container = workbookBlocksRef.current;
    const activeTab = activeWorkbookTabRef.current;
    if (!container || !activeTab) {
      return;
    }

    const nextLeft =
      activeTab.offsetLeft -
      container.offsetLeft -
      (container.clientWidth - activeTab.clientWidth) / 2;
    container.scrollTo({
      left: Math.max(0, nextLeft),
      behavior: 'smooth',
    });
  }, [activeBlockId, viewMode, displayedBlocks.length]);

  const selectedItem =
    draft.items.find(item => item.id === selectedItemId) ??
    draft.items.find(item => !item.isHeading) ??
    draft.items[0];
  const selectedEditableItem = selectedItem?.isHeading
    ? draft.items.find(item => !item.isHeading)
    : selectedItem;
  const [catalogEditDraft, setCatalogEditDraft] = useState<CatalogItemDraft>(
    () => createCatalogItemDraft(selectedItem)
  );
  const normalizedProjectFilter = projectFilter.trim().toLowerCase();
  const filteredProjects = normalizedProjectFilter
    ? projects.filter(
        project =>
          project.name.toLowerCase().includes(normalizedProjectFilter) ||
          project.code.toLowerCase().includes(normalizedProjectFilter) ||
          project.institution.toLowerCase().includes(normalizedProjectFilter) ||
          project.location.toLowerCase().includes(normalizedProjectFilter)
      )
    : projects;
  const getProjectMetrics = (project: MetradoProjectRecord) => ({
    items: project.draft.items.filter(item => !item.isHeading).length,
    blocks: project.draft.blocks.filter(block => block.active).length,
    lines:
      project.draft.measurementLines.length +
      project.draft.rebarLines.length +
      project.draft.platformadoLines.length,
  });
  const platformadoRows = useMemo(
    () => calculatePlatformadoRows(draft.platformadoLines),
    [draft.platformadoLines]
  );

  useEffect(() => {
    setVisibleBlockIds(current => {
      const activeIds = activeBlocks.map(block => block.id);
      const kept = current.filter(id => activeIds.includes(id));
      return kept.length ? kept : activeIds;
    });
  }, [draft.blocks]);

  useEffect(() => {
    if (!displayedBlocks.length) return;
    if (!displayedBlocks.some(block => block.id === activeBlockId)) {
      setActiveBlockId(displayedBlocks[0].id);
    }
  }, [activeBlockId, displayedBlocks]);

  useEffect(() => {
    if (!['general', 'acero'].includes(viewMode)) {
      setDetailRailWidth(0);
      return;
    }

    const scrollPane = detailTableScrollRef.current;
    if (!scrollPane) return;

    const updateRailWidth = () => {
      const table = scrollPane.querySelector('table');
      const nextWidth = Math.max(
        scrollPane.scrollWidth,
        table?.scrollWidth ?? 0,
        scrollPane.clientWidth
      );
      setDetailRailWidth(nextWidth);
      if (detailTopScrollRef.current) {
        detailTopScrollRef.current.scrollLeft = scrollPane.scrollLeft;
      }
    };

    updateRailWidth();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateRailWidth)
        : null;
    resizeObserver?.observe(scrollPane);
    const table = scrollPane.querySelector('table');
    if (table) resizeObserver?.observe(table);

    window.addEventListener('resize', updateRailWidth);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateRailWidth);
    };
  }, [
    viewMode,
    activeBlockId,
    displayedBlocks.length,
    draft.measurementLines.length,
    draft.rebarLines.length,
    draft.items.length,
  ]);

  useEffect(() => {
    const closeFloatingMenus = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      setCatalogActionMenu(null);
      setSummaryQuickNav(null);
      setSummaryBlockQuickNav(null);
      if (event instanceof KeyboardEvent) {
        setItemContextMenu(null);
        setIsBlockFilterOpen(false);
        setLineAssignmentEditor(null);
        setIsProjectEditorOpen(false);
      }
    };
    document.addEventListener('click', closeFloatingMenus);
    document.addEventListener('keydown', closeFloatingMenus);
    return () => {
      document.removeEventListener('click', closeFloatingMenus);
      document.removeEventListener('keydown', closeFloatingMenus);
    };
  }, []);

  useEffect(() => {
    if (!catalogDrag) return;
    const handlePointerMove = (event: PointerEvent) => {
      setItemContextMenu(current => {
        if (!current) return current;
        const nextX = Math.max(
          8,
          Math.min(event.clientX - catalogDrag.offsetX, window.innerWidth - 220)
        );
        const nextY = Math.max(
          8,
          Math.min(event.clientY - catalogDrag.offsetY, window.innerHeight - 80)
        );
        return { ...current, x: nextX, y: nextY };
      });
    };
    const handlePointerUp = () => setCatalogDrag(null);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [catalogDrag]);

  useEffect(() => {
    setCatalogEditDraft(createCatalogItemDraft(selectedItem));
  }, [selectedItem?.id]);

  const summaryRows = useMemo(
    () =>
      draft.items.map(item => {
        const totalsByBlock = displayedBlocks.map(block => {
          const measurementTotal = draft.measurementLines
            .filter(
              line => line.itemId === item.id && line.blockId === block.id
            )
            .reduce((acc, line) => acc + calculateMeasurement(line).total, 0);
          const rebarTotal = draft.rebarLines
            .filter(
              line => line.itemId === item.id && line.blockId === block.id
            )
            .reduce((acc, line) => acc + calculateRebar(line).weightKg, 0);
          if (item.calculationType === 'acero') return round(rebarTotal);
          if (item.calculationType === 'mixto')
            return round(measurementTotal + rebarTotal);
          return round(measurementTotal);
        });
        return {
          item,
          totalsByBlock: totalsByBlock.map(total =>
            roundBy(total, draft.decimalPrecision)
          ),
          total: roundBy(
            totalsByBlock.reduce((acc, value) => acc + value, 0),
            draft.decimalPrecision
          ),
        };
      }),
    [displayedBlocks, draft]
  );

  const itemOrder = useMemo(
    () => new Map(draft.items.map((item, index) => [item.id, index])),
    [draft.items]
  );
  const measurementLines = useMemo(
    () =>
      draft.measurementLines
        .filter(line => line.blockId === activeBlock?.id)
        .sort(
          (a, b) =>
            (itemOrder.get(a.itemId) ?? 0) - (itemOrder.get(b.itemId) ?? 0)
        ),
    [activeBlock?.id, draft.measurementLines, itemOrder]
  );
  const rebarLines = useMemo(
    () =>
      draft.rebarLines
        .filter(line => line.blockId === activeBlock?.id)
        .sort(
          (a, b) =>
            (itemOrder.get(a.itemId) ?? 0) - (itemOrder.get(b.itemId) ?? 0)
        ),
    [activeBlock?.id, draft.rebarLines, itemOrder]
  );
  const measurementSections = useMemo(
    () =>
      draft.items
        .map(item => ({
          item,
          lines: measurementLines.filter(line => line.itemId === item.id),
        }))
        .filter(
          section =>
            section.item.isHeading ||
            section.item.calculationType !== 'acero' ||
            section.lines.length
        ),
    [draft.items, measurementLines]
  );
  const rebarSections = useMemo(
    () =>
      draft.items
        .map(item => ({
          item,
          lines: rebarLines.filter(line => line.itemId === item.id),
        }))
        .filter(
          section =>
            section.lines.length ||
            section.item.calculationType === 'acero' ||
            section.item.unit?.toLowerCase() === 'kg'
        ),
    [draft.items, rebarLines]
  );
  const firstRebarItem =
    draft.items.find(
      item =>
        !item.isHeading &&
        (item.calculationType === 'acero' || item.unit?.toLowerCase() === 'kg')
    ) ?? null;
  const selectedItemUsesRebar =
    Boolean(selectedItem && !selectedItem.isHeading) &&
    (selectedItem?.calculationType === 'acero' ||
      selectedItem?.unit?.toLowerCase() === 'kg');
  const selectedItemUsesGeneral =
    Boolean(selectedItem && !selectedItem.isHeading) &&
    selectedItem?.calculationType !== 'acero';
  const grandTotal = summaryRows.reduce((acc, row) => acc + row.total, 0);
  const issueCount = draft.validationIssues.filter(
    issue => issue.status !== 'resuelto'
  ).length;
  const capturedLineCount =
    draft.measurementLines.length +
    draft.rebarLines.length +
    draft.platformadoLines.length;
  const selectedItemIndex = selectedItem
    ? draft.items.findIndex(item => item.id === selectedItem.id)
    : -1;
  const selectedItemRange =
    selectedItemIndex >= 0
      ? getItemSubtreeRange(draft.items, selectedItemIndex)
      : { start: -1, end: -1 };
  const selectedTreeItemIds =
    selectedItemIndex >= 0
      ? draft.items
          .slice(selectedItemRange.start, selectedItemRange.end)
          .map(item => item.id)
      : [];
  const selectedItemLinkedLines =
    draft.measurementLines.filter(line =>
      selectedTreeItemIds.includes(line.itemId)
    ).length +
    draft.rebarLines.filter(line => selectedTreeItemIds.includes(line.itemId))
      .length;
  const selectedItemParentCode = selectedItem
    ? getParentItemCode(selectedItem.itemCode)
    : '';
  const selectedItemHasPreviousSibling =
    Boolean(selectedItem) &&
    selectedItemIndex > 0 &&
    draft.items
      .slice(0, selectedItemIndex)
      .some(
        item =>
          item.level === selectedItem?.level &&
          getParentItemCode(item.itemCode) === selectedItemParentCode
      );
  const selectedItemHasNextSibling =
    Boolean(selectedItem) &&
    selectedItemIndex >= 0 &&
    draft.items.some(
      (item, index) =>
        index >= selectedItemRange.end &&
        item.level === selectedItem?.level &&
        getParentItemCode(item.itemCode) === selectedItemParentCode
    );
  const canPromoteSelectedItem =
    Boolean(selectedItem) && selectedItemIndex >= 0 && selectedItem.level > 1;
  const canDemoteSelectedItem =
    Boolean(selectedItem) &&
    selectedItemIndex > 0 &&
    selectedItem.level < 6 &&
    selectedItemHasPreviousSibling;
  const assignmentLine =
    lineAssignmentEditor?.kind === 'general'
      ? draft.measurementLines.find(
          line => line.id === lineAssignmentEditor.lineId
        )
      : lineAssignmentEditor?.kind === 'acero'
      ? draft.rebarLines.find(line => line.id === lineAssignmentEditor.lineId)
      : undefined;
  const assignmentCurrentItem = assignmentLine
    ? draft.items.find(item => item.id === assignmentLine.itemId)
    : undefined;
  const assignmentQuery =
    lineAssignmentEditor?.query.trim().toLowerCase() ?? '';
  const assignmentItems = useMemo(() => {
    const candidates = draft.items.filter(item => !item.isHeading);
    const filtered = assignmentQuery
      ? candidates.filter(item =>
          [item.itemCode, item.description, item.unit, item.calculationType]
            .join(' ')
            .toLowerCase()
            .includes(assignmentQuery)
        )
      : candidates;
    return filtered.slice(0, 80);
  }, [assignmentQuery, draft.items]);
  const catalogViewOptions: Array<{
    id: CatalogView;
    label: string;
    count: number;
  }> = useMemo(
    () => [
      { id: 'todos', label: 'Todos', count: draft.items.length },
      {
        id: 'titulos',
        label: 'Titulos',
        count: draft.items.filter(item => item.isHeading).length,
      },
      {
        id: 'general',
        label: 'Partidas generales',
        count: draft.items.filter(
          item =>
            !item.isHeading &&
            (item.calculationType === 'general' ||
              item.calculationType === 'mixto')
        ).length,
      },
      {
        id: 'acero',
        label: 'Acero',
        count: draft.items.filter(
          item =>
            !item.isHeading &&
            (item.calculationType === 'acero' ||
              item.unit.toLowerCase() === 'kg')
        ).length,
      },
      {
        id: 'platformado',
        label: 'Platformado',
        count: draft.items.filter(
          item => !item.isHeading && item.calculationType === 'platformado'
        ).length,
      },
    ],
    [draft.items]
  );
  const activeCatalogView =
    catalogViewOptions.find(option => option.id === catalogView) ??
    catalogViewOptions[0];
  const filteredCatalogItems = useMemo(() => {
    const query = catalogFilter.trim().toLowerCase();
    return draft.items.filter(item => {
      const matchesView =
        catalogView === 'todos' ||
        (catalogView === 'titulos' && item.isHeading) ||
        (catalogView === 'general' &&
          !item.isHeading &&
          (item.calculationType === 'general' ||
            item.calculationType === 'mixto')) ||
        (catalogView === 'acero' &&
          !item.isHeading &&
          (item.calculationType === 'acero' ||
            item.unit.toLowerCase() === 'kg')) ||
        (catalogView === 'platformado' &&
          !item.isHeading &&
          item.calculationType === 'platformado');
      if (!matchesView) return false;
      if (!query) return true;
      return [
        item.itemCode,
        item.description,
        item.unit,
        item.calculationType,
        item.isHeading ? 'titulo' : 'partida',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [catalogFilter, catalogView, draft.items]);

  const goToSummaryDetail = (
    itemId: string,
    blockId: string,
    mode: Extract<ViewMode, 'general' | 'acero'>
  ) => {
    setSelectedItemId(itemId);
    setDetailInsertionTarget({ kind: mode, blockId, itemId });
    setActiveBlockId(blockId);
    setViewMode(mode);
    setSummaryQuickNav(null);
    setSummaryBlockQuickNav(null);
  };

  const openItemCatalog = (
    itemId: string,
    position: { x: number; y: number }
  ) => {
    setSelectedItemId(itemId);
    setCatalogFilter('');
    setCatalogActionMenu(null);
    setItemContextMenu({
      itemId,
      x: Math.max(8, Math.min(position.x, window.innerWidth - 680)),
      y: Math.max(8, Math.min(position.y, window.innerHeight - 520)),
    });
  };

  const goToBlockDetail = (
    blockId: string,
    mode: Extract<ViewMode, 'general' | 'acero'>
  ) => {
    setActiveBlockId(blockId);
    setDetailInsertionTarget(current =>
      current && current.kind === mode
        ? { ...current, blockId, lineId: undefined }
        : selectedItem
        ? { kind: mode, blockId, itemId: selectedItem.id }
        : null
    );
    setViewMode(mode);
    setSummaryQuickNav(null);
    setSummaryBlockQuickNav(null);
  };

  const getNextBlockCode = () => {
    const usedCodes = new Set(
      draft.blocks.map(block => block.code.trim().toUpperCase()).filter(Boolean)
    );
    const nextLetter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      .split('')
      .find(letter => !usedCodes.has(letter));
    if (nextLetter) return nextLetter;

    let fallbackIndex = 1;
    while (usedCodes.has(`B${fallbackIndex}`)) {
      fallbackIndex += 1;
    }
    return `B${fallbackIndex}`;
  };

  const addBlockFromCreator = () => {
    const blockName = blockCreator.name.trim();
    if (!blockName) {
      window.alert('Escribe el nombre del bloque.');
      return;
    }
    if (!blockCreator.general && !blockCreator.acero) {
      window.alert('Marca al menos Metrado general o Acero.');
      return;
    }
    const newBlock: Block = {
      id: createId('block'),
      code: getNextBlockCode(),
      name: blockName,
      active: true,
    };
    updateDraft(
      {
        ...draft,
        blocks: [...draft.blocks, newBlock],
      },
      `Bloque creado: ${newBlock.code}`
    );
    setVisibleBlockIds(current => [...new Set([...current, newBlock.id])]);
    setActiveBlockId(newBlock.id);
    setViewMode(
      blockCreator.acero && !blockCreator.general ? 'acero' : 'general'
    );
    setBlockCreator({ open: false, name: '', general: true, acero: true });
  };

  const deleteActiveBlock = () => {
    if (!activeBlock) return;
    if (draft.blocks.length <= 1) {
      window.alert('Debe quedar al menos un bloque en el metrado.');
      return;
    }

    const generalCount = draft.measurementLines.filter(
      line => line.blockId === activeBlock.id
    ).length;
    const rebarCount = draft.rebarLines.filter(
      line => line.blockId === activeBlock.id
    ).length;
    const imageCount = draft.attachments.filter(
      attachment => attachment.blockId === activeBlock.id
    ).length;
    const confirmed = window.confirm(
      `Eliminar bloque ${activeBlock.code} - ${activeBlock.name}?\n\n` +
        `Se eliminaran ${generalCount} linea(s) de metrado general, ${rebarCount} linea(s) de acero` +
        `${imageCount ? ` y ${imageCount} imagen(es) asociada(s)` : ''}.`
    );
    if (!confirmed) return;

    const remainingBlocks = draft.blocks.filter(
      block => block.id !== activeBlock.id
    );
    const nextActiveBlock =
      remainingBlocks.find(block => block.active) ?? remainingBlocks[0];

    updateDraft(
      {
        ...draft,
        blocks: remainingBlocks,
        measurementLines: draft.measurementLines.filter(
          line => line.blockId !== activeBlock.id
        ),
        rebarLines: draft.rebarLines.filter(
          line => line.blockId !== activeBlock.id
        ),
        attachments: draft.attachments.filter(
          attachment => attachment.blockId !== activeBlock.id
        ),
      },
      `Bloque eliminado: ${activeBlock.code}`
    );
    setVisibleBlockIds(current => {
      const remainingBlockIds = new Set(remainingBlocks.map(block => block.id));
      const cleaned = current.filter(id => remainingBlockIds.has(id));
      if (cleaned.length) return cleaned;
      return nextActiveBlock ? [nextActiveBlock.id] : [];
    });
    setActiveBlockId(nextActiveBlock?.id ?? '');
    setDetailInsertionTarget(current =>
      current && nextActiveBlock
        ? { ...current, blockId: nextActiveBlock.id, lineId: undefined }
        : null
    );
    setSummaryBlockQuickNav(null);
    setSummaryQuickNav(null);
    setIsBlockFilterOpen(false);
  };

  const goToAdjacentBlock = (direction: 'previous' | 'next') => {
    if (!displayedBlocks.length || !activeBlock) return;
    const currentIndex = displayedBlocks.findIndex(
      block => block.id === activeBlock.id
    );
    const normalizedIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex =
      direction === 'previous'
        ? (normalizedIndex - 1 + displayedBlocks.length) %
          displayedBlocks.length
        : (normalizedIndex + 1) % displayedBlocks.length;
    const nextBlockId = displayedBlocks[nextIndex].id;
    setActiveBlockId(nextBlockId);
    setDetailInsertionTarget(current =>
      current
        ? { ...current, blockId: nextBlockId, lineId: undefined }
        : current
    );
  };

  const toggleVisibleBlock = (blockId: string) => {
    setVisibleBlockIds(current =>
      current.includes(blockId)
        ? current.length <= 1
          ? current
          : current.filter(id => id !== blockId)
        : [...current, blockId]
    );
  };

  const showAllBlocks = () => {
    setVisibleBlockIds(activeBlocks.map(block => block.id));
  };

  const showOnlyActiveBlock = () => {
    if (!activeBlock) return;
    setVisibleBlockIds([activeBlock.id]);
  };

  const getBlockFilterTriggerClass = (baseClass = '') =>
    [
      baseClass,
      'metrado-block-filter-trigger',
      isBlockFilterOpen ? 'is-active' : '',
      displayedBlocks.length < activeBlocks.length ? 'has-filter' : '',
    ]
      .filter(Boolean)
      .join(' ');

  const renderBlockFilterButtonContent = () => (
    <>
      <span>Bloques</span>
      <strong>
        {displayedBlocks.length}/{activeBlocks.length}
      </strong>
    </>
  );

  const renderBlockVisibilityPanel = () => (
    <div
      className="metrado-block-filter-panel"
      role="dialog"
      aria-label="Filtro de bloques visibles"
      onClick={event => event.stopPropagation()}
    >
      <header>
        <div>
          <strong>Bloques visibles</strong>
          <small>Marca los bloques que quieres ver en la tabla.</small>
        </div>
        <span>
          {displayedBlocks.length}/{activeBlocks.length}
        </span>
        <button
          type="button"
          className="metrado-block-filter-close"
          onClick={() => setIsBlockFilterOpen(false)}
          aria-label="Cerrar filtro de bloques"
        >
          x
        </button>
      </header>
      <div className="metrado-block-filter-actions">
        <button type="button" onClick={showAllBlocks}>
          Todos
        </button>
        <button type="button" onClick={showOnlyActiveBlock}>
          Solo bloque activo
        </button>
      </div>
      <div className="metrado-block-filter-grid">
        {activeBlocks.map(block => {
          const isVisible = visibleBlockIds.includes(block.id);
          const isCurrent = block.id === activeBlock?.id;
          const isLocked = isVisible && visibleBlockIds.length <= 1;
          const blockClassName = [
            isVisible ? 'is-visible' : 'is-hidden',
            isCurrent ? 'is-current' : '',
            isLocked ? 'is-locked' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <label
              key={block.id}
              className={blockClassName}
              title={
                isLocked
                  ? 'Debe quedar al menos un bloque visible.'
                  : `${block.code} - ${block.name}`
              }
            >
              <input
                type="checkbox"
                checked={isVisible}
                disabled={isLocked}
                onChange={() => toggleVisibleBlock(block.id)}
              />
              <strong>{block.code}</strong>
              <span>{block.name}</span>
              {isCurrent && <em>Activo</em>}
            </label>
          );
        })}
      </div>
      <p className="metrado-block-filter-note">
        Este filtro solo cambia la vista; no elimina informacion del metrado.
      </p>
    </div>
  );

  const openBlockCreator = () => {
    setIsBlockFilterOpen(false);
    setBlockCreator({
      open: true,
      name: '',
      general: true,
      acero: true,
    });
  };

  const openCatalogTool = () => {
    const targetItemId = selectedItem?.id ?? draft.items[0]?.id;
    if (!targetItemId) return;
    setViewMode('resumen');
    openItemCatalog(targetItemId, {
      x: Math.max(12, window.innerWidth - 760),
      y: 120,
    });
  };

  const openQuickCalculator = () => {
    const expression = window.prompt(
      'Calculadora rapida. Usa operaciones como 2.40*1.50*0.60'
    );
    if (!expression) return;
    const normalizedExpression = expression.replaceAll(',', '.');
    if (!/^[0-9+\-*/().\s]+$/.test(normalizedExpression)) {
      window.alert('Solo se permiten numeros y operadores + - * / ( ).');
      return;
    }
    try {
      const result = Function(
        `"use strict"; return (${normalizedExpression});`
      )();
      if (!Number.isFinite(result)) throw new Error('Resultado invalido');
      window.alert(`Resultado: ${roundBy(result, draft.decimalPrecision)}`);
    } catch {
      window.alert('No se pudo calcular la expresion.');
    }
  };

  const closeToolsAndRun = (action: () => void) => {
    setIsToolsOpen(false);
    action();
  };

  const renderToolsMenu = () => (
    <div
      className="metrado-tools-menu"
      onClick={event => event.stopPropagation()}
    >
      <button
        type="button"
        className={
          isToolsOpen
            ? 'metrado-secondary-btn is-active'
            : 'metrado-secondary-btn'
        }
        onClick={() => setIsToolsOpen(current => !current)}
      >
        Herramientas
      </button>
      {isToolsOpen && (
        <div
          className="metrado-tools-panel"
          role="menu"
          aria-label="Herramientas del metrado"
        >
          <section>
            <strong>Estructura</strong>
            <button
              type="button"
              onClick={() => closeToolsAndRun(openCatalogTool)}
            >
              <span>Estructura de partidas</span>
              <small>Codigos, niveles, titulos y orden.</small>
            </button>
            <button
              type="button"
              onClick={() =>
                closeToolsAndRun(() => {
                  setIsBlockFilterOpen(true);
                  setViewMode('resumen');
                })
              }
            >
              <span>Bloques visibles</span>
              <small>Marcar que bloques participan en pantalla.</small>
            </button>
            <button
              type="button"
              onClick={() => closeToolsAndRun(openBlockCreator)}
            >
              <span>Agregar bloque</span>
              <small>Crea un bloque con metrado general y/o acero.</small>
            </button>
          </section>
          <section>
            <strong>Control</strong>
            <button
              type="button"
              onClick={() =>
                closeToolsAndRun(() => setViewMode('configuracion'))
              }
            >
              <span>Configuracion de calculo</span>
              <small>Precision, bloques, partidas y tipo de calculo.</small>
            </button>
            <button
              type="button"
              onClick={() =>
                closeToolsAndRun(() => setViewMode('validaciones'))
              }
            >
              <span>Validaciones</span>
              <small>Incidencias, referencias y totales por revisar.</small>
            </button>
            <button
              type="button"
              onClick={() => closeToolsAndRun(openQuickCalculator)}
            >
              <span>Calculadora rapida</span>
              <small>Calcula areas, volumenes o factores auxiliares.</small>
            </button>
          </section>
          <section>
            <strong>Salida</strong>
            <button
              type="button"
              onClick={() =>
                closeToolsAndRun(() => setIsProjectEditorOpen(true))
              }
            >
              <span>Cabecera y datos</span>
              <small>Proyecto, institucion, ubicacion y codigo.</small>
            </button>
            <button
              type="button"
              onClick={() =>
                closeToolsAndRun(() => setViewMode('exportaciones'))
              }
            >
              <span>Formato Excel</span>
              <small>Exportaciones generadas y salida del metrado.</small>
            </button>
          </section>
        </div>
      )}
    </div>
  );

  const syncDetailHorizontalScroll = (
    event: UIEvent<HTMLDivElement>,
    targetRef: typeof detailTableScrollRef
  ) => {
    if (isSyncingDetailScroll.current) {
      return;
    }

    const target = targetRef.current;
    if (!target) {
      return;
    }

    isSyncingDetailScroll.current = true;
    target.scrollLeft = event.currentTarget.scrollLeft;
    requestAnimationFrame(() => {
      isSyncingDetailScroll.current = false;
    });
  };

  const renderDetailHorizontalRail = () => (
    <div
      className="metrado-detail-scroll-rail"
      ref={detailTopScrollRef}
      onScroll={event =>
        syncDetailHorizontalScroll(event, detailTableScrollRef)
      }
      aria-label="Desplazamiento horizontal inferior de columnas"
    >
      <div style={{ width: `${Math.max(detailRailWidth, 1)}px` }} />
    </div>
  );

  const renderWorkbookNavigation = () => {
    const isDetailMode = viewMode === 'general' || viewMode === 'acero';
    const canDeleteActiveBlock = Boolean(
      activeBlock && draft.blocks.length > 1
    );
    const renderBlockActionTools = (includeModuleTools = false) => (
      <div
        className={
          includeModuleTools
            ? 'metrado-workbook-tools'
            : 'metrado-workbook-tools metrado-workbook-block-actions'
        }
        aria-label="Herramientas de bloque"
      >
        <div
          className="metrado-workbook-filter-menu"
          onClick={event => event.stopPropagation()}
        >
          <button
            type="button"
            className={getBlockFilterTriggerClass()}
            aria-haspopup="dialog"
            aria-expanded={isBlockFilterOpen}
            title="Filtrar bloques visibles en la tabla"
            onClick={() => setIsBlockFilterOpen(current => !current)}
          >
            {renderBlockFilterButtonContent()}
          </button>
          {isBlockFilterOpen && renderBlockVisibilityPanel()}
        </div>
        <button
          type="button"
          className="metrado-workbook-add-block"
          title="Crear bloque con metrado general y/o acero"
          onClick={openBlockCreator}
        >
          + Bloque
        </button>
        <button
          type="button"
          className="metrado-workbook-delete-block"
          title={
            canDeleteActiveBlock
              ? 'Eliminar el bloque activo y sus lineas asociadas'
              : 'Debe quedar al menos un bloque'
          }
          disabled={!canDeleteActiveBlock}
          onClick={deleteActiveBlock}
        >
          Eliminar
        </button>
        {includeModuleTools &&
          (
            [
              ['configuracion', 'Config.'],
              [
                'validaciones',
                `Validar ${issueCount ? `(${issueCount})` : ''}`,
              ],
              ['exportaciones', 'Excel'],
              ['historial', 'Historial'],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              className={viewMode === mode ? 'is-active' : ''}
              onClick={() => {
                setIsBlockFilterOpen(false);
                setViewMode(mode as ViewMode);
              }}
            >
              {label}
            </button>
          ))}
      </div>
    );

    if (isDetailMode) {
      return (
        <div
          className="metrado-workbook-tabs is-detail-compact"
          aria-label="Contexto de hoja actual"
        >
          <button
            type="button"
            className="metrado-workbook-summary"
            onClick={() => setViewMode('resumen')}
          >
            Resumen
          </button>
          <span
            className="metrado-workbook-context-only"
            title={activeBlock?.name ?? ''}
          >
            <strong>{activeBlock?.code ?? '-'}</strong>
            <span>{activeBlock?.name ?? 'Sin bloque seleccionado'}</span>
          </span>
          {renderBlockActionTools(false)}
        </div>
      );
    }

    return (
      <div
        className="metrado-workbook-tabs"
        aria-label="Navegacion estilo Excel"
      >
        <button
          type="button"
          className={
            viewMode === 'resumen'
              ? 'metrado-workbook-summary is-active'
              : 'metrado-workbook-summary'
          }
          onClick={() => setViewMode('resumen')}
        >
          Resumen
        </button>
        <div
          className="metrado-workbook-mode-strip"
          aria-label="Modo del bloque seleccionado"
        >
          <span
            className="metrado-workbook-active-block"
            title={activeBlock?.name ?? ''}
          >
            <strong>{activeBlock?.code ?? '-'}</strong>
            <span>{activeBlock?.name ?? 'Sin bloque seleccionado'}</span>
          </span>
          <button
            type="button"
            className="is-general-mode"
            onClick={() =>
              activeBlock && goToBlockDetail(activeBlock.id, 'general')
            }
          >
            Metrado general
          </button>
          <button
            type="button"
            className="is-acero-mode"
            onClick={() =>
              activeBlock && goToBlockDetail(activeBlock.id, 'acero')
            }
          >
            Acero
          </button>
        </div>
        {renderBlockActionTools(true)}
      </div>
    );
  };

  const renderDetailDynamicHeader = (
    mode: Extract<ViewMode, 'general' | 'acero'>,
    onAddLine: () => void
  ) => {
    const visibleOptions = activeBlock
      ? uniqueBy([activeBlock, ...displayedBlocks], block => block.id)
      : displayedBlocks;
    const modeLabel = mode === 'acero' ? 'Acero' : 'Metrado general';
    const referenceText =
      selectedItem && !selectedItem.isHeading
        ? `Referencia ${selectedItem.itemCode}`
        : 'Todas las partidas';
    const modeClass = mode === 'acero' ? 'is-acero-mode' : 'is-general-mode';
    const selectedDetailLineId =
      detailInsertionTarget?.kind === mode &&
      detailInsertionTarget.blockId === activeBlock?.id
        ? detailInsertionTarget.lineId
        : undefined;

    return (
      <div className={`metrado-detail-dynamic-header ${modeClass}`}>
        <div className="metrado-detail-dynamic-title">
          <strong className="metrado-detail-mode-badge">{modeLabel}</strong>
          <span>
            Bloque {activeBlock?.code}: {activeBlock?.name}
          </span>
          <em>{referenceText}</em>
        </div>
        <div className="metrado-detail-dynamic-controls">
          <div className="metrado-detail-control-group metrado-detail-nav-group">
            <button type="button" onClick={() => goToAdjacentBlock('previous')}>
              Anterior
            </button>
            <select
              value={activeBlock?.id ?? ''}
              onChange={event => goToBlockDetail(event.target.value, mode)}
            >
              {visibleOptions.map(block => (
                <option key={block.id} value={block.id}>
                  {block.code} - {block.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => goToAdjacentBlock('next')}>
              Siguiente
            </button>
          </div>
          <div className="metrado-detail-control-group metrado-detail-view-group">
            <button
              type="button"
              className={mode === 'general' ? 'is-active' : ''}
              onClick={() =>
                activeBlock && goToBlockDetail(activeBlock.id, 'general')
              }
            >
              Metrado general
            </button>
            <button
              type="button"
              className={mode === 'acero' ? 'is-active' : ''}
              onClick={() =>
                activeBlock && goToBlockDetail(activeBlock.id, 'acero')
              }
            >
              Acero
            </button>
          </div>
          <div
            className="metrado-detail-filter-menu metrado-detail-control-group"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              className={getBlockFilterTriggerClass()}
              aria-haspopup="dialog"
              aria-expanded={isBlockFilterOpen}
              title="Filtrar bloques visibles en la tabla"
              onClick={() => setIsBlockFilterOpen(current => !current)}
            >
              {renderBlockFilterButtonContent()}
            </button>
            {isBlockFilterOpen && renderBlockVisibilityPanel()}
          </div>
          <button
            type="button"
            className="is-primary-action"
            onClick={onAddLine}
          >
            {mode === 'acero' ? 'Agregar acero' : 'Agregar linea'}
          </button>
          <button
            type="button"
            className="is-danger-action"
            disabled={!selectedDetailLineId}
            title={
              selectedDetailLineId
                ? 'Eliminar la linea seleccionada'
                : 'Selecciona una linea para poder eliminarla'
            }
            onClick={() => {
              if (!selectedDetailLineId) return;
              if (mode === 'general') {
                deleteMeasurementLine(selectedDetailLineId);
              } else {
                deleteRebarLine(selectedDetailLineId);
              }
            }}
          >
            Eliminar linea
          </button>
        </div>
      </div>
    );
  };

  const resetWorkspaceForDraft = (nextDraft: MetradoDraft) => {
    setActiveBlockId(
      nextDraft.blocks.find(block => block.active)?.id ??
        nextDraft.blocks[0]?.id ??
        ''
    );
    setSelectedItemId(
      nextDraft.items.find(item => !item.isHeading)?.id ??
        nextDraft.items[0]?.id ??
        ''
    );
    setVisibleBlockIds(
      nextDraft.blocks.filter(block => block.active).map(block => block.id)
    );
    setViewMode('resumen');
    setSummaryQuickNav(null);
    setSummaryBlockQuickNav(null);
    setItemContextMenu(null);
    setCatalogActionMenu(null);
    setCatalogFilter('');
    setIsBlockFilterOpen(false);
  };

  const syncCurrentProject = (
    sourceProjects: MetradoProjectRecord[],
    projectId: string,
    nextDraft: MetradoDraft
  ) => {
    const nextRecord = createProjectRecord(nextDraft, projectId);
    return sourceProjects.some(project => project.id === projectId)
      ? sourceProjects.map(project =>
          project.id === projectId ? nextRecord : project
        )
      : [nextRecord, ...sourceProjects];
  };

  const persistProjectList = (
    nextProjects: MetradoProjectRecord[],
    nextActiveProjectId: string
  ) => {
    setProjects(nextProjects);
    setActiveProjectId(nextActiveProjectId);
    safeSetLocalStorage(PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
    safeSetLocalStorage(ACTIVE_PROJECT_KEY, nextActiveProjectId);
  };

  const switchProject = (projectId: string) => {
    const syncedProjects = syncCurrentProject(projects, activeProjectId, draft);
    const targetProject = syncedProjects.find(
      project => project.id === projectId
    );
    if (!targetProject) return;
    const nextDraft = normalizeDraft(targetProject.draft);
    persistProjectList(syncedProjects, projectId);
    setDraft(nextDraft);
    resetWorkspaceForDraft(nextDraft);
  };

  const createProject = () => {
    const newDraft = normalizeDraft({
      ...initialDraft,
      projectName: 'Nuevo metrado de estructuras',
      code: `MET-${String(Date.now()).slice(-5)}`,
      audit: [
        {
          id: createId('audit'),
          entity: 'proyecto',
          detail: 'Proyecto de metrado creado',
          createdAt: new Date().toISOString(),
        },
      ],
    });
    const syncedProjects = syncCurrentProject(projects, activeProjectId, draft);
    const newProject = createProjectRecord(newDraft);
    persistProjectList([newProject, ...syncedProjects], newProject.id);
    setDraft(newDraft);
    resetWorkspaceForDraft(newDraft);
  };

  const duplicateProject = () => {
    const clonedDraft = normalizeDraft(
      JSON.parse(JSON.stringify(draft)) as MetradoDraft
    );
    const newDraft = {
      ...clonedDraft,
      projectName: `${clonedDraft.projectName} copia`,
      code: `${clonedDraft.code || 'MET'}-COPIA`,
      audit: [
        {
          id: createId('audit'),
          entity: 'proyecto',
          detail: 'Proyecto de metrado duplicado',
          createdAt: new Date().toISOString(),
        },
        ...clonedDraft.audit,
      ].slice(0, 50),
    };
    const syncedProjects = syncCurrentProject(projects, activeProjectId, draft);
    const newProject = createProjectRecord(newDraft);
    persistProjectList([newProject, ...syncedProjects], newProject.id);
    setDraft(newDraft);
    resetWorkspaceForDraft(newDraft);
  };

  const deleteProject = () => {
    if (projects.length <= 1) return;

    const syncedProjects = syncCurrentProject(projects, activeProjectId, draft);
    const targetProject =
      syncedProjects.find(project => project.id === activeProjectId) ??
      syncedProjects[0];
    if (!targetProject) return;

    setProjects(syncedProjects);
    safeSetLocalStorage(PROJECTS_STORAGE_KEY, JSON.stringify(syncedProjects));
    setDeleteProjectDialog(targetProject);
  };

  const confirmDeleteProject = () => {
    if (!deleteProjectDialog || projects.length <= 1) {
      setDeleteProjectDialog(null);
      return;
    }

    const nextProjects = projects.filter(
      project => project.id !== deleteProjectDialog.id
    );
    const nextProject = nextProjects[0];
    if (!nextProject) {
      setDeleteProjectDialog(null);
      return;
    }

    const nextDraft = normalizeDraft(nextProject.draft);
    persistProjectList(nextProjects, nextProject.id);
    setDraft(nextDraft);
    resetWorkspaceForDraft(nextDraft);
    setDeleteProjectDialog(null);
  };

  const updateDraft = (nextDraft: MetradoDraft, detail: string) => {
    setDraft({
      ...nextDraft,
      audit: [
        {
          id: createId('audit'),
          entity: 'metrado',
          detail,
          createdAt: new Date().toISOString(),
        },
        ...nextDraft.audit,
      ].slice(0, 50),
    });
  };

  const handleHeaderChange = (field: keyof MetradoDraft, value: string) => {
    updateDraft({ ...draft, [field]: value }, `Cabecera actualizada: ${field}`);
  };

  const handleDecimalPrecisionChange = (value: string) => {
    const nextPrecision = Math.max(0, Math.min(6, Number(value) || 0));
    updateDraft(
      { ...draft, decimalPrecision: nextPrecision },
      `Precision decimal actualizada a ${nextPrecision}`
    );
  };

  const handleBlockChange = (
    blockId: string,
    field: keyof Block,
    value: string | boolean
  ) => {
    updateDraft(
      {
        ...draft,
        blocks: draft.blocks.map(block =>
          block.id === blockId ? { ...block, [field]: value } : block
        ),
      },
      `Bloque actualizado: ${field}`
    );
  };

  const handleItemChange = (
    itemId: string,
    field: keyof WorkItem,
    value: string | boolean
  ) => {
    updateDraft(
      {
        ...draft,
        items: draft.items.map(item =>
          item.id === itemId
            ? {
                ...item,
                [field]:
                  field === 'level'
                    ? Math.max(1, Number(value) || 1)
                    : field === 'calculationType'
                    ? (value as CalculationType)
                    : value,
              }
            : item
        ),
      },
      `Partida actualizada: ${field}`
    );
  };

  const handleCatalogDraftChange = (
    field: keyof CatalogItemDraft,
    value: string | boolean
  ) => {
    setCatalogEditDraft(current => ({
      ...current,
      [field]:
        field === 'level'
          ? Math.min(6, Math.max(1, Number(value) || 1))
          : field === 'calculationType'
          ? (value as CalculationType)
          : value,
    }));
  };

  const hasCatalogDraftChanges = Boolean(
    selectedItem &&
      (catalogEditDraft.itemCode !== selectedItem.itemCode ||
        catalogEditDraft.description !== selectedItem.description ||
        catalogEditDraft.unit !== selectedItem.unit ||
        catalogEditDraft.level !== selectedItem.level ||
        catalogEditDraft.calculationType !== selectedItem.calculationType ||
        Boolean(catalogEditDraft.isHeading) !== Boolean(selectedItem.isHeading))
  );

  const closeItemCatalog = () => {
    setItemContextMenu(null);
    setCatalogActionMenu(null);
    setCatalogDrag(null);
  };

  const applyCatalogItemChanges = () => {
    if (!selectedItem) return false;
    if (!hasCatalogDraftChanges) return true;
    const normalizedCode = normalizeItemCode(catalogEditDraft.itemCode);
    if (!normalizedCode) {
      window.alert('El codigo de la partida no puede quedar vacio.');
      return false;
    }
    const selectedSlice =
      selectedItemIndex >= 0
        ? draft.items.slice(selectedItemRange.start, selectedItemRange.end)
        : [selectedItem];
    const baseItems =
      selectedItemIndex >= 0
        ? [
            ...draft.items.slice(0, selectedItemRange.start),
            ...draft.items.slice(selectedItemRange.end),
          ]
        : draft.items.filter(item => item.id !== selectedItem.id);
    const codeChanged =
      normalizedCode !== normalizeItemCode(selectedItem.itemCode);
    const levelChanged = catalogEditDraft.level !== selectedItem.level;
    const nextRootCode =
      !codeChanged && levelChanged
        ? getNextSiblingCode(
            baseItems,
            selectedItem,
            catalogEditDraft.level,
            getNearestParentCodeForLevel(
              baseItems,
              selectedItemRange.start,
              catalogEditDraft.level
            )
          )
        : normalizedCode;
    const nextRootLevel = getItemCodeLevel(nextRootCode);
    const nextCodes = selectedSlice.map((item, index) =>
      index === 0
        ? nextRootCode
        : item.itemCode.replace(`${selectedItem.itemCode}.`, `${nextRootCode}.`)
    );
    const duplicatedCode = nextCodes.find(code =>
      baseItems.some(
        item => normalizeItemCode(item.itemCode) === normalizeItemCode(code)
      )
    );
    if (duplicatedCode) {
      window.alert(
        `El codigo ${duplicatedCode} ya existe. Usa otro codigo o duplica la partida para continuar la secuencia.`
      );
      return false;
    }
    const confirmedDraft = {
      ...catalogEditDraft,
      itemCode: nextRootCode,
      description: catalogEditDraft.description.trim(),
      unit: catalogEditDraft.unit.trim(),
      level: nextRootLevel,
      isHeading: Boolean(catalogEditDraft.isHeading),
    };
    const updatedSlice = selectedSlice.map((item, index) => {
      const nextCode = nextCodes[index];
      return {
        ...item,
        ...(index === 0 ? confirmedDraft : {}),
        itemCode: nextCode,
        level: getItemCodeLevel(nextCode),
      };
    });
    updateDraft(
      {
        ...draft,
        items: renumberItemsByCurrentOrder(
          sortItemsByCode([...baseItems, ...updatedSlice])
        ),
      },
      `Partida confirmada: ${selectedItem.itemCode}`
    );
    setCatalogEditDraft(confirmedDraft);
    setCatalogActionMenu(null);
    return true;
  };

  const confirmCatalogItemChanges = () => {
    if (!applyCatalogItemChanges()) return;
    closeItemCatalog();
  };

  const cancelCatalogItemChanges = () => {
    if (
      hasCatalogDraftChanges &&
      !window.confirm(
        'Hay modificaciones sin guardar. Deseas descartarlas y cerrar?'
      )
    ) {
      return;
    }
    setCatalogEditDraft(createCatalogItemDraft(selectedItem));
    closeItemCatalog();
  };

  const closeCatalogWithPrompt = () => {
    if (!hasCatalogDraftChanges) {
      closeItemCatalog();
      return;
    }
    if (
      window.confirm(
        'Hay modificaciones sin guardar. Deseas guardarlas antes de cerrar?'
      )
    ) {
      if (applyCatalogItemChanges()) closeItemCatalog();
      return;
    }
    if (window.confirm('Cerrar sin guardar los cambios?')) {
      setCatalogEditDraft(createCatalogItemDraft(selectedItem));
      closeItemCatalog();
    }
  };

  const selectCatalogItem = (itemId: string) => {
    if (itemId === selectedItem?.id) return true;
    if (
      hasCatalogDraftChanges &&
      !window.confirm(
        'Hay cambios sin confirmar. Deseas descartarlos para cambiar de partida?'
      )
    ) {
      return false;
    }
    setSelectedItemId(itemId);
    setItemContextMenu(current => (current ? { ...current, itemId } : current));
    setCatalogActionMenu(null);
    return true;
  };

  const insertItem = (
    mode: 'child' | 'sibling',
    options: { asHeading?: boolean } = {}
  ) => {
    const reference =
      selectedItem ?? draft.items[draft.items.length - 1] ?? null;
    const referenceIndex = reference
      ? draft.items.findIndex(item => item.id === reference.id)
      : -1;
    const insertIndex =
      referenceIndex >= 0
        ? getItemSubtreeRange(draft.items, referenceIndex).end
        : draft.items.length;
    const newItem = createBlankItem(draft.items, reference, mode, options);
    const nextItems = [
      ...draft.items.slice(0, insertIndex),
      newItem,
      ...draft.items.slice(insertIndex),
    ];
    updateDraft(
      { ...draft, items: renumberItemsByCurrentOrder(nextItems) },
      `Partida creada: ${newItem.itemCode}`
    );
    setSelectedItemId(newItem.id);
    setCatalogFilter('');
    setCatalogActionMenu(null);
    setItemContextMenu(current =>
      current ? { ...current, itemId: newItem.id } : current
    );
  };

  const addSequentialItem = () => {
    insertItem(selectedItem?.isHeading ? 'child' : 'sibling', {
      asHeading: false,
    });
  };

  const duplicateSelectedItem = () => {
    if (!selectedItem || selectedItemIndex < 0) return;
    const insertIndex = selectedItemRange.end;
    const selectedSlice = draft.items.slice(
      selectedItemRange.start,
      selectedItemRange.end
    );
    const nextRootCode = getNextSiblingCode(
      draft.items,
      selectedItem,
      selectedItem.level,
      getParentItemCode(selectedItem.itemCode)
    );
    const idMap = new Map<string, string>();
    const duplicatedItems = selectedSlice.map(item => {
      const nextId = createId('item');
      idMap.set(item.id, nextId);
      return {
        ...item,
        id: nextId,
        itemCode:
          item.id === selectedItem.id
            ? nextRootCode
            : item.itemCode.replace(
                `${selectedItem.itemCode}.`,
                `${nextRootCode}.`
              ),
      };
    });
    const duplicatedRoot = duplicatedItems[0];
    const measurementCopies = draft.measurementLines
      .filter(line => idMap.has(line.itemId))
      .map(line => ({
        ...line,
        id: createId('ml'),
        itemId: idMap.get(line.itemId) ?? line.itemId,
        rowVersion: 1,
      }));
    const rebarCopies = draft.rebarLines
      .filter(line => idMap.has(line.itemId))
      .map(line => ({
        ...line,
        id: createId('rl'),
        itemId: idMap.get(line.itemId) ?? line.itemId,
        rowVersion: 1,
      }));
    updateDraft(
      {
        ...draft,
        items: renumberItemsByCurrentOrder([
          ...draft.items.slice(0, insertIndex),
          ...duplicatedItems,
          ...draft.items.slice(insertIndex),
        ]),
        measurementLines: [...draft.measurementLines, ...measurementCopies],
        rebarLines: [...draft.rebarLines, ...rebarCopies],
      },
      `Partida duplicada: ${selectedItem.itemCode}`
    );
    setSelectedItemId(duplicatedRoot.id);
    setCatalogFilter('');
    setCatalogActionMenu(null);
    setItemContextMenu(current =>
      current ? { ...current, itemId: duplicatedRoot.id } : current
    );
  };

  const deleteSelectedItem = () => {
    if (!selectedItem || selectedItemIndex < 0) return;
    const itemCount = selectedTreeItemIds.length;
    const lineCount = selectedItemLinkedLines;
    const confirmed = window.confirm(
      `Eliminar ${itemCount} partida(s) y ${lineCount} linea(s) asociada(s)?`
    );
    if (!confirmed) return;
    const idsToDelete = new Set(selectedTreeItemIds);
    const nextItems = draft.items.filter(item => !idsToDelete.has(item.id));
    const fallbackItem =
      nextItems[Math.min(selectedItemRange.start, nextItems.length - 1)] ??
      nextItems[selectedItemRange.start - 1] ??
      nextItems[0];
    updateDraft(
      {
        ...draft,
        items: renumberItemsByCurrentOrder(nextItems),
        measurementLines: draft.measurementLines.filter(
          line => !idsToDelete.has(line.itemId)
        ),
        rebarLines: draft.rebarLines.filter(
          line => !idsToDelete.has(line.itemId)
        ),
      },
      `Partida eliminada: ${selectedItem.itemCode}`
    );
    setSelectedItemId(fallbackItem?.id ?? '');
    setCatalogActionMenu(null);
    setItemContextMenu(current =>
      current && fallbackItem ? { ...current, itemId: fallbackItem.id } : null
    );
  };

  const moveSelectedItem = (direction: 'up' | 'down') => {
    if (!selectedItem || selectedItemIndex < 0) return;
    const parentCode = getParentItemCode(selectedItem.itemCode);
    const siblingIndex =
      direction === 'up'
        ? draft.items
            .slice(0, selectedItemIndex)
            .map((item, index) => ({ item, index }))
            .reverse()
            .find(
              entry =>
                entry.item.level === selectedItem.level &&
                getParentItemCode(entry.item.itemCode) === parentCode
            )?.index
        : draft.items.findIndex(
            (item, index) =>
              index >= selectedItemRange.end &&
              item.level === selectedItem.level &&
              getParentItemCode(item.itemCode) === parentCode
          );
    if (siblingIndex === undefined || siblingIndex < 0) return;
    const selectedSlice = draft.items.slice(
      selectedItemRange.start,
      selectedItemRange.end
    );
    const nextItems =
      direction === 'up'
        ? [
            ...draft.items.slice(0, siblingIndex),
            ...selectedSlice,
            ...draft.items.slice(siblingIndex, selectedItemRange.start),
            ...draft.items.slice(selectedItemRange.end),
          ]
        : [
            ...draft.items.slice(0, selectedItemRange.start),
            ...draft.items.slice(
              selectedItemRange.end,
              getItemSubtreeRange(draft.items, siblingIndex).end
            ),
            ...selectedSlice,
            ...draft.items.slice(
              getItemSubtreeRange(draft.items, siblingIndex).end
            ),
          ];
    updateDraft(
      { ...draft, items: renumberItemsByCurrentOrder(nextItems) },
      `Partida movida ${direction === 'up' ? 'arriba' : 'abajo'}: ${
        selectedItem.itemCode
      }`
    );
    setCatalogActionMenu(null);
  };

  const changeSelectedItemIndent = (direction: 'promote' | 'demote') => {
    if (!selectedItem || selectedItemIndex < 0) return;
    if (direction === 'promote' && !canPromoteSelectedItem) return;
    if (direction === 'demote' && !canDemoteSelectedItem) return;

    const levelOffset = direction === 'promote' ? -1 : 1;
    const selectedSlice = draft.items.slice(
      selectedItemRange.start,
      selectedItemRange.end
    );
    const nextSlice = selectedSlice.map(item => ({
      ...item,
      level: Math.min(6, Math.max(1, item.level + levelOffset)),
    }));
    const nextItems = [
      ...draft.items.slice(0, selectedItemRange.start),
      ...nextSlice,
      ...draft.items.slice(selectedItemRange.end),
    ];

    updateDraft(
      { ...draft, items: renumberItemsByCurrentOrder(nextItems) },
      `Nivel de partida ${
        direction === 'promote' ? 'reducido' : 'aumentado'
      }: ${selectedItem.itemCode}`
    );
    setCatalogActionMenu(null);
  };

  const renderStandardStructureToolbar = () => (
    <div
      className="metrado-standard-toolbar"
      aria-label="Herramientas estandar de estructura de partidas"
    >
      <button
        type="button"
        title="Disminuir nivel de la partida seleccionada"
        aria-label="Disminuir nivel"
        disabled={!canPromoteSelectedItem}
        onClick={() => changeSelectedItemIndent('promote')}
      >
        <IndentDecrease size={15} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        title="Aumentar nivel de la partida seleccionada"
        aria-label="Aumentar nivel"
        disabled={!canDemoteSelectedItem}
        onClick={() => changeSelectedItemIndent('demote')}
      >
        <IndentIncrease size={15} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        title="Subir partida seleccionada"
        aria-label="Subir partida"
        disabled={!selectedItemHasPreviousSibling}
        onClick={() => moveSelectedItem('up')}
      >
        <ArrowUp size={15} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        title="Bajar partida seleccionada"
        aria-label="Bajar partida"
        disabled={!selectedItemHasNextSibling}
        onClick={() => moveSelectedItem('down')}
      >
        <ArrowDown size={15} strokeWidth={2.2} />
      </button>
      <span
        title={
          selectedItem
            ? `${selectedItem.itemCode} - ${selectedItem.description}`
            : ''
        }
      >
        {selectedItem ? selectedItem.itemCode : 'Sin partida'}
      </span>
    </div>
  );

  const handleMeasurementChange = (
    lineId: string,
    field: keyof MeasurementLine,
    value: string
  ) => {
    const textFields: Array<keyof MeasurementLine> = [
      'id',
      'itemId',
      'blockId',
      'description',
      'observation',
      'validationStatus',
    ];
    const nextLines = draft.measurementLines.map(line =>
      line.id === lineId
        ? {
            ...line,
            [field]: textFields.includes(field)
              ? value
              : value === ''
              ? ''
              : +value,
            formulas: textFields.includes(field)
              ? line.formulas
              : { ...line.formulas, [field]: undefined },
            rowVersion: line.rowVersion + 1,
          }
        : line
    );
    updateDraft(
      { ...draft, measurementLines: nextLines },
      `Linea de metrado actualizada: ${field}`
    );
  };

  const handleSheetInputKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.currentTarget.value = event.currentTarget.defaultValue;
      event.currentTarget.blur();
    }
  };

  const commitMeasurementInput = (
    line: MeasurementLine,
    field: keyof MeasurementLine,
    value: string
  ) => {
    if (String(line[field] ?? '') === value) return;
    handleMeasurementChange(line.id, field, value);
  };

  const handleRebarChange = (
    lineId: string,
    field: keyof RebarLine,
    value: string
  ) => {
    const textFields: Array<keyof RebarLine> = [
      'description',
      'design',
      'diameter',
      'itemId',
      'blockId',
      'id',
      'observation',
      'validationStatus',
    ];
    const nextLines = draft.rebarLines.map(line =>
      line.id === lineId
        ? {
            ...line,
            [field]: textFields.includes(field)
              ? value
              : value === ''
              ? ''
              : +value,
            formulas: textFields.includes(field)
              ? line.formulas
              : { ...line.formulas, [field]: undefined },
            rowVersion: line.rowVersion + 1,
          }
        : line
    );
    updateDraft(
      { ...draft, rebarLines: nextLines },
      `Linea de acero actualizada: ${field}`
    );
  };

  const commitRebarInput = (
    line: RebarLine,
    field: keyof RebarLine,
    value: string
  ) => {
    if (String(line[field] ?? '') === value) return;
    handleRebarChange(line.id, field, value);
  };

  const openLineAssignment = (kind: LineAssignmentKind, lineId: string) => {
    setLineAssignmentEditor({ kind, lineId, query: '' });
  };

  const updateLineAssignmentQuery = (query: string) => {
    setLineAssignmentEditor(current =>
      current ? { ...current, query } : current
    );
  };

  const assignLineToItem = (itemId: string) => {
    if (!lineAssignmentEditor) return;
    if (lineAssignmentEditor.kind === 'general') {
      handleMeasurementChange(lineAssignmentEditor.lineId, 'itemId', itemId);
    } else {
      handleRebarChange(lineAssignmentEditor.lineId, 'itemId', itemId);
    }
    setSelectedItemId(itemId);
    setDetailInsertionTarget({
      kind: lineAssignmentEditor.kind,
      blockId: activeBlock?.id ?? '',
      itemId,
      lineId: lineAssignmentEditor.lineId,
    });
    setLineAssignmentEditor(null);
  };

  const renderLinePartidaCell = (
    kind: LineAssignmentKind,
    line: MeasurementLine | RebarLine,
    options: { showActions?: boolean } = {}
  ) => {
    const item = draft.items.find(entry => entry.id === line.itemId);
    const showActions = options.showActions ?? true;
    return (
      <div className="metrado-line-partida">
        <button
          type="button"
          className="metrado-line-partida-code"
          title={
            item
              ? `${item.itemCode} - ${item.description}`
              : 'Partida no encontrada'
          }
          onDoubleClick={() => openLineAssignment(kind, line.id)}
        >
          {item?.itemCode ?? 'Sin partida'}
        </button>
        {showActions && (
          <span className="metrado-line-partida-actions">
            <button
              type="button"
              className="metrado-line-partida-action"
              onClick={event => {
                event.stopPropagation();
                openLineAssignment(kind, line.id);
              }}
            >
              Reasignar
            </button>
            <button
              type="button"
              className="metrado-line-partida-action is-danger"
              onClick={event => {
                event.stopPropagation();
                if (kind === 'general') {
                  deleteMeasurementLine(line.id);
                } else {
                  deleteRebarLine(line.id);
                }
              }}
            >
              Eliminar
            </button>
          </span>
        )}
      </div>
    );
  };

  const selectDetailTarget = (
    kind: LineAssignmentKind,
    itemId: string,
    lineId?: string
  ) => {
    setSelectedItemId(itemId);
    setDetailInsertionTarget({
      kind,
      blockId: activeBlock?.id ?? '',
      itemId,
      lineId,
    });
  };

  const handlePlatformadoChange = (
    lineId: string,
    field: keyof PlatformadoLine,
    value: string
  ) => {
    const textFields: Array<keyof PlatformadoLine> = [
      'id',
      'alignment',
      'progressive',
      'observation',
      'validationStatus',
    ];
    const nextLines = draft.platformadoLines.map(line =>
      line.id === lineId
        ? {
            ...line,
            [field]: textFields.includes(field)
              ? value
              : value === ''
              ? ''
              : +value,
          }
        : line
    );
    updateDraft(
      { ...draft, platformadoLines: nextLines },
      `Platformado actualizado: ${field}`
    );
  };

  const getGeneralMeasurementTargetItem = () => {
    const isGeneralMeasurementItem = (item: WorkItem) =>
      !item.isHeading && item.calculationType !== 'acero';

    const targetItem =
      detailInsertionTarget?.kind === 'general' &&
      detailInsertionTarget.blockId === activeBlock?.id
        ? draft.items.find(item => item.id === detailInsertionTarget.itemId)
        : null;

    if (targetItem && isGeneralMeasurementItem(targetItem)) {
      return targetItem;
    }

    if (selectedItem && isGeneralMeasurementItem(selectedItem)) {
      return selectedItem;
    }

    if (selectedItemIndex >= 0) {
      const firstChildMeasurementItem = draft.items
        .slice(selectedItemRange.start + 1, selectedItemRange.end)
        .find(isGeneralMeasurementItem);
      if (firstChildMeasurementItem) return firstChildMeasurementItem;
    }

    return draft.items.find(isGeneralMeasurementItem);
  };

  const getRebarTargetItem = () => {
    const isRebarItem = (item: WorkItem) =>
      !item.isHeading &&
      (item.calculationType === 'acero' || item.unit?.toLowerCase() === 'kg');

    const targetItem =
      detailInsertionTarget?.kind === 'acero' &&
      detailInsertionTarget.blockId === activeBlock?.id
        ? draft.items.find(item => item.id === detailInsertionTarget.itemId)
        : null;

    if (targetItem && isRebarItem(targetItem)) return targetItem;
    if (selectedEditableItem && isRebarItem(selectedEditableItem)) {
      return selectedEditableItem;
    }
    return (
      draft.items.find(isRebarItem) ?? draft.items.find(item => !item.isHeading)
    );
  };

  const addMeasurementLine = () => {
    const editableItem = getGeneralMeasurementTargetItem();
    if (!editableItem || !activeBlock) {
      window.alert(
        'Selecciona una partida de metrado general para agregar una linea.'
      );
      return;
    }
    const nextLine: MeasurementLine = {
      id: createId('ml'),
      itemId: editableItem.id,
      blockId: activeBlock.id,
      description: 'Nueva linea',
      times: 1,
      unitCount: 1,
      length: '',
      width: '',
      height: '',
      area: '',
      observation: '',
      validationStatus: 'borrador',
      rowVersion: 1,
    };
    const explicitTargetLineIndex =
      detailInsertionTarget?.kind === 'general' &&
      detailInsertionTarget.blockId === activeBlock.id &&
      detailInsertionTarget.lineId
        ? draft.measurementLines.findIndex(
            line =>
              line.id === detailInsertionTarget.lineId &&
              line.itemId === editableItem.id &&
              line.blockId === activeBlock.id
          )
        : -1;
    const targetLineIndex =
      explicitTargetLineIndex >= 0
        ? explicitTargetLineIndex
        : draft.measurementLines.reduce(
            (lastIndex, line, index) =>
              line.itemId === editableItem.id && line.blockId === activeBlock.id
                ? index
                : lastIndex,
            -1
          );
    const nextMeasurementLines =
      targetLineIndex >= 0
        ? [
            ...draft.measurementLines.slice(0, targetLineIndex + 1),
            nextLine,
            ...draft.measurementLines.slice(targetLineIndex + 1),
          ]
        : [...draft.measurementLines, nextLine];
    setSelectedItemId(editableItem.id);
    setDetailInsertionTarget({
      kind: 'general',
      blockId: activeBlock.id,
      itemId: editableItem.id,
      lineId: nextLine.id,
    });
    updateDraft(
      {
        ...draft,
        measurementLines: nextMeasurementLines,
      },
      'Linea de metrado agregada'
    );
  };

  const duplicateMeasurementLine = (lineId: string) => {
    const lineIndex = draft.measurementLines.findIndex(
      line => line.id === lineId
    );
    const sourceLine = draft.measurementLines[lineIndex];
    if (!sourceLine) return;
    const duplicatedLine: MeasurementLine = {
      ...sourceLine,
      id: createId('ml'),
      description: `${sourceLine.description} copia`,
      rowVersion: 1,
    };
    setSelectedItemId(sourceLine.itemId);
    setDetailInsertionTarget({
      kind: 'general',
      blockId: sourceLine.blockId,
      itemId: sourceLine.itemId,
      lineId: duplicatedLine.id,
    });
    updateDraft(
      {
        ...draft,
        measurementLines: [
          ...draft.measurementLines.slice(0, lineIndex + 1),
          duplicatedLine,
          ...draft.measurementLines.slice(lineIndex + 1),
        ],
      },
      'Linea de metrado duplicada'
    );
  };

  const deleteMeasurementLine = (lineId: string) => {
    const confirmed = window.confirm('Eliminar esta linea de metrado?');
    if (!confirmed) return;
    setDetailInsertionTarget(current =>
      current?.kind === 'general' && current.lineId === lineId
        ? { ...current, lineId: undefined }
        : current
    );
    updateDraft(
      {
        ...draft,
        measurementLines: draft.measurementLines.filter(
          line => line.id !== lineId
        ),
        attachments: draft.attachments.filter(
          attachment => attachment.lineId !== lineId
        ),
      },
      'Linea de metrado eliminada'
    );
  };

  const getLineAttachments = (line: MeasurementLine) =>
    getMeasurementLineAttachments(draft, line);

  const addMeasurementAttachment = async (
    line: MeasurementLine,
    fileList: FileList | null
  ) => {
    const file = fileList?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      alert('Solo se pueden adjuntar imagenes PNG o JPEG en esta linea.');
      return;
    }
    const buffer = await file.arrayBuffer();
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const dataUrl = `data:${file.type};base64,${arrayBufferToBase64(buffer)}`;
    const nextAttachment: MetradoAttachment = {
      id: createId('att'),
      kind: 'image',
      scope: 'measurement',
      blockId: line.blockId,
      itemId: line.itemId,
      lineId: line.id,
      name: file.name,
      mimeType: file.type,
      extension,
      dataUrl,
      caption: line.description,
      sourceSheet: line.sourceSheet,
      sourceRow: line.sourceRow,
      anchor: line.sourceSheet
        ? {
            sheetName: line.sourceSheet,
            startRow: line.sourceRow ?? 0,
            startCol: 2,
            endRow: (line.sourceRow ?? 0) + 1,
            endCol: 6,
            editAs: 'oneCell',
            rowHeight: 150,
          }
        : undefined,
      createdAt: new Date().toISOString(),
    };
    updateDraft(
      { ...draft, attachments: [...draft.attachments, nextAttachment] },
      `Imagen agregada a linea de metrado: ${line.description}`
    );
  };

  const removeAttachment = (attachmentId: string) => {
    const confirmed = window.confirm('Quitar esta imagen del metrado?');
    if (!confirmed) return;
    updateDraft(
      {
        ...draft,
        attachments: draft.attachments.filter(
          attachment => attachment.id !== attachmentId
        ),
      },
      'Imagen de metrado eliminada'
    );
  };

  const addRebarLine = () => {
    const rebarItem = getRebarTargetItem();
    if (!rebarItem || !activeBlock) {
      window.alert('Selecciona una partida de acero para agregar una linea.');
      return;
    }
    const nextLine: RebarLine = {
      id: createId('rl'),
      itemId: rebarItem.id,
      blockId: activeBlock.id,
      description: 'Nueva linea de acero',
      design: '',
      diameter: '1/2"',
      sameElements: 1,
      piecesPerElement: 1,
      pieceLength: '',
      observation: '',
      validationStatus: 'borrador',
      rowVersion: 1,
    };
    const explicitTargetLineIndex =
      detailInsertionTarget?.kind === 'acero' &&
      detailInsertionTarget.blockId === activeBlock.id &&
      detailInsertionTarget.lineId
        ? draft.rebarLines.findIndex(
            line =>
              line.id === detailInsertionTarget.lineId &&
              line.itemId === rebarItem.id &&
              line.blockId === activeBlock.id
          )
        : -1;
    const targetLineIndex =
      explicitTargetLineIndex >= 0
        ? explicitTargetLineIndex
        : draft.rebarLines.reduce(
            (lastIndex, line, index) =>
              line.itemId === rebarItem.id && line.blockId === activeBlock.id
                ? index
                : lastIndex,
            -1
          );
    const nextRebarLines =
      targetLineIndex >= 0
        ? [
            ...draft.rebarLines.slice(0, targetLineIndex + 1),
            nextLine,
            ...draft.rebarLines.slice(targetLineIndex + 1),
          ]
        : [...draft.rebarLines, nextLine];
    setSelectedItemId(rebarItem.id);
    setDetailInsertionTarget({
      kind: 'acero',
      blockId: activeBlock.id,
      itemId: rebarItem.id,
      lineId: nextLine.id,
    });
    updateDraft(
      {
        ...draft,
        rebarLines: nextRebarLines,
      },
      'Linea de acero agregada'
    );
  };

  const duplicateRebarLine = (lineId: string) => {
    const lineIndex = draft.rebarLines.findIndex(line => line.id === lineId);
    const sourceLine = draft.rebarLines[lineIndex];
    if (!sourceLine) return;
    const duplicatedLine: RebarLine = {
      ...sourceLine,
      id: createId('rl'),
      description: `${sourceLine.description} copia`,
      rowVersion: 1,
    };
    setSelectedItemId(sourceLine.itemId);
    setDetailInsertionTarget({
      kind: 'acero',
      blockId: sourceLine.blockId,
      itemId: sourceLine.itemId,
      lineId: duplicatedLine.id,
    });
    updateDraft(
      {
        ...draft,
        rebarLines: [
          ...draft.rebarLines.slice(0, lineIndex + 1),
          duplicatedLine,
          ...draft.rebarLines.slice(lineIndex + 1),
        ],
      },
      'Linea de acero duplicada'
    );
  };

  const deleteRebarLine = (lineId: string) => {
    const confirmed = window.confirm('Eliminar esta linea de acero?');
    if (!confirmed) return;
    setDetailInsertionTarget(current =>
      current?.kind === 'acero' && current.lineId === lineId
        ? { ...current, lineId: undefined }
        : current
    );
    updateDraft(
      {
        ...draft,
        rebarLines: draft.rebarLines.filter(line => line.id !== lineId),
      },
      'Linea de acero eliminada'
    );
  };

  const addPlatformadoLine = () => {
    updateDraft(
      {
        ...draft,
        platformadoLines: [
          ...draft.platformadoLines,
          {
            id: createId('pl'),
            alignment: 'Eje principal',
            progressive: '',
            cutArea: '',
            fillArea: '',
            distance: '',
            observation: '',
            validationStatus: 'borrador',
          },
        ],
      },
      'Linea de platformado agregada'
    );
  };

  const duplicatePlatformadoLine = (lineId: string) => {
    const lineIndex = draft.platformadoLines.findIndex(
      line => line.id === lineId
    );
    const sourceLine = draft.platformadoLines[lineIndex];
    if (!sourceLine) return;
    const duplicatedLine: PlatformadoLine = {
      ...sourceLine,
      id: createId('pl'),
      progressive: `${sourceLine.progressive} copia`,
    };
    updateDraft(
      {
        ...draft,
        platformadoLines: [
          ...draft.platformadoLines.slice(0, lineIndex + 1),
          duplicatedLine,
          ...draft.platformadoLines.slice(lineIndex + 1),
        ],
      },
      'Linea de platformado duplicada'
    );
  };

  const deletePlatformadoLine = (lineId: string) => {
    const confirmed = window.confirm(
      'Eliminar esta progresiva de platformado?'
    );
    if (!confirmed) return;
    updateDraft(
      {
        ...draft,
        platformadoLines: draft.platformadoLines.filter(
          line => line.id !== lineId
        ),
      },
      'Linea de platformado eliminada'
    );
  };

  const requestImportDecision = (
    fileName: string,
    importedDraft: MetradoDraft
  ): Promise<ImportDecision> =>
    new Promise(resolve => {
      importDecisionResolver.current = resolve;
      setImportDecisionDialog({
        fileName,
        currentProjectName: draft.projectName || 'Metrado actual',
        importedProjectName: importedDraft.projectName || 'Excel importado',
        importedSummary: `${importedDraft.blocks.length} bloques, ${importedDraft.items.length} partidas, ${importedDraft.measurementLines.length} lineas generales, ${importedDraft.rebarLines.length} lineas de acero`,
      });
    });

  const resolveImportDecision = (decision: ImportDecision) => {
    importDecisionResolver.current?.(decision);
    importDecisionResolver.current = null;
    setImportDecisionDialog(null);
  };

  const handleRegisterFile = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    let validationIssues: ValidationIssue[];
    let importedDraft: MetradoDraft = draft;
    let importFailed = false;
    let backendProjectId = '';
    let importedByBackend = false;
    try {
      const backendImport = await importWorkbookDraftFromApi(file, draft);
      backendProjectId = backendImport.projectId;
      importedDraft = backendImport.draft;
      validationIssues = backendImport.draft.validationIssues;
      importedByBackend = true;
    } catch {
      try {
        validationIssues = await analyzeReferenceWorkbook(file);
        importedDraft = normalizeDraft(await importWorkbookDraft(file, draft));
      } catch {
        importFailed = true;
        validationIssues = [
          createValidationIssue({
            sheetName: 'Importador',
            cellReference: '-',
            issueType: 'No se pudo leer el Excel',
            originalFormula: file.name,
            suggestedFix:
              'Verificar que el archivo sea .xlsx y volver a registrarlo. Si esta protegido, exportar una copia sin proteccion.',
            status: 'pendiente',
          }),
        ];
      }
    }
    let visualAnchorDraft = importedDraft;
    if (!hasAnchorableMeasurementLines(importedDraft)) {
      try {
        visualAnchorDraft = normalizeDraft(
          await importWorkbookDraft(file, draft)
        );
      } catch {
        visualAnchorDraft = importedDraft;
      }
    }
    const visualAssets = await extractWorkbookVisualAssets(
      file,
      visualAnchorDraft
    );
    const importedWithHistory: MetradoDraft = {
      ...importedDraft,
      headerImage: visualAssets.headerImage || importedDraft.headerImage,
      attachments: visualAssets.attachments.length
        ? visualAssets.attachments
        : visualAnchorDraft.attachments.length
        ? visualAnchorDraft.attachments
        : importedDraft.attachments,
      fileHistory: [
        {
          id: createId('file'),
          name: file.name,
          size: file.size,
          type: file.type || 'archivo',
          action: 'referencia',
          createdAt: new Date().toISOString(),
        },
        ...(importFailed ? draft.fileHistory : importedDraft.fileHistory),
      ],
      validationIssues,
    };
    const detail = importedByBackend
      ? `Excel importado, persistido en BD y recalculado: ${file.name}`
      : `Excel importado y analizado localmente: ${file.name}`;

    if (!importFailed) {
      const importDecision = await requestImportDecision(
        file.name,
        importedWithHistory
      );
      if (importDecision === 'cancel') {
        if (backendProjectId) {
          axiosInstance
            .delete(`/metrados/${backendProjectId}`)
            .catch(() => undefined);
        }
        return;
      }

      if (importDecision === 'new') {
        const newDraft: MetradoDraft = {
          ...importedWithHistory,
          audit: [
            {
              id: createId('audit'),
              entity: 'archivo',
              detail,
              createdAt: new Date().toISOString(),
            },
            ...importedWithHistory.audit,
          ].slice(0, 50),
        };
        const syncedProjects = syncCurrentProject(
          projects,
          activeProjectId,
          draft
        );
        const newProject = createProjectRecord(
          newDraft,
          backendProjectId || undefined
        );
        persistProjectList([newProject, ...syncedProjects], newProject.id);
        setDraft(newDraft);
        resetWorkspaceForDraft(newDraft);
        return;
      }

      const replacementDraft: MetradoDraft = {
        ...importedWithHistory,
        audit: [
          {
            id: createId('audit'),
            entity: 'archivo',
            detail: `${detail}. Reemplazo del metrado actual.`,
            createdAt: new Date().toISOString(),
          },
          ...importedWithHistory.audit,
        ].slice(0, 50),
      };
      const replacementProjectId = backendProjectId || activeProjectId;
      const nextProjects = projects.filter(
        project =>
          project.id !== activeProjectId && project.id !== replacementProjectId
      );
      const replacementProject = createProjectRecord(
        replacementDraft,
        replacementProjectId
      );
      persistProjectList(
        [replacementProject, ...nextProjects],
        replacementProject.id
      );
      setDraft(replacementDraft);
      resetWorkspaceForDraft(replacementDraft);

      if (
        backendProjectId &&
        activeProjectId !== backendProjectId &&
        isUuid(activeProjectId)
      ) {
        axiosInstance
          .delete(`/metrados/${activeProjectId}`)
          .catch(() => undefined);
      }
      return;
    }

    updateDraft(importedWithHistory, detail);
  };

  const resolveIssue = (issueId: string) => {
    updateDraft(
      {
        ...draft,
        validationIssues: draft.validationIssues.map(issue =>
          issue.id === issueId ? { ...issue, status: 'resuelto' } : issue
        ),
      },
      'Incidencia marcada como resuelta'
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    const filename = `metrado-estructuras-${Date.now()}.xlsx`;
    try {
      await downloadWorkbook(draft, filename);
      updateDraft(
        {
          ...draft,
          exports: [
            {
              id: createId('export'),
              filename,
              status: 'generado',
              generatedAt: new Date().toISOString(),
            },
            ...draft.exports,
          ],
          fileHistory: [
            {
              id: createId('file-export'),
              name: filename,
              size: 0,
              type: 'xlsx',
              action: 'exportacion',
              createdAt: new Date().toISOString(),
            },
            ...draft.fileHistory,
          ],
        },
        'Excel exportado desde modulo web'
      );
    } finally {
      setIsExporting(false);
    }
  };

  if (!canEdit) {
    return (
      <main className="metrado-page metrado-denied">
        <section>
          <span className="metrado-kicker">Acceso restringido</span>
          <h1>Metrado de Estructuras</h1>
          <p>
            Este modulo esta preparado para usuarios con permisos MOD. Solicita
            que tu rol tenga acceso de modificador para trabajar metrados.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="metrado-page is-header-condensed">
      <header className="metrado-header">
        <div>
          <span className="metrado-kicker">Modulo tecnico</span>
          <h1>
            Metrado de Estructuras
            <InfoHint text="Modulo para trabajar metrados por partida y bloque. Puedes importar datos desde Excel, completar mediciones, revisar validaciones y exportar el resultado." />
          </h1>
          <p>
            Edicion web de metrados por bloque, partida y tipo de calculo. El
            Excel queda como salida exportable.
          </p>
        </div>
        <div className="metrado-header-actions">
          {renderStandardStructureToolbar()}
          <label className="metrado-file-button">
            Importar Excel
            <InfoHint text="Selecciona un archivo .xlsx. Al importarlo, sus datos quedan cargados en la pantalla y se revisan posibles errores heredados." />
            <input
              type="file"
              accept=".xlsx,.xlsm,.xls"
              onChange={event => handleRegisterFile(event.target.files)}
            />
          </label>
          {renderToolsMenu()}
          <button
            className="metrado-primary-btn"
            type="button"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Exportando...' : 'Exportar Excel'}
            <InfoHint text="Descarga un Excel generado con los datos actuales del modulo, incluyendo resumen, hojas por bloque, acero y platformado." />
          </button>
        </div>
      </header>

      {importDecisionDialog && (
        <div
          className="metrado-import-modal-backdrop"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              resolveImportDecision('cancel');
            }
          }}
        >
          <section
            className="metrado-import-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="metrado-import-modal-title"
          >
            <header>
              <div>
                <span>Importacion de Excel</span>
                <h2 id="metrado-import-modal-title">
                  Como quieres cargar este archivo?
                </h2>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => resolveImportDecision('cancel')}
              >
                x
              </button>
            </header>
            <div className="metrado-import-modal-body">
              <dl>
                <div>
                  <dt>Archivo</dt>
                  <dd>{importDecisionDialog.fileName}</dd>
                </div>
                <div>
                  <dt>Proyecto actual</dt>
                  <dd>{importDecisionDialog.currentProjectName}</dd>
                </div>
                <div>
                  <dt>Excel detectado</dt>
                  <dd>{importDecisionDialog.importedProjectName}</dd>
                </div>
              </dl>
              <p>{importDecisionDialog.importedSummary}</p>
            </div>
            <footer>
              <button
                type="button"
                className="metrado-outline-btn"
                onClick={() => resolveImportDecision('cancel')}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="metrado-outline-btn"
                onClick={() => resolveImportDecision('new')}
              >
                Crear proyecto nuevo
              </button>
              <button
                type="button"
                className="metrado-primary-btn"
                onClick={() => resolveImportDecision('replace')}
              >
                Reemplazar actual
              </button>
            </footer>
          </section>
        </div>
      )}

      {deleteProjectDialog && (
        <div
          className="metrado-import-modal-backdrop metrado-delete-modal-backdrop"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setDeleteProjectDialog(null);
            }
          }}
        >
          <section
            className="metrado-import-modal metrado-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="metrado-delete-modal-title"
          >
            <header>
              <div>
                <span>Eliminar proyecto</span>
                <h2 id="metrado-delete-modal-title">
                  Revisa antes de continuar
                </h2>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setDeleteProjectDialog(null)}
              >
                x
              </button>
            </header>
            <div className="metrado-import-modal-body">
              <dl>
                <div>
                  <dt>Codigo</dt>
                  <dd>{deleteProjectDialog.code}</dd>
                </div>
                <div>
                  <dt>Partidas</dt>
                  <dd>{getProjectMetrics(deleteProjectDialog).items}</dd>
                </div>
                <div>
                  <dt>Lineas</dt>
                  <dd>{getProjectMetrics(deleteProjectDialog).lines}</dd>
                </div>
              </dl>
              <p>
                Se quitara "{deleteProjectDialog.name}" de la lista local de
                proyectos. Si necesitas conservarlo, exporta el Excel antes de
                eliminarlo.
              </p>
            </div>
            <footer>
              <button
                type="button"
                className="metrado-outline-btn"
                onClick={() => setDeleteProjectDialog(null)}
              >
                Conservar
              </button>
              <button
                type="button"
                className="metrado-danger-btn"
                onClick={confirmDeleteProject}
              >
                Eliminar proyecto
              </button>
            </footer>
          </section>
        </div>
      )}

      <section
        className={[
          'metrado-shell',
          isNavCollapsed ? 'is-nav-collapsed' : '',
          'is-compact',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <aside className="metrado-nav-pane">
          <div className="metrado-pane-title">
            <strong>
              Proyectos de metrado
              <InfoHint text="Cambia entre metrados importados o creados. Cada proyecto conserva su cabecera, partidas, bloques y lineas capturadas en este navegador." />
            </strong>
            <span>{projects.length} proyecto(s)</span>
            <button
              type="button"
              className="metrado-pane-action"
              onClick={() => setIsNavCollapsed(true)}
            >
              Ocultar
            </button>
          </div>
          <div className="metrado-project-actions">
            <button type="button" onClick={createProject}>
              Nuevo
            </button>
            <button type="button" onClick={duplicateProject}>
              Duplicar actual
            </button>
            <button type="button" onClick={() => setIsProjectEditorOpen(true)}>
              Editar datos
            </button>
            <button
              type="button"
              className="is-danger"
              onClick={deleteProject}
              disabled={projects.length <= 1}
              title={
                projects.length <= 1
                  ? 'Debe existir al menos un proyecto de metrado.'
                  : 'Eliminar el proyecto seleccionado.'
              }
            >
              Eliminar
            </button>
          </div>
          <input
            className="metrado-search"
            placeholder="Buscar proyecto, codigo o entidad"
            value={projectFilter}
            onChange={event => setProjectFilter(event.target.value)}
          />
          <div className="metrado-item-tools-hint">
            Selecciona un proyecto para cargarlo. Las partidas se editan desde
            Resumen con anticlick o doble clic sobre una fila.
          </div>
          <div
            className="metrado-project-list"
            aria-label="Proyectos de metrado"
          >
            {filteredProjects.map(project => (
              <button
                key={project.id}
                type="button"
                className={project.id === activeProjectId ? 'is-active' : ''}
                onClick={() => switchProject(project.id)}
              >
                <span>
                  <strong>{project.code}</strong>
                  <em>
                    {project.draft.items.filter(item => !item.isHeading).length}{' '}
                    partidas
                  </em>
                </span>
                <strong>{project.name}</strong>
                <small>
                  {project.institution || 'Sin institucion'} ·{' '}
                  {project.location || 'Sin ubicacion'}
                </small>
                <small>
                  {project.draft.blocks.filter(block => block.active).length}{' '}
                  bloques ·{' '}
                  {project.draft.measurementLines.length +
                    project.draft.rebarLines.length +
                    project.draft.platformadoLines.length}{' '}
                  lineas ·{' '}
                  {new Date(project.updatedAt).toLocaleDateString('es-PE')}
                </small>
              </button>
            ))}
            {!filteredProjects.length && (
              <div className="metrado-project-empty">
                No hay proyectos que coincidan con la busqueda.
              </div>
            )}
          </div>
          {itemContextMenu && selectedItem?.id === itemContextMenu.itemId && (
            <div
              className="metrado-context-menu"
              style={{ left: itemContextMenu.x, top: itemContextMenu.y }}
              onClick={event => event.stopPropagation()}
            >
              <header
                className="metrado-catalog-titlebar"
                onPointerDown={event => {
                  const target = event.target as HTMLElement;
                  if (target.closest('button')) return;
                  setCatalogDrag({
                    offsetX: event.clientX - itemContextMenu.x,
                    offsetY: event.clientY - itemContextMenu.y,
                  });
                }}
              >
                <span>Catalogo de Partidas : {activeCatalogView.label}</span>
                <button type="button" onClick={closeCatalogWithPrompt}>
                  x
                </button>
              </header>
              <div className="metrado-catalog-menubar">
                <span>Opciones</span>
                <span>?</span>
              </div>
              <div
                className="metrado-catalog-toolbar"
                aria-label="Acciones de catalogo"
              >
                <button
                  type="button"
                  title="Agrega una partida secuencial dentro del titulo seleccionado o como siguiente hermano."
                  onClick={addSequentialItem}
                >
                  Adicionar partida
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogFilter(selectedItem.itemCode)}
                >
                  Ubicar
                </button>
                <button
                  type="button"
                  title="Duplica la partida o rama seleccionada y continua la numeracion jerarquica."
                  onClick={duplicateSelectedItem}
                >
                  Duplicar
                </button>
                <button type="button" onClick={() => moveSelectedItem('up')}>
                  Subir
                </button>
                <button type="button" onClick={() => moveSelectedItem('down')}>
                  Bajar
                </button>
                <button
                  type="button"
                  className="is-danger"
                  onClick={deleteSelectedItem}
                >
                  Eliminar
                </button>
              </div>
              <div className="metrado-catalog-search">
                <input
                  placeholder="Buscar codigo, descripcion, unidad o tipo"
                  value={catalogFilter}
                  onChange={event => setCatalogFilter(event.target.value)}
                />
                <span>NIVEL : {selectedItem.level}/6</span>
              </div>
              <div className="metrado-catalog-body">
                <aside className="metrado-catalog-tree">
                  {catalogViewOptions.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      className={catalogView === option.id ? 'is-active' : ''}
                      onClick={() => setCatalogView(option.id)}
                    >
                      <span>{option.label}</span>
                      <em>{option.count}</em>
                    </button>
                  ))}
                </aside>
                <section className="metrado-catalog-grid">
                  <table>
                    <thead>
                      <tr>
                        <th>Codigo</th>
                        <th>Descripcion</th>
                        <th>Und.</th>
                        <th>Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCatalogItems.length === 0 && (
                        <tr className="metrado-catalog-empty-row">
                          <td colSpan={4}>
                            No se encontraron partidas para este filtro.
                          </td>
                        </tr>
                      )}
                      {filteredCatalogItems.map(item => (
                        <tr
                          key={item.id}
                          className={[
                            item.id === selectedItem.id ? 'is-active' : '',
                            item.isHeading ? 'is-heading' : '',
                            `level-${item.level}`,
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={event => {
                            event.stopPropagation();
                            selectCatalogItem(item.id);
                          }}
                          onContextMenu={event => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!selectCatalogItem(item.id)) return;
                            setCatalogActionMenu({
                              itemId: item.id,
                              x: Math.max(
                                8,
                                Math.min(event.clientX, window.innerWidth - 190)
                              ),
                              y: Math.max(
                                8,
                                Math.min(
                                  event.clientY,
                                  window.innerHeight - 330
                                )
                              ),
                            });
                          }}
                          onDoubleClick={event => event.stopPropagation()}
                        >
                          <td>{item.itemCode}</td>
                          <td>{item.description}</td>
                          <td>{item.unit}</td>
                          <td>{item.calculationType}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </div>
              {catalogActionMenu &&
                selectedItem?.id === catalogActionMenu.itemId && (
                  <div
                    className="metrado-catalog-row-menu"
                    style={{
                      left: catalogActionMenu.x,
                      top: catalogActionMenu.y,
                    }}
                    onClick={event => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      title="Agrega una partida secuencial dentro del titulo seleccionado o como siguiente hermano."
                      onClick={addSequentialItem}
                    >
                      <span>Adicionar partida</span>
                      <kbd>F2</kbd>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatalogActionMenu(null)}
                    >
                      <span>Modificar</span>
                      <kbd>F3</kbd>
                    </button>
                    <button
                      type="button"
                      className="is-danger"
                      onClick={deleteSelectedItem}
                    >
                      <span>Eliminar</span>
                      <kbd>F4</kbd>
                    </button>
                    <button
                      type="button"
                      title="Duplica la partida o rama seleccionada y continua la numeracion jerarquica."
                      onClick={duplicateSelectedItem}
                    >
                      <span>Duplicar</span>
                      <kbd>F5</kbd>
                    </button>
                    <button
                      type="button"
                      title="Crea un nuevo titulo hijo debajo del registro seleccionado."
                      onClick={() => insertItem('child', { asHeading: true })}
                    >
                      <span>Subpartida titulo</span>
                      <kbd>F6</kbd>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!applyCatalogItemChanges()) return;
                        setCatalogActionMenu(null);
                        closeItemCatalog();
                        goToSummaryDetail(
                          selectedItem.id,
                          activeBlock.id,
                          'general'
                        );
                      }}
                    >
                      <span>Metrado general</span>
                      <kbd>F7</kbd>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!applyCatalogItemChanges()) return;
                        setCatalogActionMenu(null);
                        closeItemCatalog();
                        goToSummaryDetail(
                          selectedItem.id,
                          activeBlock.id,
                          'acero'
                        );
                      }}
                    >
                      <span>Acero</span>
                      <kbd>F8</kbd>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCatalogFilter(selectedItem.itemCode);
                        setCatalogActionMenu(null);
                      }}
                    >
                      <span>Ubicar el grupo</span>
                      <kbd>F9</kbd>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCatalogActionMenu(null);
                        handleExport();
                      }}
                    >
                      <span>Exportar Excel</span>
                      <kbd>F10</kbd>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatalogActionMenu(null)}
                    >
                      <span>Propiedades</span>
                      <kbd>Esc</kbd>
                    </button>
                  </div>
                )}
              <div className="metrado-context-editor">
                <label>
                  <span>Codigo</span>
                  <input
                    value={catalogEditDraft.itemCode}
                    onChange={event =>
                      handleCatalogDraftChange('itemCode', event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Descripcion</span>
                  <input
                    value={catalogEditDraft.description}
                    onChange={event =>
                      handleCatalogDraftChange(
                        'description',
                        event.target.value
                      )
                    }
                  />
                </label>
                <label>
                  <span>Und</span>
                  <input
                    value={catalogEditDraft.unit}
                    onChange={event =>
                      handleCatalogDraftChange('unit', event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Tipo</span>
                  <select
                    value={catalogEditDraft.calculationType}
                    onChange={event =>
                      handleCatalogDraftChange(
                        'calculationType',
                        event.target.value
                      )
                    }
                  >
                    {['general', 'acero', 'platformado', 'manual', 'mixto'].map(
                      type => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      )
                    )}
                  </select>
                </label>
                <label>
                  <span>Nivel</span>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={catalogEditDraft.level}
                    onChange={event =>
                      handleCatalogDraftChange('level', event.target.value)
                    }
                  />
                </label>
                <label className="metrado-context-check">
                  <input
                    type="checkbox"
                    checked={Boolean(catalogEditDraft.isHeading)}
                    onChange={event =>
                      handleCatalogDraftChange(
                        'isHeading',
                        event.target.checked
                      )
                    }
                  />
                  Titulo
                </label>
                <div className="metrado-context-actions">
                  <button
                    type="button"
                    className="is-primary"
                    disabled={!hasCatalogDraftChanges}
                    onClick={confirmCatalogItemChanges}
                  >
                    Confirmar
                  </button>
                  <button type="button" onClick={cancelCatalogItemChanges}>
                    Cancelar
                  </button>
                </div>
              </div>
              <footer className="metrado-catalog-status">
                <span>
                  Registro:{' '}
                  {draft.items.findIndex(item => item.id === selectedItem.id) +
                    1}{' '}
                  de {draft.items.length}
                </span>
                <strong>
                  {selectedItem.itemCode} - {selectedItem.description}
                </strong>
                <span>
                  {selectedTreeItemIds.length} partida(s),{' '}
                  {selectedItemLinkedLines} linea(s)
                </span>
              </footer>
            </div>
          )}
        </aside>

        <section className="metrado-main-pane">
          {isNavCollapsed && (
            <button
              type="button"
              className="metrado-floating-action"
              onClick={() => setIsNavCollapsed(false)}
            >
              Ver proyectos
            </button>
          )}
          <section
            className="metrado-excel-header"
            aria-label="Cabecera estilo Excel"
          >
            {draft.headerImage && (
              <img
                className="excel-header-image"
                src={draft.headerImage}
                alt="Imagen importada del Excel"
              />
            )}
            <div className="excel-title">
              "{draft.projectName.toUpperCase()}"
            </div>
            <div className="excel-unit">
              UNIDAD EJECUTORA: {draft.institution.toUpperCase()}
            </div>
            <div className="excel-codes">
              <span>CODIGO: {draft.code}</span>
              <span>CODIGO LOCAL:</span>
              <span>CODIGO MODULAR:</span>
            </div>
            <div className="excel-location">
              <span>
                INSTITUCION EDUCATIVA: {draft.institution.toUpperCase()}
              </span>
              <span>UBICACION: {draft.location.toUpperCase()}</span>
            </div>
            <div className="excel-block-title">
              {viewMode === 'resumen'
                ? 'RESUMEN GENERAL DE METRADOS DE ESTRUCTURAS'
                : `BLOQUE ${activeBlock?.code}: ${activeBlock?.name}`}
            </div>
          </section>

          {isProjectEditorOpen && (
            <div
              className="metrado-project-editor-overlay"
              role="dialog"
              aria-label="Editar datos del proyecto"
              onClick={() => setIsProjectEditorOpen(false)}
            >
              <section
                className="metrado-project-editor-dialog"
                onClick={event => event.stopPropagation()}
              >
                <header>
                  <div>
                    <strong>Datos del proyecto</strong>
                    <span>
                      Se usan en la cabecera y en la exportacion Excel.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsProjectEditorOpen(false)}
                  >
                    x
                  </button>
                </header>
                <div className="metrado-project-editor-grid">
                  <label>
                    <span>
                      Proyecto
                      <InfoHint text="Nombre del proyecto que se mostrara en la cabecera del Excel exportado." />
                    </span>
                    <input
                      value={draft.projectName}
                      onChange={event =>
                        handleHeaderChange('projectName', event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>
                      Institucion
                      <InfoHint text="Entidad o institucion asociada al metrado. Se usa en la cabecera de todas las hojas exportadas." />
                    </span>
                    <input
                      value={draft.institution}
                      onChange={event =>
                        handleHeaderChange('institution', event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>
                      Ubicacion
                      <InfoHint text="Lugar del proyecto. Ayuda a identificar la salida exportada y el expediente." />
                    </span>
                    <input
                      value={draft.location}
                      onChange={event =>
                        handleHeaderChange('location', event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>
                      Codigo
                      <InfoHint text="Codigo interno del metrado o expediente. Se conserva al exportar." />
                    </span>
                    <input
                      value={draft.code}
                      onChange={event =>
                        handleHeaderChange('code', event.target.value)
                      }
                    />
                  </label>
                </div>
                <footer>
                  <span>{draft.code || 'Sin codigo'}</span>
                  <button
                    type="button"
                    onClick={() => setIsProjectEditorOpen(false)}
                  >
                    Cerrar
                  </button>
                </footer>
              </section>
            </div>
          )}

          {blockCreator.open && (
            <div
              className="metrado-block-creator"
              role="dialog"
              aria-label="Agregar bloque"
            >
              <div className="metrado-block-creator-card">
                <header>
                  <strong>Agregar bloque {getNextBlockCode()}</strong>
                  <button
                    type="button"
                    onClick={() =>
                      setBlockCreator({
                        open: false,
                        name: '',
                        general: true,
                        acero: true,
                      })
                    }
                  >
                    x
                  </button>
                </header>
                <label>
                  <span>Nombre del bloque</span>
                  <input
                    autoFocus
                    placeholder={`BLOQUE ${getNextBlockCode()}: nombre del bloque`}
                    value={blockCreator.name}
                    onChange={event =>
                      setBlockCreator(current => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="metrado-block-creator-checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={blockCreator.general}
                      onChange={event =>
                        setBlockCreator(current => ({
                          ...current,
                          general: event.target.checked,
                        }))
                      }
                    />
                    Metrado general
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={blockCreator.acero}
                      onChange={event =>
                        setBlockCreator(current => ({
                          ...current,
                          acero: event.target.checked,
                        }))
                      }
                    />
                    Acero
                  </label>
                </div>
                <footer>
                  <button type="button" onClick={addBlockFromCreator}>
                    Crear bloque
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBlockCreator({
                        open: false,
                        name: '',
                        general: true,
                        acero: true,
                      })
                    }
                  >
                    Cancelar
                  </button>
                </footer>
              </div>
            </div>
          )}

          {lineAssignmentEditor && (
            <div
              className="metrado-assignment-overlay"
              role="dialog"
              aria-label="Reasignar partida"
              onClick={() => setLineAssignmentEditor(null)}
            >
              <section
                className="metrado-assignment-dialog"
                onClick={event => event.stopPropagation()}
              >
                <header>
                  <div>
                    <strong>Reasignar partida</strong>
                    <span>
                      {lineAssignmentEditor.kind === 'general'
                        ? 'Linea de metrado general'
                        : 'Linea de acero'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLineAssignmentEditor(null)}
                  >
                    x
                  </button>
                </header>
                <div className="metrado-assignment-current">
                  <span>Actual</span>
                  <strong>
                    {assignmentCurrentItem
                      ? `${assignmentCurrentItem.itemCode} - ${assignmentCurrentItem.description}`
                      : 'Partida no encontrada'}
                  </strong>
                </div>
                <input
                  autoFocus
                  className="metrado-assignment-search"
                  placeholder="Buscar por codigo, descripcion, unidad o tipo..."
                  value={lineAssignmentEditor.query}
                  onChange={event =>
                    updateLineAssignmentQuery(event.target.value)
                  }
                />
                <div className="metrado-assignment-list">
                  {assignmentItems.length === 0 && (
                    <p className="metrado-assignment-empty">
                      No hay partidas que coincidan con la busqueda.
                    </p>
                  )}
                  {assignmentItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className={
                        item.id === assignmentLine?.itemId ? 'is-current' : ''
                      }
                      onClick={() => assignLineToItem(item.id)}
                    >
                      <strong>{item.itemCode}</strong>
                      <span>{item.description}</span>
                      <em>{item.unit || item.calculationType}</em>
                    </button>
                  ))}
                </div>
                <footer>
                  <span>{assignmentItems.length} resultado(s)</span>
                  <button
                    type="button"
                    onClick={() => setLineAssignmentEditor(null)}
                  >
                    Cancelar
                  </button>
                </footer>
              </section>
            </div>
          )}

          <div className="metrado-statusbar">
            <span>
              <span className="metrado-status-label">
                Bloques activos
                <InfoHint text="Cantidad de bloques que participan en el resumen y en la exportacion Excel." />
              </span>
              <strong>
                {displayedBlocks.length}/{activeBlocks.length}
              </strong>
            </span>
            <span>
              <span className="metrado-status-label">
                Lineas capturadas
                <InfoHint text="Total de detalles registrados entre metrado general, acero y platformado." />
              </span>
              <strong>{capturedLineCount}</strong>
            </span>
            <span>
              <span className="metrado-status-label">
                Incidencias
                <InfoHint text="Observaciones pendientes detectadas al importar o validar el Excel." />
              </span>
              <strong>{issueCount}</strong>
            </span>
            <span>
              <span className="metrado-status-label">
                Total
                <InfoHint text="Suma general calculada desde las partidas y bloques activos del borrador actual." />
              </span>
              <strong>{grandTotal.toFixed(draft.decimalPrecision)}</strong>
            </span>
          </div>

          <section className="metrado-workbar" aria-label="Contexto de trabajo">
            <div className="metrado-current-item">
              <span>{activeBlock?.code}</span>
              <div>
                <strong>
                  {selectedItem?.itemCode ?? 'Sin partida seleccionada'}
                  <InfoHint text="Partida seleccionada. Las grillas de Metrado general y Acero se filtran por esta partida, salvo que selecciones un titulo." />
                </strong>
                <p>
                  {selectedItem?.description ??
                    'Seleccione una partida para revisar detalles.'}
                </p>
              </div>
              <em>
                {selectedItem?.unit ||
                  selectedItem?.calculationType ||
                  'titulo'}
              </em>
            </div>
          </section>

          {viewMode === 'resumen' && (
            <section className="metrado-table-wrap">
              <table
                className="metrado-table metrado-summary-grid"
                style={
                  {
                    '--metrado-block-count': displayedBlocks.length,
                  } as CSSProperties
                }
              >
                <colgroup>
                  <col className="metrado-col-item" />
                  <col className="metrado-col-description" />
                  <col className="metrado-col-unit" />
                  {displayedBlocks.map(block => (
                    <col key={block.id} className="metrado-col-block" />
                  ))}
                  <col className="metrado-col-total" />
                </colgroup>
                <thead>
                  <tr className="metrado-summary-title-row">
                    <th colSpan={3}>Resumen</th>
                    <th colSpan={displayedBlocks.length}>
                      <div className="metrado-summary-block-toolbar">
                        <div className="metrado-summary-block-title">
                          <strong>Bloques</strong>
                          <span>{activeBlock?.code ?? '-'} activo</span>
                        </div>
                      </div>
                    </th>
                    <th className="metrado-summary-fixed-tools">
                      <div className="metrado-summary-fixed-actions">
                        <div className="metrado-summary-mode-group">
                          <button
                            type="button"
                            className="metrado-summary-open-general"
                            title="Abrir metrado general del bloque activo"
                            onClick={event => {
                              event.stopPropagation();
                              activeBlock &&
                                goToBlockDetail(activeBlock.id, 'general');
                            }}
                          >
                            Metrado
                          </button>
                          <button
                            type="button"
                            className="metrado-summary-open-acero"
                            title="Abrir acero del bloque activo"
                            onClick={event => {
                              event.stopPropagation();
                              activeBlock &&
                                goToBlockDetail(activeBlock.id, 'acero');
                            }}
                          >
                            Acero
                          </button>
                        </div>
                        <div className="metrado-summary-block-group">
                          <div
                            className="metrado-summary-filter-menu"
                            onClick={event => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              className={getBlockFilterTriggerClass(
                                'metrado-summary-filter-trigger'
                              )}
                              aria-haspopup="dialog"
                              aria-expanded={isBlockFilterOpen}
                              title="Filtrar bloques visibles en la tabla"
                              onClick={() =>
                                setIsBlockFilterOpen(current => !current)
                              }
                            >
                              {renderBlockFilterButtonContent()}
                            </button>
                            {isBlockFilterOpen && renderBlockVisibilityPanel()}
                          </div>
                          <button
                            type="button"
                            className="metrado-summary-add-block"
                            title="Crear bloque con metrado general y/o acero"
                            onClick={event => {
                              event.stopPropagation();
                              openBlockCreator();
                            }}
                          >
                            + Bloque
                          </button>
                          <button
                            type="button"
                            className="metrado-summary-delete-block"
                            title={
                              activeBlock && draft.blocks.length > 1
                                ? 'Eliminar el bloque activo y sus lineas asociadas'
                                : 'Debe quedar al menos un bloque'
                            }
                            disabled={!activeBlock || draft.blocks.length <= 1}
                            onClick={event => {
                              event.stopPropagation();
                              deleteActiveBlock();
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </th>
                  </tr>
                  <tr>
                    <th>Item</th>
                    <th>Descripcion</th>
                    <th>Und</th>
                    {displayedBlocks.map(block => {
                      const isHeaderMenuOpen =
                        summaryBlockQuickNav === block.id;
                      return (
                        <th
                          key={block.id}
                          className="metrado-summary-block-heading"
                          onClick={event => {
                            event.stopPropagation();
                            setSummaryQuickNav(null);
                            setSummaryBlockQuickNav(current =>
                              current === block.id ? null : block.id
                            );
                          }}
                        >
                          <button type="button">
                            <strong>{block.code}</strong>
                            <span>{block.name}</span>
                          </button>
                          {isHeaderMenuOpen && (
                            <div className="metrado-summary-quicknav metrado-summary-quicknav-header">
                              <strong>{block.code}</strong>
                              <button
                                type="button"
                                onClick={event => {
                                  event.stopPropagation();
                                  goToBlockDetail(block.id, 'general');
                                }}
                              >
                                Metrado general
                              </button>
                              <button
                                type="button"
                                onClick={event => {
                                  event.stopPropagation();
                                  goToBlockDetail(block.id, 'acero');
                                }}
                              >
                                Acero
                              </button>
                            </div>
                          )}
                        </th>
                      );
                    })}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map(row => (
                    <tr
                      key={row.item.id}
                      className={[
                        row.item.isHeading ? 'is-heading' : '',
                        `level-${row.item.level}`,
                        row.item.id === selectedItem?.id ? 'is-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => setSelectedItemId(row.item.id)}
                      onDoubleClick={event =>
                        openItemCatalog(row.item.id, {
                          x: event.clientX,
                          y: event.clientY,
                        })
                      }
                      onContextMenu={event => {
                        event.preventDefault();
                        openItemCatalog(row.item.id, {
                          x: event.clientX,
                          y: event.clientY,
                        });
                      }}
                    >
                      <td>{row.item.itemCode}</td>
                      <td
                        style={{ paddingLeft: `${row.item.level * 0.85}rem` }}
                      >
                        {row.item.description}
                      </td>
                      <td>{row.item.unit}</td>
                      {row.totalsByBlock.map((total, index) => {
                        const block = displayedBlocks[index];
                        const isQuickNavOpen =
                          summaryQuickNav?.itemId === row.item.id &&
                          summaryQuickNav?.blockId === block.id;
                        return (
                          <td
                            key={`${row.item.id}-${block.id}`}
                            className="metrado-summary-cell"
                            onClick={event => {
                              event.stopPropagation();
                              setSelectedItemId(row.item.id);
                              setSummaryBlockQuickNav(null);
                              setSummaryQuickNav(current =>
                                current?.itemId === row.item.id &&
                                current.blockId === block.id
                                  ? null
                                  : { itemId: row.item.id, blockId: block.id }
                              );
                            }}
                          >
                            <button
                              type="button"
                              className="metrado-summary-total"
                            >
                              {total.toFixed(draft.decimalPrecision)}
                            </button>
                            {isQuickNavOpen && (
                              <div className="metrado-summary-quicknav">
                                <strong>{block.code}</strong>
                                <button
                                  type="button"
                                  onClick={event => {
                                    event.stopPropagation();
                                    goToSummaryDetail(
                                      row.item.id,
                                      block.id,
                                      'general'
                                    );
                                  }}
                                >
                                  Metrado general
                                </button>
                                <button
                                  type="button"
                                  onClick={event => {
                                    event.stopPropagation();
                                    goToSummaryDetail(
                                      row.item.id,
                                      block.id,
                                      'acero'
                                    );
                                  }}
                                >
                                  Acero
                                </button>
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td>{row.total.toFixed(draft.decimalPrecision)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {viewMode === 'general' && (
            <section className="metrado-workspace is-general-mode">
              <div className="metrado-section-head metrado-sheet-command">
                <div>
                  <h2>
                    Metrado general - {activeBlock?.name}
                    <span className="metrado-unit-badge">
                      {selectedItem?.unit ||
                        selectedItem?.calculationType ||
                        'titulo'}
                    </span>
                    <InfoHint text="Cada linea funciona como el Excel: parcial = PRODUCT(unidad, largo, ancho, altura, area) y total = numero de veces x parcial." />
                  </h2>
                  <p>
                    {!selectedItemUsesGeneral
                      ? 'Selecciona una partida de metrado para filtrar sus detalles.'
                      : `${selectedItem?.itemCode} - Parcial = producto de factores. Total = veces x parcial.`}
                  </p>
                </div>
                <button type="button" onClick={addMeasurementLine}>
                  Agregar linea
                  <InfoHint text="Añade una fila de medicion al bloque activo. La fila queda asociada a la partida seleccionada cuando corresponde." />
                </button>
              </div>
              <div className="metrado-detail-fixed-commandbar">
                {renderDetailDynamicHeader('general', addMeasurementLine)}
              </div>
              <div
                className="metrado-table-wrap metrado-detail-scrollpane"
                ref={detailTableScrollRef}
                onScroll={event =>
                  syncDetailHorizontalScroll(event, detailTopScrollRef)
                }
              >
                <table className="metrado-table metrado-editable metrado-detail-grid metrado-general-grid">
                  <colgroup>
                    <col className="metrado-detail-col-item" />
                    <col className="metrado-detail-col-description" />
                    <col className="metrado-detail-col-small" />
                    <col className="metrado-detail-col-small" />
                    <col className="metrado-detail-col-medium" />
                    <col className="metrado-detail-col-medium" />
                    <col className="metrado-detail-col-medium" />
                    <col className="metrado-detail-col-medium" />
                    <col className="metrado-detail-col-medium" />
                    <col className="metrado-detail-col-medium" />
                    <col className="metrado-detail-col-medium" />
                    <col className="metrado-detail-col-status" />
                    <col className="metrado-detail-col-observation" />
                    <col className="metrado-detail-col-action" />
                  </colgroup>
                  <thead>
                    <tr className="metrado-workbook-nav-row">
                      <th colSpan={14}>{renderWorkbookNavigation()}</th>
                    </tr>
                    <tr>
                      <th>Partida</th>
                      <th>Detalle</th>
                      <th>Und</th>
                      <th>Veces</th>
                      <th>Cant./Und.</th>
                      <th>Largo</th>
                      <th>Ancho</th>
                      <th>Alto</th>
                      <th>Area</th>
                      <th>Parcial</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th>Observacion</th>
                      <th>Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurementLines.length === 0 && (
                      <tr className="metrado-empty-row">
                        <td colSpan={14}>
                          <div className="metrado-empty-state">
                            <strong>
                              Sin lineas de metrado general para este bloque.
                            </strong>
                            <span>
                              Esta hoja muestra todas las partidas del bloque,
                              como el Excel original.
                            </span>
                            <button type="button" onClick={addMeasurementLine}>
                              Agregar linea
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {measurementSections.map(section => (
                      <Fragment key={section.item.id}>
                        <tr
                          className={[
                            'metrado-sheet-item-row',
                            `level-${section.item.level}`,
                            selectedItem?.id === section.item.id
                              ? 'is-selected'
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() =>
                            selectDetailTarget('general', section.item.id)
                          }
                          title={
                            section.item.isHeading
                              ? 'Titulo de partida. Al agregar linea se usara la primera partida medible dentro de este grupo.'
                              : 'Partida destino para agregar lineas de metrado general.'
                          }
                        >
                          <td>{section.item.itemCode}</td>
                          <td
                            style={{
                              paddingLeft: `${section.item.level * 0.85}rem`,
                            }}
                          >
                            {section.item.description}
                          </td>
                          <td>{section.item.unit}</td>
                          <td colSpan={7} />
                          <td>
                            {section.lines
                              .reduce(
                                (acc, line) =>
                                  acc + calculateMeasurement(line).total,
                                0
                              )
                              .toFixed(2)}
                          </td>
                          <td colSpan={3} />
                        </tr>
                        {section.lines.map(line => {
                          const result = calculateMeasurement(line);
                          const lineAttachments = getLineAttachments(line);
                          return (
                            <Fragment key={line.id}>
                              <tr
                                className={[
                                  'metrado-line-row',
                                  selectedItem?.id === line.itemId
                                    ? 'is-selected'
                                    : '',
                                  detailInsertionTarget?.kind === 'general' &&
                                  detailInsertionTarget.lineId === line.id
                                    ? 'is-insertion-target'
                                    : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                                onClick={() =>
                                  selectDetailTarget(
                                    'general',
                                    line.itemId,
                                    line.id
                                  )
                                }
                              >
                                <td>
                                  {renderLinePartidaCell('general', line)}
                                </td>
                                <td>
                                  <input
                                    key={`${line.id}-description-${line.rowVersion}`}
                                    defaultValue={line.description}
                                    onFocus={() =>
                                      selectDetailTarget(
                                        'general',
                                        line.itemId,
                                        line.id
                                      )
                                    }
                                    onBlur={event =>
                                      commitMeasurementInput(
                                        line,
                                        'description',
                                        event.currentTarget.value
                                      )
                                    }
                                    onKeyDown={handleSheetInputKeyDown}
                                  />
                                </td>
                                <td>{section.item.unit}</td>
                                {(
                                  [
                                    'times',
                                    'unitCount',
                                    'length',
                                    'width',
                                    'height',
                                    'area',
                                  ] as const
                                ).map(field => (
                                  <td key={field}>
                                    <input
                                      key={`${line.id}-${field}-${line.rowVersion}`}
                                      type="number"
                                      defaultValue={line[field]}
                                      onFocus={() =>
                                        selectDetailTarget(
                                          'general',
                                          line.itemId,
                                          line.id
                                        )
                                      }
                                      onBlur={event =>
                                        commitMeasurementInput(
                                          line,
                                          field,
                                          event.currentTarget.value
                                        )
                                      }
                                      onKeyDown={handleSheetInputKeyDown}
                                    />
                                  </td>
                                ))}
                                <td>{result.partial.toFixed(2)}</td>
                                <td>{result.total.toFixed(2)}</td>
                                <td>
                                  <select
                                    value={line.validationStatus}
                                    onChange={event =>
                                      handleMeasurementChange(
                                        line.id,
                                        'validationStatus',
                                        event.target.value
                                      )
                                    }
                                  >
                                    {[
                                      'borrador',
                                      'pendiente_validacion',
                                      'observado',
                                      'validado',
                                      'aprobado',
                                    ].map(status => (
                                      <option key={status} value={status}>
                                        {status}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td>
                                  <input
                                    key={`${line.id}-observation-${line.rowVersion}`}
                                    defaultValue={line.observation}
                                    onFocus={() =>
                                      selectDetailTarget(
                                        'general',
                                        line.itemId,
                                        line.id
                                      )
                                    }
                                    onBlur={event =>
                                      commitMeasurementInput(
                                        line,
                                        'observation',
                                        event.currentTarget.value
                                      )
                                    }
                                    onKeyDown={handleSheetInputKeyDown}
                                  />
                                </td>
                                <td>
                                  <div className="metrado-row-actions">
                                    <label className="metrado-row-file-action">
                                      Imagen
                                      <input
                                        type="file"
                                        accept="image/png,image/jpeg"
                                        onChange={event => {
                                          void addMeasurementAttachment(
                                            line,
                                            event.target.files
                                          );
                                          event.currentTarget.value = '';
                                        }}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        duplicateMeasurementLine(line.id)
                                      }
                                    >
                                      Duplicar
                                    </button>
                                    <button
                                      type="button"
                                      className="is-danger"
                                      onClick={() =>
                                        deleteMeasurementLine(line.id)
                                      }
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {lineAttachments.map(attachment => (
                                <tr
                                  key={attachment.id}
                                  className="metrado-attachment-row"
                                >
                                  <td>
                                    {line.itemId
                                      ? renderLinePartidaCell('general', line, {
                                          showActions: false,
                                        })
                                      : null}
                                  </td>
                                  <td colSpan={12}>
                                    <figure
                                      className="metrado-attachment-excel"
                                      style={
                                        {
                                          '--attachment-height': `${Math.max(
                                            140,
                                            Math.min(
                                              260,
                                              Number(
                                                attachment.anchor?.rowHeight
                                              ) || 180
                                            )
                                          )}px`,
                                        } as CSSProperties
                                      }
                                    >
                                      <a
                                        href={attachment.dataUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Abrir imagen"
                                      >
                                        <img
                                          src={attachment.dataUrl}
                                          alt={
                                            attachment.caption ||
                                            attachment.name
                                          }
                                        />
                                      </a>
                                      <figcaption>
                                        <strong>
                                          {attachment.caption ||
                                            attachment.name}
                                        </strong>
                                        <span>
                                          {attachment.sourceSheet
                                            ? `${attachment.sourceSheet} fila ${
                                                attachment.sourceRow ?? '-'
                                              }`
                                            : 'Agregada desde el modulo'}
                                        </span>
                                      </figcaption>
                                    </figure>
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="metrado-attachment-remove"
                                      onClick={() =>
                                        removeAttachment(attachment.id)
                                      }
                                    >
                                      Quitar
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </Fragment>
                          );
                        })}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderDetailHorizontalRail()}
            </section>
          )}

          {viewMode === 'acero' && (
            <section className="metrado-workspace is-acero-mode">
              <div className="metrado-section-head metrado-sheet-command">
                <div>
                  <h2>
                    Acero - {activeBlock?.name}
                    <span className="metrado-unit-badge">
                      {selectedItem?.unit ||
                        selectedItem?.calculationType ||
                        'titulo'}
                    </span>
                    <InfoHint text="Para acero se calcula longitud total por diametro: elementos iguales x piezas por elemento x longitud de pieza. Luego se multiplica por kg/m." />
                  </h2>
                  <p>
                    {!selectedItemUsesRebar
                      ? 'Selecciona una partida de acero para filtrar barras y diametros.'
                      : `${selectedItem?.itemCode} - elementos x piezas x longitud x peso por metro.`}
                  </p>
                </div>
                <button type="button" onClick={addRebarLine}>
                  Agregar acero
                  <InfoHint text="Añade una fila de acero para completar diametro, cantidad de elementos, piezas y longitud." />
                </button>
              </div>
              <div className="metrado-detail-fixed-commandbar">
                {renderDetailDynamicHeader('acero', addRebarLine)}
              </div>
              <div
                className="metrado-table-wrap metrado-detail-scrollpane"
                ref={detailTableScrollRef}
                onScroll={event =>
                  syncDetailHorizontalScroll(event, detailTopScrollRef)
                }
              >
                <table className="metrado-table metrado-editable metrado-detail-grid metrado-rebar-grid">
                  <colgroup>
                    <col className="metrado-detail-col-item" />
                    <col className="metrado-detail-col-description" />
                    <col className="metrado-detail-col-status" />
                    <col className="metrado-detail-col-small" />
                    <col className="metrado-detail-col-medium" />
                    <col className="metrado-detail-col-medium" />
                    <col className="metrado-detail-col-medium" />
                    <col className="metrado-detail-col-small" />
                    <col className="metrado-detail-col-status" />
                    <col className="metrado-detail-col-status" />
                    <col className="metrado-detail-col-status" />
                    <col className="metrado-detail-col-observation" />
                    <col className="metrado-detail-col-action" />
                  </colgroup>
                  <thead>
                    <tr className="metrado-workbook-nav-row">
                      <th colSpan={13}>{renderWorkbookNavigation()}</th>
                    </tr>
                    <tr>
                      <th>Partida</th>
                      <th>Detalle</th>
                      <th>Diseno</th>
                      <th>Diametro</th>
                      <th>Elementos</th>
                      <th>Piezas</th>
                      <th>Longitud</th>
                      <th>Peso/m</th>
                      <th>Longitud total</th>
                      <th>Peso kg</th>
                      <th>Estado</th>
                      <th>Observacion</th>
                      <th>Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rebarLines.length === 0 && (
                      <tr className="metrado-empty-row">
                        <td colSpan={13}>
                          <div className="metrado-empty-state">
                            <strong>
                              Sin lineas de acero para este bloque.
                            </strong>
                            <span>
                              Esta hoja muestra todos los aceros del bloque,
                              agrupados por partida.
                            </span>
                            <div>
                              {firstRebarItem && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedItemId(firstRebarItem.id)
                                  }
                                >
                                  Usar partida acero
                                </button>
                              )}
                              <button type="button" onClick={addRebarLine}>
                                Agregar acero
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {rebarSections.map(section => (
                      <Fragment key={section.item.id}>
                        <tr
                          className={[
                            'metrado-sheet-item-row',
                            `level-${section.item.level}`,
                            selectedItem?.id === section.item.id
                              ? 'is-selected'
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() =>
                            selectDetailTarget('acero', section.item.id)
                          }
                          title={
                            section.item.isHeading
                              ? 'Titulo de partida. Al agregar acero se usara la primera partida de acero dentro de este grupo.'
                              : 'Partida destino para agregar lineas de acero.'
                          }
                        >
                          <td>{section.item.itemCode}</td>
                          <td
                            style={{
                              paddingLeft: `${section.item.level * 0.85}rem`,
                            }}
                          >
                            {section.item.description}
                          </td>
                          <td colSpan={7} />
                          <td>
                            {section.lines
                              .reduce(
                                (acc, line) =>
                                  acc + calculateRebar(line).weightKg,
                                0
                              )
                              .toFixed(2)}
                          </td>
                          <td colSpan={3} />
                        </tr>
                        {section.lines.map(line => {
                          const result = calculateRebar(line);
                          return (
                            <tr
                              key={line.id}
                              className={[
                                'metrado-line-row',
                                selectedItem?.id === line.itemId
                                  ? 'is-selected'
                                  : '',
                                detailInsertionTarget?.kind === 'acero' &&
                                detailInsertionTarget.lineId === line.id
                                  ? 'is-insertion-target'
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              onClick={() =>
                                selectDetailTarget(
                                  'acero',
                                  line.itemId,
                                  line.id
                                )
                              }
                            >
                              <td>{renderLinePartidaCell('acero', line)}</td>
                              <td>
                                <input
                                  key={`${line.id}-description-${line.rowVersion}`}
                                  defaultValue={line.description}
                                  onFocus={() =>
                                    selectDetailTarget(
                                      'acero',
                                      line.itemId,
                                      line.id
                                    )
                                  }
                                  onBlur={event =>
                                    commitRebarInput(
                                      line,
                                      'description',
                                      event.currentTarget.value
                                    )
                                  }
                                  onKeyDown={handleSheetInputKeyDown}
                                />
                              </td>
                              <td>
                                <input
                                  key={`${line.id}-design-${line.rowVersion}`}
                                  defaultValue={line.design}
                                  onFocus={() =>
                                    selectDetailTarget(
                                      'acero',
                                      line.itemId,
                                      line.id
                                    )
                                  }
                                  onBlur={event =>
                                    commitRebarInput(
                                      line,
                                      'design',
                                      event.currentTarget.value
                                    )
                                  }
                                  onKeyDown={handleSheetInputKeyDown}
                                />
                              </td>
                              <td>
                                <select
                                  value={line.diameter}
                                  onFocus={() =>
                                    selectDetailTarget(
                                      'acero',
                                      line.itemId,
                                      line.id
                                    )
                                  }
                                  onChange={event =>
                                    handleRebarChange(
                                      line.id,
                                      'diameter',
                                      event.target.value
                                    )
                                  }
                                >
                                  {Object.keys(rebarWeights).map(diameter => (
                                    <option key={diameter} value={diameter}>
                                      {diameter}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              {(
                                [
                                  'sameElements',
                                  'piecesPerElement',
                                  'pieceLength',
                                ] as const
                              ).map(field => (
                                <td key={field}>
                                  <input
                                    key={`${line.id}-${field}-${line.rowVersion}`}
                                    type="number"
                                    defaultValue={line[field]}
                                    onFocus={() =>
                                      selectDetailTarget(
                                        'acero',
                                        line.itemId,
                                        line.id
                                      )
                                    }
                                    onBlur={event =>
                                      commitRebarInput(
                                        line,
                                        field,
                                        event.currentTarget.value
                                      )
                                    }
                                    onKeyDown={handleSheetInputKeyDown}
                                  />
                                </td>
                              ))}
                              <td>
                                {(rebarWeights[line.diameter] ?? 0).toFixed(3)}
                              </td>
                              <td>{result.lengthTotal.toFixed(2)}</td>
                              <td>{result.weightKg.toFixed(2)}</td>
                              <td>
                                <select
                                  value={line.validationStatus}
                                  onChange={event =>
                                    handleRebarChange(
                                      line.id,
                                      'validationStatus',
                                      event.target.value
                                    )
                                  }
                                >
                                  {[
                                    'borrador',
                                    'pendiente_validacion',
                                    'observado',
                                    'validado',
                                    'aprobado',
                                  ].map(status => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  key={`${line.id}-observation-${line.rowVersion}`}
                                  defaultValue={line.observation}
                                  onFocus={() =>
                                    selectDetailTarget(
                                      'acero',
                                      line.itemId,
                                      line.id
                                    )
                                  }
                                  onBlur={event =>
                                    commitRebarInput(
                                      line,
                                      'observation',
                                      event.currentTarget.value
                                    )
                                  }
                                  onKeyDown={handleSheetInputKeyDown}
                                />
                              </td>
                              <td>
                                <div className="metrado-row-actions">
                                  <button
                                    type="button"
                                    onClick={() => duplicateRebarLine(line.id)}
                                  >
                                    Duplicar
                                  </button>
                                  <button
                                    type="button"
                                    className="is-danger"
                                    onClick={() => deleteRebarLine(line.id)}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderDetailHorizontalRail()}
            </section>
          )}

          {viewMode === 'platformado' && (
            <section className="metrado-workspace">
              <div className="metrado-section-head metrado-sheet-command">
                <div>
                  <h2>
                    Platformado
                    <InfoHint text="Captura progresivas y areas. El modulo calcula volumen de corte, volumen de relleno y acumulados por tramo." />
                  </h2>
                  <p>Acumulados de corte y relleno para hoja exportable.</p>
                </div>
                <button type="button" onClick={addPlatformadoLine}>
                  Agregar progresiva
                  <InfoHint text="Añade un tramo de platformado para continuar el calculo de corte y relleno acumulado." />
                </button>
              </div>
              <div className="metrado-table-wrap">
                <table className="metrado-table metrado-editable metrado-detail-grid">
                  <thead>
                    <tr className="metrado-workbook-nav-row">
                      <th colSpan={13}>{renderWorkbookNavigation()}</th>
                    </tr>
                    <tr className="metrado-detail-context-row">
                      <th colSpan={13}>
                        <span>Platformado</span>
                        <strong>
                          Cuadro de metrados por alineamiento y progresiva
                        </strong>
                        <button type="button" onClick={addPlatformadoLine}>
                          Agregar progresiva
                        </button>
                      </th>
                    </tr>
                    <tr>
                      <th>Alineamiento</th>
                      <th>Progresiva</th>
                      <th>Area corte</th>
                      <th>Area relleno</th>
                      <th>Distancia</th>
                      <th>Vol. corte</th>
                      <th>Vol. relleno</th>
                      <th>Corte acum.</th>
                      <th>Relleno acum.</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th>Observacion</th>
                      <th>Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformadoRows.length === 0 && (
                      <tr className="metrado-empty-row">
                        <td colSpan={13}>
                          <div className="metrado-empty-state">
                            <strong>Sin progresivas registradas.</strong>
                            <span>
                              Agrega una progresiva para calcular corte, relleno
                              y acumulados.
                            </span>
                            <button type="button" onClick={addPlatformadoLine}>
                              Agregar progresiva
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {platformadoRows.map(row => {
                      const { line } = row;
                      return (
                        <tr key={line.id} className="metrado-line-row">
                          <td>
                            <input
                              value={line.alignment}
                              onChange={event =>
                                handlePlatformadoChange(
                                  line.id,
                                  'alignment',
                                  event.target.value
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              value={line.progressive}
                              onChange={event =>
                                handlePlatformadoChange(
                                  line.id,
                                  'progressive',
                                  event.target.value
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={line.cutArea}
                              onChange={event =>
                                handlePlatformadoChange(
                                  line.id,
                                  'cutArea',
                                  event.target.value
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={line.fillArea}
                              onChange={event =>
                                handlePlatformadoChange(
                                  line.id,
                                  'fillArea',
                                  event.target.value
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={line.distance}
                              onChange={event =>
                                handlePlatformadoChange(
                                  line.id,
                                  'distance',
                                  event.target.value
                                )
                              }
                            />
                          </td>
                          <td>{row.cutVolume.toFixed(2)}</td>
                          <td>{row.fillVolume.toFixed(2)}</td>
                          <td>{row.cutAccumulated.toFixed(2)}</td>
                          <td>{row.fillAccumulated.toFixed(2)}</td>
                          <td>{row.total.toFixed(2)}</td>
                          <td>
                            <select
                              value={line.validationStatus}
                              onChange={event =>
                                handlePlatformadoChange(
                                  line.id,
                                  'validationStatus',
                                  event.target.value
                                )
                              }
                            >
                              {[
                                'borrador',
                                'pendiente_validacion',
                                'observado',
                                'validado',
                                'aprobado',
                              ].map(status => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              value={line.observation}
                              onChange={event =>
                                handlePlatformadoChange(
                                  line.id,
                                  'observation',
                                  event.target.value
                                )
                              }
                            />
                          </td>
                          <td>
                            <div className="metrado-row-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  duplicatePlatformadoLine(line.id)
                                }
                              >
                                Duplicar
                              </button>
                              <button
                                type="button"
                                className="is-danger"
                                onClick={() => deletePlatformadoLine(line.id)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {viewMode === 'configuracion' && (
            <section className="metrado-workspace">
              <div className="metrado-workbook-standalone">
                {renderWorkbookNavigation()}
              </div>
              <div className="metrado-section-head">
                <div>
                  <h2>
                    Configuracion del metrado
                    <InfoHint text="Aqui se ajustan bloques activos, nombres de partidas, tipo de calculo y precision decimal usada en pantalla y exportacion." />
                  </h2>
                  <p>Bloques activos, partidas, tipo de calculo y precision.</p>
                </div>
                <label className="metrado-inline-control">
                  Precision
                  <input
                    type="number"
                    min={0}
                    max={6}
                    value={draft.decimalPrecision}
                    onChange={event =>
                      handleDecimalPrecisionChange(event.target.value)
                    }
                  />
                </label>
              </div>
              <div className="metrado-config-grid">
                <section className="metrado-config-panel">
                  <h3>Bloques</h3>
                  {draft.blocks.map(block => (
                    <div className="metrado-config-row" key={block.id}>
                      <input
                        value={block.code}
                        onChange={event =>
                          handleBlockChange(
                            block.id,
                            'code',
                            event.target.value
                          )
                        }
                      />
                      <input
                        value={block.name}
                        onChange={event =>
                          handleBlockChange(
                            block.id,
                            'name',
                            event.target.value
                          )
                        }
                      />
                      <label>
                        <input
                          type="checkbox"
                          checked={block.active}
                          onChange={event =>
                            handleBlockChange(
                              block.id,
                              'active',
                              event.target.checked
                            )
                          }
                        />
                        Activo
                      </label>
                    </div>
                  ))}
                </section>
                <section className="metrado-config-panel">
                  <h3>Partidas</h3>
                  {draft.items.map(item => (
                    <div
                      className="metrado-config-row metrado-config-row-items"
                      key={item.id}
                    >
                      <input
                        value={item.itemCode}
                        onChange={event =>
                          handleItemChange(
                            item.id,
                            'itemCode',
                            event.target.value
                          )
                        }
                      />
                      <input
                        value={item.description}
                        onChange={event =>
                          handleItemChange(
                            item.id,
                            'description',
                            event.target.value
                          )
                        }
                      />
                      <input
                        value={item.unit}
                        onChange={event =>
                          handleItemChange(item.id, 'unit', event.target.value)
                        }
                      />
                      <select
                        value={item.calculationType}
                        onChange={event =>
                          handleItemChange(
                            item.id,
                            'calculationType',
                            event.target.value
                          )
                        }
                      >
                        {[
                          'general',
                          'acero',
                          'platformado',
                          'manual',
                          'mixto',
                        ].map(type => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </section>
              </div>
              <section className="metrado-config-panel">
                <h3>Catalogo de diametros</h3>
                <div className="metrado-diameter-grid">
                  {Object.entries(rebarWeights).map(([diameter, weight]) => (
                    <span key={diameter}>
                      {diameter}: {weight.toFixed(3)} kg/m
                    </span>
                  ))}
                </div>
              </section>
            </section>
          )}

          {viewMode === 'validaciones' && (
            <section className="metrado-workspace">
              <div className="metrado-workbook-standalone">
                {renderWorkbookNavigation()}
              </div>
              <div className="metrado-section-head">
                <div>
                  <h2>
                    Validaciones
                    <InfoHint text="Las incidencias sirven para revisar problemas heredados del Excel importado. Resolverlas no borra datos; solo marca el seguimiento." />
                  </h2>
                  <p>
                    Los errores heredados del Excel se tratan como incidencias,
                    no como formulas copiadas.
                  </p>
                </div>
              </div>
              <div className="metrado-issue-list">
                {draft.validationIssues.length === 0 && (
                  <article className="metrado-issue resuelto">
                    <header>
                      <strong>Sin archivo analizado</strong>
                      <span>pendiente</span>
                    </header>
                    <h3>Registra el Excel de referencia</h3>
                    <code>Resumen + hojas de bloque</code>
                    <p>
                      Al registrar el archivo se detectaran referencias #REF!,
                      totales incompletos y formulas heredadas de acero.
                    </p>
                  </article>
                )}
                {draft.validationIssues.map(issue => (
                  <article
                    key={issue.id}
                    className={`metrado-issue ${issue.status}`}
                  >
                    <header>
                      <strong>
                        {issue.sheetName} {issue.cellReference}
                      </strong>
                      <span>
                        {issue.affectedCells
                          ? `${issue.status} · ${issue.affectedCells} celdas`
                          : issue.status}
                      </span>
                    </header>
                    <h3>{issue.issueType}</h3>
                    <code>{issue.originalFormula}</code>
                    <p>{issue.suggestedFix}</p>
                    {issue.status !== 'resuelto' && (
                      <button
                        type="button"
                        onClick={() => resolveIssue(issue.id)}
                      >
                        Marcar resuelta
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {viewMode === 'exportaciones' && (
            <section className="metrado-workspace">
              <div className="metrado-workbook-standalone">
                {renderWorkbookNavigation()}
              </div>
              <div className="metrado-section-head">
                <div>
                  <h2>
                    Exportaciones
                    <InfoHint text="Genera y lista archivos Excel exportados desde el borrador actual, con hojas por bloque y formulas reconstruidas." />
                  </h2>
                  <p>
                    Registro local de archivos generados desde este borrador.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  {isExporting ? 'Exportando...' : 'Generar Excel limpio'}
                  <InfoHint text="Descarga un Excel nuevo desde los datos actuales, sin copiar formulas rotas del archivo importado." />
                </button>
              </div>
              <div className="metrado-audit-list">
                {draft.exports.length === 0 && (
                  <article>
                    <strong>Sin exportaciones</strong>
                    <p>Genera un Excel para registrar la primera salida.</p>
                  </article>
                )}
                {draft.exports.map(entry => (
                  <article key={entry.id}>
                    <span>{new Date(entry.generatedAt).toLocaleString()}</span>
                    <strong>{entry.filename}</strong>
                    <p>Estado: {entry.status}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {viewMode === 'historial' && (
            <section className="metrado-audit">
              <div className="metrado-workbook-standalone">
                {renderWorkbookNavigation()}
              </div>
              <h2>
                Historial de cambios y archivos
                <InfoHint text="Registro local de acciones: importaciones, exportaciones y cambios hechos en este navegador. La auditoria multiusuario se conectara al backend." />
              </h2>
              <p>
                Esta primera ventana registra cambios en el navegador de{' '}
                {profile.firstName || 'usuario'}. La auditoria multiusuario real
                se conectara al backend del modulo.
              </p>
              <div className="metrado-history-grid">
                <div className="metrado-audit-list">
                  <h3>Cambios</h3>
                  {draft.audit.map(entry => (
                    <article key={entry.id}>
                      <span>{new Date(entry.createdAt).toLocaleString()}</span>
                      <strong>{entry.entity}</strong>
                      <p>{entry.detail}</p>
                    </article>
                  ))}
                </div>
                <div className="metrado-audit-list">
                  <h3>Archivos</h3>
                  {draft.fileHistory.length === 0 && (
                    <article>
                      <strong>Sin archivos registrados</strong>
                      <p>
                        Registra el Excel original cuando quieras importar o
                        validar.
                      </p>
                    </article>
                  )}
                  {draft.fileHistory.map(file => (
                    <article key={file.id}>
                      <span>{new Date(file.createdAt).toLocaleString()}</span>
                      <strong>{file.name}</strong>
                      <p>
                        {file.action} - {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}
        </section>
      </section>
    </main>
  );
};

export default MetradoStructures;

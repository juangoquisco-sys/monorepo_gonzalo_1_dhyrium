import ExcelJS from 'exceljs';
import { randomUUID } from 'crypto';
import AppError from '@/utils/appError';
import {
  MetradoCalculationType,
  MetradoEventType,
  MetradoFileStatus,
  MetradoIssueStatus,
  MetradoLineType,
  MetradoProjectStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';

type ExcelImportInput = {
  buffer: Buffer;
  filename: string;
  size?: number;
  mimeType?: string;
};

type DraftBlockInput = {
  id?: string;
  code: string;
  name: string;
  generalSheetName?: string;
  rebarSheetName?: string;
  active?: boolean;
  order?: number;
  metadata?: Prisma.InputJsonValue;
};

type DraftItemInput = {
  id?: string;
  parentId?: string;
  itemCode: string;
  description: string;
  unit?: string;
  level?: number;
  calculationType?:
    | MetradoCalculationType
    | keyof typeof MetradoCalculationType;
  isHeading?: boolean;
  order?: number;
  sourceSheet?: string;
  sourceRow?: number;
  styleType?: string;
  metadata?: Prisma.InputJsonValue;
};

type DraftLineInput = Record<string, unknown>;

type DraftProjectInput = {
  projectId?: number;
  name?: string;
  projectName?: string;
  code?: string;
  uniqueCode?: string;
  localCode?: string;
  modularCode?: string;
  executingUnit?: string;
  educationalInstitution?: string;
  location?: string;
  decimalPrecision?: number;
  sourceWorkbookName?: string;
  excelMetadata?: Prisma.InputJsonValue;
  blocks?: DraftBlockInput[];
  items?: DraftItemInput[];
  measurementLines?: DraftLineInput[];
  rebarLines?: DraftLineInput[];
  platformadoLines?: DraftLineInput[];
};

const SUMMARY_SHEET = 'Resumen';
const SUMMARY_START_ROW = 12;
const SUMMARY_CODE_COLUMN = 2;
const SUMMARY_DESCRIPTION_COLUMN = 3;
const SUMMARY_UNIT_COLUMN = 4;
const SUMMARY_FIRST_BLOCK_COLUMN = 5;
const SUMMARY_TOTAL_COLUMN = 22;
const EXCEL_BLOCK_CODES_ROW = 7;
const EXCEL_BLOCK_NAMES_ROW = 8;
const REBAR_WEIGHT_BY_DIAMETER: Record<string, number> = {
  '1/4"': 0.222,
  '8mm': 0.371,
  '3/8"': 0.56,
  '1/2"': 0.994,
  '5/8"': 1.552,
  '3/4"': 2.235,
  '1"': 3.735,
};

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeSheetName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[Ø]/g, 'O')
    .replace(/\s+/g, '')
    .toUpperCase();

const getCellPayload = (cell: ExcelJS.Cell) => {
  const value = cell.value as any;
  if (value && typeof value === 'object' && 'formula' in value) {
    return {
      formula: normalizeText(value.formula),
      result: value.result ?? null,
    };
  }
  if (value && typeof value === 'object' && 'richText' in value) {
    return {
      value: normalizeText(
        value.richText.map((part: any) => part.text).join('')
      ),
    };
  }
  return { value: value ?? null };
};

const getCellText = (cell: ExcelJS.Cell) => {
  const payload = getCellPayload(cell);
  if (
    'result' in payload &&
    payload.result !== null &&
    payload.result !== undefined
  ) {
    return normalizeText(payload.result);
  }
  return normalizeText(payload.value);
};

const getFormula = (cell: ExcelJS.Cell) => {
  const payload = getCellPayload(cell);
  return 'formula' in payload ? normalizeText(payload.formula) : '';
};

const getNumericCellValue = (cell: ExcelJS.Cell): number | null => {
  const payload = getCellPayload(cell);
  const rawValue =
    'result' in payload &&
    payload.result !== null &&
    payload.result !== undefined
      ? payload.result
      : payload.value;
  if (rawValue === null || rawValue === undefined || rawValue === '')
    return null;
  if (typeof rawValue === 'number' && Number.isFinite(rawValue))
    return rawValue;
  const parsed = Number(String(rawValue ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const getOptionalNumber = (cell: ExcelJS.Cell): number | null => {
  const value = getNumericCellValue(cell);
  return value === null ? null : value;
};

const productLikeExcel = (values: Array<number | null | undefined>) => {
  const numericValues = values.filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value)
  );
  if (!numericValues.length) return 0;
  return numericValues.reduce((acc, value) => acc * value, 1);
};

const roundBy = (value: number, precision = 6) => {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
};

const cleanJson = <T>(value: T): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;

const parseExcelField = (label: string, text: string) => {
  const pattern = new RegExp(`${label}\\s*:\\s*([^|]+)`, 'i');
  const match = text.match(pattern);
  return normalizeText(match?.[1]);
};

const levelFromCode = (itemCode: string) =>
  itemCode.split('.').filter(Boolean).length;

const parentCodeFrom = (itemCode: string) => {
  const parts = itemCode.split('.').filter(Boolean);
  if (parts.length <= 1) return undefined;
  return parts.slice(0, -1).join('.');
};

const isLikelyItemCode = (value: string) => /^\d{2}(\.\d{2})*$/.test(value);

const calculationTypeFrom = (unit?: string, isHeading?: boolean) => {
  if (isHeading) return MetradoCalculationType.MIXTO;
  if (normalizeText(unit).toLowerCase() === 'kg')
    return MetradoCalculationType.ACERO;
  return MetradoCalculationType.GENERAL;
};

const findSheet = (workbook: ExcelJS.Workbook, candidates: string[]) => {
  const normalized = new Map(
    workbook.worksheets.map(sheet => [
      normalizeSheetName(sheet.name),
      sheet.name,
    ])
  );
  for (const candidate of candidates) {
    const found = normalized.get(normalizeSheetName(candidate));
    if (found) return found;
  }
  return undefined;
};

const parseHeader = (summary: ExcelJS.Worksheet) => {
  const rowText = (rowNumber: number) => {
    const values: string[] = [];
    summary.getRow(rowNumber).eachCell({ includeEmpty: false }, cell => {
      const text = getCellText(cell);
      if (text && !values.includes(text)) values.push(text);
    });
    return values.join(' | ');
  };

  const row1 = rowText(1);
  const row2 = rowText(2);
  const row3 = rowText(3);
  const row4 = rowText(4);
  const row5 = rowText(5);

  return {
    name: normalizeText(row1 || row5 || 'Metrado de estructuras'),
    executingUnit: parseExcelField('UNIDAD EJECUTORA', row2),
    uniqueCode: parseExcelField('CODIGO UNICO', row3),
    localCode: parseExcelField('CODIGO LOCAL', row3),
    modularCode: parseExcelField('CODIGO MODULAR', row3),
    educationalInstitution: parseExcelField('INSTITUCION EDUCATIVA', row4),
    location:
      parseExcelField('UBICACIÓN', row4) || parseExcelField('UBICACION', row4),
  };
};

const readBlocks = (workbook: ExcelJS.Workbook, summary: ExcelJS.Worksheet) => {
  const blocks: Array<{
    id: string;
    code: string;
    name: string;
    order: number;
    column: number;
    generalSheetName?: string;
    rebarSheetName?: string;
  }> = [];

  for (
    let column = SUMMARY_FIRST_BLOCK_COLUMN;
    column < SUMMARY_TOTAL_COLUMN;
    column += 1
  ) {
    const code = getCellText(summary.getCell(EXCEL_BLOCK_CODES_ROW, column));
    const name = getCellText(summary.getCell(EXCEL_BLOCK_NAMES_ROW, column));
    if (!code || /^METRADO TOTAL$/i.test(code)) continue;

    blocks.push({
      id: randomUUID(),
      code,
      name: name || `BLOQUE ${code}`,
      order: blocks.length + 1,
      column,
      generalSheetName: findSheet(workbook, [`B-${code}`, `B-${code}.`, code]),
      rebarSheetName: findSheet(workbook, [
        `Ø-${code}`,
        `O-${code}`,
        `Ø-${code}.`,
      ]),
    });
  }

  return blocks;
};

const getWorksheetFormulaAudit = (workbook: ExcelJS.Workbook) => {
  let totalCells = 0;
  let formulas = 0;
  let refIssues = 0;

  const sheets = workbook.worksheets.map(sheet => {
    let sheetCells = 0;
    let sheetFormulas = 0;
    let sheetRefIssues = 0;

    sheet.eachRow({ includeEmpty: false }, row => {
      row.eachCell({ includeEmpty: false }, cell => {
        sheetCells += 1;
        const formula = getFormula(cell);
        if (formula) {
          sheetFormulas += 1;
          if (formula.includes('#REF!')) sheetRefIssues += 1;
        }
      });
    });

    totalCells += sheetCells;
    formulas += sheetFormulas;
    refIssues += sheetRefIssues;

    return {
      name: sheet.name,
      rowCount: sheet.rowCount,
      actualRowCount: sheet.actualRowCount,
      actualColumnCount: sheet.actualColumnCount,
      nonEmptyCells: sheetCells,
      formulas: sheetFormulas,
      refIssues: sheetRefIssues,
      merges: Object.keys((sheet as any)._merges ?? {}).length,
      images:
        typeof (sheet as any).getImages === 'function'
          ? (sheet as any).getImages().length
          : 0,
    };
  });

  return {
    sheetCount: workbook.worksheets.length,
    totalCells,
    formulas,
    refIssues,
    sheets,
  };
};

const getWorkbookRefIssues = (workbook: ExcelJS.Workbook) => {
  const issues: Array<{
    sheetName: string;
    cellReference: string;
    originalFormula: string;
    issueType: string;
    suggestedFix?: string;
    status: MetradoIssueStatus;
    metadata?: Prisma.InputJsonValue;
  }> = [];

  workbook.worksheets.forEach(sheet => {
    sheet.eachRow({ includeEmpty: false }, row => {
      row.eachCell({ includeEmpty: false }, cell => {
        const formula = getFormula(cell);
        if (formula.includes('#REF!')) {
          const repair = tryRepairRebarRef(sheet, cell);
          issues.push({
            sheetName: sheet.name,
            cellReference: cell.address,
            originalFormula: formula,
            issueType: repair?.issueType ?? 'FORMULA_REF_ROTA',
            suggestedFix:
              repair?.fixedFormula ??
              'Recalcular desde partidas, bloque y tipo de metrado guardados en BD.',
            status: repair?.status ?? MetradoIssueStatus.PENDING,
            metadata: cleanJson(repair?.metadata ?? { source: 'excel-import' }),
          });
        }
      });
    });
  });

  return issues;
};

const readSummaryItems = (
  summary: ExcelJS.Worksheet,
  blocks: ReturnType<typeof readBlocks>
) => {
  const items: Array<{
    id: string;
    itemCode: string;
    description: string;
    unit?: string;
    level: number;
    isHeading: boolean;
    calculationType: MetradoCalculationType;
    order: number;
    sourceRow: number;
    metadata: Prisma.InputJsonValue;
  }> = [];

  for (
    let rowNumber = SUMMARY_START_ROW;
    rowNumber <= summary.rowCount;
    rowNumber += 1
  ) {
    const row = summary.getRow(rowNumber);
    const itemCode = getCellText(row.getCell(SUMMARY_CODE_COLUMN));
    const description = getCellText(row.getCell(SUMMARY_DESCRIPTION_COLUMN));
    if (!isLikelyItemCode(itemCode) || !description) continue;

    const unit = getCellText(row.getCell(SUMMARY_UNIT_COLUMN));
    const totalCell = row.getCell(SUMMARY_TOTAL_COLUMN);
    const summaryValues = blocks.map(block => {
      const cell = row.getCell(block.column);
      const payload = getCellPayload(cell);
      return {
        blockCode: block.code,
        cell: cell.address,
        formula: 'formula' in payload ? payload.formula : undefined,
        result: getNumericCellValue(cell),
      };
    });

    const isHeading = !unit;
    items.push({
      id: randomUUID(),
      itemCode,
      description,
      unit: unit || undefined,
      level: levelFromCode(itemCode),
      isHeading,
      calculationType: calculationTypeFrom(unit, isHeading),
      order: Number(row.getCell(1).value) || items.length + 1,
      sourceRow: rowNumber,
      metadata: cleanJson({
        summary: {
          row: rowNumber,
          total: {
            cell: totalCell.address,
            formula: getFormula(totalCell) || undefined,
            result: getNumericCellValue(totalCell),
          },
          blockValues: summaryValues,
        },
      }),
    });
  }

  return items;
};

const findHeaderColumn = (
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  labels: string[]
) => {
  const keys = labels.map(label => normalizeSheetName(label));
  let found = 0;
  sheet.getRow(rowNumber).eachCell({ includeEmpty: false }, cell => {
    const text = normalizeSheetName(getCellText(cell));
    if (!found && keys.some(label => text.includes(label))) {
      found = Number(cell.col);
    }
  });
  return found;
};

const findExactHeaderColumn = (
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  labels: string[]
) => {
  const keys = labels.map(label => normalizeSheetName(label));
  let found = 0;
  sheet.getRow(rowNumber).eachCell({ includeEmpty: false }, cell => {
    const text = normalizeSheetName(getCellText(cell));
    if (!found && keys.includes(text)) found = Number(cell.col);
  });
  return found;
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
    const diameterCol = findExactHeaderColumn(sheet, rowNumber, ['Ø']);
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
        firstWeightCol: diameterCol + 4,
        lastWeightCol: diameterCol + 10,
      };
    }
  }

  return {
    headerRow: 7,
    itemCol: 1,
    descriptionCol: 2,
    designCol: 3,
    diameterCol: 4,
    sameElementsCol: 5,
    piecesCol: 6,
    lengthCol: 7,
    firstWeightCol: 8,
    lastWeightCol: 14,
  };
};

const readMeasurementLines = (
  workbook: ExcelJS.Workbook,
  blocks: ReturnType<typeof readBlocks>,
  itemByCode: Map<string, ReturnType<typeof readSummaryItems>[number]>
) => {
  const lines: Prisma.MetradoMeasurementLineCreateManyInput[] = [];

  blocks.forEach(block => {
    if (!block.generalSheetName) return;
    const sheet = workbook.getWorksheet(block.generalSheetName);
    if (!sheet) return;
    const columns = detectDetailColumns(sheet);
    let currentItem: ReturnType<typeof readSummaryItems>[number] | undefined;

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
        currentItem.calculationType === MetradoCalculationType.ACERO
      ) {
        continue;
      }

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
      const partial = roundBy(
        productLikeExcel([unitCount, length, width, height, area])
      );
      const total = roundBy((times ?? 0) * partial);
      const hasMeasurement = [
        times,
        unitCount,
        length,
        width,
        height,
        area,
      ].some(value => value !== null);
      if (!hasMeasurement) continue;

      lines.push({
        id: randomUUID(),
        metradoItemId: currentItem.id,
        metradoBlockId: block.id,
        lineType: MetradoLineType.DETAIL,
        description,
        times,
        unitCount,
        length,
        width,
        height,
        area,
        partial,
        total,
        formulas: cleanJson({
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
        }),
        order: lines.length + 1,
        sourceSheet: sheet.name,
        sourceRow: rowNumber,
        metadata: cleanJson({ importedFromDetailSheet: true }),
      });
    }
  });

  return lines;
};

const readRebarLines = (
  workbook: ExcelJS.Workbook,
  blocks: ReturnType<typeof readBlocks>,
  itemByCode: Map<string, ReturnType<typeof readSummaryItems>[number]>
) => {
  const lines: Prisma.MetradoRebarLineCreateManyInput[] = [];

  blocks.forEach(block => {
    if (!block.rebarSheetName) return;
    const sheet = workbook.getWorksheet(block.rebarSheetName);
    if (!sheet) return;
    const columns = detectRebarColumns(sheet);
    let currentItem: ReturnType<typeof readSummaryItems>[number] | undefined;
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
      if (!diameter || !(diameter in REBAR_WEIGHT_BY_DIAMETER)) continue;

      const sameElements = getOptionalNumber(
        sheet.getCell(rowNumber, columns.sameElementsCol)
      );
      const piecesPerElement = getOptionalNumber(
        sheet.getCell(rowNumber, columns.piecesCol)
      );
      const pieceLength = getOptionalNumber(
        sheet.getCell(rowNumber, columns.lengthCol)
      );
      const lengthTotal = roundBy(
        (sameElements ?? 0) * (piecesPerElement ?? 0) * (pieceLength ?? 0)
      );
      const weightPerMeter = REBAR_WEIGHT_BY_DIAMETER[diameter] ?? 0;
      const weightKg = roundBy(lengthTotal * weightPerMeter);

      lines.push({
        id: randomUUID(),
        metradoItemId: currentItem.id,
        metradoBlockId: block.id,
        lineType: MetradoLineType.DETAIL,
        description,
        design:
          getCellText(sheet.getCell(rowNumber, columns.designCol)) ||
          currentDesign,
        diameter,
        sameElements,
        piecesPerElement,
        pieceLength,
        lengthTotal,
        weightPerMeter,
        weightKg,
        formulas: cleanJson({
          sameElements:
            getFormula(sheet.getCell(rowNumber, columns.sameElementsCol)) ||
            undefined,
          piecesPerElement:
            getFormula(sheet.getCell(rowNumber, columns.piecesCol)) ||
            undefined,
          pieceLength:
            getFormula(sheet.getCell(rowNumber, columns.lengthCol)) ||
            undefined,
          repairedRule:
            'sameElements * piecesPerElement * pieceLength * weightPerMeter',
        }),
        order: lines.length + 1,
        sourceSheet: sheet.name,
        sourceRow: rowNumber,
        metadata: cleanJson({ importedFromDetailSheet: true }),
      });
    }
  });

  return lines;
};

const readPlatformadoLines = (
  workbook: ExcelJS.Workbook
): Prisma.MetradoPlatformadoLineCreateManyInput[] => {
  const sheetName = findSheet(workbook, ['PLATAFORMADO', 'PLATFORMADO']);
  if (!sheetName) return [];

  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) return [];

  const lines: Prisma.MetradoPlatformadoLineCreateManyInput[] = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const progressive =
      getCellText(sheet.getCell(rowNumber, 3)) ||
      getCellText(sheet.getCell(rowNumber, 2));
    const cutArea = getOptionalNumber(sheet.getCell(rowNumber, 4));
    const fillArea = getOptionalNumber(sheet.getCell(rowNumber, 5));
    const distance = getOptionalNumber(sheet.getCell(rowNumber, 6));

    if (
      !progressive &&
      cutArea === null &&
      fillArea === null &&
      distance === null
    ) {
      continue;
    }
    if (normalizeText(progressive).toUpperCase().includes('PROGRESIVA'))
      continue;

    lines.push({
      id: randomUUID(),
      metradoProjectId: '',
      alignment: 'Eje principal',
      progressive,
      cutArea,
      fillArea,
      distance,
      formulas: cleanJson({
        progressive: getFormula(sheet.getCell(rowNumber, 3)) || undefined,
        cutArea: getFormula(sheet.getCell(rowNumber, 4)) || undefined,
        fillArea: getFormula(sheet.getCell(rowNumber, 5)) || undefined,
        distance: getFormula(sheet.getCell(rowNumber, 6)) || undefined,
      }),
      order: lines.length + 1,
      sourceSheet: sheet.name,
      sourceRow: rowNumber,
      metadata: cleanJson({ source: 'excel-import' }),
    });
  }

  return lines;
};

const getWorkbookMediaEntries = (workbook: ExcelJS.Workbook) =>
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

const imageMimeFromExtension = (extensionValue: unknown) => {
  const extension = String(extensionValue || 'png')
    .replace('.', '')
    .toLowerCase();
  return extension === 'jpg' || extension === 'jpeg'
    ? 'image/jpeg'
    : `image/${extension}`;
};

const mediaToDataUrl = (media: any) => {
  if (!media) return '';
  const extension = String(media.extension || 'png')
    .replace('.', '')
    .toLowerCase();
  const payload =
    typeof media.base64 === 'string'
      ? media.base64
      : media.buffer
      ? Buffer.from(media.buffer).toString('base64')
      : '';
  return payload
    ? `data:${imageMimeFromExtension(extension)};base64,${payload}`
    : '';
};

const getImageAnchorPayload = (sheet: ExcelJS.Worksheet, image: any) => {
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

  return cleanJson({
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
  });
};

const findMeasurementLineForImage = (
  lines: Prisma.MetradoMeasurementLineCreateManyInput[],
  blockId: string,
  sheetName: string,
  anchor: any
) => {
  const sheetKey = normalizeSheetName(sheetName);
  const sheetLines = lines
    .filter(
      line =>
        line.metradoBlockId === blockId &&
        normalizeSheetName(String(line.sourceSheet ?? '')) === sheetKey &&
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
  if (direct) return { line: direct, strategy: 'direct-or-range' };

  const previous = [...sheetLines].reverse().find(line => {
    const row = Number(line.sourceRow);
    return row <= anchorStart + 1 && anchorStart - row <= 8;
  });

  const next = sheetLines.find(line => {
    const row = Number(line.sourceRow);
    return row >= anchorStart - 1 && row - anchorStart <= 8;
  });

  if (previous) return { line: previous, strategy: 'previous-nearby' };
  if (next) return { line: next, strategy: 'next-nearby' };
  return { line: undefined, strategy: 'unassigned' };
};

const readMetradoAttachments = (
  workbook: ExcelJS.Workbook,
  blocks: ReturnType<typeof readBlocks>,
  measurementLines: Prisma.MetradoMeasurementLineCreateManyInput[]
) => {
  const mediaEntries = getWorkbookMediaEntries(workbook);
  const attachments: Omit<
    Prisma.MetradoAttachmentCreateManyInput,
    'metradoProjectId'
  >[] = [];

  blocks.forEach(block => {
    if (!block.generalSheetName) return;
    const sheet = workbook.getWorksheet(block.generalSheetName);
    if (!sheet || typeof (sheet as any).getImages !== 'function') return;

    ((sheet as any).getImages() as any[]).forEach((image, imageIndex) => {
      const anchor = getImageAnchorPayload(sheet, image) as any;
      if (Number(anchor.startRow) < 8) return;
      const media = getWorkbookMediaEntry(mediaEntries, image.imageId);
      const dataUrl = mediaToDataUrl(media);
      if (!dataUrl) return;
      const association = findMeasurementLineForImage(
        measurementLines,
        block.id,
        sheet.name,
        anchor
      );
      const line = association.line;

      attachments.push({
        metradoBlockId: block.id,
        metradoItemId: line?.metradoItemId,
        metradoMeasurementLineId: line?.id,
        kind: 'image',
        scope: 'measurement',
        name:
          media?.name ||
          `imagen-${sheet.name}-${anchor.startRow}-${imageIndex}.${
            media?.extension || 'png'
          }`,
        mimeType: imageMimeFromExtension(media?.extension),
        extension: String(media?.extension || 'png')
          .replace('.', '')
          .toLowerCase(),
        dataUrl,
        caption:
          typeof line?.description === 'string' ? line.description : undefined,
        sourceSheet: sheet.name,
        sourceRow: Number(anchor.startRow),
        anchor,
        order: attachments.length + 1,
        metadata: cleanJson({
          imageId: image.imageId,
          importedFromDetailSheet: true,
          associationStrategy: association.strategy,
        }),
      });
    });
  });

  return attachments;
};

const tryRepairRebarRef = (sheet: ExcelJS.Worksheet, cell: ExcelJS.Cell) => {
  const rowNumber = Number(cell.row);
  const column = Number(cell.col);
  if (
    !sheet.name.includes('Ø') ||
    column < 8 ||
    column > 14 ||
    rowNumber <= 8
  ) {
    return undefined;
  }

  const diameter = getCellText(sheet.getCell(rowNumber, 4));
  const targetDiameter = getCellText(sheet.getCell(7, column));
  const sameElements = getOptionalNumber(sheet.getCell(rowNumber, 5));
  const piecesPerElement = getOptionalNumber(sheet.getCell(rowNumber, 6));
  const pieceLength = getOptionalNumber(sheet.getCell(rowNumber, 7));
  if (!diameter || !targetDiameter) return undefined;

  const lengthTotal =
    diameter === targetDiameter
      ? roundBy(
          (sameElements ?? 0) * (piecesPerElement ?? 0) * (pieceLength ?? 0)
        )
      : 0;
  const fixedFormula = `IF($D${rowNumber}=$${cell.address.replace(
    /[0-9]/g,
    ''
  )}$7,$E${rowNumber}*$F${rowNumber}*$G${rowNumber},0)`;

  return {
    fixedFormula,
    repairedValue: lengthTotal,
    status: MetradoIssueStatus.RESOLVED,
    issueType: 'FORMULA_REF_REPARADA',
    metadata: {
      repairedBy: 'REBAR_LENGTH_RULE',
      diameter,
      targetDiameter,
      sameElements,
      piecesPerElement,
      pieceLength,
      repairedValue: lengthTotal,
    },
  };
};

class MetradosServices {
  public async list() {
    return prisma.metradoProject.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            blocks: true,
            items: true,
            attachments: true,
            imports: true,
            exports: true,
            validations: true,
          },
        },
      },
    });
  }

  public async getById(id: string) {
    const project = await prisma.metradoProject.findUnique({
      where: { id },
      include: {
        blocks: { orderBy: { order: 'asc' } },
        items: { orderBy: { order: 'asc' } },
        platformadoLines: { orderBy: { order: 'asc' } },
        attachments: { orderBy: { order: 'asc' } },
        imports: { orderBy: { createdAt: 'desc' } },
        exports: { orderBy: { createdAt: 'desc' } },
        validations: { orderBy: { createdAt: 'desc' } },
        events: { orderBy: { eventAt: 'desc' }, take: 50 },
      },
    });

    if (!project) throw new AppError('Metrado no encontrado', 404);

    const [measurementLines, rebarLines] = await Promise.all([
      prisma.metradoMeasurementLine.findMany({
        where: { item: { metradoProjectId: id } },
        orderBy: [{ order: 'asc' }],
      }),
      prisma.metradoRebarLine.findMany({
        where: { item: { metradoProjectId: id } },
        orderBy: [{ order: 'asc' }],
      }),
    ]);

    return { ...project, measurementLines, rebarLines };
  }

  public async createDraft(input: DraftProjectInput, actorId: number) {
    const blocks = input.blocks ?? [];
    const items = input.items ?? [];
    const itemIdMap = new Map<string, string>();
    const blockIdMap = new Map<string, string>();

    blocks.forEach(block => {
      if (block.id) blockIdMap.set(block.id, randomUUID());
    });
    items.forEach(item => {
      if (item.id) itemIdMap.set(item.id, randomUUID());
    });

    const projectId = await prisma.$transaction(async tx => {
      const project = await tx.metradoProject.create({
        data: {
          projectId: input.projectId,
          name: input.name || input.projectName || 'Metrado de estructuras',
          code: input.code || '',
          uniqueCode: input.uniqueCode,
          localCode: input.localCode,
          modularCode: input.modularCode,
          executingUnit: input.executingUnit || '',
          educationalInstitution: input.educationalInstitution || '',
          location: input.location || '',
          decimalPrecision: input.decimalPrecision ?? 2,
          sourceWorkbookName: input.sourceWorkbookName,
          excelMetadata: input.excelMetadata ?? Prisma.JsonNull,
          status: MetradoProjectStatus.DRAFT,
          createdById: actorId,
        },
      });

      const createdBlocks = await Promise.all(
        blocks.map((block, index) =>
          tx.metradoBlock.create({
            data: {
              id: block.id ? blockIdMap.get(block.id) : undefined,
              metradoProjectId: project.id,
              code: block.code,
              name: block.name,
              generalSheetName: block.generalSheetName,
              rebarSheetName: block.rebarSheetName,
              active: block.active ?? true,
              order: block.order ?? index + 1,
              metadata: block.metadata ?? Prisma.JsonNull,
            },
          })
        )
      );

      for (const [index, item] of items.entries()) {
        await tx.metradoItem.create({
          data: {
            id: item.id ? itemIdMap.get(item.id) : undefined,
            metradoProjectId: project.id,
            parentId: item.parentId ? itemIdMap.get(item.parentId) : undefined,
            itemCode: item.itemCode,
            description: item.description,
            unit: item.unit,
            level: item.level ?? levelFromCode(item.itemCode),
            calculationType:
              (item.calculationType as MetradoCalculationType) ??
              calculationTypeFrom(item.unit, item.isHeading),
            isHeading: item.isHeading ?? !item.unit,
            order: item.order ?? index + 1,
            sourceSheet: item.sourceSheet,
            sourceRow: item.sourceRow,
            styleType: item.styleType,
            metadata: item.metadata ?? Prisma.JsonNull,
          },
        });
      }

      await tx.metradoEvent.create({
        data: {
          metradoProjectId: project.id,
          actorId,
          eventType: MetradoEventType.PROJECT_CREATED,
          entity: 'MetradoProject',
          entityId: project.id,
          notes: 'Proyecto de metrado creado desde borrador web.',
          after: cleanJson({
            blocks: createdBlocks.length,
            items: items.length,
          }),
        },
      });

      return project.id;
    });

    return this.getById(projectId);
  }

  public async importExcel(input: ExcelImportInput, actorId: number) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(input.buffer);

    const summary = workbook.getWorksheet(SUMMARY_SHEET);
    if (!summary)
      throw new AppError('El Excel no contiene la hoja Resumen', 400);

    const header = parseHeader(summary);
    const blocks = readBlocks(workbook, summary);
    const items = readSummaryItems(summary, blocks);
    const formulaAudit = getWorksheetFormulaAudit(workbook);
    const refIssues = getWorkbookRefIssues(workbook);

    items.forEach(item => {
      const parentCode = parentCodeFrom(item.itemCode);
      (item.metadata as any).parentCode = parentCode;
    });

    return prisma.$transaction(
      async tx => {
        const project = await tx.metradoProject.create({
          data: {
            name: header.name || 'Metrado de estructuras',
            code: header.uniqueCode || '',
            uniqueCode: header.uniqueCode,
            localCode: header.localCode,
            modularCode: header.modularCode,
            executingUnit: header.executingUnit || '',
            educationalInstitution: header.educationalInstitution || '',
            location: header.location || '',
            status: MetradoProjectStatus.IMPORTED,
            sourceWorkbookName: input.filename,
            excelMetadata: cleanJson({
              importedAt: new Date().toISOString(),
              workbook: formulaAudit,
              summaryMapping: {
                codeColumn: 'B',
                descriptionColumn: 'C',
                unitColumn: 'D',
                blockColumns: 'E:U',
                totalColumn: 'V',
              },
            }),
            createdById: actorId,
          },
        });

        await tx.metradoBlock.createMany({
          data: blocks.map(block => ({
            id: block.id,
            metradoProjectId: project.id,
            code: block.code,
            name: block.name,
            generalSheetName: block.generalSheetName,
            rebarSheetName: block.rebarSheetName,
            active: true,
            order: block.order,
            metadata: cleanJson({ sourceColumn: block.column }),
          })),
        });

        const itemDbIdByCode = new Map(
          items.map(item => [item.itemCode, item.id])
        );
        for (const item of items) {
          const parentCode = parentCodeFrom(item.itemCode);
          await tx.metradoItem.create({
            data: {
              id: item.id,
              metradoProjectId: project.id,
              parentId: parentCode ? itemDbIdByCode.get(parentCode) : undefined,
              itemCode: item.itemCode,
              description: item.description,
              unit: item.unit,
              level: item.level,
              calculationType: item.calculationType,
              isHeading: item.isHeading,
              order: item.order,
              sourceSheet: SUMMARY_SHEET,
              sourceRow: item.sourceRow,
              metadata: item.metadata,
            },
          });
        }

        const itemByCode = new Map(items.map(item => [item.itemCode, item]));
        const measurementLines = readMeasurementLines(
          workbook,
          blocks,
          itemByCode
        );
        const rebarLines = readRebarLines(workbook, blocks, itemByCode);
        const platformadoLines = readPlatformadoLines(workbook);
        const attachments = readMetradoAttachments(
          workbook,
          blocks,
          measurementLines
        );
        const repairedRefIssues = refIssues.filter(
          issue => issue.status === MetradoIssueStatus.RESOLVED
        ).length;
        const pendingRefIssues = refIssues.length - repairedRefIssues;

        if (measurementLines.length) {
          await tx.metradoMeasurementLine.createMany({
            data: measurementLines,
          });
        }
        if (rebarLines.length) {
          await tx.metradoRebarLine.createMany({ data: rebarLines });
        }
        if (platformadoLines.length) {
          await tx.metradoPlatformadoLine.createMany({
            data: platformadoLines.map(line => ({
              ...line,
              metradoProjectId: project.id,
            })),
          });
        }
        if (attachments.length) {
          await tx.metradoAttachment.createMany({
            data: attachments.map(attachment => ({
              ...attachment,
              metradoProjectId: project.id,
            })),
          });
        }

        if (refIssues.length) {
          await tx.metradoValidationIssue.createMany({
            data: refIssues.map(issue => ({
              metradoProjectId: project.id,
              sheetName: issue.sheetName,
              cellReference: issue.cellReference,
              issueType: issue.issueType,
              originalFormula: issue.originalFormula,
              suggestedFix: issue.suggestedFix,
              status: issue.status,
              affectedCells: 1,
              metadata: issue.metadata ?? cleanJson({ source: 'excel-import' }),
            })),
          });
        }

        await tx.metradoImport.create({
          data: {
            metradoProjectId: project.id,
            filename: input.filename,
            size: input.size,
            mimeType: input.mimeType,
            status: MetradoFileStatus.PROCESSED,
            summary: cleanJson({
              blocks: blocks.length,
              items: items.length,
              measurementLines: measurementLines.length,
              rebarLines: rebarLines.length,
              platformadoLines: platformadoLines.length,
              attachments: attachments.length,
              refIssues: refIssues.length,
              repairedRefIssues,
              pendingRefIssues,
              formulaAudit,
            }),
            createdById: actorId,
          },
        });

        await tx.metradoEvent.create({
          data: {
            metradoProjectId: project.id,
            actorId,
            eventType: MetradoEventType.EXCEL_IMPORTED,
            entity: 'MetradoImport',
            notes: `Excel importado: ${input.filename}`,
            after: cleanJson({
              blocks: blocks.length,
              items: items.length,
              formulas: formulaAudit.formulas,
              refIssues: refIssues.length,
              attachments: attachments.length,
              platformadoLines: platformadoLines.length,
              repairedRefIssues,
              pendingRefIssues,
            }),
          },
        });

        const importedProject = await tx.metradoProject.findUnique({
          where: { id: project.id },
          include: {
            blocks: { orderBy: { order: 'asc' } },
            items: { orderBy: { order: 'asc' } },
            validations: { orderBy: { createdAt: 'desc' } },
            platformadoLines: { orderBy: { order: 'asc' } },
            attachments: { orderBy: { order: 'asc' } },
            imports: { orderBy: { createdAt: 'desc' } },
          },
        });
        const [importedMeasurementLines, importedRebarLines] =
          await Promise.all([
            tx.metradoMeasurementLine.findMany({
              where: { item: { metradoProjectId: project.id } },
              orderBy: [{ order: 'asc' }],
            }),
            tx.metradoRebarLine.findMany({
              where: { item: { metradoProjectId: project.id } },
              orderBy: [{ order: 'asc' }],
            }),
          ]);

        return {
          projectId: project.id,
          imported: {
            blocks: blocks.length,
            items: items.length,
            measurementLines: measurementLines.length,
            rebarLines: rebarLines.length,
            platformadoLines: platformadoLines.length,
            attachments: attachments.length,
            refIssues: refIssues.length,
            repairedRefIssues,
            pendingRefIssues,
          },
          project: importedProject
            ? {
                ...importedProject,
                measurementLines: importedMeasurementLines,
                rebarLines: importedRebarLines,
              }
            : null,
        };
      },
      { maxWait: 10000, timeout: 60000 }
    );
  }

  public async deleteProject(id: string, actorId: number) {
    const project = await prisma.metradoProject.findUnique({ where: { id } });
    if (!project) throw new AppError('Metrado no encontrado', 404);

    await prisma.metradoProject.delete({ where: { id } });
    return {
      id,
      deletedBy: actorId,
      deletedAt: new Date().toISOString(),
    };
  }
}

export default new MetradosServices();

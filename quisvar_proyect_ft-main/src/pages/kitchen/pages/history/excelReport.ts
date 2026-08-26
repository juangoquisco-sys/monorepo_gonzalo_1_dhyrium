import * as ExcelJS from 'exceljs';
import { exportExcel } from '@/utils/excelGenerate/utils/excelTools';
import dayjsSpanish, {
  convertTo12HourFormat,
  formatDateTimeVisibleUtc,
  formatDateUtc,
} from '@/utils/dayjsSpanish';
import {
  DeliveryStatus,
  type KitchenLicenseJustification,
} from '../formMealOrder/interfaces/mealOrder.types';
import type {
  HistoryFilters,
  KitchenHistoryResponse,
  KitchenHistoryRow,
  KitchenHistoryUserDetailRecord,
} from './interfaces/kitchenHistory.types';
import {
  getDeliveryStatusHistoryLabel,
  pickupStatusHistoryLabelMap,
} from './interfaces/kitchenHistory.types';

const COLORS = {
  ink: 'FF0F172A',
  muted: 'FF64748B',
  line: 'FFD8DEE9',
  header: 'FFEFF3F8',
  band: 'FFF8FAFC',
  white: 'FFFFFFFF',
  green: 'FF166534',
  greenFill: 'FFEAF7EF',
  amber: 'FF92400E',
  amberFill: 'FFFFF7E6',
  red: 'FF991B1B',
  redFill: 'FFFDECEC',
};

type KitchenHistoryExcelParams = {
  rows: KitchenHistoryRow[];
  summary: KitchenHistoryResponse['summary'];
  filters: HistoryFilters;
  exportName: string;
};

type KitchenUserHistoryExcelParams = {
  user: KitchenHistoryRow;
  records: KitchenHistoryUserDetailRecord[];
  filters: Pick<HistoryFilters, 'dateFrom' | 'dateTo' | 'mealType'>;
  exportName: string;
};

type RiskLevel = 'Alto' | 'Medio' | 'Bajo';

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLORS.line } },
  left: { style: 'thin', color: { argb: COLORS.line } },
  bottom: { style: 'thin', color: { argb: COLORS.line } },
  right: { style: 'thin', color: { argb: COLORS.line } },
};

const periodLabel = (dateFrom: Date | null, dateTo: Date | null) => {
  const from = dateFrom ? dayjsSpanish(dateFrom).format('DD/MM/YYYY') : '---';
  const to = dateTo ? dayjsSpanish(dateTo).format('DD/MM/YYYY') : '---';
  return `${from} - ${to}`;
};

const pickupFilterLabel = (value: HistoryFilters['pickupStatus']) =>
  value === 'Todos' ? 'Todos' : pickupStatusHistoryLabelMap[value];

const percentValue = (value: number) => value / 100;

const getRiskLevel = (row: KitchenHistoryRow): RiskLevel => {
  if (row.notPickedUpCount >= 2 || row.notPickedUpRate >= 50) return 'Alto';
  if (
    row.notPickedUpCount >= 1 ||
    row.notPickedUpRate >= 25 ||
    row.pendingPickupCount > 0
  ) {
    return 'Medio';
  }

  return 'Bajo';
};

const getRiskStyle = (risk: RiskLevel) => {
  if (risk === 'Alto') {
    return { fill: COLORS.redFill, font: COLORS.red };
  }

  if (risk === 'Medio') {
    return { fill: COLORS.amberFill, font: COLORS.amber };
  }

  return { fill: COLORS.greenFill, font: COLORS.green };
};

const getLicenseJustificationText = (
  license: KitchenLicenseJustification | null | undefined
) => {
  if (!license) return '';

  const type = license.type || 'Permiso';
  const reason = license.reason || 'Sin motivo registrado';
  return `${type}: ${reason}. Desde ${formatDateTimeVisibleUtc(
    license.startDate
  )} hasta ${formatDateTimeVisibleUtc(license.untilDate)}`;
};

export const getKitchenLicenseJustificationText = (
  record: KitchenHistoryUserDetailRecord
) => getLicenseJustificationText(record.licenseJustification);

const applyWorkbookDefaults = (workbook: ExcelJS.Workbook) => {
  workbook.creator = 'Dhyrium';
  workbook.lastModifiedBy = 'Dhyrium';
  workbook.created = new Date();
  workbook.modified = new Date();
};

const applySheetDefaults = (worksheet: ExcelJS.Worksheet) => {
  worksheet.properties.defaultRowHeight = 20;
  worksheet.properties.tabColor = { argb: COLORS.ink };
  worksheet.views = [{ showGridLines: false }];
  worksheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
  };
};

const setCellStyle = (
  cell: ExcelJS.Cell,
  options: {
    bold?: boolean;
    color?: string;
    fill?: string;
    size?: number;
    horizontal?: 'left' | 'center' | 'right';
    wrapText?: boolean;
  } = {}
) => {
  cell.font = {
    name: 'Calibri',
    bold: options.bold,
    size: options.size ?? 10,
    color: { argb: options.color ?? COLORS.ink },
  };
  cell.alignment = {
    vertical: 'middle',
    horizontal: options.horizontal ?? 'left',
    wrapText: options.wrapText,
  };
  cell.border = thinBorder;

  if (options.fill) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: options.fill },
    };
  }
};

const addReportTitle = (
  worksheet: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  endColumn: string
) => {
  worksheet.mergeCells(`A1:${endColumn}1`);
  worksheet.mergeCells(`A2:${endColumn}2`);
  worksheet.getCell('A1').value = title;
  worksheet.getCell('A2').value = subtitle;
  worksheet.getRow(1).height = 24;
  worksheet.getRow(2).height = 18;

  setCellStyle(worksheet.getCell('A1'), {
    bold: true,
    color: COLORS.ink,
    fill: COLORS.white,
    size: 15,
  });
  setCellStyle(worksheet.getCell('A2'), {
    color: COLORS.muted,
    fill: COLORS.white,
    size: 9,
  });
};

const addInfoRow = (
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  values: Array<[string, string]>,
  startCol = 1
) => {
  values.forEach(([label, value], index) => {
    const labelCell = worksheet.getCell(rowNumber, startCol + index * 2);
    const valueCell = worksheet.getCell(rowNumber, startCol + index * 2 + 1);
    labelCell.value = label;
    valueCell.value = value;
    setCellStyle(labelCell, {
      bold: true,
      color: COLORS.muted,
      fill: COLORS.header,
      size: 8,
      horizontal: 'center',
    });
    setCellStyle(valueCell, {
      bold: true,
      color: COLORS.ink,
      fill: COLORS.white,
      size: 8,
    });
  });
};

const addMetric = (
  worksheet: ExcelJS.Worksheet,
  labelCellRef: string,
  valueCellRef: string,
  label: string,
  value: ExcelJS.CellValue,
  numberFormat?: string,
  color = COLORS.ink
) => {
  const labelCell = worksheet.getCell(labelCellRef);
  const valueCell = worksheet.getCell(valueCellRef);
  labelCell.value = label;
  valueCell.value = value;
  setCellStyle(labelCell, {
    bold: true,
    color: COLORS.muted,
    fill: COLORS.header,
    size: 8,
    horizontal: 'center',
  });
  setCellStyle(valueCell, {
    bold: true,
    color,
    fill: COLORS.white,
    size: 12,
    horizontal: 'center',
  });
  if (numberFormat) valueCell.numFmt = numberFormat;
};

const styleHeaderRow = (
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  columnCount: number
) => {
  const row = worksheet.getRow(rowNumber);
  row.height = 24;

  for (let col = 1; col <= columnCount; col += 1) {
    setCellStyle(row.getCell(col), {
      bold: true,
      color: COLORS.ink,
      fill: COLORS.header,
      size: 9,
      horizontal: 'center',
      wrapText: true,
    });
  }
};

const styleDataRows = (
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  columnCount: number,
  leftColumns: number[],
  riskColumn?: number
) => {
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const fill = rowNumber % 2 === 0 ? COLORS.white : COLORS.band;

    for (let col = 1; col <= columnCount; col += 1) {
      setCellStyle(row.getCell(col), {
        fill,
        size: 9,
        horizontal: leftColumns.includes(col) ? 'left' : 'center',
        wrapText: leftColumns.includes(col),
      });
    }

    if (riskColumn) {
      const riskCell = row.getCell(riskColumn);
      const style = getRiskStyle(String(riskCell.value || 'Bajo') as RiskLevel);
      riskCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: style.fill },
      };
      riskCell.font = {
        name: 'Calibri',
        bold: true,
        size: 9,
        color: { argb: style.font },
      };
    }
  }
};

const getSortedRows = (rows: KitchenHistoryRow[]) =>
  [...rows].sort(
    (a, b) =>
      b.notPickedUpCount - a.notPickedUpCount ||
      b.notPickedUpRate - a.notPickedUpRate ||
      b.requestedCount - a.requestedCount
  );

const buildHistorySheet = (
  workbook: ExcelJS.Workbook,
  { rows, summary, filters }: KitchenHistoryExcelParams
) => {
  const worksheet = workbook.addWorksheet('Historial');
  applySheetDefaults(worksheet);
  worksheet.columns = [
    { width: 6 },
    { width: 31 },
    { width: 12 },
    { width: 12 },
    { width: 10 },
    { width: 10 },
    { width: 11 },
    { width: 11 },
    { width: 11 },
    { width: 12 },
    { width: 10 },
    { width: 10 },
    { width: 9 },
    { width: 14 },
    { width: 10 },
  ];

  const headerRow = 8;
  const dataStartRow = headerRow + 1;
  const lastRow = dataStartRow + rows.length - 1;
  const sortedRows = getSortedRows(rows);
  const pickedUpTotal = rows.reduce(
    (total, row) => total + row.pickedUpCount,
    0
  );
  const pendingTotal = rows.reduce(
    (total, row) => total + row.pendingPickupCount,
    0
  );

  addReportTitle(
    worksheet,
    'Historial de alimentación',
    'Resumen operativo y detalle por usuario en una sola hoja',
    'O'
  );
  addInfoRow(worksheet, 3, [
    ['Periodo', periodLabel(filters.dateFrom, filters.dateTo)],
    ['Comida', filters.mealType],
    ['Tipo', filters.userType],
    ['Retiro', pickupFilterLabel(filters.pickupStatus)],
    ['Generado', dayjsSpanish().format('DD/MM/YYYY HH:mm')],
  ]);
  addInfoRow(worksheet, 4, [
    ['Búsqueda', filters.search || 'Sin filtro'],
    ['Usuarios', String(rows.length)],
    ['Top reincidente', summary.topOffender?.fullName || 'Sin reincidencia'],
  ]);

  addMetric(worksheet, 'A6', 'B6', 'Pedidos', summary.totalOrders);
  addMetric(
    worksheet,
    'C6',
    'D6',
    'Recogidos',
    pickedUpTotal,
    undefined,
    COLORS.green
  );
  addMetric(
    worksheet,
    'E6',
    'F6',
    'Incumpl.',
    summary.totalIncumplimientos,
    undefined,
    COLORS.red
  );
  addMetric(
    worksheet,
    'G6',
    'H6',
    'Tasa',
    {
      formula: `IF(B6=0,0,F6/B6)`,
      result:
        summary.totalOrders > 0
          ? summary.totalIncumplimientos / summary.totalOrders
          : 0,
    },
    '0%',
    COLORS.amber
  );
  addMetric(
    worksheet,
    'I6',
    'J6',
    'Usuarios inc.',
    summary.usersWithIncumplimientos
  );
  addMetric(
    worksheet,
    'K6',
    'L6',
    'Pendientes',
    pendingTotal,
    undefined,
    COLORS.amber
  );
  addMetric(
    worksheet,
    'M6',
    'N6',
    'No serv./sin cierre',
    `${summary.totalNoService}/${summary.totalMissedClose}`
  );
  addMetric(worksheet, 'O5', 'O6', 'Abiertos', summary.totalOpenOrders);

  worksheet.getRow(headerRow).values = [
    'N°',
    'Usuario',
    'DNI',
    'Tipo',
    'Pedidos',
    'Recogió',
    'No recogió',
    '% Inc.',
    'Reserv.',
    'Pend.',
    'No serv.',
    'Sin cierre',
    'Abiertos',
    'Últ. inc.',
    'Riesgo',
  ];
  styleHeaderRow(worksheet, headerRow, 15);

  sortedRows.forEach((item, index) => {
    const rowNumber = dataStartRow + index;
    const row = worksheet.getRow(rowNumber);
    row.values = [
      index + 1,
      item.fullName,
      item.dni || '---',
      item.userType,
      item.requestedCount,
      item.pickedUpCount,
      item.notPickedUpCount,
      {
        formula: `IF(E${rowNumber}=0,0,G${rowNumber}/E${rowNumber})`,
        result: percentValue(item.notPickedUpRate),
      },
      item.reservedCount,
      item.pendingPickupCount,
      item.noServiceCount,
      item.missedCloseCount,
      item.openOrderCount,
      item.lastNotPickedUpAt ? formatDateUtc(item.lastNotPickedUpAt) : '---',
      getRiskLevel(item),
    ];
    row.getCell(8).numFmt = '0%';
  });

  styleDataRows(worksheet, dataStartRow, lastRow, 15, [2], 15);
  worksheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: lastRow, column: 15 },
  };
  worksheet.views = [
    { showGridLines: false, state: 'frozen', ySplit: headerRow },
  ];

  return worksheet;
};

const summarizeUserRecords = (records: KitchenHistoryUserDetailRecord[]) => {
  const pickedUpCount = records.filter(
    record => record.deliveryStatus === DeliveryStatus.PICKED_UP
  ).length;
  const notPickedUpCount = records.filter(
    record => record.deliveryStatus === DeliveryStatus.NOT_PICKED_UP
  ).length;
  const reservedCount = records.filter(
    record => record.deliveryStatus === DeliveryStatus.RESERVED
  ).length;
  const pendingPickupCount = records.filter(
    record => record.deliveryStatus === DeliveryStatus.PENDING_PICKUP
  ).length;
  const requestedCount =
    pickedUpCount + notPickedUpCount + reservedCount + pendingPickupCount;

  return {
    requestedCount,
    pickedUpCount,
    notPickedUpCount,
    reservedCount,
    pendingPickupCount,
    notPickedUpRate: requestedCount > 0 ? notPickedUpCount / requestedCount : 0,
  };
};

const getStatusStyle = (status: DeliveryStatus) => {
  if (status === DeliveryStatus.NOT_PICKED_UP) {
    return { fill: COLORS.redFill, font: COLORS.red };
  }

  if (status === DeliveryStatus.PENDING_PICKUP) {
    return { fill: COLORS.amberFill, font: COLORS.amber };
  }

  if (status === DeliveryStatus.PICKED_UP) {
    return { fill: COLORS.greenFill, font: COLORS.green };
  }

  return { fill: COLORS.header, font: COLORS.ink };
};

const buildUserHistorySheet = (
  workbook: ExcelJS.Workbook,
  { user, records, filters }: KitchenUserHistoryExcelParams
) => {
  const summary = summarizeUserRecords(records);
  const worksheet = workbook.addWorksheet('Historial');
  applySheetDefaults(worksheet);
  worksheet.columns = [
    { width: 13 },
    { width: 14 },
    { width: 10 },
    { width: 11 },
    { width: 36 },
    { width: 16 },
    { width: 48 },
  ];

  const headerRow = 8;
  const dataStartRow = headerRow + 1;
  const lastRow = dataStartRow + records.length - 1;

  addReportTitle(
    worksheet,
    `Historial de alimentación - ${user.fullName}`,
    'Resumen y detalle individual en una sola hoja',
    'G'
  );
  addInfoRow(worksheet, 3, [
    ['Periodo', periodLabel(filters.dateFrom, filters.dateTo)],
    ['Comida', filters.mealType],
    ['DNI', user.dni || '---'],
  ]);

  addMetric(worksheet, 'A6', 'B6', 'Pedidos', summary.requestedCount);
  addMetric(
    worksheet,
    'C6',
    'D6',
    'Recogió',
    summary.pickedUpCount,
    undefined,
    COLORS.green
  );
  addMetric(
    worksheet,
    'E6',
    'F6',
    'No recogió',
    summary.notPickedUpCount,
    undefined,
    COLORS.red
  );
  addMetric(
    worksheet,
    'G5',
    'G6',
    '% Inc.',
    summary.notPickedUpRate,
    '0%',
    COLORS.amber
  );

  worksheet.getRow(headerRow).values = [
    'Fecha',
    'Comida',
    'Hora',
    'Cantidad',
    'Comentario',
    'Estado',
    'Justificación',
  ];
  styleHeaderRow(worksheet, headerRow, 7);

  records.forEach((record, index) => {
    const row = worksheet.getRow(dataStartRow + index);
    row.values = [
      formatDateUtc(record.date),
      record.mealType,
      convertTo12HourFormat(record.mealHour),
      record.amountOfFood,
      record.comment || 'Sin comentario',
      getDeliveryStatusHistoryLabel(record.deliveryStatus),
      getKitchenLicenseJustificationText(record) || 'Sin justificación',
    ];
  });

  styleDataRows(worksheet, dataStartRow, lastRow, 7, [5, 7]);
  records.forEach((record, index) => {
    const statusCell = worksheet.getRow(dataStartRow + index).getCell(6);
    const style = getStatusStyle(record.deliveryStatus);
    statusCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: style.fill },
    };
    statusCell.font = {
      name: 'Calibri',
      bold: true,
      size: 9,
      color: { argb: style.font },
    };
  });

  worksheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: lastRow, column: 7 },
  };
  worksheet.views = [
    { showGridLines: false, state: 'frozen', ySplit: headerRow },
  ];

  return worksheet;
};

export const generateKitchenHistoryExcelReport = async (
  params: KitchenHistoryExcelParams
) => {
  const workbook = new ExcelJS.Workbook();
  applyWorkbookDefaults(workbook);
  buildHistorySheet(workbook, params);
  await exportExcel(`${params.exportName}.xlsx`, workbook);
};

export const generateKitchenUserHistoryExcelReport = async (
  params: KitchenUserHistoryExcelParams
) => {
  const workbook = new ExcelJS.Workbook();
  applyWorkbookDefaults(workbook);
  buildUserHistorySheet(workbook, params);
  await exportExcel(`${params.exportName}.xlsx`, workbook);
};

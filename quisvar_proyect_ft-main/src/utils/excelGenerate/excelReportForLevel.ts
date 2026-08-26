import * as ExcelJS from 'exceljs';

import type { InfoDataReport, Level } from '@/types/types';
import {
  borderProjectStyle,
  exportExcel,
  fillRows,
  fontExcelStyle,
  formatExcelStyle,
  moneyFormat,
} from './utils/excelTools';

const reportCoordinator = {
  areas: 'CC  COORDINADOR DEL PROYECTO : ',
  indexTasks: 'CC  COORDINADOR DEL AREA : ',
  tasks: 'CC  COORDINADOR DEL AREA :',
  tasks_2: 'CC  COORDINADOR DEL AREA :',
  tasks_3: 'CC  COORDINADOR DEL AREA :',
};
const excelSimpleReport = async (
  data: Level,
  infoData: InfoDataReport,
  option: 'indexTasks' | 'areas' | 'tasks' | 'tasks' | 'tasks_3'
) => {
  const response = await fetch('/templates/report_template_project.xlsx');
  const buffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const wk = workbook.getWorksheet('REPORTE');
  if (!wk) return;
  wk.getCell(
    'C1'
  ).value = `INFORME PARCIAL DEL PROYECTO: ${infoData.projectName}-${infoData.cui} `;
  wk.getCell('C5').value = reportCoordinator[option];
  wk.getCell('D5').value = infoData.moderatorName;
  wk.getCell('D7').value = infoData.department;
  wk.getCell('D8').value = infoData.province;
  wk.getCell('D9').value = infoData.district;
  wk.getCell('D11').value = infoData.initialDate;
  wk.getCell('D12').value = infoData.finishDate;
  let rowNumber = 21;
  rowNumber = recursionProject(wk, [data], rowNumber);
  wk.pageSetup.printArea = 'A1:K' + (rowNumber + 3);
  exportExcel('project-report', workbook);
};

const recursionProject = (
  wk: ExcelJS.Worksheet,
  dataRows: Level[],
  rowNumber: number
) => {
  dataRows.forEach(dataRow => {
    const indexLevel = dataRow.level || 0;
    const row = wk.insertRow(rowNumber, [
      null,
      dataRow.level ? '  '.repeat(dataRow.level) + dataRow.item : null,
      dataRow.name,
      dataRow.days,
      dataRow.percentage / 100,
      dataRow.balance,
      dataRow.spending,
      dataRow.price,
      dataRow.total,
      indexLevel,
    ]);
    const color = dataRow.isProject
      ? 'ffd0d0'
      : dataRow.isArea
      ? 'd3e6c6'
      : dataRow.isInclude
      ? 'dbf0f9'
      : 'f3f6fc';
    borderProjectStyle(row);
    fillRows(row, 2, 10, color);
    formatExcelStyle({ row, positions: 'FGH', format: moneyFormat });
    formatExcelStyle({ row, positions: 'E', format: '0%' });
    fontExcelStyle({
      row,
      positions: 'BCDEFGHIJ',
      color: '000000',
      isBold: false,
      size: 8,
      name: 'Century Gothic',
    });
    rowNumber++;
    if (dataRow.subTasks) {
      dataRow.subTasks.map(sustaskRow => {
        const row = wk.insertRow(rowNumber, [
          null,
          '  '.repeat(dataRow.level + 1) + sustaskRow.item,
          sustaskRow.name,
          sustaskRow.days,
          sustaskRow.percentage / 100,
          null,
          null,
          sustaskRow.price,
          null,
          indexLevel + 1,
        ]);
        fillRows(row, 2, 10, 'fffffff');
        borderProjectStyle(row);
        formatExcelStyle({ row, positions: 'FGH', format: moneyFormat });
        formatExcelStyle({ row, positions: 'E', format: '0%' });
        rowNumber++;
      });
    }
    if (dataRow.nextLevel) {
      rowNumber = recursionProject(wk, dataRow.nextLevel, rowNumber);
    }
  });
  return rowNumber;
};
export { excelSimpleReport };

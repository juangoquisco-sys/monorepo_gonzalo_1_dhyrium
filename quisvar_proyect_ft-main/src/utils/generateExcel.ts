import type { ExcelData } from '@/types/types';
import * as ExcelJS from 'exceljs';
import { getTimeOut, parseUTC } from './formatDate';
import {
  borderReportStyle,
  exportExcel,
  fillRows,
  formatExcelStyle,
  moneyFormat,
} from './excelGenerate/utils/excelTools';
// import { drawDaysBars, getDaysHistory, transformDaysObject } from './tools';
import type {
  Reporting,
  ReportingProject,
} from '@/pages/listPersonalReports/interface/report.types';
import { formatFullDateUtc } from './dayjsSpanish';

const excelReport = async (report: Reporting, infoData: ExcelData) => {
  // Cargar la plantilla desde un archivo
  const response = await fetch('/templates/report_templateV5.xlsx');
  const buffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  // Obtener la hoja de cálculo
  const wk = workbook.getWorksheet('REPORTE');
  // const wk1 = workbook.addWorksheet('sheet');
  // Insertar contenido en las celdas
  // wk1.getCell('A1').value = 'Contenido en A1';
  // wk1.getCell('A10').value = 'Contenido en A10';

  // Configurar un salto de página después de la fila 10 (A10)
  // wk1.getRow(10).addPageBreak(1, 4);
  if (!wk) return;
  wk.getCell('C1').value = infoData.title;
  wk.getCell('D4').value = 'ARQ. CATERINY YESENIA HUMPIRI MAMANI';
  wk.getCell('D9').value = infoData.concept.toUpperCase();
  wk.getCell('D13').value = infoData.degree;
  wk.getCell('H12').value = '-';
  wk.getCell('D7').value =
    `${infoData.firstName} ${infoData.lastName}`.toUpperCase();
  wk.getCell('D11').value = infoData.dni;
  wk.getCell('D12').value = +infoData.phone;
  wk.getCell('D15').value = formatFullDateUtc(infoData.initialDate);
  wk.getCell('D16').value = formatFullDateUtc(infoData.untilDate);
  wk.getCell('H19').value = {
    formula: `${infoData.totalDays}*1000/30`,
    date1904: false,
  };

  let rowNumber = 28;
  (report.data as ReportingProject[]).forEach(project => {
    const projectRow = wk.insertRow(rowNumber, [
      null,
      `CUI: ${project.cui}`,
      project.name.toUpperCase(),
    ]);
    wk.mergeCells(`D${rowNumber}:I${rowNumber}`);
    // const { firstName, lastName } = project.moderator.profile;
    const coordinator = project.tasks?.[0].taskInfo.coordinator;
    projectRow.getCell('D').value = (
      'COORDINADOR: ' +
      coordinator?.firstName +
      ' ' +
      coordinator?.lastName
    ).toUpperCase();
    projectRow.getCell('D').alignment = {
      horizontal: 'center',
    };
    projectRow.font = {
      bold: true,
      color: { argb: 'F50000' },
      size: 9,
    };
    borderReportStyle(projectRow);

    fillRows(projectRow, 2, 10, 'D9E1F2');

    rowNumber++;
    project.tasks?.forEach(subTask => {
      const getDays = getTimeOut(subTask.assignedAt, subTask.finishedAt) / 24;
      // const daysHistory = getDaysHistory(
      //   subTask.feedBacks,
      //   subTask.assignedAt || ''
      // );
      // const rangeDays = transformDaysObject(daysHistory);
      const subtaskRow = wk.insertRow(rowNumber, [
        null,
        subTask.item,
        subTask.taskInfo.name.toUpperCase(),
        +subTask.taskInfo.price,
        parseUTC(subTask.assignedAt),
        parseUTC(subTask.finishedAt),
        subTask.percentage / 100,
        null,
        null,
        getDays + 'Dias',
      ]);
      // // const imageBar = drawDaysBars(rangeDays);
      // const imageId2 = workbook.addImage({
      //   base64: imageBar,
      //   extension: 'png',
      // });
      // wk.addImage(imageId2, {
      //   tl: { col: 11, row: rowNumber - 1 },
      //   ext: { width: 170 * rangeDays.length, height: 35 },
      // });

      borderReportStyle(subtaskRow);
      subtaskRow.getCell('C').font = {
        bold: true,
        color: { argb: '4472C4' },
        size: 9,
      };
      subtaskRow.getCell('I').value = {
        formula: `=+D${rowNumber}*G${rowNumber}`,
        date1904: false,
      };
      formatExcelStyle({
        row: subtaskRow,
        positions: 'ID',
        format: moneyFormat,
      });
      formatExcelStyle({
        row: subtaskRow,
        positions: 'G',
        format: '0%',
      });
      formatExcelStyle({
        row: subtaskRow,
        positions: 'H',
        format: '0%',
      });
      rowNumber++;
    });
  });
  const endLine = rowNumber;
  // const resultPorcentage = data.reduce(
  //   (acc, project) => {
  //     acc.sumTotalTask += project.subtasks.length;
  //     acc.porcentageValue += project.subtasks.length * 30;
  //     return acc;
  //   },
  //   { sumTotalTask: 0, porcentageValue: 0 }
  // );

  // resultPorcentage.porcentageValue / resultPorcentage.sumTotalTask;

  const sumTotalCell = 'I' + (endLine + 2);
  wk.getCell(sumTotalCell).value = {
    formula: `SUM(I28:I${endLine})`,
    date1904: false,
  };
  const salaryAdvanceCell = 'I' + (endLine + 3);
  wk.getCell(salaryAdvanceCell).value = {
    formula: `${sumTotalCell}*${report.percentage}/100`,
    date1904: false,
  };
  wk.getCell('I' + (endLine + 4)).value = report.attendanceDiscount;
  wk.getCell('I' + (endLine + 5)).value = report.licensesDiscount;
  wk.getCell('I' + (endLine + 6)).value = {
    formula: `${salaryAdvanceCell}-I${endLine + 4}-I${endLine + 5}`,
    date1904: false,
  };
  wk.getCell(`I${endLine + 7}`).value = {
    formula: `${sumTotalCell}-${salaryAdvanceCell}`,
    date1904: false,
  };
  wk.getCell('H18').value = {
    formula: `=${salaryAdvanceCell}`,
    date1904: false,
  };
  wk.getCell(
    'C18'
  ).value = `ADELANTO MAXIMO (${report.percentage}%) POR COSTO PARCIAL:`;

  wk.mergeCells(`H${endLine + 10}:I${endLine + 10}`);
  wk.mergeCells(`H${endLine + 11}:I${endLine + 11}`);
  const dniFinishcell = wk.getCell(`H${endLine + 10}`);
  dniFinishcell.value = 'DNI: ' + infoData.dni;
  dniFinishcell.font = {
    bold: true,
  };
  dniFinishcell.border = {
    top: { style: 'medium' },
  };
  dniFinishcell.alignment = { vertical: 'middle', horizontal: 'center' };
  const fullNameCell = wk.getCell(`H${endLine + 11}`);
  fullNameCell.value = infoData.firstName + ' ' + infoData.lastName;
  fullNameCell.alignment = {
    vertical: 'middle',
    horizontal: 'center',
  };

  wk.pageSetup.printArea = 'A1:K' + (endLine + 13);
  exportExcel('userReport', workbook);
};

export { excelReport };

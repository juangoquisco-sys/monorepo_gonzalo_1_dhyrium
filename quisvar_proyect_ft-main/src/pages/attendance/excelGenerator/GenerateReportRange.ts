import * as ExcelJS from 'exceljs';
import type { AttendanceRange } from '@/types/types';
import { getPrice } from '@/utils/excelGenerate/utils/excelTools';
import { countStatusAttendance } from '../utils/countStatusAttendance';
interface GenerateReportProps {
  startDate: string;
  endDate: string;
  printData: AttendanceRange[];
}

export async function generateReportRange({
  startDate,
  endDate,
  printData,
}: GenerateReportProps) {
  const response = await fetch('/templates/list_template.xlsx');
  const buffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const wk = workbook.getWorksheet('Hoja1');

  let rowNumber = 6;
  if (!wk) return;
  wk.getCell('B3').value = `LISTA DE ASISTENCIA DEL ${startDate} AL ${endDate}`;
  const filterdUsers: AttendanceRange[] = printData.filter(
    user => user?.list.length !== 0
  );
  const moneyFormat =
    '_-"S/"* #,##0.00_-;-"S/"* #,##0.00_-;_-"S/"* "-"??_-;_-@_-';
  filterdUsers.forEach((data: AttendanceRange, idx: number) => {
    const counts = countStatusAttendance(data);
    const dataRows = wk.insertRow(rowNumber, [
      null,
      idx + 1,
      data.profile.userPc ?? '000',
      data.profile.lastName + ' ' + data.profile.firstName,
      data.profile.dni,
      data.profile.phone,
      counts.PUNTUAL,
      counts.TARDE,
      counts.SIMPLE,
      counts.GRAVE,
      counts.MUY_GRAVE,
      counts.PERMISO,
      counts.SALIDA,
      getPrice(counts),
    ]);
    const columnLetters = 'BCDEFGHIJKLMN';
    columnLetters.split('').forEach(columnLetter => {
      const cell = dataRows.getCell(columnLetter);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    dataRows.getCell('G').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '87e4bd' },
    };
    dataRows.getCell('H').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'fbde7d' },
    };
    dataRows.getCell('I').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'eebdc1' },
    };
    dataRows.getCell('J').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ea8b8e' },
    };
    dataRows.getCell('K').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'd2595b' },
    };
    dataRows.getCell('L').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '7da4ee' },
    };
    dataRows.getCell('M').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '877cdc' },
    };
    dataRows.getCell('N').numFmt = moneyFormat;
    dataRows.getCell('N').font = {
      color: { argb: 'FF0000' },
    };
    rowNumber++;
  });
  const endLine = rowNumber;
  wk.pageSetup.printArea = 'A1:N' + (endLine + 9);
  workbook.xlsx.writeBuffer().then(data => {
    const blob = new Blob([data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheet.sheet',
    });
    const url = window.URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'download.xlsx';
    anchor.click();
    window.URL.revokeObjectURL(url);
  });
}

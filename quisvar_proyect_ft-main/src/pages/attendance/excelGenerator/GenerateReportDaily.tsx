import * as ExcelJS from 'exceljs';
import { ATTENDANCE_STATUS_SHORT_LABELS } from '@/models/attendanceStatus';
import type { AttendanceRange } from '@/types/types';
import { formatFullDateUtc } from '@/utils/dayjsSpanish';
interface GenerateReportDailyProps {
  startDate: string;
  printData: AttendanceRange[];
}
const orderCalls = [
  'primer llamado',
  'segundo llamado',
  'tercer llamado',
  'cuarto llamado',
  'quinto llamado',
  'sexto llamado',
  'sétimo llamado',
  'octavo llamado',
  'noveno llamado',
  'decimo llamado',
];
export async function generateReportDaily({
  startDate,
  printData,
}: GenerateReportDailyProps) {
  // console.log(printData);
  const initialCalls =
    printData[0].list.length <= 7
      ? orderCalls.slice(0, 7)
      : orderCalls.slice(0, printData[0].list.length);
  const response = await fetch('/templates/list_daily_template.xlsx');
  const buffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const wk = workbook.getWorksheet('Hoja1');

  let rowNumber = 6;

  const distance = 'NOP';
  if (!wk) return;
  wk.getCell('B3').value = `LISTA DE ASISTENCIA DEL ${formatFullDateUtc(
    startDate
  )}`.toUpperCase();
  initialCalls.length > 7
    ? wk.mergeCells(`B3:${distance.charAt(initialCalls.length - 8)}3`)
    : wk.mergeCells('B3:M3');
  wk.getCell('B3').alignment = { vertical: 'middle', horizontal: 'center' };
  wk.getCell('G4').value = 'ASISTENCIAS';
  initialCalls.length > 7
    ? wk.mergeCells(`G4:${distance.charAt(initialCalls.length - 8)}4`)
    : wk.mergeCells('G4:M4');
  wk.getCell('G4').alignment = { vertical: 'middle', horizontal: 'center' };
  const getStatus = (data: AttendanceRange) => {
    const orderedStatus: string[] = [];

    initialCalls.forEach(call => {
      const estadoEncontrado = data.list.find(item => item.list.title === call);
      if (estadoEncontrado) {
        const inicialEstado =
          (ATTENDANCE_STATUS_SHORT_LABELS as Record<string, string>)[
            estadoEncontrado.status
          ] || ' ';
        orderedStatus.push(inicialEstado);
      } else {
        orderedStatus.push(' ');
      }
    });

    return orderedStatus;
  };

  // const getTimers = (data: AttendanceRange) => {
  //   const orderedTimers: string[] = [];

  //   orderCalls.forEach(call => {
  //     const estadoEncontrado = data.list.find(item => item.list.title === call);

  //     if (estadoEncontrado) {
  //       orderedTimers.push(estadoEncontrado.list.timer);
  //     }
  //   });

  //   return orderedTimers;
  // };
  const filterdUsers: AttendanceRange[] = printData.filter(
    user => user?.list.length !== 0
  );
  const timerCells = 'GHIJKLMNOP';
  const subtimer = timerCells.substring(0, initialCalls.length).split('');

  subtimer.forEach((cell, index) => {
    // const timer = getTimers(filterdUsers[0]);
    wk.getCell(`${cell}5`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D9E1F2' },
    };
    wk.getCell(`${cell}5`).value = index + 1;
    wk.getCell(`${cell}5`).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  const getColor = (status: string) => {
    if (status === 'P') return '87E4BD';
    if (status === 'T') return 'FFE17F';
    if (status === 'F') return 'F8C5C5';
    if (status === 'G') return 'F19191';
    if (status === 'M') return 'D2595B';
    if (status === 'L') return '83A8F0';
    if (status === 'S') return '877CDC';
  };

  filterdUsers.forEach((data: AttendanceRange, idx: number) => {
    const _getStatus = getStatus(data);
    const dataRows = wk.insertRow(rowNumber, [
      null,
      idx + 1,
      data.profile.room ?? '000',
      data.profile.lastName + ' ' + data.profile.firstName,
      data.profile.dni,
      data.profile.phone,
      ..._getStatus,
    ]);
    const columnLetters = 'BCDEFGHIJKLMNOP';
    const cd = columnLetters.substring(0, initialCalls.length + 5).split('');
    cd.forEach(columnLetter => {
      const cell = dataRows.getCell(columnLetter);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    const fillColors = 'GHIJKLMNOP';
    const ad = fillColors.substring(0, initialCalls.length);
    for (let i = 0; i < _getStatus.length; i++) {
      const columnFill = ad[i];
      const cell = dataRows.getCell(columnFill);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: getColor(_getStatus[i]) },
      };
    }
    rowNumber++;
  });
  const endLine = rowNumber;
  wk.pageSetup.printArea =
    `A1:${timerCells.charAt(initialCalls.length)}` + (endLine + 9);
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

import * as ExcelJS from 'exceljs';
import type { PayrollDetail, Office } from '../pages/interface/payroll.types';
import { exportExcel } from '@/utils/excelGenerate/utils/excelTools';
import { formatAmountMoneyPEN } from '@/utils/tools';
import { formatDateNoZeroUtc } from '@/utils/dayjsSpanish';

interface GeneratePayRollProps {
  salary: PayrollDetail;
}

export async function generatePayRoll({ salary }: GeneratePayRollProps) {
  const response = await fetch('/src/utils/planilla/model.xlsx');
  const buffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const wk = workbook.getWorksheet('Hoja1');
  const moneyFormat =
    '_-"S/"* #,##0.00_-;-"S/"* #,##0.00_-;_-"S/"* "-"??_-;_-@_-';
  let rowNumber = 16;
  let accum = 0;
  if (!wk) return;
  wk.getCell('K5').value = `${salary.name}`;
  wk.getCell('O6').value = `${formatDateNoZeroUtc(salary.createdAt)}`;

  salary.offices.forEach((office: Office) => {
    const mergeRange = `B${rowNumber}:O${rowNumber}`;
    wk.mergeCells(mergeRange);
    const officeRow = wk.getRow(rowNumber);
    officeRow.getCell(2).value = office.name;
    officeRow.getCell(2).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    officeRow.getCell(2).font = { bold: true };
    rowNumber++;
    const letters = [
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
      'H',
      'J',
      'K',
      'L',
      'M',
      'N',
      'O',
    ];
    office.payMessages.forEach(payMessage => {
      const userProfile = payMessage.userInit?.user?.profile;
      if (userProfile) {
        const userName = `${userProfile.firstName} ${userProfile.lastName}`;
        payMessage.reports.forEach((report, index) => {
          const profileRow = wk.insertRow(rowNumber, [
            null,
            index + 1,
            userName,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            report.price,
          ]);
          profileRow.getCell('K').numFmt = moneyFormat;
          letters.forEach((letter, index) => {
            profileRow.getCell(letter).border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };

            profileRow.alignment = { vertical: 'middle', horizontal: 'center' };
            profileRow.height = 50;
            accum = index + 1;
          });
          rowNumber++;
        });
      }
    });
    rowNumber++;
  });
  wk.getCell(`J${rowNumber}`).value = `TOTAL: `;
  wk.getCell(`K${rowNumber}`).numFmt = moneyFormat;
  wk.getCell(`K${rowNumber}`).value = `${formatAmountMoneyPEN(salary.total)}`;
  wk.getCell(`K${rowNumber}`).font = { bold: true };
  const endLine = rowNumber + accum;
  wk.pageSetup.printArea = 'B1:O' + endLine;
  exportExcel(`${salary.name}`, workbook);
}

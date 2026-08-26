import * as ExcelJS from 'exceljs';
import {
  borderExcelStyleWithNumber,
  exportExcel,
  fontExcelStyle,
  moneyFormat,
} from '@/utils/excelGenerate/utils/excelTools';
import { transformNomenclature } from '@/utils/tools';
import type { Contract } from '@/types/types';
import type { ContractSpecialties } from '../models/type.contracts';

interface excelProfessionalContractProp {
  contract: Contract;
  contractSpecialities: ContractSpecialties[];
}

const excelProfessionalContract = async ({
  contract,
  contractSpecialities,
}: excelProfessionalContractProp) => {
  const response = await fetch('/templates/professionalContract.xlsx');
  const buffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const wk2 = workbook.getWorksheet('Hoja2');

  const contractSpecialitiesRerverse = [...contractSpecialities].reverse();
  if (!wk2) return;

  wk2.getCell('B3').value = contract.projectName;
  wk2.getCell('B2').value = transformNomenclature(contract.name);
  let rowNumberWk2 = 6;

  contractSpecialitiesRerverse.forEach(({ listSpecialties, specialists }) => {
    const row = wk2.insertRow(rowNumberWk2, [
      null,
      listSpecialties.name,
      (
        (specialists?.firstName ?? '') +
        ' ' +
        (specialists?.lastName ?? '')
      ).toUpperCase(),
      0,
      null,
      null,
    ]);
    row.numFmt = moneyFormat;
    row.height = 42.5;
    fontExcelStyle({
      row: row,
      positions: 'BC',
      color: '000000',
      isBold: true,
      size: 12,
      name: 'Calibri',
    });
    borderExcelStyleWithNumber({
      row: row,
      initPosition: 2,
      finishPosition: 6,
      border: {
        bottom: { style: 'medium', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
      },
    });
  });
  const endLine2 = rowNumberWk2 + 1;

  const sumTotalCell = 'D' + (rowNumberWk2 + 2);

  wk2.getCell(sumTotalCell).value = {
    formula: `SUM(D6:D${endLine2})`,
    date1904: false,
  };
  wk2.getCell(sumTotalCell).numFmt = moneyFormat;

  const wk = workbook.getWorksheet('Hoja1');
  if (!wk) return;

  wk.getCell('B4').value = transformNomenclature(contract.name);
  wk.getCell('B5').value = contract.projectName;
  wk.getCell('B3').value = contract.municipality;
  wk.getCell('B2').value =
    (contract?.consortium?.name ? 'CONSORCIO ' : '') +
    (contract?.consortium?.name || contract?.company?.name).toUpperCase();

  let rowNumberWk = 8;

  contractSpecialitiesRerverse.forEach(({ listSpecialties, specialists }) => {
    const row = wk.insertRow(rowNumberWk, [
      null,
      listSpecialties.name,
      (
        (specialists?.firstName ?? '') +
        ' ' +
        (specialists?.lastName ?? '')
      ).toUpperCase(),
      (specialists?.tuition ?? '') + ': ' + (specialists?.inscription ?? ''),
    ]);
    row.height = 22.5;
    fontExcelStyle({
      row: row,
      positions: 'BCD',
      color: '000000',
      isBold: true,
      size: 12,
      name: 'Calibri',
    });
    borderExcelStyleWithNumber({
      row: row,
      initPosition: 2,
      finishPosition: 4,
      border: {
        bottom: { style: 'medium', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
      },
    });
  });
  const endLine = rowNumberWk;
  const rowManager = wk.getCell('C' + (endLine + 11));
  rowManager.value =
    (contract?.company?.manager as string) || contract?.consortium?.manager;
  rowManager.font = {
    color: { argb: '000000' },
    bold: true,
    size: 12,
    name: 'Calibri',
  };
  exportExcel('Lista de profesionales - planilla', workbook);
};

export { excelProfessionalContract };

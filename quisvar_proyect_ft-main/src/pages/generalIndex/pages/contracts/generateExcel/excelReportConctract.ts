import * as ExcelJS from 'exceljs';
import {
  borderExcelStyleWithNumber,
  exportExcel,
  fillContractStyleWithNumber,
  fontExcelStyle,
  formatExcelStyleOtherSeparation,
  mergeCellRange,
  mergeCellRangeWithRow,
  moneyFormat,
} from '@/utils/excelGenerate/utils/excelTools';
import type { Contract, ContractIndexData } from '@/types/types';
import type { PhaseData } from '../pages/detailsContracts/models/type';
import dayjsSpanish, { formatDateUtc } from '@/utils/dayjsSpanish';
import { parseContractIndex, parseContractPhases } from '../utils/tools';

const excelContractReport = async (contracts: Contract[]) => {
  const response = await fetch('/templates/report_template_contract_V2.xlsx');
  const buffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const wk = workbook.getWorksheet('CUADRO GENERALIZADO');
  if (!wk) return;
  let rowNumber = 2;
  let rowNumber2 = 3;

  contracts.forEach(contract => {
    const contractIndex: ContractIndexData[] = parseContractIndex(
      contract?.indexContract
    );
    const phaseLevel = contractIndex[1]?.nextLevel?.[1]?.nextLevel;
    const payLevel = contractIndex[1]?.nextLevel?.[0]?.nextLevel;

    const phases: PhaseData[] = parseContractPhases(contract.phases);
    const payData = phases
      .map(pha => pha.payData)
      .flat()
      .filter(pha => pha);
    const phasesColorFill = phases.map(phase => {
      const findPhaseLevel = phaseLevel?.find(
        pha => pha.deliverLettersId === phase.id
      );

      return [
        findPhaseLevel?.hasFile === 'yes' ? 'FF92D050' : '',
        findPhaseLevel?.hasFile === 'no' ? 'FFFF0000' : '',
      ];
    });
    const payColorFill = payData?.map(pay => {
      const finPaylevel = payLevel?.find(
        paylvl => paylvl.deliverLettersId === pay.id
      );

      return [
        finPaylevel?.hasFile === 'yes' ? 'FF92D050' : '',
        finPaylevel?.hasFile === 'no' ? 'FFFF0000' : '',
      ];
    });

    const transformPayData = payData.map(pay => [pay?.amount || 0, 'SI', 'NO']);
    const transformPhases = phases.map(phase => [
      formatDateUtc(
        dayjsSpanish(contract.createdAt).add(phase.realDay ?? 0, 'days')
      ),
      'SI',
      'NO',
    ]);
    const phaseFlat = transformPhases.flat();
    const newPhaseArray = phaseFlat.concat(
      new Array(15 - phaseFlat.length).fill('-')
    );
    const row = wk.insertRow(rowNumber, [
      null,
      null,
      null,
      null,
      formatDateUtc(contract.createdAt),
      ...newPhaseArray,
      ...transformPayData.flat(),
    ]);

    fillContractStyleWithNumber({
      row,
      arrColor: phasesColorFill,
      initPosition: 7,
    });
    fillContractStyleWithNumber({
      row,
      arrColor: payColorFill,
      initPosition: 22,
    });
    formatExcelStyleOtherSeparation({
      row,
      positions: 'U,X,AA,AD,AG',
      format: moneyFormat,
    });
    row.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    row.font = { size: 8, bold: true };
    const transformPhases2 = phases.map(phase => [
      phase.description,
      phase.name,
      null,
    ]);
    row.getCell('A').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };
    borderExcelStyleWithNumber({
      row,
      initPosition: 5,
      finishPosition: 36,
      border: {
        right: { style: 'thin', color: { argb: 'FF4472C4' } },
      },
    });
    const phaseFlat2 = transformPhases2.flat();
    const newPhaseArray2 = phaseFlat2.concat(
      new Array(15 - phaseFlat2.length).fill('-')
    );
    borderExcelStyleWithNumber({
      row,
      initPosition: 7,
      finishPosition: 36,
      border: {
        right: { style: 'thin', color: { argb: 'FF4472C4' } },
        bottom: { style: 'thin', color: { argb: 'FF4472C4' } },
      },
      counter: 3,
    });
    const transformPayData2 = payData.map(pay => [
      pay?.description,
      pay?.name,
      null,
    ]);
    const lastDay = phases.pop();
    const row2 = wk.insertRow(rowNumber2, [
      contract.name,
      contract.district,
      contract.details,
      'S/. ' + contract.amount,
      `Plazo a ejecutarse ${lastDay?.realDay ?? '0'} dias calendario`,
      ...newPhaseArray2,
      ...transformPayData2.flat(),
    ]);

    mergeCellRange({
      wk,
      positions: 'ABCD',
      rowNumber,
      rowNumber2,
    });
    row2.height = 54.75;
    mergeCellRangeWithRow({
      wk,
      rowNumber: rowNumber2,
      positions: 'G-H,J-K,M-N,P-Q,S-T,V-W,Y-Z,AB-AC,AE-AF,AH-AI',
    });
    row2.getCell('A').value = contract.contractNumber;
    row2.getCell('B').value = contract.district;
    row2.getCell('C').value = contract.projectName;
    row2.getCell('D').value = contract.amount;
    row2.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    row2.font = { size: 8 };
    row2.getCell('A').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };
    fontExcelStyle({
      isBold: true,
      positions: 'AD',
      color: '0000000',
      name: 'Calibri',
      row: row2,
      size: 8,
    });

    borderExcelStyleWithNumber({
      row: row2,
      initPosition: 1,
      finishPosition: 36,
      border: {
        bottom: { style: 'medium', color: { argb: 'FF4472C4' } },
        right: { style: 'thin', color: { argb: 'FF4472C4' } },
      },
    });
    rowNumber += 2;
    rowNumber2 += 2;
  });

  exportExcel('project-report', workbook);
};

export { excelContractReport };

import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'node:fs';
import AppError from '@/utils/appError';

export const FOLIATION_POSITIONS = [
  'TOP_RIGHT',
  'TOP_LEFT',
  'BOTTOM_RIGHT',
  'BOTTOM_LEFT',
] as const;

export type FoliationPosition = (typeof FOLIATION_POSITIONS)[number];

export type FoliationConfig = {
  position: FoliationPosition;
  marginX: number;
  marginY: number;
};

export type FoliationStampEntry = {
  pageNumber: number;
  folioText: string;
  pageIndexInFile: number;
  sourcePath: string;
  pageSize: string;
};

const DEFAULT_FOLIATION_CONFIG: FoliationConfig = {
  position: 'TOP_RIGHT',
  marginX: 10,
  marginY: 10,
};

const MM_TO_POINTS = 2.83465;

const ISO_PAGE_SIZES_MM = [
  { name: 'A0', width: 841, height: 1189 },
  { name: 'A1', width: 594, height: 841 },
  { name: 'A2', width: 420, height: 594 },
  { name: 'A3', width: 297, height: 420 },
  { name: 'A4', width: 210, height: 297 },
];

export const classifyPageSize = (widthPt: number, heightPt: number) => {
  const shortSideMm = Math.min(widthPt, heightPt) / MM_TO_POINTS;
  const longSideMm = Math.max(widthPt, heightPt) / MM_TO_POINTS;
  const toleranceMm = 6;
  const match = ISO_PAGE_SIZES_MM.find(
    size =>
      Math.abs(shortSideMm - size.width) <= toleranceMm &&
      Math.abs(longSideMm - size.height) <= toleranceMm
  );
  return match?.name ?? 'OTRO';
};

const normalizeRotation = (rotation: number) => {
  const normalized = ((rotation % 360) + 360) % 360;
  if ([0, 90, 180, 270].includes(normalized)) return normalized;
  throw new AppError(
    'La rotación de una página debe ser 0, 90, 180 o 270 grados.',
    422,
    'EXPEDIENTE_INVALID_PAGE_ROTATION'
  );
};

const parseMargin = (value: unknown, field: string) => {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 200
  ) {
    throw new AppError(
      `${field} debe ser un entero entre 0 y 200 milímetros.`,
      400,
      'EXPEDIENTE_INVALID_FOLIATION_CONFIG'
    );
  }
  return value;
};

const visualToPdfCoordinates = (
  visualX: number,
  visualY: number,
  cropBox: { x: number; y: number; width: number; height: number },
  rotation: number
) => {
  const { x, y, width, height } = cropBox;
  if (rotation === 0) return { x: x + visualX, y: y + visualY };
  if (rotation === 90) return { x: x + width - visualY, y: y + visualX };
  if (rotation === 180)
    return { x: x + width - visualX, y: y + height - visualY };
  return { x: x + visualY, y: y + height - visualX };
};

export const getFolioTextPlacement = (
  cropBox: { x: number; y: number; width: number; height: number },
  pageRotation: number,
  position: FoliationPosition,
  marginXPt: number,
  marginYPt: number,
  textWidth: number,
  fontSize: number
) => {
  const rotation = normalizeRotation(pageRotation);
  const visualWidth =
    rotation === 90 || rotation === 270 ? cropBox.height : cropBox.width;
  const visualHeight =
    rotation === 90 || rotation === 270 ? cropBox.width : cropBox.height;
  const isRight = position === 'TOP_RIGHT' || position === 'BOTTOM_RIGHT';
  const isTop = position === 'TOP_RIGHT' || position === 'TOP_LEFT';
  const visualX = isRight ? visualWidth - marginXPt - textWidth : marginXPt;
  const visualY = isTop
    ? visualHeight - marginYPt - fontSize
    : marginYPt;
  return {
    ...visualToPdfCoordinates(visualX, visualY, cropBox, rotation),
    rotation,
  };
};

const isFoliationPosition = (value: unknown): value is FoliationPosition =>
  typeof value === 'string' &&
  FOLIATION_POSITIONS.includes(value as FoliationPosition);

export class FoliationServices {
  static parseConfig(input: Partial<FoliationConfig>): FoliationConfig {
    const position = input.position ?? DEFAULT_FOLIATION_CONFIG.position;
    if (!isFoliationPosition(position)) {
      throw new AppError(
        `position debe ser uno de: ${FOLIATION_POSITIONS.join(', ')}.`,
        400,
        'EXPEDIENTE_INVALID_FOLIATION_CONFIG'
      );
    }
    return {
      position,
      marginX: parseMargin(
        input.marginX ?? DEFAULT_FOLIATION_CONFIG.marginX,
        'marginX'
      ),
      marginY: parseMargin(
        input.marginY ?? DEFAULT_FOLIATION_CONFIG.marginY,
        'marginY'
      ),
    };
  }

  static async applyFoliation(
    paths: readonly string[],
    config: FoliationConfig
  ): Promise<FoliationStampEntry[]> {
    const marginXPt = config.marginX * MM_TO_POINTS;
    const marginYPt = config.marginY * MM_TO_POINTS;
    let totalPages = 0;

    for (const pdfPath of paths) {
      const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfPath), {
        ignoreEncryption: true,
      });
      totalPages += pdfDoc.getPageCount();
    }

    let currentPageNumber = totalPages;
    let ascendingPosition = 0;
    const entries: FoliationStampEntry[] = [];

    for (const pdfPath of paths) {
      const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfPath), {
        ignoreEncryption: true,
      });
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      for (const [pageIndexInFile, page] of pdfDoc.getPages().entries()) {
        ascendingPosition += 1;
        const cropBox = page.getCropBox();
        const folioText = String(currentPageNumber).padStart(5, '0');
        const fontSize = 14;
        const placement = getFolioTextPlacement(
          cropBox,
          page.getRotation().angle,
          config.position,
          marginXPt,
          marginYPt,
          font.widthOfTextAtSize(folioText, fontSize),
          fontSize
        );
        page.drawText(folioText, {
          x: placement.x,
          y: placement.y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
          rotate: degrees(placement.rotation),
        });
        entries.push({
          pageNumber: ascendingPosition,
          folioText,
          pageIndexInFile,
          sourcePath: pdfPath,
          pageSize: classifyPageSize(cropBox.width, cropBox.height),
        });
        currentPageNumber -= 1;
      }

      fs.writeFileSync(pdfPath, await pdfDoc.save());
    }

    return entries;
  }
}

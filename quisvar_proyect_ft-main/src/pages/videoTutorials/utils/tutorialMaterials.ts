export const MAX_TUTORIAL_MATERIALS = 15;
export const MAX_TUTORIAL_MATERIALS_TOTAL_BYTES = 2 * 1024 * 1024 * 1024;

const STANDARD_MAX_BYTES = 500 * 1024 * 1024;
const TECHNICAL_MAX_BYTES = 500 * 1024 * 1024;
const ARCHIVE_MAX_BYTES = 1024 * 1024 * 1024;

const STANDARD_EXTENSIONS = new Set([
  'pdf',
  'docx',
  'xlsx',
  'xls',
  'xlsm',
  'csv',
  'txt',
  'pptx',
  'jpg',
  'jpeg',
  'png',
  'webp',
]);
const TECHNICAL_EXTENSIONS = new Set(['dwg', 'dxf', 'xml', 'pkt']);
const ARCHIVE_EXTENSIONS = new Set(['zip', 'rar']);

export const TUTORIAL_MATERIAL_ACCEPT = [
  '.pdf',
  '.docx',
  '.xlsx',
  '.xls',
  '.xlsm',
  '.csv',
  '.txt',
  '.pptx',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.dwg',
  '.dxf',
  '.xml',
  '.pkt',
  '.zip',
  '.rar',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.ms-excel.sheet.macroenabled.12',
  'text/csv',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/vnd.dwg',
  'image/vnd.dxf',
  'application/xml',
  'text/xml',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.rar',
  'application/x-rar-compressed',
].join(',');

export type TutorialMaterialKind =
  | 'document'
  | 'spreadsheet'
  | 'image'
  | 'plan'
  | 'technical'
  | 'archive';

export interface TutorialMaterialSummary {
  name: string;
  sizeBytes: number;
}

export const tutorialMaterialExtension = (filename: string) =>
  filename.split('.').pop()?.toLowerCase() || '';

export const tutorialMaterialKind = (
  filename: string
): TutorialMaterialKind => {
  const extension = tutorialMaterialExtension(filename);
  if (['xlsx', 'xls', 'xlsm', 'csv'].includes(extension)) {
    return 'spreadsheet';
  }
  if (['jpg', 'jpeg', 'png', 'webp'].includes(extension)) return 'image';
  if (['dwg', 'dxf'].includes(extension)) return 'plan';
  if (['xml', 'pkt'].includes(extension)) return 'technical';
  if (['zip', 'rar'].includes(extension)) return 'archive';
  return 'document';
};

export const isMacroEnabledMaterial = (filename: string) =>
  tutorialMaterialExtension(filename) === 'xlsm';

export const formatMaterialSize = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) {
    const value = bytes / (1024 * 1024 * 1024);
    return `${
      Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)
    } GB`;
  }
  if (bytes >= 1024 * 1024) {
    const value = bytes / (1024 * 1024);
    return `${
      Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
    } MB`;
  }
  if (bytes >= 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${bytes} bytes`;
};

const materialLimit = (extension: string) => {
  if (STANDARD_EXTENSIONS.has(extension)) {
    return {
      maxBytes: STANDARD_MAX_BYTES,
      label: 'este tipo de archivo',
    };
  }
  if (TECHNICAL_EXTENSIONS.has(extension)) {
    return {
      maxBytes: TECHNICAL_MAX_BYTES,
      label: 'archivos técnicos',
    };
  }
  if (ARCHIVE_EXTENSIONS.has(extension)) {
    return {
      maxBytes: ARCHIVE_MAX_BYTES,
      label: 'archivos comprimidos',
    };
  }
  return null;
};

export const validateTutorialMaterialSelection = (
  currentFiles: TutorialMaterialSummary[],
  selectedFiles: File[]
) => {
  for (const file of selectedFiles) {
    const extension = tutorialMaterialExtension(file.name);
    const limit = materialLimit(extension);
    if (!limit) {
      return `${file.name}: el formato .${
        extension || 'sin extensión'
      } no está permitido.`;
    }
    if (file.size > limit.maxBytes) {
      return `${file.name} pesa ${formatMaterialSize(
        file.size
      )}. El límite para ${limit.label} es ${formatMaterialSize(
        limit.maxBytes
      )}.`;
    }
  }

  const totalCount = currentFiles.length + selectedFiles.length;
  if (totalCount > MAX_TUTORIAL_MATERIALS) {
    return `El tutorial tendría ${totalCount} archivos. El máximo permitido es ${MAX_TUTORIAL_MATERIALS}.`;
  }

  const totalBytes =
    currentFiles.reduce((sum, file) => sum + file.sizeBytes, 0) +
    selectedFiles.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TUTORIAL_MATERIALS_TOTAL_BYTES) {
    return `Los materiales sumarían ${formatMaterialSize(
      totalBytes
    )}. El máximo acumulado por tutorial es 2 GB.`;
  }

  return null;
};

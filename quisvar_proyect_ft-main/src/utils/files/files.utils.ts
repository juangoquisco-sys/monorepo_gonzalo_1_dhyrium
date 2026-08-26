import type {
  MessageStatus,
  MessageTypeImbox,
  fileMesage,
} from '@/types/types';

export const addFilesList = (fileUploadFiles: File[], newFiles: File[]) => {
  if (!fileUploadFiles) return newFiles;
  const concatFiles = [...fileUploadFiles, ...newFiles];
  const uniqueFiles = Array.from(
    new Set(concatFiles.map(file => file.name))
  ).map(name => concatFiles.find(file => file.name === name)) as File[];
  return uniqueFiles;
};

export const deleteFileOnList = (fileUploadFiles: File[], delFiles: File) => {
  if (fileUploadFiles) {
    const newFiles = Array.from(fileUploadFiles).filter(
      file => file !== delFiles
    );
    if (!newFiles) return;
    return newFiles;
  }
};
export const filterFilesByAttempt = (files: fileMesage[]) => {
  const newFiles = Object.values(countFileByDate(files));
  const keys = Object.keys(countFileByDate(files));
  const data = newFiles.map((files, i) => ({ id: keys[i], files }));
  return data;
};

const countFileByDate = (files: fileMesage[]) => {
  const Obj: { [key: string]: fileMesage[] } = {};
  files.forEach(objeto => {
    const attempt = objeto.attempt;
    if (!attempt) return;
    if (!Obj[attempt]) Obj[attempt] = [];
    Obj[attempt].push(objeto);
  });
  return Obj;
};

type DocumentOption = {
  id: string;
  value: MessageTypeImbox;
  label: string;
};

export const listTypeMsg: DocumentOption[] = [
  { id: 'MEMORANDUM', label: 'Memorandos', value: 'MEMORANDUM' },
  {
    id: 'HOJAS_DE_COORDINACION',
    label: 'Hojas de coordinación',
    value: 'COORDINACION',
  },
  { id: 'INFORMES', label: 'Informes', value: 'INFORME' },
  { id: 'CARTAS', label: 'Cartas', value: 'CARTA' },
  { id: 'OFICIOS', label: 'Oficios', value: 'OFICIO' },
  {
    id: 'ACTAS_REUNION_ORDINARIA',
    label: 'Actas de reunión ordinaria',
    value: 'ACUERDO',
  },
  {
    id: 'ACTAS_REUNION_EXTRAORDINARIA',
    label: 'Actas de reunión extraordinaria',
    value: 'ACUERDO',
  },
  {
    id: 'ACTAS_COORDINACION_INTERNA',
    label: 'Actas de coordinación interna',
    value: 'COORDINACION',
  },
  {
    id: 'ACTAS_COORDINACION_EXTERNA',
    label: 'Actas de coordinación externa',
    value: 'COORDINACION',
  },
  {
    id: 'CERTIFICADOS_TRABAJO_CARGOS_ENTREGA',
    label:
      'Certificados de trabajo emitidos y cargos de entrega',
    value: 'INFORME',
  },
];

export const getMessageTypeFilterId = (
  value?: string | null
): string | undefined => {
  if (!value) return;
  const target = listTypeMsg.find(
    ({ id, value: backendValue }) => id === value || backendValue === value
  );
  return target?.id;
};

export const getMessageTypeFilterValue = (
  value?: string | null
): MessageTypeImbox | undefined => {
  if (!value) return;
  const target = listTypeMsg.find(
    ({ id, value: backendValue }) => id === value || backendValue === value
  );
  return target?.value;
};

export const listStatusMsg: { id: MessageStatus; label: string }[] = [
  { id: 'FINALIZADO', label: 'FINALIZADO' },
  { id: 'GUARDADO', label: 'GUARDADO' },
  { id: 'PROCESO', label: 'PROCESO' },
  { id: 'RECHAZADO', label: 'RECHAZADO' },
  { id: 'POR_PAGAR', label: 'POR PAGAR' },
];

export const radioOptions = [
  { id: 'CARTA', value: 'CARTA' },
  { id: 'INFORME', value: 'INFORME' },
  { id: 'MEMORANDUM', value: 'MEMORANDUM' },
  { id: 'ACUERDO', value: 'ACUERDO' },
  { id: 'OFICIO', value: 'OFICIO' },
  { id: 'COORDINACION', value: 'COORDINACION' },
];

export const holdingOptions = [
  { id: 'true', label: 'POR APROBAR' },
  { id: 'false', label: 'APROBADO' },
];

export const createNameHash = (fileName: string): string => {
  const words = fileName.split(' ');
  const firstLetters = words.map(word => word.charAt(0).toUpperCase());
  return firstLetters.join('');
};

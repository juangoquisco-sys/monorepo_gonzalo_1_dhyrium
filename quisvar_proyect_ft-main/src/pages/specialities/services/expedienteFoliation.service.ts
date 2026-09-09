import { axiosInstance } from '@/services/axiosInstance';
import { downloadBlob } from '@/utils/tools';

export type ExpedienteRootType = 'level' | 'stage';
export type FoliationPosition =
  | 'TOP_RIGHT'
  | 'TOP_LEFT'
  | 'BOTTOM_RIGHT'
  | 'BOTTOM_LEFT';

export type FoliationConfig = {
  position: FoliationPosition;
  marginX: number;
  marginY: number;
};

export type FoliationPageEntry = {
  pageNumber: number;
  folioText: string;
  levelId?: number;
  taskId?: number;
  fileId?: number;
  pageIndexInFile?: number;
  pageSize?: string;
};

export type ExpedienteFoliationStatus =
  | { exists: false }
  | {
      exists: true;
      totalPages: number;
      position: FoliationPosition;
      marginX: number;
      marginY: number;
      generatedAt: string;
      generatedBy?: { firstName: string | null; lastName: string | null };
      pageEntries: FoliationPageEntry[];
    };

const endpoint = (rootType: ExpedienteRootType, rootId: number) =>
  `/expediente-foliation/${rootType}/${rootId}`;

export const getExpedienteFoliationStatus = async (
  rootType: ExpedienteRootType,
  rootId: number
) => {
  const response = await axiosInstance.get<{ foliation: ExpedienteFoliationStatus }>(
    endpoint(rootType, rootId),
    { headers: { noLoader: true } }
  );
  return response.data.foliation;
};

export const generateExpedienteFoliation = async (
  rootType: ExpedienteRootType,
  rootId: number,
  config: FoliationConfig
) => {
  const response = await axiosInstance.post(
    `${endpoint(rootType, rootId)}/generate`,
    undefined,
    { params: config, headers: { noLoader: true } }
  );
  return response.data.foliation;
};

export const downloadExpedienteFoliation = async (
  rootType: ExpedienteRootType,
  rootId: number,
  fileName: string
) => {
  const response = await axiosInstance.get(`${endpoint(rootType, rootId)}/download`, {
    responseType: 'blob',
    headers: { noLoader: true },
  });
  downloadBlob(response.data, fileName);
};

export const reprintExpedientePages = async (
  rootType: ExpedienteRootType,
  rootId: number,
  pageNumbers: number[],
  fileName: string
) => {
  const response = await axiosInstance.post(
    `${endpoint(rootType, rootId)}/reprint`,
    { scope: 'PAGE', pageNumbers },
    { responseType: 'blob', headers: { noLoader: true } }
  );
  downloadBlob(response.data, fileName);
};

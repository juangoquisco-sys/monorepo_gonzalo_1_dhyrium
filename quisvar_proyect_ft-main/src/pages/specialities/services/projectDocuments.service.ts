import { axiosInstance } from '@/services/axiosInstance';
import {
  downloadProgress$,
  type DownloadProgressState,
} from '@/services/sharingSubject';
import { downloadBlob } from '@/utils/tools';
import type { TypeArchiver, TypeLevel } from '../models/projectDocuments.types';

interface ArchiverProps {
  type: TypeArchiver;
  id: number;
  name: string;
  typeLevel: TypeLevel;
  service: string;
  itemLevel: string;
}

export const handleArchiver = async ({
  id,
  name,
  type,
  typeLevel,
  service,
  itemLevel,
}: ArchiverProps) => {
  const query: Record<string, string> = {
    includeFiles: 'true',
    createFiles: 'true',
    reviewFiles: 'true',
    itemLevel,
  };

  if (type !== 'all') query['endsWith'] = '.pdf';
  if (type === 'pdf') query['equal'] = 'true';
  if (type === 'nopdf') query['equal'] = 'false';

  const params = new URLSearchParams(query);
  const res = await axiosInstance.get(`${service}${typeLevel}/${id}`, {
    params,
    responseType: 'blob',
  });
  const filename = name + '.zip';
  downloadBlob(res.data, filename);
};

export const handleMergePdfs = async (
  typeLevel: TypeLevel,
  id: number,
  name: string,
  service: string
): Promise<void> => {
  const downloadId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const fileName = `${name}.pdf`;
  const queryParams = new URLSearchParams({
    createFiles: 'true',
    type: 'UPLOADS',
    createCover: 'true',
    reviewFiles: 'true',
  });
  const setDownloadProgress = (
    status: DownloadProgressState['status'],
    loaded = 0,
    total?: number,
    visible = true
  ) => {
    downloadProgress$.setSubject = {
      id: downloadId,
      fileName,
      loaded,
      total,
      status,
      visible,
    };
  };

  setDownloadProgress('preparing');

  try {
    const res = await axiosInstance.get<Blob>(`${service}${typeLevel}/${id}`, {
      params: queryParams,
      responseType: 'blob',
      headers: { noLoader: true },
      onDownloadProgress: ({ loaded, total }) => {
        setDownloadProgress('downloading', loaded, total);
      },
    });

    downloadBlob(res.data, fileName);
    const fileSize = res.data.size;
    setDownloadProgress('completed', fileSize, fileSize);

    window.setTimeout(() => {
      setDownloadProgress('completed', fileSize, fileSize, false);
    }, 4000);
  } catch (error) {
    setDownloadProgress('error');

    window.setTimeout(() => {
      setDownloadProgress('error', 0, undefined, false);
    }, 6000);
    throw error;
  }
};

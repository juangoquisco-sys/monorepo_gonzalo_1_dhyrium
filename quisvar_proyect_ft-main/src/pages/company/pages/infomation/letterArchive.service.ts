import { axiosInstance } from '@/services/axiosInstance';

export type LetterArchiveDocument = { id: string; displayName: string; originalName: string; mimeType: string; sizeBytes: string };
export type LetterArchiveFolder = { id: string; parentId: string | null; name: string; sortOrder: number; documents: LetterArchiveDocument[]; children: LetterArchiveFolder[] };
export type LetterRecord = { id: string; code: string; type: string; recordType: 'Reciente' | 'Histórica'; date: string; entity: string; location: string; subject: string; status: 'En revisión' | 'Enviada' | 'Respondida' | 'Archivada'; content: string; versionNumber: number; updatedAt: string };
export type LetterRecordVersion = { id: string; versionNumber: number; code: string; date: string; subject: string; content: string; createdAt: string };
export type LetterRecordDetail = { record: LetterRecord; versions: LetterRecordVersion[] };
export type SaveLetterRecordPayload = Omit<LetterRecord, 'id' | 'versionNumber' | 'updatedAt'>;
type LetterArchiveTree = { root: { id: string; companyId: number; documentCode: string }; folders: LetterArchiveFolder[] };

const base = '/letter-archive';
export const resolveLetterArchive = async (companyId: number, documentCode: string) => (await axiosInstance.put(`${base}/companies/${companyId}/documents/${encodeURIComponent(documentCode)}`)).data as { id: string };
export const listLetterRecords = async (companyId: number) => (await axiosInstance.get(`${base}/companies/${companyId}/letters`)).data as { records: LetterRecord[] };
export const getLetterRecord = async (companyId: number, rootId: string) => (await axiosInstance.get(`${base}/companies/${companyId}/letters/${rootId}`)).data as LetterRecordDetail;
export const saveLetterRecord = async (companyId: number, rootId: string, payload: SaveLetterRecordPayload) => (await axiosInstance.put(`${base}/companies/${companyId}/letters/${rootId}`, payload)).data as { record: LetterRecord };
export const restoreLetterRecordVersion = async (companyId: number, rootId: string, versionNumber: number) => (await axiosInstance.post(`${base}/companies/${companyId}/letters/${rootId}/versions/${versionNumber}/restore`)).data as { record: LetterRecord };
export const getLetterArchiveTree = async (rootId: string) => (await axiosInstance.get(`${base}/roots/${rootId}/tree`)).data as LetterArchiveTree;
export const createLetterArchiveFolder = async (rootId: string, name: string, parentId?: string) => (await axiosInstance.post(`${base}/roots/${rootId}/folders`, { name, parentId })).data as LetterArchiveFolder;
export const renameLetterArchiveFolder = async (folderId: string, name: string) => (await axiosInstance.patch(`${base}/folders/${folderId}`, { name })).data as LetterArchiveFolder;
export const duplicateLetterArchiveFolder = async (folderId: string) => (await axiosInstance.post(`${base}/folders/${folderId}/duplicate`)).data as LetterArchiveFolder;
export const deleteLetterArchiveFolder = async (folderId: string) => axiosInstance.delete(`${base}/folders/${folderId}`);
export const moveLetterArchiveFolder = async (folderId: string, direction: 'up' | 'down') => (await axiosInstance.patch(`${base}/folders/${folderId}/move`, { direction })).data as LetterArchiveFolder;
export const uploadLetterArchiveFiles = async (folderId: string, files: FileList) => {
  const data = new FormData();
  Array.from(files).forEach(file => data.append('files', file));
  return axiosInstance.post(`${base}/folders/${folderId}/documents`, data);
};
export const downloadLetterArchiveFile = async (documentId: string, fileName: string) => {
  const response = await axiosInstance.get(`${base}/documents/${documentId}/download`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

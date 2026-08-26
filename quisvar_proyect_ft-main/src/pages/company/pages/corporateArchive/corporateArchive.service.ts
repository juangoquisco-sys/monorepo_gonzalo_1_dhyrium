import { axiosInstance } from '@/services/axiosInstance';
import type {
  ArchiveContents,
  ArchiveEntityKind,
  ArchiveScope,
  ArchiveTreeNode,
} from './corporateArchive.types';
import {
  normalizeCategories,
  normalizeContents,
  normalizeRoot,
  normalizeTree,
  type ArchiveCategory,
  type ArchiveRoot,
} from './corporateArchive.types';

const base = '/corporate-archive';

export const corporateArchiveService = {
  async getCategories(): Promise<ArchiveCategory[]> {
    return normalizeCategories(
      (await axiosInstance.get(`${base}/categories`)).data
    );
  },
  async ensureRoot(
    entityKind: ArchiveEntityKind,
    entityId: string,
    categoryKey: string
  ): Promise<ArchiveRoot> {
    return normalizeRoot(
      (
        await axiosInstance.put(
          `${base}/scopes/${entityKind.toUpperCase()}/${entityId}/categories/${categoryKey}`
        )
      ).data
    );
  },
  async getTree(
    rootId: string,
    includeArchived: boolean,
    signal?: AbortSignal
  ): Promise<ArchiveTreeNode[]> {
    return normalizeTree(
      (
        await axiosInstance.get(`${base}/roots/${rootId}/tree`, {
          params: { includeArchived },
          signal,
        })
      ).data
    );
  },
  async getContents(
    rootId: string,
    params: {
      folderId?: string;
      scope: ArchiveScope;
      includeArchived: boolean;
      q?: string;
    },
    signal?: AbortSignal
  ): Promise<ArchiveContents> {
    return normalizeContents(
      (
        await axiosInstance.get(`${base}/roots/${rootId}/contents`, {
          params: {
            folderId: params.folderId,
            recursive: params.scope === 'recursive',
            includeArchived: params.includeArchived,
            q: params.q || undefined,
          },
          signal,
        })
      ).data
    );
  },
  createFolder: (rootId: string, parentId: string | null, name: string) =>
    axiosInstance.post(`${base}/roots/${rootId}/folders`, { parentId, name }),
  renameFolder: (id: string, name: string) =>
    axiosInstance.patch(`${base}/folders/${id}`, { name }),
  moveFolder: (id: string, targetFolderId: string) =>
    axiosInstance.post(`${base}/folders/${id}/move`, { targetFolderId }),
  archiveFolder: (id: string, restore = false) =>
    axiosInstance.post(
      `${base}/folders/${id}/${restore ? 'restore' : 'archive'}`
    ),
  uploadDocuments: (folderId: string, files: File[]) => {
    const form = new FormData();
    files.forEach(file => form.append('files', file));
    return axiosInstance.post(`${base}/folders/${folderId}/documents`, form);
  },
  downloadDocument: (id: string) =>
    axiosInstance.get(`${base}/documents/${id}/download`, {
      responseType: 'blob',
    }),
  getDocumentVersions: (id: string) =>
    axiosInstance
      .get(`${base}/documents/${id}/versions`)
      .then(response => response.data),
  uploadVersion: (
    id: string,
    file: File,
    expectedCurrentVersionId: string
  ) => {
    const form = new FormData();
    form.append('file', file);
    form.append('expectedCurrentVersionId', expectedCurrentVersionId);
    return axiosInstance.post(`${base}/documents/${id}/versions`, form);
  },
  moveDocument: (id: string, targetFolderId: string) =>
    axiosInstance.post(`${base}/documents/${id}/move`, { targetFolderId }),
  archiveDocument: (id: string, restore = false) =>
    axiosInstance.post(
      `${base}/documents/${id}/${restore ? 'restore' : 'archive'}`
    ),
};

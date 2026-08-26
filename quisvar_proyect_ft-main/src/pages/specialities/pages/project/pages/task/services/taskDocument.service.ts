import type { IEditorData } from '@hufe921/canvas-editor';
import type { JSONContent } from '@tiptap/react';

import { axiosInstance } from '@/services/axiosInstance';

export type TaskDocumentKind = 'subtasks' | 'basictasks';

export interface CanvasTaskDocumentContent {
  type: 'canvas-editor';
  schemaVersion: 1 | 2;
  editorVersion: string;
  data: IEditorData;
  settings?: {
    width?: number;
    height?: number;
    margins?: [number, number, number, number];
    headerTop?: number;
    footerBottom?: number;
    paperDirection?: 'vertical' | 'horizontal';
    pageMode?: 'paging' | 'continuity';
    columns?: {
      count: number;
      gap?: number;
      separator?: boolean;
      separatorColor?: string;
      separatorWidth?: number;
    } | null;
    backgroundColor?: string;
    pageBorder?: {
      color?: string;
      lineWidth?: number;
      disabled?: boolean;
    };
    /** Indica que el encabezado, pie y configuración de página OOXML ya se migraron. */
    docxZonesImported?: boolean;
    docxSourceFileId?: number;
  };
}

export type TaskDocumentContent = JSONContent | CanvasTaskDocumentContent;

export interface TaskDocumentDto {
  id: string;
  taskKind: TaskDocumentKind;
  taskId: number;
  title: string;
  contentJson: TaskDocumentContent;
  contentHtml: string;
  plainText: string;
  revision: number;
  versionNumber: number;
  updatedAt: string;
  updatedBy: {
    id: number;
    name: string;
  };
}

export interface TaskDocumentVersionDto {
  versionNumber: number;
  title: string;
  createdAt: string;
  createdBy: {
    id: number;
    name: string;
  };
}

export interface TaskDocumentFileVersionDto {
  id: string;
  versionNumber: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  source: 'ORIGINAL_IMPORT' | 'WORD_DESKTOP' | 'RESTORE';
  createdAt: string;
  createdBy?: { id: number; name: string };
}

export interface TaskDocumentOfficeCapabilities {
  canonicalFormat: 'DOCX';
  wordDesktop: { available: boolean; secureTransport: boolean };
}

export type TaskDocumentOfficePhase =
  | 'PREPARED'
  | 'CONTACTED'
  | 'LOCKED'
  | 'SAVED'
  | 'CLOSED'
  | 'EXPIRED'
  | 'CONFLICT'
  | 'FAILED';

export interface TaskDocumentOfficeSessionDto {
  id: string;
  binding: {
    documentId: string;
    sourceFileId: number;
  };
  provider: 'WORD_DESKTOP';
  status: 'ACTIVE' | 'SAVED' | 'RELEASED' | 'EXPIRED' | 'CONFLICT' | 'FAILED';
  /**
   * Estado autoritativo del flujo Word/WebDAV. Es opcional durante el
   * despliegue progresivo para seguir leyendo respuestas del contrato legado.
   */
  phase?: TaskDocumentOfficePhase;
  lastActivity?: string | null;
  lastHeartbeatAt?: string | null;
  expiresAt: string;
  hardExpiresAt?: string;
  lockActive?: boolean;
  versionReceipt?: {
    id: string;
    versionNumber: number;
    checksumSha256: string;
    createdAt: string;
  } | null;
  title?: string;
  editor?: {
    id: number;
    name: string;
  };
  version: TaskDocumentFileVersionDto;
  wordDesktop?: {
    launchUri: string;
    secureTransport: boolean;
  };
}

export interface SaveTaskDocumentInput {
  title: string;
  contentJson: CanvasTaskDocumentContent;
  contentHtml: string;
  plainText: string;
  expectedRevision: number | null;
  createVersion: boolean;
}

export const uploadTaskDocumentAsset = async (
  taskKind: TaskDocumentKind,
  taskId: number,
  image: Blob,
  fileName: string
) => {
  const formData = new FormData();
  formData.append('image', image, fileName);
  const { data } = await axiosInstance.post<{ url: string }>(
    `${taskDocumentPath(taskKind, taskId)}/assets`,
    formData,
    { headers: { noLoader: true } }
  );
  return data.url;
};

export interface TaskDocumentPdfPreview {
  data: ArrayBuffer;
  pageCount: number | null;
}

export const createTaskDocumentPdfPreview = async (
  document: Blob,
  fileName: string,
  signal?: AbortSignal
): Promise<TaskDocumentPdfPreview> => {
  const formData = new FormData();
  formData.append('document', document, fileName);
  const response = await axiosInstance.post<ArrayBuffer>(
    '/task-documents/preview/docx-to-pdf',
    formData,
    {
      headers: { noLoader: true },
      responseType: 'arraybuffer',
      signal,
      timeout: 140_000,
    }
  );
  const rawPageCount = Number(response.headers['x-document-page-count']);
  return {
    data: response.data,
    pageCount:
      Number.isSafeInteger(rawPageCount) && rawPageCount > 0
        ? rawPageCount
        : null,
  };
};

const taskDocumentPath = (taskKind: TaskDocumentKind, taskId: number) =>
  `/task-documents/${taskKind}/${taskId}`;

export const getTaskDocument = async (
  taskKind: TaskDocumentKind,
  taskId: number
) => {
  const { data } = await axiosInstance.get<{
    document: TaskDocumentDto | null;
  }>(taskDocumentPath(taskKind, taskId), { headers: { noLoader: true } });
  return data.document;
};

export const saveTaskDocument = async (
  taskKind: TaskDocumentKind,
  taskId: number,
  input: SaveTaskDocumentInput
) => {
  const { data } = await axiosInstance.put<{ document: TaskDocumentDto }>(
    taskDocumentPath(taskKind, taskId),
    input,
    { headers: { noLoader: true } }
  );
  return data.document;
};

export const listTaskDocumentVersions = async (
  taskKind: TaskDocumentKind,
  taskId: number
) => {
  const { data } = await axiosInstance.get<{
    versions: TaskDocumentVersionDto[];
  }>(`${taskDocumentPath(taskKind, taskId)}/versions`, {
    headers: { noLoader: true },
  });
  return data.versions;
};

export const restoreTaskDocumentVersion = async (
  taskKind: TaskDocumentKind,
  taskId: number,
  versionNumber: number,
  expectedRevision: number
) => {
  const { data } = await axiosInstance.post<{ document: TaskDocumentDto }>(
    `${taskDocumentPath(taskKind, taskId)}/versions/${versionNumber}/restore`,
    { expectedRevision },
    { headers: { noLoader: true } }
  );
  return data.document;
};

export const getTaskDocumentOfficeCapabilities = async () => {
  const { data } = await axiosInstance.get<TaskDocumentOfficeCapabilities>(
    '/task-documents/office-capabilities',
    { headers: { noLoader: true } }
  );
  return data;
};

export const createTaskDocumentOfficeSession = async (
  taskKind: TaskDocumentKind,
  taskId: number,
  sourceFileId: number
) => {
  const { data } = await axiosInstance.post<{
    session: TaskDocumentOfficeSessionDto;
  }>(
    `${taskDocumentPath(taskKind, taskId)}/office-sessions`,
    { provider: 'WORD_DESKTOP', sourceFileId },
    { headers: { noLoader: true } }
  );
  return data.session;
};

export const getTaskDocumentOfficeSession = async (sessionId: string) => {
  const { data } = await axiosInstance.get<{
    session: TaskDocumentOfficeSessionDto;
  }>(`/task-documents/office-sessions/${sessionId}`, {
    headers: { noLoader: true },
  });
  return data.session;
};

export const releaseTaskDocumentOfficeSession = async (sessionId: string) => {
  await axiosInstance.delete(`/task-documents/office-sessions/${sessionId}`, {
    headers: { noLoader: true },
  });
};

export const ensureTaskDocumentOriginalVersion = async (
  taskKind: TaskDocumentKind,
  taskId: number,
  sourceFileId: number
) => {
  const { data } = await axiosInstance.post<{
    version: TaskDocumentFileVersionDto;
  }>(
    `${taskDocumentPath(taskKind, taskId)}/file-versions/original`,
    { sourceFileId },
    { headers: { noLoader: true } }
  );
  return data.version;
};

export const listTaskDocumentFileVersions = async (
  taskKind: TaskDocumentKind,
  taskId: number,
  sourceFileId: number
) => {
  const { data } = await axiosInstance.get<{
    versions: TaskDocumentFileVersionDto[];
  }>(`${taskDocumentPath(taskKind, taskId)}/file-versions`, {
    headers: { noLoader: true },
    params: { sourceFileId },
  });
  return data.versions;
};

export const downloadTaskDocumentFileVersion = async (
  taskKind: TaskDocumentKind,
  taskId: number,
  versionNumber: number,
  sourceFileId: number
) => {
  const response = await axiosInstance.get<Blob>(
    `${taskDocumentPath(
      taskKind,
      taskId
    )}/file-versions/${versionNumber}/content`,
    {
      responseType: 'blob',
      headers: { noLoader: true },
      params: { sourceFileId },
    }
  );
  return response.data;
};

export const restoreTaskDocumentFileVersion = async (
  taskKind: TaskDocumentKind,
  taskId: number,
  versionNumber: number,
  sourceFileId: number
) => {
  const { data } = await axiosInstance.post<{
    version: TaskDocumentFileVersionDto;
  }>(
    `${taskDocumentPath(
      taskKind,
      taskId
    )}/file-versions/${versionNumber}/restore`,
    {},
    { headers: { noLoader: true }, params: { sourceFileId } }
  );
  return data.version;
};

export const taskDocumentFileVersionsQueryKey = (
  taskKind: TaskDocumentKind,
  taskId: number,
  sourceFileId: number
) => ['task-document-file-versions', taskKind, taskId, sourceFileId] as const;

export const taskDocumentQueryKey = (
  taskKind: TaskDocumentKind,
  taskId: number
) => ['task-document', taskKind, taskId] as const;

export const taskDocumentVersionsQueryKey = (
  taskKind: TaskDocumentKind,
  taskId: number
) => ['task-document-versions', taskKind, taskId] as const;

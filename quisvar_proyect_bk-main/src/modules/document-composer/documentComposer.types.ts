export type ImageManifestItem = {
  id: string;
  kind: 'image';
  fileKey: string;
  order: number;
};

export type PdfPageManifestItem = {
  id: string;
  kind: 'pdfPage';
  sourceArtifactId: string;
  pageNumber: number;
  order: number;
};

export type DocumentManifestItem = ImageManifestItem | PdfPageManifestItem;

export type DocumentManifest = {
  version: 1;
  items: DocumentManifestItem[];
};

export type ArtifactResponse = {
  id: string;
  name: string;
  originalName: string | null;
  status: string;
  type: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number;
  createdAt: Date;
  expiresAt: Date | null;
  downloadUrl: string;
};

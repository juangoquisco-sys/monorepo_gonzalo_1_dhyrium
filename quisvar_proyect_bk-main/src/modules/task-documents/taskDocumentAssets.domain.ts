const TASK_DOCUMENT_ASSET_MIME_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  emf: 'image/emf',
  wmf: 'image/wmf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
} as const;

const TASK_DOCUMENT_ASSET_EXTENSIONS_BY_MIME: Readonly<Record<string, string>> =
  {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/x-emf': 'emf',
    'image/emf': 'emf',
    'image/x-wmf': 'wmf',
    'image/wmf': 'wmf',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
  };

export const TASK_DOCUMENT_ASSET_FILE_NAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|gif|webp|bmp|emf|wmf|mp4|webm|ogv)$/i;

export const taskDocumentAssetExtension = (mimeType: string) => {
  return TASK_DOCUMENT_ASSET_EXTENSIONS_BY_MIME[mimeType.toLowerCase()];
};

export const taskDocumentAssetContentType = (fileName: string) => {
  if (!TASK_DOCUMENT_ASSET_FILE_NAME_PATTERN.test(fileName)) return null;
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension) return null;
  return (
    TASK_DOCUMENT_ASSET_MIME_TYPES[
      extension as keyof typeof TASK_DOCUMENT_ASSET_MIME_TYPES
    ] ?? null
  );
};

export const isPrivateTaskDocumentUploadPath = (requestPath: string) => {
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(requestPath);
  } catch {
    return true;
  }
  const normalized = decodedPath
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .toLowerCase();
  return (
    normalized === 'task-documents-private' ||
    normalized.startsWith('task-documents-private/') ||
    normalized === 'task-documents' ||
    normalized.startsWith('task-documents/')
  );
};

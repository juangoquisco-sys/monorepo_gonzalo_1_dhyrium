export type ArchiveEntityKind = 'company' | 'consortium';
export type ArchiveScope = 'direct' | 'recursive';

export interface ArchiveCategory {
  key: string;
  label: string;
  description?: string;
}

export interface ArchiveRoot {
  id: string;
  rootFolderId?: string | null;
  name?: string;
}

export interface ArchiveFolder {
  id: string;
  name: string;
  parentId?: string | null;
  archivedAt?: string | null;
  updatedAt?: string;
}

export interface ArchiveDocument {
  id: string;
  name: string;
  currentVersionId?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  version?: number;
  updatedAt?: string;
  archivedAt?: string | null;
}

export interface ArchiveTreeNode extends ArchiveFolder {
  children: ArchiveTreeNode[];
}

export interface ArchiveContents {
  breadcrumbs: ArchiveFolder[];
  folders: ArchiveFolder[];
  documents: ArchiveDocument[];
}

export const normalizeCategories = (data: unknown): ArchiveCategory[] => {
  const source = Array.isArray(data)
    ? data
    : data &&
      typeof data === 'object' &&
      Array.isArray((data as { categories?: unknown[] }).categories)
    ? (data as { categories: unknown[] }).categories
    : [];
  return source.map((entry, index) => {
    const item = entry as Record<string, unknown>;
    const key = String(item.key ?? item.id ?? item.code ?? index);
    return {
      key,
      label: String(item.label ?? item.name ?? item.title ?? key),
      description:
        typeof item.description === 'string' ? item.description : undefined,
    };
  });
};

export const normalizeRoot = (data: unknown): ArchiveRoot => {
  const item = ((data as { root?: unknown })?.root ?? data) as Record<
    string,
    unknown
  >;
  return {
    id: String(item.id ?? item.rootId),
    rootFolderId: item.rootFolderId
      ? String(item.rootFolderId)
      : item.folderId
      ? String(item.folderId)
      : null,
    name: typeof item.name === 'string' ? item.name : undefined,
  };
};

const normalizeFolder = (value: unknown): ArchiveFolder => {
  const item = value as Record<string, unknown>;
  return {
    id: String(item.id),
    name: String(item.name ?? item.title ?? 'Carpeta sin nombre'),
    parentId: item.parentId == null ? null : String(item.parentId),
    archivedAt: typeof item.archivedAt === 'string' ? item.archivedAt : null,
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : undefined,
  };
};

export const normalizeTree = (data: unknown): ArchiveTreeNode[] => {
  const source = Array.isArray(data)
    ? data
    : (data as { tree?: unknown[]; folders?: unknown[] })?.tree ??
      (data as { folders?: unknown[] })?.folders ??
      [];
  return source.map(value => {
    const item = value as Record<string, unknown>;
    return {
      ...normalizeFolder(item),
      children: normalizeTree(item.children ?? []),
    };
  });
};

export const normalizeContents = (data: unknown): ArchiveContents => {
  const item = data as {
    breadcrumbs?: unknown[];
    folders?: unknown[];
    documents?: unknown[];
  };
  const documents = item.documents ?? [];
  return {
    breadcrumbs: (item.breadcrumbs ?? []).map(normalizeFolder),
    folders: (item.folders ?? []).map(normalizeFolder),
    documents: documents.map(value => {
      const file = value as Record<string, unknown>;
      const currentVersion = (file.currentVersion ?? {}) as Record<
        string,
        unknown
      >;
      const sizeValue = file.size ?? file.sizeBytes ?? currentVersion.sizeBytes;
      const versionValue = file.version ?? currentVersion.version;
      return {
        id: String(file.id),
        name: String(
          file.displayName ??
            file.name ??
            file.fileName ??
            currentVersion.originalName ??
            'Documento sin nombre'
        ),
        currentVersionId:
          typeof (file.currentVersionId ?? currentVersion.id) === 'string'
            ? String(file.currentVersionId ?? currentVersion.id)
            : undefined,
        fileName:
          typeof (file.fileName ?? currentVersion.originalName) === 'string'
            ? String(file.fileName ?? currentVersion.originalName)
            : undefined,
        mimeType:
          typeof (file.mimeType ?? currentVersion.mimeType) === 'string'
            ? String(file.mimeType ?? currentVersion.mimeType)
            : undefined,
        size: sizeValue == null ? undefined : Number(sizeValue),
        version: versionValue == null ? undefined : Number(versionValue),
        updatedAt:
          typeof (file.updatedAt ?? currentVersion.createdAt) === 'string'
            ? String(file.updatedAt ?? currentVersion.createdAt)
            : undefined,
        archivedAt:
          typeof file.archivedAt === 'string' ? file.archivedAt : null,
      };
    }),
  };
};

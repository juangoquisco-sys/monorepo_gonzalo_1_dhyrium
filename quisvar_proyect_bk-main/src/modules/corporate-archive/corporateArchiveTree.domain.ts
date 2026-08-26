import AppError from '@/utils/appError';

export type ArchiveFolderNode = {
  id: string;
  parentId: string | null;
  name: string;
  isRoot: boolean;
  archivedAt: Date | null;
};

export const normalizeFolderName = (name: string) =>
  name.trim().replace(/\s+/g, ' ').normalize('NFKC').toLocaleLowerCase('es-PE');

export const buildBreadcrumbs = (
  folders: Pick<ArchiveFolderNode, 'id' | 'parentId' | 'name'>[],
  folderId: string
) => {
  const byId = new Map(folders.map(folder => [folder.id, folder]));
  const breadcrumbs: Array<{ id: string; name: string }> = [];
  let current = byId.get(folderId);
  while (current) {
    breadcrumbs.unshift({ id: current.id, name: current.name });
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return breadcrumbs;
};

export const collectFolderDescendants = (
  folders: Pick<ArchiveFolderNode, 'id' | 'parentId'>[],
  folderId: string
) => {
  const childrenByParent = new Map<string, string[]>();
  for (const folder of folders) {
    if (!folder.parentId) continue;
    const children = childrenByParent.get(folder.parentId) || [];
    children.push(folder.id);
    childrenByParent.set(folder.parentId, children);
  }
  const result: string[] = [];
  const pending = [folderId];
  while (pending.length) {
    const current = pending.pop()!;
    result.push(current);
    pending.push(...(childrenByParent.get(current) || []));
  }
  return result;
};

export const folderIdsForArchiveOperation = (
  folders: Array<{ id: string; archiveOperationId: string | null }>,
  archiveOperationId: string
) =>
  folders
    .filter(folder => folder.archiveOperationId === archiveOperationId)
    .map(folder => folder.id);

export const assertFolderMove = (input: {
  folderId: string;
  targetFolderId: string;
  rootFolderId: string;
  descendantIds: string[];
}) => {
  if (input.folderId === input.rootFolderId)
    throw new AppError(
      'La carpeta raíz no se puede mover.',
      422,
      'ARCHIVE_ROOT_FOLDER_IMMUTABLE'
    );
  if (input.folderId === input.targetFolderId)
    throw new AppError(
      'Seleccione una carpeta destino distinta.',
      422,
      'ARCHIVE_FOLDER_MOVE_INVALID'
    );
  if (input.descendantIds.includes(input.targetFolderId))
    throw new AppError(
      'No se puede mover una carpeta dentro de sí misma.',
      422,
      'ARCHIVE_FOLDER_MOVE_CYCLE'
    );
};

export const buildFolderTree = <TDocument extends { folderId: string }>(
  folders: ArchiveFolderNode[],
  documents: TDocument[]
) => {
  const nodes = new Map<
    string,
    ArchiveFolderNode & { children: unknown[]; documents: TDocument[] }
  >();
  folders.forEach(folder =>
    nodes.set(folder.id, { ...folder, children: [], documents: [] })
  );
  documents.forEach(document =>
    nodes.get(document.folderId)?.documents.push(document)
  );
  const roots: Array<
    ArchiveFolderNode & { children: unknown[]; documents: TDocument[] }
  > = [];
  nodes.forEach(node => {
    if (node.parentId && nodes.has(node.parentId)) {
      (nodes.get(node.parentId)!.children as typeof roots).push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

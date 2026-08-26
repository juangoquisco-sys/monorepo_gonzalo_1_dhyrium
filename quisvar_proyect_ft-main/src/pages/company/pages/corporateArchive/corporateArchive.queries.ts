import { useMutation, useQuery } from '@tanstack/react-query';
import { corporateArchiveService } from './corporateArchive.service';
import type { ArchiveEntityKind, ArchiveScope } from './corporateArchive.types';

export const corporateArchiveKeys = {
  categories: ['corporate-archive', 'categories'] as const,
  root: (
    entityKind: ArchiveEntityKind,
    entityId: string,
    categoryKey: string
  ) =>
    ['corporate-archive', 'root', entityKind, entityId, categoryKey] as const,
  tree: (rootId: string, includeArchived: boolean) =>
    ['corporate-archive', 'tree', rootId, includeArchived] as const,
  contents: (
    rootId: string,
    folderId: string | undefined,
    scope: ArchiveScope,
    includeArchived: boolean,
    q: string
  ) =>
    [
      'corporate-archive',
      'contents',
      rootId,
      folderId,
      scope,
      includeArchived,
      q,
    ] as const,
  documentVersions: (documentId: string) =>
    ['corporate-archive', 'document-versions', documentId] as const,
};

export const useArchiveCategories = () =>
  useQuery({
    queryKey: corporateArchiveKeys.categories,
    queryFn: corporateArchiveService.getCategories,
    staleTime: 5 * 60 * 1000,
  });
export const useArchiveTree = (
  rootId: string | undefined,
  includeArchived: boolean
) =>
  useQuery({
    queryKey: corporateArchiveKeys.tree(rootId ?? '', includeArchived),
    queryFn: ({ signal }) =>
      corporateArchiveService.getTree(rootId!, includeArchived, signal),
    enabled: Boolean(rootId),
  });
export const useArchiveContents = (
  rootId: string | undefined,
  folderId: string | undefined,
  scope: ArchiveScope,
  includeArchived: boolean,
  q: string
) =>
  useQuery({
    queryKey: corporateArchiveKeys.contents(
      rootId ?? '',
      folderId,
      scope,
      includeArchived,
      q
    ),
    queryFn: ({ signal }) =>
      corporateArchiveService.getContents(
        rootId!,
        { folderId, scope, includeArchived, q },
        signal
      ),
    enabled: Boolean(rootId),
  });

export const useEnsureArchiveRoot = (
  entityKind: ArchiveEntityKind,
  entityId: string,
  categoryKey: string
) =>
  useMutation({
    mutationKey: corporateArchiveKeys.root(entityKind, entityId, categoryKey),
    mutationFn: () =>
      corporateArchiveService.ensureRoot(entityKind, entityId, categoryKey),
  });

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  Download,
  FileText,
  FolderPlus,
  History,
  MoreHorizontal,
  Search,
  Upload,
} from 'lucide-react';
import { AppBadge } from '@/components/app-ui/app-badge';
import { AppButton } from '@/components/app-ui/app-button';
import { AppInput } from '@/components/app-ui/app-input';
import { AppPageShell } from '@/components/app-ui/app-page-shell';
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTableRow,
} from '@/components/app-ui/app-table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { openDialog } from '@/utils/dialog';
import { corporateArchiveService } from './corporateArchive.service';
import {
  corporateArchiveKeys,
  useArchiveCategories,
  useArchiveContents,
  useArchiveTree,
  useEnsureArchiveRoot,
} from './corporateArchive.queries';
import type {
  ArchiveDocument,
  ArchiveEntityKind,
  ArchiveFolder,
  ArchiveScope,
} from './corporateArchive.types';
import { ArchiveFolderTree } from './components/ArchiveFolderTree';
import {
  ArchiveConfirmDialog,
  ArchiveMoveDialog,
  ArchiveNameDialog,
  ArchiveUploadDialog,
  ArchiveVersionsDialog,
} from './corporateArchive.dialogs';

const SEARCH_DEBOUNCE_MS = 300;

const entityLabels: Record<ArchiveEntityKind, string> = {
  company: 'Empresa',
  consortium: 'Consorcio',
};
const isEntityKind = (value: string | undefined): value is ArchiveEntityKind =>
  value === 'company' || value === 'consortium';
const formatSize = (size?: number) =>
  size == null
    ? '—'
    : size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(
        new Date(value)
      )
    : '—';

type ArchiveMutationVariables = {
  operation: () => Promise<unknown>;
  documentId?: string;
};

export function CorporateArchive() {
  const { entityKind: routeEntityKind, entityId, folderId } = useParams();
  const entityKind = isEntityKind(routeEntityKind)
    ? routeEntityKind
    : undefined;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const categories = useArchiveCategories();
  const category = searchParams.get('category') ?? '';
  const scope: ArchiveScope =
    searchParams.get('scope') === 'recursive' ? 'recursive' : 'direct';
  const q = searchParams.get('q') ?? '';
  const includeArchived = searchParams.get('archived') === 'true';
  const [searchInput, setSearchInput] = useState({ query: q, value: q });
  const ensureRoot = useEnsureArchiveRoot(
    entityKind ?? 'company',
    entityId ?? '',
    category
  );
  const {
    data: root,
    isError: isEnsureRootError,
    isPending: isEnsuringRoot,
    mutate: ensureArchiveRoot,
    reset: resetEnsureArchiveRoot,
  } = ensureRoot;
  const rootId = root?.id;
  const tree = useArchiveTree(root?.id, includeArchived);
  const contents = useArchiveContents(
    root?.id,
    folderId,
    scope,
    includeArchived,
    q
  );

  const changeParams = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams(current => {
        const next = new URLSearchParams(current);
        Object.entries(updates).forEach(([key, value]) => {
          if (value) next.set(key, value);
          else next.delete(key);
        });
        return next;
      });
    },
    [setSearchParams]
  );

  useEffect(() => {
    if (!category && categories.data?.[0]) {
      setSearchParams(
        current => {
          const next = new URLSearchParams(current);
          next.set('category', categories.data[0].key);
          return next;
        },
        { replace: true }
      );
    }
  }, [categories.data, category, setSearchParams]);

  useEffect(() => {
    if (entityKind && entityId && category) ensureArchiveRoot();
  }, [category, ensureArchiveRoot, entityId, entityKind]);

  useEffect(() => {
    if (root?.rootFolderId && !folderId) {
      navigate(
        `/empresas/archivo/${entityKind}/${entityId}/carpeta/${root.rootFolderId}?${searchParams}`,
        { replace: true }
      );
    }
  }, [
    entityId,
    entityKind,
    folderId,
    navigate,
    root?.rootFolderId,
    searchParams,
  ]);

  const searchDraft = searchInput.query === q ? searchInput.value : q;

  useEffect(() => {
    if (searchInput.query !== q || searchDraft === q) return;

    const timeout = window.setTimeout(() => {
      changeParams({ q: searchDraft || null });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [changeParams, q, searchDraft, searchInput.query]);

  const refresh = useCallback(
    (documentId?: string) => {
      if (!rootId) return;

      void queryClient.invalidateQueries({
        queryKey: ['corporate-archive', 'tree', rootId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['corporate-archive', 'contents', rootId],
      });
      if (documentId) {
        void queryClient.invalidateQueries({
          queryKey: corporateArchiveKeys.documentVersions(documentId),
        });
      }
    },
    [queryClient, rootId]
  );
  const mutation = useMutation({
    mutationFn: ({ operation }: ArchiveMutationVariables) => operation(),
    onSettled: (_data, _error, variables) => refresh(variables.documentId),
  });
  const currentFolderId = folderId ?? root?.rootFolderId ?? undefined;
  const changeCategory = (nextCategory: string) => {
    resetEnsureArchiveRoot();
    const next = new URLSearchParams(searchParams);
    next.set('category', nextCategory);
    navigate(`/empresas/archivo/${entityKind}/${entityId}?${next}`, {
      replace: true,
    });
  };
  const goToFolder = (id: string) =>
    navigate(
      `/empresas/archivo/${entityKind}/${entityId}/carpeta/${id}?${searchParams}`
    );
  const run = (
    title: string,
    children: ReactNode,
    width = 'min(100%, 32rem)'
  ) =>
    openDialog({
      title,
      children,
      width,
      maxHeight: 'min(90vh, 44rem)',
    });
  const askArchive = (
    kind: 'folder' | 'document',
    item: ArchiveFolder | ArchiveDocument
  ) =>
    run(
      item.archivedAt
        ? `Restaurar ${kind === 'folder' ? 'carpeta' : 'documento'}`
        : `Archivar ${kind === 'folder' ? 'carpeta' : 'documento'}`,
      <ArchiveConfirmDialog
        message={
          item.archivedAt
            ? `“${item.name}” volverá a estar disponible.`
            : `“${item.name}” se conservará en el archivo y dejará de mostrarse en la vista activa.`
        }
        confirmLabel={item.archivedAt ? 'Restaurar' : 'Archivar'}
        destructive={!item.archivedAt}
        onConfirm={() =>
          mutation.mutateAsync({
            operation: () =>
              kind === 'folder'
                ? corporateArchiveService.archiveFolder(
                    item.id,
                    Boolean(item.archivedAt)
                  )
                : corporateArchiveService.archiveDocument(
                    item.id,
                    Boolean(item.archivedAt)
                  ),
          })
        }
      />
    );
  const download = async (archiveDocument: ArchiveDocument) => {
    const response = await corporateArchiveService.downloadDocument(
      archiveDocument.id
    );
    const href = URL.createObjectURL(response.data);
    const link = window.document.createElement('a');
    link.href = href;
    link.download = archiveDocument.fileName ?? archiveDocument.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(href));
  };
  const retry = () => {
    void categories.refetch();
    if (entityKind && entityId && category) {
      resetEnsureArchiveRoot();
      ensureArchiveRoot();
    }
    if (root?.id) {
      void tree.refetch();
      void contents.refetch();
    }
  };

  if (!entityKind || !entityId) {
    return (
      <AppPageShell className="p-app-space-page">
        <p className="text-sm text-danger">
          La empresa o consorcio indicado no es válido.
        </p>
      </AppPageShell>
    );
  }

  const loading =
    categories.isLoading ||
    isEnsuringRoot ||
    (Boolean(root?.id && currentFolderId) && contents.isLoading);
  const error =
    categories.isError || isEnsureRootError || tree.isError || contents.isError;
  const hasNoCategories =
    !categories.isLoading && !categories.isError && !categories.data?.length;

  return (
    <AppPageShell className="min-h-full w-full p-4 sm:p-6">
      <div className="mx-auto grid min-w-0 max-w-screen-2xl grid-cols-[minmax(0,1fr)] gap-5">
        <header className="flex w-full min-w-0 flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link
              to="/empresas"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Empresas y consorcios
            </Link>
            <div className="mt-2 flex items-center gap-2">
              <Archive className="size-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Archivo corporativo
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {entityLabels[entityKind]} #{entityId} · Organiza documentos y sus
              versiones.
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-wrap gap-2 lg:w-auto">
            <AppButton
              variant="outline"
              onClick={() =>
                changeParams({ archived: includeArchived ? null : 'true' })
              }
            >
              {includeArchived ? 'Ocultar archivados' : 'Ver archivados'}
            </AppButton>
            <AppButton
              variant="outline"
              disabled={!currentFolderId || mutation.isPending}
              onClick={() =>
                currentFolderId &&
                run(
                  'Nueva carpeta',
                  <ArchiveNameDialog
                    submitLabel="Crear carpeta"
                    onSubmit={name =>
                      mutation.mutateAsync({
                        operation: () =>
                          corporateArchiveService.createFolder(
                            root!.id,
                            currentFolderId,
                            name
                          ),
                      })
                    }
                  />
                )
              }
            >
              <FolderPlus className="size-4" />
              Nueva carpeta
            </AppButton>
            <AppButton
              disabled={!currentFolderId || mutation.isPending}
              onClick={() =>
                currentFolderId &&
                run(
                  'Cargar archivos',
                  <ArchiveUploadDialog
                    onSubmit={files =>
                      mutation.mutateAsync({
                        operation: () =>
                          corporateArchiveService.uploadDocuments(
                            currentFolderId,
                            files
                          ),
                      })
                    }
                  />
                )
              }
            >
              <Upload className="size-4" />
              Cargar archivos
            </AppButton>
          </div>
        </header>
        <Tabs value={category} onValueChange={changeCategory}>
          <TabsList
            className="h-auto max-w-full justify-start overflow-x-auto bg-transparent p-0"
            aria-label="Categorías documentales"
          >
            {categories.data?.map(item => (
              <TabsTrigger
                key={item.key}
                value={item.key}
                className="shrink-0 border-b-2 border-transparent data-active:border-primary data-active:bg-transparent data-active:shadow-none"
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {hasNoCategories ? (
          <section className="rounded-md border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
            No hay categorías documentales disponibles para este archivo.
          </section>
        ) : error ? (
          <section className="rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
            No se pudo cargar el archivo corporativo.{' '}
            <button type="button" className="underline" onClick={retry}>
              Reintentar
            </button>
          </section>
        ) : (
          <div className="grid min-w-0 gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <aside className="rounded-lg border border-border bg-background shadow-app-panel">
              <div className="border-b border-border px-3 py-3">
                <h2 className="text-sm font-semibold">Carpetas</h2>
                <button
                  type="button"
                  className="mt-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    root?.rootFolderId && goToFolder(root.rootFolderId)
                  }
                >
                  Ir a la raíz
                </button>
              </div>
              {tree.isLoading ? (
                <p className="p-4 text-sm text-muted-foreground">
                  Cargando árbol…
                </p>
              ) : (
                <ArchiveFolderTree
                  nodes={tree.data ?? []}
                  selectedFolderId={currentFolderId}
                  onSelect={goToFolder}
                />
              )}
            </aside>
            <main className="min-w-0 rounded-lg border border-border bg-background shadow-app-panel">
              <div className="flex flex-col gap-3 border-b border-border p-4">
                <nav
                  aria-label="Ruta de carpetas"
                  className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm"
                >
                  {(contents.data?.breadcrumbs ?? []).map((crumb, index) => (
                    <span
                      key={crumb.id}
                      className="flex shrink-0 items-center gap-1"
                    >
                      {index > 0 && (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )}
                      <button
                        type="button"
                        className="hover:underline"
                        onClick={() => goToFolder(crumb.id)}
                      >
                        {crumb.name}
                      </button>
                    </span>
                  ))}
                </nav>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <AppButton
                      variant={scope === 'direct' ? 'secondary' : 'ghost'}
                      onClick={() => changeParams({ scope: 'direct' })}
                    >
                      Directo
                    </AppButton>
                    <AppButton
                      variant={scope === 'recursive' ? 'secondary' : 'ghost'}
                      onClick={() => changeParams({ scope: 'recursive' })}
                    >
                      Recursivo
                    </AppButton>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <AppInput
                      aria-label="Buscar en el archivo"
                      placeholder="Buscar por nombre"
                      value={searchDraft}
                      onChange={event =>
                        setSearchInput({ query: q, value: event.target.value })
                      }
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
              {loading ? (
                <p className="p-8 text-sm text-muted-foreground">
                  Cargando contenido…
                </p>
              ) : (
                <ArchiveContent
                  folders={contents.data?.folders ?? []}
                  documents={contents.data?.documents ?? []}
                  searchTerm={q}
                  onClearSearch={() => changeParams({ q: null })}
                  onFolder={goToFolder}
                  onRename={folder =>
                    run(
                      'Renombrar carpeta',
                      <ArchiveNameDialog
                        initialName={folder.name}
                        submitLabel="Guardar"
                        onSubmit={name =>
                          mutation.mutateAsync({
                            operation: () =>
                              corporateArchiveService.renameFolder(
                                folder.id,
                                name
                              ),
                          })
                        }
                      />
                    )
                  }
                  onMoveFolder={folder =>
                    run(
                      'Mover carpeta',
                      <ArchiveMoveDialog
                        tree={tree.data ?? []}
                        currentId={folder.id}
                        onSubmit={targetId =>
                          mutation.mutateAsync({
                            operation: () =>
                              corporateArchiveService.moveFolder(
                                folder.id,
                                targetId
                              ),
                          })
                        }
                      />
                    )
                  }
                  onMoveDocument={document =>
                    run(
                      'Mover documento',
                      <ArchiveMoveDialog
                        tree={tree.data ?? []}
                        currentId={document.id}
                        onSubmit={targetId =>
                          mutation.mutateAsync({
                            operation: () =>
                              corporateArchiveService.moveDocument(
                                document.id,
                                targetId
                              ),
                          })
                        }
                      />
                    )
                  }
                  onArchive={askArchive}
                  onDownload={document =>
                    void download(document).catch(() => undefined)
                  }
                  onVersions={document =>
                    run(
                      'Versiones',
                      <ArchiveVersionsDialog documentId={document.id} />
                    )
                  }
                  onVersion={document =>
                    run(
                      'Cargar nueva versión',
                      <ArchiveUploadDialog
                        versionOf={document.name}
                        onSubmit={files =>
                          mutation.mutateAsync({
                            documentId: document.id,
                            operation: () =>
                              corporateArchiveService.uploadVersion(
                                document.id,
                                files[0],
                                document.currentVersionId!
                              ),
                          })
                        }
                      />
                    )
                  }
                />
              )}
            </main>
          </div>
        )}
      </div>
    </AppPageShell>
  );
}

type ArchiveContentProps = {
  folders: ArchiveFolder[];
  documents: ArchiveDocument[];
  searchTerm: string;
  onClearSearch: () => void;
  onFolder: (id: string) => void;
  onRename: (folder: ArchiveFolder) => void;
  onMoveFolder: (folder: ArchiveFolder) => void;
  onMoveDocument: (document: ArchiveDocument) => void;
  onArchive: (
    kind: 'folder' | 'document',
    item: ArchiveFolder | ArchiveDocument
  ) => void;
  onDownload: (document: ArchiveDocument) => void;
  onVersions: (document: ArchiveDocument) => void;
  onVersion: (document: ArchiveDocument) => void;
};

function ArchiveContent({
  folders,
  documents,
  searchTerm,
  onClearSearch,
  onFolder,
  onRename,
  onMoveFolder,
  onMoveDocument,
  onArchive,
  onDownload,
  onVersions,
  onVersion,
}: ArchiveContentProps) {
  if (!folders.length && !documents.length) {
    const isSearchEmpty = Boolean(searchTerm);
    return (
      <div className="p-10 text-center">
        <Archive className="mx-auto size-8 text-muted-foreground" />
        <h2 className="mt-3 text-base font-semibold">
          {isSearchEmpty
            ? 'No se encontraron coincidencias'
            : 'Esta carpeta está vacía'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSearchEmpty ? (
            <>
              Prueba con otro nombre o{' '}
              <button
                type="button"
                className="underline hover:text-foreground"
                onClick={onClearSearch}
              >
                limpia la búsqueda
              </button>
              .
            </>
          ) : (
            'Crea una subcarpeta o carga documentos para empezar.'
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[calc(100dvh-20rem)] overflow-auto">
      <AppTable>
        <AppTableHeader>
          <AppTableRow>
            <AppTableHead>Nombre</AppTableHead>
            <AppTableHead className="hidden sm:table-cell">Tipo</AppTableHead>
            <AppTableHead className="hidden md:table-cell">
              Actualizado
            </AppTableHead>
            <AppTableHead className="hidden md:table-cell">Tamaño</AppTableHead>
            <AppTableHead aria-label="Acciones" />
          </AppTableRow>
        </AppTableHeader>
        <AppTableBody>
          {folders.map(folder => (
            <AppTableRow key={`folder-${folder.id}`}>
              <AppTableCell>
                <button
                  type="button"
                  onClick={() => onFolder(folder.id)}
                  className="flex min-w-0 items-center gap-2 text-left font-medium hover:underline"
                >
                  <FolderPlus className="size-4 shrink-0 text-warning" />
                  <span className="truncate">{folder.name}</span>
                  {folder.archivedAt && (
                    <AppBadge variant="outline">Archivada</AppBadge>
                  )}
                </button>
              </AppTableCell>
              <AppTableCell className="hidden sm:table-cell">
                Carpeta
              </AppTableCell>
              <AppTableCell className="hidden md:table-cell">
                {formatDate(folder.updatedAt)}
              </AppTableCell>
              <AppTableCell className="hidden md:table-cell">—</AppTableCell>
              <AppTableCell>
                <ItemMenu
                  onRename={() => onRename(folder)}
                  onMove={() => onMoveFolder(folder)}
                  onArchive={() => onArchive('folder', folder)}
                  archived={Boolean(folder.archivedAt)}
                />
              </AppTableCell>
            </AppTableRow>
          ))}
          {documents.map(document => (
            <AppTableRow key={`document-${document.id}`}>
              <AppTableCell>
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="size-4 shrink-0 text-info" />
                  <span className="truncate font-medium">{document.name}</span>
                  {document.version != null && (
                    <AppBadge variant="outline">v{document.version}</AppBadge>
                  )}
                  {document.archivedAt && (
                    <AppBadge variant="outline">Archivado</AppBadge>
                  )}
                </div>
              </AppTableCell>
              <AppTableCell className="hidden sm:table-cell">
                {document.mimeType ?? 'Documento'}
              </AppTableCell>
              <AppTableCell className="hidden md:table-cell">
                {formatDate(document.updatedAt)}
              </AppTableCell>
              <AppTableCell className="hidden md:table-cell">
                {formatSize(document.size)}
              </AppTableCell>
              <AppTableCell>
                <ItemMenu
                  onDownload={() => onDownload(document)}
                  onVersions={() => onVersions(document)}
                  onVersion={
                    document.currentVersionId
                      ? () => onVersion(document)
                      : undefined
                  }
                  onMove={() => onMoveDocument(document)}
                  onArchive={() => onArchive('document', document)}
                  archived={Boolean(document.archivedAt)}
                />
              </AppTableCell>
            </AppTableRow>
          ))}
        </AppTableBody>
      </AppTable>
    </div>
  );
}

type ItemMenuProps = {
  archived: boolean;
  onDownload?: () => void;
  onVersions?: () => void;
  onVersion?: () => void;
  onMove: () => void;
  onRename?: () => void;
  onArchive: () => void;
};

function ItemMenu({
  archived,
  onDownload,
  onVersions,
  onVersion,
  onMove,
  onRename,
  onArchive,
}: ItemMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
          aria-label="Acciones"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!archived && onDownload && (
          <DropdownMenuItem onSelect={onDownload}>
            <Download className="size-4" />
            Descargar
          </DropdownMenuItem>
        )}
        {!archived && onVersions && (
          <DropdownMenuItem onSelect={onVersions}>
            <History className="size-4" />
            Ver versiones
          </DropdownMenuItem>
        )}
        {!archived && onVersion && (
          <DropdownMenuItem onSelect={onVersion}>
            <Upload className="size-4" />
            Nueva versión
          </DropdownMenuItem>
        )}
        {!archived && onRename && (
          <DropdownMenuItem onSelect={onRename}>Renombrar</DropdownMenuItem>
        )}
        {!archived && (
          <DropdownMenuItem onSelect={onMove}>Mover</DropdownMenuItem>
        )}
        {!archived && <DropdownMenuSeparator />}
        <DropdownMenuItem
          variant={archived ? 'default' : 'destructive'}
          onSelect={onArchive}
        >
          {archived ? (
            <ArchiveRestore className="size-4" />
          ) : (
            <Archive className="size-4" />
          )}
          {archived ? 'Restaurar' : 'Archivar'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

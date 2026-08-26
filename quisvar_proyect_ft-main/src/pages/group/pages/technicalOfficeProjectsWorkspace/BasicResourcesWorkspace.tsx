import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  Download,
  FileImage,
  FileText,
  Folder,
  Plus,
  Search,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import type { Level, SubTask } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import {
  createBasicResources,
  deleteBasicResource,
  downloadBasicResource,
  getBasicResources,
} from '../../services/officeMeetings.service';
import type {
  BasicResource,
  BasicResourceTarget,
} from '../../types/officeMeetings.types';

type Target = {
  levelId?: number;
  subTaskId?: number;
  includeDescendants?: boolean;
};
type TreeRow = {
  key: string;
  depth: number;
  kind: 'level' | 'task';
  label: string;
  item?: string | null;
  task?: SubTask;
  target: Target;
  ancestorLevelKeys: string[];
};
type ResourceFilter = 'all' | 'with' | 'empty';
type VisibleResource = {
  resource: BasicResource;
  inheritedFrom?: BasicResourceTarget;
};

const collectRows = (
  level: Level,
  depth = 0,
  ancestorLevelKeys: string[] = []
): TreeRow[] => {
  const levelKey = `level:${level.id}`;
  const levelPath = [...ancestorLevelKeys, levelKey];
  return [
    {
      key: levelKey,
      depth,
      kind: 'level',
      label: level.name,
      item: level.item,
      target: { levelId: level.id },
      ancestorLevelKeys,
    },
    ...(level.subTasks || []).map(task => ({
      key: `task:${task.id}`,
      depth: depth + 1,
      kind: 'task' as const,
      label: task.name,
      item: task.item,
      task,
      target: { subTaskId: task.id },
      ancestorLevelKeys: levelPath,
    })),
    ...(level.nextLevel || []).flatMap(child =>
      collectRows(child, depth + 1, levelPath)
    ),
  ];
};

const descendantRowKeys = (rows: TreeRow[], row: TreeRow) => {
  if (row.kind === 'task') return [];
  const rowIndex = rows.findIndex(candidate => candidate.key === row.key);
  if (rowIndex < 0) return [];

  const keys: string[] = [];
  for (const candidate of rows.slice(rowIndex + 1)) {
    if (candidate.depth <= row.depth) break;
    keys.push(candidate.key);
  }
  return keys;
};

const formatBytes = (value: string) => {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return '—';
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const statusLabel: Record<string, string> = {
  UNRESOLVED: 'Sin resolver',
  PROCESS: 'En proceso',
  INREVIEW: 'En revisión',
  DENIED: 'Observado',
  REVIEWED: 'Revisado',
  DONE: 'Finalizado',
  LIQUIDATION: 'Liquidación',
};

interface BasicResourcesWorkspaceProps {
  unitId: string;
  projectId: number;
  stageId: number;
  tree: Level;
}

const BasicResourcesWorkspace = ({
  unitId,
  projectId,
  stageId,
  tree,
}: BasicResourcesWorkspaceProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<ResourceFilter>('all');
  const [search, setSearch] = useState('');
  const [showChildren, setShowChildren] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set()
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'upload' | 'files'>('upload');
  const [activeTarget, setActiveTarget] = useState<Target | null>(null);
  const [activeResourceKey, setActiveResourceKey] = useState<string | null>(
    null
  );
  const [files, setFiles] = useState<File[]>([]);
  const [includeDescendants, setIncludeDescendants] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const rows = useMemo(() => collectRows(tree), [tree]);
  const resourcesQuery = useQuery({
    queryKey: ['basic-resources', unitId, projectId, stageId],
    queryFn: () => getBasicResources({ unitId, projectId, stageId }),
  });
  const resources = useMemo(
    () => resourcesQuery.data?.resources ?? [],
    [resourcesQuery.data?.resources]
  );
  const resourceEntriesByTarget = useMemo(() => {
    const result = new Map<
      string,
      { resource: BasicResource; target: BasicResourceTarget }[]
    >();
    resources.forEach(resource =>
      resource.targets.forEach(target => {
        const key = target.levelId
          ? `level:${target.levelId}`
          : target.subTaskId
          ? `task:${target.subTaskId}`
          : '';
        if (key) {
          result.set(key, [...(result.get(key) || []), { resource, target }]);
        }
      })
    );
    return result;
  }, [resources]);
  const resourcesByRow = useMemo(() => {
    const result = new Map<string, VisibleResource[]>();
    rows.forEach(row => {
      const byId = new Map<string, VisibleResource>();
      resourceEntriesByTarget.get(row.key)?.forEach(({ resource }) => {
        byId.set(resource.id, { resource });
      });
      [...row.ancestorLevelKeys].reverse().forEach(ancestorKey => {
        resourceEntriesByTarget
          .get(ancestorKey)
          ?.forEach(({ resource, target }) => {
            if (!target.includeDescendants || byId.has(resource.id)) return;
            byId.set(resource.id, { resource, inheritedFrom: target });
          });
      });
      result.set(
        row.key,
        Array.from(byId.values()).sort(
          (left, right) =>
            new Date(right.resource.createdAt).getTime() -
            new Date(left.resource.createdAt).getTime()
        )
      );
    });
    return result;
  }, [resourceEntriesByTarget, rows]);
  const visibleRows = useMemo(
    () =>
      rows.filter(row => {
        if (!showChildren && row.depth > 0) return false;
        const count = resourcesByRow.get(row.key)?.length || 0;
        const text = `${row.item || ''} ${row.label}`.toLocaleLowerCase();
        if (search && !text.includes(search.toLocaleLowerCase())) return false;
        return (
          filter === 'all' || (filter === 'with' ? count > 0 : count === 0)
        );
      }),
    [filter, resourcesByRow, rows, search, showChildren]
  );
  const selectedTargets = useMemo(
    () => rows.filter(row => selectedKeys.has(row.key)).map(row => row.target),
    [rows, selectedKeys]
  );
  const inheritedSelectionKeys = useMemo(() => {
    if (!includeDescendants) return new Set<string>();
    const inherited = new Set<string>();
    rows.forEach(row => {
      if (row.kind === 'level' && selectedKeys.has(row.key)) {
        descendantRowKeys(rows, row).forEach(key => inherited.add(key));
      }
    });
    selectedKeys.forEach(key => inherited.delete(key));
    return inherited;
  }, [includeDescendants, rows, selectedKeys]);
  const canManage = Boolean(resourcesQuery.data?.canManage);
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['basic-resources', unitId, projectId, stageId],
    });
  const uploadMutation = useMutation({
    mutationFn: () =>
      createBasicResources({
        unitId,
        projectId,
        stageId,
        files,
        targets: (activeTarget ? [activeTarget] : selectedTargets).map(
          target => ({
            ...target,
            includeDescendants: Boolean(target.levelId && includeDescendants),
          })
        ),
        title: title || undefined,
        description: description || undefined,
      }),
    onSuccess: () => {
      setFiles([]);
      setTitle('');
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      invalidate();
      setSheetMode('files');
      SnackbarUtilities.success('Recursos cargados.');
    },
    onError: () =>
      SnackbarUtilities.error('No se pudieron cargar los recursos.'),
  });
  const deleteMutation = useMutation({
    mutationFn: (resourceId: string) => deleteBasicResource(unitId, resourceId),
    onSuccess: () => {
      invalidate();
      SnackbarUtilities.success('Recurso eliminado.');
    },
    onError: () => SnackbarUtilities.error('No se pudo eliminar el recurso.'),
  });
  const openUpload = () => {
    if (!selectedTargets.length) {
      SnackbarUtilities.info('Selecciona al menos un nivel o tarea.');
      return;
    }
    setActiveTarget(null);
    setActiveResourceKey(null);
    setIncludeDescendants(true);
    setSheetMode('upload');
    setSheetOpen(true);
  };
  const openFiles = (row: TreeRow) => {
    setActiveTarget(row.target);
    setActiveResourceKey(row.key);
    const hasResources = (resourcesByRow.get(row.key)?.length || 0) > 0;
    if (!hasResources && canManage && row.kind === 'level') {
      setIncludeDescendants(true);
    }
    setSheetMode(hasResources || !canManage ? 'files' : 'upload');
    setSheetOpen(true);
  };
  const toggleRow = (row: TreeRow) => {
    if (row.kind === 'level') setIncludeDescendants(true);
    setSelectedKeys(current => {
      const next = new Set(current);
      if (next.has(row.key)) next.delete(row.key);
      else next.add(row.key);
      return next;
    });
  };
  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files || []);
    if (nextFiles.length > 20) {
      SnackbarUtilities.error('Puedes cargar hasta 20 archivos por vez.');
      setFiles(nextFiles.slice(0, 20));
      return;
    }
    setFiles(nextFiles);
  };
  const handleDownload = async (resource: BasicResource) => {
    try {
      const blob = await downloadBasicResource(unitId, resource.id);
      const objectUrl = globalThis.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = resource.originalName;
      document.body.append(link);
      link.click();
      link.remove();
      globalThis.URL.revokeObjectURL(objectUrl);
    } catch {
      SnackbarUtilities.error('No se pudo descargar el archivo.');
    }
  };
  const activeResources: VisibleResource[] = activeResourceKey
    ? resourcesByRow.get(activeResourceKey) || []
    : resources.map(resource => ({ resource }));
  const uploadTargetsCount = activeTarget ? 1 : selectedTargets.length;
  const firstUploadTarget = activeTarget || selectedTargets[0];

  return (
    <div className="p-1">
      <div className="mb-3 flex flex-col gap-3 rounded-md border border-border bg-card p-3 shadow-app-card lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="w-56 pl-9"
              placeholder="Buscar nivel, tarea o recurso"
            />
          </div>
          {(['all', 'with', 'empty'] as ResourceFilter[]).map(value => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={filter === value ? 'default' : 'outline'}
              onClick={() => setFilter(value)}
            >
              {value === 'all'
                ? 'Todos'
                : value === 'with'
                ? 'Con recursos'
                : 'Sin recursos'}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowChildren(value => !value)}
          >
            <ChevronDown
              className={showChildren ? 'size-4' : 'size-4 -rotate-90'}
            />
            {showChildren ? 'Contraer todo' : 'Expandir todo'}
          </Button>
          {selectedTargets.length ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSelectedKeys(new Set())}
            >
              Limpiar selección ({selectedTargets.length})
            </Button>
          ) : null}
          {canManage ? (
            <Button type="button" size="sm" onClick={openUpload}>
              <Plus size={16} /> Subir recursos
            </Button>
          ) : null}
        </div>
      </div>
      {selectedTargets.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-md border border-info/30 bg-info-muted px-3 py-2 text-sm text-info-foreground">
          <span>
            {selectedTargets.length} destino(s) explícito(s)
            {inheritedSelectionKeys.size
              ? ` · ${inheritedSelectionKeys.size} incluido(s) por herencia`
              : ''}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedKeys(new Set())}
          >
            Limpiar
          </Button>
        </div>
      )}
      <div className="overflow-auto rounded-md border border-border bg-card shadow-app-card">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-3">Nivel / subtarea</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-3 py-3">Responsable</th>
              <th className="px-3 py-3">Última carga</th>
              <th className="px-3 py-3">Recursos básicos</th>
            </tr>
          </thead>
          <tbody>
            {resourcesQuery.isLoading ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-muted-foreground"
                >
                  Cargando recursos…
                </td>
              </tr>
            ) : null}
            {!resourcesQuery.isLoading &&
              visibleRows.map(row => {
                const attached = resourcesByRow.get(row.key) || [];
                const latest = attached[0]?.resource.createdAt;
                const isTask = row.kind === 'task';
                const isInheritedSelection = inheritedSelectionKeys.has(
                  row.key
                );
                return (
                  <tr
                    key={row.key}
                    className="border-t border-border transition-colors duration-150 hover:bg-info-muted/60 hover:shadow-[inset_4px_0_0_hsl(var(--primary))]"
                  >
                    <td className="px-3 py-3">
                      <div
                        className="flex items-center gap-2"
                        style={{ paddingLeft: `${row.depth * 22}px` }}
                      >
                        <Checkbox
                          checked={
                            selectedKeys.has(row.key) || isInheritedSelection
                          }
                          disabled={isInheritedSelection}
                          onCheckedChange={() => toggleRow(row)}
                          aria-label={
                            isInheritedSelection
                              ? `${row.label} incluido por un nivel padre`
                              : `Seleccionar ${row.label}`
                          }
                        />
                        {isTask ? (
                          <span className="size-2 rounded-full bg-success" />
                        ) : (
                          <>
                            <ChevronDown className="size-4 text-primary" />
                            <Folder className="size-4 text-primary" />
                          </>
                        )}
                        <span className="font-mono text-xs font-semibold text-primary">
                          {row.item}
                        </span>
                        <span
                          className={
                            isTask
                              ? 'font-medium text-foreground'
                              : 'font-semibold text-foreground'
                          }
                        >
                          {row.label}
                        </span>
                        {isInheritedSelection ? (
                          <span className="text-xs text-muted-foreground">
                            Incluido por padre
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {isTask ? (
                        <span className="rounded-md border border-border px-2 py-1 text-xs">
                          {statusLabel[row.task?.status || 'UNRESOLVED'] ||
                            'Sin resolver'}
                        </span>
                      ) : (
                        <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                          Nivel
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      —
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {latest
                        ? new Date(latest).toLocaleString('es-PE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex min-h-8 min-w-8 items-center justify-center rounded-full border-2 px-2 text-base font-extrabold transition-colors ${
                            attached.length > 0
                              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                              : attached.length
                              ? 'border-info/30 bg-info-muted text-info-foreground'
                              : 'border-border bg-muted text-foreground'
                          }`}
                          aria-label={`${attached.length} recursos básicos`}
                        >
                          {attached.length}
                        </span>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-primary"
                          onClick={() => openFiles(row)}
                        >
                          {attached.length
                            ? 'Ver recursos'
                            : canManage
                            ? 'Subir'
                            : 'Sin recursos'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            {!resourcesQuery.isLoading && !visibleRows.length ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-muted-foreground"
                >
                  No hay niveles, tareas o recursos que coincidan.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
        >
          <SheetHeader className="border-b border-border p-5">
            <SheetTitle>
              {sheetMode === 'upload'
                ? 'Subir recursos básicos'
                : 'Archivos subidos'}
            </SheetTitle>
            <SheetDescription>
              {sheetMode === 'upload'
                ? `${uploadTargetsCount} destino(s) seleccionado(s).`
                : activeTarget?.levelId
                ? 'Archivos asociados al nivel seleccionado y heredados desde sus padres.'
                : 'Archivos asociados a la tarea seleccionada.'}
            </SheetDescription>
          </SheetHeader>
          <div className="flex gap-2 border-b border-border px-5 py-2">
            <Button
              type="button"
              size="sm"
              variant={sheetMode === 'upload' ? 'secondary' : 'ghost'}
              onClick={() => setSheetMode('upload')}
            >
              Subir archivos
            </Button>
            <Button
              type="button"
              size="sm"
              variant={sheetMode === 'files' ? 'secondary' : 'ghost'}
              onClick={() => setSheetMode('files')}
            >
              Archivos subidos ({activeResources.length})
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-5">
            {sheetMode === 'upload' ? (
              <div className="space-y-4">
                {canManage ? (
                  <>
                    <div className="rounded-lg border-2 border-dashed border-info/40 bg-info-muted/35 p-6 text-center">
                      <UploadCloud className="mx-auto mb-2 size-7 text-info-foreground" />
                      <Label
                        htmlFor="basic-resource-files"
                        className="cursor-pointer font-semibold text-foreground"
                      >
                        Seleccionar archivos
                      </Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Hasta 20 archivos por carga y 2 GB por archivo.
                      </p>
                      <Input
                        ref={fileInputRef}
                        id="basic-resource-files"
                        type="file"
                        multiple
                        className="mt-3"
                        onChange={handleFiles}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {files.length
                        ? `${files.length} archivo(s) listo(s) para cargar.`
                        : 'Aún no seleccionaste archivos.'}
                    </p>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={includeDescendants}
                        disabled={!firstUploadTarget?.levelId}
                        onCheckedChange={value =>
                          setIncludeDescendants(value === true)
                        }
                      />{' '}
                      Incluir descendientes del nivel
                    </label>
                    <div className="space-y-2">
                      <Label htmlFor="basic-resource-title">
                        Título opcional
                      </Label>
                      <Input
                        id="basic-resource-title"
                        value={title}
                        onChange={event => setTitle(event.target.value)}
                        placeholder="Ej. Levantamiento de julio"
                      />
                      <Label htmlFor="basic-resource-description">
                        Descripción opcional
                      </Label>
                      <Textarea
                        id="basic-resource-description"
                        value={description}
                        onChange={event => setDescription(event.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full"
                      disabled={
                        !files.length ||
                        !uploadTargetsCount ||
                        uploadMutation.isPending
                      }
                      onClick={() => uploadMutation.mutate()}
                    >
                      {uploadMutation.isPending
                        ? 'Cargando…'
                        : 'Cargar recursos'}
                    </Button>
                  </>
                ) : (
                  <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Tu oficina tiene acceso de lectura y descarga. La carga la
                    gestiona Laboratorio y Campo.
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activeResources.map(({ resource, inheritedFrom }) => (
                  <article
                    key={resource.id}
                    className="flex items-center gap-3 py-3"
                  >
                    <div className="grid size-10 place-items-center rounded-md bg-info-muted text-info-foreground">
                      {resource.kind === 'PHOTO' ? (
                        <FileImage size={18} />
                      ) : (
                        <FileText size={18} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {resource.originalName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(resource.sizeBytes)} ·{' '}
                        {new Date(resource.createdAt).toLocaleDateString(
                          'es-PE'
                        )}
                      </p>
                      {inheritedFrom ? (
                        <p className="text-xs text-muted-foreground">
                          Heredado desde {inheritedFrom.level?.item || ''}{' '}
                          {inheritedFrom.level?.name || 'un nivel padre'}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Descargar ${resource.originalName}`}
                      onClick={() => handleDownload(resource)}
                    >
                      <Download size={16} />
                    </Button>
                    {canManage && !inheritedFrom ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-danger hover:text-danger"
                        aria-label={`Eliminar ${resource.originalName}`}
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Eliminar ${resource.originalName}?`
                            )
                          )
                            deleteMutation.mutate(resource.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    ) : null}
                  </article>
                ))}
                {!activeResources.length ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No hay recursos en este destino.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default BasicResourcesWorkspace;


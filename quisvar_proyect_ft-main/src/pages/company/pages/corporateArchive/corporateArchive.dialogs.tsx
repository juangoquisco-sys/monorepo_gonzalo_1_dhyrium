import { useMemo, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppButton } from '@/components/app-ui/app-button';
import { AppInput } from '@/components/app-ui/app-input';
import { AppSelect } from '@/components/app-ui/app-select';
import { closeDialog } from '@/utils/dialog';
import type { ArchiveTreeNode } from './corporateArchive.types';
import { flattenArchiveTree } from './corporateArchive.tree';
import { corporateArchiveService } from './corporateArchive.service';

export function ArchiveNameDialog({
  initialName = '',
  label = 'Nombre',
  submitLabel,
  onSubmit,
}: {
  initialName?: string;
  label?: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<unknown>;
}) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError('Ingresa un nombre.');
    setSaving(true);
    setError('');
    try {
      await onSubmit(name.trim());
      closeDialog();
    } catch {
      setError('No se pudo guardar. Inténtalo nuevamente.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-4">
      <AppInput
        autoFocus
        label={label}
        value={name}
        onChange={event => setName(event.target.value)}
        error={error}
        disabled={saving}
      />
      <div className="flex justify-end gap-2">
        <AppButton
          type="button"
          variant="outline"
          onClick={() => closeDialog()}
          disabled={saving}
        >
          Cancelar
        </AppButton>
        <AppButton type="submit" disabled={saving}>
          {saving ? 'Guardando…' : submitLabel}
        </AppButton>
      </div>
    </form>
  );
}

export function ArchiveUploadDialog({
  versionOf,
  onSubmit,
}: {
  versionOf?: string;
  onSubmit: (files: File[]) => Promise<unknown>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!files.length) return setError('Selecciona al menos un archivo.');
    if (versionOf && files.length !== 1)
      return setError('Selecciona un solo archivo para la nueva versión.');
    if (!versionOf && files.length > 20)
      return setError('Puedes cargar como máximo 20 archivos a la vez.');
    setSaving(true);
    setError('');
    try {
      await onSubmit(files);
      closeDialog();
    } catch {
      setError(
        'No se pudieron cargar todos los archivos. Revisa la carpeta y vuelve a intentarlo.'
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-4">
      <AppInput
        label={versionOf ? 'Archivo de nueva versión' : 'Archivos'}
        type="file"
        multiple={!versionOf}
        onChange={event => {
          setFiles(Array.from(event.target.files ?? []));
          setError('');
        }}
        error={error}
        helperText={
          files.length
            ? `${files.length} archivo(s) seleccionado(s)`
            : versionOf
            ? 'Selecciona un solo archivo.'
            : 'Puedes seleccionar hasta 20 archivos.'
        }
        disabled={saving}
      />
      <div className="flex justify-end gap-2">
        <AppButton
          type="button"
          variant="outline"
          onClick={() => closeDialog()}
          disabled={saving}
        >
          Cancelar
        </AppButton>
        <AppButton type="submit" disabled={saving}>
          {saving ? 'Cargando…' : 'Cargar'}
        </AppButton>
      </div>
    </form>
  );
}

export function ArchiveMoveDialog({
  tree,
  currentId,
  onSubmit,
}: {
  tree: ArchiveTreeNode[];
  currentId: string;
  onSubmit: (folderId: string) => Promise<unknown>;
}) {
  const options = useMemo(() => {
    const descendants = (node?: ArchiveTreeNode): string[] =>
      node
        ? node.children.flatMap(child => [child.id, ...descendants(child)])
        : [];
    const excluded = new Set([
      currentId,
      ...descendants(
        flattenArchiveTree(tree).find(node => node.id === currentId)
      ),
    ]);
    return flattenArchiveTree(tree).filter(folder => !excluded.has(folder.id));
  }, [currentId, tree]);
  const [targetFolderId, setTargetFolderId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!targetFolderId) return setError('Selecciona una carpeta de destino.');
    setSaving(true);
    setError('');
    try {
      await onSubmit(targetFolderId);
      closeDialog();
    } catch {
      setError('No se pudo mover el elemento.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-4">
      <AppSelect
        label="Carpeta de destino"
        data={options}
        value={targetFolderId}
        onChange={event => setTargetFolderId(event.target.value)}
        extractValue={folder => folder.id}
        renderTextField={folder => folder.name}
        disabled={saving}
      />
      <p className="text-xs text-danger">{error}</p>
      <div className="flex justify-end gap-2">
        <AppButton
          type="button"
          variant="outline"
          onClick={() => closeDialog()}
          disabled={saving}
        >
          Cancelar
        </AppButton>
        <AppButton type="submit" disabled={saving}>
          {saving ? 'Moviendo…' : 'Mover'}
        </AppButton>
      </div>
    </form>
  );
}

export function ArchiveConfirmDialog({
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
}: {
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<unknown>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const confirm = async () => {
    setSaving(true);
    setError('');
    try {
      await onConfirm();
      closeDialog();
    } catch {
      setError('No se pudo completar la acción.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{message}</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <AppButton
          variant="outline"
          onClick={() => closeDialog()}
          disabled={saving}
        >
          Cancelar
        </AppButton>
        <AppButton
          variant={destructive ? 'danger' : 'primary'}
          onClick={() => void confirm()}
          disabled={saving}
        >
          {saving ? 'Procesando…' : confirmLabel}
        </AppButton>
      </div>
    </div>
  );
}

export function ArchiveVersionsDialog({ documentId }: { documentId: string }) {
  const versions = useQuery({
    queryKey: ['corporate-archive', 'document-versions', documentId],
    queryFn: () => corporateArchiveService.getDocumentVersions(documentId),
  });
  const values = Array.isArray(versions.data)
    ? (versions.data as Record<string, unknown>[])
    : (versions.data as { versions?: Record<string, unknown>[] } | undefined)
        ?.versions ?? [];
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Historial de versiones del documento.
      </p>
      {versions.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando versiones...</p>
      ) : versions.isError ? (
        <p className="text-sm text-danger">
          No se pudieron cargar las versiones.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {values.map((version, index) => (
            <li
              key={String(version.id ?? index)}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className="truncate">
                {String(
                  version.originalName ??
                    version.name ??
                    `Versión ${version.version ?? index + 1}`
                )}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                v{String(version.version ?? index + 1)}
              </span>
            </li>
          ))}
          {!values.length && (
            <li className="px-3 py-4 text-sm text-muted-foreground">
              No hay versiones registradas.
            </li>
          )}
        </ul>
      )}
      <div className="flex justify-end">
        <AppButton variant="outline" onClick={() => closeDialog()}>
          Cerrar
        </AppButton>
      </div>
    </div>
  );
}

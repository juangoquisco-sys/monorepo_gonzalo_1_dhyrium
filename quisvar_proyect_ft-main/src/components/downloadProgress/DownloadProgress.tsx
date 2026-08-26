import { useEffect, useMemo, useState } from 'react';
import {
  downloadProgress$,
  type DownloadProgressState,
} from '@/services/sharingSubject';

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const DownloadProgress = () => {
  const [progress, setProgress] = useState<DownloadProgressState | null>(null);

  useEffect(() => {
    const subscription = downloadProgress$.getSubject.subscribe(next => {
      setProgress(current => {
        if (!next.visible) {
          return current?.id === next.id ? null : current;
        }

        if (!current || current.id === next.id || next.status === 'preparing') {
          return next;
        }

        return current;
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const percentage = useMemo(() => {
    if (!progress?.total || progress.total <= 0) return null;
    return Math.min(100, Math.round((progress.loaded / progress.total) * 100));
  }, [progress]);

  if (!progress) return null;

  const isPreparing = progress.status === 'preparing';
  const isCompleted = progress.status === 'completed';
  const isError = progress.status === 'error';
  const statusText = isPreparing
    ? 'Preparando y uniendo los documentos…'
    : isCompleted
    ? `Descarga lista · ${formatBytes(progress.loaded)}`
    : isError
    ? 'No se pudo completar la descarga.'
    : percentage === null
    ? `${formatBytes(progress.loaded)} descargados`
    : `${formatBytes(progress.loaded)} de ${formatBytes(
        progress.total!
      )} · ${percentage}%`;

  return (
    <aside
      aria-live="polite"
      className="fixed right-5 bottom-5 z-[10000] w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-border bg-background p-4 text-foreground shadow-2xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {isCompleted
              ? 'PDF generado'
              : isError
              ? 'Error al unir PDFs'
              : 'Uniendo PDFs'}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {progress.fileName}
          </p>
        </div>
        {(isCompleted || isError) && (
          <button
            aria-label="Cerrar progreso de descarga"
            className="rounded px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            type="button"
            onClick={() => setProgress(null)}
          >
            ×
          </button>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{statusText}</p>

      {!isCompleted && !isError && (
        <div
          aria-label="Progreso de descarga"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={percentage ?? undefined}
          className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
        >
          <span
            className={`block h-full rounded-full bg-primary transition-[width] duration-200 ${
              percentage === null ? 'w-1/3 animate-pulse' : ''
            }`}
            style={
              percentage === null ? undefined : { width: `${percentage}%` }
            }
          />
        </div>
      )}
    </aside>
  );
};

export default DownloadProgress;

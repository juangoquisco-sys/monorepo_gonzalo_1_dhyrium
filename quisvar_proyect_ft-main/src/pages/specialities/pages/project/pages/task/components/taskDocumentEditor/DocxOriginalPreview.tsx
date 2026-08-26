import { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  LoaderCircle,
  PencilLine,
  TriangleAlert,
} from 'lucide-react';

import { AppButton } from '@/components/app-ui/app-button';
import { createTaskDocumentPdfPreview } from '../../services/taskDocument.service';
import PdfPaginatedPreview from './PdfPaginatedPreview';

interface DocxOriginalPreviewProps {
  file: Blob;
  fileName: string;
  previewKind?: 'CURRENT' | 'ORIGINAL';
  versionNumber?: number;
  wordLaunchDisabledReason?: string;
  wordLaunchHref?: string;
  onEdit?: () => void;
  onShowCurrent?: () => void;
  onWordLaunch?: () => void;
  onPageCountChange?: (pageCount: number) => void;
}

const DocxOriginalPreview = ({
  file,
  fileName,
  previewKind = 'ORIGINAL',
  versionNumber,
  wordLaunchDisabledReason,
  wordLaunchHref,
  onEdit,
  onShowCurrent,
  onWordLaunch,
  onPageCountChange,
}: DocxOriginalPreviewProps) => {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void createTaskDocumentPdfPreview(file, fileName, controller.signal)
      .then(preview => {
        if (controller.signal.aborted) return;
        setPdfData(preview.data);
        if (preview.pageCount) onPageCountChange?.(preview.pageCount);
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        console.error('No se pudo generar la vista paginada del DOCX.', error);
        setState('error');
      });

    return () => controller.abort();
  }, [file, fileName, onPageCountChange]);

  const handleReady = useCallback(() => setState('ready'), []);
  const handlePdfError = useCallback((error: unknown) => {
    console.error('No se pudo representar el PDF paginado.', error);
    setState('error');
  }, []);

  return (
    <div
      className="task-document-editor__original"
      aria-label={`Vista previa no editable de ${fileName}`}
      data-preview-kind={previewKind.toLowerCase()}
      data-testid="dhyrium-writer-readonly-preview"
      role="region"
    >
      <div className="task-document-editor__original-banner">
        <span className="task-document-editor__original-banner-label">
          <FileText />
          <span>
            <strong>
              {previewKind === 'ORIGINAL'
                ? 'Original protegido · solo lectura'
                : `Vista previa · versión vigente v${versionNumber ?? '—'}`}
            </strong>
            <small>No se puede escribir dentro del navegador.</small>
          </span>
        </span>
        <div className="task-document-editor__original-banner-actions">
          {previewKind === 'ORIGINAL' && onShowCurrent && (
            <AppButton size="xs" variant="ghost" onClick={onShowCurrent}>
              Ver versión vigente
            </AppButton>
          )}
          {wordLaunchHref && !wordLaunchDisabledReason ? (
            <AppButton size="xs" variant="outline" asChild>
              <a
                href={wordLaunchHref}
                aria-label="Editar la versión vigente en Microsoft Word"
                title="La edición se realizará en Microsoft Word de escritorio"
                onClick={onWordLaunch}
              >
                <PencilLine /> Editar en Microsoft Word
              </a>
            </AppButton>
          ) : onEdit ? (
            <AppButton size="xs" variant="outline" onClick={onEdit}>
              <PencilLine /> Volver al editor heredado
            </AppButton>
          ) : (
            <AppButton
              size="xs"
              variant="outline"
              disabled
              aria-label={`Editar en Microsoft Word. ${
                wordLaunchDisabledReason ?? 'La sesión todavía no está lista.'
              }`}
              title={
                wordLaunchDisabledReason ?? 'La sesión todavía no está lista.'
              }
            >
              <PencilLine /> Editar en Microsoft Word
            </AppButton>
          )}
        </div>
      </div>
      {state === 'loading' && (
        <div className="task-document-editor__original-state" role="status">
          <LoaderCircle className="animate-spin" /> Preparando maquetación,
          imágenes, tablas y vínculos…
        </div>
      )}
      {state === 'error' && (
        <div
          className="task-document-editor__original-state is-error"
          role="alert"
        >
          <TriangleAlert /> No se pudo generar la vista paginada del documento.
          {onEdit ? (
            <AppButton size="xs" variant="outline" onClick={onEdit}>
              Volver al editor heredado
            </AppButton>
          ) : (
            <AppButton
              size="xs"
              variant="outline"
              disabled
              aria-label={`Abrir Word. ${
                wordLaunchDisabledReason ??
                'Use Abrir en Word en el encabezado.'
              }`}
              title={
                wordLaunchDisabledReason ??
                'Use Abrir en Word en el encabezado para editar.'
              }
            >
              Abrir Word
            </AppButton>
          )}
        </div>
      )}
      <div className="task-document-editor__original-pages">
        {pdfData && state !== 'error' && (
          <PdfPaginatedPreview
            data={pdfData}
            onPageCountChange={onPageCountChange}
            onReady={handleReady}
            onError={handlePdfError}
          />
        )}
      </div>
    </div>
  );
};

export default DocxOriginalPreview;

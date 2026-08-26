import { useState } from 'react';
import {
  ChevronDown20Regular,
  Document20Regular,
  Info20Regular,
  ShieldLock20Regular,
  Warning20Regular,
} from '@fluentui/react-icons';

import { AppButton } from '@/components/app-ui/app-button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { FileTask } from '@/types/types';

interface TaskDocumentEntryProps {
  files: FileTask[];
  selectedFile?: FileTask | null;
  disabledReason?: string;
  onOpenFile: (file: FileTask) => void;
  onUseLegacyEditor: () => void;
}

const fileLabel = (file: FileTask) => file.originalname || file.name;

const TaskDocumentEntry = ({
  files,
  selectedFile,
  disabledReason,
  onOpenFile,
  onUseLegacyEditor,
}: TaskDocumentEntryProps) => {
  const [open, setOpen] = useState(false);
  const triggerLabel = selectedFile
    ? 'Cambiar documento'
    : 'Seleccionar documento';
  const accessibleLabel = disabledReason
    ? `${triggerLabel}. ${disabledReason}`
    : triggerLabel;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <AppButton
          size="xs"
          variant="outline"
          className="max-w-48 shrink-0 gap-1"
          disabled={Boolean(disabledReason)}
          aria-label={accessibleLabel}
          title={disabledReason ?? triggerLabel}
          data-testid="dhyrium-writer-document-select"
        >
          <Document20Regular aria-hidden="true" />
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown20Regular aria-hidden="true" />
        </AppButton>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[min(28rem,calc(100vw-2rem))] p-2"
      >
        <div className="border-b border-border px-2 pb-2">
          <strong className="text-sm text-foreground">
            Documentos Word de la tarea
          </strong>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            El DOCX permanece binario y se edita en Microsoft Word de
            escritorio. Dhyrium conserva el original y sus versiones.
          </p>
        </div>

        <div className="max-h-72 space-y-1 overflow-y-auto py-2">
          {files.length > 0 ? (
            files.map(file => {
              const selected = selectedFile?.id === file.id;
              return (
                <button
                  key={file.id}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selected
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent hover:border-border hover:bg-accent'
                  }`}
                  onClick={() => {
                    setOpen(false);
                    onOpenFile(file);
                  }}
                  aria-current={selected ? 'true' : undefined}
                  aria-label={`Seleccionar ${fileLabel(file)}`}
                  data-testid={`task-document-entry-file-${file.id}`}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                    <Document20Regular aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs text-foreground">
                      {fileLabel(file)}
                    </strong>
                    <span className="block text-[10px] text-muted-foreground">
                      DOCX · Microsoft Word de escritorio
                    </span>
                  </span>
                  {selected && (
                    <span className="text-[10px] font-semibold text-primary">
                      Seleccionado
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <div
              className="flex gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-3"
              role="status"
            >
              <Info20Regular
                className="mt-0.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Esta tarea todavía no tiene un archivo DOCX. Adjunte uno en
                Entregables para prepararlo en Microsoft Word.
              </p>
            </div>
          )}
        </div>

        {files.length > 1 && (
          <div className="mb-2 flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
            <Warning20Regular className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-[10px] leading-4">
              Este corte mantiene un solo DOCX canónico por tarea. Si ya existe
              otro documento vinculado, Dhyrium bloqueará la apertura para
              evitar mezclar archivos o historiales.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border px-2 pt-2">
          <div className="flex min-w-0 items-start gap-2 text-[10px] leading-4 text-muted-foreground">
            <ShieldLock20Regular
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            Canvas solo para contenido heredado; no conserva la fidelidad de un
            DOCX complejo.
          </div>
          <AppButton
            size="xs"
            variant="outline"
            className="shrink-0"
            onClick={() => {
              setOpen(false);
              onUseLegacyEditor();
            }}
            data-testid="open-legacy-document-editor"
          >
            Editor heredado
          </AppButton>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TaskDocumentEntry;

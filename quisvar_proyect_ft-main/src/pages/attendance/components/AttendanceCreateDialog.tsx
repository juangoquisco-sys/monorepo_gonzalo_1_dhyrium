import { useState } from 'react';
import {
  ArrowRight,
  ClipboardPenLine,
  Fingerprint,
  LoaderCircle,
  type LucideIcon,
} from 'lucide-react';
import { AppButton } from '@/components/app-ui/app-button';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import type { DialogHandle } from '@/utils/dialog';
import type { AttendanceCaptureMode } from '../attendance.types';

interface AttendanceCreateDialogProps {
  getDialogHandle: () => DialogHandle | null;
  onCreate: (captureMode: AttendanceCaptureMode) => Promise<boolean>;
}

interface AttendanceModeOption {
  mode: AttendanceCaptureMode;
  title: string;
  detail: string;
  action: string;
  icon: LucideIcon;
  iconClassName: string;
}

const ATTENDANCE_MODE_OPTIONS: AttendanceModeOption[] = [
  {
    mode: 'MANUAL',
    title: 'Lista manual',
    detail: 'Marca el estado de cada persona y guarda la lista al terminar.',
    action: 'Crear lista manual',
    icon: ClipboardPenLine,
    iconClassName: 'bg-muted text-foreground',
  },
  {
    mode: 'BIOMETRIC',
    title: 'Lista con huella',
    detail:
      'Abre la captura ZKTeco; después podrás cerrarla, revisarla y guardarla.',
    action: 'Abrir captura con huella',
    icon: Fingerprint,
    iconClassName: 'bg-primary/10 text-primary',
  },
];

export const AttendanceCreateDialog = ({
  getDialogHandle,
  onCreate,
}: AttendanceCreateDialogProps) => {
  const [creatingMode, setCreatingMode] =
    useState<AttendanceCaptureMode | null>(null);

  const handleCreate = async (captureMode: AttendanceCaptureMode) => {
    const dialogHandle = getDialogHandle();
    dialogHandle?.block('Espere a que termine la creación de la lista.');
    setCreatingMode(captureMode);

    try {
      const created = await onCreate(captureMode);
      if (!created) {
        dialogHandle?.unblock();
        setCreatingMode(null);
        return;
      }
      dialogHandle?.unblock();
      dialogHandle?.close();
    } catch {
      dialogHandle?.unblock();
      setCreatingMode(null);
      SnackbarUtilities.error(
        'No se pudo crear la lista. Verifique si existe otra en curso.'
      );
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3">
        {ATTENDANCE_MODE_OPTIONS.map(option => {
          const Icon = option.icon;
          const isCreating = creatingMode === option.mode;

          return (
            <button
              key={option.mode}
              type="button"
              className="group flex w-full items-start gap-4 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={creatingMode !== null}
              aria-busy={isCreating}
              onClick={() => void handleCreate(option.mode)}
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-lg ${option.iconClassName}`}
                aria-hidden="true"
              >
                {isCreating ? (
                  <LoaderCircle
                    className="animate-spin motion-reduce:animate-none"
                    size={20}
                  />
                ) : (
                  <Icon size={20} />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <strong className="block text-sm font-semibold text-foreground">
                  {option.title}
                </strong>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {option.detail}
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  {isCreating ? 'Creando lista...' : option.action}
                  {isCreating ? null : <ArrowRight size={14} />}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <AppButton
          variant="outline"
          disabled={creatingMode !== null}
          onClick={() => getDialogHandle()?.close()}
        >
          Volver
        </AppButton>
      </div>
    </div>
  );
};

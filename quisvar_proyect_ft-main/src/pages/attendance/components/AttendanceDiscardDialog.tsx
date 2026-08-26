import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AppButton } from '@/components/app-ui/app-button';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import type { DialogHandle } from '@/utils/dialog';

interface AttendanceDiscardDialogProps {
  getDialogHandle: () => DialogHandle | null;
  listLabel: string;
  onDiscard: () => Promise<void>;
}

export const AttendanceDiscardDialog = ({
  getDialogHandle,
  listLabel,
  onDiscard,
}: AttendanceDiscardDialogProps) => {
  const [isDiscarding, setIsDiscarding] = useState(false);

  const handleDiscard = async () => {
    const dialogHandle = getDialogHandle();
    dialogHandle?.block('Espere a que termine el descarte de la lista.');
    setIsDiscarding(true);

    try {
      await onDiscard();
      dialogHandle?.unblock();
      dialogHandle?.close();
    } catch {
      dialogHandle?.unblock();
      setIsDiscarding(false);
      SnackbarUtilities.error('No se pudo descartar la lista.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-danger/30 bg-danger-muted p-4 text-sm text-danger-foreground">
        <div className="flex items-start gap-3">
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0"
          />
          <div className="space-y-1">
            <strong className="block text-foreground">{listLabel}</strong>
            <p>
              Se eliminará la lista en curso y cualquier marcación registrada.
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <AppButton
          variant="outline"
          disabled={isDiscarding}
          onClick={() => getDialogHandle()?.close()}
        >
          Volver
        </AppButton>
        <AppButton
          variant="danger"
          disabled={isDiscarding}
          onClick={() => void handleDiscard()}
        >
          {isDiscarding ? 'Descartando...' : 'Descartar lista'}
        </AppButton>
      </div>
    </div>
  );
};

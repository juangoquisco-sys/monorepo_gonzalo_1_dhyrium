import { useState } from 'react';
import { AppButton } from '@/components/app-ui/app-button';
import { Textarea } from '@/components/ui/textarea';
import type { DialogHandle } from '@/utils/dialog';

export const AttendanceCorrectionReasonDialog = ({
  getDialogHandle,
  userName,
  onConfirm,
}: {
  getDialogHandle: () => DialogHandle | null;
  userName: string;
  onConfirm: (reason: string) => void;
}) => {
  const [reason, setReason] = useState('');
  const normalizedReason = reason.trim();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        La asistencia de <strong className="text-foreground">{userName}</strong>{' '}
        fue validada por huella. Registre por qué se modificará ese resultado.
      </p>
      <div className="space-y-2">
        <label
          className="text-sm font-medium text-foreground"
          htmlFor="attendance-correction-reason"
        >
          Motivo de la corrección
        </label>
        <Textarea
          id="attendance-correction-reason"
          value={reason}
          maxLength={500}
          autoFocus
          onChange={event => setReason(event.target.value)}
          placeholder="Explique brevemente la corrección"
        />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <AppButton variant="outline" onClick={() => getDialogHandle()?.close()}>
          Cancelar
        </AppButton>
        <AppButton
          disabled={!normalizedReason}
          onClick={() => {
            onConfirm(normalizedReason);
            getDialogHandle()?.close();
          }}
        >
          Aplicar corrección
        </AppButton>
      </div>
    </div>
  );
};

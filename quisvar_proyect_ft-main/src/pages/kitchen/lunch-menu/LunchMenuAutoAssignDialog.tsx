import { useState } from 'react';
import { AppButton } from '@/components/app-ui/app-button';
import type { DialogHandle } from '@/utils/dialog';

export type LunchMenuAutoAssignmentPreview = {
  secondName: string;
  assignments: Array<{
    userId: number;
    fullName: string;
    wantsSoup: boolean;
    wantsDessert: boolean;
    wantsRefreshment: boolean;
  }>;
};

type Props = {
  preview: LunchMenuAutoAssignmentPreview;
  soupAvailable: boolean;
  dessertAvailable: boolean;
  refreshmentAvailable: boolean;
  soupLabel: string;
  dessertLabel: string;
  refreshmentLabel: string;
  getDialogHandle: () => DialogHandle | null;
  onConfirm: (assignments: LunchMenuAutoAssignmentPreview['assignments']) => Promise<void>;
};

export default function LunchMenuAutoAssignDialog({
  preview,
  soupAvailable,
  dessertAvailable,
  refreshmentAvailable,
  soupLabel,
  dessertLabel,
  refreshmentLabel,
  getDialogHandle,
  onConfirm,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignments, setAssignments] = useState(preview.assignments);

  const confirm = async () => {
    const dialog = getDialogHandle();
    dialog?.block('Asignando los pedidos propuestos…');
    setIsSubmitting(true);
    try {
      await onConfirm(assignments);
      dialog?.unblock();
      dialog?.close();
    } catch {
      dialog?.unblock();
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Se asignará <strong className="text-foreground">{preview.secondName}</strong>{' '}
        a {assignments.length} personas. La sopa se propone según el historial
        individual; postre y refresco parten en “Sí” y puedes ajustarlos.
      </p>
      <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-border p-2">
        {assignments.map(assignment => (
          <div
            key={assignment.userId}
            className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm"
          >
            <strong className="min-w-0 truncate">{assignment.fullName}</strong>
            <span className="flex shrink-0 flex-wrap gap-2 text-muted-foreground">
              {soupAvailable && <label><input type="checkbox" checked={assignment.wantsSoup} onChange={event => setAssignments(current => current.map(item => item.userId === assignment.userId ? { ...item, wantsSoup: event.target.checked } : item))} /> {soupLabel}</label>}
              {dessertAvailable && <label><input type="checkbox" checked={assignment.wantsDessert} onChange={event => setAssignments(current => current.map(item => item.userId === assignment.userId ? { ...item, wantsDessert: event.target.checked } : item))} /> {dessertLabel}</label>}
              {refreshmentAvailable && <label><input type="checkbox" checked={assignment.wantsRefreshment} onChange={event => setAssignments(current => current.map(item => item.userId === assignment.userId ? { ...item, wantsRefreshment: event.target.checked } : item))} /> {refreshmentLabel}</label>}
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <AppButton
          variant="outline"
          disabled={isSubmitting}
          onClick={() => getDialogHandle()?.close()}
        >
          Cancelar
        </AppButton>
        <AppButton disabled={isSubmitting} onClick={() => void confirm()}>
          {isSubmitting ? 'Asignando…' : 'Confirmar asignaciones'}
        </AppButton>
      </div>
    </div>
  );
}

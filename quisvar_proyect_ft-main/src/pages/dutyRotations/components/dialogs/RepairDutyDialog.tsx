import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import type { DutyDialogHandleGetter } from '../../dutyRotations.dialogs';
import { DutyRotationContractError } from '../../dutyRotations.contract';
import { refetchDutyRotations } from '../../dutyRotations.queries';
import type { ValidDutyRotation } from '../../models/dutyRotations.types';
import { repairDutyRotation } from '../../services/dutyRotations.service';

interface RepairDutyDialogProps {
  duty: ValidDutyRotation;
  getDialogHandle: DutyDialogHandleGetter;
}

const RepairDutyDialog = ({ duty, getDialogHandle }: RepairDutyDialogProps) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => repairDutyRotation(duty.id),
    onSuccess: async result => {
      await refetchDutyRotations(queryClient);
      SnackbarUtilities.success(
        `${result.createdCount} creado(s), ${result.preservedCount} conservado(s), ${result.conflictCount} conflicto(s).`
      );
      getDialogHandle()?.close();
    },
    onError: error => {
      if (error instanceof DutyRotationContractError) {
        SnackbarUtilities.error(error.message);
      }
    },
  });
  return (
    <div className="dutyRotations-statusDialog">
      <div className="dutyRotations-operationalHint">
        <Wrench size={20} />
        <div>
          <strong>Reparar proximos turnos de {duty.name}</strong>
          <span>
            Se usara el mismo reconciliador del mantenimiento diario. No se
            reemplazaran turnos historicos, en curso o ajustados.
          </span>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => getDialogHandle()?.close()}>
          Cancelar
        </Button>
        <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Reparando...' : 'Reparar proximos turnos'}
        </Button>
      </div>
    </div>
  );
};

export default RepairDutyDialog;

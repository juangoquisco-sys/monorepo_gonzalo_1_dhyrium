import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { createUuid } from '@/utils/createUuid';
import type { DutyDialogHandleGetter } from '../../dutyRotations.dialogs';
import { DutyRotationContractError } from '../../dutyRotations.contract';
import {
  dutyRotationQueryKeys,
  refetchDutyRotations,
} from '../../dutyRotations.queries';
import type { DutyRotation } from '../../models/dutyRotations.types';
import {
  previewDutyRotationStatus,
  updateDutyRotationStatus,
} from '../../services/dutyRotations.service';

interface DutyStatusDialogProps {
  duty: DutyRotation;
  getDialogHandle: DutyDialogHandleGetter;
}

const DutyStatusDialog = ({ duty, getDialogHandle }: DutyStatusDialogProps) => {
  const queryClient = useQueryClient();
  const [requestKey] = useState(createUuid);
  const nextStatus = !duty.isActive;
  const configurationVersion = duty.configurationVersion;
  const previewQuery = useQuery({
    queryKey: [...dutyRotationQueryKeys.duties, duty.id, 'status', nextStatus],
    queryFn: () => {
      if (!configurationVersion) {
        throw new Error(
          'La actividad no tiene una versión de configuración válida.'
        );
      }
      return previewDutyRotationStatus(
        duty.id,
        nextStatus,
        configurationVersion
      );
    },
    enabled: Boolean(configurationVersion),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: () => {
      if (!configurationVersion) {
        throw new Error(
          'La actividad no tiene una versión de configuración válida.'
        );
      }
      return updateDutyRotationStatus(
        duty.id,
        nextStatus,
        configurationVersion,
        requestKey
      );
    },
    onSuccess: async () => {
      await refetchDutyRotations(queryClient);
      SnackbarUtilities.success(
        nextStatus
          ? 'Actividad reactivada y reconciliada.'
          : 'Actividad desactivada.'
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
        <AlertTriangle size={20} />
        <div>
          <strong>
            {nextStatus ? 'Reactivar actividad' : 'Desactivar actividad'}
          </strong>
          <span>
            {nextStatus
              ? 'Se crearan solamente las proximas ocurrencias validas.'
              : 'Se detendra la extension automatica y solo se retiraran turnos futuros seguros.'}
          </span>
        </div>
      </div>
      {previewQuery.data && (
        <div className="dutyRotations-impactSummary">
          <span>{previewQuery.data.removableCount} eliminables</span>
          <span>{previewQuery.data.preservedCount} protegidos</span>
          <span>{previewQuery.data.conflictCount} conflictos</span>
        </div>
      )}
      {previewQuery.isError && (
        <p role="alert">
          {previewQuery.error instanceof Error
            ? previewQuery.error.message
            : 'No se pudo previsualizar el cambio de estado.'}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => getDialogHandle()?.close()}>
          Cancelar
        </Button>
        <Button
          disabled={
            !configurationVersion ||
            previewQuery.isLoading ||
            previewQuery.isError ||
            mutation.isPending
          }
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending
            ? 'Aplicando...'
            : nextStatus
            ? 'Reactivar y generar'
            : 'Desactivar actividad'}
        </Button>
      </div>
    </div>
  );
};

export default DutyStatusDialog;

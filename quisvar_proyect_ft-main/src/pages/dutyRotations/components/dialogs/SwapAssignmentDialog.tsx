import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import type { DutyDialogHandleGetter } from '../../dutyRotations.dialogs';
import { DutyRotationContractError } from '../../dutyRotations.contract';
import { refetchDutyRotations } from '../../dutyRotations.queries';
import {
  getDutyParticipantUsers,
  getDutyUserFullName,
} from '../../dutyRotations.utils';
import type { DutyRotationAssignment } from '../../models/dutyRotations.types';
import { createDutySwapRequest } from '../../services/dutyRotations.service';
import AssignmentDialogSummary from './AssignmentDialogSummary';

type SwapMode = 'POOL' | 'PERSON';

interface SwapAssignmentDialogProps {
  assignment: DutyRotationAssignment;
  getDialogHandle: DutyDialogHandleGetter;
}

const SwapAssignmentDialog = ({
  assignment,
  getDialogHandle,
}: SwapAssignmentDialogProps) => {
  const queryClient = useQueryClient();
  const eligibleTargets = useMemo(
    () =>
      getDutyParticipantUsers(assignment.duty).filter(
        user => user.id !== assignment.assignedUserId
      ),
    [assignment.assignedUserId, assignment.duty]
  );
  const [mode, setMode] = useState<SwapMode | null>(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [reason, setReason] = useState('');

  const swapMutation = useMutation({
    mutationFn: () =>
      createDutySwapRequest(assignment.id, {
        targetUserId: mode === 'PERSON' ? Number(targetUserId) : null,
        reason,
      }),
    onSuccess: async () => {
      SnackbarUtilities.success(
        mode === 'POOL'
          ? 'Turno enviado a la bolsa'
          : 'Solicitud de cambio enviada'
      );
      await refetchDutyRotations(queryClient);
      getDialogHandle()?.close();
    },
    onError: error => {
      if (error instanceof DutyRotationContractError) {
        SnackbarUtilities.error(error.message);
      }
    },
  });

  useEffect(() => {
    if (swapMutation.isPending) {
      getDialogHandle()?.block('Espera a que termine la operación');
    } else {
      getDialogHandle()?.unblock();
    }

    return () => {
      getDialogHandle()?.unblock();
    };
  }, [getDialogHandle, swapMutation.isPending]);

  const submitDisabled =
    swapMutation.isPending ||
    mode === null ||
    (mode === 'PERSON' && targetUserId.length === 0);

  return (
    <div className="dutyRotations-assignmentDialogContent">
      <AssignmentDialogSummary assignment={assignment} />

      <fieldset className="dutyRotations-swapModeFieldset">
        <legend>¿Qué quieres hacer con este turno?</legend>
        <div className="dutyRotations-swapChoices">
          <label
            className={`dutyRotations-swapChoice ${
              mode === 'POOL' ? 'is-selected' : ''
            }`}
          >
            <input
              type="radio"
              name="swap-mode"
              value="POOL"
              checked={mode === 'POOL'}
              onChange={() => {
                setMode('POOL');
                setTargetUserId('');
              }}
            />
            <span className="dutyRotations-swapChoiceIcon">
              <Send aria-hidden="true" />
            </span>
            <strong>Enviar a la bolsa</strong>
            <span>
              El turno quedará disponible para que otro participante elegible lo
              reclame.
            </span>
          </label>

          <label
            className={`dutyRotations-swapChoice ${
              mode === 'PERSON' ? 'is-selected' : ''
            }`}
          >
            <input
              type="radio"
              name="swap-mode"
              value="PERSON"
              checked={mode === 'PERSON'}
              disabled={eligibleTargets.length === 0}
              onChange={() => setMode('PERSON')}
            />
            <span className="dutyRotations-swapChoiceIcon">
              <UserRound aria-hidden="true" />
            </span>
            <strong>Proponer a una persona</strong>
            <span>
              La administración revisará la propuesta antes de cambiar al
              responsable.
            </span>
          </label>
        </div>
      </fieldset>

      {mode === 'PERSON' ? (
        <label className="dutyRotations-swapTargetField">
          <span className="dutyRotations-labelLine">
            Participante propuesto
          </span>
          <Select value={targetUserId} onValueChange={setTargetUserId}>
            <SelectTrigger aria-label="Participante propuesto">
              <SelectValue placeholder="Selecciona un participante" />
            </SelectTrigger>
            <SelectContent>
              {eligibleTargets.map(user => (
                <SelectItem key={user.id} value={String(user.id)}>
                  {getDutyUserFullName(user)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="dutyRotations-fieldHint">
            El turno seguirá a tu nombre hasta que la administración apruebe la
            solicitud.
          </span>
        </label>
      ) : null}

      <label className="dutyRotations-swapReasonField">
        <span className="dutyRotations-labelLine">
          Motivo
          <span className="dutyRotations-optionalLabel">Opcional</span>
        </span>
        <Textarea
          value={reason}
          onChange={event => setReason(event.target.value)}
          placeholder="Explica brevemente por qué necesitas el cambio"
        />
      </label>

      <div className="dutyRotations-dialogActions">
        <Button
          variant="outline"
          disabled={swapMutation.isPending}
          onClick={() => getDialogHandle()?.close()}
        >
          Cancelar
        </Button>
        <Button disabled={submitDisabled} onClick={() => swapMutation.mutate()}>
          <Send aria-hidden="true" />
          Enviar solicitud
        </Button>
      </div>
    </div>
  );
};

export default SwapAssignmentDialog;

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCcw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { createUuid } from '@/utils/createUuid';
import type { DutyDialogHandleGetter } from '../../dutyRotations.dialogs';
import {
  dutyRotationQueryKeys,
  refetchDutyRotations,
} from '../../dutyRotations.queries';
import {
  formatDutyDateInLima,
  formatDutyDisplayDate,
} from '../../dutyRotations.utils';
import type { ValidDutyRotation } from '../../models/dutyRotations.types';
import {
  confirmDutyRosterSync,
  getDutyAssignments,
  getDutyEligibleRoster,
  previewDutyRosterSync,
} from '../../services/dutyRotations.service';

interface RosterSyncDialogProps {
  duty: ValidDutyRotation;
  getDialogHandle: DutyDialogHandleGetter;
}

const RosterSyncDialog = ({ duty, getDialogHandle }: RosterSyncDialogProps) => {
  const queryClient = useQueryClient();
  const currentDate = formatDutyDateInLima(new Date());
  const [requestKey] = useState(createUuid);
  const [selectedEffectiveFrom, setSelectedEffectiveFrom] = useState('');
  const rosterQuery = useQuery({
    queryKey: dutyRotationQueryKeys.eligibleRoster,
    queryFn: getDutyEligibleRoster,
  });
  const assignmentsQuery = useQuery({
    queryKey: [
      ...dutyRotationQueryKeys.assignments,
      duty.id,
      'roster-sync',
      currentDate,
    ],
    queryFn: () =>
      getDutyAssignments({ dutyId: duty.id, dateFrom: currentDate }),
  });
  const futureOccurrenceKeys = useMemo(
    () =>
      [
        ...new Set(
          (assignmentsQuery.data ?? [])
            .map(assignment => assignment.occurrenceKey)
            .filter(key => key > currentDate)
        ),
      ].sort(),
    [assignmentsQuery.data, currentDate]
  );
  const effectiveFrom = futureOccurrenceKeys.includes(selectedEffectiveFrom)
    ? selectedEffectiveFrom
    : futureOccurrenceKeys[0] ?? '';
  const previewQuery = useQuery({
    queryKey: [
      ...dutyRotationQueryKeys.eligibleRoster,
      'preview',
      duty.id,
      effectiveFrom,
      rosterQuery.data?.rosterFingerprint,
    ],
    queryFn: () =>
      previewDutyRosterSync(duty.id, {
        effectiveFrom,
        expectedVersion: duty.configurationVersion,
        rosterFingerprint: rosterQuery.data!.rosterFingerprint,
      }),
    enabled: Boolean(effectiveFrom && rosterQuery.data),
    retry: false,
  });
  const confirmMutation = useMutation({
    mutationFn: () =>
      confirmDutyRosterSync(duty.id, {
        effectiveFrom,
        expectedVersion: duty.configurationVersion,
        rosterFingerprint: rosterQuery.data!.rosterFingerprint,
        requestKey,
      }),
    onSuccess: async () => {
      await refetchDutyRotations(queryClient);
      SnackbarUtilities.success(
        'Personal sincronizado y turnos futuros actualizados.'
      );
      getDialogHandle()?.close();
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo sincronizar el personal.'
      );
    },
  });

  if (rosterQuery.isLoading || assignmentsQuery.isLoading) {
    return (
      <div className="dutyRotations-reviewNotice">
        Consultando personal y turnos...
      </div>
    );
  }

  if (rosterQuery.isError || assignmentsQuery.isError) {
    const error = rosterQuery.error ?? assignmentsQuery.error;
    return (
      <div className="dutyRotations-contractError" role="alert">
        {error instanceof Error
          ? error.message
          : 'No se pudo consultar el personal o las próximas ocurrencias.'}
      </div>
    );
  }

  const preview = previewQuery.data;
  return (
    <div className="dutyRotations-assignmentDialogContent">
      <div className="dutyRotations-reviewNotice">
        <Users size={18} />
        El padrón actual contiene {rosterQuery.data?.participants.length ??
          0}{' '}
        personas activas y presenciales. La sincronización no es automática: se
        aplica solamente después de esta confirmación.
      </div>
      <label>
        Aplicar desde la ocurrencia
        <Select value={effectiveFrom} onValueChange={setSelectedEffectiveFrom}>
          <SelectTrigger disabled={futureOccurrenceKeys.length === 0}>
            <SelectValue placeholder="Selecciona una ocurrencia futura" />
          </SelectTrigger>
          <SelectContent>
            {futureOccurrenceKeys.map(key => (
              <SelectItem key={key} value={key}>
                {formatDutyDisplayDate(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      {futureOccurrenceKeys.length === 0 && (
        <div className="dutyRotations-reviewNotice">
          No hay una ocurrencia futura materializada desde la cual sincronizar
          el personal.
        </div>
      )}
      {previewQuery.isFetching && (
        <div className="dutyRotations-reviewNotice">Calculando impacto...</div>
      )}
      {previewQuery.isError && (
        <div className="dutyRotations-contractError" role="alert">
          {previewQuery.error instanceof Error
            ? previewQuery.error.message
            : 'No se pudo calcular el impacto.'}
        </div>
      )}
      {preview && (
        <>
          <div className="dutyRotations-impactSummary">
            <span>{preview.addedIds.length} ingresos</span>
            <span>{preview.removedIds.length} bajas</span>
            <span>{preview.preservedIds.length} conservados</span>
            <span>{preview.impact.conflictCount} conflictos</span>
          </div>
          {preview.impact.conflicts.map(conflict => (
            <div
              className="dutyRotations-reviewNotice dutyRotations-reviewNoticeWarning"
              key={conflict.id}
            >
              {conflict.protectionReason}
            </div>
          ))}
        </>
      )}
      <div className="dutyRotations-dialogActions">
        <Button variant="outline" onClick={() => getDialogHandle()?.close()}>
          Cancelar
        </Button>
        <Button
          disabled={!preview || confirmMutation.isPending}
          onClick={() => confirmMutation.mutate()}
        >
          <RefreshCcw size={16} />
          Confirmar sincronización
        </Button>
      </div>
    </div>
  );
};

export default RosterSyncDialog;

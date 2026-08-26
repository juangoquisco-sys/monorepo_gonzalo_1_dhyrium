import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, UserMinus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { createUuid } from '@/utils/createUuid';
import type { DutyDialogHandleGetter } from '../../dutyRotations.dialogs';
import {
  dutyRotationQueryKeys,
  refetchDutyRotations,
} from '../../dutyRotations.queries';
import {
  formatDutyDisplayDate,
  getDutyUserFullName,
} from '../../dutyRotations.utils';
import type {
  DutyOccurrenceExclusionResponse,
  ValidDutyRotation,
} from '../../models/dutyRotations.types';
import {
  getDutyOccurrence,
  previewDutyOccurrenceExclusions,
  updateDutyOccurrenceExclusions,
} from '../../services/dutyRotations.service';

interface OccurrenceExclusionsDialogProps {
  duty: ValidDutyRotation;
  occurrenceKey: string;
  getDialogHandle: DutyDialogHandleGetter;
}

interface EditorProps extends OccurrenceExclusionsDialogProps {
  initial: DutyOccurrenceExclusionResponse;
}

const OccurrenceExclusionsEditor = ({
  duty,
  occurrenceKey,
  getDialogHandle,
  initial,
}: EditorProps) => {
  const queryClient = useQueryClient();
  const [requestKey] = useState(createUuid);
  const [excludedUserIds, setExcludedUserIds] = useState(
    initial.excludedUserIds
  );
  const [reason, setReason] = useState(
    initial.existingExclusions[0]?.reason ?? ''
  );
  const [preview, setPreview] =
    useState<DutyOccurrenceExclusionResponse | null>(null);
  const previewMutation = useMutation({
    mutationFn: () =>
      previewDutyOccurrenceExclusions(duty.id, occurrenceKey, {
        excludedUserIds,
        expectedVersion: initial.configurationVersion,
      }),
    onSuccess: setPreview,
    onError: error =>
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo previsualizar la redistribución.'
      ),
  });
  const confirmMutation = useMutation({
    mutationFn: () =>
      updateDutyOccurrenceExclusions(duty.id, occurrenceKey, {
        excludedUserIds,
        reason: reason.trim() || undefined,
        expectedVersion: initial.configurationVersion,
        requestKey,
      }),
    onSuccess: async () => {
      await refetchDutyRotations(queryClient);
      SnackbarUtilities.success('Ausencias guardadas y tareas redistribuidas.');
      getDialogHandle()?.close();
    },
    onError: error =>
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo aplicar la redistribución.'
      ),
  });
  const toggle = (userId: number) => {
    setExcludedUserIds(current =>
      current.includes(userId)
        ? current.filter(id => id !== userId)
        : [...current, userId]
    );
    setPreview(null);
  };

  return (
    <div className="dutyRotations-assignmentDialogContent">
      <div className="dutyRotations-reviewNotice">
        <UserMinus size={18} />
        <span>
          <strong>
            {formatDutyDisplayDate(initial.occurrence.periodStart)}
            {initial.occurrence.periodStart !== initial.occurrence.periodEnd
              ? ` - ${formatDutyDisplayDate(initial.occurrence.periodEnd)}`
              : ''}
          </strong>
          <br />
          Las ausencias solo cambian esta ocurrencia y no alteran el padrón de
          la actividad.
        </span>
      </div>
      <div className="dutyRotations-exclusionUsers">
        {duty.participants.map(participant => (
          <label key={participant.userId}>
            <input
              type="checkbox"
              checked={excludedUserIds.includes(participant.userId)}
              onChange={() => toggle(participant.userId)}
            />
            <span>
              <strong>{getDutyUserFullName(participant.user)}</strong>
              <small>
                {excludedUserIds.includes(participant.userId)
                  ? 'No participará en esta ocurrencia'
                  : 'Disponible'}
              </small>
            </span>
          </label>
        ))}
      </div>
      <label>
        Motivo común (opcional)
        <Input
          value={reason}
          onChange={event => setReason(event.target.value)}
        />
      </label>
      <Button
        variant="outline"
        disabled={previewMutation.isPending}
        onClick={() => previewMutation.mutate()}
      >
        Previsualizar redistribución
      </Button>
      {preview && (
        <>
          <div className="dutyRotations-impactSummary">
            <span>{preview.replacedCount} tareas reemplazables</span>
            <span>{preview.excludedUserIds.length} ausencias</span>
            <span>{preview.conflicts.length} conflictos</span>
          </div>
          {preview.conflicts.map((conflict, index) => (
            <div
              className="dutyRotations-contractError"
              key={`${conflict.assignmentId}-${index}`}
            >
              <AlertTriangle size={17} /> {conflict.reason}
            </div>
          ))}
          <div className="dutyRotations-previewList">
            {preview.assignments.map(assignment => (
              <article
                className="dutyRotations-previewRow"
                key={assignment.slotKey}
              >
                <Users size={16} />
                <span>
                  <strong>{assignment.slotLabel}</strong>
                  <small>Posición {assignment.slotPosition}</small>
                </span>
                <span>{getDutyUserFullName(assignment.assignedUser)}</span>
              </article>
            ))}
          </div>
        </>
      )}
      <div className="dutyRotations-dialogActions">
        <Button variant="outline" onClick={() => getDialogHandle()?.close()}>
          Cancelar
        </Button>
        <Button
          disabled={!preview?.canApply || confirmMutation.isPending}
          onClick={() => confirmMutation.mutate()}
        >
          Confirmar ausencias y redistribuir
        </Button>
      </div>
    </div>
  );
};

const OccurrenceExclusionsDialog = (props: OccurrenceExclusionsDialogProps) => {
  const query = useQuery({
    queryKey: [
      ...dutyRotationQueryKeys.occurrence,
      props.duty.id,
      props.occurrenceKey,
    ],
    queryFn: () => getDutyOccurrence(props.duty.id, props.occurrenceKey),
    retry: false,
  });
  if (query.isLoading) {
    return (
      <div className="dutyRotations-reviewNotice">
        Consultando la ocurrencia...
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="dutyRotations-contractError" role="alert">
        {query.error instanceof Error
          ? query.error.message
          : 'No se pudo consultar la ocurrencia.'}
      </div>
    );
  }
  return (
    <OccurrenceExclusionsEditor
      {...props}
      initial={query.data}
      key={`${
        query.data.configurationVersion
      }-${query.data.excludedUserIds.join('-')}`}
    />
  );
};

export default OccurrenceExclusionsDialog;

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ImagePlus, X } from 'lucide-react';
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
import { createUuid } from '@/utils/createUuid';
import type { DutyDialogHandleGetter } from '../../dutyRotations.dialogs';
import { DutyRotationContractError } from '../../dutyRotations.contract';
import { refetchDutyRotations } from '../../dutyRotations.queries';
import {
  getDutyParticipantUsers,
  getDutyUserFullName,
} from '../../dutyRotations.utils';
import type { DutyRotationAssignment } from '../../models/dutyRotations.types';
import { completeDutyAssignment } from '../../services/dutyRotations.service';
import AssignmentDialogSummary from './AssignmentDialogSummary';

interface CompleteAssignmentDialogProps {
  assignment: DutyRotationAssignment;
  getDialogHandle: DutyDialogHandleGetter;
}

const allowedEvidenceMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const CompleteAssignmentDialog = ({
  assignment,
  getDialogHandle,
}: CompleteAssignmentDialogProps) => {
  const queryClient = useQueryClient();
  const eligibleUsers = useMemo(
    () => getDutyParticipantUsers(assignment.duty),
    [assignment.duty]
  );
  const [executorUserId, setExecutorUserId] = useState(
    String(assignment.assignedUserId)
  );
  const [observations, setObservations] = useState(
    assignment.resolutionNotes || ''
  );
  const [requestKey] = useState(createUuid);
  const [evidences, setEvidences] = useState<File[]>([]);
  const selectedExecutorUserId = eligibleUsers.some(
    user => user.id === Number(executorUserId)
  )
    ? executorUserId
    : '';
  const executorChanged =
    Number(selectedExecutorUserId) !== assignment.assignedUserId;
  const observationsRequired = executorChanged;
  const observationsMissing =
    observationsRequired && observations.trim().length === 0;

  const completeMutation = useMutation({
    mutationFn: () =>
      completeDutyAssignment(assignment.id, {
        executedByUserId: Number(selectedExecutorUserId),
        resolutionNotes: observations,
        requestKey,
        evidences,
      }),
    onSuccess: async () => {
      SnackbarUtilities.success('Turno marcado como completado');
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
    if (completeMutation.isPending) {
      getDialogHandle()?.block('Espera a que termine la operación');
    } else {
      getDialogHandle()?.unblock();
    }

    return () => {
      getDialogHandle()?.unblock();
    };
  }, [completeMutation.isPending, getDialogHandle]);

  const completeDisabled =
    completeMutation.isPending ||
    !selectedExecutorUserId ||
    observationsMissing ||
    (assignment.evidencePolicy === 'REQUIRED_PHOTO' && evidences.length === 0);

  const selectEvidences = (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    if (selected.some(file => !allowedEvidenceMimeTypes.has(file.type))) {
      SnackbarUtilities.error('Usa fotografias JPG, PNG o WebP.');
      return;
    }
    if (selected.some(file => file.size > 5 * 1024 * 1024)) {
      SnackbarUtilities.error('Cada fotografia debe pesar como maximo 5 MB.');
      return;
    }
    if (evidences.length + selected.length > 3) {
      SnackbarUtilities.error('Puedes adjuntar como maximo tres fotografias.');
      return;
    }
    setEvidences(current => [...current, ...selected]);
  };

  return (
    <div className="dutyRotations-assignmentDialogContent">
      <AssignmentDialogSummary assignment={assignment} />

      <div className="dutyRotations-dialogGrid">
        <label>
          <span className="dutyRotations-labelLine">
            ¿Quién realizó el turno?
          </span>
          <Select
            value={selectedExecutorUserId}
            onValueChange={setExecutorUserId}
          >
            <SelectTrigger aria-label="¿Quién realizó el turno?">
              <SelectValue placeholder="Selecciona un participante" />
            </SelectTrigger>
            <SelectContent>
              {eligibleUsers.map(user => (
                <SelectItem key={user.id} value={String(user.id)}>
                  {getDutyUserFullName(user)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label>
          <span className="dutyRotations-labelLine">
            Observaciones
            {observationsRequired ? (
              <span className="dutyRotations-requiredLabel">Obligatorio</span>
            ) : (
              <span className="dutyRotations-optionalLabel">Opcional</span>
            )}
          </span>
          <Textarea
            value={observations}
            onChange={event => setObservations(event.target.value)}
            aria-invalid={observationsMissing}
            aria-describedby="duty-complete-observations-help"
            placeholder={
              observationsRequired
                ? 'Explica por qué otra persona realizó el turno'
                : 'Añade información útil sobre la ejecución'
            }
          />
          <span
            className="dutyRotations-fieldHint"
            id="duty-complete-observations-help"
          >
            {observationsRequired
              ? 'Debes registrar una observación porque el ejecutor es diferente del responsable asignado.'
              : 'Puedes dejar constancia de cualquier detalle relevante.'}
          </span>
        </label>

        {assignment.evidencePolicy !== 'NONE' && (
          <div className="dutyRotations-evidenceField">
            <span className="dutyRotations-labelLine">
              Fotografias de evidencia
              {assignment.evidencePolicy === 'REQUIRED_PHOTO' ? (
                <span className="dutyRotations-requiredLabel">Obligatorio</span>
              ) : (
                <span className="dutyRotations-optionalLabel">Opcional</span>
              )}
            </span>
            <label className="dutyRotations-filePicker">
              <ImagePlus size={18} aria-hidden="true" />
              Elegir fotografias
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={evidences.length >= 3}
                onChange={event => {
                  selectEvidences(event.target.files);
                  event.target.value = '';
                }}
              />
            </label>
            <span className="dutyRotations-fieldHint">
              Entre 1 y 3 imagenes cuando sean obligatorias. Maximo 5 MB por
              archivo.
            </span>
            {evidences.map((file, index) => (
              <div
                className="dutyRotations-evidenceFile"
                key={`${file.name}-${index}`}
              >
                <span>{file.name}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Quitar ${file.name}`}
                  onClick={() =>
                    setEvidences(current =>
                      current.filter((_, fileIndex) => fileIndex !== index)
                    )
                  }
                >
                  <X size={15} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dutyRotations-dialogActions">
        <Button
          variant="outline"
          disabled={completeMutation.isPending}
          onClick={() => getDialogHandle()?.close()}
        >
          Cancelar
        </Button>
        <Button
          disabled={completeDisabled}
          onClick={() => completeMutation.mutate()}
        >
          <CheckCircle2 aria-hidden="true" />
          Marcar como completado
        </Button>
      </div>
    </div>
  );
};

export default CompleteAssignmentDialog;

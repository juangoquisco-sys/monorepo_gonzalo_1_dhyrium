import {
  CalendarRange,
  CheckCircle2,
  Pencil,
  RefreshCw,
  Repeat2,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ATTENDANCE_RECONCILIATION_CAPABILITY,
  dutyFrequencyLabels,
} from '../../../dutyRotations.constants';
import {
  formatDutyDisplayDate,
  getDutyUserFullName,
} from '../../../dutyRotations.utils';
import type {
  DutyAssignmentStrategy,
  DutyEvidencePolicy,
  DutyImpactResponse,
  DutyPreviewResponse,
  DutySlot,
  DutyFrequency,
} from '../../../models/dutyRotations.types';
import {
  dutyFormEvidenceLabels,
  dutyFormStrategyLabels,
} from './dutyFormLabels';
import DutyDistributedPreview from './DutyDistributedPreview';
import type { DutyFormStep } from './dutyFormSteps';
import { DutyFormStepIntro } from './DutyFormStepPrimitives';

interface DutyFormReviewStepProps {
  isEditing: boolean;
  name: string;
  description: string;
  frequency: DutyFrequency;
  assignmentStrategy: DutyAssignmentStrategy;
  evidencePolicy: DutyEvidencePolicy;
  capabilityKey: string;
  accessWindowDays: number;
  validFrom: string;
  validUntil: string;
  participantCount: number;
  slots: DutySlot[];
  preview?: DutyPreviewResponse;
  previewLoading: boolean;
  previewErrorMessage?: string;
  futureOccurrenceKeys: string[];
  effectiveFrom: string;
  impact?: DutyImpactResponse;
  onEffectiveFromChange: (value: string) => void;
  onEditStep: (step: DutyFormStep) => void;
}

const countPreviewOccurrences = (preview?: DutyPreviewResponse) =>
  new Set(
    (preview?.occurrences ?? []).map(occurrence => occurrence.occurrenceKey)
  ).size;

const DutyFormReviewStep = ({
  isEditing,
  name,
  description,
  frequency,
  assignmentStrategy,
  evidencePolicy,
  capabilityKey,
  accessWindowDays,
  validFrom,
  validUntil,
  participantCount,
  slots,
  preview,
  previewLoading,
  previewErrorMessage,
  futureOccurrenceKeys,
  effectiveFrom,
  impact,
  onEffectiveFromChange,
  onEditStep,
}: DutyFormReviewStepProps) => (
  <section
    className="dutyRotations-formStepPanel"
    aria-labelledby="duty-form-review-title"
  >
    <DutyFormStepIntro
      eyebrow="Paso 4 de 4"
      title={
        isEditing ? 'Revisa el impacto de los cambios' : 'Revisa antes de crear'
      }
      description={
        isEditing
          ? 'Confirma qué turnos se conservarán y cuáles pueden regenerarse de forma segura.'
          : 'Comprueba la actividad y sus primeros turnos antes de generar el calendario.'
      }
      icon={CheckCircle2}
    />

    <div className="dutyRotations-reviewSummary">
      <header className="dutyRotations-reviewSummaryHero">
        <div>
          <span>Actividad</span>
          <strong id="duty-form-review-title">{name || 'Sin nombre'}</strong>
          <small>{description || 'Sin descripción adicional'}</small>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onEditStep('activity')}
        >
          <Pencil /> Editar
        </Button>
      </header>

      <dl className="dutyRotations-reviewList">
        <div>
          <dt>Calendario</dt>
          <dd>
            {dutyFrequencyLabels[frequency]} desde{' '}
            {formatDutyDisplayDate(validFrom)}
            {validUntil
              ? ` hasta ${formatDutyDisplayDate(validUntil)}`
              : ', sin fecha final'}
          </dd>
        </div>
        <div>
          <dt>Organización</dt>
          <dd>
            {assignmentStrategy === 'ONE_OWNER_PER_PERIOD'
              ? 'Una asignación por periodo'
              : `${dutyFormStrategyLabels[assignmentStrategy]} · ${
                  slots.length
                } ${slots.length === 1 ? 'bloque' : 'bloques'}`}
          </dd>
        </div>
        <div>
          <dt>Participantes</dt>
          <dd>{participantCount} personas en el orden configurado</dd>
        </div>
        <div>
          <dt>Evidencia</dt>
          <dd>{dutyFormEvidenceLabels[evidencePolicy]}</dd>
        </div>
        <div>
          <dt>Acceso relacionado</dt>
          <dd>
            {!capabilityKey
              ? 'Sin permiso especial'
              : capabilityKey === ATTENDANCE_RECONCILIATION_CAPABILITY
              ? `Conciliación de asistencia · ${accessWindowDays} días después del cierre`
              : `Permiso anterior no administrable · ${accessWindowDays} días después del cierre`}
          </dd>
        </div>
      </dl>
      <div className="dutyRotations-reviewEditActions">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEditStep('schedule')}
        >
          <Pencil /> Editar programación
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEditStep('participants')}
        >
          <Pencil /> Editar participantes
        </Button>
      </div>
    </div>

    {isEditing && futureOccurrenceKeys.length ? (
      <div className="dutyRotations-formSection">
        <div className="dutyRotations-formSectionHeading">
          <div>
            <h3>Aplicar los cambios desde</h3>
            <p>La ocurrencia actual y el historial no se modifican.</p>
          </div>
        </div>
        <Select value={effectiveFrom} onValueChange={onEffectiveFromChange}>
          <SelectTrigger aria-label="Aplicar los cambios desde">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {futureOccurrenceKeys.map(key => (
              <SelectItem key={key} value={key}>
                {formatDutyDisplayDate(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ) : null}

    {isEditing && impact ? (
      <div
        className="dutyRotations-impactSummary"
        aria-label="Impacto de la edición"
      >
        <span className="is-preserved">
          {impact.preservedCount} conservados
        </span>
        <span className="is-replaced">{impact.removedCount} reemplazables</span>
        <span className="is-conflict">
          {impact.conflictCount} conflictos protegidos
        </span>
      </div>
    ) : null}

    {previewLoading ? (
      <div className="dutyRotations-formLoading" aria-live="polite">
        <RefreshCw className="animate-spin" aria-hidden="true" />
        Calculando los próximos turnos…
      </div>
    ) : null}

    {previewErrorMessage ? (
      <Alert variant="danger">
        <AlertTitle>No se pudo calcular la vista previa</AlertTitle>
        <AlertDescription>{previewErrorMessage}</AlertDescription>
      </Alert>
    ) : null}

    {(preview?.warnings ?? []).map(warning => (
      <Alert variant="warning" key={warning}>
        <ShieldAlert aria-hidden="true" />
        <AlertTitle>Revisa esta condición</AlertTitle>
        <AlertDescription>{warning}</AlertDescription>
      </Alert>
    ))}

    {preview?.distributionWarnings.length ? (
      <Alert variant="warning" className="dutyRotations-zoneRotationSummary">
        <Repeat2 aria-hidden="true" />
        <AlertTitle>Rotación de zonas</AlertTitle>
        <AlertDescription>
          <p>
            {preview.distributionWarnings.length}{' '}
            {countPreviewOccurrences(preview) === 1
              ? 'de la próxima jornada tiene'
              : `de las próximas ${countPreviewOccurrences(
                  preview
                )} jornadas tienen`}{' '}
            personas que repiten zona.
          </p>
          <ul aria-label="Repeticiones de zona por jornada">
            {preview.distributionWarnings.map(warning => (
              <li key={warning.occurrenceKey}>
                <span>
                  {formatDutyDisplayDate(warning.periodStart)}
                  {warning.periodStart !== warning.periodEnd
                    ? ` – ${formatDutyDisplayDate(warning.periodEnd)}`
                    : ''}
                </span>
                <strong>
                  {warning.repeatedParticipantCount}{' '}
                  {warning.repeatedParticipantCount === 1
                    ? 'persona repite'
                    : 'personas repiten'}{' '}
                  zona
                </strong>
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    ) : null}

    <div className="dutyRotations-formSection">
      <div className="dutyRotations-formSectionHeading">
        <div>
          <h3>
            {assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS'
              ? 'Próximas jornadas y distribución'
              : 'Próximos turnos'}
          </h3>
          <p>
            {assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS'
              ? 'Revisa cómo se distribuirá el equipo en cada zona.'
              : 'Esta vista proviene del planificador del backend.'}
          </p>
        </div>
        {preview?.occurrences.length ? (
          <span>
            {assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS'
              ? countPreviewOccurrences(preview)
              : preview.occurrences.length}
          </span>
        ) : null}
      </div>

      {!previewLoading &&
      !previewErrorMessage &&
      !preview?.occurrences.length ? (
        <div className="dutyRotations-formEmptyState">
          <CalendarRange aria-hidden="true" />
          <strong>No hay ocurrencias completas para mostrar</strong>
          <span>
            Revisa la vigencia, los días seleccionados y los participantes.
          </span>
        </div>
      ) : null}

      {assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS' &&
      preview?.occurrences.length ? (
        <DutyDistributedPreview
          key={`${preview.occurrences[0].occurrenceKey}-${
            preview.occurrences.length
          }-${slots.map(slot => slot.key).join('-')}`}
          occurrences={preview.occurrences}
          distributionWarnings={preview.distributionWarnings}
          slots={slots}
        />
      ) : (
        <div className="dutyRotations-previewList">
          {(preview?.occurrences ?? []).map(occurrence => (
            <article
              key={`${occurrence.occurrenceKey}-${occurrence.slotKey}`}
              className="dutyRotations-previewRow"
            >
              <span className="dutyRotations-previewDate" aria-hidden="true">
                <CalendarRange />
              </span>
              <span>
                <strong>
                  {formatDutyDisplayDate(occurrence.periodStart)}
                  {occurrence.periodStart !== occurrence.periodEnd
                    ? ` – ${formatDutyDisplayDate(occurrence.periodEnd)}`
                    : ''}
                </strong>
                <small>
                  Vence {formatDutyDisplayDate(occurrence.dueOn)} ·{' '}
                  {occurrence.slotLabel}
                </small>
                {occurrence.slotInstructions ? (
                  <small className="dutyRotations-previewInstructions">
                    {occurrence.slotInstructions}
                  </small>
                ) : null}
              </span>
              <span>
                <Users aria-hidden="true" />
                {getDutyUserFullName(occurrence.assignedUser)}
              </span>
            </article>
          ))}
        </div>
      )}
    </div>

    <Alert variant="info">
      <AlertTitle>Generación automática</AlertTitle>
      <AlertDescription>
        {validUntil
          ? 'La actividad generará turnos completos hasta la fecha final seleccionada.'
          : 'La actividad continuará sin fecha final y mantendrá automáticamente sus próximos turnos.'}
      </AlertDescription>
    </Alert>
  </section>
);

export default DutyFormReviewStep;

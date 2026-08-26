import {
  CalendarRange,
  Clock3,
  Image,
  ListChecks,
  RefreshCw,
  UsersRound,
} from 'lucide-react';
import { dutyFrequencyLabels } from '../../../dutyRotations.constants';
import {
  formatDutyDisplayDate,
  getDutyUserFullName,
} from '../../../dutyRotations.utils';
import type {
  DutyEvidencePolicy,
  DutyAssignmentStrategy,
  DutyFrequency,
  DutyPreviewResponse,
  DutySlot,
} from '../../../models/dutyRotations.types';
import {
  dutyFormEvidenceLabels,
  dutyFormStrategyLabels,
} from './dutyFormLabels';

interface DutyFormLiveSummaryProps {
  name: string;
  frequency: DutyFrequency;
  assignmentStrategy: DutyAssignmentStrategy;
  evidencePolicy: DutyEvidencePolicy;
  validFrom: string;
  validUntil: string;
  participantCount: number;
  slots: DutySlot[];
  preview?: DutyPreviewResponse;
  previewLoading: boolean;
  previewError: boolean;
}

const DutyFormLiveSummary = ({
  name,
  frequency,
  assignmentStrategy,
  evidencePolicy,
  validFrom,
  validUntil,
  participantCount,
  slots,
  preview,
  previewLoading,
  previewError,
}: DutyFormLiveSummaryProps) => {
  const calendarCycles = [
    ...(preview?.occurrences ?? []).reduce((cycles, occurrence) => {
      const existing = cycles.get(occurrence.occurrenceKey);
      if (existing) {
        existing.push(occurrence);
      } else {
        cycles.set(occurrence.occurrenceKey, [occurrence]);
      }
      return cycles;
    }, new Map<string, DutyPreviewResponse['occurrences']>()),
  ].slice(0, 3);

  return (
    <aside
      className="dutyRotations-formSummary"
      aria-label="Resumen de la actividad"
    >
      <header>
        <span>Resumen en vivo</span>
        <strong>{name.trim() || 'Nueva actividad'}</strong>
        <p>Comprueba cómo se está formando la rotación mientras avanzas.</p>
      </header>

      <dl className="dutyRotations-formSummaryFacts">
        <div>
          <dt>
            <CalendarRange aria-hidden="true" /> Frecuencia
          </dt>
          <dd>{dutyFrequencyLabels[frequency]}</dd>
        </div>
        <div>
          <dt>
            <Clock3 aria-hidden="true" /> Inicio
          </dt>
          <dd>
            {validFrom ? formatDutyDisplayDate(validFrom) : 'Por definir'}
          </dd>
        </div>
        <div>
          <dt>
            <UsersRound aria-hidden="true" /> Personas
          </dt>
          <dd>{participantCount || 'Por seleccionar'}</dd>
        </div>
        <div>
          <dt>
            <ListChecks aria-hidden="true" /> Organización
          </dt>
          <dd>{dutyFormStrategyLabels[assignmentStrategy]}</dd>
        </div>
        <div>
          <dt>
            <Image aria-hidden="true" /> Evidencia
          </dt>
          <dd>{dutyFormEvidenceLabels[evidencePolicy]}</dd>
        </div>
      </dl>

      <div className="dutyRotations-formSummaryMeta">
        <span>
          {assignmentStrategy === 'ONE_OWNER_PER_PERIOD'
            ? '1 asignación por periodo'
            : `${slots.length} ${slots.length === 1 ? 'bloque' : 'bloques'}`}
        </span>
        <span>
          {validUntil
            ? `Hasta ${formatDutyDisplayDate(validUntil)}`
            : 'Sin fecha final'}
        </span>
      </div>

      <section
        className="dutyRotations-calendarRibbon"
        aria-labelledby="duty-calendar-ribbon-title"
      >
        <div>
          <span>Próximos ciclos</span>
          <strong id="duty-calendar-ribbon-title">Vista del calendario</strong>
        </div>

        {previewLoading ? (
          <p className="dutyRotations-calendarRibbonState" aria-live="polite">
            <RefreshCw className="animate-spin" aria-hidden="true" />
            Actualizando vista previa…
          </p>
        ) : null}
        {!previewLoading && previewError ? (
          <p className="dutyRotations-calendarRibbonState is-error">
            Revisa los campos señalados para calcular el calendario.
          </p>
        ) : null}
        {!previewLoading && !previewError && !preview?.occurrences.length ? (
          <p className="dutyRotations-calendarRibbonState">
            Completa la programación y agrega participantes para ver los
            primeros turnos.
          </p>
        ) : null}
        {!previewLoading && !previewError && calendarCycles.length ? (
          <ol>
            {calendarCycles.map(([occurrenceKey, assignments]) => {
              const firstAssignment = assignments[0];
              const slotCount = new Set(
                assignments.map(
                  assignment => assignment.baseSlotKey ?? assignment.slotKey
                )
              ).size;
              return (
                <li key={occurrenceKey}>
                  <span aria-hidden="true" />
                  <p>
                    <strong>
                      {formatDutyDisplayDate(firstAssignment.periodStart)}
                      {firstAssignment.periodStart !== firstAssignment.periodEnd
                        ? ` – ${formatDutyDisplayDate(
                            firstAssignment.periodEnd
                          )}`
                        : ''}
                    </strong>
                    <small>
                      {assignments.length === 1
                        ? `${firstAssignment.slotLabel} · ${getDutyUserFullName(
                            firstAssignment.assignedUser
                          )}`
                        : `${slotCount} ${
                            slotCount === 1 ? 'bloque' : 'bloques'
                          } · ${assignments.length} asignaciones`}
                    </small>
                    {assignments.length === 1 &&
                    firstAssignment.slotInstructions ? (
                      <small>{firstAssignment.slotInstructions}</small>
                    ) : null}
                  </p>
                </li>
              );
            })}
          </ol>
        ) : null}
      </section>
    </aside>
  );
};

export default DutyFormLiveSummary;

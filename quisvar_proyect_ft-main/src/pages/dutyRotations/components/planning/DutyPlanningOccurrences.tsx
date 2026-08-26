import { CalendarRange, UserMinus, UsersRound } from 'lucide-react';
import { AppBadge } from '@/components/app-ui/app-badge';
import { Button } from '@/components/ui/button';
import { dutyAssignmentStatusLabels } from '../../dutyRotations.constants';
import {
  formatDutyDisplayDate,
  getDutyUserFullName,
} from '../../dutyRotations.utils';
import type { DutyPlanningOccurrence } from '../../dutyPlanningGroups';
import type { DutyRotation } from '../../models/dutyRotations.types';

interface DutyPlanningOccurrencesProps {
  duty: DutyRotation;
  occurrences: DutyPlanningOccurrence[];
  currentDate: string;
  emptyMessage: string;
  onManageAbsences?: (occurrenceKey: string) => void;
}

const formatPeriod = (occurrence: DutyPlanningOccurrence) =>
  occurrence.periodStart === occurrence.periodEnd
    ? formatDutyDisplayDate(occurrence.periodStart)
    : `${formatDutyDisplayDate(
        occurrence.periodStart
      )} – ${formatDutyDisplayDate(occurrence.periodEnd)}`;

const DutyPlanningOccurrences = ({
  currentDate,
  duty,
  emptyMessage,
  occurrences,
  onManageAbsences,
}: DutyPlanningOccurrencesProps) => {
  if (!occurrences.length) {
    return (
      <div className="dutyRotations-planningEmpty">
        <CalendarRange aria-hidden="true" />
        <strong>Sin jornadas en este periodo</strong>
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="dutyRotations-planningOccurrences">
      {occurrences.map(occurrence => (
        <article
          key={occurrence.occurrenceKey}
          className="dutyRotations-planningOccurrence"
        >
          <header>
            <div>
              <span>Jornada</span>
              <strong>{formatPeriod(occurrence)}</strong>
              <small>
                Vence {formatDutyDisplayDate(occurrence.dueOn)} ·{' '}
                {occurrence.assignments.length}{' '}
                {occurrence.assignments.length === 1
                  ? 'asignación'
                  : 'asignaciones'}
              </small>
            </div>
            {duty.assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS' &&
            occurrence.periodStart > currentDate &&
            onManageAbsences ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onManageAbsences(occurrence.occurrenceKey)}
              >
                <UserMinus aria-hidden="true" /> Ausencias
              </Button>
            ) : null}
          </header>

          <div className="dutyRotations-planningZones">
            {occurrence.zones.map(zone => (
              <section key={zone.key} className="dutyRotations-planningZone">
                <div className="dutyRotations-planningZoneHeading">
                  <div>
                    <strong>{zone.label}</strong>
                    {zone.instructions ? <p>{zone.instructions}</p> : null}
                  </div>
                  <AppBadge variant="outline">
                    <UsersRound aria-hidden="true" />
                    {zone.assignments.length}
                  </AppBadge>
                </div>
                <ul>
                  {zone.assignments.map(assignment => (
                    <li key={assignment.id}>
                      <span>
                        {assignment.status === 'OPEN_POOL'
                          ? 'Por cubrir'
                          : getDutyUserFullName(assignment.assignedUser)}
                      </span>
                      <small>
                        {dutyAssignmentStatusLabels[assignment.status]}
                      </small>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
};

export default DutyPlanningOccurrences;

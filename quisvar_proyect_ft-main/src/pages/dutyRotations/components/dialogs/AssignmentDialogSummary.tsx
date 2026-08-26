import { CalendarDays, CalendarRange, Clock } from 'lucide-react';
import {
  formatDutyAssignmentDays,
  formatDutyAssignmentPeriod,
} from '../../dutyRotations.utils';
import type { DutyRotationAssignment } from '../../models/dutyRotations.types';

interface AssignmentDialogSummaryProps {
  assignment: DutyRotationAssignment;
}

const AssignmentDialogSummary = ({
  assignment,
}: AssignmentDialogSummaryProps) => {
  const periodDaysLabel = formatDutyAssignmentDays(assignment);

  return (
    <section
      className="dutyRotations-assignmentSummary"
      aria-label="Resumen del turno"
    >
      <div>
        <span>Actividad</span>
        <strong>{assignment.duty.name}</strong>
      </div>
      <div className="dutyRotations-assignmentSummaryMeta">
        <span>
          <CalendarRange aria-hidden="true" />
          Periodo de responsabilidad: {formatDutyAssignmentPeriod(assignment)}
        </span>
        <span>
          <Clock aria-hidden="true" />
          {assignment.slotLabel}
        </span>
        {periodDaysLabel ? (
          <span>
            <CalendarDays aria-hidden="true" />
            Días comprendidos: {periodDaysLabel}
          </span>
        ) : null}
      </div>
    </section>
  );
};

export default AssignmentDialogSummary;

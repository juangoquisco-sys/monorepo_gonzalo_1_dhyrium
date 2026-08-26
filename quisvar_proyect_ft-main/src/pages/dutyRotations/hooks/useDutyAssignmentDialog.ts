import { createElement } from 'react';
import { openDutyRotationDialog } from '../dutyRotations.dialogs';
import CompleteAssignmentDialog from '../components/dialogs/CompleteAssignmentDialog';
import SwapAssignmentDialog from '../components/dialogs/SwapAssignmentDialog';
import { formatDutyDisplayDate } from '../dutyRotations.utils';
import type { DutyRotationAssignment } from '../models/dutyRotations.types';

const assignmentDescription = (assignment: DutyRotationAssignment) =>
  `${assignment.duty.name} · ${formatDutyDisplayDate(
    assignment.periodStart
  )} · ${assignment.slotLabel}`;

const useDutyAssignmentDialog = () => ({
  openCompleteAssignment: (assignment: DutyRotationAssignment) =>
    openDutyRotationDialog(
      {
        title: 'Completar turno',
        description: assignmentDescription(assignment),
        width: 'min(94vw, 38rem)',
      },
      getDialogHandle =>
        createElement(CompleteAssignmentDialog, {
          assignment,
          getDialogHandle,
        })
    ),
  openSwapAssignment: (assignment: DutyRotationAssignment) =>
    openDutyRotationDialog(
      {
        title: 'Solicitar cambio de turno',
        description: assignmentDescription(assignment),
        width: 'min(94vw, 42rem)',
      },
      getDialogHandle =>
        createElement(SwapAssignmentDialog, {
          assignment,
          getDialogHandle,
        })
    ),
});

export default useDutyAssignmentDialog;

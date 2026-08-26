import type {
  DutyAssignmentStrategy,
  DutyEvidencePolicy,
} from '../../../models/dutyRotations.types';

export const dutyFormStrategyLabels: Record<DutyAssignmentStrategy, string> = {
  ONE_OWNER_PER_PERIOD: 'Un responsable por periodo',
  ONE_OWNER_PER_SLOT: 'Un responsable por tarea',
  DISTRIBUTE_PARTICIPANTS: 'Distribuir a todo el equipo',
};

export const dutyFormEvidenceLabels: Record<DutyEvidencePolicy, string> = {
  NONE: 'Sin fotografías',
  OPTIONAL_PHOTO: 'Fotografías opcionales',
  REQUIRED_PHOTO: 'Fotografías obligatorias',
};

import AppError from '@/utils/appError';

export const LUNCH_MENU_DEFAULT_DURATION_MINUTES = 30;
export const LUNCH_MENU_MIN_DURATION_MINUTES = 1;
export const LUNCH_MENU_MAX_DURATION_MINUTES = 24 * 60;

const PENDING_SELECTION_ASSIGNEE_DNIS = new Set(['73520253', '44622486']);

export type LunchMenuAvailability = {
  isManuallyClosed: boolean;
  closesAt: Date;
};

export const assertLunchMenuDuration = (durationMinutes: number) => {
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < LUNCH_MENU_MIN_DURATION_MINUTES ||
    durationMinutes > LUNCH_MENU_MAX_DURATION_MINUTES
  ) {
    throw new AppError(
      `La duración debe estar entre ${LUNCH_MENU_MIN_DURATION_MINUTES} y ${LUNCH_MENU_MAX_DURATION_MINUTES} minutos`,
      400
    );
  }
};

export const calculateLunchMenuCloseAt = (
  publishedAt: Date,
  durationMinutes = LUNCH_MENU_DEFAULT_DURATION_MINUTES
) => {
  assertLunchMenuDuration(durationMinutes);
  return new Date(publishedAt.getTime() + durationMinutes * 60_000);
};

export const isLunchMenuOpen = (
  availability: LunchMenuAvailability,
  now = new Date()
) => !availability.isManuallyClosed && availability.closesAt.getTime() > now.getTime();

export const assertLunchMenuOpen = (
  availability: LunchMenuAvailability,
  now = new Date()
) => {
  if (!isLunchMenuOpen(availability, now)) {
    throw new AppError('El menú de almuerzo ya está cerrado', 409);
  }
};

export const assertEligibleForLunchMenu = (hasLunchConfirmation: boolean) => {
  if (!hasLunchConfirmation) {
    throw new AppError(
      'Solo los usuarios con almuerzo confirmado pueden elegir el menú',
      403
    );
  }
};

export const canAssignPendingLunchMenuSelection = (actorDni?: string | null) =>
  !!actorDni && PENDING_SELECTION_ASSIGNEE_DNIS.has(actorDni);

export const assertCanAssignPendingLunchMenuSelection = (
  actorDni?: string | null
) => {
  if (!canAssignPendingLunchMenuSelection(actorDni)) {
    throw new AppError(
      'No tiene autorización para seleccionar el menú de otro usuario',
      403
    );
  }
};

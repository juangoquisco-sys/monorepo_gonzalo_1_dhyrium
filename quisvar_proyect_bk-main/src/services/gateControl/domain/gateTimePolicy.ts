import AppError from '@/utils/appError';

export const MAX_QUICK_PASS_MINUTES = 10;
export const NEAR_DUE_THRESHOLD_MS = 2 * 60 * 1000;

export class GateTimePolicy {
  static parseDate(value?: string | Date | null, fallback = new Date()) {
    if (!value) return fallback;
    const date = value instanceof Date ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new AppError('La fecha enviada no es valida', 400);
    }
    return date;
  }

  static assertQuickDuration(minutes: number) {
    if (!Number.isInteger(minutes) || minutes < 1) {
      throw new AppError('Debe indicar una duracion valida en minutos', 400);
    }
    if (minutes > MAX_QUICK_PASS_MINUTES) {
      throw new AppError('El permiso rapido no puede superar 10 minutos', 422);
    }
  }

  static dueAt(exitAt: Date, requestedMinutes: number) {
    return new Date(exitAt.getTime() + requestedMinutes * 60 * 1000);
  }

  static penaltyMinutes(returnAt?: Date | null, dueAt?: Date | null) {
    if (!returnAt || !dueAt || returnAt <= dueAt) return 0;
    return Math.ceil((returnAt.getTime() - dueAt.getTime()) / 60000);
  }

  static runtimeStatus(pass: {
    status: string;
    dueAt?: Date | null;
    actualReturnAt?: Date | null;
  }) {
    if (
      ['PENDING_EXIT_REVIEW', 'PENDING_RETURN_REVIEW'].includes(pass.status)
    ) {
      return 'PENDING_REVIEW';
    }
    if (pass.status !== 'ACTIVE' || !pass.dueAt || pass.actualReturnAt) {
      return pass.status;
    }

    const remaining = pass.dueAt.getTime() - Date.now();
    if (remaining < 0) return 'LATE';
    if (remaining <= NEAR_DUE_THRESHOLD_MS) return 'NEAR_DUE';
    return 'ACTIVE';
  }
}

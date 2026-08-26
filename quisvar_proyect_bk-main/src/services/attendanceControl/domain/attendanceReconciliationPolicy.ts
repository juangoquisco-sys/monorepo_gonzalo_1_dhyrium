import { ListDetails } from '@prisma/client';
import AppError from '@/utils/appError';

export const RECONCILABLE_ATTENDANCE_STATUSES: ListDetails[] = [
  'TARDE',
  'SIMPLE',
  'GRAVE',
  'MUY_GRAVE',
];
export const DEFAULT_ATTENDANCE_INCIDENT_STATUSES =
  RECONCILABLE_ATTENDANCE_STATUSES;
export const ATTENDANCE_INCIDENT_STATUSES: ListDetails[] = [
  ...RECONCILABLE_ATTENDANCE_STATUSES,
  'PUNTUAL',
  'PERMISO',
  'SALIDA',
];

export const ATTENDANCE_FINE_BY_STATUS: Record<ListDetails, number> = {
  PUNTUAL: 0,
  TARDE: 0.5,
  SIMPLE: 10,
  GRAVE: 20,
  MUY_GRAVE: 80,
  PERMISO: 0,
  SALIDA: 0,
};

export const attendanceFineForStatus = (
  status: ListDetails,
  roleHierarchy?: number | null
) => {
  const isManagementHierarchy =
    roleHierarchy !== null && roleHierarchy !== undefined && roleHierarchy < 3;
  const multiplier = isManagementHierarchy ? 2 : 1;
  return ATTENDANCE_FINE_BY_STATUS[status] * multiplier;
};

const OPERATIONAL_DAY_OFFSET_HOURS = 5;
const DAY_IN_HOURS = 24;

export class AttendanceReconciliationPolicy {
  static assertReason(reason?: string) {
    if (!reason?.trim()) {
      throw new AppError(
        'Ingrese una justificacion para la reconciliacion',
        400
      );
    }
  }

  static assertItems(items?: unknown[]) {
    if (!items?.length) {
      throw new AppError('Seleccione al menos una incidencia', 400);
    }
  }

  static assertReconciliableStatus(status: ListDetails) {
    if (!RECONCILABLE_ATTENDANCE_STATUSES.includes(status)) {
      throw new AppError(
        `La incidencia ${status} no se puede reconciliar`,
        400
      );
    }
  }

  static parseIncidentStatuses(statuses?: ListDetails[]) {
    if (!statuses?.length) return DEFAULT_ATTENDANCE_INCIDENT_STATUSES;
    statuses.forEach(status => {
      if (!ATTENDANCE_INCIDENT_STATUSES.includes(status)) {
        throw new AppError(`Estado de incidencia invalido: ${status}`, 400);
      }
    });
    return statuses;
  }

  static summaryStatuses() {
    return RECONCILABLE_ATTENDANCE_STATUSES;
  }

  static emptyStatusCounts() {
    return ATTENDANCE_INCIDENT_STATUSES.reduce<Record<ListDetails, number>>(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<ListDetails, number>
    );
  }

  static effectiveStatus(
    originalStatus: ListDetails,
    resolvedStatus?: ListDetails | null
  ) {
    return resolvedStatus ?? originalStatus;
  }

  static operationalDateRange(
    dateFrom?: string | Date,
    dateTo?: string | Date
  ) {
    if (!dateFrom || !dateTo) {
      throw new AppError('Ingrese un periodo de busqueda', 400);
    }

    const start = this.toOperationalBoundary(dateFrom, 'start');
    const end = this.toOperationalBoundary(dateTo, 'end');

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new AppError('Periodo de busqueda invalido', 400);
    }
    if (start > end) {
      throw new AppError('La fecha inicial no puede ser mayor a la final', 400);
    }

    return { start, end };
  }

  private static toOperationalBoundary(
    value: string | Date,
    boundary: 'start' | 'end'
  ) {
    if (value instanceof Date) return value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value);

    const base = new Date(value).getTime();
    const hours =
      boundary === 'start'
        ? OPERATIONAL_DAY_OFFSET_HOURS
        : OPERATIONAL_DAY_OFFSET_HOURS + DAY_IN_HOURS;
    const milliseconds = hours * 60 * 60 * 1000;
    const endOffset = boundary === 'end' ? -1 : 0;

    return new Date(base + milliseconds + endOffset);
  }
}

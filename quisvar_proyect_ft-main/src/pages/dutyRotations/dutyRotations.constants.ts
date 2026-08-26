import type {
  DutyAssignmentStatus,
  DutyFrequency,
  DutyWeekday,
} from './models/dutyRotations.types';

export const ATTENDANCE_RECONCILIATION_CAPABILITY = 'attendance.reconciliation';

export const dutyAssignmentStatusLabels: Record<DutyAssignmentStatus, string> =
  {
    PENDING: 'Asignado',
    COMPLETED: 'Completado',
    NO_SHOW: 'No asistio',
    OPEN_POOL: 'En bolsa',
  };

export const dutyFrequencyLabels: Record<DutyFrequency, string> = {
  ONCE: 'Una sola vez',
  DAILY: 'Diaria',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
};

export const dutyWeekdayOptions: Array<{
  key: DutyWeekday;
  label: string;
  shortLabel: string;
  compactLabel: string;
}> = [
  { key: 'MONDAY', label: 'Lunes', shortLabel: 'L', compactLabel: 'Lun' },
  { key: 'TUESDAY', label: 'Martes', shortLabel: 'M', compactLabel: 'Mar' },
  {
    key: 'WEDNESDAY',
    label: 'Miércoles',
    shortLabel: 'X',
    compactLabel: 'Mié',
  },
  { key: 'THURSDAY', label: 'Jueves', shortLabel: 'J', compactLabel: 'Jue' },
  { key: 'FRIDAY', label: 'Viernes', shortLabel: 'V', compactLabel: 'Vie' },
  {
    key: 'SATURDAY',
    label: 'Sábado',
    shortLabel: 'S',
    compactLabel: 'Sáb',
  },
  { key: 'SUNDAY', label: 'Domingo', shortLabel: 'D', compactLabel: 'Dom' },
];

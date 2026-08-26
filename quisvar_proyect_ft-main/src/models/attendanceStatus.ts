export const ATTENDANCE_STATUSES = [
  'PUNTUAL',
  'TARDE',
  'SIMPLE',
  'GRAVE',
  'MUY_GRAVE',
  'PERMISO',
  'SALIDA',
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PUNTUAL: 'Puntual',
  TARDE: 'Tardanza',
  SIMPLE: 'Falta simple',
  GRAVE: 'Falta grave',
  MUY_GRAVE: 'Falta muy grave',
  PERMISO: 'Licencia o permiso',
  SALIDA: 'Salida de campo',
};

export const ATTENDANCE_STATUS_SHORT_LABELS: Record<AttendanceStatus, string> =
  {
    PUNTUAL: 'P',
    TARDE: 'T',
    SIMPLE: 'F',
    GRAVE: 'G',
    MUY_GRAVE: 'M',
    PERMISO: 'L',
    SALIDA: 'S',
  };

export const ATTENDANCE_STATUS_FINE_AMOUNTS: Record<AttendanceStatus, number> =
  {
    PUNTUAL: 0,
    TARDE: 0.5,
    SIMPLE: 10,
    GRAVE: 20,
    MUY_GRAVE: 80,
    PERMISO: 0,
    SALIDA: 0,
  };

export const ATTENDANCE_RECONCILABLE_STATUSES: AttendanceStatus[] = [
  'TARDE',
  'SIMPLE',
  'GRAVE',
  'MUY_GRAVE',
];

export const ATTENDANCE_REPORT_STATUS_COLUMNS: AttendanceStatus[] = [
  'TARDE',
  'SIMPLE',
  'GRAVE',
  'MUY_GRAVE',
  'PERMISO',
  'SALIDA',
];

export const ATTENDANCE_STATUS_RADIO_OPTIONS: {
  value: AttendanceStatus;
  className: string;
}[] = [
  { value: 'PUNTUAL', className: 'list-p' },
  { value: 'TARDE', className: 'list-t' },
  { value: 'SIMPLE', className: 'list-f' },
  { value: 'GRAVE', className: 'list-g' },
  { value: 'MUY_GRAVE', className: 'list-m' },
  { value: 'PERMISO', className: 'list-l' },
  { value: 'SALIDA', className: 'list-s' },
];

export const isAttendanceStatus = (
  value: unknown
): value is AttendanceStatus => {
  return ATTENDANCE_STATUSES.includes(value as AttendanceStatus);
};

export const normalizeAttendanceStatus = (
  value: unknown,
  fallback: AttendanceStatus = 'PUNTUAL'
) => {
  return isAttendanceStatus(value) ? value : fallback;
};

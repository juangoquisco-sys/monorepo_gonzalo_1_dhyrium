import type { AttendanceCaptureMode } from '@/pages/attendance/attendance.types';

export type AttendanceWeekday =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export const WEEKDAYS: AttendanceWeekday[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export const WEEKDAY_LABELS: Record<AttendanceWeekday, string> = {
  MONDAY: 'Lun',
  TUESDAY: 'Mar',
  WEDNESDAY: 'Mié',
  THURSDAY: 'Jue',
  FRIDAY: 'Vie',
  SATURDAY: 'Sáb',
  SUNDAY: 'Dom',
};

export type AttendanceCallWeekdayOverride = {
  id: number;
  callConfigId: number;
  weekday: AttendanceWeekday;
  skip: boolean;
  title: string | null;
  captureStartTime: string | null;
  captureEndTime: string | null;
};

export type AttendanceCallConfig = {
  id: number;
  position: number;
  title: string;
  captureStartTime: string;
  captureEndTime: string;
  captureMode: AttendanceCaptureMode;
  isActive: boolean;
  weekdayOverrides: AttendanceCallWeekdayOverride[];
};

export type UpsertCallConfigInput = {
  title: string;
  captureStartTime: string;
  captureEndTime: string;
  captureMode: AttendanceCaptureMode;
  isActive?: boolean;
};

export type UpsertWeekdayOverrideInput = {
  skip: boolean;
  title?: string | null;
  captureStartTime?: string | null;
  captureEndTime?: string | null;
};

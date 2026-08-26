import type {
  DutyParticipant,
  DutyRecurrence,
  DutyRotationAssignment,
  DutyUser,
} from './models/dutyRotations.types';
import { dutyWeekdayOptions } from './dutyRotations.constants';

export const formatDutyDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDutyDateInLima = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(item => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

export const parseDutyDateInput = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const addDutyDays = (value: string, days: number) => {
  const date = parseDutyDateInput(value);
  date.setDate(date.getDate() + days);
  return formatDutyDateInput(date);
};

const parseValidDutyDate = (value?: string | null) => {
  if (!value) return null;
  const candidate = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return null;
  const [year, month, day] = candidate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};

export const formatDutyDisplayDate = (value?: string | null) => {
  const date = parseValidDutyDate(value);
  if (!date) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(date);
};

export const formatDutyLongDate = (value?: string | null) => {
  const date = parseValidDutyDate(value);
  if (!date) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

export const normalizeDutyDate = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

export const formatDutyAssignmentPeriod = (
  assignment: DutyRotationAssignment
) => {
  if (
    assignment.periodStart.slice(0, 10) !== assignment.periodEnd.slice(0, 10)
  ) {
    return `${formatDutyDisplayDate(
      assignment.periodStart
    )} – ${formatDutyDisplayDate(assignment.periodEnd)}`;
  }
  return formatDutyLongDate(assignment.periodStart);
};

export const getDutyUserFullName = (user?: DutyUser | null) => {
  if (!user) return 'Sin usuario';
  const firstName = user.profile?.firstName || '';
  const lastName = user.profile?.lastName || '';
  return `${firstName} ${lastName}`.trim() || user.email || 'Sin usuario';
};

export const getDutyParticipantUsers = (duty: {
  participants: DutyParticipant[];
}) =>
  duty.participants.flatMap(participant =>
    participant.user ? [participant.user] : []
  );

const weekdayKeysByDay = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

const compactWeekdayByKey = new Map(
  dutyWeekdayOptions.map(option => [option.key, option.compactLabel])
);

export const formatDutyAssignmentDays = (
  assignment: DutyRotationAssignment
) => {
  const start = parseValidDutyDate(assignment.periodStart);
  const end = parseValidDutyDate(assignment.periodEnd);
  if (!start || !end || end < start || start.getTime() === end.getTime()) {
    return null;
  }

  const labels: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && labels.length < 7) {
    const weekdayKey = weekdayKeysByDay[cursor.getDay()];
    labels.push(compactWeekdayByKey.get(weekdayKey) ?? '');
    cursor.setDate(cursor.getDate() + 1);
  }
  if (cursor <= end || labels.some(label => label.length === 0)) return null;
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} y ${labels.at(-1)}`;
};

export const getDutySlotsFromRule = (rule: DutyRecurrence) => rule.slots;

export const sortDutyAssignmentsByDate = (
  assignments: DutyRotationAssignment[]
) =>
  [...assignments].sort((first, second) => {
    const dateDiff =
      new Date(first.periodStart).getTime() -
      new Date(second.periodStart).getTime();
    return dateDiff || first.slotLabel.localeCompare(second.slotLabel);
  });

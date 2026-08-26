const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /T(\d{2}:\d{2})/;

export type DateRangeValue = [Date | null, Date | null];

export const parseDateFilter = (value?: string) => {
  if (!value) return undefined;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

export const formatDatePart = (date?: Date | null) => {
  if (!date) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseTimeFilter = (value?: string, fallback = '00:00') => {
  if (!value || dateOnlyPattern.test(value)) return fallback;
  return value.match(timePattern)?.[1] || fallback;
};

export const normalizeTimeInput = (value: string, fallback: string) =>
  value || fallback;

export const formatDateTimeFilter = (
  date: Date | undefined,
  time: string,
  endOfMinute = false
) => {
  const datePart = formatDatePart(date);
  if (!datePart) return undefined;
  return `${datePart}T${time}:${endOfMinute ? '59' : '00'}`;
};

export const formatFromFilter = (date: Date | undefined, time: string) => {
  if (time === '00:00') return formatDatePart(date);
  return formatDateTimeFilter(date, time);
};

export const formatToFilter = (date: Date | undefined, time: string) => {
  if (time === '23:59') return formatDatePart(date);
  return formatDateTimeFilter(date, time, true);
};

export const formatDateLabel = (value?: string) => {
  const date = parseDateFilter(value);
  if (!date) return value || '';
  const dateLabel = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
  if (!value || dateOnlyPattern.test(value)) return dateLabel;
  return `${dateLabel} ${parseTimeFilter(value)}`;
};

export const getDateRangeLabel = (from?: string, to?: string) => {
  if (from && to) return `${formatDateLabel(from)} - ${formatDateLabel(to)}`;
  if (from) return `Desde ${formatDateLabel(from)}`;
  if (to) return `Hasta ${formatDateLabel(to)}`;
  return '';
};

export const formatDateDisplay = (date?: Date | null) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const formatRangeDisplay = ([from, to]: DateRangeValue) => {
  if (from && to)
    return `${formatDateDisplay(from)} - ${formatDateDisplay(to)}`;
  if (from) return `Desde ${formatDateDisplay(from)}`;
  if (to) return `Hasta ${formatDateDisplay(to)}`;
  return '';
};

export const dateDisabledMatchers = (minDate?: Date, maxDate?: Date) => [
  ...(minDate ? [{ before: minDate }] : []),
  ...(maxDate ? [{ after: maxDate }] : []),
];

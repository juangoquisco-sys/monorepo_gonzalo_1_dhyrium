import { CalendarDays } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Separator } from '../ui/separator';

export interface DataTableDateRangeValue {
  from?: string;
  to?: string;
}

interface DataTableDateRangeFilterProps {
  from?: string;
  to?: string;
  title?: string;
  onChange: (value: DataTableDateRangeValue) => void;
}

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /T(\d{2}:\d{2})/;

const parseDateFilter = (value?: string) => {
  if (!value) return undefined;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const formatDatePart = (date?: Date) => {
  if (!date) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseTimeFilter = (value?: string, fallback = '00:00') => {
  if (!value || dateOnlyPattern.test(value)) return fallback;
  return value.match(timePattern)?.[1] || fallback;
};

const normalizeTimeInput = (value: string, fallback: string) =>
  value || fallback;

const formatDateTimeFilter = (
  date: Date | undefined,
  time: string,
  endOfMinute = false
) => {
  const datePart = formatDatePart(date);
  if (!datePart) return undefined;
  return `${datePart}T${time}:${endOfMinute ? '59' : '00'}`;
};

const formatFromFilter = (date: Date | undefined, time: string) => {
  if (time === '00:00') return formatDatePart(date);
  return formatDateTimeFilter(date, time);
};

const formatToFilter = (date: Date | undefined, time: string) => {
  if (time === '23:59') return formatDatePart(date);
  return formatDateTimeFilter(date, time, true);
};

const formatDateLabel = (value?: string) => {
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

const getDateRangeLabel = (from?: string, to?: string) => {
  if (from && to) return `${formatDateLabel(from)} - ${formatDateLabel(to)}`;
  if (from) return `Desde ${formatDateLabel(from)}`;
  if (to) return `Hasta ${formatDateLabel(to)}`;
  return '';
};

export const DataTableDateRangeFilter = ({
  from,
  to,
  title = 'Fecha',
  onChange,
}: DataTableDateRangeFilterProps) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: parseDateFilter(from),
    to: parseDateFilter(to),
  }));
  const [fromTime, setFromTime] = useState(() =>
    parseTimeFilter(from, '00:00')
  );
  const [toTime, setToTime] = useState(() => parseTimeFilter(to, '23:59'));
  const dateRangeLabel = getDateRangeLabel(from, to);

  useEffect(() => {
    setDateRange({
      from: parseDateFilter(from),
      to: parseDateFilter(to),
    });
    setFromTime(parseTimeFilter(from, '00:00'));
    setToTime(parseTimeFilter(to, '23:59'));
  }, [from, to]);

  const clearDateRange = () => {
    setDateRange(undefined);
    setFromTime('00:00');
    setToTime('23:59');
    onChange({ from: undefined, to: undefined });
  };

  const applyDateRange = () => {
    onChange({
      from: formatFromFilter(dateRange?.from, fromTime),
      to: formatToFilter(dateRange?.to, toTime),
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-2 border-dashed"
        >
          <CalendarDays className="size-4" />
          {title}
          {dateRangeLabel && (
            <>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <Badge
                variant="secondary"
                className="!w-auto !shrink justify-start overflow-hidden rounded-sm px-1.5"
                title={dateRangeLabel}
              >
                <span className="min-w-0 max-w-40 truncate text-left">
                  {dateRangeLabel}
                </span>
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 p-2"
        onWheel={event => event.stopPropagation()}
      >
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={setDateRange}
          autoFocus
        />
        <div className="grid gap-3 border-t border-border px-1 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Desde
              <Input
                type="time"
                value={fromTime}
                onChange={event =>
                  setFromTime(normalizeTimeInput(event.target.value, '00:00'))
                }
                className="h-9"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Hasta
              <Input
                type="time"
                value={toTime}
                onChange={event =>
                  setToTime(normalizeTimeInput(event.target.value, '23:59'))
                }
                className="h-9"
              />
            </label>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-xs text-muted-foreground">
              {dateRange?.from || dateRange?.to
                ? getDateRangeLabel(
                    formatFromFilter(dateRange.from, fromTime),
                    formatToFilter(dateRange.to, toTime)
                  )
                : 'Selecciona un rango'}
            </div>
            <div className="flex shrink-0 justify-end gap-2">
              <Button type="button" variant="outline" onClick={clearDateRange}>
                Limpiar
              </Button>
              <Button type="button" onClick={applyDateRange}>
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

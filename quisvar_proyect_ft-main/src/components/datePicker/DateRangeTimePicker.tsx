import { CalendarDays } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Separator } from '../ui/separator';
import {
  formatFromFilter,
  formatToFilter,
  getDateRangeLabel,
  normalizeTimeInput,
  parseDateFilter,
  parseTimeFilter,
} from './datePicker.utils';

interface DateRangeTimePickerProps {
  label?: string;
  from?: string;
  to?: string;
  onApply: (range: { from?: string; to?: string }) => void;
  disabled?: boolean;
}

export const DateRangeTimePicker = ({
  label = 'Fecha',
  from,
  to,
  onApply,
  disabled,
}: DateRangeTimePickerProps) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: parseDateFilter(from),
    to: parseDateFilter(to),
  }));
  const [fromTime, setFromTime] = useState(() =>
    parseTimeFilter(from, '00:00')
  );
  const [toTime, setToTime] = useState(() => parseTimeFilter(to, '23:59'));

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
    onApply({ from: undefined, to: undefined });
  };

  const applyDateRange = () => {
    onApply({
      from: formatFromFilter(dateRange?.from, fromTime),
      to: formatToFilter(dateRange?.to, toTime),
    });
  };

  const dateRangeLabel = getDateRangeLabel(from, to);
  const previewLabel =
    dateRange?.from || dateRange?.to
      ? getDateRangeLabel(
          formatFromFilter(dateRange.from, fromTime),
          formatToFilter(dateRange.to, toTime)
        )
      : 'Selecciona un rango';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-2 border-dashed"
          disabled={disabled}
        >
          <CalendarDays className="size-4" />
          {label}
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
          defaultMonth={dateRange?.from || dateRange?.to}
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
              {previewLabel}
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

import { CalendarDays, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { DateRange, DayPickerProps } from 'react-day-picker';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import {
  dateDisabledMatchers,
  formatRangeDisplay,
  type DateRangeValue,
} from './datePicker.utils';

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  minDate?: Date;
  maxDate?: Date;
  numberOfMonths?: number;
  fullWidth?: boolean;
  className?: string;
  trigger?: ReactNode;
  align?: 'start' | 'center' | 'end';
  weekStartsOn?: DayPickerProps['weekStartsOn'];
  closeOnSelect?: boolean;
  confirmable?: boolean;
}

export const DateRangePicker = ({
  value,
  onChange,
  placeholder = 'Selecciona un rango',
  disabled,
  clearable,
  minDate,
  maxDate,
  numberOfMonths = 1,
  fullWidth,
  className,
  trigger,
  align = 'start',
  weekStartsOn,
  closeOnSelect = true,
  confirmable,
}: DateRangePickerProps) => {
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | null | undefined>();
  const selected: DateRange | undefined =
    value[0] || value[1]
      ? {
          from: value[0] || undefined,
          to: value[1] || undefined,
        }
      : undefined;
  const label = formatRangeDisplay(value);
  const calendarRange = confirmable
    ? draftRange === undefined
      ? selected
      : draftRange || undefined
    : selected;
  const calendarLabel = formatRangeDisplay([
    calendarRange?.from || null,
    calendarRange?.to || null,
  ]);

  const clearSelection = () => {
    setDraftRange(null);
    onChange([null, null]);
  };

  const applySelection = () => {
    onChange([draftRange?.from || null, draftRange?.to || null]);
    setOpen(false);
  };

  const defaultTrigger = (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'h-9 justify-start gap-2 border-border bg-background text-left font-normal',
        fullWidth ? 'w-full' : 'w-[15.5rem]',
        !label && 'text-muted-foreground',
        className
      )}
      disabled={disabled}
    >
      <CalendarDays className="size-4" />
      <span className="min-w-0 flex-1 truncate">{label || placeholder}</span>
      {clearable && label ? (
        <span
          role="button"
          tabIndex={-1}
          className="grid size-5 place-items-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={event => {
            event.preventDefault();
            event.stopPropagation();
            clearSelection();
          }}
        >
          <X className="size-3.5" />
        </span>
      ) : null}
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger || defaultTrigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-auto p-2"
        onWheel={event => event.stopPropagation()}
        onOpenAutoFocus={() => {
          if (confirmable) {
            setDraftRange(selected);
          }
        }}
      >
        <Calendar
          mode="range"
          selected={calendarRange}
          defaultMonth={calendarRange?.from || calendarRange?.to}
          onSelect={range => {
            if (confirmable) {
              setDraftRange(range);
              return;
            }

            onChange([range?.from || null, range?.to || null]);
            if (
              closeOnSelect &&
              range?.from &&
              range?.to &&
              range.from.getTime() !== range.to.getTime()
            ) {
              setOpen(false);
            }
          }}
          disabled={dateDisabledMatchers(minDate, maxDate)}
          numberOfMonths={numberOfMonths}
          weekStartsOn={weekStartsOn}
          autoFocus
        />
        {confirmable ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-1 pt-2">
            <div className="min-w-0 text-xs text-muted-foreground">
              {calendarLabel || 'Selecciona un rango'}
            </div>
            <div className="flex shrink-0 justify-end gap-2">
              <Button type="button" variant="outline" onClick={clearSelection}>
                Limpiar
              </Button>
              <Button type="button" onClick={applySelection}>
                Aplicar
              </Button>
            </div>
          </div>
        ) : label ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-1 pt-2">
            <Badge variant="secondary" className="min-w-0 truncate rounded-sm">
              {label}
            </Badge>
            {clearable ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSelection}
              >
                Limpiar
              </Button>
            ) : null}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

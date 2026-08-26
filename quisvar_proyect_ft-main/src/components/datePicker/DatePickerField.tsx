import { CalendarDays, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { DayPickerProps } from 'react-day-picker';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { dateDisabledMatchers, formatDateDisplay } from './datePicker.utils';

interface DatePickerFieldProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  minDate?: Date;
  maxDate?: Date;
  fullWidth?: boolean;
  className?: string;
  trigger?: ReactNode;
  align?: 'start' | 'center' | 'end';
  weekStartsOn?: DayPickerProps['weekStartsOn'];
}

export const DatePickerField = ({
  value,
  onChange,
  placeholder = 'Selecciona una fecha',
  disabled,
  clearable,
  minDate,
  maxDate,
  fullWidth,
  className,
  trigger,
  align = 'start',
  weekStartsOn,
}: DatePickerFieldProps) => {
  const [open, setOpen] = useState(false);
  const label = formatDateDisplay(value);

  const defaultTrigger = (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'h-9 justify-start gap-2 border-border bg-background text-left font-normal',
        fullWidth ? 'w-full' : 'w-[13rem]',
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
            onChange(null);
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
      >
        <Calendar
          mode="single"
          selected={value || undefined}
          defaultMonth={value || undefined}
          onSelect={date => {
            onChange(date || null);
            setOpen(false);
          }}
          disabled={dateDisabledMatchers(minDate, maxDate)}
          weekStartsOn={weekStartsOn}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
};

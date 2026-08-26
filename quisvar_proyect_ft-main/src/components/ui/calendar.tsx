import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from 'lucide-react';
import {
  DayPicker,
  type ChevronProps,
  type DayPickerProps,
} from 'react-day-picker';

import { buttonVariants } from './button';
import { cn } from '@/lib/utils';

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        root: 'w-fit',
        months: 'flex flex-col gap-4 sm:flex-row',
        month: 'space-y-4',
        month_caption: 'relative flex h-8 items-center justify-center',
        caption_label: 'text-sm font-medium',
        nav: 'flex items-center gap-1',
        button_previous: cn(
          buttonVariants({ variant: 'outline', size: 'icon-sm' }),
          'absolute left-0 top-0 bg-transparent opacity-60 hover:opacity-100'
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline', size: 'icon-sm' }),
          'absolute right-0 top-0 bg-transparent opacity-60 hover:opacity-100'
        ),
        chevron: 'size-4',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground',
        weeks: 'flex flex-col gap-1',
        week: 'flex w-full gap-1',
        day: cn(
          'relative size-9 rounded-md p-0 text-center text-sm',
          'focus-within:relative focus-within:z-20',
          'has-data-[outside=true]:text-muted-foreground has-data-[outside=true]:opacity-50',
          'has-data-[disabled=true]:pointer-events-none has-data-[disabled=true]:opacity-50'
        ),
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-9 p-0 font-normal aria-selected:opacity-100'
        ),
        today: 'bg-muted text-foreground',
        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        range_start:
          'rounded-l-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
        range_middle:
          'rounded-none bg-muted text-foreground hover:bg-muted hover:text-foreground',
        range_end:
          'rounded-r-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
        outside: 'text-muted-foreground opacity-50',
        disabled: 'pointer-events-none opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: CalendarChevron,
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarChevron({ className, orientation, ...props }: ChevronProps) {
  const iconClassName = cn('size-4', className);

  if (orientation === 'left') {
    return <ChevronLeft className={iconClassName} {...props} />;
  }

  if (orientation === 'right') {
    return <ChevronRight className={iconClassName} {...props} />;
  }

  if (orientation === 'up') {
    return <ChevronUp className={iconClassName} {...props} />;
  }

  return <ChevronDown className={iconClassName} {...props} />;
}

export { Calendar };

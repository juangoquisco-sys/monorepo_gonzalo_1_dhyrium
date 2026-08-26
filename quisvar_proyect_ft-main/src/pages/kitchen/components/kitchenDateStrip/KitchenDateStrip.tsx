import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import {
  PiCalendarBlankBold,
  PiCaretLeftBold,
  PiCaretRightBold,
} from 'react-icons/pi';
import DatePickerCustom from '@/components/datePickerCustom/DatePickerCustom';
import dayjsSpanish, { formatDateUtcRHF } from '@/utils/dayjsSpanish';
import './kitchenDateStrip.css';

interface KitchenDateStripProps {
  value: string;
  onChange: (date: string) => void;
  isLoading?: boolean;
  windowSize?: number;
  showCalendar?: boolean;
}

interface CalendarTriggerProps {
  onClick?: () => void;
  disabled?: boolean;
}

const CalendarTrigger = forwardRef<HTMLButtonElement, CalendarTriggerProps>(
  ({ onClick, disabled }, ref) => (
    <button
      ref={ref}
      type="button"
      className="kitchenDateStrip-calendarBtn"
      onClick={onClick}
      disabled={disabled}
      aria-label="Seleccionar fecha en calendario"
    >
      <PiCalendarBlankBold size={18} />
      <span>Calendario</span>
    </button>
  )
);

const normalizeWindow = (value: number, min: number, max: number) => {
  const clampedValue = Math.min(Math.max(value, min), max);
  return clampedValue % 2 === 0 ? clampedValue - 1 : clampedValue;
};

const KitchenDateStrip = ({
  value,
  onChange,
  isLoading = false,
  windowSize = 9,
  showCalendar = true,
}: KitchenDateStripProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const dateRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [visibleDays, setVisibleDays] = useState(() =>
    normalizeWindow(windowSize, 3, Math.max(windowSize, 3))
  );

  useEffect(() => {
    const trackElement = trackRef.current;

    if (!trackElement || typeof ResizeObserver === 'undefined') {
      setVisibleDays(normalizeWindow(windowSize, 3, Math.max(windowSize, 3)));
      return;
    }

    const resizeObserver = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? 0;
      const cardMinWidth = width < 640 ? 102 : 116;
      const gap = width < 640 ? 8 : 10;
      const maxVisibleDays = Math.max(windowSize, 3);
      const estimatedDays = Math.floor((width + gap) / (cardMinWidth + gap));
      setVisibleDays(normalizeWindow(estimatedDays, 3, maxVisibleDays));
    });

    resizeObserver.observe(trackElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [windowSize]);

  const dates = useMemo(() => {
    const selectedDate = dayjsSpanish(value);
    const center = Math.floor(visibleDays / 2);

    return Array.from({ length: visibleDays }, (_, index) => {
      const currentDate = selectedDate.add(index - center, 'day');

      return {
        value: formatDateUtcRHF(currentDate.toDate()),
        weekday: currentDate.format('ddd').replace('.', '').toUpperCase(),
        dayMonth: currentDate.format('D MMM').toUpperCase(),
        isToday: currentDate.isSame(dayjsSpanish(), 'day'),
        isSelected: currentDate.isSame(selectedDate, 'day'),
      };
    });
  }, [value, visibleDays]);

  useEffect(() => {
    const trackElement = trackRef.current;
    const selectedElement = dateRefs.current[value];

    if (!trackElement || !selectedElement) return;
    if (trackElement.scrollWidth <= trackElement.clientWidth) return;

    const nextLeft =
      selectedElement.offsetLeft -
      trackElement.clientWidth / 2 +
      selectedElement.clientWidth / 2;

    trackElement.scrollTo({
      left: Math.max(0, nextLeft),
      behavior: 'smooth',
    });
  }, [value, dates.length]);

  const moveDate = (direction: -1 | 1) => {
    const nextDate = dayjsSpanish(value).add(direction, 'day');
    onChange(formatDateUtcRHF(nextDate.toDate()));
  };

  const handleCalendarChange = (date: Date | null) => {
    if (!date) return;
    onChange(formatDateUtcRHF(date));
  };

  return (
    <div className="kitchenDateStrip">
      <div className="kitchenDateStrip-shell">
        <button
          type="button"
          className="kitchenDateStrip-navBtn"
          onClick={() => moveDate(-1)}
          disabled={isLoading}
          aria-label="Ir al dia anterior"
        >
          <PiCaretLeftBold size={18} />
        </button>

        <div
          ref={trackRef}
          className="kitchenDateStrip-track"
          role="list"
          aria-label="Fechas cercanas"
          style={{
            gridTemplateColumns: `repeat(${dates.length}, minmax(6.5rem, 1fr))`,
          }}
        >
          {dates.map(date => (
            <button
              key={date.value}
              ref={element => {
                dateRefs.current[date.value] = element;
              }}
              type="button"
              role="listitem"
              className={`kitchenDateStrip-card ${
                date.isSelected ? 'kitchenDateStrip-card-selected' : ''
              } ${date.isToday ? 'kitchenDateStrip-card-today' : ''}`}
              onClick={() => onChange(date.value)}
              disabled={isLoading}
              aria-pressed={date.isSelected}
            >
              <span className="kitchenDateStrip-weekday">{date.weekday}</span>
              <strong className="kitchenDateStrip-dayMonth">
                {date.dayMonth}
              </strong>
              {date.isToday && (
                <span className="kitchenDateStrip-todayMark">Hoy</span>
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="kitchenDateStrip-navBtn"
          onClick={() => moveDate(1)}
          disabled={isLoading}
          aria-label="Ir al dia siguiente"
        >
          <PiCaretRightBold size={18} />
        </button>
      </div>

      {showCalendar && (
        <DatePickerCustom
          selected={dayjsSpanish(value).toDate()}
          onChange={handleCalendarChange}
          customInput={<CalendarTrigger disabled={isLoading} />}
          dateFormat="dd/MM/yyyy"
          popperPlacement="bottom-end"
          wrapperClassName="kitchenDateStrip-picker"
        />
      )}
    </div>
  );
};

export default KitchenDateStrip;

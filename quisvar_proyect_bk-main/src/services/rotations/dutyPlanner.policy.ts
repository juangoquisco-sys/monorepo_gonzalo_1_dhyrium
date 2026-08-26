import {
  dutyRecurrenceSchema,
  type DutyDraft,
  type DutyRecurrence,
  type DutySlot,
  type DutyWeekday,
} from '@/services/rotations/duty.schema';

export interface DutyPlanningConfiguration {
  validFrom: string;
  validUntil?: string | null;
  assignmentStrategy:
    | 'ONE_OWNER_PER_PERIOD'
    | 'ONE_OWNER_PER_SLOT'
    | 'DISTRIBUTE_PARTICIPANTS';
  recurrence: DutyRecurrence;
  excludedOccurrenceKeys?: string[];
}

export interface PlannedDutyOccurrence {
  occurrenceKey: string;
  periodStart: string;
  periodEnd: string;
  dueOn: string;
  slots: Array<{
    slotKey: string;
    slotLabel: string;
    slotInstructions: string | null;
  }>;
}

export interface PlannedDutyAssignment
  extends Omit<PlannedDutyOccurrence, 'slots'> {
  slotKey: string;
  slotLabel: string;
  slotInstructions: string | null;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_OFFSET: Record<DutyWeekday, number> = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
  SATURDAY: 5,
  SUNDAY: 6,
};
const WEEKDAY_BY_UTC_DAY: DutyWeekday[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

class DutyPlannerPolicy {
  static parseDate(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  static formatDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  static addDays(value: string, days: number) {
    return this.formatDate(
      new Date(this.parseDate(value).getTime() + days * DAY_IN_MS)
    );
  }

  static startOfWeek(value: string, weekStartsOn: DutyWeekday) {
    const date = this.parseDate(value);
    const weekdayOffset = (date.getUTCDay() + 6) % 7;
    const offset = (weekdayOffset - WEEKDAY_OFFSET[weekStartsOn] + 7) % 7;
    return this.addDays(value, -offset);
  }

  static weekdayOf(value: string): DutyWeekday {
    return WEEKDAY_BY_UTC_DAY[this.parseDate(value).getUTCDay()];
  }

  static todayInLima(referenceDate = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(referenceDate);
    const values = Object.fromEntries(
      parts.map(part => [part.type, part.value])
    );
    return `${values.year}-${values.month}-${values.day}`;
  }

  static horizonEnd(referenceDate = new Date(), horizonDays = 60) {
    return this.addDays(this.todayInLima(referenceDate), horizonDays);
  }

  static normalizedSlots(
    strategy: DutyPlanningConfiguration['assignmentStrategy'],
    slots: DutySlot[]
  ) {
    if (strategy === 'DISTRIBUTE_PARTICIPANTS') return [];
    if (strategy === 'ONE_OWNER_PER_PERIOD') {
      return [
        {
          slotKey: 'period',
          slotLabel: slots.length === 1 ? slots[0].label : 'Periodo completo',
          slotInstructions:
            slots.length === 1 ? slots[0].instructions ?? null : null,
        },
      ];
    }
    return slots.map(slot => ({
      slotKey: slot.key,
      slotLabel: slot.label,
      slotInstructions: slot.instructions ?? null,
    }));
  }

  static isCompleteAndInRange(
    periodStart: string,
    periodEnd: string,
    configuration: DutyPlanningConfiguration,
    rangeFrom: string,
    rangeTo: string
  ) {
    return (
      periodStart >= configuration.validFrom &&
      (!configuration.validUntil || periodEnd <= configuration.validUntil) &&
      periodStart >= rangeFrom &&
      periodEnd <= rangeTo
    );
  }

  static makeOccurrence(
    occurrenceKey: string,
    periodStart: string,
    periodEnd: string,
    configuration: DutyPlanningConfiguration,
    slots: DutySlot[]
  ): PlannedDutyOccurrence {
    return {
      occurrenceKey,
      periodStart,
      periodEnd,
      dueOn: periodEnd,
      slots: this.normalizedSlots(configuration.assignmentStrategy, slots),
    };
  }

  static planDailyOrOnce(
    configuration: DutyPlanningConfiguration,
    rangeFrom: string,
    rangeTo: string
  ) {
    const { recurrence } = configuration;
    const occurrences: PlannedDutyOccurrence[] = [];
    const excluded = new Set(configuration.excludedOccurrenceKeys ?? []);

    if (recurrence.frequency === 'ONCE') {
      if (
        !excluded.has(recurrence.date) &&
        this.isCompleteAndInRange(
          recurrence.date,
          recurrence.date,
          configuration,
          rangeFrom,
          rangeTo
        )
      ) {
        occurrences.push(
          this.makeOccurrence(
            recurrence.date,
            recurrence.date,
            recurrence.date,
            configuration,
            recurrence.slots
          )
        );
      }
      return occurrences;
    }

    if (recurrence.frequency !== 'DAILY') return occurrences;
    const activeOffsets = new Set(
      recurrence.weekdays.map(day => WEEKDAY_OFFSET[day])
    );
    for (
      let cursor = rangeFrom;
      cursor <= rangeTo;
      cursor = this.addDays(cursor, 1)
    ) {
      const weekdayOffset = (this.parseDate(cursor).getUTCDay() + 6) % 7;
      if (
        activeOffsets.has(weekdayOffset) &&
        !excluded.has(cursor) &&
        this.isCompleteAndInRange(
          cursor,
          cursor,
          configuration,
          rangeFrom,
          rangeTo
        )
      ) {
        occurrences.push(
          this.makeOccurrence(
            cursor,
            cursor,
            cursor,
            configuration,
            recurrence.slots
          )
        );
      }
    }
    return occurrences;
  }

  static planWeekly(
    configuration: DutyPlanningConfiguration,
    rangeFrom: string,
    rangeTo: string
  ) {
    const { recurrence } = configuration;
    if (recurrence.frequency !== 'WEEKLY') return [];
    const offsets = recurrence.weekdays
      .map(
        day =>
          (WEEKDAY_OFFSET[day] - WEEKDAY_OFFSET[recurrence.weekStartsOn] + 7) %
          7
      )
      .sort((first, second) => first - second);
    const firstOffset = offsets[0];
    const lastOffset = offsets[offsets.length - 1];
    const excluded = new Set(configuration.excludedOccurrenceKeys ?? []);
    const occurrences: PlannedDutyOccurrence[] = [];

    for (
      let weekStart = this.startOfWeek(rangeFrom, recurrence.weekStartsOn);
      weekStart <= rangeTo;
      weekStart = this.addDays(weekStart, 7)
    ) {
      const periodStart = this.addDays(weekStart, firstOffset);
      const periodEnd = this.addDays(weekStart, lastOffset);
      if (
        !excluded.has(weekStart) &&
        weekStart >= configuration.validFrom &&
        weekStart >= rangeFrom &&
        this.isCompleteAndInRange(
          periodStart,
          periodEnd,
          configuration,
          rangeFrom,
          rangeTo
        )
      ) {
        occurrences.push(
          this.makeOccurrence(
            weekStart,
            periodStart,
            periodEnd,
            configuration,
            recurrence.slots
          )
        );
      }
    }
    return occurrences;
  }

  static planMonthly(
    configuration: DutyPlanningConfiguration,
    rangeFrom: string,
    rangeTo: string
  ) {
    const { recurrence } = configuration;
    if (recurrence.frequency !== 'MONTHLY') return [];
    const excluded = new Set(configuration.excludedOccurrenceKeys ?? []);
    const occurrences: PlannedDutyOccurrence[] = [];
    const rangeStartDate = this.parseDate(rangeFrom);
    const rangeEndDate = this.parseDate(rangeTo);

    for (
      let year = rangeStartDate.getUTCFullYear(),
        month = rangeStartDate.getUTCMonth();
      year < rangeEndDate.getUTCFullYear() ||
      (year === rangeEndDate.getUTCFullYear() &&
        month <= rangeEndDate.getUTCMonth());
      month += 1
    ) {
      if (month > 11) {
        month = 0;
        year += 1;
      }
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      for (const day of [...recurrence.daysOfMonth].sort((a, b) => a - b)) {
        if (day > daysInMonth) continue;
        const date = this.formatDate(new Date(Date.UTC(year, month, day)));
        if (
          !excluded.has(date) &&
          this.isCompleteAndInRange(
            date,
            date,
            configuration,
            rangeFrom,
            rangeTo
          )
        ) {
          occurrences.push(
            this.makeOccurrence(
              date,
              date,
              date,
              configuration,
              recurrence.slots
            )
          );
        }
      }
    }
    return occurrences;
  }

  static plan(
    configuration: DutyPlanningConfiguration,
    rangeFrom: string,
    rangeTo: string
  ) {
    if (rangeFrom > rangeTo) return [];
    switch (configuration.recurrence.frequency) {
      case 'ONCE':
      case 'DAILY':
        return this.planDailyOrOnce(configuration, rangeFrom, rangeTo);
      case 'WEEKLY':
        return this.planWeekly(configuration, rangeFrom, rangeTo);
      case 'MONTHLY':
        return this.planMonthly(configuration, rangeFrom, rangeTo);
    }
  }

  static flatten(
    occurrences: PlannedDutyOccurrence[]
  ): PlannedDutyAssignment[] {
    return occurrences.flatMap(occurrence =>
      occurrence.slots.map(slot => ({
        occurrenceKey: occurrence.occurrenceKey,
        periodStart: occurrence.periodStart,
        periodEnd: occurrence.periodEnd,
        dueOn: occurrence.dueOn,
        slotKey: slot.slotKey,
        slotLabel: slot.slotLabel,
        slotInstructions: slot.slotInstructions,
      }))
    );
  }

  static fromDraft(draft: DutyDraft): DutyPlanningConfiguration {
    return {
      validFrom: draft.validFrom,
      validUntil: draft.validUntil,
      assignmentStrategy: draft.assignmentStrategy,
      recurrence: this.recurrenceFromDraft(draft),
      excludedOccurrenceKeys: draft.excludedOccurrenceKeys,
    };
  }

  static recurrenceFromDraft(draft: DutyDraft): DutyRecurrence {
    const recurrence = {
      ...draft.recurrence,
      slots:
        draft.assignmentStrategy === 'ONE_OWNER_PER_PERIOD'
          ? [{ key: 'period', label: 'Periodo completo' }]
          : draft.recurrence.slots,
      ...(draft.recurrence.frequency === 'WEEKLY'
        ? { weekStartsOn: this.weekdayOf(draft.validFrom) }
        : {}),
    };
    return dutyRecurrenceSchema.parse(recurrence);
  }
}

export default DutyPlannerPolicy;

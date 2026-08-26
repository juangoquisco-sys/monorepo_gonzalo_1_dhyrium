import type { AreaSpecialty } from '@/types/types';

export const calcDates = (start: Date, end: Date) => {
  const _start = new Date(start);
  const _end = new Date(end);

  const totalMonths =
    (_end.getFullYear() - _start.getFullYear()) * 12 +
    (_end.getMonth() - _start.getMonth());

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  return { years, months };
};
export const sumAllExperience = (datos: AreaSpecialty[]) => {
  let totalYears = 0;
  let totalMonths = 0;

  for (const dato of datos) {
    const { startDate, untilDate } = dato;
    const result = calcDates(startDate, untilDate);

    totalYears += result.years;
    totalMonths += result.months;
  }
  totalYears += Math.floor(totalMonths / 12);
  totalMonths = totalMonths % 12;

  return { totalYears, totalMonths };
};

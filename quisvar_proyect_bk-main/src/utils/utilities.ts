import { PaginationOptions, WeekDaysType } from '@/types/types';
import AppError from '@/utils/appError';

class Utilities {
  public static getRangeDate(date: Date = new Date()) {
    const currentYear = date.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);
    return { startOfYear, endOfYear, currentYear };
  }

  public static getDatesOnWeek(
    date: string | Date = new Date(),
    dayOnWeek: number = 7,
    params?: Intl.DateTimeFormatOptions & {
      language: Intl.LocalesArgument;
    }
  ) {
    const language = params?.language || 'es-PE';
    const config: Intl.DateTimeFormatOptions = {
      timeZone: 'America/Lima',
      weekday: 'long',
    };
    const now = new Date(date);
    const utcTime = now.getTimezoneOffset() / 60;
    now.setHours(now.getHours() + utcTime);
    //----------- first day of week ----------------
    const firstDate = new Date(now);
    firstDate.setDate(now.getDate() - now.getDay());
    //----------- last day of week ----------------
    const lastDate = new Date(firstDate);
    lastDate.setDate(firstDate.getDate() + dayOnWeek);
    //----------- days on week ----------------
    const _config = { language, ...config, ...params };
    const listDates: WeekDaysType[] = [];
    new Array(dayOnWeek).fill(0).forEach((_, i) => {
      const day = new Date(firstDate);
      day.setDate(firstDate.getDate() + i);
      day.setHours(0, 0, 0, 0);
      const title = day.toLocaleString(language, { ...config, ...params });
      const isActive = day.getDate() === new Date().getDate();
      const _data = {
        id: day.getDate(),
        date: day,
        _id: day.getTime(),
        title,
        isActive,
        tasks: [],
      };
      listDates.push(_data);
    });
    return { firstDate, lastDate, config: _config, listDates };
  }

  public static getPage({ limit, offset, page }: PaginationOptions) {
    if (offset !== undefined) return offset;
    if (!offset && page === undefined) return undefined;
    const newOffset = limit && page && limit * page;
    return newOffset;
  }

  public static validateDate(date: Date, options?: { label?: string }) {
    if (date && !(date instanceof Date)) {
      throw new AppError('Fecha ' + (options?.label || '') + ' invalida', 400);
    }
    return date;
  }

  public static roundDecimal(
    n: number,
    decimal: number = 2,
    type?: 'upper' | 'lower'
  ) {
    const aux = Math.pow(10, decimal);
    if (type === 'upper') return Math.floor(n * aux) / aux;
    if (type === 'lower') return Math.ceil(n * aux) / aux;
    return Math.round(n * aux) / aux;
  }
}
export default Utilities;

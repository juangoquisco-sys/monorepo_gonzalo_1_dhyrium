const ZONE_LOCALE = 'es-PE';
const CONFIG_DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  // timeZone: 'GMT',
  timeZone: 'America/Lima',
};

export const formatDate = (
  date: Date,
  config?: Intl.DateTimeFormatOptions
): string => {
  const formato = new Intl.DateTimeFormat(ZONE_LOCALE, {
    ...config,
    ...CONFIG_DATE_TIME_FORMAT,
  }).format;
  return formato(date);
};

export const parseDate = (value: string, sing: string, replace: string) => {
  const toArray = value.split(sing);
  const reverseValue = [...toArray].reverse().join();
  const parseValue = reverseValue.replace(/,/g, replace);
  return parseValue; //retorna: yyyy/mm/dd
};

export const actualDate = (date: Date | string | undefined) => {
  date = new Date(date ?? '');
  const dailyDate = new Date(date);
  dailyDate.setDate(dailyDate.getDate() + 1);
  return _date(dailyDate);
};

export const _date = (date: Date) => {
  const _date = formatDate(new Date(date), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parse = parseDate(_date, '/', '-');
  return parse;
};

export const formatDateToDMY = (date: string) => {
  const dateSplit = date.split('-');
  return `${dateSplit[2]}/${dateSplit[1]}/${dateSplit[0]}`;
};
export const parseUTC = (date: string) => {
  const getDate = new Date(date).getTime();
  const UTCHours = new Date().getUTCHours();
  const hours = new Date().getHours();
  const parseUTC = UTCHours - hours;
  const _utc = parseUTC * 60 * 60 * 1000;
  return new Date(getDate + _utc);
};

export const getValueByType = (value: string, type: string) => {
  if (type === 'select-one') return parseInt(value);
  if (type === 'date') return parseUTC(value);
  if (type === 'number') return parseFloat(value);
  return value;
};

export const getTimeOut = (
  assignedAt: string | undefined | Date,
  untilDate: string | undefined | Date
) => {
  if (!assignedAt || !untilDate) return 0;
  const untilDateTime =
    new Date(untilDate).getTime() - new Date(assignedAt).getTime();
  const transformToHours = Math.floor(untilDateTime / 1000 / 60 / 60);
  return transformToHours;
};

export const millisecondsToDays = (value: number) =>
  value / (1000 * 60 * 60 * 24);

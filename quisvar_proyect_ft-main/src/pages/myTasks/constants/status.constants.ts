import { STATUS_TEXT } from '@/pages/specialities/models/taskStatusText';

export const STATUS: Record<string, string>[] = [
  { name: STATUS_TEXT.UNRESOLVED, id: 'UNRESOLVED' },
  { name: STATUS_TEXT.PROCESS, id: 'PROCESS' },
  { name: STATUS_TEXT.INREVIEW, id: 'INREVIEW' },
  { name: STATUS_TEXT.DENIED, id: 'DENIED' },
  { name: STATUS_TEXT.REVIEWED, id: 'REVIEWED' },
  { name: STATUS_TEXT.DONE, id: 'DONE' },
  { name: STATUS_TEXT.LIQUIDATION, id: 'LIQUIDATION' },
];

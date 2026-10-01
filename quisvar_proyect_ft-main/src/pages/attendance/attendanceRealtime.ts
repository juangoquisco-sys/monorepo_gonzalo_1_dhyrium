export const ATTENDANCE_REALTIME_EVENTS = [
  'server:attendance-list-opened',
  'server:attendance-marked',
  'server:attendance-status-updated',
  'server:attendance-list-closed',
  'server:attendance-list-finalized',
  'server:attendance-list-discarded',
  'server:attendance-capture-window-closing-soon',
] as const;

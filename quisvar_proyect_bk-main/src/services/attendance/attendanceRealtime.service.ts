import SocketManager from '@/models/SocketManager';

export const ATTENDANCE_SOCKET_EVENTS = {
  opened: 'server:attendance-list-opened',
  marked: 'server:attendance-marked',
  statusUpdated: 'server:attendance-status-updated',
  closed: 'server:attendance-list-closed',
  finalized: 'server:attendance-list-finalized',
  discarded: 'server:attendance-list-discarded',
} as const;

type AttendanceSocketUser = {
  role?: {
    menuPoints?: Array<{
      route?: string;
      menu?: Array<{ route?: string; typeRol?: string } | undefined> | null;
    }>;
  } | null;
};

type AttendanceListEvent = {
  listId: number;
  state: 'OPEN' | 'REVIEW' | 'FINALIZED';
};

type AttendanceMarkedEvent = AttendanceListEvent & {
  userId: number;
  markedAt: string;
};

type AttendanceStatusUpdatedEvent = AttendanceListEvent & {
  batchId: string;
};

type AttendanceListDiscardedEvent = {
  listId: number;
};

const canManageAttendance = (user?: AttendanceSocketUser | null) =>
  Boolean(
    user?.role?.menuPoints?.some(
      menuPoint =>
        menuPoint.route === 'control-asistencia' &&
        menuPoint.menu?.some(
          subMenu => subMenu?.route === 'registro' && subMenu.typeRol === 'MOD'
        )
    )
  );

class AttendanceRealtimeService {
  private static emitToManagers(event: string, payload: unknown) {
    try {
      const io = SocketManager.getInstance();
      io.sockets.sockets.forEach(socket => {
        if (
          canManageAttendance(
            socket.data.user as AttendanceSocketUser | undefined
          )
        ) {
          socket.emit(event, payload);
        }
      });
    } catch {
      // SocketManager is intentionally optional in scripts and focused tests.
    }
  }

  private static emitToUsers(
    userIds: number[],
    event: string,
    payload: unknown
  ) {
    try {
      const io = SocketManager.getInstance();
      [...new Set(userIds)].forEach(userId => {
        io.to(String(userId)).emit(event, payload);
      });
    } catch {
      // SocketManager is intentionally optional in scripts and focused tests.
    }
  }

  static opened(payload: AttendanceListEvent, userIds: number[]) {
    this.emitToUsers(userIds, ATTENDANCE_SOCKET_EVENTS.opened, payload);
    this.emitToManagers(ATTENDANCE_SOCKET_EVENTS.opened, payload);
  }

  static marked(payload: AttendanceMarkedEvent) {
    this.emitToUsers(
      [payload.userId],
      ATTENDANCE_SOCKET_EVENTS.marked,
      payload
    );
    this.emitToManagers(ATTENDANCE_SOCKET_EVENTS.marked, payload);
  }

  static statusUpdated(
    payload: AttendanceStatusUpdatedEvent,
    userIds: number[]
  ) {
    this.emitToUsers(userIds, ATTENDANCE_SOCKET_EVENTS.statusUpdated, payload);
    this.emitToManagers(ATTENDANCE_SOCKET_EVENTS.statusUpdated, payload);
  }

  static closed(payload: AttendanceListEvent, userIds: number[]) {
    this.emitToUsers(userIds, ATTENDANCE_SOCKET_EVENTS.closed, payload);
    this.emitToManagers(ATTENDANCE_SOCKET_EVENTS.closed, payload);
  }

  static finalized(payload: AttendanceListEvent, userIds: number[]) {
    this.emitToUsers(userIds, ATTENDANCE_SOCKET_EVENTS.finalized, payload);
    this.emitToManagers(ATTENDANCE_SOCKET_EVENTS.finalized, payload);
  }

  static discarded(payload: AttendanceListDiscardedEvent, userIds: number[]) {
    this.emitToUsers(userIds, ATTENDANCE_SOCKET_EVENTS.discarded, payload);
    this.emitToManagers(ATTENDANCE_SOCKET_EVENTS.discarded, payload);
  }
}

export default AttendanceRealtimeService;

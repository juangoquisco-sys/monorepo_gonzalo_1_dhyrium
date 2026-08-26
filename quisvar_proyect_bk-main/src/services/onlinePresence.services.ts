export const SYSTEM_USERS_ROOM = 'system-users';
export const SYSTEM_SOCKET_USERS_CHANGED_EVENT =
  'server:system-socket-users-changed';

export type OnlinePresenceSortBy =
  | 'fullName'
  | 'email'
  | 'connections'
  | 'connectedAt'
  | 'lastConnectionAt';

export type OnlinePresenceSortDir = 'asc' | 'desc';

export interface OnlinePresenceConnectionInput {
  socketId: string;
  connectedAt: Date;
  rooms: string[];
  ip: string | null;
  userAgent: string | null;
}

export interface OnlinePresenceConnection
  extends OnlinePresenceConnectionInput {}

export interface OnlinePresenceUserInput {
  userId: number;
  fullName: string;
  email: string;
  dni?: string;
  roleName?: string | null;
  offices: string[];
}

export interface OnlineUserPresence extends OnlinePresenceUserInput {
  connectionsBySocketId: Map<string, OnlinePresenceConnection>;
}

export interface OnlinePresenceFilters {
  search?: string;
  userId?: number;
  office?: string;
  role?: string;
  multiple?: boolean;
  room?: string;
  sortBy?: OnlinePresenceSortBy;
  sortDir?: OnlinePresenceSortDir;
  page?: number;
  limit?: number;
}

export interface OnlinePresenceConnectionSnapshot {
  socketId: string;
  connectedAt: string;
  rooms: string[];
  ip: string | null;
  userAgent: string | null;
}

export interface OnlinePresenceUserSnapshot {
  userId: number;
  fullName: string;
  email: string;
  dni?: string;
  roleName?: string | null;
  offices: string[];
  connections: number;
  connectedAt: string | null;
  lastConnectionAt: string | null;
  socketIds: string[];
  rooms: string[];
  userAgents: string[];
  ips: string[];
  connectionDetails: OnlinePresenceConnectionSnapshot[];
}

export interface OnlinePresenceSnapshot {
  generatedAt: string;
  summary: {
    totalUsers: number;
    totalConnections: number;
    usersWithMultipleConnections: number;
  };
  data: OnlinePresenceUserSnapshot[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const normalizeText = (value?: string | null) =>
  (value || '').trim().toLowerCase();

const uniqueStrings = (values: Array<string | null | undefined>) =>
  Array.from(
    new Set(
      values
        .map(value => (value || '').trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b));

const normalizeRooms = (rooms: string[]) => uniqueStrings(rooms);

const clampPositiveInteger = (
  value: number | undefined,
  fallback: number,
  max?: number
) => {
  if (!Number.isFinite(value) || !value || value < 1) return fallback;
  const integer = Math.floor(value);
  return max ? Math.min(integer, max) : integer;
};

const compareNullableDates = (
  left: string | null,
  right: string | null,
  direction: OnlinePresenceSortDir
) => {
  if (!left && !right) return 0;
  if (!left) return direction === 'asc' ? 1 : -1;
  if (!right) return direction === 'asc' ? -1 : 1;
  return new Date(left).getTime() - new Date(right).getTime();
};

class OnlinePresenceService {
  private static users = new Map<number, OnlineUserPresence>();

  static clear() {
    this.users.clear();
  }

  static registerConnection(
    user: OnlinePresenceUserInput,
    connection: OnlinePresenceConnectionInput
  ) {
    const currentUser =
      this.users.get(user.userId) ||
      ({
        ...user,
        offices: uniqueStrings(user.offices),
        connectionsBySocketId: new Map<string, OnlinePresenceConnection>(),
      } satisfies OnlineUserPresence);

    currentUser.fullName = user.fullName;
    currentUser.email = user.email;
    currentUser.dni = user.dni;
    currentUser.roleName = user.roleName;
    currentUser.offices = uniqueStrings(user.offices);
    currentUser.connectionsBySocketId.set(connection.socketId, {
      ...connection,
      rooms: normalizeRooms(connection.rooms),
    });
    this.users.set(user.userId, currentUser);
  }

  static updateConnectionRooms(
    userId: number,
    socketId: string,
    rooms: string[]
  ) {
    const user = this.users.get(userId);
    const connection = user?.connectionsBySocketId.get(socketId);
    if (!connection) return;
    connection.rooms = normalizeRooms(rooms);
  }

  static unregisterConnection(userId: number, socketId: string) {
    const user = this.users.get(userId);
    if (!user) return;

    user.connectionsBySocketId.delete(socketId);
    if (user.connectionsBySocketId.size === 0) {
      this.users.delete(userId);
    }
  }

  static getSnapshot(
    filters: OnlinePresenceFilters = {}
  ): OnlinePresenceSnapshot {
    const page = clampPositiveInteger(filters.page, DEFAULT_PAGE);
    const limit = clampPositiveInteger(filters.limit, DEFAULT_LIMIT, MAX_LIMIT);
    const sortBy = filters.sortBy || 'lastConnectionAt';
    const sortDir = filters.sortDir || 'desc';

    const rows = Array.from(this.users.values()).map(user =>
      this.toUserSnapshot(user)
    );
    const filteredRows = rows.filter(row => this.matchesFilters(row, filters));
    const sortedRows = this.sortRows(filteredRows, sortBy, sortDir);
    const total = sortedRows.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const start = (page - 1) * limit;

    return {
      generatedAt: new Date().toISOString(),
      summary: this.buildSummary(rows),
      data: sortedRows.slice(start, start + limit),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  private static buildSummary(rows: OnlinePresenceUserSnapshot[]) {
    return {
      totalUsers: rows.length,
      totalConnections: rows.reduce((total, row) => total + row.connections, 0),
      usersWithMultipleConnections: rows.filter(row => row.connections > 1)
        .length,
    };
  }

  private static toUserSnapshot(
    user: OnlineUserPresence
  ): OnlinePresenceUserSnapshot {
    const connectionDetails = Array.from(user.connectionsBySocketId.values())
      .map(connection => ({
        socketId: connection.socketId,
        connectedAt: connection.connectedAt.toISOString(),
        rooms: normalizeRooms(connection.rooms),
        ip: connection.ip,
        userAgent: connection.userAgent,
      }))
      .sort(
        (left, right) =>
          new Date(left.connectedAt).getTime() -
          new Date(right.connectedAt).getTime()
      );

    const connectedAt = connectionDetails[0]?.connectedAt || null;
    const lastConnectionAt =
      connectionDetails[connectionDetails.length - 1]?.connectedAt || null;

    return {
      userId: user.userId,
      fullName: user.fullName,
      email: user.email,
      dni: user.dni,
      roleName: user.roleName,
      offices: uniqueStrings(user.offices),
      connections: connectionDetails.length,
      connectedAt,
      lastConnectionAt,
      socketIds: connectionDetails.map(connection => connection.socketId),
      rooms: uniqueStrings(
        connectionDetails.flatMap(connection => connection.rooms)
      ),
      userAgents: uniqueStrings(
        connectionDetails.map(connection => connection.userAgent)
      ),
      ips: uniqueStrings(connectionDetails.map(connection => connection.ip)),
      connectionDetails,
    };
  }

  private static matchesFilters(
    row: OnlinePresenceUserSnapshot,
    filters: OnlinePresenceFilters
  ) {
    const search = normalizeText(filters.search);
    if (
      search &&
      ![row.fullName, row.email, row.dni].some(value =>
        normalizeText(value).includes(search)
      )
    ) {
      return false;
    }

    if (filters.userId && row.userId !== filters.userId) return false;

    const office = normalizeText(filters.office);
    if (
      office &&
      !row.offices.some(value => normalizeText(value).includes(office))
    ) {
      return false;
    }

    const role = normalizeText(filters.role);
    if (role && !normalizeText(row.roleName).includes(role)) return false;

    if (filters.multiple && row.connections <= 1) return false;

    const room = normalizeText(filters.room);
    if (room && !row.rooms.some(value => normalizeText(value).includes(room))) {
      return false;
    }

    return true;
  }

  private static sortRows(
    rows: OnlinePresenceUserSnapshot[],
    sortBy: OnlinePresenceSortBy,
    sortDir: OnlinePresenceSortDir
  ) {
    const multiplier = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((left, right) => {
      if (sortBy === 'connections') {
        return (left.connections - right.connections) * multiplier;
      }
      if (sortBy === 'connectedAt' || sortBy === 'lastConnectionAt') {
        return (
          compareNullableDates(left[sortBy], right[sortBy], sortDir) *
          multiplier
        );
      }
      return (
        left[sortBy].localeCompare(right[sortBy], 'es', {
          sensitivity: 'base',
        }) * multiplier
      );
    });
  }
}

export default OnlinePresenceService;

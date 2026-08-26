export type SystemSocketUsersSortBy =
  | 'fullName'
  | 'email'
  | 'connections'
  | 'connectedAt'
  | 'lastConnectionAt';

export type SystemSocketUsersSortDir = 'asc' | 'desc';

export interface SystemSocketUserConnection {
  socketId: string;
  connectedAt: string;
  rooms: string[];
  ip: string | null;
  userAgent: string | null;
}

export interface SystemSocketUser {
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
  connectionDetails: SystemSocketUserConnection[];
}

export interface SystemSocketUsersFilters {
  search?: string;
  userId?: number;
  office?: string;
  role?: string;
  multiple?: boolean;
  room?: string;
  sortBy?: SystemSocketUsersSortBy;
  sortDir?: SystemSocketUsersSortDir;
  page?: number;
  limit?: number;
}

export interface SystemSocketUsersResponse {
  generatedAt: string;
  summary: {
    totalUsers: number;
    totalConnections: number;
    usersWithMultipleConnections: number;
  };
  data: SystemSocketUser[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

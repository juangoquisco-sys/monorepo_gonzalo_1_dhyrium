import type { Prisma } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import {
  withActiveNonRemoteUsers,
  withActiveUsers,
  withNonRemoteUsers,
} from '@/utils/userFilters';
import { orderAttendanceRows } from '@/services/attendance/attendance.policy';

type UserLookupShape = 'full' | 'light';

type UserLookupContextConfig = {
  includeInactiveByDefault: boolean;
  excludeRemote: boolean;
  shape: UserLookupShape;
};

export const USER_LOOKUP_CONTEXT_CONFIG = {
  'user-center': {
    includeInactiveByDefault: true,
    excludeRemote: false,
    shape: 'full',
  },
  attendance: {
    includeInactiveByDefault: false,
    excludeRemote: true,
    shape: 'full',
  },
  'attendance-control': {
    includeInactiveByDefault: false,
    excludeRemote: true,
    shape: 'full',
  },
  rotations: {
    includeInactiveByDefault: false,
    excludeRemote: true,
    shape: 'full',
  },
  audit: {
    includeInactiveByDefault: true,
    excludeRemote: false,
    shape: 'light',
  },
  'frontend-logs': {
    includeInactiveByDefault: true,
    excludeRemote: false,
    shape: 'light',
  },
  licenses: {
    includeInactiveByDefault: false,
    excludeRemote: true,
    shape: 'full',
  },
  'production-bonus': {
    includeInactiveByDefault: false,
    excludeRemote: false,
    shape: 'full',
  },
  projects: {
    includeInactiveByDefault: false,
    excludeRemote: false,
    shape: 'full',
  },
  paymail: {
    includeInactiveByDefault: false,
    excludeRemote: false,
    shape: 'full',
  },
  companies: {
    includeInactiveByDefault: false,
    excludeRemote: false,
    shape: 'full',
  },
  groups: {
    includeInactiveByDefault: false,
    excludeRemote: false,
    shape: 'full',
  },
  offices: {
    includeInactiveByDefault: false,
    excludeRemote: false,
    shape: 'full',
  },
} satisfies Record<string, UserLookupContextConfig>;

export type UserLookupContext = keyof typeof USER_LOOKUP_CONTEXT_CONFIG;

type UserLookupOptions = {
  search?: string;
  limit?: number;
  includeInactive?: boolean;
};

const USER_LOOKUP_SELECT = {
  id: true,
  email: true,
  status: true,
  userType: true,
  profile: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dni: true,
      degree: true,
      description: true,
      job: true,
      phone: true,
      userPc: true,
    },
  },
  role: {
    select: {
      id: true,
      name: true,
      hierarchy: true,
    },
  },
} satisfies Prisma.UsersSelect;

const LOG_USER_LOOKUP_SELECT = {
  id: true,
  email: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.UsersSelect;

type UserLookupRow = Prisma.UsersGetPayload<{
  select: typeof USER_LOOKUP_SELECT;
}>;

type LogUserLookupRow = Prisma.UsersGetPayload<{
  select: typeof LOG_USER_LOOKUP_SELECT;
}>;

type UserWithRoleHierarchy = {
  role: {
    hierarchy: number;
  } | null;
};

export const orderUserLookupRows = <T extends UserWithRoleHierarchy>(
  context: UserLookupContext,
  users: readonly T[]
) => {
  if (context !== 'attendance') return [...users];
  return orderAttendanceRows(users, user => user.role?.hierarchy);
};

const normalizeLimit = (limit?: number) => {
  if (!limit || !Number.isFinite(limit) || limit < 1) return undefined;
  return Math.trunc(limit);
};

const buildSearchWhere = (search?: string): Prisma.UsersWhereInput => {
  const value = search?.trim();
  if (!value) return {};
  return {
    OR: [
      { email: { contains: value, mode: 'insensitive' } },
      { profile: { firstName: { contains: value, mode: 'insensitive' } } },
      { profile: { lastName: { contains: value, mode: 'insensitive' } } },
      { profile: { dni: { contains: value, mode: 'insensitive' } } },
      { profile: { job: { contains: value, mode: 'insensitive' } } },
      { profile: { userPc: { contains: value, mode: 'insensitive' } } },
    ],
  };
};

const fullName = (user: UserLookupRow) =>
  `${user.profile?.firstName ?? ''} ${user.profile?.lastName ?? ''}`.trim();

const mapUserOption = (user: UserLookupRow) => ({
  id: user.id,
  value: String(user.id),
  label: fullName(user) || user.email,
  name: fullName(user) || user.email,
  email: user.email,
  status: user.status,
  userType: user.userType,
  profileId: user.profile?.id ?? null,
  dni: user.profile?.dni ?? null,
  degree: user.profile?.degree ?? null,
  position: user.profile?.description ?? null,
  job: user.profile?.job ?? null,
  phone: user.profile?.phone ?? null,
  userPc: user.profile?.userPc ?? null,
  role: user.role,
});

const mapLogUserOption = (user: LogUserLookupRow) => ({
  id: user.id,
  value: String(user.id),
  label:
    `${user.profile?.firstName ?? ''} ${user.profile?.lastName ?? ''}`.trim() ||
    user.email,
});

class UserLookupServices {
  static isContext(context: string): context is UserLookupContext {
    return context in USER_LOOKUP_CONTEXT_CONFIG;
  }

  static async list(
    context: UserLookupContext,
    options: UserLookupOptions = {}
  ) {
    const config = USER_LOOKUP_CONTEXT_CONFIG[context];
    const includeInactive =
      options.includeInactive ?? config.includeInactiveByDefault;
    const limit = normalizeLimit(options.limit);
    const baseWhere = includeInactive ? {} : withActiveUsers();
    const remoteAwareWhere = config.excludeRemote
      ? includeInactive
        ? withNonRemoteUsers(baseWhere)
        : withActiveNonRemoteUsers(baseWhere)
      : baseWhere;

    if (config.shape === 'light') {
      const users = await prisma.users.findMany({
        where: {
          ...remoteAwareWhere,
          ...buildSearchWhere(options.search),
        },
        select: LOG_USER_LOOKUP_SELECT,
        orderBy: [
          { profile: { lastName: 'asc' } },
          { profile: { firstName: 'asc' } },
        ],
        take: limit,
      });

      return users.map(mapLogUserOption);
    }

    const users = await prisma.users.findMany({
      where: {
        ...remoteAwareWhere,
        ...buildSearchWhere(options.search),
      },
      select: USER_LOOKUP_SELECT,
      orderBy: [
        { profile: { lastName: 'asc' } },
        { profile: { firstName: 'asc' } },
      ],
      take: context === 'attendance' ? undefined : limit,
    });

    const orderedUsers = orderUserLookupRows(context, users);
    const limitedUsers = limit ? orderedUsers.slice(0, limit) : orderedUsers;

    return limitedUsers.map(mapUserOption);
  }
}

export default UserLookupServices;

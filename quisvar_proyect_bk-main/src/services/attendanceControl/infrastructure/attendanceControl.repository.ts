import { Prisma } from '@prisma/client';

export const attendanceUserSelect = {
  id: true,
  email: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
      dni: true,
      phone: true,
    },
  },
} satisfies Prisma.UsersSelect;

const attendanceUserWithRoleSelect = {
  ...attendanceUserSelect,
  role: { select: { hierarchy: true } },
} satisfies Prisma.UsersSelect;

export const activeReconciliationItemInclude = {
  reconciliation: {
    select: {
      id: true,
      reason: true,
      status: true,
      createdAt: true,
      createdBy: { select: attendanceUserSelect },
    },
  },
} satisfies Prisma.AttendanceReconciliationItemInclude;

export const attendanceCandidateInclude = {
  user: { select: attendanceUserWithRoleSelect },
  list: {
    select: {
      id: true,
      title: true,
      timer: true,
      createdAt: true,
    },
  },
  reconciliationItems: {
    where: { reconciliation: { status: 'ACTIVE' } },
    include: activeReconciliationItemInclude,
    take: 1,
  },
} satisfies Prisma.ListOnUsersInclude;

export const attendanceReconciliationInclude = {
  user: { select: attendanceUserSelect },
  createdBy: { select: attendanceUserSelect },
  voidedBy: { select: attendanceUserSelect },
  items: {
    include: {
      attendance: {
        include: {
          list: {
            select: {
              id: true,
              title: true,
              timer: true,
              createdAt: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.AttendanceReconciliationInclude;

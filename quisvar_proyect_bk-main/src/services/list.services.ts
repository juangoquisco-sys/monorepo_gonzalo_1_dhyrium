import { DateOptions } from '@/types/types';
import AppError from '@/utils/appError';
import {
  AttendanceListState,
  type ListDetails,
  type ListOnUsers,
  type Users,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import Utilities from '@/utils/utilities';
import {
  attendanceFineForStatus,
  AttendanceReconciliationPolicy,
} from '@/services/attendanceControl/domain/attendanceReconciliationPolicy';
import { activeNonRemoteUserWhere } from '@/utils/userFilters';
import { orderAttendanceRows } from '@/services/attendance/attendance.policy';

class ListServices {
  public static async getByUser(usersId: Users['id'], options: DateOptions) {
    if (!usersId) throw new AppError(`Oops!,ID invalido`, 400);
    const status = { notIn: ['PUNTUAL' as ListOnUsers['status']] };
    const initialDate = Utilities.validateDate(options.initialDate);
    const untilDate = Utilities.validateDate(options.untilDate);
    const assignedAt = { gte: initialDate, lte: untilDate };
    const list = await prisma.listOnUsers.findMany({
      where: {
        usersId,
        status,
        assignedAt,
        list: { state: AttendanceListState.FINALIZED },
      },
      select: {
        assignedAt: true,
        status: true,
        list: { select: { timer: true, title: true } },
        reconciliationItems: {
          where: { reconciliation: { status: 'ACTIVE' } },
          select: { resolvedStatus: true },
          take: 1,
        },
      },
      orderBy: [{ assignedAt: 'desc' }],
    });
    return list.map(item => {
      const originalStatus = item.status;
      const effectiveStatus = AttendanceReconciliationPolicy.effectiveStatus(
        originalStatus,
        item.reconciliationItems[0]?.resolvedStatus
      );
      const { reconciliationItems: _reconciliationItems, ...rest } = item;
      return {
        ...rest,
        originalStatus,
        effectiveStatus,
        status: effectiveStatus,
      };
    });
  }

  static async getPending() {
    return prisma.list.findFirst({
      where: {
        state: {
          in: [AttendanceListState.OPEN, AttendanceListState.REVIEW],
        },
      },
      select: {
        id: true,
        title: true,
        timer: true,
        captureMode: true,
        state: true,
        openedAt: true,
        createdAt: true,
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  static async getAllListByDate(startDate: string) {
    const GMT = 60 * 60 * 1000;
    const _startDate = new Date(startDate).getTime();
    const startOfDay = new Date(_startDate + GMT * 5);
    const endOfDay = new Date(_startDate + GMT * 29 - 1);
    const [year, month] = startDate.split('-').map(Number);
    const startOfMonthUTC = new Date(Date.UTC(year, month - 1, 1, 5, 0, 0, 0));
    const endOfMonthUTC = new Date(Date.UTC(year, month, 1, 4, 59, 59, 999));
    const startOfMonthISO = startOfMonthUTC.toISOString();
    const endOfMonthISO = endOfMonthUTC.toISOString();
    const allListsInMonth = await prisma.list.findMany({
      where: {
        createdAt: {
          gte: startOfMonthISO,
          lte: endOfMonthISO,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    const list = await prisma.list.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        createdAt: true,
        id: true,
        title: true,
        timer: true,
        captureMode: true,
        state: true,
        openedAt: true,
        closedAt: true,
        finalizedAt: true,
        users: {
          orderBy: [
            { user: { profile: { lastName: 'asc' } } },
            { user: { profile: { firstName: 'asc' } } },
            { usersId: 'asc' },
          ],
          select: {
            usersId: true,
            listId: true,
            status: true,
            statusSource: true,
            assignedAt: true,
            biometricMarkedAt: true,
            biometricVerifyMode: true,
            biometricDeviceSerial: true,
            user: {
              select: {
                id: true,
                email: true,
                role: { select: { hierarchy: true } },
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    dni: true,
                    phone: true,
                    room: true,
                    userPc: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    const listPosition = list.map(item => {
      const position = allListsInMonth.findIndex(all => all.id === item.id) + 1;
      const users = orderAttendanceRows(
        item.users,
        participant => participant.user.role?.hierarchy
      ).map(participant => {
        const { role: _role, ...user } = participant.user;
        return { ...participant, user };
      });
      return {
        ...item,
        users,
        position,
      };
    });

    return listPosition;
  }
  static async getListRange(startDate: string, endDate: string) {
    const { start: startOfDay, end: endOfDay } =
      AttendanceReconciliationPolicy.operationalDateRange(startDate, endDate);
    const listAdmin = await prisma.users.findMany({
      // where: {
      //   role: { in: ['SUPER_ADMIN', 'ADMIN'] },
      //   status: true,
      // },
      where: {
        ...activeNonRemoteUserWhere,
        role: { hierarchy: { in: [1, 2] } },
      },
      // orderBy: { profile: { lastName: 'asc' } },

      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        equipment: {
          select: {
            name: true,
            workStation: true,
          },
        },
        profile: {
          select: {
            firstName: true,
            lastName: true,
            dni: true,
            phone: true,
            room: true,
            userPc: true,
          },
        },
        list: {
          where: {
            list: {
              state: AttendanceListState.FINALIZED,
              createdAt: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
          },
          orderBy: {
            assignedAt: 'asc',
          },
          select: {
            status: true,
            usersId: true,
            listId: true,
            reconciliationItems: {
              where: { reconciliation: { status: 'ACTIVE' } },
              select: { resolvedStatus: true },
              take: 1,
            },
            list: {
              select: {
                createdAt: true,
                title: true,
                timer: true,
                id: true,
                state: true,
              },
            },
          },
        },
      },
    });
    const listEmploye = await prisma.users.findMany({
      where: {
        ...activeNonRemoteUserWhere,
        role: { hierarchy: { gte: 3 } },
      },
      orderBy:
        // {
        //   role: {
        //     hierarchy: 'asc',
        //   },
        // },
        { profile: { lastName: 'asc' } },

      select: {
        id: true,
        role: true,
        equipment: {
          select: {
            name: true,
            workStation: true,
          },
        },
        profile: {
          select: {
            firstName: true,
            lastName: true,
            dni: true,
            phone: true,
            room: true,
            userPc: true,
          },
        },
        list: {
          where: {
            list: {
              state: AttendanceListState.FINALIZED,
              createdAt: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
          },
          // orderBy: {
          //   assignedAt: 'asc',
          // },
          select: {
            status: true,
            usersId: true,
            listId: true,
            reconciliationItems: {
              where: { reconciliation: { status: 'ACTIVE' } },
              select: { resolvedStatus: true },
              take: 1,
            },
            list: {
              select: {
                createdAt: true,
                title: true,
                timer: true,
                id: true,
                state: true,
              },
            },
          },
        },
      },
    });
    return this.applyPenaltyAdjustmentsToRange(
      this.applyEffectiveStatusToRange([...listAdmin, ...listEmploye]),
      startOfDay,
      endOfDay
    );
  }
  static async getAttendaceListByUser(
    userId: number,
    params: DateOptions<undefined>
  ) {
    const list = await prisma.listOnUsers.findMany({
      where: {
        usersId: userId,
        assignedAt: { gte: params.initialDate, lte: params.untilDate },
        list: { state: AttendanceListState.FINALIZED },
      },
      select: {
        status: true,
        reconciliationItems: {
          where: { reconciliation: { status: 'ACTIVE' } },
          select: { resolvedStatus: true },
          take: 1,
        },
      },
    });
    const attendance = list.reduce<Record<string, number>>((acc, record) => {
      const status = AttendanceReconciliationPolicy.effectiveStatus(
        record.status,
        record.reconciliationItems[0]?.resolvedStatus
      );
      if (!acc[status]) acc[status] = 0;
      acc[status]++;
      return acc;
    }, {});
    return attendance;
  }

  private static applyEffectiveStatusToRange<
    T extends {
      list: Array<
        {
          status: ListDetails;
          reconciliationItems?: Array<{ resolvedStatus: ListDetails }>;
        } & Record<string, unknown>
      >;
    }
  >(users: T[]) {
    return users.map(user => ({
      ...user,
      list: user.list.map(item => {
        const originalStatus = item.status;
        const effectiveStatus = AttendanceReconciliationPolicy.effectiveStatus(
          originalStatus,
          item.reconciliationItems?.[0]?.resolvedStatus
        );
        const { reconciliationItems: _reconciliationItems, ...rest } = item;
        return {
          ...rest,
          originalStatus,
          effectiveStatus,
          status: effectiveStatus,
        };
      }),
    }));
  }

  private static async applyPenaltyAdjustmentsToRange<
    T extends {
      id: number;
      role: { hierarchy: number } | null;
      list: Array<{ usersId: number; listId: number; status: ListDetails }>;
    }
  >(users: T[], periodStart: Date, periodEnd: Date) {
    const userIds = users.filter(user => user.list.length).map(user => user.id);
    if (!userIds.length) {
      return users.map(user => ({ ...user, conciliationAmount: null }));
    }

    const adjustments = await prisma.attendancePenaltyAdjustment.findMany({
      where: {
        status: 'ACTIVE',
        userId: { in: userIds },
        periodStart,
        periodEnd,
        scope: { in: ['ATTENDANCE_RECORD', 'USER_PERIOD'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    const recordAdjustments = new Map<string, number>();
    const periodAdjustments = new Map<number, number>();
    adjustments.forEach(adjustment => {
      if (
        adjustment.scope === 'ATTENDANCE_RECORD' &&
        adjustment.usersId &&
        adjustment.listId
      ) {
        const key = `${adjustment.usersId}:${adjustment.listId}`;
        if (!recordAdjustments.has(key)) {
          recordAdjustments.set(key, adjustment.adjustedAmount);
        }
      }
      if (
        adjustment.scope === 'USER_PERIOD' &&
        !periodAdjustments.has(adjustment.userId)
      ) {
        periodAdjustments.set(adjustment.userId, adjustment.adjustedAmount);
      }
    });

    return users.map(user => {
      const calculatedAmount = user.list.reduce(
        (total, item) =>
          total +
          (recordAdjustments.get(`${item.usersId}:${item.listId}`) ??
            attendanceFineForStatus(item.status, user.role?.hierarchy)),
        0
      );
      return {
        ...user,
        conciliationAmount: periodAdjustments.get(user.id) ?? calculatedAmount,
      };
    });
  }
}
export default ListServices;

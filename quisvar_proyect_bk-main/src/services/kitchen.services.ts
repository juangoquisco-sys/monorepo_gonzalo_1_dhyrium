import {
  BulkOrderMealBody,
  DeliveryStatus,
  KitchenHistoryDetailRecord,
  KitchenHistoryFilters,
  KitchenLicenseJustification,
  KitchenHistoryResponse,
  KitchenHistoryRow,
  KitchenHistorySummary,
  KitchenHistoryUserDetailResponse,
  KitchenMonthlyMealVisualStatus,
  KitchenMonthlyResponse,
  KitchenMonthlySummary,
  MealOrderBody,
  MealPickupBody,
  OrderMealBody,
} from '@/types/kitchen';
import { MealPickupStatus, Prisma } from '@prisma/client';
import type { Users } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';

type KitchenDb = Pick<typeof prisma, 'meal' | 'mealOrder' | 'mealOrderOnUsers'>;
type KitchenTransaction = KitchenDb & Pick<typeof prisma, '$queryRaw'>;
type LockedMealOrder = {
  id: number;
  mealId: number;
  orderDate: Date;
  orderTime: string;
  isClose: boolean;
};
type LockedMealOrderOnUser = {
  userId: number;
  mealOrderId: number;
  status: boolean;
  pickupStatus: MealPickupStatus | null;
  pickupUpdatedAt: Date | null;
};
type DeliveryStatusInput = {
  status?: boolean | null;
  pickupStatus?: MealPickupStatus | null;
  isClose?: boolean | null;
  orderDate?: Date | string | null;
  licenseJustification?: KitchenLicenseJustification | null;
};
type NormalizeKitchenPickupOptions = {
  dateFrom?: Date | string;
  dateTo?: Date | string;
};

class KitchenServices {
  static parseDateInput(date: string | Date) {
    if (date instanceof Date) {
      const parsedDate = new Date(date);

      if (Number.isNaN(parsedDate.getTime())) {
        throw new AppError('Una o más fechas son inválidas', 400);
      }

      return parsedDate;
    }

    if (typeof date === 'string') {
      const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);

      if (match) {
        const [, year, month, day] = match;
        return new Date(+year, +month - 1, +day);
      }
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new AppError('Una o más fechas son inválidas', 400);
    }

    return parsedDate;
  }

  static formatDateOnly(date: string | Date) {
    const normalizedDate = KitchenServices.normalizeDateOnly(date);
    const year = normalizedDate.getFullYear();
    const month = String(normalizedDate.getMonth() + 1).padStart(2, '0');
    const day = String(normalizedDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  static getDateRange(date: string | Date) {
    const startDate = KitchenServices.normalizeDateOnly(date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);
    return { startDate, endDate };
  }

  static normalizeDateOnly(date: string | Date) {
    const normalizedDate = KitchenServices.parseDateInput(date);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
  }

  static getMonthDateRange(month: string) {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new AppError('El mes debe tener el formato YYYY-MM', 400);
    }

    const [year, monthIndex] = month.split('-').map(Number);
    if (monthIndex < 1 || monthIndex > 12) {
      throw new AppError('El mes seleccionado no es valido', 400);
    }

    const startDate = new Date(year, monthIndex - 1, 1);
    const endDate = new Date(year, monthIndex, 1);

    return { startDate, endDate };
  }

  static getMonthDays(startDate: Date, endDate: Date) {
    const days: string[] = [];
    const currentDate = new Date(startDate);

    while (currentDate < endDate) {
      days.push(KitchenServices.formatDateOnly(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  }

  static isBeforeToday(date: string | Date) {
    return (
      KitchenServices.normalizeDateOnly(date) <
      KitchenServices.normalizeDateOnly(new Date())
    );
  }

  static getMonthlyMealVisualStatus({
    userStatus,
    isClosed,
    isPast,
  }: {
    userStatus?: boolean;
    isClosed: boolean;
    isPast: boolean;
  }): KitchenMonthlyMealVisualStatus {
    if (typeof userStatus === 'boolean') return userStatus ? 'yes' : 'no';
    if (isClosed || isPast) return 'closed';
    return 'pending';
  }

  static updateMonthlySummary(
    summary: KitchenMonthlySummary,
    status: KitchenMonthlyMealVisualStatus
  ) {
    if (status === 'yes') summary.confirmed += 1;
    if (status === 'no') summary.declined += 1;
    if (status === 'pending') summary.pending += 1;
    if (status === 'closed') summary.closed += 1;
  }

  static getDeliveryStatus({
    status,
    pickupStatus,
    isClose,
    orderDate,
    licenseJustification,
  }: DeliveryStatusInput): DeliveryStatus {
    if (pickupStatus === MealPickupStatus.PICKED_UP) return 'PICKED_UP';
    if (pickupStatus === MealPickupStatus.RESERVED) return 'RESERVED';
    if (status === true && licenseJustification) return 'PENDING_PICKUP';
    if (pickupStatus === MealPickupStatus.NOT_PICKED_UP) return 'NOT_PICKED_UP';
    if (status !== true || !orderDate) return 'NOT_APPLICABLE';
    if (isClose && KitchenServices.isBeforeToday(orderDate)) {
      return 'NO_SERVICE';
    }
    if (isClose) return 'PENDING_PICKUP';
    if (KitchenServices.isBeforeToday(orderDate)) return 'MISSED_CLOSE';
    return 'OPEN';
  }

  static buildMealDateTime(orderDate: Date | string, mealHour: string) {
    const dateOnly = KitchenServices.formatDateOnly(orderDate);
    const [hour = '00', minute = '00'] = mealHour.split(':');
    return new Date(
      `${dateOnly}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00.000Z`
    );
  }

  static licenseJustificationKey(userId: number, mealDateTime: Date) {
    return `${userId}:${mealDateTime.getTime()}`;
  }

  static async buildLicenseJustificationMap(
    items: Array<{ userId: number; mealDateTime: Date }>
  ) {
    const uniqueItems = [
      ...new Map(
        items.map(item => [
          KitchenServices.licenseJustificationKey(
            item.userId,
            item.mealDateTime
          ),
          item,
        ])
      ).values(),
    ];

    if (!uniqueItems.length) {
      return new Map<string, KitchenLicenseJustification>();
    }

    const userIds = [...new Set(uniqueItems.map(item => item.userId))];
    const mealTimes = uniqueItems.map(item => item.mealDateTime);
    const minMealTime = new Date(
      Math.min(...mealTimes.map(date => date.getTime()))
    );
    const maxMealTime = new Date(
      Math.max(...mealTimes.map(date => date.getTime()))
    );

    const licenses = await prisma.licenses.findMany({
      where: {
        usersId: {
          in: userIds,
        },
        status: {
          in: ['ACEPTADO', 'ACTIVO'],
        },
        startDate: {
          lte: maxMealTime,
        },
        untilDate: {
          gte: minMealTime,
        },
      },
      select: {
        id: true,
        usersId: true,
        type: true,
        reason: true,
        startDate: true,
        untilDate: true,
        status: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    const licenseMap = new Map<string, KitchenLicenseJustification>();
    uniqueItems.forEach(item => {
      const license = licenses.find(
        current =>
          current.usersId === item.userId &&
          current.startDate <= item.mealDateTime &&
          current.untilDate >= item.mealDateTime
      );

      if (!license) return;

      licenseMap.set(
        KitchenServices.licenseJustificationKey(item.userId, item.mealDateTime),
        {
          id: license.id,
          type: license.type,
          reason: license.reason,
          startDate: license.startDate,
          untilDate: license.untilDate,
          status: license.status,
        }
      );
    });

    return licenseMap;
  }

  static validateDateIsNotPast(date: string | Date) {
    const targetDate = KitchenServices.normalizeDateOnly(date);
    const today = KitchenServices.normalizeDateOnly(new Date());

    if (targetDate < today) {
      throw new AppError(
        `No se puede registrar pedidos en fechas pasadas: ${KitchenServices.formatDateOnly(
          targetDate
        )}`,
        409
      );
    }
  }

  static getPastDateRange({ dateFrom, dateTo }: NormalizeKitchenPickupOptions) {
    const today = KitchenServices.normalizeDateOnly(new Date());
    const orderDate: Prisma.DateTimeFilter = {
      lt: today,
    };

    if (dateFrom) {
      orderDate.gte = KitchenServices.normalizeDateOnly(dateFrom);
    }

    if (dateTo) {
      const endDate = KitchenServices.normalizeDateOnly(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      orderDate.lt = endDate < today ? endDate : today;
    }

    return orderDate;
  }

  static async markPastServedPendingOrdersAsNotPickedUp(
    options: NormalizeKitchenPickupOptions = {}
  ) {
    const mealOrders = await prisma.mealOrder.findMany({
      where: {
        isClose: true,
        orderDate: KitchenServices.getPastDateRange(options),
        mealOrderOnUsers: {
          some: {
            status: true,
            pickupStatus: {
              not: null,
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    const mealOrderIds = mealOrders.map(mealOrder => mealOrder.id);

    if (!mealOrderIds.length) {
      return {
        mealsReviewed: 0,
        ordersUpdated: 0,
      };
    }

    const result = await prisma.mealOrderOnUsers.updateMany({
      where: {
        mealOrderId: {
          in: mealOrderIds,
        },
        status: true,
        pickupStatus: null,
      },
      data: {
        pickupStatus: MealPickupStatus.NOT_PICKED_UP,
        pickupUpdatedAt: new Date(),
      },
    });

    return {
      mealsReviewed: mealOrderIds.length,
      ordersUpdated: result.count,
    };
  }

  static async findMealOrderByMealAndDate(
    mealId: number,
    orderDate: string | Date,
    db: KitchenDb = prisma
  ) {
    const { startDate, endDate } = KitchenServices.getDateRange(orderDate);

    return db.mealOrder.findFirst({
      where: {
        mealId,
        orderDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  static async findOrCreateMealOrder(
    { orderTime, type, orderDate, mealId }: MealOrderBody,
    db: KitchenDb = prisma
  ) {
    const mealOrderFound = await KitchenServices.findMealOrderByMealAndDate(
      mealId,
      orderDate,
      db
    );

    if (mealOrderFound) return mealOrderFound;

    try {
      return await db.mealOrder.create({
        data: {
          orderTime,
          type,
          orderDate,
          mealId,
          isClose: false,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const mealOrder = await KitchenServices.findMealOrderByMealAndDate(
          mealId,
          orderDate,
          db
        );

        if (mealOrder) return mealOrder;
      }

      throw error;
    }
  }

  static async lockMealOrderById(mealOrderId: number, tx: KitchenTransaction) {
    const [mealOrder] = await tx.$queryRaw<LockedMealOrder[]>`
      SELECT
        id,
        "mealId",
        "orderDate",
        "orderTime",
        "isClose"
      FROM "MealOrder"
      WHERE id = ${mealOrderId}
      FOR UPDATE
    `;

    return mealOrder || null;
  }

  static async lockMealOrderOnUser(
    userId: number,
    mealOrderId: number,
    tx: KitchenTransaction
  ) {
    const [mealOrderOnUser] = await tx.$queryRaw<LockedMealOrderOnUser[]>`
      SELECT
        "userId",
        "mealOrderId",
        "status",
        "pickupStatus",
        "pickupUpdatedAt"
      FROM "MealOrderOnUsers"
      WHERE "userId" = ${userId}
        AND "mealOrderId" = ${mealOrderId}
      FOR UPDATE
    `;

    return mealOrderOnUser || null;
  }

  static getHistoryDateRange(dateFrom: string | Date, dateTo: string | Date) {
    if (!dateFrom || !dateTo) {
      throw new AppError('Debe seleccionar un rango de fechas', 400);
    }

    const startDate = KitchenServices.normalizeDateOnly(dateFrom);
    const finishDate = KitchenServices.normalizeDateOnly(dateTo);

    if (finishDate < startDate) {
      throw new AppError('La fecha final no puede ser menor a la inicial', 422);
    }

    const endDate = new Date(finishDate);
    endDate.setDate(endDate.getDate() + 1);

    return { startDate, endDate };
  }

  static buildHistorySummary(
    rows: KitchenHistoryRow[],
    operationalRows: KitchenHistoryRow[] = rows
  ): KitchenHistorySummary {
    const totalOrders = rows.reduce((acc, row) => acc + row.requestedCount, 0);
    const totalIncumplimientos = rows.reduce(
      (acc, row) => acc + row.notPickedUpCount,
      0
    );
    const totalNoService = operationalRows.reduce(
      (acc, row) => acc + row.noServiceCount,
      0
    );
    const totalMissedClose = operationalRows.reduce(
      (acc, row) => acc + row.missedCloseCount,
      0
    );
    const totalOpenOrders = operationalRows.reduce(
      (acc, row) => acc + row.openOrderCount,
      0
    );
    const usersWithIncumplimientos = rows.filter(
      row => row.notPickedUpCount > 0
    ).length;
    const topOffender = [...rows]
      .filter(row => row.notPickedUpCount > 0)
      .sort((a, b) => {
        if (b.notPickedUpCount !== a.notPickedUpCount) {
          return b.notPickedUpCount - a.notPickedUpCount;
        }

        const dateA = a.lastNotPickedUpAt?.getTime() || 0;
        const dateB = b.lastNotPickedUpAt?.getTime() || 0;

        if (dateB !== dateA) {
          return dateB - dateA;
        }

        return a.fullName.localeCompare(b.fullName, 'es');
      })[0];

    return {
      totalOrders,
      totalIncumplimientos,
      totalNoService,
      totalMissedClose,
      totalOpenOrders,
      usersWithIncumplimientos,
      topOffender: topOffender
        ? {
            userId: topOffender.userId,
            fullName: topOffender.fullName,
            count: topOffender.notPickedUpCount,
          }
        : null,
    };
  }

  static filterHistoryRowsByPickupStatus(
    rows: KitchenHistoryRow[],
    pickupStatus: KitchenHistoryFilters['pickupStatus']
  ) {
    if (!pickupStatus || pickupStatus === 'Todos') {
      return rows.filter(row => row.requestedCount > 0);
    }

    return rows.filter(row => {
      if (pickupStatus === MealPickupStatus.PICKED_UP) {
        return row.pickedUpCount > 0;
      }
      if (pickupStatus === MealPickupStatus.NOT_PICKED_UP) {
        return row.notPickedUpCount > 0;
      }
      if (pickupStatus === MealPickupStatus.RESERVED) {
        return row.reservedCount > 0;
      }
      if (pickupStatus === 'PENDING_PICKUP') {
        return row.pendingPickupCount > 0;
      }
      if (pickupStatus === 'NO_SERVICE') {
        return row.noServiceCount > 0;
      }
      if (pickupStatus === 'MISSED_CLOSE') {
        return row.missedCloseCount > 0;
      }
      if (pickupStatus === 'OPEN') {
        return row.openOrderCount > 0;
      }
      return true;
    });
  }

  static buildHistoryBaseWhere({
    dateFrom,
    dateTo,
    mealType,
    userType,
    search,
  }: Omit<
    KitchenHistoryFilters,
    'pickupStatus'
  >): Prisma.MealOrderOnUsersWhereInput {
    const { startDate, endDate } = KitchenServices.getHistoryDateRange(
      dateFrom,
      dateTo
    );
    const searchValue = search?.trim();

    const userWhere: Prisma.UsersWhereInput = {};
    if (userType && userType !== 'Todos') {
      userWhere.userType = userType;
    }
    if (searchValue) {
      userWhere.OR = [
        {
          profile: {
            firstName: {
              contains: searchValue,
              mode: 'insensitive',
            },
          },
        },
        {
          profile: {
            lastName: {
              contains: searchValue,
              mode: 'insensitive',
            },
          },
        },
        {
          profile: {
            dni: {
              contains: searchValue,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const mealWhere: Prisma.MealWhereInput = {};
    if (mealType && mealType !== 'Todos') {
      mealWhere.type = mealType;
    }

    return {
      status: true,
      mealOrder: {
        orderDate: {
          gte: startDate,
          lt: endDate,
        },
        meal: mealWhere,
      },
      user: userWhere,
    };
  }

  static async kitchenHistory(
    filters: KitchenHistoryFilters
  ): Promise<KitchenHistoryResponse> {
    const where = KitchenServices.buildHistoryBaseWhere(filters);

    const records = await prisma.mealOrderOnUsers.findMany({
      where,
      select: {
        pickupStatus: true,
        userId: true,
        user: {
          select: {
            userType: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                dni: true,
              },
            },
          },
        },
        mealOrder: {
          select: {
            isClose: true,
            orderDate: true,
            orderTime: true,
          },
        },
      },
    });

    const licenseJustificationMap =
      await KitchenServices.buildLicenseJustificationMap(
        records.map(record => ({
          userId: record.userId,
          mealDateTime: KitchenServices.buildMealDateTime(
            record.mealOrder.orderDate,
            record.mealOrder.orderTime
          ),
        }))
      );

    const rowsMap = new Map<number, KitchenHistoryRow>();

    records.forEach(record => {
      const profile = record.user.profile;
      if (!profile) return;
      const mealDateTime = KitchenServices.buildMealDateTime(
        record.mealOrder.orderDate,
        record.mealOrder.orderTime
      );
      const licenseJustification =
        licenseJustificationMap.get(
          KitchenServices.licenseJustificationKey(record.userId, mealDateTime)
        ) || null;

      const fullName = `${profile.lastName} ${profile.firstName}`;
      const currentRow = rowsMap.get(record.userId) || {
        userId: record.userId,
        fullName,
        dni: profile.dni || '---',
        userType: record.user.userType,
        requestedCount: 0,
        pickedUpCount: 0,
        notPickedUpCount: 0,
        reservedCount: 0,
        pendingPickupCount: 0,
        noServiceCount: 0,
        missedCloseCount: 0,
        openOrderCount: 0,
        notPickedUpRate: 0,
        lastNotPickedUpAt: null,
      };

      const deliveryStatus = KitchenServices.getDeliveryStatus({
        status: true,
        pickupStatus: record.pickupStatus,
        isClose: record.mealOrder.isClose,
        orderDate: record.mealOrder.orderDate,
        licenseJustification,
      });

      if (deliveryStatus === 'PICKED_UP') {
        currentRow.requestedCount += 1;
        currentRow.pickedUpCount += 1;
      } else if (deliveryStatus === 'NOT_PICKED_UP') {
        currentRow.requestedCount += 1;
        currentRow.notPickedUpCount += 1;

        if (
          !currentRow.lastNotPickedUpAt ||
          record.mealOrder.orderDate > currentRow.lastNotPickedUpAt
        ) {
          currentRow.lastNotPickedUpAt = record.mealOrder.orderDate;
        }
      } else if (deliveryStatus === 'RESERVED') {
        currentRow.requestedCount += 1;
        currentRow.reservedCount += 1;
      } else if (deliveryStatus === 'PENDING_PICKUP') {
        currentRow.requestedCount += 1;
        currentRow.pendingPickupCount += 1;
      } else if (deliveryStatus === 'NO_SERVICE') {
        currentRow.noServiceCount += 1;
      } else if (deliveryStatus === 'MISSED_CLOSE') {
        currentRow.missedCloseCount += 1;
      } else if (deliveryStatus === 'OPEN') {
        currentRow.openOrderCount += 1;
      }

      currentRow.notPickedUpRate = currentRow.requestedCount
        ? Math.round(
            (currentRow.notPickedUpCount / currentRow.requestedCount) * 100
          )
        : 0;

      rowsMap.set(record.userId, currentRow);
    });

    const sortedRows = [...rowsMap.values()].sort((a, b) => {
      if (b.notPickedUpCount !== a.notPickedUpCount) {
        return b.notPickedUpCount - a.notPickedUpCount;
      }
      if (b.requestedCount !== a.requestedCount) {
        return b.requestedCount - a.requestedCount;
      }
      if (b.noServiceCount !== a.noServiceCount) {
        return b.noServiceCount - a.noServiceCount;
      }
      if (b.missedCloseCount !== a.missedCloseCount) {
        return b.missedCloseCount - a.missedCloseCount;
      }
      if (b.openOrderCount !== a.openOrderCount) {
        return b.openOrderCount - a.openOrderCount;
      }
      return a.fullName.localeCompare(b.fullName, 'es');
    });

    const rows = KitchenServices.filterHistoryRowsByPickupStatus(
      sortedRows,
      filters.pickupStatus
    );

    return {
      summary: KitchenServices.buildHistorySummary(
        rows,
        !filters.pickupStatus || filters.pickupStatus === 'Todos'
          ? sortedRows
          : rows
      ),
      rows,
    };
  }

  static async kitchenHistoryByUser(
    userId: number,
    filters: Pick<KitchenHistoryFilters, 'dateFrom' | 'dateTo' | 'mealType'>
  ): Promise<KitchenHistoryUserDetailResponse> {
    const where = KitchenServices.buildHistoryBaseWhere({
      ...filters,
      userType: 'Todos',
      search: '',
    });

    const records = await prisma.mealOrderOnUsers.findMany({
      where: {
        ...where,
        userId,
      },
      select: {
        status: true,
        comment: true,
        amountOfFood: true,
        pickupStatus: true,
        pickupUpdatedAt: true,
        mealOrder: {
          select: {
            isClose: true,
            orderDate: true,
            orderTime: true,
            meal: {
              select: {
                type: true,
              },
            },
          },
        },
      },
    });

    const licenseJustificationMap =
      await KitchenServices.buildLicenseJustificationMap(
        records.map(record => ({
          userId,
          mealDateTime: KitchenServices.buildMealDateTime(
            record.mealOrder.orderDate,
            record.mealOrder.orderTime
          ),
        }))
      );

    const detailRecords: KitchenHistoryDetailRecord[] = records
      .map(record => {
        const mealDateTime = KitchenServices.buildMealDateTime(
          record.mealOrder.orderDate,
          record.mealOrder.orderTime
        );
        const licenseJustification =
          licenseJustificationMap.get(
            KitchenServices.licenseJustificationKey(userId, mealDateTime)
          ) || null;

        return {
          date: record.mealOrder.orderDate,
          mealType: record.mealOrder.meal.type,
          mealHour: record.mealOrder.orderTime,
          amountOfFood: record.amountOfFood,
          comment: record.comment,
          mealStatus: record.status,
          pickupStatus: record.pickupStatus,
          deliveryStatus: KitchenServices.getDeliveryStatus({
            status: record.status,
            pickupStatus: record.pickupStatus,
            isClose: record.mealOrder.isClose,
            orderDate: record.mealOrder.orderDate,
            licenseJustification,
          }),
          pickupUpdatedAt: record.pickupUpdatedAt,
          licenseJustification,
        };
      })
      .sort((a, b) => {
        const diff = b.date.getTime() - a.date.getTime();
        if (diff !== 0) return diff;
        return b.mealHour.localeCompare(a.mealHour);
      });

    const summaryBase = detailRecords.reduce(
      (acc, record) => {
        if (record.deliveryStatus === 'PICKED_UP') {
          acc.requestedCount += 1;
          acc.pickedUpCount += 1;
        } else if (record.deliveryStatus === 'NOT_PICKED_UP') {
          acc.requestedCount += 1;
          acc.notPickedUpCount += 1;
        } else if (record.deliveryStatus === 'RESERVED') {
          acc.requestedCount += 1;
          acc.reservedCount += 1;
        } else if (record.deliveryStatus === 'PENDING_PICKUP') {
          acc.requestedCount += 1;
          acc.pendingPickupCount += 1;
        } else if (record.deliveryStatus === 'NO_SERVICE') {
          acc.noServiceCount += 1;
        } else if (record.deliveryStatus === 'MISSED_CLOSE') {
          acc.missedCloseCount += 1;
        } else if (record.deliveryStatus === 'OPEN') {
          acc.openOrderCount += 1;
        }

        return acc;
      },
      {
        requestedCount: 0,
        pickedUpCount: 0,
        notPickedUpCount: 0,
        reservedCount: 0,
        pendingPickupCount: 0,
        noServiceCount: 0,
        missedCloseCount: 0,
        openOrderCount: 0,
        notPickedUpRate: 0,
      }
    );

    summaryBase.notPickedUpRate = summaryBase.requestedCount
      ? Math.round(
          (summaryBase.notPickedUpCount / summaryBase.requestedCount) * 100
        )
      : 0;

    return {
      summary: summaryBase,
      records: detailRecords,
    };
  }

  static async myMealsOrder(
    userId: Users['id'],
    userType: Users['userType'],
    date: string
  ) {
    if (!date) {
      throw new AppError('La fecha es requerida', 400);
    }
    const { startDate, endDate } = KitchenServices.getDateRange(date);
    const mealsWithOrders = await prisma.meal.findMany({
      orderBy: {
        hour: 'asc',
      },
      where: {
        userTypes: {
          has: userType,
        },
      },
      select: {
        id: true,
        type: true,
        hour: true,
        mealOrder: {
          where: {
            orderDate: {
              gte: startDate,
              lt: endDate,
            },
          },
          include: {
            mealOrderOnUsers: {
              where: {
                userId,
              },
              select: {
                status: true,
                comment: true,
                amountOfFood: true,
                pickupStatus: true,
                pickupUpdatedAt: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    const transformedData = mealsWithOrders.map(({ mealOrder, ...meal }) => ({
      ...meal,
      order: mealOrder.length > 0 ? mealOrder[0] : null,
    }));
    return transformedData;
  }

  static async myMealsOrderMonth(
    userId: Users['id'],
    userType: Users['userType'],
    month: string
  ): Promise<KitchenMonthlyResponse> {
    const { startDate, endDate } = KitchenServices.getMonthDateRange(month);
    const days = KitchenServices.getMonthDays(startDate, endDate);
    const today = KitchenServices.formatDateOnly(new Date());
    const summary: KitchenMonthlySummary = {
      confirmed: 0,
      declined: 0,
      pending: 0,
      closed: 0,
    };

    const mealsWithOrders = await prisma.meal.findMany({
      orderBy: {
        hour: 'asc',
      },
      where: {
        userTypes: {
          has: userType,
        },
      },
      select: {
        id: true,
        type: true,
        hour: true,
        mealOrder: {
          where: {
            orderDate: {
              gte: startDate,
              lt: endDate,
            },
          },
          select: {
            id: true,
            mealId: true,
            type: true,
            orderTime: true,
            orderDate: true,
            isClose: true,
            mealOrderOnUsers: {
              where: {
                userId,
              },
              select: {
                status: true,
                comment: true,
                amountOfFood: true,
                pickupStatus: true,
                pickupUpdatedAt: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    const daysData = days.map(date => {
      const isPast = date < today;

      return {
        date,
        isToday: date === today,
        isPast,
        meals: mealsWithOrders.map(({ mealOrder, ...meal }) => {
          const order =
            mealOrder.find(
              currentOrder =>
                KitchenServices.formatDateOnly(currentOrder.orderDate) === date
            ) || null;
          const userOrder = order?.mealOrderOnUsers?.[0];
          const visualStatus = KitchenServices.getMonthlyMealVisualStatus({
            userStatus: userOrder?.status,
            isClosed: !!order?.isClose,
            isPast,
          });

          KitchenServices.updateMonthlySummary(summary, visualStatus);

          return {
            mealId: meal.id,
            type: meal.type,
            hour: meal.hour,
            order,
            visualStatus,
            editable: !isPast && !order?.isClose,
          };
        }),
      };
    });

    return {
      month,
      summary,
      days: daysData,
    };
  }

  static async allMealsOrderByDate(date: string) {
    if (!date) {
      throw new AppError('La fecha es requerida', 400);
    }

    const { startDate, endDate } = KitchenServices.getDateRange(date);

    const mealOrders = await prisma.meal.findMany({
      orderBy: {
        hour: 'asc',
      },
      include: {
        mealOrder: {
          where: {
            orderDate: {
              gte: startDate,
              lt: endDate,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            mealOrderOnUsers: {
              select: {
                status: true,
                userId: true,
                comment: true,
                amountOfFood: true,
                pickupStatus: true,
                pickupUpdatedAt: true,
              },
            },
          },
        },
      },
    });

    const users = await prisma.users.findMany({
      where: {
        role: {
          hierarchy: { gte: 1 },
        },
        status: true,
      },
      orderBy: [
        {
          role: {
            hierarchy: 'asc',
          },
        },
        {
          profile: {
            lastName: 'asc',
          },
        },
      ],
      select: {
        id: true,
        userType: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            dni: true,
          },
        },
      },
    });

    const licenseLookups = mealOrders.flatMap(({ mealOrder, ...meal }) => {
      const usersForMeal = users.filter(user =>
        meal.userTypes.includes(user.userType)
      );

      return mealOrder.flatMap(order => {
        const mealDateTime = KitchenServices.buildMealDateTime(
          order.orderDate,
          meal.hour
        );

        return usersForMeal.map(user => ({
          userId: user.id,
          mealDateTime,
        }));
      });
    });
    const licenseJustificationMap =
      await KitchenServices.buildLicenseJustificationMap(licenseLookups);

    const tranformData = mealOrders.map(({ mealOrder, ...meal }) => {
      const usersForMeal = users.filter(user =>
        meal.userTypes.includes(user.userType)
      );
      const newMealOrder = mealOrder.map(order => {
        const mealDateTime = KitchenServices.buildMealDateTime(
          order.orderDate,
          meal.hour
        );
        const mealOrderUsersByUserId = new Map(
          order.mealOrderOnUsers.map(mealOrderUser => [
            mealOrderUser.userId,
            mealOrderUser,
          ])
        );
        const userStatus = usersForMeal.map(user => {
          const findMealOrderUser = mealOrderUsersByUserId.get(user.id);
          const licenseJustification =
            licenseJustificationMap.get(
              KitchenServices.licenseJustificationKey(user.id, mealDateTime)
            ) || null;
          return {
            ...user,
            mealStatus: findMealOrderUser?.status,
            mealComment: findMealOrderUser?.comment,
            amountOfFood: findMealOrderUser?.amountOfFood || null,
            pickupStatus: findMealOrderUser?.pickupStatus || null,
            deliveryStatus: KitchenServices.getDeliveryStatus({
              status: findMealOrderUser?.status,
              pickupStatus: findMealOrderUser?.pickupStatus || null,
              isClose: order.isClose,
              orderDate: order.orderDate,
              licenseJustification,
            }),
            pickupUpdatedAt: findMealOrderUser?.pickupUpdatedAt || null,
            licenseJustification,
          };
        });
        return {
          ...order,
          users: userStatus,
        };
      });

      return {
        ...meal,
        order:
          newMealOrder.length > 0
            ? newMealOrder[0]
            : {
                users: usersForMeal.map(user => ({
                  ...user,
                  mealStatus: undefined,
                  mealComment: undefined,
                  amountOfFood: null,
                  pickupStatus: null,
                  deliveryStatus: 'NOT_APPLICABLE' as DeliveryStatus,
                  pickupUpdatedAt: null,
                  licenseJustification: null,
                })),
              },
      };
    });

    return tranformData;
  }

  static async orderMeal({
    mealOrderId,
    status,
    userId,
    mealId,
    orderDate,
    comment = '',
    amountOfFood = 'Normal',
  }: OrderMealBody) {
    const mealOrderOnUserData = status
      ? { status, comment, amountOfFood }
      : {
          status,
          comment,
          amountOfFood,
          pickupStatus: null,
          pickupUpdatedAt: null,
        };

    if (mealOrderId) {
      return prisma.$transaction(async tx => {
        const mealOrder = await KitchenServices.lockMealOrderById(
          mealOrderId,
          tx
        );

        if (!mealOrder) throw new AppError('La orden no existe', 404);
        if (mealOrder.isClose)
          throw new AppError('La orden ya fue cerrada', 409);

        return tx.mealOrderOnUsers.upsert({
          where: { userId_mealOrderId: { userId, mealOrderId } },
          update: mealOrderOnUserData,
          create: {
            userId,
            mealOrderId,
            status,
            comment,
            amountOfFood,
            pickupStatus: null,
            pickupUpdatedAt: null,
          },
        });
      });
    } else {
      if (!mealId || !orderDate) throw new AppError('Ocurrio un error', 400);
      KitchenServices.validateDateIsNotPast(orderDate);

      return prisma.$transaction(async tx => {
        const meal = await tx.meal.findUnique({ where: { id: mealId } });
        if (!meal) throw new AppError('El plato no existe', 404);

        const normalizedOrderDate =
          KitchenServices.normalizeDateOnly(orderDate);
        const preparedMealOrder = await KitchenServices.findOrCreateMealOrder(
          {
            orderTime: meal.hour,
            type: meal.type,
            orderDate: normalizedOrderDate,
            mealId,
          },
          tx
        );
        const mealOrder = await KitchenServices.lockMealOrderById(
          preparedMealOrder.id,
          tx
        );

        if (!mealOrder) throw new AppError('La orden no existe', 404);
        if (mealOrder.isClose)
          throw new AppError('La orden ya fue cerrada', 409);

        return tx.mealOrderOnUsers.upsert({
          where: {
            userId_mealOrderId: {
              userId,
              mealOrderId: mealOrder.id,
            },
          },
          update: mealOrderOnUserData,
          create: {
            userId,
            mealOrderId: mealOrder.id,
            status,
            comment,
            amountOfFood,
            pickupStatus: null,
            pickupUpdatedAt: null,
          },
        });
      });
    }
  }
  static async orderMealPickup({
    mealOrderId,
    pickupStatus,
    userId,
  }: MealPickupBody) {
    if (!mealOrderId) throw new AppError('Ocurrio un error', 400);

    return prisma.$transaction(async tx => {
      const mealOrder = await KitchenServices.lockMealOrderById(
        mealOrderId,
        tx
      );
      const mealOrderOnUser = await KitchenServices.lockMealOrderOnUser(
        userId,
        mealOrderId,
        tx
      );

      if (!mealOrder || !mealOrderOnUser) {
        throw new AppError(
          'El usuario no tiene un pedido registrado para esta comida',
          404
        );
      }

      if (!mealOrderOnUser.status) {
        throw new AppError(
          'Solo se puede registrar la entrega para pedidos confirmados',
          409
        );
      }

      const mealDate = KitchenServices.normalizeDateOnly(mealOrder.orderDate);
      const today = KitchenServices.normalizeDateOnly(new Date());

      if (mealDate > today) {
        throw new AppError(
          'No se puede registrar la entrega en fechas futuras',
          409
        );
      }

      if (mealDate.getTime() === today.getTime() && !mealOrder.isClose) {
        throw new AppError(
          'Primero cierre el pedido para registrar la entrega',
          409
        );
      }

      const validStatuses = Object.values(MealPickupStatus);
      if (!validStatuses.includes(pickupStatus)) {
        throw new AppError('El estado de entrega no es valido', 400);
      }

      if (pickupStatus === MealPickupStatus.NOT_PICKED_UP) {
        const mealDateTime = KitchenServices.buildMealDateTime(
          mealOrder.orderDate,
          mealOrder.orderTime
        );
        const licenseJustificationMap =
          await KitchenServices.buildLicenseJustificationMap([
            { userId, mealDateTime },
          ]);
        const licenseJustification = licenseJustificationMap.get(
          KitchenServices.licenseJustificationKey(userId, mealDateTime)
        );

        if (licenseJustification) {
          throw new AppError(
            'No se puede marcar como no recogido: el usuario tiene una licencia o permiso vigente para esta comida',
            409
          );
        }
      }

      return tx.mealOrderOnUsers.update({
        where: {
          userId_mealOrderId: {
            userId,
            mealOrderId,
          },
        },
        data: {
          pickupStatus,
          pickupUpdatedAt: new Date(),
        },
      });
    });
  }
  static async orderMealBulk({ userId, dates, orders }: BulkOrderMealBody) {
    if (!dates?.length)
      throw new AppError('Debe seleccionar al menos una fecha', 400);
    if (!orders?.length)
      throw new AppError(
        'Debe seleccionar al menos una comida para aplicar',
        400
      );

    const normalizedDates = [
      ...new Set(dates.map(date => KitchenServices.formatDateOnly(date))),
    ].sort();
    normalizedDates.forEach(date =>
      KitchenServices.validateDateIsNotPast(date)
    );

    const normalizedOrders = [
      ...new Map(orders.map(order => [order.mealId, order])).values(),
    ];
    const mealIds = normalizedOrders.map(order => order.mealId);

    return prisma.$transaction(async tx => {
      const skippedClosed: Array<{
        date: string;
        mealId: number;
        mealType: string;
      }> = [];
      let processedOrders = 0;

      const meals = await tx.meal.findMany({
        where: {
          id: {
            in: mealIds,
          },
        },
        select: {
          id: true,
          hour: true,
          type: true,
        },
      });

      if (meals.length !== mealIds.length) {
        throw new AppError('Una o más comidas ya no están disponibles', 404);
      }

      const mealsMap = new Map(meals.map(meal => [meal.id, meal]));
      const normalizedOrderDates = normalizedDates.map(date =>
        KitchenServices.normalizeDateOnly(date)
      );
      const mealOrderDateWhere = normalizedOrderDates.map(orderDate => {
        const endDate = new Date(orderDate);
        endDate.setDate(endDate.getDate() + 1);

        return {
          orderDate: {
            gte: orderDate,
            lt: endDate,
          },
        };
      });
      const mealOrderDateRangeSql = normalizedOrderDates.map(orderDate => {
        const endDate = new Date(orderDate);
        endDate.setDate(endDate.getDate() + 1);

        return Prisma.sql`("orderDate" >= ${orderDate} AND "orderDate" < ${endDate})`;
      });

      const buildMealOrdersMap = (
        mealOrders: Array<{
          id: number;
          mealId: number;
          orderDate: Date;
          isClose: boolean;
        }>
      ) => {
        const mealOrdersMap = new Map<
          string,
          {
            id: number;
            mealId: number;
            orderDate: Date;
            isClose: boolean;
          }
        >();

        mealOrders.forEach(mealOrder => {
          const key = `${mealOrder.mealId}-${KitchenServices.formatDateOnly(
            mealOrder.orderDate
          )}`;

          if (!mealOrdersMap.has(key)) {
            mealOrdersMap.set(key, mealOrder);
          }
        });

        return mealOrdersMap;
      };

      const findPreparedMealOrders = () =>
        tx.mealOrder.findMany({
          where: {
            mealId: {
              in: mealIds,
            },
            OR: mealOrderDateWhere,
          },
          select: {
            id: true,
            mealId: true,
            orderDate: true,
            isClose: true,
          },
          orderBy: [{ mealId: 'asc' }, { createdAt: 'asc' }],
        });
      const lockPreparedMealOrders = () =>
        tx.$queryRaw<
          Array<{
            id: number;
            mealId: number;
            orderDate: Date;
            isClose: boolean;
          }>
        >`
          SELECT
            id,
            "mealId",
            "orderDate",
            "isClose"
          FROM "MealOrder"
          WHERE "mealId" IN (${Prisma.join(mealIds)})
            AND (${Prisma.join(mealOrderDateRangeSql, ' OR ')})
          ORDER BY "mealId", "createdAt"
          FOR UPDATE
        `;

      let mealOrdersMap = buildMealOrdersMap(await findPreparedMealOrders());
      const missingMealOrders = normalizedOrderDates.flatMap(orderDate =>
        meals
          .filter(
            meal =>
              !mealOrdersMap.has(
                `${meal.id}-${KitchenServices.formatDateOnly(orderDate)}`
              )
          )
          .map(meal => ({
            orderTime: meal.hour,
            type: meal.type,
            orderDate,
            mealId: meal.id,
            isClose: false,
          }))
      );

      if (missingMealOrders.length) {
        await tx.mealOrder.createMany({
          data: missingMealOrders,
          skipDuplicates: true,
        });
      }

      mealOrdersMap = buildMealOrdersMap(await lockPreparedMealOrders());

      const mealOrderUserRows: Prisma.Sql[] = [];

      for (const orderDate of normalizedDates) {
        for (const order of normalizedOrders) {
          const meal = mealsMap.get(order.mealId);
          if (!meal) {
            throw new AppError(`La comida ${order.mealId} no existe`, 404);
          }

          const mealOrder = mealOrdersMap.get(`${meal.id}-${orderDate}`);
          if (!mealOrder) {
            throw new AppError(
              `No se pudo preparar la orden de ${meal.type} para ${orderDate}`,
              500
            );
          }

          if (mealOrder.isClose) {
            skippedClosed.push({
              date: orderDate,
              mealId: meal.id,
              mealType: meal.type,
            });
            continue;
          }

          mealOrderUserRows.push(Prisma.sql`(
            ${userId},
            ${mealOrder.id},
            ${order.status},
            ${order.comment || ''},
            ${order.amountOfFood || 'Normal'}::"AmountOfFood"
          )`);
          processedOrders += 1;
        }
      }

      if (mealOrderUserRows.length) {
        await tx.$executeRaw`
          INSERT INTO "MealOrderOnUsers" (
            "userId",
            "mealOrderId",
            "status",
            "comment",
            "amountOfFood"
          )
          VALUES ${Prisma.join(mealOrderUserRows)}
          ON CONFLICT ("userId", "mealOrderId")
          DO UPDATE SET
            "status" = EXCLUDED."status",
            "comment" = EXCLUDED."comment",
            "amountOfFood" = EXCLUDED."amountOfFood"
        `;
      }

      return {
        processedDates: normalizedDates.length,
        processedOrders,
        skippedClosedCount: skippedClosed.length,
        skippedClosed,
      };
    });
  }
  static async orderMealDisabled(
    disabled: boolean,
    { mealId, mealOrderId, orderDate }: OrderMealBody
  ) {
    if (mealOrderId) {
      const mealOrderOnUser = await prisma.mealOrder.update({
        where: { id: mealOrderId },
        data: { isClose: disabled },
      });
      return mealOrderOnUser;
    } else {
      if (!mealId || !orderDate) throw new AppError('Ocurrio un error', 400);
      const meal = await prisma.meal.findUnique({ where: { id: mealId } });
      if (!meal) throw new AppError('El plato no existe', 404);

      const mealOrderFound = await KitchenServices.findMealOrderByMealAndDate(
        mealId,
        orderDate
      );

      const mealOrder = mealOrderFound
        ? await prisma.mealOrder.update({
            where: { id: mealOrderFound.id },
            data: { isClose: disabled },
          })
        : await KitchenServices.createMealOrder(
            {
              orderTime: meal.hour,
              type: meal.type,
              orderDate: KitchenServices.normalizeDateOnly(orderDate),
              mealId,
            },
            disabled
          );

      return mealOrder;
    }
  }
  static async createMealOrder(
    { orderTime, type, orderDate, mealId }: MealOrderBody,
    isClose: boolean = false,
    db: KitchenDb = prisma
  ) {
    try {
      const mealOrder = await db.mealOrder.create({
        data: {
          orderTime,
          type,
          orderDate,
          mealId,
          isClose,
        },
      });
      return mealOrder;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const mealOrder = await KitchenServices.findMealOrderByMealAndDate(
          mealId,
          orderDate,
          db
        );

        if (mealOrder) {
          if (mealOrder.isClose === isClose) return mealOrder;

          return db.mealOrder.update({
            where: { id: mealOrder.id },
            data: { isClose },
          });
        }
      }

      throw error;
    }
  }
}

export default KitchenServices;

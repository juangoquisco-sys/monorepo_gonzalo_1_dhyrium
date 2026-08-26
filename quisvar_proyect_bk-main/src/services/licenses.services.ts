import { DateOptions, ObjectNumber } from '@/types/types';
import AppError from '@/utils/appError';
import type { Licenses, Prisma } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import Utilities from '@/utils/utilities';
import SocketManager from '@/models/SocketManager';
import {
  activeNonRemoteUserWhere,
  withNonRemoteUsers,
} from '@/utils/userFilters';

type RecurrenceOccurrence = {
  startDate: string;
  untilDate: string;
};

type RecurrencePayload = {
  enabled?: boolean;
  occurrences?: RecurrenceOccurrence[];
};

type LicenseCreatePayload = Licenses & {
  recurrence?: RecurrencePayload;
  autoApprove?: boolean;
  usersIds?: number[];
};

type LicenseFineReportPeriod = {
  dateFilter?: {
    gte?: Date;
    lte?: Date;
  };
  periodStart?: Date;
  periodEnd?: Date;
};

type LicensePenaltyAdjustmentItemInput = {
  licenseId: number;
  adjustedAmount: number;
  reason: string;
};

type LicensePenaltyAdjustmentBulkInput = {
  userId: number;
  periodStart?: string;
  periodEnd?: string;
  total?: {
    adjustedAmount: number;
    reason: string;
  };
  items?: LicensePenaltyAdjustmentItemInput[];
};

type LicensePenaltyAdjustmentVoidInput = {
  userId: number;
  periodStart?: string;
  periodEnd?: string;
  licenseIds?: number[];
  reason?: string;
};

type LicensePerson = {
  id: number;
  profile: {
    firstName: string;
    lastName: string;
    dni: string;
    phone: string | null;
  } | null;
};

type LicenseUserFields = {
  usersId: number;
  supervisorId?: number | null;
};

class LicenseServices {
  private static readonly fineAmounts: Record<
    NonNullable<Licenses['fine']>,
    number
  > = {
    PUNTUAL: 0,
    TARDE: 0.5,
    SIMPLE: 10,
    GRAVE: 20,
    MUY_GRAVE: 80,
    PERMISO: 0,
    SALIDA: 0,
  };

  private static emitRealtimeLicenseUpdate(
    license?: Pick<Licenses, 'id' | 'usersId'> | null
  ) {
    try {
      const io = SocketManager.getInstance();
      io.emit('server:license-update');
      io.emit('server:gate-control-update', {
        passId: license?.id ? `license-${license.id}` : 'license',
        action: 'LICENSE_CHANGED',
      });
      if (license?.usersId) {
        io.to(String(license.usersId)).emit('server:gate-control-update', {
          passId: `license-${license.id}`,
          action: 'LICENSE_CHANGED',
        });
      }
    } catch {
      // SocketManager can be unavailable in scripts/tests; HTTP flow must continue.
    }
  }

  private static normalizeLocalDate(value: Date | string) {
    const GMT = 60 * 60 * 1000;
    return new Date(new Date(value).getTime() - GMT * 5);
  }

  private static async withPeople<T extends LicenseUserFields>(
    licenses: T[]
  ): Promise<
    Array<T & { user: LicensePerson | null; supervisor: LicensePerson | null }>
  > {
    const userIds = [
      ...new Set(
        licenses.flatMap(license =>
          [license.usersId, license.supervisorId].filter(
            (id): id is number => typeof id === 'number'
          )
        )
      ),
    ];
    if (userIds.length === 0) {
      return licenses.map(license => ({
        ...license,
        user: null,
        supervisor: null,
      }));
    }

    const people = await prisma.users.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            dni: true,
            phone: true,
          },
        },
      },
    });
    const peopleById = new Map(people.map(person => [person.id, person]));

    return licenses.map(license => ({
      ...license,
      user: peopleById.get(license.usersId) ?? null,
      supervisor: license.supervisorId
        ? peopleById.get(license.supervisorId) ?? null
        : null,
    }));
  }

  private static getRecurrenceOccurrences(data: LicenseCreatePayload) {
    return data.recurrence?.enabled
      ? data.recurrence.occurrences?.filter(
          item => item.startDate && item.untilDate
        ) ?? []
      : [];
  }

  static async create(data: LicenseCreatePayload, requesterId?: number) {
    if (!data) throw new AppError(`Datos incorrectos`, 400);
    const usersIds = [
      ...new Set(data.usersIds?.length ? data.usersIds : [data.usersId]),
    ];
    if (usersIds.some(userId => !Number.isFinite(userId))) {
      throw new AppError('Seleccione usuarios validos', 400);
    }
    const shouldAutoApprove = Boolean(data.autoApprove);
    if (shouldAutoApprove) {
      if (!requesterId) {
        throw new AppError(
          'No se pudo identificar al usuario autorizador',
          401
        );
      }
      if (usersIds.includes(requesterId)) {
        throw new AppError(
          'Una solicitud personal debe ser aprobada por otro usuario autorizado',
          400
        );
      }
      data.supervisorId = requesterId;
    }
    const activeLicenses = await prisma.licenses.findMany({
      where: {
        usersId: { in: usersIds },
        status: {
          in: ['ACTIVO', 'ACEPTADO'],
        },
      },
      select: {
        usersId: true,
      },
    });
    if (activeLicenses.length > 0) {
      throw new AppError(
        'Uno o mas usuarios ya tienen una licencia activa o aprobada',
        400
      );
    }
    if (usersIds.length > 1) {
      const createdLicenses = [];
      for (const usersId of usersIds) {
        const license = await this.createSingle({
          ...data,
          usersId,
          usersIds: undefined,
        });
        createdLicenses.push(license);
      }
      this.emitRealtimeLicenseUpdate();
      return {
        count: createdLicenses.length,
        data: createdLicenses,
      };
    }
    const license = await this.createSingle({
      ...data,
      usersId: usersIds[0],
      usersIds: undefined,
    });
    this.emitRealtimeLicenseUpdate(license);
    return license;
  }

  private static async createSingle(data: LicenseCreatePayload) {
    const allowLicense = await prisma.licenses.findFirst({
      where: {
        usersId: data.usersId,
        status: {
          in: ['ACTIVO', 'ACEPTADO'],
        },
      },
    });
    if (allowLicense)
      throw new AppError(`Solo puede tener una licencia activa`, 400);
    const recurrenceOccurrences = this.getRecurrenceOccurrences(data);
    const isRecurringParent = recurrenceOccurrences.length > 0;
    if (isRecurringParent && !data.departureFile) {
      throw new AppError(
        'La resolucion es obligatoria para solicitudes de varios dias',
        400
      );
    }
    const firstOccurrence = recurrenceOccurrences[0];
    const lastOccurrence =
      recurrenceOccurrences[recurrenceOccurrences.length - 1];
    const startOfDay = this.normalizeLocalDate(
      isRecurringParent ? firstOccurrence.startDate : data.startDate
    );
    const endOfDay = this.normalizeLocalDate(
      isRecurringParent ? lastOccurrence.untilDate : data.untilDate
    );
    const recurrenceGroupId = isRecurringParent
      ? `LIC-${data.usersId}-${Date.now()}`
      : undefined;
    const shouldAutoApprove = Boolean(data.autoApprove);
    const newLicence = await prisma.licenses.create({
      data: {
        usersId: data.usersId,
        supervisorId: shouldAutoApprove ? data.supervisorId : undefined,
        reason: data.reason,
        type: data.type,
        status: shouldAutoApprove ? 'ACEPTADO' : undefined,
        departureFile: data.departureFile,
        startDate: startOfDay,
        untilDate: endOfDay,
        isRecurringParent,
        recurrenceGroupId,
        recurrenceRule: isRecurringParent
          ? JSON.stringify({ occurrences: recurrenceOccurrences })
          : undefined,
      },
    });
    if (shouldAutoApprove && isRecurringParent) {
      await this.applyRecurringApproval(newLicence, {
        feedback: data.feedback,
        status: 'ACEPTADO',
        supervisorId: data.supervisorId,
      });
    }
    return newLicence;
  }

  static async createFreeForAll(data: Licenses) {
    const getAllUsers = await prisma.users.findMany({
      where: activeNonRemoteUserWhere,
      select: {
        id: true,
      },
    });
    const allowLicense = await prisma.licenses.findMany({
      where: {
        AND: [{ status: 'ACTIVO' }, { status: 'ACEPTADO' }],
      },
      select: {
        usersId: true,
      },
    });
    const usersWithoutActiveLicenses = getAllUsers.filter(user => {
      return !allowLicense.some(activeUser => activeUser.usersId === user.id);
    });
    const GMT = 60 * 60 * 1000;
    const _startDate = new Date(data.startDate).getTime();
    const _untilDate = new Date(data.untilDate).getTime();
    const startOfDay = new Date(_startDate - GMT * 5);
    const endOfDay = new Date(_untilDate - GMT * 5);
    const newLicence = await prisma.licenses.createMany({
      data: usersWithoutActiveLicenses.map(user => ({
        usersId: user.id,
        reason: data.reason,
        type: 'PERMISO',
        status: 'ACEPTADO',
        supervisorId: data.supervisorId,
        startDate: startOfDay,
        untilDate: endOfDay,
      })),
    });
    return newLicence;
  }

  static async update(id: Licenses['id'], data: LicenseCreatePayload) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const recurrenceOccurrences = this.getRecurrenceOccurrences(data);
    const isRecurringParent = recurrenceOccurrences.length > 0;
    const currentLicense = await prisma.licenses.findUnique({
      where: { id },
      select: { departureFile: true },
    });
    if (
      isRecurringParent &&
      !data.departureFile &&
      !currentLicense?.departureFile
    ) {
      throw new AppError(
        'La resolucion es obligatoria para solicitudes de varios dias',
        400
      );
    }
    const firstOccurrence = recurrenceOccurrences[0];
    const lastOccurrence =
      recurrenceOccurrences[recurrenceOccurrences.length - 1];
    const startOfDay = this.normalizeLocalDate(
      isRecurringParent ? firstOccurrence.startDate : data.startDate
    );
    const endOfDay = this.normalizeLocalDate(
      isRecurringParent ? lastOccurrence.untilDate : data.untilDate
    );
    const updateData: Prisma.LicensesUncheckedUpdateInput = {
      usersId: data.usersId,
      supervisorId: data.supervisorId,
      reason: data.reason,
      feedback: data.feedback,
      type: data.type,
      status: data.status,
      fine: data.fine,
      departureFile: data.departureFile ?? currentLicense?.departureFile,
      arrivalFile: data.arrivalFile,
      startDate: startOfDay,
      checkout: data.checkout,
      untilDate: endOfDay,
    };
    if (isRecurringParent) {
      updateData.isRecurringParent = true;
      updateData.recurrenceRule = JSON.stringify({
        occurrences: recurrenceOccurrences,
      });
    }
    const updateList = await prisma.licenses.update({
      where: { id },
      data: updateData,
    });
    this.emitRealtimeLicenseUpdate(updateList);
    return updateList;
  }
  static async updateApprove(
    id: Licenses['id'],
    { feedback, status, supervisorId }: Licenses,
    reviewerId?: number
  ) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const license = await prisma.licenses.findUnique({ where: { id } });
    if (!license) throw new AppError('Solicitud no encontrada', 404);
    if (
      reviewerId &&
      license.usersId === reviewerId &&
      ['ACEPTADO', 'DENEGADO'].includes(status)
    ) {
      throw new AppError(
        'Una solicitud personal debe ser aprobada por otro usuario autorizado',
        400
      );
    }
    const updateList = await prisma.licenses.update({
      where: { id },
      data: {
        feedback,
        status,
        supervisorId: reviewerId ?? supervisorId,
      },
    });
    if (updateList.isRecurringParent) {
      await this.applyRecurringApproval(updateList, {
        feedback,
        status,
        supervisorId,
      });
    }
    this.emitRealtimeLicenseUpdate(updateList);
    return updateList;
  }

  private static async applyRecurringApproval(
    parent: Licenses,
    {
      feedback,
      status,
      supervisorId,
    }: Pick<Licenses, 'feedback' | 'status' | 'supervisorId'>
  ) {
    if (!parent.recurrenceRule) return;
    const parsed = JSON.parse(parent.recurrenceRule) as {
      occurrences?: RecurrenceOccurrence[];
    };
    const occurrences = parsed.occurrences ?? [];
    await prisma.licenses.deleteMany({
      where: {
        recurrenceParentId: parent.id,
        checkout: null,
      },
    });
    if (!['ACEPTADO', 'DENEGADO'].includes(status)) return;
    await prisma.licenses.createMany({
      data: occurrences.map((occurrence, index) => ({
        usersId: parent.usersId,
        supervisorId,
        reason: parent.reason,
        feedback,
        type: parent.type,
        status,
        startDate: this.normalizeLocalDate(occurrence.startDate),
        untilDate: this.normalizeLocalDate(occurrence.untilDate),
        recurrenceParentId: parent.id,
        recurrenceGroupId: parent.recurrenceGroupId,
        recurrenceIndex: index + 1,
      })),
    });
  }
  static async updateCheckOut(
    id: Licenses['id'],
    { checkout, fine, status }: Licenses
  ) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const updateList = await prisma.licenses.update({
      where: { id },
      data: {
        checkout,
        fine,
        status,
      },
    });
    this.emitRealtimeLicenseUpdate(updateList);
    return updateList;
  }

  static async getActiveLicensesForAttendance() {
    const [licenses, usersActive] = await Promise.all([
      prisma.licenses.findMany({
        where: {
          status: 'ACTIVO',
          isRecurringParent: false,
        },
        select: {
          id: true,
          usersId: true,
          type: true,
        },
      }),
      prisma.users.findMany({
        where: activeNonRemoteUserWhere,
        select: {
          id: true,
        },
      }),
    ]);
    const usersWithActiveLicense = new Set(
      licenses.map(license => license.usersId)
    );
    const updatedData = usersActive
      .filter(user => !usersWithActiveLicense.has(user.id))
      .map(user => ({ usersId: user.id, status: 'PUNTUAL' }));

    const mainData = [
      ...licenses.map(item => ({ usersId: item.usersId, status: item.type })),
      ...updatedData,
    ];
    return { licenses, mainData };
  }

  public static async getByUser(id: Licenses['usersId'], options: DateOptions) {
    if (!id) throw new AppError('Oops!,ID invalido', 400);
    const initialDate = Utilities.validateDate(options.initialDate);
    const untilDate = Utilities.validateDate(options.untilDate);
    const createdAt = { gte: initialDate, lte: untilDate };
    const licenses = await prisma.licenses.findMany({
      where: { usersId: id, createdAt },
    });
    return licenses;
  }

  static async getLicensesByStatus(
    status: Licenses['status'],
    page?: number,
    pageSize?: number,
    searchName?: string
  ) {
    await this.deleteExpiredLicenses();
    const _page = page || 1;
    const _pageSize = pageSize || 20;
    const skip = (_page - 1) * _pageSize;

    let userIdFilter: number | undefined = undefined;
    if (searchName) {
      const terms = searchName
        .trim()
        .split(/\s+/)
        .filter(term => term.length > 0);
      const findId = await prisma.users.findFirst({
        where: {
          profile: {
            OR: terms.flatMap(term => [
              { firstName: { contains: term, mode: 'insensitive' } },
              { lastName: { contains: term, mode: 'insensitive' } },
            ]),
          },
        },
        select: { id: true },
      });
      userIdFilter = findId?.id;
    }
    // Construimos el where dinámico
    const baseWhere: Prisma.LicensesWhereInput = {};
    baseWhere.recurrenceParentId = null;
    if (status) {
      const nonRemoteUsers = await prisma.users.findMany({
        where: withNonRemoteUsers(),
        select: { id: true },
      });
      baseWhere.status = status;
      baseWhere.usersId = { in: nonRemoteUsers.map(user => user.id) };
    } else if (userIdFilter) {
      baseWhere.usersId = userIdFilter;
    }

    const count = await prisma.licenses.count({
      where: baseWhere,
      orderBy: {
        createdAt: 'desc',
      },
    });
    const licenses = await prisma.licenses.findMany({
      where: baseWhere,
      orderBy: {
        createdAt: 'desc',
      },
      take: _pageSize,
      skip: skip,
    });
    return { licenses: await this.withPeople(licenses), count };
  }

  static async getLicensesEmployee(
    usersId: Licenses['usersId'],
    status?: Licenses['status'],
    page?: number,
    pageSize?: number,
    includeRecurringChildren?: boolean
  ) {
    await this.deleteExpiredLicenses();
    const _page = page || 1;
    const _pageSize = pageSize || 20;
    const skip = (_page - 1) * _pageSize;
    const recurrenceWhere: Prisma.LicensesWhereInput = includeRecurringChildren
      ? { isRecurringParent: false }
      : { recurrenceParentId: null };
    const count = await prisma.licenses.count({
      where: {
        usersId,
        ...recurrenceWhere,
        ...(status ? { status } : {}),
      },
    });
    const licenses = await prisma.licenses.findMany({
      where: {
        usersId,
        ...recurrenceWhere,
        ...(status ? { status } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: _pageSize,
      skip: skip,
    });
    return { licenses: await this.withPeople(licenses), count };
  }

  public static async getLcenseListByUser(
    usersId: number,
    params: DateOptions<undefined>
  ) {
    const licenses = await prisma.licenses.findMany({
      where: {
        usersId,
        createdAt: { gte: params.initialDate, lte: params.untilDate },
      },
      select: { checkout: true, fine: true },
    });
    return this.countFee(licenses);
  }

  static async getLicensesFee(
    startDate: string,
    endDate: string,
    usersId?: Licenses['usersId']
  ) {
    const GMT = 60 * 60 * 1000;
    const _startDate = new Date(startDate).getTime();
    const _endDate = new Date(endDate).getTime();
    const startOfDay = new Date(_startDate + GMT * 5);
    const endOfDay = new Date(_endDate + GMT * 29 - 1);
    const licenses = await prisma.licenses.findMany({
      where: {
        usersId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        checkout: true,
        fine: true,
      },
    });
    return this.countFee(licenses);
  }

  static async getLicensesFineReport(
    startDate?: string,
    endDate?: string,
    usersId?: Licenses['usersId']
  ) {
    const { periodStart, periodEnd } = this.getFineReportPeriod(
      startDate,
      endDate
    );
    const licenses = await this.findFineReportLicenses(
      startDate,
      endDate,
      usersId
    );
    const adjustments = await this.getFineReportAdjustments(
      licenses,
      periodStart,
      periodEnd
    );
    return {
      rows: await this.withPeople(licenses),
      summary: this.countFee(licenses),
      count: licenses.length,
      adjustments,
    };
  }

  private static getFineReportPeriod(
    startDate?: string,
    endDate?: string
  ): LicenseFineReportPeriod {
    const GMT = 60 * 60 * 1000;
    const periodStart = startDate
      ? new Date(new Date(startDate).getTime() + GMT * 5)
      : undefined;
    const periodEnd = endDate
      ? new Date(new Date(endDate).getTime() + GMT * 29 - 1)
      : undefined;
    const dateFilter =
      startDate || endDate
        ? {
            gte: periodStart,
            lte: periodEnd,
          }
        : undefined;
    return { dateFilter, periodStart, periodEnd };
  }

  private static async findFineReportLicenses(
    startDate?: string,
    endDate?: string,
    usersId?: Licenses['usersId']
  ) {
    const { dateFilter } = this.getFineReportPeriod(startDate, endDate);
    return prisma.licenses.findMany({
      where: {
        usersId,
        isRecurringParent: false,
        fine: { not: null },
        ...(dateFilter ? { untilDate: dateFilter } : {}),
      },
      orderBy: { untilDate: 'desc' },
      select: {
        id: true,
        usersId: true,
        supervisorId: true,
        reason: true,
        feedback: true,
        type: true,
        status: true,
        fine: true,
        startDate: true,
        untilDate: true,
        checkout: true,
        createdAt: true,
      },
    });
  }

  private static getFineAmount(fine?: Licenses['fine'] | null) {
    return fine ? this.fineAmounts[fine] ?? 0 : 0;
  }

  private static async getFineReportAdjustments(
    licenses: Awaited<
      ReturnType<typeof LicenseServices.findFineReportLicenses>
    >,
    periodStart?: Date,
    periodEnd?: Date
  ) {
    const licenseIds = licenses.map(item => item.id);
    const userIds = [...new Set(licenses.map(item => item.usersId))];
    if (!licenseIds.length || !userIds.length) {
      return { license: {}, userPeriod: {} };
    }
    const [licenseAdjustments, userPeriodAdjustments] = await Promise.all([
      prisma.licensePenaltyAdjustment.findMany({
        where: {
          status: 'ACTIVE',
          scope: 'LICENSE',
          licenseId: { in: licenseIds },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.licensePenaltyAdjustment.findMany({
        where: {
          status: 'ACTIVE',
          scope: 'USER_PERIOD',
          userId: { in: userIds },
          periodStart: periodStart ?? null,
          periodEnd: periodEnd ?? null,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return {
      license: licenseAdjustments.reduce<
        Record<number, (typeof licenseAdjustments)[number]>
      >((acc, item) => {
        if (item.licenseId && !acc[item.licenseId]) acc[item.licenseId] = item;
        return acc;
      }, {}),
      userPeriod: userPeriodAdjustments.reduce<
        Record<number, (typeof userPeriodAdjustments)[number]>
      >((acc, item) => {
        if (!acc[item.userId]) acc[item.userId] = item;
        return acc;
      }, {}),
    };
  }

  static async upsertPenaltyAdjustments(
    actorId: number | undefined,
    data: LicensePenaltyAdjustmentBulkInput
  ) {
    if (!actorId)
      throw new AppError('Usuario autorizador no identificado', 401);
    if (!data?.userId) throw new AppError('Usuario invalido', 400);
    const period = this.getFineReportPeriod(data.periodStart, data.periodEnd);
    const items = (data.items ?? []).filter(item => {
      return (
        Number.isFinite(item.licenseId) &&
        Number.isFinite(item.adjustedAmount) &&
        item.adjustedAmount >= 0 &&
        item.reason?.trim()
      );
    });
    const hasTotal =
      data.total &&
      Number.isFinite(data.total.adjustedAmount) &&
      data.total.adjustedAmount >= 0 &&
      data.total.reason?.trim();
    if (!hasTotal && !items.length) {
      throw new AppError('Ingrese un ajuste y un motivo', 400);
    }
    const licenses = await this.findFineReportLicenses(
      data.periodStart,
      data.periodEnd,
      data.userId
    );
    const licenseMap = new Map(licenses.map(item => [item.id, item]));
    const requestedLicenseIds = items.map(item => item.licenseId);
    if (requestedLicenseIds.some(id => !licenseMap.has(id))) {
      throw new AppError(
        'Una incidencia no pertenece al periodo seleccionado',
        400
      );
    }
    const rawTotal = licenses.reduce(
      (sum, item) => sum + this.getFineAmount(item.fine),
      0
    );
    if (hasTotal && data.total && data.total.adjustedAmount > rawTotal) {
      throw new AppError(
        'El ajuste total no puede superar el monto calculado',
        400
      );
    }
    const invalidItemAmount = items.some(item => {
      const license = licenseMap.get(item.licenseId);
      const originalAmount = license ? this.getFineAmount(license.fine) : 0;
      return item.adjustedAmount > originalAmount;
    });
    if (invalidItemAmount) {
      throw new AppError(
        'El ajuste de una incidencia no puede superar su monto calculado',
        400
      );
    }
    const now = new Date();
    const result = await prisma.$transaction(async tx => {
      const created = [];
      if (hasTotal && data.total) {
        await tx.licensePenaltyAdjustment.updateMany({
          where: {
            status: 'ACTIVE',
            scope: 'USER_PERIOD',
            userId: data.userId,
            periodStart: period.periodStart ?? null,
            periodEnd: period.periodEnd ?? null,
          },
          data: {
            status: 'VOIDED',
            voidedAt: now,
            voidedById: actorId,
            voidReason: 'Reemplazado por un nuevo ajuste de periodo',
          },
        });
        created.push(
          await tx.licensePenaltyAdjustment.create({
            data: {
              scope: 'USER_PERIOD',
              userId: data.userId,
              adjustedById: actorId,
              originalAmount: rawTotal,
              adjustedAmount: data.total.adjustedAmount,
              reason: data.total.reason.trim(),
              periodStart: period.periodStart,
              periodEnd: period.periodEnd,
            },
          })
        );
      }
      for (const item of items) {
        const license = licenseMap.get(item.licenseId);
        if (!license) continue;
        await tx.licensePenaltyAdjustment.updateMany({
          where: {
            status: 'ACTIVE',
            scope: 'LICENSE',
            licenseId: item.licenseId,
          },
          data: {
            status: 'VOIDED',
            voidedAt: now,
            voidedById: actorId,
            voidReason: 'Reemplazado por un nuevo ajuste de incidencia',
          },
        });
        created.push(
          await tx.licensePenaltyAdjustment.create({
            data: {
              scope: 'LICENSE',
              licenseId: item.licenseId,
              userId: license.usersId,
              adjustedById: actorId,
              originalFine: license.fine,
              originalAmount: this.getFineAmount(license.fine),
              adjustedAmount: item.adjustedAmount,
              reason: item.reason.trim(),
              periodStart: period.periodStart,
              periodEnd: period.periodEnd,
            },
          })
        );
      }
      return created;
    });
    this.emitRealtimeLicenseUpdate();
    return { count: result.length, adjustments: result };
  }

  static async voidPenaltyAdjustments(
    actorId: number | undefined,
    data: LicensePenaltyAdjustmentVoidInput
  ) {
    if (!actorId)
      throw new AppError('Usuario autorizador no identificado', 401);
    if (!data?.userId) throw new AppError('Usuario invalido', 400);
    const period = this.getFineReportPeriod(data.periodStart, data.periodEnd);
    const licenseIds = data.licenseIds?.filter(Number.isFinite) ?? [];
    const now = new Date();
    const result = await prisma.licensePenaltyAdjustment.updateMany({
      where: {
        status: 'ACTIVE',
        userId: data.userId,
        OR: [
          {
            scope: 'USER_PERIOD',
            periodStart: period.periodStart ?? null,
            periodEnd: period.periodEnd ?? null,
          },
          ...(licenseIds.length
            ? [
                {
                  scope: 'LICENSE' as const,
                  licenseId: { in: licenseIds },
                },
              ]
            : []),
        ],
      },
      data: {
        status: 'VOIDED',
        voidedAt: now,
        voidedById: actorId,
        voidReason: data.reason?.trim() || 'Ajuste limpiado desde reporte',
      },
    });
    this.emitRealtimeLicenseUpdate();
    return result;
  }

  public static countFee(data: Pick<Licenses, 'fine' | 'checkout'>[]) {
    const result: ObjectNumber = data.reduce((fee: typeof result, item) => {
      const fine = item.fine;
      if (fine) fee[fine] = (fee[fine] || 0) + 1;
      return fee;
    }, {});
    return result;
  }

  static async activeLicenses() {
    const GMT = 5 * 60 * 60 * 1000;
    const now = new Date();
    const gmtMinus5Time = new Date(now.getTime() - GMT);

    const licenses = await prisma.licenses.findMany({
      where: {
        status: 'ACEPTADO',
        isRecurringParent: false,
        startDate: { lte: gmtMinus5Time },
        untilDate: { gte: gmtMinus5Time },
      },
      select: { id: true },
    });
    const listIds = licenses.map(({ id }) => id);
    const activated = await prisma.licenses.updateMany({
      where: { id: { in: listIds } },
      data: { status: 'ACTIVO' },
    });
    if (activated.count > 0) this.emitRealtimeLicenseUpdate();
    return licenses;
  }

  static async deleteExpiredLicenses() {
    await this.activeLicenses();

    const GMT = 5 * 60 * 60 * 1000;
    const now = new Date();
    const gmtMinus5Time = new Date(now.getTime() - GMT);
    const unattendedPendingLimit = new Date(
      gmtMinus5Time.getTime() - 10 * 60 * 1000
    );
    const noCheckInLimit = new Date(gmtMinus5Time.getTime() - 20 * 60 * 1000);

    const expiredPending = await prisma.licenses.updateMany({
      where: {
        status: 'PROCESO',
        checkout: null,
        fine: null,
        isRecurringParent: false,
        startDate: { lt: unattendedPendingLimit },
      },
      data: {
        status: 'DENEGADO',
        feedback: 'No atendido',
      },
    });

    const licenses = await prisma.licenses.findMany({
      where: {
        status: {
          in: ['ACTIVO', 'ACEPTADO'],
        },
        isRecurringParent: false,
        untilDate: { lt: gmtMinus5Time },
      },
      select: { id: true },
    });
    const listIds = licenses.map(({ id }) => id);
    const finalizedExpired = await prisma.licenses.updateMany({
      where: {
        id: { in: listIds },
        checkout: { not: null },
      },
      data: { status: 'INACTIVO' },
    });
    const noCheckIn = await prisma.licenses.updateMany({
      where: {
        status: {
          in: ['ACTIVO', 'ACEPTADO', 'INACTIVO'],
        },
        isRecurringParent: false,
        checkout: null,
        fine: null,
        untilDate: { lt: noCheckInLimit },
      },
      data: {
        fine: 'MUY_GRAVE',
        status: 'INACTIVO',
      },
    });
    if (
      expiredPending.count > 0 ||
      finalizedExpired.count > 0 ||
      noCheckIn.count > 0
    ) {
      this.emitRealtimeLicenseUpdate();
    }
    return licenses;
  }

  static async deleteLicense(id: Licenses['id']) {
    const licenses = await prisma.licenses.delete({
      where: { id },
    });

    this.emitRealtimeLicenseUpdate(licenses);
    return licenses;
  }
  // static async depFile(id: Licenses['id']) {
  //   const licenses = await prisma.licenses.update({
  //     where: { id },
  //   });

  //   return licenses;
  // }
}
export default LicenseServices;

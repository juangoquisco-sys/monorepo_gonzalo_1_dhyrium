import {
  LicensesStatus,
  ProductionBonusEventType,
  ProductionBonusOrigin,
  ProductionBonusStatus,
} from '@prisma/client';
import type { ProductionBonusType } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';

type AssignmentInput = {
  usersIds?: number[];
  userId?: number;
  type: ProductionBonusType;
  reason: string;
  startDate: string | Date;
  endDate: string | Date;
  feedback?: string;
};

type RegularizationInput = AssignmentInput & {
  requestedHours?: number;
};

type ListOptions = {
  page?: number;
  pageSize?: number;
  status?: ProductionBonusStatus;
  type?: ProductionBonusType;
  searchName?: string;
  startDate?: string;
  endDate?: string;
  mine?: boolean;
  forceMine?: boolean;
};

const requestInclude = {
  user: { include: { profile: true } },
  assignedBy: { include: { profile: true } },
  requestedBy: { include: { profile: true } },
  supervisor: { include: { profile: true } },
  validatedBy: { include: { profile: true } },
  evidences: true,
  events: { orderBy: { eventAt: 'desc' as const } },
};

const parseDate = (value: string | Date, label: string) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${label} no es una fecha valida`, 400);
  }
  return date;
};

const calculateHours = (startDate: Date, endDate: Date) => {
  const milliseconds = endDate.getTime() - startDate.getTime();
  if (milliseconds <= 0) {
    throw new AppError('La hora de fin debe ser posterior al inicio', 400);
  }
  return Math.round((milliseconds / 36_000) * 100) / 100;
};

const getWorkDate = (startDate: Date) => {
  return new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate()
    )
  );
};

class ProductionBonusServices {
  private static async assertUsersExist(usersIds: number[]) {
    const users = await prisma.users.findMany({
      where: { id: { in: usersIds }, status: true },
      select: { id: true },
    });
    const foundIds = new Set(users.map(user => user.id));
    const missingIds = usersIds.filter(id => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new AppError(
        `Usuarios no disponibles para asignacion: ${missingIds.join(', ')}`,
        400
      );
    }
  }

  private static async assertNoConflicts(
    usersIds: number[],
    startDate: Date,
    endDate: Date,
    ignoreId?: string
  ) {
    const existingBonus = await prisma.productionBonusRequest.findFirst({
      where: {
        id: ignoreId ? { not: ignoreId } : undefined,
        userId: { in: usersIds },
        status: {
          notIn: [
            ProductionBonusStatus.ANULADO,
            ProductionBonusStatus.RECHAZADO,
            ProductionBonusStatus.CERRADO,
          ],
        },
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
      include: { user: { include: { profile: true } } },
    });
    if (existingBonus) {
      const name = existingBonus.user.profile
        ? `${existingBonus.user.profile.firstName} ${existingBonus.user.profile.lastName}`
        : `Usuario ${existingBonus.userId}`;
      throw new AppError(
        `${name} ya tiene un bono por produccion cruzado en ese horario`,
        400
      );
    }

    const existingLicense = await prisma.licenses.findFirst({
      where: {
        usersId: { in: usersIds },
        status: {
          in: [LicensesStatus.ACTIVO, LicensesStatus.ACEPTADO],
        },
        startDate: { lt: endDate },
        untilDate: { gt: startDate },
      },
    });
    if (existingLicense) {
      throw new AppError(
        'Existe una salida o permiso aprobado que cruza con el horario indicado',
        400
      );
    }
  }

  private static async createEvent(
    productionBonusRequestId: string,
    actorId: number | undefined,
    eventType: ProductionBonusEventType,
    notes?: string,
    metadata?: Record<string, unknown>
  ) {
    await prisma.productionBonusEvent.create({
      data: {
        productionBonusRequestId,
        actorId,
        eventType,
        notes,
        metadata,
      },
    });
  }

  public static async assign(body: AssignmentInput, actorId: number) {
    const usersIds = body.usersIds?.length
      ? body.usersIds.map(Number)
      : body.userId
      ? [Number(body.userId)]
      : [];
    if (usersIds.length === 0) {
      throw new AppError('Selecciona al menos un usuario', 400);
    }
    if (!body.reason?.trim()) {
      throw new AppError('El motivo es obligatorio', 400);
    }
    const startDate = parseDate(body.startDate, 'Inicio');
    const endDate = parseDate(body.endDate, 'Fin');
    const assignedHours = calculateHours(startDate, endDate);
    await this.assertUsersExist(usersIds);
    await this.assertNoConflicts(usersIds, startDate, endDate);

    const created = [];
    for (const userId of usersIds) {
      const request = await prisma.productionBonusRequest.create({
        data: {
          userId,
          origin: ProductionBonusOrigin.ASSIGNED_BY_MANAGER,
          assignedById: actorId,
          type: body.type,
          status: ProductionBonusStatus.ASIGNADO,
          reason: body.reason.trim(),
          feedback: body.feedback?.trim() || null,
          workDate: getWorkDate(startDate),
          startDate,
          endDate,
          assignedHours,
          assignedAt: new Date(),
        },
        include: requestInclude,
      });
      await this.createEvent(
        request.id,
        actorId,
        ProductionBonusEventType.ASSIGNMENT_CREATED,
        'Asignacion creada',
        { assignedHours }
      );
      created.push(request);
    }

    return created;
  }

  public static async regularize(
    body: RegularizationInput,
    actorId: number,
    canRegularizeForOthers = false
  ) {
    const userId = canRegularizeForOthers
      ? Number(body.userId || actorId)
      : actorId;
    const startDate = parseDate(body.startDate, 'Inicio');
    const endDate = parseDate(body.endDate, 'Fin');
    const requestedHours =
      body.requestedHours ?? calculateHours(startDate, endDate);
    await this.assertUsersExist([userId]);
    await this.assertNoConflicts([userId], startDate, endDate);
    const request = await prisma.productionBonusRequest.create({
      data: {
        userId,
        origin: ProductionBonusOrigin.REQUESTED_BY_USER,
        requestedById: actorId,
        type: body.type,
        status: ProductionBonusStatus.PROCESO,
        reason: body.reason.trim(),
        workDate: getWorkDate(startDate),
        startDate,
        endDate,
        requestedHours,
      },
      include: requestInclude,
    });
    await this.createEvent(
      request.id,
      actorId,
      ProductionBonusEventType.REQUEST_CREATED,
      'Regularizacion creada',
      { requestedHours }
    );
    return request;
  }

  public static async list(options: ListOptions, actorId: number) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const pageSize =
      options.pageSize && options.pageSize > 0 ? options.pageSize : 20;
    const startDate = options.startDate ? new Date(options.startDate) : null;
    const endDate = options.endDate ? new Date(options.endDate) : null;

    const where: any = {
      status: options.status || undefined,
      type: options.type || undefined,
      userId: options.forceMine || options.mine ? actorId : undefined,
      startDate:
        startDate && !Number.isNaN(startDate.getTime())
          ? { gte: startDate }
          : undefined,
      endDate:
        endDate && !Number.isNaN(endDate.getTime())
          ? { lte: endDate }
          : undefined,
    };

    if (options.searchName?.trim()) {
      const terms = options.searchName.trim().split(/\s+/);
      where.user = {
        profile: {
          OR: terms.flatMap(term => [
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
            { dni: { contains: term } },
          ]),
        },
      };
    }

    const [items, total, summary] = await Promise.all([
      prisma.productionBonusRequest.findMany({
        where,
        include: requestInclude,
        orderBy: { startDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.productionBonusRequest.count({ where }),
      this.summary(actorId, options.forceMine || options.mine),
    ]);

    return { items, total, page, pageSize, summary };
  }

  public static async summary(actorId: number, mine = false) {
    const where = mine ? { userId: actorId } : {};
    const [assigned, inValidation, regularizations, validated, liquidated] =
      await Promise.all([
        prisma.productionBonusRequest.count({
          where: { ...where, status: ProductionBonusStatus.ASIGNADO },
        }),
        prisma.productionBonusRequest.count({
          where: {
            ...where,
            status: ProductionBonusStatus.PENDIENTE_VALIDACION,
          },
        }),
        prisma.productionBonusRequest.count({
          where: { ...where, status: ProductionBonusStatus.PROCESO },
        }),
        prisma.productionBonusRequest.count({
          where: { ...where, status: ProductionBonusStatus.VALIDADO },
        }),
        prisma.productionBonusRequest.count({
          where: { ...where, status: ProductionBonusStatus.LIQUIDADO },
        }),
      ]);
    return { assigned, inValidation, regularizations, validated, liquidated };
  }

  public static async updateStatus(
    id: string,
    actorId: number,
    status: ProductionBonusStatus,
    body: {
      feedback?: string;
      validationFeedback?: string;
      approvedHours?: number;
      executedHours?: number;
      validatedHours?: number;
    } = {}
  ) {
    const current = await prisma.productionBonusRequest.findUnique({
      where: { id },
    });
    if (!current) throw new AppError('Bono por produccion no encontrado', 404);
    if (current.status === ProductionBonusStatus.LIQUIDADO) {
      throw new AppError('No se puede modificar un bono liquidado', 400);
    }

    const now = new Date();
    const data: any = {
      status,
      feedback: body.feedback ?? undefined,
      validationFeedback: body.validationFeedback ?? undefined,
      approvedHours: body.approvedHours ?? undefined,
      executedHours: body.executedHours ?? undefined,
      validatedHours: body.validatedHours ?? undefined,
    };

    let eventType: ProductionBonusEventType =
      ProductionBonusEventType.ASSIGNMENT_UPDATED;
    if (status === ProductionBonusStatus.ANULADO) {
      eventType = ProductionBonusEventType.ASSIGNMENT_CANCELLED;
    }
    if (status === ProductionBonusStatus.APROBADO) {
      data.supervisorId = actorId;
      data.approvedAt = now;
      eventType = ProductionBonusEventType.REQUEST_APPROVED;
    }
    if (status === ProductionBonusStatus.RECHAZADO) {
      data.supervisorId = actorId;
      eventType = ProductionBonusEventType.REQUEST_REJECTED;
    }
    if (status === ProductionBonusStatus.OBSERVADO) {
      data.supervisorId = actorId;
      eventType = ProductionBonusEventType.REQUEST_OBSERVED;
    }
    if (status === ProductionBonusStatus.VALIDADO) {
      const validatedHours =
        body.validatedHours ??
        current.executedHours ??
        current.approvedHours ??
        current.assignedHours ??
        current.requestedHours;
      if (!validatedHours || validatedHours <= 0) {
        throw new AppError('Ingresa horas validadas mayores a cero', 400);
      }
      data.validatedById = actorId;
      data.validatedAt = now;
      data.validatedHours = validatedHours;
      eventType = ProductionBonusEventType.HOURS_VALIDATED;
    }
    if (status === ProductionBonusStatus.LIQUIDADO) {
      if (!current.validatedHours && !body.validatedHours) {
        throw new AppError('No se puede liquidar sin horas validadas', 400);
      }
      data.liquidatedById = actorId;
      data.liquidatedAt = now;
      eventType = ProductionBonusEventType.REQUEST_LIQUIDATED;
    }

    const updated = await prisma.productionBonusRequest.update({
      where: { id },
      data,
      include: requestInclude,
    });
    await this.createEvent(
      id,
      actorId,
      eventType,
      body.feedback || body.validationFeedback,
      { status }
    );
    return updated;
  }
}

export default ProductionBonusServices;

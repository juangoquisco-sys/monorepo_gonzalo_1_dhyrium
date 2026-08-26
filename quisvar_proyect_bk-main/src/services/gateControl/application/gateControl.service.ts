import AppError from '@/utils/appError';
import { Prisma } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import SocketManager from '@/models/SocketManager';
import {
  GateCreatePassBody,
  GateDirectPenaltyAdjustmentBody,
  GateEvidenceType,
  GateFineAdjustmentBody,
  GateFineAdjustmentVoidBody,
  GateFineReportFilters,
  GateMarkReturnBody,
  GatePassFilters,
  GateReviewDecisionBody,
  GateReviewRequestStatus,
  GateSubmitReviewRequestBody,
} from '@/types/gateControl';
import { GateTimePolicy } from '@/services/gateControl/domain/gateTimePolicy';
import {
  gatePassInclude,
  gateReviewRequestInclude,
  gateUserSelect,
} from '@/services/gateControl/infrastructure/gateControl.repository';

const LICENSE_PENDING_LOOKAHEAD_MS = 15 * 60 * 1000;
const LICENSE_PENDING_GRACE_MS = 10 * 60 * 1000;
const ACTIVE_GATE_STATUSES = [
  'ACTIVE',
  'PENDING_EXIT_REVIEW',
  'PENDING_RETURN_REVIEW',
] as const;
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;

type GateFineResult = 'PUNTUAL' | 'TARDE' | 'SIMPLE' | 'GRAVE' | 'MUY_GRAVE';

type UploadedEvidence = {
  filePath?: string;
  originalName?: string;
  mimeType?: string;
};

class GateControlService {
  private static readonly fineAmounts: Record<GateFineResult, number> = {
    PUNTUAL: 0,
    TARDE: 0.5,
    SIMPLE: 2,
    GRAVE: 5,
    MUY_GRAVE: 10,
  };

  private static readonly fineWeights: Record<GateFineResult, number> = {
    PUNTUAL: 1,
    TARDE: 2,
    SIMPLE: 3,
    GRAVE: 4,
    MUY_GRAVE: 5,
  };

  static emitGateControlUpdate(
    userId: number,
    payload: { passId: string; action: string }
  ) {
    try {
      SocketManager.getInstance()
        .to(String(userId))
        .emit('server:gate-control-update', payload);
    } catch {
      // SocketManager can be unavailable in scripts/tests; HTTP flow must continue.
    }
  }

  static buildPassView<
    T extends {
      status: string;
      dueAt?: Date | null;
      actualExitAt?: Date | null;
      requestedMinutes?: number;
      reviewRequests?: { type: string; claimedEventAt?: Date | null }[];
    }
  >(pass: T) {
    const exitReview = pass.reviewRequests?.find(
      request =>
        request.type === 'EXIT_REGULARIZATION' && request.claimedEventAt
    );
    const actualExitAt =
      pass.actualExitAt || exitReview?.claimedEventAt || null;
    const dueAt =
      pass.dueAt ||
      (actualExitAt && pass.requestedMinutes
        ? GateTimePolicy.dueAt(actualExitAt, pass.requestedMinutes)
        : null);
    const enrichedPass = {
      ...pass,
      actualExitAt,
      dueAt,
    };

    return {
      ...enrichedPass,
      runtimeStatus: GateTimePolicy.runtimeStatus(enrichedPass),
    };
  }

  static evidenceType(value?: string): GateEvidenceType {
    const allowed: GateEvidenceType[] = [
      'PHOTO',
      'WHATSAPP_SCREENSHOT',
      'LOCATION',
      'NOTE',
      'OTHER_FILE',
    ];
    return allowed.includes(value as GateEvidenceType)
      ? (value as GateEvidenceType)
      : 'OTHER_FILE';
  }

  private static passMinutes(startDate: Date, untilDate: Date) {
    return Math.max(
      1,
      Math.ceil((untilDate.getTime() - startDate.getTime()) / 60000)
    );
  }

  private static licenseFine(returnedAt: Date, dueAt?: Date | null) {
    if (!dueAt || returnedAt <= dueAt) return 'PUNTUAL';
    const diff = returnedAt.getTime() - dueAt.getTime();
    if (diff >= 20 * 60 * 1000) return 'MUY_GRAVE';
    if (diff >= 15 * 60 * 1000) return 'GRAVE';
    if (diff >= 10 * 60 * 1000) return 'SIMPLE';
    if (diff >= 3 * 60 * 1000) return 'TARDE';
    return 'PUNTUAL';
  }

  private static gateFineByMinutes(minutes = 0): GateFineResult {
    if (minutes >= 20) return 'MUY_GRAVE';
    if (minutes >= 15) return 'GRAVE';
    if (minutes >= 10) return 'SIMPLE';
    if (minutes >= 3) return 'TARDE';
    return 'PUNTUAL';
  }

  private static gateFineAmount(result: GateFineResult) {
    return this.fineAmounts[result] ?? 0;
  }

  private static buildFineReportPeriod(dateFrom?: string, dateTo?: string) {
    const periodStart = dateFrom ? GateTimePolicy.parseDate(dateFrom) : null;
    let periodEnd: Date | null = null;
    const actualReturnAt: Prisma.DateTimeFilter = {};

    if (periodStart) actualReturnAt.gte = periodStart;
    if (dateTo) {
      periodEnd = GateTimePolicy.parseDate(dateTo);
      periodEnd.setDate(periodEnd.getDate() + 1);
      actualReturnAt.lt = periodEnd;
    }

    return {
      periodStart,
      periodEnd,
      actualReturnAt:
        actualReturnAt.gte || actualReturnAt.lt ? actualReturnAt : undefined,
    };
  }

  private static buildGateUserSearch(search?: string) {
    if (!search?.trim()) return undefined;
    const query = search.trim();
    const mode = Prisma.QueryMode.insensitive;
    const terms = query.split(/\s+/).filter(Boolean);
    return {
      OR: [
        { email: { contains: query, mode } },
        { profile: { is: { dni: { contains: query } } } },
        ...terms.flatMap(term => [
          { profile: { is: { firstName: { contains: term, mode } } } },
          { profile: { is: { lastName: { contains: term, mode } } } },
        ]),
      ],
    } satisfies Prisma.UsersWhereInput;
  }

  private static gateLicenseNow() {
    return new Date(Date.now() - LIMA_OFFSET_MS);
  }

  private static licenseDateToGateDate(date: Date) {
    return new Date(date.getTime() + LIMA_OFFSET_MS);
  }

  private static gateDateToLicenseDate(date: Date) {
    return new Date(date.getTime() - LIMA_OFFSET_MS);
  }

  private static async activateDueLicenses(now = this.gateLicenseNow()) {
    const activated = await prisma.licenses.updateMany({
      where: {
        status: 'ACEPTADO',
        checkout: null,
        fine: null,
        isRecurringParent: false,
        startDate: { lte: now },
        untilDate: { gte: now },
      },
      data: { status: 'ACTIVO' },
    });
    if (activated.count > 0) {
      try {
        const io = SocketManager.getInstance();
        io.emit('server:license-update');
        io.emit('server:gate-control-update', {
          passId: 'license',
          action: 'LICENSE_CHANGED',
        });
      } catch {
        // SocketManager can be unavailable in scripts/tests; HTTP flow must continue.
      }
    }
  }

  private static async expireUnattendedPendingLicenses(
    now = this.gateLicenseNow()
  ) {
    const unattendedLimit = new Date(now.getTime() - LICENSE_PENDING_GRACE_MS);
    const unattended = await prisma.licenses.updateMany({
      where: {
        status: 'PROCESO',
        checkout: null,
        fine: null,
        isRecurringParent: false,
        startDate: { lt: unattendedLimit },
      },
      data: {
        status: 'DENEGADO',
        feedback: 'No atendido',
      },
    });
    if (unattended.count > 0) {
      try {
        const io = SocketManager.getInstance();
        io.emit('server:license-update');
        io.emit('server:gate-control-update', {
          passId: 'license',
          action: 'LICENSE_CHANGED',
        });
      } catch {
        // SocketManager can be unavailable in scripts/tests; HTTP flow must continue.
      }
    }
  }

  private static async translateApprovedLicenses(userId?: number) {
    const now = this.gateLicenseNow();
    await this.activateDueLicenses(now);
    const noCheckInLimit = new Date(now.getTime() - 20 * 60 * 1000);

    const licenses = await prisma.licenses.findMany({
      where: {
        ...(userId ? { usersId: userId } : {}),
        status: 'ACTIVO',
        checkout: null,
        fine: null,
        isRecurringParent: false,
        startDate: { lte: now },
        untilDate: { gte: noCheckInLimit },
      },
      orderBy: [{ startDate: 'asc' }, { untilDate: 'asc' }],
    });

    const users = await prisma.users.findMany({
      where: {
        id: { in: [...new Set(licenses.map(license => license.usersId))] },
      },
      select: gateUserSelect,
    });
    const userById = new Map(users.map(user => [user.id, user]));

    return licenses.flatMap(license => {
      const user = userById.get(license.usersId);
      if (!user) return [];
      return [
        this.buildPassView({
          id: `license-${license.id}`,
          userId: license.usersId,
          licenseId: license.id,
          reason: license.reason,
          requestedMinutes: this.passMinutes(
            license.startDate,
            license.untilDate
          ),
          status: 'ACTIVE',
          source: 'CONTROLLER',
          actualExitAt: this.licenseDateToGateDate(license.startDate),
          dueAt: this.licenseDateToGateDate(license.untilDate),
          actualReturnAt: null,
          originalPenaltyMinutes: 0,
          finalPenaltyMinutes: 0,
          createdAt: license.createdAt,
          updatedAt: license.createdAt,
          user,
          createdBy: null,
          departureMarkedBy: null,
          returnMarkedBy: null,
          reviewRequests: [],
          evidences: [],
        }),
      ];
    });
  }

  private static async translateAuthorizedLicenses() {
    const now = this.gateLicenseNow();
    await this.activateDueLicenses(now);
    const previewLimit = new Date(now.getTime() + LICENSE_PENDING_LOOKAHEAD_MS);

    const licenses = await prisma.licenses.findMany({
      where: {
        status: 'ACEPTADO',
        checkout: null,
        fine: null,
        isRecurringParent: false,
        startDate: { gt: now, lte: previewLimit },
        untilDate: { gte: now },
      },
      orderBy: [{ startDate: 'asc' }, { untilDate: 'asc' }],
      take: 80,
    });

    const users = await prisma.users.findMany({
      where: {
        id: { in: [...new Set(licenses.map(license => license.usersId))] },
      },
      select: gateUserSelect,
    });
    const userById = new Map(users.map(user => [user.id, user]));

    return licenses.flatMap(license => {
      const user = userById.get(license.usersId);
      if (!user) return [];
      return [
        this.buildPassView({
          id: `authorized-license-${license.id}`,
          userId: license.usersId,
          licenseId: license.id,
          reason: license.reason,
          requestedMinutes: this.passMinutes(
            license.startDate,
            license.untilDate
          ),
          status: 'ACTIVE',
          source: 'CONTROLLER',
          actualExitAt: this.licenseDateToGateDate(license.startDate),
          dueAt: this.licenseDateToGateDate(license.untilDate),
          actualReturnAt: null,
          originalPenaltyMinutes: 0,
          finalPenaltyMinutes: 0,
          createdAt: license.createdAt,
          updatedAt: license.createdAt,
          user,
          createdBy: null,
          departureMarkedBy: null,
          returnMarkedBy: null,
          reviewRequests: [],
          evidences: [],
        }),
      ];
    });
  }

  private static async translatePendingLicenses() {
    const now = this.gateLicenseNow();
    await this.expireUnattendedPendingLicenses(now);
    const previewLimit = new Date(now.getTime() + LICENSE_PENDING_LOOKAHEAD_MS);
    const visibleAfterExitLimit = new Date(
      now.getTime() - LICENSE_PENDING_GRACE_MS
    );

    const licenses = await prisma.licenses.findMany({
      where: {
        status: 'PROCESO',
        checkout: null,
        fine: null,
        isRecurringParent: false,
        startDate: { lte: previewLimit, gte: visibleAfterExitLimit },
        untilDate: { gte: now },
      },
      orderBy: [{ startDate: 'asc' }, { untilDate: 'asc' }],
    });

    const users = await prisma.users.findMany({
      where: {
        id: { in: [...new Set(licenses.map(license => license.usersId))] },
      },
      select: gateUserSelect,
    });
    const userById = new Map(users.map(user => [user.id, user]));

    return licenses.flatMap(license => {
      const user = userById.get(license.usersId);
      if (!user) return [];
      return [
        this.buildPassView({
          id: `pending-license-${license.id}`,
          userId: license.usersId,
          licenseId: license.id,
          reason: license.reason,
          requestedMinutes: this.passMinutes(
            license.startDate,
            license.untilDate
          ),
          status: 'PENDING_EXIT_REVIEW',
          source: 'CONTROLLER',
          actualExitAt: this.licenseDateToGateDate(license.startDate),
          dueAt: this.licenseDateToGateDate(license.untilDate),
          actualReturnAt: null,
          originalPenaltyMinutes: 0,
          finalPenaltyMinutes: 0,
          createdAt: license.createdAt,
          updatedAt: license.createdAt,
          user,
          createdBy: null,
          departureMarkedBy: null,
          returnMarkedBy: null,
          reviewRequests: [],
          evidences: [],
        }),
      ];
    });
  }

  static async pendingLicenses() {
    return this.translatePendingLicenses();
  }

  static async authorizedLicenses() {
    return this.translateAuthorizedLicenses();
  }

  static async approvePendingLicense(actorId: number, licenseId: number) {
    if (!Number.isFinite(licenseId)) {
      throw new AppError('No se pudo encontrar la solicitud', 404);
    }

    const license = await prisma.licenses.findUnique({
      where: { id: licenseId },
    });
    if (!license) throw new AppError('Solicitud no encontrada', 404);
    if (license.status !== 'PROCESO') {
      throw new AppError('Esta solicitud ya fue revisada', 409);
    }
    if (license.isRecurringParent) {
      throw new AppError(
        'Las solicitudes de varios dias se revisan desde el modulo Salidas',
        400
      );
    }
    if (license.usersId === actorId) {
      throw new AppError(
        'Una solicitud personal debe ser aprobada por otro usuario autorizado',
        400
      );
    }

    const gateExitAt = this.licenseDateToGateDate(license.startDate);
    const gateDueAt = this.licenseDateToGateDate(license.untilDate);
    const activePass = await prisma.gatePass.findFirst({
      where: {
        userId: license.usersId,
        licenseId: null,
        status: { in: [...ACTIVE_GATE_STATUSES] },
      },
      select: { id: true },
    });
    if (activePass) {
      throw new AppError(
        'Este usuario ya tiene una salida en curso en Control de puerta',
        400
      );
    }
    const overlappingLicense = await prisma.licenses.findFirst({
      where: {
        id: { not: license.id },
        usersId: license.usersId,
        status: { in: ['ACEPTADO', 'ACTIVO'] },
        checkout: null,
        fine: null,
        isRecurringParent: false,
        startDate: { lt: this.gateDateToLicenseDate(gateDueAt) },
        untilDate: { gt: this.gateDateToLicenseDate(gateExitAt) },
      },
      select: { id: true },
    });
    if (overlappingLicense) {
      throw new AppError(
        'Este usuario ya tiene una licencia o permiso aprobado para este horario',
        400
      );
    }

    const now = this.gateLicenseNow();
    if (
      license.startDate < new Date(now.getTime() - LICENSE_PENDING_GRACE_MS)
    ) {
      await prisma.licenses.update({
        where: { id: license.id },
        data: {
          status: 'DENEGADO',
          feedback: 'No atendido',
        },
      });
      throw new AppError(
        'La solicitud ya no puede ser atendida en puerta',
        400
      );
    }

    const nextStatus =
      license.startDate <= now && license.untilDate >= now
        ? 'ACTIVO'
        : 'ACEPTADO';

    const updated = await prisma.licenses.update({
      where: { id: license.id },
      data: {
        status: nextStatus,
        supervisorId: actorId,
        feedback: 'Autorizado desde Control de puerta',
      },
    });

    this.emitGateControlUpdate(updated.usersId, {
      passId: `license-${updated.id}`,
      action: 'PASS_CHANGED',
    });
    try {
      const io = SocketManager.getInstance();
      io.emit('server:license-update');
      io.emit('server:gate-control-update', {
        passId: `license-${updated.id}`,
        action: 'PASS_CHANGED',
      });
    } catch {
      // SocketManager can be unavailable in scripts/tests; HTTP flow must continue.
    }

    return updated;
  }

  private static async markLicenseReturn(
    actorId: number,
    licenseId: number,
    data: GateMarkReturnBody
  ) {
    if (!Number.isFinite(licenseId)) {
      throw new AppError('No se pudo encontrar la salida', 404);
    }
    const license = await prisma.licenses.findUnique({
      where: { id: licenseId },
    });
    if (!license) throw new AppError('No se pudo encontrar la salida', 404);
    if (license.checkout) {
      throw new AppError('La llegada ya fue registrada', 409);
    }

    const returnedAt = GateTimePolicy.parseDate(data.returnedAt);
    const officialDueAt = this.licenseDateToGateDate(license.untilDate);
    const licenseReturnedAt = this.gateDateToLicenseDate(returnedAt);
    const updated = await prisma.licenses.update({
      where: { id: licenseId },
      data: {
        checkout: licenseReturnedAt,
        fine: this.licenseFine(returnedAt, officialDueAt),
        status: 'INACTIVO',
      },
    });

    const user = await prisma.users.findUnique({
      where: { id: updated.usersId },
      select: gateUserSelect,
    });
    if (!user) throw new AppError('No se pudo encontrar el usuario', 404);

    const result = this.buildPassView({
      id: `license-${updated.id}`,
      userId: updated.usersId,
      licenseId: updated.id,
      reason: updated.reason,
      requestedMinutes: this.passMinutes(updated.startDate, updated.untilDate),
      status: 'RETURNED',
      source: 'CONTROLLER',
      actualExitAt: this.licenseDateToGateDate(updated.startDate),
      dueAt: this.licenseDateToGateDate(updated.untilDate),
      actualReturnAt: returnedAt,
      originalPenaltyMinutes: GateTimePolicy.penaltyMinutes(
        returnedAt,
        officialDueAt
      ),
      finalPenaltyMinutes: GateTimePolicy.penaltyMinutes(
        returnedAt,
        officialDueAt
      ),
      createdAt: updated.createdAt,
      updatedAt: new Date(),
      user,
      createdBy: null,
      departureMarkedBy: null,
      returnMarkedBy: null,
      reviewRequests: [],
      evidences: [],
    });

    this.emitGateControlUpdate(updated.usersId, {
      passId: `license-${updated.id}`,
      action: 'PASS_CHANGED',
    });
    try {
      const io = SocketManager.getInstance();
      io.emit('server:license-update');
      io.emit('server:gate-control-update', {
        passId: `license-${updated.id}`,
        action: 'PASS_CHANGED',
      });
    } catch {
      // SocketManager can be unavailable in scripts/tests; HTTP flow must continue.
    }
    return result;
  }

  static async searchUsers(query = '') {
    const search = query.trim();
    if (search.length < 2) return [];
    const terms = search.split(/\s+/).filter(Boolean);
    const mode = Prisma.QueryMode.insensitive;

    return prisma.users.findMany({
      where: {
        status: true,
        OR: [
          { email: { contains: search, mode } },
          { profile: { is: { dni: { contains: search } } } },
          ...terms.flatMap(term => [
            {
              profile: {
                is: { firstName: { contains: term, mode } },
              },
            },
            {
              profile: {
                is: { lastName: { contains: term, mode } },
              },
            },
          ]),
        ],
      },
      select: gateUserSelect,
      take: 12,
      orderBy: { profile: { firstName: 'asc' } },
    });
  }

  static async createPass(
    actorId: number,
    data: GateCreatePassBody,
    evidences: UploadedEvidence[] = []
  ) {
    GateTimePolicy.assertQuickDuration(+data.requestedMinutes);

    const user = await prisma.users.findFirst({
      where: { id: +data.userId, status: true },
      select: { id: true },
    });
    if (!user) throw new AppError('No se pudo encontrar el usuario', 404);

    const source =
      data.source === 'SELF_SERVICE' ? 'SELF_SERVICE' : 'CONTROLLER';
    const exitAt = GateTimePolicy.parseDate(data.claimedExitAt);
    const dueAt = GateTimePolicy.dueAt(exitAt, +data.requestedMinutes);
    const licenseExitAt = this.gateDateToLicenseDate(exitAt);
    const licenseDueAt = this.gateDateToLicenseDate(dueAt);
    const activePass = await prisma.gatePass.findFirst({
      where: {
        userId: +data.userId,
        licenseId: null,
        status: { in: [...ACTIVE_GATE_STATUSES] },
      },
      select: { id: true },
    });
    if (activePass) {
      throw new AppError(
        'Este usuario ya tiene una salida en curso en Control de puerta',
        400
      );
    }
    const overlappingLicense = await prisma.licenses.findFirst({
      where: {
        usersId: +data.userId,
        status: { in: ['ACEPTADO', 'ACTIVO'] },
        checkout: null,
        fine: null,
        isRecurringParent: false,
        startDate: { lt: licenseDueAt },
        untilDate: { gt: licenseExitAt },
      },
      select: { id: true, startDate: true, untilDate: true },
    });
    if (overlappingLicense) {
      throw new AppError(
        'Este usuario ya tiene una licencia o permiso aprobado para este horario',
        400
      );
    }

    const result = await prisma.$transaction(async tx => {
      const pass = await tx.gatePass.create({
        data: {
          userId: +data.userId,
          licenseId: data.licenseId ? +data.licenseId : null,
          reason: data.reason?.trim() || null,
          requestedMinutes: +data.requestedMinutes,
          source,
          status: source === 'SELF_SERVICE' ? 'PENDING_EXIT_REVIEW' : 'ACTIVE',
          actualExitAt: exitAt,
          dueAt,
          createdById: actorId,
          departureMarkedById: source === 'SELF_SERVICE' ? null : actorId,
        },
      });

      let reviewRequestId: string | undefined;
      if (source === 'SELF_SERVICE') {
        const request = await tx.gateReviewRequest.create({
          data: {
            gatePassId: pass.id,
            type: 'EXIT_REGULARIZATION',
            requestedById: actorId,
            claimedEventAt: exitAt,
            reason: data.reason?.trim() || null,
          },
        });
        reviewRequestId = request.id;
      }

      await this.createEvidenceRecords(tx, {
        gatePassId: pass.id,
        reviewRequestId,
        submittedById: actorId,
        evidenceType: data.evidenceType,
        textNote: data.textNote,
        evidences,
      });

      await tx.gateEvent.create({
        data: {
          gatePassId: pass.id,
          actorId,
          eventType:
            source === 'SELF_SERVICE' ? 'REQUEST_SUBMITTED' : 'PASS_CREATED',
          notes:
            source === 'SELF_SERVICE'
              ? 'Auto-registro pendiente de revision'
              : 'Permiso rapido registrado por controlador',
          metadata: {
            source,
            requestedMinutes: data.requestedMinutes,
          },
        },
      });

      const created = await tx.gatePass.findUnique({
        where: { id: pass.id },
        include: gatePassInclude,
      });
      return this.buildPassView(created!);
    });
    this.emitGateControlUpdate(result.userId, {
      passId: result.id,
      action: 'PASS_CHANGED',
    });
    return result;
  }

  static async activePasses() {
    const [passes, licensePasses] = await Promise.all([
      prisma.gatePass.findMany({
        where: {
          licenseId: null,
          status: {
            in: [...ACTIVE_GATE_STATUSES],
          },
        },
        include: gatePassInclude,
        orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      }),
      this.translateApprovedLicenses(),
    ]);
    return [
      ...passes.map(pass => this.buildPassView(pass)),
      ...licensePasses,
    ].sort((a, b) => {
      const left = a.dueAt ? new Date(a.dueAt).getTime() : 0;
      const right = b.dueAt ? new Date(b.dueAt).getTime() : 0;
      return left - right;
    });
  }

  static async myActivePasses(userId: number) {
    const [passes, licensePasses] = await Promise.all([
      prisma.gatePass.findMany({
        where: {
          userId,
          licenseId: null,
          status: {
            in: [...ACTIVE_GATE_STATUSES],
          },
        },
        include: gatePassInclude,
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      }),
      this.translateApprovedLicenses(userId),
    ]);
    return [
      ...passes.map(pass => this.buildPassView(pass)),
      ...licensePasses,
    ].sort((a, b) => {
      const left = a.dueAt ? new Date(a.dueAt).getTime() : 0;
      const right = b.dueAt ? new Date(b.dueAt).getTime() : 0;
      return left - right;
    });
  }

  static async activeGatePassesOnly() {
    const passes = await prisma.gatePass.findMany({
      where: {
        licenseId: null,
        status: {
          in: [...ACTIVE_GATE_STATUSES],
        },
      },
      include: gatePassInclude,
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    });
    return passes.map(pass => this.buildPassView(pass));
  }

  static async myHistory(userId: number) {
    const passes = await prisma.gatePass.findMany({
      where: { userId },
      include: gatePassInclude,
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    return passes.map(pass => this.buildPassView(pass));
  }

  static async markReturn(
    actorId: number,
    passId: string,
    data: GateMarkReturnBody
  ) {
    if (passId.startsWith('license-')) {
      const licenseId = Number(passId.replace('license-', ''));
      return this.markLicenseReturn(actorId, licenseId, data);
    }

    const pass = await prisma.gatePass.findUnique({ where: { id: passId } });
    if (!pass) throw new AppError('No se pudo encontrar la salida', 404);
    if (pass.status === 'RETURNED') {
      throw new AppError('La llegada ya fue registrada', 409);
    }
    if (!['ACTIVE', 'PENDING_EXIT_REVIEW'].includes(pass.status)) {
      throw new AppError(
        'Esta salida necesita revision antes de cerrarse',
        400
      );
    }

    const returnedAt = GateTimePolicy.parseDate(data.returnedAt);

    const result = await prisma.$transaction(async tx => {
      let officialExitAt = pass.actualExitAt;
      let officialDueAt = pass.dueAt;

      if (pass.status === 'PENDING_EXIT_REVIEW') {
        const exitRequest = await tx.gateReviewRequest.findFirst({
          where: {
            gatePassId: passId,
            type: 'EXIT_REGULARIZATION',
            status: 'PENDING',
            claimedEventAt: { not: null },
          },
          orderBy: { createdAt: 'asc' },
        });

        if (!exitRequest?.claimedEventAt) {
          throw new AppError(
            'La salida pendiente no tiene hora declarada',
            400
          );
        }

        officialExitAt = exitRequest.claimedEventAt;
        officialDueAt = GateTimePolicy.dueAt(
          officialExitAt,
          pass.requestedMinutes
        );

        await tx.gateReviewRequest.update({
          where: { id: exitRequest.id },
          data: {
            status: 'APPROVED',
            reviewNotes: 'Salida confirmada por el controlador al retorno',
            reviewedById: actorId,
            reviewedAt: new Date(),
          },
        });

        await tx.gateEvent.create({
          data: {
            gatePassId: passId,
            actorId,
            eventType: 'REQUEST_APPROVED',
            notes: 'Salida pendiente confirmada al marcar retorno',
            metadata: {
              requestId: exitRequest.id,
              requestType: exitRequest.type,
            },
          },
        });
      }

      const originalPenaltyMinutes = GateTimePolicy.penaltyMinutes(
        returnedAt,
        officialDueAt
      );

      await tx.gatePass.update({
        where: { id: passId },
        data: {
          actualExitAt: officialExitAt,
          dueAt: officialDueAt,
          departureMarkedById:
            pass.status === 'PENDING_EXIT_REVIEW'
              ? actorId
              : pass.departureMarkedById,
          actualReturnAt: returnedAt,
          returnMarkedById: actorId,
          status: 'RETURNED',
          originalPenaltyMinutes,
          finalPenaltyMinutes: originalPenaltyMinutes,
        },
      });

      if (pass.licenseId) {
        await tx.licenses.update({
          where: { id: pass.licenseId },
          data: {
            checkout: returnedAt,
            fine: this.licenseFine(returnedAt, officialDueAt),
            status: 'INACTIVO',
          },
        });
      }

      await tx.gateEvent.create({
        data: {
          gatePassId: passId,
          actorId,
          eventType: 'RETURN_MARKED',
          metadata: {
            returnedAt,
            originalPenaltyMinutes,
          },
        },
      });

      const updated = await tx.gatePass.findUnique({
        where: { id: passId },
        include: gatePassInclude,
      });
      return this.buildPassView(updated!);
    });
    this.emitGateControlUpdate(result.userId, {
      passId: result.id,
      action: 'PASS_CHANGED',
    });
    return result;
  }

  static buildDateRange(dateFrom?: string, dateTo?: string) {
    if (!dateFrom && !dateTo) return undefined;
    const range: Prisma.DateTimeFilter = {};
    if (dateFrom) range.gte = GateTimePolicy.parseDate(dateFrom);
    if (dateTo) {
      const end = GateTimePolicy.parseDate(dateTo);
      end.setDate(end.getDate() + 1);
      range.lt = end;
    }
    return range;
  }

  static async history(filters: GatePassFilters) {
    const createdAtRange = this.buildDateRange(
      filters.dateFrom,
      filters.dateTo
    );
    const where: Prisma.GatePassWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.userId ? { userId: +filters.userId } : {}),
      ...(createdAtRange ? { createdAt: createdAtRange } : {}),
    };

    if (filters.search) {
      const search = filters.search.trim();
      const mode = Prisma.QueryMode.insensitive;
      const terms = search.split(/\s+/).filter(Boolean);
      where.user = {
        OR: [
          { email: { contains: search, mode } },
          { profile: { is: { dni: { contains: search } } } },
          ...terms.flatMap(term => [
            {
              profile: {
                is: { firstName: { contains: term, mode } },
              },
            },
            {
              profile: {
                is: { lastName: { contains: term, mode } },
              },
            },
          ]),
        ],
      };
    }

    const passes = await prisma.gatePass.findMany({
      where,
      include: gatePassInclude,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return passes.map(pass => this.buildPassView(pass));
  }

  static async summary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const licensePasses = await this.translateApprovedLicenses();
    const now = new Date();

    const [todayPasses, outside, pending, lateReturned] = await Promise.all([
      prisma.gatePass.count({
        where: { licenseId: null, createdAt: { gte: today, lt: tomorrow } },
      }),
      prisma.gatePass.count({
        where: {
          licenseId: null,
          status: 'ACTIVE',
          actualExitAt: { lte: new Date() },
        },
      }),
      prisma.gateReviewRequest.count({ where: { status: 'PENDING' } }),
      prisma.gatePass.aggregate({
        where: {
          licenseId: null,
          createdAt: { gte: today, lt: tomorrow },
          finalPenaltyMinutes: { gt: 0 },
        },
        _sum: { finalPenaltyMinutes: true },
        _count: true,
      }),
    ]);

    return {
      todayPasses:
        todayPasses +
        licensePasses.filter(pass => {
          const exitAt = pass.actualExitAt ? new Date(pass.actualExitAt) : null;
          return exitAt && exitAt >= today && exitAt < tomorrow;
        }).length,
      outside:
        outside +
        licensePasses.filter(pass => {
          const exitAt = pass.actualExitAt ? new Date(pass.actualExitAt) : null;
          return exitAt && exitAt <= now;
        }).length,
      pendingReviews: pending,
      lateReturns: lateReturned._count,
      totalPenaltyMinutes: lateReturned._sum.finalPenaltyMinutes || 0,
    };
  }

  static async tardinessRanking(dateFrom?: string, dateTo?: string) {
    const createdAt = this.buildDateRange(dateFrom, dateTo);
    const rows = await prisma.gatePass.groupBy({
      by: ['userId'],
      where: {
        ...(createdAt ? { createdAt } : {}),
        OR: [
          { originalPenaltyMinutes: { gt: 0 } },
          { status: { in: ['PENDING_EXIT_REVIEW', 'PENDING_RETURN_REVIEW'] } },
        ],
      },
      _sum: {
        originalPenaltyMinutes: true,
        finalPenaltyMinutes: true,
      },
      _count: true,
      orderBy: { _sum: { finalPenaltyMinutes: 'desc' } },
      take: 20,
    });

    const users = await prisma.users.findMany({
      where: { id: { in: rows.map(row => row.userId) } },
      select: gateUserSelect,
    });

    return rows.map(row => {
      const original = row._sum.originalPenaltyMinutes || 0;
      const final = row._sum.finalPenaltyMinutes || 0;
      return {
        userId: row.userId,
        user: users.find(user => user.id === row.userId) || null,
        passesCount: row._count,
        originalPenaltyMinutes: original,
        finalPenaltyMinutes: final,
        reducedPenaltyMinutes: Math.max(original - final, 0),
        forgiven: original > 0 && final === 0,
      };
    });
  }

  static async fineReport(filters: GateFineReportFilters = {}) {
    const period = this.buildFineReportPeriod(filters.dateFrom, filters.dateTo);
    const where: Prisma.GatePassWhereInput = {
      status: 'RETURNED',
      ...(period.actualReturnAt
        ? { actualReturnAt: period.actualReturnAt }
        : {}),
    };
    const userSearch = this.buildGateUserSearch(filters.search);
    if (userSearch) where.user = userSearch;

    const passes = await prisma.gatePass.findMany({
      where,
      include: gatePassInclude,
      orderBy: [{ actualReturnAt: 'desc' }, { createdAt: 'desc' }],
    });

    const activeAdjustments = await prisma.licensePenaltyAdjustment.findMany({
      where: {
        status: 'ACTIVE',
        scope: 'USER_PERIOD',
        sourceModule: 'CONTROL_PUERTA',
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        ...(passes.length
          ? { userId: { in: [...new Set(passes.map(pass => pass.userId))] } }
          : {}),
      },
      include: { adjustedBy: { select: gateUserSelect } },
    });
    const adjustmentByUser = new Map(
      activeAdjustments.map(adjustment => [adjustment.userId, adjustment])
    );

    const emptyCounts: Record<GateFineResult, number> = {
      PUNTUAL: 0,
      TARDE: 0,
      SIMPLE: 0,
      GRAVE: 0,
      MUY_GRAVE: 0,
    };
    const rowMap = new Map<
      number,
      {
        userId: number;
        user: (typeof passes)[number]['user'];
        counts: Record<GateFineResult, number>;
        calculatedAmount: number;
        details: {
          passId: string;
          exitAt: Date | null;
          dueAt: Date | null;
          returnAt: Date | null;
          reason: string | null;
          penaltyMinutes: number;
          result: GateFineResult;
          amount: number;
        }[];
      }
    >();

    for (const pass of passes) {
      const result = this.gateFineByMinutes(pass.finalPenaltyMinutes);
      const amount = this.gateFineAmount(result);
      const current =
        rowMap.get(pass.userId) ||
        rowMap
          .set(pass.userId, {
            userId: pass.userId,
            user: pass.user,
            counts: { ...emptyCounts },
            calculatedAmount: 0,
            details: [],
          })
          .get(pass.userId)!;
      current.counts[result] += 1;
      current.calculatedAmount += amount;
      current.details.push({
        passId: pass.id,
        exitAt: pass.actualExitAt,
        dueAt: pass.dueAt,
        returnAt: pass.actualReturnAt,
        reason: pass.reason,
        penaltyMinutes: pass.finalPenaltyMinutes,
        result,
        amount,
      });
    }

    const rows = [...rowMap.values()].map(row => {
      const adjustment = adjustmentByUser.get(row.userId);
      const adjustedAmount = adjustment
        ? Number(adjustment.adjustedAmount)
        : row.calculatedAmount;
      return {
        ...row,
        adjustedAmount,
        adjustedDifference: Math.max(row.calculatedAmount - adjustedAmount, 0),
        hasAdjustment: Boolean(adjustment),
        adjustment: adjustment
          ? {
              id: adjustment.id,
              originalAmount: Number(adjustment.originalAmount),
              adjustedAmount: Number(adjustment.adjustedAmount),
              reason: adjustment.reason,
              adjustedBy: adjustment.adjustedBy,
              createdAt: adjustment.createdAt,
            }
          : null,
        details: row.details.sort((a, b) => {
          const severe =
            this.fineWeights[b.result] - this.fineWeights[a.result];
          if (severe !== 0) return severe;
          return (b.returnAt?.getTime() || 0) - (a.returnAt?.getTime() || 0);
        }),
      };
    });

    if (filters.sortAmount === 'asc') {
      rows.sort((a, b) => a.adjustedAmount - b.adjustedAmount);
    } else if (filters.sortAmount === 'desc') {
      rows.sort((a, b) => b.adjustedAmount - a.adjustedAmount);
    } else {
      rows.sort((a, b) => b.calculatedAmount - a.calculatedAmount);
    }

    const summary = rows.reduce(
      (accumulator, row) => {
        accumulator.PUNTUAL += row.counts.PUNTUAL;
        accumulator.TARDE += row.counts.TARDE;
        accumulator.SIMPLE += row.counts.SIMPLE;
        accumulator.GRAVE += row.counts.GRAVE;
        accumulator.MUY_GRAVE += row.counts.MUY_GRAVE;
        accumulator.calculatedAmount += row.calculatedAmount;
        accumulator.adjustedAmount += row.adjustedAmount;
        return accumulator;
      },
      {
        PUNTUAL: 0,
        TARDE: 0,
        SIMPLE: 0,
        GRAVE: 0,
        MUY_GRAVE: 0,
        calculatedAmount: 0,
        adjustedAmount: 0,
      }
    );

    return {
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      totalRecords: passes.length,
      usersCount: rows.length,
      summary,
      rows,
    };
  }

  static async upsertFineAdjustment(
    actorId: number,
    data: GateFineAdjustmentBody
  ) {
    if (!data?.userId) throw new AppError('Usuario invalido', 400);
    const adjustedAmount = Number(data.adjustedAmount);
    const reason = data.reason?.trim();
    if (!Number.isFinite(adjustedAmount) || adjustedAmount < 0 || !reason) {
      throw new AppError('Ingrese un ajuste y un motivo', 400);
    }

    const report = await this.fineReport({
      dateFrom: data.periodStart || undefined,
      dateTo: data.periodEnd || undefined,
    });
    const row = report.rows.find(item => item.userId === +data.userId);
    const calculatedAmount = row?.calculatedAmount ?? 0;
    if (adjustedAmount > calculatedAmount) {
      throw new AppError(
        'El ajuste total no puede superar el monto calculado',
        400
      );
    }

    const period = this.buildFineReportPeriod(
      data.periodStart || undefined,
      data.periodEnd || undefined
    );
    const now = new Date();
    const created = await prisma.$transaction(async tx => {
      await tx.licensePenaltyAdjustment.updateMany({
        where: {
          status: 'ACTIVE',
          scope: 'USER_PERIOD',
          sourceModule: 'CONTROL_PUERTA',
          userId: +data.userId,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
        },
        data: {
          status: 'VOIDED',
          voidedAt: now,
          voidedById: actorId,
          voidReason: 'Reemplazado por un nuevo ajuste de Control de Puerta',
        },
      });

      return tx.licensePenaltyAdjustment.create({
        data: {
          scope: 'USER_PERIOD',
          userId: +data.userId,
          adjustedById: actorId,
          originalAmount: calculatedAmount,
          adjustedAmount,
          reason,
          sourceModule: 'CONTROL_PUERTA',
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
        },
      });
    });

    return { count: 1, adjustment: created };
  }

  static async voidFineAdjustment(
    actorId: number,
    data: GateFineAdjustmentVoidBody
  ) {
    const period = this.buildFineReportPeriod(
      data.periodStart || undefined,
      data.periodEnd || undefined
    );
    const where: Prisma.LicensePenaltyAdjustmentWhereInput = data.adjustmentId
      ? { id: data.adjustmentId }
      : {
          status: 'ACTIVE',
          scope: 'USER_PERIOD',
          sourceModule: 'CONTROL_PUERTA',
          userId: data.userId,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
        };
    if (!data.adjustmentId && !data.userId) {
      throw new AppError('Seleccione un ajuste para anular', 400);
    }

    const result = await prisma.licensePenaltyAdjustment.updateMany({
      where: { ...where, status: 'ACTIVE' },
      data: {
        status: 'VOIDED',
        voidedAt: new Date(),
        voidedById: actorId,
        voidReason: data.reason?.trim() || 'Ajuste anulado',
      },
    });
    return { count: result.count };
  }

  static async submitReviewRequest(
    actorId: number,
    passId: string,
    data: GateSubmitReviewRequestBody,
    evidences: UploadedEvidence[] = []
  ) {
    const pass = await prisma.gatePass.findUnique({ where: { id: passId } });
    if (!pass) throw new AppError('No se pudo encontrar la salida', 404);

    if (data.type === 'PENALTY_REDUCTION' && pass.status !== 'RETURNED') {
      throw new AppError(
        'Solo se puede reducir penalidad en salidas ya cerradas',
        400
      );
    }

    if (
      data.type === 'RETURN_REGULARIZATION' &&
      !['ACTIVE', 'PENDING_EXIT_REVIEW'].includes(pass.status)
    ) {
      throw new AppError(
        'La llegada solo se regulariza sobre salidas activas o pendientes de salida',
        400
      );
    }

    const result = await prisma.$transaction(async tx => {
      const request = await tx.gateReviewRequest.create({
        data: {
          gatePassId: passId,
          type: data.type,
          requestedById: actorId,
          claimedEventAt: data.claimedEventAt
            ? GateTimePolicy.parseDate(data.claimedEventAt)
            : null,
          requestedReductionMinutes: data.requestedReductionMinutes
            ? +data.requestedReductionMinutes
            : null,
          reason: data.reason?.trim() || null,
        },
        include: gateReviewRequestInclude,
      });

      if (data.type === 'RETURN_REGULARIZATION') {
        const pendingExitRequest = !pass.dueAt
          ? await tx.gateReviewRequest.findFirst({
              where: {
                gatePassId: passId,
                type: 'EXIT_REGULARIZATION',
                status: 'PENDING',
                claimedEventAt: { not: null },
              },
              orderBy: { createdAt: 'asc' },
            })
          : null;

        const inferredExitAt = pendingExitRequest?.claimedEventAt || null;
        const inferredDueAt = inferredExitAt
          ? GateTimePolicy.dueAt(inferredExitAt, pass.requestedMinutes)
          : null;

        await tx.gatePass.update({
          where: { id: passId },
          data: {
            status: 'PENDING_RETURN_REVIEW',
            ...(inferredExitAt ? { actualExitAt: inferredExitAt } : {}),
            ...(inferredDueAt ? { dueAt: inferredDueAt } : {}),
          },
        });
      }

      await this.createEvidenceRecords(tx, {
        gatePassId: passId,
        reviewRequestId: request.id,
        submittedById: actorId,
        evidenceType: data.evidenceType,
        textNote: data.textNote,
        evidences,
      });

      await tx.gateEvent.create({
        data: {
          gatePassId: passId,
          actorId,
          eventType: 'REQUEST_SUBMITTED',
          notes: data.reason?.trim() || null,
          metadata: {
            type: data.type,
            requestedReductionMinutes: data.requestedReductionMinutes,
          },
        },
      });

      return tx.gateReviewRequest.findUnique({
        where: { id: request.id },
        include: gateReviewRequestInclude,
      });
    });
    this.emitGateControlUpdate(pass.userId, {
      passId,
      action: 'PASS_CHANGED',
    });
    return result;
  }

  static async listReviewRequests(status?: GateReviewRequestStatus) {
    return prisma.gateReviewRequest.findMany({
      where: {
        ...(status ? { status } : {}),
      },
      include: {
        ...gateReviewRequestInclude,
        gatePass: { include: gatePassInclude },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  static async penaltyAdjustmentCandidates(search?: string) {
    const where: Prisma.GatePassWhereInput = {
      status: 'RETURNED',
      OR: [
        { originalPenaltyMinutes: { gt: 0 } },
        { finalPenaltyMinutes: { gt: 0 } },
      ],
    };

    if (search?.trim()) {
      const query = search.trim();
      const mode = Prisma.QueryMode.insensitive;
      const terms = query.split(/\s+/).filter(Boolean);
      where.user = {
        OR: [
          { email: { contains: query, mode } },
          { profile: { is: { dni: { contains: query } } } },
          ...terms.flatMap(term => [
            {
              profile: {
                is: { firstName: { contains: term, mode } },
              },
            },
            {
              profile: {
                is: { lastName: { contains: term, mode } },
              },
            },
          ]),
        ],
      };
    }

    const passes = await prisma.gatePass.findMany({
      where,
      include: gatePassInclude,
      orderBy: { actualReturnAt: 'desc' },
      take: 20,
    });

    return passes.map(pass => this.buildPassView(pass));
  }

  static async approveReviewRequest(
    actorId: number,
    requestId: string,
    data: GateReviewDecisionBody
  ) {
    const request = await prisma.gateReviewRequest.findUnique({
      where: { id: requestId },
      include: { gatePass: true },
    });
    if (!request) throw new AppError('No se pudo encontrar la solicitud', 404);
    if (request.status !== 'PENDING') {
      throw new AppError('Esta solicitud ya fue revisada', 409);
    }

    const result = await prisma.$transaction(async tx => {
      let eventType: 'REQUEST_APPROVED' | 'PENALTY_REDUCED' =
        'REQUEST_APPROVED';
      let passUpdate: Prisma.GatePassUncheckedUpdateInput = {};

      if (request.type === 'EXIT_REGULARIZATION') {
        if (!request.claimedEventAt) {
          throw new AppError('La solicitud no tiene hora declarada', 400);
        }
        const hasPendingReturnReview = await tx.gateReviewRequest.count({
          where: {
            gatePassId: request.gatePassId,
            type: 'RETURN_REGULARIZATION',
            status: 'PENDING',
          },
        });
        passUpdate = {
          actualExitAt: request.claimedEventAt,
          dueAt: GateTimePolicy.dueAt(
            request.claimedEventAt,
            request.gatePass.requestedMinutes
          ),
          departureMarkedById: actorId,
          status:
            hasPendingReturnReview > 0 ? 'PENDING_RETURN_REVIEW' : 'ACTIVE',
        };
      }

      if (request.type === 'RETURN_REGULARIZATION') {
        if (!request.claimedEventAt) {
          throw new AppError('La solicitud no tiene hora declarada', 400);
        }
        const originalPenaltyMinutes = GateTimePolicy.penaltyMinutes(
          request.claimedEventAt,
          request.gatePass.dueAt
        );
        passUpdate = {
          actualReturnAt: request.claimedEventAt,
          returnMarkedById: actorId,
          status: 'RETURNED',
          originalPenaltyMinutes,
          finalPenaltyMinutes: originalPenaltyMinutes,
        };
      }

      if (request.type === 'PENALTY_REDUCTION') {
        const approvedReductionMinutes = Math.max(
          +(
            data.approvedReductionMinutes ??
            request.requestedReductionMinutes ??
            0
          ),
          0
        );
        const finalPenaltyMinutes = Math.max(
          request.gatePass.originalPenaltyMinutes - approvedReductionMinutes,
          0
        );
        passUpdate = { finalPenaltyMinutes };
        eventType = 'PENALTY_REDUCED';
      }

      await tx.gatePass.update({
        where: { id: request.gatePassId },
        data: passUpdate,
      });

      await tx.gateReviewRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          approvedReductionMinutes:
            request.type === 'PENALTY_REDUCTION'
              ? +(
                  data.approvedReductionMinutes ??
                  request.requestedReductionMinutes ??
                  0
                )
              : null,
          reviewNotes: data.reviewNotes?.trim() || null,
          reviewedById: actorId,
          reviewedAt: new Date(),
        },
      });

      await tx.gateEvent.create({
        data: {
          gatePassId: request.gatePassId,
          actorId,
          eventType,
          notes: data.reviewNotes?.trim() || null,
          metadata: {
            requestId,
            requestType: request.type,
            approvedReductionMinutes: data.approvedReductionMinutes,
          },
        },
      });

      return tx.gateReviewRequest.findUnique({
        where: { id: requestId },
        include: {
          ...gateReviewRequestInclude,
          gatePass: { include: gatePassInclude },
        },
      });
    });
    this.emitGateControlUpdate(request.gatePass.userId, {
      passId: request.gatePassId,
      action: 'PASS_CHANGED',
    });
    return result;
  }

  static async rejectReviewRequest(
    actorId: number,
    requestId: string,
    data: GateReviewDecisionBody
  ) {
    const request = await prisma.gateReviewRequest.findUnique({
      where: { id: requestId },
      include: { gatePass: true },
    });
    if (!request) throw new AppError('No se pudo encontrar la solicitud', 404);
    if (request.status !== 'PENDING') {
      throw new AppError('Esta solicitud ya fue revisada', 409);
    }

    const result = await prisma.$transaction(async tx => {
      if (request.type === 'EXIT_REGULARIZATION') {
        await tx.gatePass.update({
          where: { id: request.gatePassId },
          data: { status: 'CANCELLED' },
        });
      }
      if (request.type === 'RETURN_REGULARIZATION') {
        await tx.gatePass.update({
          where: { id: request.gatePassId },
          data: { status: 'ACTIVE' },
        });
      }

      await tx.gateReviewRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          reviewNotes: data.reviewNotes?.trim() || null,
          reviewedById: actorId,
          reviewedAt: new Date(),
        },
      });

      await tx.gateEvent.create({
        data: {
          gatePassId: request.gatePassId,
          actorId,
          eventType: 'REQUEST_REJECTED',
          notes: data.reviewNotes?.trim() || null,
          metadata: { requestId, requestType: request.type },
        },
      });

      return tx.gateReviewRequest.findUnique({
        where: { id: requestId },
        include: {
          ...gateReviewRequestInclude,
          gatePass: { include: gatePassInclude },
        },
      });
    });
    this.emitGateControlUpdate(request.gatePass.userId, {
      passId: request.gatePassId,
      action: 'PASS_CHANGED',
    });
    return result;
  }

  static async approvePendingReviewRequests(
    actorId: number,
    passId: string,
    data: GateReviewDecisionBody
  ) {
    const pass = await prisma.gatePass.findUnique({
      where: { id: passId },
      include: {
        reviewRequests: {
          where: {
            status: 'PENDING',
            type: { in: ['EXIT_REGULARIZATION', 'RETURN_REGULARIZATION'] },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!pass) throw new AppError('No se pudo encontrar la salida', 404);
    if (!pass.reviewRequests.length) {
      throw new AppError('No hay solicitudes pendientes para esta salida', 400);
    }

    const result = await prisma.$transaction(async tx => {
      const now = new Date();
      const exitRequest = pass.reviewRequests.find(
        request => request.type === 'EXIT_REGULARIZATION'
      );
      const returnRequest = pass.reviewRequests.find(
        request => request.type === 'RETURN_REGULARIZATION'
      );

      let officialExitAt = pass.actualExitAt;
      let officialDueAt = pass.dueAt;
      let passUpdate: Prisma.GatePassUncheckedUpdateInput = {};

      if (exitRequest) {
        if (!exitRequest.claimedEventAt) {
          throw new AppError(
            'La solicitud de salida no tiene hora declarada',
            400
          );
        }
        officialExitAt = exitRequest.claimedEventAt;
        officialDueAt = GateTimePolicy.dueAt(
          officialExitAt,
          pass.requestedMinutes
        );
        passUpdate = {
          ...passUpdate,
          actualExitAt: officialExitAt,
          dueAt: officialDueAt,
          departureMarkedById: actorId,
          status: returnRequest ? 'PENDING_RETURN_REVIEW' : 'ACTIVE',
        };
      }

      if (returnRequest) {
        if (!returnRequest.claimedEventAt) {
          throw new AppError(
            'La solicitud de llegada no tiene hora declarada',
            400
          );
        }
        const originalPenaltyMinutes = GateTimePolicy.penaltyMinutes(
          returnRequest.claimedEventAt,
          officialDueAt
        );
        passUpdate = {
          ...passUpdate,
          actualReturnAt: returnRequest.claimedEventAt,
          returnMarkedById: actorId,
          status: 'RETURNED',
          originalPenaltyMinutes,
          finalPenaltyMinutes: originalPenaltyMinutes,
        };
      }

      await tx.gatePass.update({
        where: { id: passId },
        data: passUpdate,
      });

      await tx.gateReviewRequest.updateMany({
        where: {
          id: { in: pass.reviewRequests.map(request => request.id) },
        },
        data: {
          status: 'APPROVED',
          reviewNotes: data.reviewNotes?.trim() || null,
          reviewedById: actorId,
          reviewedAt: now,
        },
      });

      await tx.gateEvent.create({
        data: {
          gatePassId: passId,
          actorId,
          eventType: 'REQUEST_APPROVED',
          notes: data.reviewNotes?.trim() || null,
          metadata: {
            groupedReview: true,
            requestIds: pass.reviewRequests.map(request => request.id),
            requestTypes: pass.reviewRequests.map(request => request.type),
          },
        },
      });

      const updated = await tx.gatePass.findUnique({
        where: { id: passId },
        include: gatePassInclude,
      });
      return this.buildPassView(updated!);
    });
    this.emitGateControlUpdate(result.userId, {
      passId: result.id,
      action: 'PASS_CHANGED',
    });
    return result;
  }

  static async rejectPendingReviewRequests(
    actorId: number,
    passId: string,
    data: GateReviewDecisionBody
  ) {
    const pass = await prisma.gatePass.findUnique({
      where: { id: passId },
      include: {
        reviewRequests: {
          where: {
            status: 'PENDING',
            type: { in: ['EXIT_REGULARIZATION', 'RETURN_REGULARIZATION'] },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!pass) throw new AppError('No se pudo encontrar la salida', 404);
    if (!pass.reviewRequests.length) {
      throw new AppError('No hay solicitudes pendientes para esta salida', 400);
    }

    const result = await prisma.$transaction(async tx => {
      const hasExitRequest = pass.reviewRequests.some(
        request => request.type === 'EXIT_REGULARIZATION'
      );
      const hasReturnRequest = pass.reviewRequests.some(
        request => request.type === 'RETURN_REGULARIZATION'
      );
      const nextStatus = hasExitRequest
        ? 'CANCELLED'
        : hasReturnRequest
        ? 'ACTIVE'
        : pass.status;

      await tx.gatePass.update({
        where: { id: passId },
        data: { status: nextStatus },
      });

      await tx.gateReviewRequest.updateMany({
        where: {
          id: { in: pass.reviewRequests.map(request => request.id) },
        },
        data: {
          status: 'REJECTED',
          reviewNotes: data.reviewNotes?.trim() || null,
          reviewedById: actorId,
          reviewedAt: new Date(),
        },
      });

      await tx.gateEvent.create({
        data: {
          gatePassId: passId,
          actorId,
          eventType: 'REQUEST_REJECTED',
          notes: data.reviewNotes?.trim() || null,
          metadata: {
            groupedReview: true,
            requestIds: pass.reviewRequests.map(request => request.id),
            requestTypes: pass.reviewRequests.map(request => request.type),
          },
        },
      });

      const updated = await tx.gatePass.findUnique({
        where: { id: passId },
        include: gatePassInclude,
      });
      return this.buildPassView(updated!);
    });
    this.emitGateControlUpdate(result.userId, {
      passId: result.id,
      action: 'PASS_CHANGED',
    });
    return result;
  }

  static async directPenaltyAdjustment(
    actorId: number,
    passId: string,
    data: GateDirectPenaltyAdjustmentBody
  ) {
    const reason = data.reason?.trim();
    const reductionMinutes = Math.max(+data.reductionMinutes || 0, 0);

    if (!reason) {
      throw new AppError(
        'Debe registrar un motivo para reducir la penalidad',
        400
      );
    }
    if (!reductionMinutes) {
      throw new AppError('Debe indicar los minutos a reducir', 400);
    }

    const pass = await prisma.gatePass.findUnique({ where: { id: passId } });
    if (!pass) throw new AppError('No se pudo encontrar la salida', 404);
    if (pass.status !== 'RETURNED') {
      throw new AppError('Solo se puede ajustar una salida ya cerrada', 409);
    }
    if (pass.originalPenaltyMinutes <= 0 && pass.finalPenaltyMinutes <= 0) {
      throw new AppError('Esta salida no tiene penalidad para reducir', 400);
    }

    const basePenalty = pass.finalPenaltyMinutes || pass.originalPenaltyMinutes;
    const finalPenaltyMinutes = Math.max(basePenalty - reductionMinutes, 0);

    const result = await prisma.$transaction(async tx => {
      await tx.gatePass.update({
        where: { id: passId },
        data: { finalPenaltyMinutes },
      });

      const request = await tx.gateReviewRequest.create({
        data: {
          gatePassId: passId,
          type: 'PENALTY_REDUCTION',
          requestedById: actorId,
          status: 'APPROVED',
          requestedReductionMinutes: reductionMinutes,
          approvedReductionMinutes: reductionMinutes,
          reason,
          reviewNotes: reason,
          reviewedById: actorId,
          reviewedAt: new Date(),
        },
        include: gateReviewRequestInclude,
      });

      await tx.gateEvent.create({
        data: {
          gatePassId: passId,
          actorId,
          eventType: 'PENALTY_REDUCED',
          notes: reason,
          metadata: {
            directAdjustment: true,
            reductionMinutes,
            previousFinalPenaltyMinutes: pass.finalPenaltyMinutes,
            finalPenaltyMinutes,
          },
        },
      });

      return request;
    });
    this.emitGateControlUpdate(pass.userId, {
      passId,
      action: 'PASS_CHANGED',
    });
    return result;
  }

  static async createEvidenceRecords(
    tx: Prisma.TransactionClient | any,
    data: {
      gatePassId: string;
      reviewRequestId?: string;
      submittedById: number;
      evidenceType?: string;
      textNote?: string | null;
      evidences?: UploadedEvidence[];
    }
  ) {
    const records: Prisma.GateEvidenceCreateManyInput[] = [
      ...(data.evidences || []).map(evidence => ({
        gatePassId: data.gatePassId,
        reviewRequestId: data.reviewRequestId || null,
        submittedById: data.submittedById,
        type: this.evidenceType(data.evidenceType),
        filePath: evidence.filePath || null,
        originalName: evidence.originalName || null,
        mimeType: evidence.mimeType || null,
        textNote: null,
      })),
    ];

    if (data.textNote?.trim()) {
      const noteEvidenceType = data.evidenceType
        ? this.evidenceType(data.evidenceType)
        : 'NOTE';
      records.push({
        gatePassId: data.gatePassId,
        reviewRequestId: data.reviewRequestId || null,
        submittedById: data.submittedById,
        type: noteEvidenceType === 'OTHER_FILE' ? 'NOTE' : noteEvidenceType,
        filePath: null,
        originalName: null,
        mimeType: null,
        textNote: data.textNote.trim(),
      });
    }

    if (records.length) {
      await tx.gateEvidence.createMany({ data: records });
    }
  }
}

export default GateControlService;

import { LunchMenuSelectionSource } from '@prisma/client';
import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import SocketManager from '@/models/SocketManager';
import {
  assertCanAssignPendingLunchMenuSelection,
  assertEligibleForLunchMenu,
  assertLunchMenuOpen,
  calculateLunchMenuCloseAt,
} from './lunchMenu.domain';

type LunchMenuSecondsInput = string[];

export type PublishLunchMenuInput = {
  serviceDate: Date;
  seconds: LunchMenuSecondsInput;
  soupAvailable: boolean;
  soupName?: string;
  dessertAvailable?: boolean;
  dessertName?: string;
  refreshmentName?: string;
  durationMinutes?: number;
  createdById: number;
  now?: Date;
};

export type SelectLunchMenuInput = {
  serviceDate: Date;
  userId: number;
  lunchMenuSecondId: number;
  wantsSoup: boolean;
  wantsDessert: boolean;
  wantsRefreshment: boolean;
  actorId: number;
  actorDni?: string | null;
  source: LunchMenuSelectionSource;
  now?: Date;
};

const LUNCH_MEAL_TYPE = 'Almuerzo';

const normalizeServiceDate = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const serviceDateKey = (date: Date) => date.toISOString().slice(0, 10);

const dateRangeFor = (date: Date) => {
  const startDate = normalizeServiceDate(date);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);
  return { startDate, endDate };
};

const normalizeSeconds = (seconds: LunchMenuSecondsInput) => {
  const normalized = seconds.map(second => second.trim()).filter(Boolean);
  const uniqueSeconds = new Set(normalized.map(second => second.toLocaleLowerCase()));

  if (normalized.length === 0) {
    throw new AppError('Debe registrar al menos un segundo', 400);
  }
  if (normalized.length !== uniqueSeconds.size) {
    throw new AppError('Los segundos del menú no pueden repetirse', 400);
  }

  return normalized;
};

const normalizeOptionalName = (name?: string) => {
  const normalized = name?.trim();
  return normalized || null;
};

const findActiveLunchMenu = async (serviceDate: Date) => {
  const menu = await prisma.lunchMenu.findUnique({
    where: { serviceDate: normalizeServiceDate(serviceDate) },
    include: {
      versions: {
        include: { seconds: { orderBy: { position: 'asc' } } },
      },
    },
  });

  if (!menu) throw new AppError('No existe un menú de almuerzo para esta fecha', 404);

  const version = menu.versions.find(item => item.version === menu.activeVersion);
  if (!version) throw new AppError('El menú activo no tiene una versión válida', 409);

  return { menu, version };
};

const assertServiceDateIsNotPast = (serviceDate: Date, now: Date) => {
  if (normalizeServiceDate(serviceDate) < normalizeServiceDate(now)) {
    throw new AppError('No puede abrir un menú para una fecha pasada', 400);
  }
};

const assertNoOtherLunchMenuOpen = async (serviceDate: Date, now: Date) => {
  const normalizedServiceDate = normalizeServiceDate(serviceDate);
  const menus = await prisma.lunchMenu.findMany({
    where: { isManuallyClosed: false },
    select: {
      serviceDate: true,
      activeVersion: true,
      versions: { select: { version: true, closesAt: true } },
    },
  });
  const openMenu = menus.find(menu => {
    if (menu.serviceDate.getTime() === normalizedServiceDate.getTime()) return false;
    const activeVersion = menu.versions.find(version => version.version === menu.activeVersion);
    return activeVersion?.closesAt && activeVersion.closesAt > now;
  });

  if (openMenu) {
    throw new AppError(
      'Ya existe otro menú de almuerzo abierto. Ciérrelo antes de abrir uno nuevo.',
      409
    );
  }
};

const assertUserHasLunchConfirmation = async (userId: number, serviceDate: Date) => {
  const { startDate, endDate } = dateRangeFor(serviceDate);
  const lunchConfirmation = await prisma.mealOrderOnUsers.findFirst({
    where: {
      userId,
      status: true,
      mealOrder: {
        orderDate: { gte: startDate, lt: endDate },
        meal: { type: LUNCH_MEAL_TYPE },
      },
    },
    select: { userId: true },
  });

  assertEligibleForLunchMenu(!!lunchConfirmation);
};

const getEligibleLunchUsers = async (serviceDate: Date) => {
  const { startDate, endDate } = dateRangeFor(serviceDate);
  const confirmations = await prisma.mealOrderOnUsers.findMany({
    where: {
      status: true,
      mealOrder: {
        orderDate: { gte: startDate, lt: endDate },
        meal: { type: LUNCH_MEAL_TYPE },
      },
    },
    select: {
      userId: true,
      user: {
        select: {
          profile: { select: { firstName: true, lastName: true, dni: true } },
        },
      },
    },
  });

  return Array.from(
    new Map(confirmations.map(confirmation => [confirmation.userId, confirmation])).values()
  );
};

const LUNCH_MENU_UPDATED_EVENT = 'server:lunch-menu-updated';

const emitLunchMenuUpdated = (userIds: number[]) => {
  try {
    const io = SocketManager.getInstance();
    Array.from(new Set(userIds)).forEach(userId =>
      io.to(String(userId)).emit(LUNCH_MENU_UPDATED_EVENT)
    );
  } catch {
    // The HTTP operation remains valid during isolated service tests or startup.
  }
};

const emitEligibleLunchMenuUpdated = async (serviceDate: Date) => {
  const eligibleUsers = await getEligibleLunchUsers(serviceDate);
  emitLunchMenuUpdated(eligibleUsers.map(user => user.userId));
};

class LunchMenuService {
  static async getCurrentForUser(userId: number, now = new Date()) {
    const menus = await prisma.lunchMenu.findMany({
      where: { serviceDate: { gte: normalizeServiceDate(now) } },
      select: { serviceDate: true },
      orderBy: { serviceDate: 'asc' },
      take: 7,
    });

    for (const menu of menus) {
      const result = await LunchMenuService.getForUser(menu.serviceDate, userId, now);
      if (result.isEligible && result.isOpen && !result.selection) return result;
    }

    return null;
  }

  static async publish(input: PublishLunchMenuInput) {
    const now = input.now ?? new Date();
    const serviceDate = normalizeServiceDate(input.serviceDate);
    assertServiceDateIsNotPast(serviceDate, now);
    await assertNoOtherLunchMenuOpen(serviceDate, now);
    const seconds = normalizeSeconds(input.seconds);
    const closesAt = calculateLunchMenuCloseAt(now, input.durationMinutes);

    const result = await prisma.$transaction(async tx => {
      const existing = await tx.lunchMenu.findUnique({
        where: { serviceDate },
        select: { id: true, activeVersion: true },
      });

      const versionData = {
        soupAvailable: input.soupAvailable,
        soupName: input.soupAvailable ? normalizeOptionalName(input.soupName) : null,
        dessertAvailable: input.dessertAvailable ?? true,
        dessertName:
          input.dessertAvailable === false
            ? null
            : normalizeOptionalName(input.dessertName),
        refreshmentAvailable: true,
        refreshmentName: normalizeOptionalName(input.refreshmentName),
        closesAt,
        publishedAt: now,
        createdById: input.createdById,
        seconds: {
          create: seconds.map((name, position) => ({ name, position })),
        },
      };

      if (!existing) {
        return tx.lunchMenu.create({
          data: {
            serviceDate,
            activeVersion: 1,
            versions: { create: { ...versionData, version: 1 } },
          },
          include: {
            versions: { include: { seconds: { orderBy: { position: 'asc' } } } },
          },
        });
      }

      const nextVersion = existing.activeVersion + 1;
      return tx.lunchMenu.update({
        where: { id: existing.id },
        data: {
          activeVersion: nextVersion,
          isManuallyClosed: false,
          manuallyClosedAt: null,
          manuallyClosedById: null,
          versions: { create: { ...versionData, version: nextVersion } },
        },
        include: {
          versions: { include: { seconds: { orderBy: { position: 'asc' } } } },
        },
      });
    });
    await emitEligibleLunchMenuUpdated(serviceDate);
    return result;
  }

  static async close(serviceDate: Date, actorId: number, now = new Date()) {
    const { menu, version } = await findActiveLunchMenu(serviceDate);
    assertLunchMenuOpen(
      { isManuallyClosed: menu.isManuallyClosed, closesAt: version.closesAt },
      now
    );

    const result = await prisma.lunchMenu.update({
      where: { id: menu.id },
      data: {
        isManuallyClosed: true,
        manuallyClosedAt: now,
        manuallyClosedById: actorId,
      },
    });
    await emitEligibleLunchMenuUpdated(serviceDate);
    return result;
  }

  static async reopen(
    serviceDate: Date,
    actorId: number,
    durationMinutes?: number,
    now = new Date()
  ) {
    assertServiceDateIsNotPast(serviceDate, now);
    await assertNoOtherLunchMenuOpen(serviceDate, now);
    const { menu, version } = await findActiveLunchMenu(serviceDate);
    const closesAt = calculateLunchMenuCloseAt(now, durationMinutes);

    const result = await prisma.$transaction(async tx => {
      await tx.lunchMenuVersion.update({
        where: { id: version.id },
        data: { closesAt },
      });
      return tx.lunchMenu.update({
        where: { id: menu.id },
        data: {
          isManuallyClosed: false,
          manuallyClosedAt: null,
          manuallyClosedById: null,
          updatedAt: now,
        },
      });
    });
    await emitEligibleLunchMenuUpdated(serviceDate);
    return result;
  }

  static async select(input: SelectLunchMenuInput) {
    if (input.source === LunchMenuSelectionSource.SELF && input.actorId !== input.userId) {
      throw new AppError('No puede elegir el menú de otro usuario', 403);
    }
    if (input.source === LunchMenuSelectionSource.ADMIN) {
      assertCanAssignPendingLunchMenuSelection(input.actorDni);
    }

    const now = input.now ?? new Date();
    const { menu, version } = await findActiveLunchMenu(input.serviceDate);
    assertLunchMenuOpen(
      { isManuallyClosed: menu.isManuallyClosed, closesAt: version.closesAt },
      now
    );
    await assertUserHasLunchConfirmation(input.userId, input.serviceDate);

    const second = version.seconds.find(
      item => item.id === input.lunchMenuSecondId
    );
    if (!second) throw new AppError('El segundo no pertenece al menú vigente', 400);
    if (input.wantsSoup && !version.soupAvailable) {
      throw new AppError('La sopa no está disponible para este menú', 400);
    }
    if (input.wantsDessert && !version.dessertAvailable) {
      throw new AppError('El postre no está disponible para este menú', 400);
    }
    if (input.wantsRefreshment && !version.refreshmentAvailable) {
      throw new AppError('El refresco no está disponible para este menú', 400);
    }

    const result = await prisma.lunchMenuSelection.upsert({
      where: {
        lunchMenuVersionId_userId: {
          lunchMenuVersionId: version.id,
          userId: input.userId,
        },
      },
      update: {
        lunchMenuSecondId: input.lunchMenuSecondId,
        wantsSoup: input.wantsSoup,
        wantsDessert: input.wantsDessert,
        wantsRefreshment: input.wantsRefreshment,
        source: input.source,
        assignedById:
          input.source === LunchMenuSelectionSource.ADMIN ? input.actorId : null,
        selectedAt: now,
      },
      create: {
        lunchMenuVersionId: version.id,
        userId: input.userId,
        lunchMenuSecondId: input.lunchMenuSecondId,
        wantsSoup: input.wantsSoup,
        wantsDessert: input.wantsDessert,
        wantsRefreshment: input.wantsRefreshment,
        source: input.source,
        assignedById:
          input.source === LunchMenuSelectionSource.ADMIN ? input.actorId : null,
        selectedAt: now,
      },
    });
    emitLunchMenuUpdated([input.userId]);
    return result;
  }

  private static async getMostRequestedPendingProposal(
    serviceDate: Date,
    now = new Date()
  ) {
    const { menu, version } = await findActiveLunchMenu(serviceDate);
    assertLunchMenuOpen(
      { isManuallyClosed: menu.isManuallyClosed, closesAt: version.closesAt },
      now
    );

    const [eligibleUsers, selections] = await Promise.all([
      getEligibleLunchUsers(serviceDate),
      prisma.lunchMenuSelection.findMany({
        where: { lunchMenuVersionId: version.id },
        select: { userId: true, lunchMenuSecondId: true },
      }),
    ]);
    const selectedUserIds = new Set(selections.map(selection => selection.userId));
    const pendingUserIds = eligibleUsers
      .map(user => user.userId)
      .filter(userId => !selectedUserIds.has(userId));

    if (pendingUserIds.length === 0) {
      throw new AppError('No hay usuarios pendientes de asignación', 400);
    }
    if (selections.length === 0) {
      throw new AppError(
        'Aún no hay elecciones para determinar el segundo más solicitado',
        400
      );
    }

    const selectionCountBySecondId = new Map<number, number>();
    for (const selection of selections) {
      selectionCountBySecondId.set(
        selection.lunchMenuSecondId,
        (selectionCountBySecondId.get(selection.lunchMenuSecondId) ?? 0) + 1
      );
    }
    const mostRequestedSecond = version.seconds.reduce((current, second) => {
      if (!current) return second;
      const currentCount = selectionCountBySecondId.get(current.id) ?? 0;
      const secondCount = selectionCountBySecondId.get(second.id) ?? 0;
      return secondCount > currentCount ? second : current;
    }, version.seconds[0]);

    const soupHistory = version.soupAvailable
      ? await prisma.lunchMenuSelection.findMany({
          where: { userId: { in: pendingUserIds } },
          select: { userId: true, wantsSoup: true },
        })
      : [];
    const soupHistoryByUserId = new Map<number, { yes: number; no: number }>();
    for (const selection of soupHistory) {
      const history = soupHistoryByUserId.get(selection.userId) ?? { yes: 0, no: 0 };
      if (selection.wantsSoup) history.yes += 1;
      else history.no += 1;
      soupHistoryByUserId.set(selection.userId, history);
    }

    const assignments = pendingUserIds.map(userId => {
      const history = soupHistoryByUserId.get(userId);
      const eligibleUser = eligibleUsers.find(user => user.userId === userId);
      const profile = eligibleUser?.user.profile;
      return {
        userId,
        wantsSoup: Boolean(history && history.yes > history.no),
        wantsDessert: version.dessertAvailable,
        wantsRefreshment: version.refreshmentAvailable,
        fullName: profile
          ? `${profile.firstName} ${profile.lastName}`
          : `Usuario ${userId}`,
      };
    });

    return { menu, version, mostRequestedSecond, assignments };
  }

  static async previewMostRequestedPending(
    serviceDate: Date,
    actorDni?: string | null
  ) {
    assertCanAssignPendingLunchMenuSelection(actorDni);
    const proposal = await LunchMenuService.getMostRequestedPendingProposal(serviceDate);
    return {
      secondName: proposal.mostRequestedSecond.name,
      assignments: proposal.assignments,
    };
  }

  static async assignMostRequestedToPending(
    serviceDate: Date,
    actorId: number,
    actorDni?: string | null,
    assignmentsOverride?: Array<{
      userId: number;
      wantsSoup: boolean;
      wantsDessert: boolean;
      wantsRefreshment: boolean;
    }>,
    now = new Date()
  ) {
    assertCanAssignPendingLunchMenuSelection(actorDni);
    const proposal = await LunchMenuService.getMostRequestedPendingProposal(
      serviceDate,
      now
    );

    const proposalByUserId = new Map(
      proposal.assignments.map(assignment => [assignment.userId, assignment])
    );
    const assignments = assignmentsOverride ?? proposal.assignments;
    if (
      assignments.length !== proposal.assignments.length ||
      assignments.some(assignment => !proposalByUserId.has(assignment.userId))
    ) {
      throw new AppError('La propuesta de asignación ya no es válida', 409);
    }
    const result = await prisma.lunchMenuSelection.createMany({
      data: assignments.map(assignment => ({
        lunchMenuVersionId: proposal.version.id,
        userId: assignment.userId,
        lunchMenuSecondId: proposal.mostRequestedSecond.id,
        wantsSoup: assignment.wantsSoup,
        wantsDessert: proposal.version.dessertAvailable
          ? assignment.wantsDessert
          : false,
        wantsRefreshment: proposal.version.refreshmentAvailable
          ? assignment.wantsRefreshment
          : false,
        source: LunchMenuSelectionSource.AUTO,
        assignedById: actorId,
        selectedAt: now,
      })),
      skipDuplicates: true,
    });
    emitLunchMenuUpdated(assignments.map(assignment => assignment.userId));

    return {
      assigned: result.count,
      lunchMenuSecondId: proposal.mostRequestedSecond.id,
      secondName: proposal.mostRequestedSecond.name,
    };
  }

  static async getForUser(serviceDate: Date, userId: number, now = new Date()) {
    const { menu, version } = await findActiveLunchMenu(serviceDate);
    const eligibleUsers = await getEligibleLunchUsers(serviceDate);
    const isEligible = eligibleUsers.some(eligible => eligible.userId === userId);
    const selection = await prisma.lunchMenuSelection.findUnique({
      where: {
        lunchMenuVersionId_userId: {
          lunchMenuVersionId: version.id,
          userId,
        },
      },
      select: {
        lunchMenuSecondId: true,
        wantsSoup: true,
        wantsDessert: true,
        wantsRefreshment: true,
        source: true,
        selectedAt: true,
      },
    });

    return {
      serviceDate: serviceDateKey(menu.serviceDate),
      version: version.version,
      soupAvailable: version.soupAvailable,
      soupName: version.soupName,
      dessertAvailable: version.dessertAvailable,
      dessertName: version.dessertName,
      refreshmentAvailable: version.refreshmentAvailable,
      refreshmentName: version.refreshmentName,
      soupNutrition: version.soupNutritionSnapshot,
      dessertNutrition: version.dessertNutritionSnapshot,
      refreshmentNutrition: version.refreshmentNutritionSnapshot,
      publishedAt: version.publishedAt,
      closesAt: version.closesAt,
      isOpen: !menu.isManuallyClosed && version.closesAt > now,
      isEligible,
      seconds: version.seconds.map(second => ({ id: second.id, name: second.name, nutrition: second.nutritionSnapshot })),
      selection,
    };
  }

  static async getModeration(serviceDate: Date, now = new Date()) {
    const { menu, version } = await findActiveLunchMenu(serviceDate);
    const [eligibleUsers, selections] = await Promise.all([
      getEligibleLunchUsers(serviceDate),
      prisma.lunchMenuSelection.findMany({
        where: { lunchMenuVersionId: version.id },
        select: {
          userId: true,
          lunchMenuSecondId: true,
          wantsSoup: true,
          wantsDessert: true,
          wantsRefreshment: true,
          source: true,
          assignedById: true,
          selectedAt: true,
        },
      }),
    ]);
    const selectionByUserId = new Map(
      selections.map(selection => [selection.userId, selection])
    );

    return {
      serviceDate: serviceDateKey(menu.serviceDate),
      version: version.version,
      soupAvailable: version.soupAvailable,
      soupName: version.soupName,
      dessertAvailable: version.dessertAvailable,
      dessertName: version.dessertName,
      refreshmentAvailable: version.refreshmentAvailable,
      refreshmentName: version.refreshmentName,
      publishedAt: version.publishedAt,
      closesAt: version.closesAt,
      isOpen: !menu.isManuallyClosed && version.closesAt > now,
      seconds: version.seconds.map(second => ({ id: second.id, name: second.name })),
      users: eligibleUsers.map(eligible => {
        const profile = eligible.user.profile;
        return {
          userId: eligible.userId,
          fullName: profile
            ? `${profile.firstName} ${profile.lastName}`
            : `Usuario ${eligible.userId}`,
          dni: profile?.dni ?? null,
          selection: selectionByUserId.get(eligible.userId) ?? null,
        };
      }),
    };
  }

  static async getConsolidated(serviceDate: Date) {
    const moderation = await LunchMenuService.getModeration(serviceDate);
    const secondById = new Map(
      moderation.seconds.map(second => [second.id, second.name])
    );
    const selectedUsers = moderation.users.filter(user => user.selection);
    const bySecond = moderation.seconds.map(second => ({
      second: second.name,
      total: selectedUsers.filter(
        user => user.selection?.lunchMenuSecondId === second.id
      ).length,
      withSoup: selectedUsers.filter(
        user =>
          user.selection?.lunchMenuSecondId === second.id && user.selection.wantsSoup
      ).length,
      withoutSoup: selectedUsers.filter(
        user =>
          user.selection?.lunchMenuSecondId === second.id && !user.selection.wantsSoup
      ).length,
    }));

    return {
      serviceDate: moderation.serviceDate,
      version: moderation.version,
      totalEligible: moderation.users.length,
      totalSelected: selectedUsers.length,
      totalPending: moderation.users.length - selectedUsers.length,
      bySecond,
      accompaniments: {
        soup: moderation.soupAvailable
          ? {
              name: moderation.soupName ?? 'Sopa',
              total: selectedUsers.filter(user => user.selection?.wantsSoup).length,
            }
          : null,
        dessert: moderation.dessertAvailable
          ? {
              name: moderation.dessertName ?? 'Postre',
              total: selectedUsers.filter(user => user.selection?.wantsDessert).length,
            }
          : null,
        refreshment: moderation.refreshmentAvailable
          ? {
              name: moderation.refreshmentName ?? 'Refresco',
              total: selectedUsers.filter(user => user.selection?.wantsRefreshment).length,
            }
          : null,
      },
      pending: moderation.users
        .filter(user => !user.selection)
        .map(user => ({ userId: user.userId, fullName: user.fullName })),
      selectedSecondNames: selectedUsers.map(user =>
        secondById.get(user.selection!.lunchMenuSecondId)
      ),
    };
  }
}

export default LunchMenuService;

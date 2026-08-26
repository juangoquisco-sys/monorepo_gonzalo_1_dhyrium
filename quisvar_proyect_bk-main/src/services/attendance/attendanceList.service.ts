import {
  AttendanceCaptureMode,
  AttendanceListState,
  type List,
} from '@prisma/client';
import LicenseServices from '@/services/licenses.services';
import AppError from '@/utils/appError';
import { activeNonRemoteUserWhere } from '@/utils/userFilters';
import { prisma } from '@/utils/prisma.server';
import { createAttendanceAuditEvent } from '@/services/attendance/attendanceAudit.service';
import {
  buildAttendanceParticipantRows,
  canDiscardAttendanceList,
  canFinalizeAttendanceList,
  isValidAttendanceActorId,
  resolveAttendanceListLifecycle,
} from '@/services/attendance/attendance.policy';
import AttendanceRealtimeService from '@/services/attendance/attendanceRealtime.service';
import { withSerializableAttendanceRetry } from '@/services/attendance/attendanceTransaction';

export type CreateAttendanceListInput = {
  title: string;
  timer: string;
  captureMode: AttendanceCaptureMode;
};

const limaDayStart = (now: Date) => {
  const limaNow = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(
      limaNow.getUTCFullYear(),
      limaNow.getUTCMonth(),
      limaNow.getUTCDate(),
      5
    )
  );
};

class AttendanceListService {
  static async create(input: CreateAttendanceListInput, actorId: number) {
    if (!isValidAttendanceActorId(actorId)) {
      throw new AppError('Administrador autenticado invalido', 401);
    }
    const title = input.title.trim();
    const timer = input.timer.trim();
    if (!title || !timer) {
      throw new AppError('Titulo y hora del llamado son obligatorios', 400);
    }
    if (!Object.values(AttendanceCaptureMode).includes(input.captureMode)) {
      throw new AppError('Modo de captura de asistencia invalido', 400);
    }

    await LicenseServices.deleteExpiredLicenses();
    const now = new Date();
    const result = await withSerializableAttendanceRetry(async tx => {
      const pendingList = await tx.list.findFirst({
        where: {
          state: {
            in: [AttendanceListState.OPEN, AttendanceListState.REVIEW],
          },
        },
        select: { id: true },
      });
      if (pendingList) {
        throw new AppError('Ya existe una lista de asistencia en curso', 409);
      }

      const users = await tx.users.findMany({
        where: activeNonRemoteUserWhere,
        select: { id: true },
      });
      if (!users.length) {
        throw new AppError('No hay usuarios elegibles para convocar', 400);
      }

      const userIds = users.map(user => user.id);
      const activeLicenses = await tx.licenses.findMany({
        where: {
          usersId: { in: userIds },
          status: 'ACTIVO',
          isRecurringParent: false,
        },
        select: { usersId: true, type: true },
      });
      const list = await tx.list.create({
        data: {
          title,
          timer,
          ...resolveAttendanceListLifecycle(input.captureMode, now),
        },
      });
      const participants = buildAttendanceParticipantRows(
        list.id,
        userIds,
        activeLicenses
      );
      await tx.listOnUsers.createMany({ data: participants });
      await createAttendanceAuditEvent(tx, {
        action: 'ATTENDANCE_LIST_OPENED',
        actorId,
        createdAt: now,
        details: {
          listId: list.id,
          participantCount: participants.length,
          captureMode: input.captureMode,
          state: AttendanceListState.OPEN,
        },
      });
      return { list, userIds };
    });

    AttendanceRealtimeService.opened(
      { listId: result.list.id, state: AttendanceListState.OPEN },
      result.userIds
    );
    return result.list;
  }

  static async getCurrentForUser(userId: number, now = new Date()) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new AppError('Usuario autenticado invalido', 401);
    }
    const participantSelect = {
      status: true,
      statusSource: true,
      biometricMarkedAt: true,
      list: {
        select: {
          id: true,
          title: true,
          timer: true,
          captureMode: true,
          state: true,
          openedAt: true,
          finalizedAt: true,
        },
      },
    } as const;
    const pendingParticipant = await prisma.listOnUsers.findFirst({
      where: {
        usersId: userId,
        list: {
          state: {
            in: [AttendanceListState.OPEN, AttendanceListState.REVIEW],
          },
        },
      },
      select: participantSelect,
      orderBy: { list: { openedAt: 'desc' } },
    });
    const participant =
      pendingParticipant ??
      (await prisma.listOnUsers.findFirst({
        where: {
          usersId: userId,
          list: {
            state: AttendanceListState.FINALIZED,
            finalizedAt: { gte: limaDayStart(now) },
          },
        },
        select: participantSelect,
        orderBy: { list: { finalizedAt: 'desc' } },
      }));

    if (!participant) return { attendance: null };
    const definitive = participant.list.state === AttendanceListState.FINALIZED;
    return {
      attendance: {
        listId: participant.list.id,
        title: participant.list.title,
        timer: participant.list.timer,
        captureMode: participant.list.captureMode,
        state: participant.list.state,
        openedAt: participant.list.openedAt,
        finalizedAt: participant.list.finalizedAt,
        status: participant.status,
        statusSource: participant.statusSource,
        biometricMarkedAt: participant.biometricMarkedAt,
        provisional: !definitive,
        definitive,
      },
    };
  }

  static async finalize(listId: List['id'], actorId: number) {
    if (!listId) throw new AppError('ID de lista invalido', 400);
    if (!isValidAttendanceActorId(actorId)) {
      throw new AppError('Administrador autenticado invalido', 401);
    }
    const now = new Date();
    const result = await withSerializableAttendanceRetry(async tx => {
      const list = await tx.list.findUnique({
        where: { id: listId },
        select: {
          captureMode: true,
          state: true,
          users: { select: { usersId: true } },
        },
      });
      if (!list) throw new AppError('No se encontro la lista', 404);
      if (!canFinalizeAttendanceList(list.captureMode, list.state)) {
        throw new AppError('La lista no esta disponible para finalizar', 409);
      }
      const finalized = await tx.list.updateMany({
        where: {
          id: listId,
          captureMode: list.captureMode,
          state: list.state,
        },
        data: {
          state: AttendanceListState.FINALIZED,
          finalizedAt: now,
        },
      });
      if (finalized.count !== 1) {
        throw new AppError('La lista ya no se puede finalizar', 409);
      }
      await createAttendanceAuditEvent(tx, {
        action: 'ATTENDANCE_LIST_FINALIZED',
        actorId,
        createdAt: now,
        details: {
          listId,
          participantCount: list.users.length,
          captureMode: list.captureMode,
          state: AttendanceListState.FINALIZED,
        },
      });
      return { userIds: list.users.map(user => user.usersId) };
    });

    AttendanceRealtimeService.finalized(
      { listId, state: AttendanceListState.FINALIZED },
      result.userIds
    );
    return prisma.list.findUnique({ where: { id: listId } });
  }

  static async discard(listId: List['id'], actorId: number) {
    if (!isValidAttendanceActorId(actorId)) {
      throw new AppError('Administrador autenticado invalido', 401);
    }
    const result = await withSerializableAttendanceRetry(async tx => {
      const list = await tx.list.findUnique({
        where: { id: listId },
        select: {
          captureMode: true,
          state: true,
          users: { select: { usersId: true } },
        },
      });
      if (!list) throw new AppError('No se encontro la lista', 404);
      if (!canDiscardAttendanceList(list.captureMode, list.state)) {
        throw new AppError('La lista ya no se puede descartar', 409);
      }

      await createAttendanceAuditEvent(tx, {
        action: 'ATTENDANCE_LIST_DISCARDED',
        actorId,
        details: {
          listId,
          participantCount: list.users.length,
          captureMode: list.captureMode,
          state: list.state,
        },
      });
      await tx.list.delete({ where: { id: listId } });
      return { userIds: list.users.map(user => user.usersId) };
    });

    AttendanceRealtimeService.discarded({ listId }, result.userIds);
  }
}

export default AttendanceListService;

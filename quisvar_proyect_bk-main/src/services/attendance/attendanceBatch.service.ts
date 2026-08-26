import AppError from '@/utils/appError';
import { withSerializableAttendanceRetry } from '@/services/attendance/attendanceTransaction';
import AttendanceRealtimeService from '@/services/attendance/attendanceRealtime.service';
import { createAttendanceAuditEvent } from '@/services/attendance/attendanceAudit.service';
import {
  normalizeAttendanceBatchChanges,
  planAttendanceBatchChanges,
  isValidAttendanceActorId,
} from '@/services/attendance/attendance.policy';
import type { ListDetails } from '@prisma/client';

export type AttendanceBatchInput = {
  batchId: string;
  changes: Array<{
    userId: number;
    status: ListDetails;
    reason?: string;
  }>;
};

class AttendanceBatchService {
  static async update(
    listId: number,
    actorId: number,
    input: AttendanceBatchInput
  ) {
    if (!isValidAttendanceActorId(actorId)) {
      throw new AppError('Administrador autenticado invalido', 401);
    }

    const changes = normalizeAttendanceBatchChanges(
      input.changes.map(change => ({
        usersId: change.userId,
        status: change.status,
        reason: change.reason,
      }))
    );

    const result = await withSerializableAttendanceRetry(async tx => {
      const list = await tx.list.findUnique({
        where: { id: listId },
        select: {
          id: true,
          captureMode: true,
          state: true,
          users: {
            where: { usersId: { in: changes.map(change => change.usersId) } },
            select: {
              usersId: true,
              status: true,
              statusSource: true,
              biometricMarkedAt: true,
            },
          },
        },
      });
      if (!list) throw new AppError('No se encontro la lista', 404);
      let effectiveChanges;
      try {
        effectiveChanges = planAttendanceBatchChanges({
          captureMode: list.captureMode,
          state: list.state,
          participants: list.users,
          changes,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Batch de asistencia invalido';
        const isStateConflict =
          message.includes('ya no admite') ||
          message.includes('Cierre la captura');
        throw new AppError(message, isStateConflict ? 409 : 400);
      }

      for (const change of effectiveChanges) {
        const updated = await tx.listOnUsers.updateMany({
          where: {
            usersId: change.usersId,
            listId,
            list: {
              captureMode: list.captureMode,
              state: list.state,
            },
          },
          data: {
            status: change.status,
            statusSource: change.nextSource,
          },
        });
        if (updated.count !== 1) {
          throw new AppError('La lista cambio mientras se editaba', 409);
        }
        await createAttendanceAuditEvent(tx, {
          action: 'ATTENDANCE_STATUS_CHANGED',
          actorId,
          details: {
            listId,
            affectedUserId: change.usersId,
            previousStatus: change.participant.status,
            nextStatus: change.status,
            previousSource: change.participant.statusSource,
            nextSource: change.nextSource,
            reason: change.reason ?? null,
            batchId: input.batchId,
            captureMode: list.captureMode,
            state: list.state,
          },
        });
      }

      const canonical = await tx.listOnUsers.findMany({
        where: {
          listId,
          usersId: { in: changes.map(change => change.usersId) },
        },
        select: {
          usersId: true,
          status: true,
          statusSource: true,
          biometricMarkedAt: true,
        },
        orderBy: { usersId: 'asc' },
      });

      return {
        batchId: input.batchId,
        listId,
        state: list.state,
        participants: canonical.map(participant => ({
          userId: participant.usersId,
          status: participant.status,
          statusSource: participant.statusSource,
          biometricMarkedAt: participant.biometricMarkedAt,
        })),
        affectedUserIds: effectiveChanges.map(change => change.usersId),
      };
    });

    AttendanceRealtimeService.statusUpdated(
      {
        listId,
        state: result.state,
        batchId: result.batchId,
      },
      result.affectedUserIds
    );
    return {
      batchId: result.batchId,
      listId: result.listId,
      participants: result.participants,
    };
  }
}

export default AttendanceBatchService;

import { ENV } from '@/config/env';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import {
  AttendanceCaptureMode,
  AttendanceListState,
  AttendanceStatusSource,
  ListDetails,
} from '@prisma/client';
import type { IclockAttendanceLog } from '@/services/iclock.services';
import AttendanceRealtimeService from '@/services/attendance/attendanceRealtime.service';
import { withSerializableAttendanceRetry } from '@/services/attendance/attendanceTransaction';
import {
  buildBiometricMarkUpdate,
  buildBiometricConfiguration,
  canCloseBiometricAttendance,
  evaluateBiometricEvent,
  evaluateBiometricParticipant,
  isValidAttendanceActorId,
} from '@/services/attendance/attendance.policy';
import { createAttendanceAuditEvent } from '@/services/attendance/attendanceAudit.service';

export type BiometricMarkResult =
  | {
      outcome: 'MARKED';
      listId: number;
      userId: number;
      markedAt: Date;
    }
  | {
      outcome:
        | 'NO_OPEN_LIST'
        | 'DEVICE_NOT_ALLOWED'
        | 'VERIFY_MODE_NOT_ALLOWED'
        | 'INVALID_TIMESTAMP'
        | 'EVENT_BEFORE_OPEN'
        | 'EVENT_IN_FUTURE'
        | 'USER_NOT_SUMMONED'
        | 'DUPLICATE_OR_INELIGIBLE';
    };

const configuration = () =>
  buildBiometricConfiguration({
    allowedSerials: ENV.ICLOCK_ALLOWED_SERIALS,
    fingerprintVerifyModes: ENV.ICLOCK_FINGERPRINT_VERIFY_MODES,
    clockSkewSeconds: ENV.ICLOCK_CLOCK_SKEW_SECONDS,
  });

class BiometricAttendanceService {
  static async markFromIclock(
    serialNumber: string,
    log: IclockAttendanceLog,
    now = new Date()
  ): Promise<BiometricMarkResult> {
    const dni = log.userId.trim();
    if (!dni) return { outcome: 'USER_NOT_SUMMONED' };

    const result = await withSerializableAttendanceRetry(async tx => {
      const list = await tx.list.findFirst({
        where: {
          captureMode: AttendanceCaptureMode.BIOMETRIC,
          state: AttendanceListState.OPEN,
        },
        select: { id: true, openedAt: true },
      });
      if (!list?.openedAt) {
        return { outcome: 'NO_OPEN_LIST' } as const;
      }

      const evaluation = evaluateBiometricEvent({
        serialNumber,
        verifyMode: log.verifyMode,
        timestamp: log.timestamp,
        openedAt: list.openedAt,
        now,
        configuration: configuration(),
      });
      if (!evaluation.accepted) {
        return { outcome: evaluation.reason } as BiometricMarkResult;
      }

      const participant = await tx.listOnUsers.findFirst({
        where: {
          listId: list.id,
          user: {
            profile: { dni },
          },
        },
        select: {
          usersId: true,
          status: true,
          statusSource: true,
          biometricMarkedAt: true,
        },
      });
      const participantDecision = evaluateBiometricParticipant({
        state: AttendanceListState.OPEN,
        participant,
      });
      if (participantDecision !== 'MARK') {
        return { outcome: participantDecision } as BiometricMarkResult;
      }

      const updated = await tx.listOnUsers.updateMany({
        where: {
          usersId: participant!.usersId,
          listId: list.id,
          status: ListDetails.SIMPLE,
          biometricMarkedAt: null,
          list: {
            captureMode: AttendanceCaptureMode.BIOMETRIC,
            state: AttendanceListState.OPEN,
          },
        },
        data: buildBiometricMarkUpdate(
          evaluation.eventAt,
          log.verifyMode,
          serialNumber
        ),
      });
      if (updated.count !== 1) {
        return { outcome: 'DUPLICATE_OR_INELIGIBLE' } as const;
      }
      await createAttendanceAuditEvent(tx, {
        action: 'ATTENDANCE_BIOMETRIC_MARK_ACCEPTED',
        actorId: participant!.usersId,
        createdAt: evaluation.eventAt,
        details: {
          listId: list.id,
          affectedUserId: participant!.usersId,
          previousStatus: participant!.status,
          nextStatus: ListDetails.PUNTUAL,
          previousSource: participant!.statusSource,
          nextSource: AttendanceStatusSource.BIOMETRIC,
          biometricMarkedAt: evaluation.eventAt.toISOString(),
          captureMode: AttendanceCaptureMode.BIOMETRIC,
          state: AttendanceListState.OPEN,
        },
      });

      return {
        outcome: 'MARKED',
        listId: list.id,
        userId: participant!.usersId,
        markedAt: evaluation.eventAt,
      } as const;
    });

    if (result.outcome === 'MARKED') {
      AttendanceRealtimeService.marked({
        listId: result.listId,
        userId: result.userId,
        markedAt: result.markedAt.toISOString(),
        state: AttendanceListState.OPEN,
      });
    }
    return result;
  }

  static async close(listId: number, actorId: number) {
    if (!isValidAttendanceActorId(actorId)) {
      throw new AppError('Administrador autenticado invalido', 401);
    }
    const now = new Date();
    const result = await withSerializableAttendanceRetry(async tx => {
      const list = await tx.list.findUnique({
        where: { id: listId },
        select: {
          id: true,
          captureMode: true,
          state: true,
          users: { select: { usersId: true } },
        },
      });
      if (!list) throw new AppError('No se encontro la lista', 404);
      if (
        list.captureMode !== AttendanceCaptureMode.BIOMETRIC ||
        !canCloseBiometricAttendance(list.state)
      ) {
        throw new AppError('La lista biometrica ya no esta abierta', 409);
      }

      const updated = await tx.list.updateMany({
        where: {
          id: listId,
          captureMode: AttendanceCaptureMode.BIOMETRIC,
          state: AttendanceListState.OPEN,
        },
        data: { state: AttendanceListState.REVIEW, closedAt: now },
      });
      if (updated.count !== 1) {
        throw new AppError('La lista biometrica ya no esta abierta', 409);
      }
      await createAttendanceAuditEvent(tx, {
        action: 'ATTENDANCE_BIOMETRIC_CAPTURE_CLOSED',
        actorId,
        createdAt: now,
        details: {
          listId,
          captureMode: AttendanceCaptureMode.BIOMETRIC,
          state: AttendanceListState.REVIEW,
        },
      });
      return { userIds: list.users.map(user => user.usersId) };
    });

    AttendanceRealtimeService.closed(
      { listId, state: AttendanceListState.REVIEW },
      result.userIds
    );
    return prisma.list.findUnique({ where: { id: listId } });
  }
}

export default BiometricAttendanceService;

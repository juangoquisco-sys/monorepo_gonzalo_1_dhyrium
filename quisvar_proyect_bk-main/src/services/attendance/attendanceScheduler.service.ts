import { AttendanceCaptureMode, AttendanceListState } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import AttendanceListService, {
  limaDayStart,
} from '@/services/attendance/attendanceList.service';
import BiometricAttendanceService from '@/services/attendance/biometricAttendance.service';
import AttendanceCallConfigService from '@/services/attendance/attendanceCallConfig.service';
import AttendanceRealtimeService from '@/services/attendance/attendanceRealtime.service';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const REVIEW_WINDOW_MS = 60 * 60 * 1000;

const combineLimaDateAndTime = (referenceNow: Date, hhmm: string): Date => {
  const limaNow = new Date(referenceNow.getTime() - 5 * 60 * 60 * 1000);
  const [hour, minute] = hhmm.split(':').map(Number);
  return new Date(
    Date.UTC(
      limaNow.getUTCFullYear(),
      limaNow.getUTCMonth(),
      limaNow.getUTCDate(),
      hour + 5,
      minute,
      0
    )
  );
};

const isConflict = (error: unknown) =>
  error instanceof AppError && error.statusCode === 409;

class AttendanceSchedulerService {
  static async autoOpenNextCall(now = new Date()) {
    const activeList = await prisma.list.findFirst({
      where: {
        state: { in: [AttendanceListState.OPEN, AttendanceListState.REVIEW] },
      },
      select: { id: true },
    });
    if (activeList) return null;

    const resolvedCalls = await AttendanceCallConfigService.resolveCallsForDate(
      now
    );
    if (!resolvedCalls.length) return null;

    const dayStart = limaDayStart(now);
    const createdToday = await prisma.list.findMany({
      where: { callConfigId: { not: null }, openedAt: { gte: dayStart } },
      select: { callConfigId: true },
    });
    const createdConfigIds = new Set(createdToday.map(list => list.callConfigId));

    const nextCall = resolvedCalls
      .filter(call => {
        if (createdConfigIds.has(call.callConfigId)) return false;
        const startAt = combineLimaDateAndTime(now, call.captureStartTime);
        const endAt = combineLimaDateAndTime(now, call.captureEndTime);
        return now >= startAt && now < endAt;
      })
      .sort((a, b) => a.position - b.position)[0];
    if (!nextCall) return null;

    const startAt = combineLimaDateAndTime(now, nextCall.captureStartTime);
    const endAt = combineLimaDateAndTime(now, nextCall.captureEndTime);

    try {
      return await AttendanceListService.create(
        {
          title: nextCall.title,
          timer: nextCall.captureStartTime,
          captureMode: nextCall.captureMode,
          callConfigId: nextCall.callConfigId,
          captureWindowEndsAt: endAt,
        },
        null
      );
    } catch (error) {
      if (isConflict(error)) return null;
      throw error;
    }
  }

  static async autoCloseCaptureWindow(now = new Date()) {
    const lists = await prisma.list.findMany({
      where: {
        captureMode: AttendanceCaptureMode.BIOMETRIC,
        state: AttendanceListState.OPEN,
        captureWindowEndsAt: { lte: now },
      },
      select: { id: true },
    });
    for (const { id } of lists) {
      try {
        await BiometricAttendanceService.close(
          id,
          null,
          new Date(now.getTime() + REVIEW_WINDOW_MS)
        );
      } catch (error) {
        if (!isConflict(error)) throw error;
      }
    }
  }

  static async autoFinalizeManualCalls(now = new Date()) {
    const lists = await prisma.list.findMany({
      where: {
        captureMode: AttendanceCaptureMode.MANUAL,
        state: AttendanceListState.OPEN,
        captureWindowEndsAt: { lte: now },
      },
      select: { id: true },
    });
    for (const { id } of lists) {
      try {
        await AttendanceListService.finalize(id, null);
      } catch (error) {
        if (!isConflict(error)) throw error;
      }
    }
  }

  static async autoFinalizeReview(now = new Date()) {
    const lists = await prisma.list.findMany({
      where: {
        captureMode: AttendanceCaptureMode.BIOMETRIC,
        state: AttendanceListState.REVIEW,
        reviewDeadlineAt: { lte: now },
      },
      select: { id: true },
    });
    for (const { id } of lists) {
      try {
        await AttendanceListService.finalize(id, null);
      } catch (error) {
        if (!isConflict(error)) throw error;
      }
    }
  }

  static async notifyClosingSoon(now = new Date()) {
    const soonThreshold = new Date(now.getTime() + FIVE_MINUTES_MS);
    const lists = await prisma.list.findMany({
      where: {
        captureMode: AttendanceCaptureMode.BIOMETRIC,
        state: AttendanceListState.OPEN,
        captureWindowEndsAt: { lte: soonThreshold, gt: now },
        closingSoonNotifiedAt: null,
      },
      select: {
        id: true,
        captureWindowEndsAt: true,
        users: {
          where: { biometricMarkedAt: null },
          select: { usersId: true },
        },
      },
    });
    for (const list of lists) {
      const updated = await prisma.list.updateMany({
        where: { id: list.id, closingSoonNotifiedAt: null },
        data: { closingSoonNotifiedAt: now },
      });
      if (updated.count !== 1 || !list.captureWindowEndsAt) continue;
      AttendanceRealtimeService.captureWindowClosingSoon(
        {
          listId: list.id,
          state: AttendanceListState.OPEN,
          captureWindowEndsAt: list.captureWindowEndsAt.toISOString(),
        },
        list.users.map(user => user.usersId)
      );
    }
  }

  static async runTick(now = new Date()) {
    await this.autoFinalizeReview(now);
    await this.autoFinalizeManualCalls(now);
    await this.autoCloseCaptureWindow(now);
    await this.notifyClosingSoon(now);
    await this.autoOpenNextCall(now);
  }
}

export default AttendanceSchedulerService;

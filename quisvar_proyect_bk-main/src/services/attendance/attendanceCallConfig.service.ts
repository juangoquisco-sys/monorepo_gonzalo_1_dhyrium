import { AttendanceCaptureMode, AttendanceWeekday } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';

const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/;

const WEEKDAY_BY_UTC_DAY: AttendanceWeekday[] = [
  AttendanceWeekday.SUNDAY,
  AttendanceWeekday.MONDAY,
  AttendanceWeekday.TUESDAY,
  AttendanceWeekday.WEDNESDAY,
  AttendanceWeekday.THURSDAY,
  AttendanceWeekday.FRIDAY,
  AttendanceWeekday.SATURDAY,
];

export const limaWeekdayFor = (now: Date): AttendanceWeekday => {
  const limaNow = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return WEEKDAY_BY_UTC_DAY[limaNow.getUTCDay()];
};

const assertTimeFormat = (value: string, field: string) => {
  if (!TIME_FORMAT.test(value)) {
    throw new AppError(`${field} debe tener el formato HH:mm`, 400);
  }
};

const assertTimeOrder = (start: string, end: string) => {
  if (start >= end) {
    throw new AppError(
      'La hora de cierre de captura debe ser posterior a la de inicio',
      400
    );
  }
};

export type ResolvedAttendanceCall = {
  callConfigId: number;
  position: number;
  title: string;
  captureStartTime: string;
  captureEndTime: string;
  captureMode: AttendanceCaptureMode;
};

export type UpsertCallConfigInput = {
  position: number;
  title: string;
  captureStartTime: string;
  captureEndTime: string;
  captureMode: AttendanceCaptureMode;
  isActive?: boolean;
};

export type UpsertWeekdayOverrideInput = {
  skip: boolean;
  title?: string | null;
  captureStartTime?: string | null;
  captureEndTime?: string | null;
};

class AttendanceCallConfigService {
  static async listCallConfigs() {
    return prisma.attendanceCallConfig.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
      include: { weekdayOverrides: { orderBy: { weekday: 'asc' } } },
    });
  }

  static async upsertCallConfig(input: UpsertCallConfigInput) {
    if (!Number.isInteger(input.position) || input.position <= 0) {
      throw new AppError('La posicion del llamado debe ser un entero positivo', 400);
    }
    const title = input.title.trim();
    if (!title) {
      throw new AppError('El titulo del llamado es obligatorio', 400);
    }
    assertTimeFormat(input.captureStartTime, 'La hora de inicio de captura');
    assertTimeFormat(input.captureEndTime, 'La hora de cierre de captura');
    assertTimeOrder(input.captureStartTime, input.captureEndTime);
    if (!Object.values(AttendanceCaptureMode).includes(input.captureMode)) {
      throw new AppError('Modo de captura de asistencia invalido', 400);
    }

    return prisma.attendanceCallConfig.upsert({
      where: { position: input.position },
      create: {
        position: input.position,
        title,
        captureStartTime: input.captureStartTime,
        captureEndTime: input.captureEndTime,
        captureMode: input.captureMode,
        isActive: input.isActive ?? true,
      },
      update: {
        title,
        captureStartTime: input.captureStartTime,
        captureEndTime: input.captureEndTime,
        captureMode: input.captureMode,
        // This endpoint only creates/edits a call from the config UI; reactivate
        // it unconditionally so re-using a position freed by a soft delete works.
        isActive: input.isActive ?? true,
      },
    });
  }

  static async deleteCallConfig(id: number) {
    const config = await prisma.attendanceCallConfig.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!config) throw new AppError('No se encontro el llamado configurado', 404);
    await prisma.attendanceCallConfig.update({
      where: { id },
      data: { isActive: false },
    });
  }

  static async upsertWeekdayOverride(
    callConfigId: number,
    weekday: AttendanceWeekday,
    input: UpsertWeekdayOverrideInput
  ) {
    const config = await prisma.attendanceCallConfig.findUnique({
      where: { id: callConfigId },
      select: { id: true },
    });
    if (!config) throw new AppError('No se encontro el llamado configurado', 404);

    if (!input.skip) {
      if (input.captureStartTime) {
        assertTimeFormat(input.captureStartTime, 'La hora de inicio de captura');
      }
      if (input.captureEndTime) {
        assertTimeFormat(input.captureEndTime, 'La hora de cierre de captura');
      }
      if (input.captureStartTime && input.captureEndTime) {
        assertTimeOrder(input.captureStartTime, input.captureEndTime);
      }
    }

    return prisma.attendanceCallWeekdayOverride.upsert({
      where: { callConfigId_weekday: { callConfigId, weekday } },
      create: {
        callConfigId,
        weekday,
        skip: input.skip,
        title: input.title?.trim() || null,
        captureStartTime: input.captureStartTime || null,
        captureEndTime: input.captureEndTime || null,
      },
      update: {
        skip: input.skip,
        title: input.title?.trim() || null,
        captureStartTime: input.captureStartTime || null,
        captureEndTime: input.captureEndTime || null,
      },
    });
  }

  static async deleteWeekdayOverride(id: number) {
    const override = await prisma.attendanceCallWeekdayOverride.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!override) throw new AppError('No se encontro la excepcion', 404);
    await prisma.attendanceCallWeekdayOverride.delete({ where: { id } });
  }

  static async resolveCallsForDate(
    date: Date
  ): Promise<ResolvedAttendanceCall[]> {
    const weekday = limaWeekdayFor(date);
    const configs = await prisma.attendanceCallConfig.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
      include: { weekdayOverrides: { where: { weekday } } },
    });

    return configs
      .map(config => {
        const override = config.weekdayOverrides[0];
        if (override?.skip) return null;
        return {
          callConfigId: config.id,
          position: config.position,
          title: override?.title ?? config.title,
          captureStartTime: override?.captureStartTime ?? config.captureStartTime,
          captureEndTime: override?.captureEndTime ?? config.captureEndTime,
          captureMode: config.captureMode,
        };
      })
      .filter((call): call is ResolvedAttendanceCall => call !== null);
  }
}

export default AttendanceCallConfigService;

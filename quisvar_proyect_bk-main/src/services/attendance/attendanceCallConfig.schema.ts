import { z } from 'zod';
import { AttendanceCaptureMode, AttendanceWeekday } from '@prisma/client';

const timeString = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const upsertCallConfigRequestSchema = z.object({
  params: z.object({ position: z.coerce.number().int().positive() }),
  body: z
    .object({
      title: z.string().trim().min(1),
      captureStartTime: timeString,
      captureEndTime: timeString,
      captureMode: z.nativeEnum(AttendanceCaptureMode),
      isActive: z.boolean().optional(),
    })
    .strict(),
});

export const callConfigIdParamsSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});

export const upsertWeekdayOverrideRequestSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
    weekday: z.nativeEnum(AttendanceWeekday),
  }),
  body: z
    .object({
      skip: z.boolean(),
      title: z.string().trim().min(1).optional().nullable(),
      captureStartTime: timeString.optional().nullable(),
      captureEndTime: timeString.optional().nullable(),
    })
    .strict(),
});

export const weekdayOverrideIdParamsSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});

export const resolvedCallsQuerySchema = z.object({
  query: z.object({
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
});

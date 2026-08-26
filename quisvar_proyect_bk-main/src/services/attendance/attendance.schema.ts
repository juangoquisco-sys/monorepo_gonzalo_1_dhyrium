import { z } from 'zod';
import { AttendanceCaptureMode, ListDetails } from '@prisma/client';

const listIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createAttendanceRequestSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1),
      timer: z.string().trim().min(1),
      captureMode: z.nativeEnum(AttendanceCaptureMode),
    })
    .strict(),
});

export const attendanceListActionRequestSchema = z.object({
  params: listIdParamsSchema,
});

export const updateAttendanceBatchRequestSchema = z.object({
  params: listIdParamsSchema,
  body: z
    .object({
      batchId: z.string().uuid(),
      changes: z
        .array(
          z
            .object({
              userId: z.number().int().positive(),
              status: z.nativeEnum(ListDetails),
              reason: z.string().trim().min(1).max(500).optional(),
            })
            .strict()
        )
        .min(1)
        .max(500),
    })
    .strict(),
});

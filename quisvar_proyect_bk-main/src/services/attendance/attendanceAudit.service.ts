import type {
  AttendanceCaptureMode,
  AttendanceListState,
  AttendanceStatusSource,
  ListDetails,
  Prisma,
} from '@prisma/client';
import type { AttendanceTransactionClient } from '@/services/attendance/attendanceTransaction';

type AttendanceAuditAction =
  | 'ATTENDANCE_LIST_OPENED'
  | 'ATTENDANCE_BIOMETRIC_MARK_ACCEPTED'
  | 'ATTENDANCE_BIOMETRIC_CAPTURE_CLOSED'
  | 'ATTENDANCE_STATUS_CHANGED'
  | 'ATTENDANCE_LIST_FINALIZED'
  | 'ATTENDANCE_LIST_DISCARDED';

type AttendanceAuditDetails = {
  listId: number;
  captureMode: AttendanceCaptureMode;
  state: AttendanceListState;
  participantCount?: number;
  affectedUserId?: number;
  previousStatus?: ListDetails;
  nextStatus?: ListDetails;
  previousSource?: AttendanceStatusSource;
  nextSource?: AttendanceStatusSource;
  reason?: string | null;
  batchId?: string;
  biometricMarkedAt?: string;
};

const methodByAction: Record<AttendanceAuditAction, string> = {
  ATTENDANCE_LIST_OPENED: 'POST',
  ATTENDANCE_BIOMETRIC_MARK_ACCEPTED: 'POST',
  ATTENDANCE_BIOMETRIC_CAPTURE_CLOSED: 'POST',
  ATTENDANCE_STATUS_CHANGED: 'PATCH',
  ATTENDANCE_LIST_FINALIZED: 'POST',
  ATTENDANCE_LIST_DISCARDED: 'DELETE',
};

export const createAttendanceAuditEvent = async (
  tx: AttendanceTransactionClient,
  input: {
    action: AttendanceAuditAction;
    actorId: number | null;
    details: AttendanceAuditDetails;
    createdAt?: Date;
  }
) => {
  const method = methodByAction[input.action];
  return tx.auditLog.create({
    data: {
      userId: input.actorId,
      action: input.action,
      method,
      path: `/list/${input.details.listId}/attendance-events`,
      severity:
        input.action === 'ATTENDANCE_LIST_DISCARDED' ? 'CRITICAL' : 'SUCCESS',
      requestBody: input.details as Prisma.InputJsonValue,
      queryParams: {},
      errorResponse: {},
      statusCode: 200,
      createdAt: input.createdAt ?? new Date(),
    },
  });
};

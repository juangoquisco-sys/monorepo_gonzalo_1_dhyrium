import {
  ATTENDANCE_STATUSES,
  isAttendanceStatus,
} from '@/models/attendanceStatus';
import type { AttendanceStatus } from '@/models/attendanceStatus';
import type { AttendanceRange, userAttendance } from '@/types/types';

export function countStatusAttendance(data: AttendanceRange) {
  const counts = ATTENDANCE_STATUSES.reduce<Record<AttendanceStatus, number>>(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<AttendanceStatus, number>
  );

  data?.list.forEach((item: userAttendance) => {
    if (isAttendanceStatus(item.status)) counts[item.status]++;
  });

  return counts;
}

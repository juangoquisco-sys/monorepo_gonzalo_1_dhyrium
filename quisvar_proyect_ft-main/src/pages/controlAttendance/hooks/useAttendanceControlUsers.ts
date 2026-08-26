import { useQuery } from '@tanstack/react-query';
import { attendanceControlService } from '../services';

const ATTENDANCE_CONTROL_USERS_STALE_TIME = 5 * 60 * 1000;

export const attendanceControlUsersQueryKey = [
  'attendance-control-users',
] as const;

type UseAttendanceControlUsersOptions = {
  enabled?: boolean;
};

function useAttendanceControlUsers({
  enabled = true,
}: UseAttendanceControlUsersOptions = {}) {
  const attendanceControlUsersQuery = useQuery({
    queryKey: attendanceControlUsersQueryKey,
    queryFn: () => attendanceControlService.getUsers(),
    enabled,
    staleTime: ATTENDANCE_CONTROL_USERS_STALE_TIME,
  });

  return attendanceControlUsersQuery;
}

export default useAttendanceControlUsers;

import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../services';

export const currentAttendanceQueryKey = [
  'attendance',
  'current-user',
] as const;

const useCurrentAttendance = () =>
  useQuery({
    queryKey: currentAttendanceQueryKey,
    queryFn: () => attendanceService.getCurrentAttendance(),
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
  });

export default useCurrentAttendance;

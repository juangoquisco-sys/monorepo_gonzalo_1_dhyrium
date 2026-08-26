import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../services';

export const pendingAttendanceQueryKey = ['attendance', 'pending'] as const;

const usePendingAttendance = () =>
  useQuery({
    queryKey: pendingAttendanceQueryKey,
    queryFn: () => attendanceService.getPendingAttendance(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

export default usePendingAttendance;

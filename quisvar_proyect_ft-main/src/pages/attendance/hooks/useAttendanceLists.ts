import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../services';

export const attendanceListsQueryKey = (date: string) =>
  ['attendance', 'lists', date] as const;

const useAttendanceLists = (date: string) =>
  useQuery({
    queryKey: attendanceListsQueryKey(date),
    queryFn: () => attendanceService.getLists(date),
    staleTime: 0,
    refetchOnMount: 'always',
  });

export default useAttendanceLists;

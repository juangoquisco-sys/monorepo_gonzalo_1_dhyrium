import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { fetchListTask } from '../services/myTasks.service';
import type { PaginationTable } from '@/types/types';
import type { RootState } from '@/store/store.types';

const useProjectTasks = <T,>(
  type: 'evaluator' | 'technical',
  userId?: number
) => {
  const userSession = useSelector((state: RootState) => state.userSession);
  const [searchParams, setSearchParams] = useSearchParams({
    limit: '50',
    page: '0',
  });

  const projectTasksQuery = useQuery({
    queryKey: ['projectTasks', searchParams.toString(), type],
    queryFn: () =>
      fetchListTask<T>(userId || userSession.id, searchParams, type),
  });
  const getProjectTaskPagination = async ({
    pageIndex,
    pageSize,
  }: PaginationTable) => {
    searchParams.set('page', String(pageIndex));
    searchParams.set('limit', String(pageSize));
    setSearchParams(searchParams);
  };

  return {
    projectTasksQuery,
    getProjectTaskPagination,
  };
};

export default useProjectTasks;

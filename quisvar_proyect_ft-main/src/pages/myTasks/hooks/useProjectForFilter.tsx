import { useQuery } from '@tanstack/react-query';
import { fetchProjectsForFilter } from '../services/myTasks.service';

const useProjectForFilter = () => {
  const projectForFilterQuery = useQuery({
    queryKey: ['projectForFilter'],
    queryFn: fetchProjectsForFilter,
  });
  return { projectForFilterQuery };
};

export default useProjectForFilter;

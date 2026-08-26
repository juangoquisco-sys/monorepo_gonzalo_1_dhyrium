import { useQuery } from '@tanstack/react-query';
import type { SystemSocketUsersFilters } from './systemSocketUsers.models';
import { getSystemSocketUsers } from './systemSocketUsers.service';

export const systemSocketUsersKeys = {
  all: ['system-socket-users'] as const,
  list: (filters: SystemSocketUsersFilters) =>
    [...systemSocketUsersKeys.all, filters] as const,
};

export const useSystemSocketUsers = (filters: SystemSocketUsersFilters) =>
  useQuery({
    queryKey: systemSocketUsersKeys.list(filters),
    queryFn: () => getSystemSocketUsers(filters),
    refetchInterval: 60000,
  });

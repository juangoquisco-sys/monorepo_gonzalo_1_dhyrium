import { useQuery } from '@tanstack/react-query';
import { getSystemHealth } from './systemHealth.service';

export const systemHealthKeys = {
  all: ['system-health'] as const,
};

export const useSystemHealth = () =>
  useQuery({
    queryKey: systemHealthKeys.all,
    queryFn: getSystemHealth,
    refetchInterval: 30000,
  });

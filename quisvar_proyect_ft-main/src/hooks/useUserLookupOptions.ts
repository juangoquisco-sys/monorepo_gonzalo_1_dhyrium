import { useQuery } from '@tanstack/react-query';
import { userLookupOptionsService } from '@/services/userLookupOptions.service';

const USER_LOOKUP_STALE_TIME = 5 * 60 * 1000;

type UseUserLookupOptions = {
  enabled?: boolean;
};

type UserLookupQueryFn = () => ReturnType<
  typeof userLookupOptionsService.getAuditUsers
>;

const makeUserLookupHook =
  <TKey extends readonly unknown[]>(
    queryKey: TKey,
    queryFn: UserLookupQueryFn
  ) =>
  ({ enabled = true }: UseUserLookupOptions = {}) =>
    useQuery({
      queryKey,
      queryFn,
      enabled,
      staleTime: USER_LOOKUP_STALE_TIME,
    });

export const useAuditLogUsers = makeUserLookupHook(
  ['audit-log-users'] as const,
  userLookupOptionsService.getAuditUsers
);

export const useFrontendLogUsers = makeUserLookupHook(
  ['frontend-log-users'] as const,
  userLookupOptionsService.getFrontendLogUsers
);

export const useCompanyUsers = makeUserLookupHook(
  ['company-users'] as const,
  userLookupOptionsService.getCompanyUsers
);

export const useGroupUsers = makeUserLookupHook(
  ['group-users'] as const,
  userLookupOptionsService.getGroupUsers
);

export const useOfficeUsers = makeUserLookupHook(
  ['office-users'] as const,
  userLookupOptionsService.getOfficeUsers
);

export const useProjectUsers = makeUserLookupHook(
  ['project-users'] as const,
  userLookupOptionsService.getProjectUsers
);

export const useProjectModeratorUsers = makeUserLookupHook(
  ['project-moderator-users'] as const,
  userLookupOptionsService.getProjectModeratorUsers
);

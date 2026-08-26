import { useQuery } from '@tanstack/react-query';
import { UserCenterService } from '../userCenter.service';

const USER_CENTER_USERS_STALE_TIME = 5 * 60 * 1000;

export const userCenterUsersQueryKey = ['user-center-users'] as const;

function useUserCenterUsers() {
  return useQuery({
    queryKey: userCenterUsersQueryKey,
    queryFn: () => UserCenterService.getUsers(),
    staleTime: USER_CENTER_USERS_STALE_TIME,
  });
}

export default useUserCenterUsers;

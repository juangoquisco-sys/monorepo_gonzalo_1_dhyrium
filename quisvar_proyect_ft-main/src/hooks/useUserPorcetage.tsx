import { useMemo } from 'react';
import type { Users } from '@/types/types';

const useUserPorcetage = (users: Users[]) => {
  const usersData = useMemo(
    () =>
      users.map(user => ({
        id: user.user.id,
        name: `${user.user.profile.firstName} ${user.user.profile.lastName}`,
        percentage: user.percentage,
        status: user.status,
      })),
    [users]
  );

  return { usersData };
};
export default useUserPorcetage;

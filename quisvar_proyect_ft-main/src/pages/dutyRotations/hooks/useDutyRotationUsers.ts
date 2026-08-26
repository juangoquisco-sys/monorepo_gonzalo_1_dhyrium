import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dutyRotationQueryKeys } from '../dutyRotations.queries';
import { getDutyRotationUsers } from '../services/dutyRotations.service';

const useDutyRotationUsers = () => {
  const usersQuery = useQuery({
    queryKey: dutyRotationQueryKeys.users,
    queryFn: getDutyRotationUsers,
  });
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const activeUsers = useMemo(
    () => users.filter(user => user.status === true),
    [users]
  );

  return { usersQuery, users, activeUsers };
};

export default useDutyRotationUsers;

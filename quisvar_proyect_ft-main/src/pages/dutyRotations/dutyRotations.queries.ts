import type { QueryClient } from '@tanstack/react-query';

export const dutyRotationQueryKeys = {
  duties: ['duty-rotations', 'contract-v3', 'duties'],
  myUpcoming: ['duty-rotations', 'contract-v3', 'my-upcoming'],
  myEntitlements: ['duty-rotations', 'contract-v3', 'my-entitlements'],
  assignments: ['duty-rotations', 'contract-v3', 'assignments'],
  openPool: ['duty-rotations', 'contract-v3', 'open-pool'],
  pendingDirectedSwaps: [
    'duty-rotations',
    'contract-v3',
    'pending-directed-swaps',
  ],
  users: ['duty-rotations', 'contract-v3', 'users'],
  roles: ['duty-rotations', 'contract-v3', 'roles'],
  preview: ['duty-rotations', 'contract-v3', 'preview'],
  eligibleRoster: ['duty-rotations', 'contract-v3', 'eligible-roster'],
  occurrence: ['duty-rotations', 'contract-v3', 'occurrence'],
} as const;

export const refetchDutyRotations = async (queryClient: QueryClient) => {
  await Promise.all([
    queryClient.refetchQueries({
      queryKey: dutyRotationQueryKeys.duties,
      type: 'active',
    }),
    queryClient.refetchQueries({
      queryKey: dutyRotationQueryKeys.myUpcoming,
      type: 'active',
    }),
    queryClient.refetchQueries({
      queryKey: dutyRotationQueryKeys.myEntitlements,
      type: 'active',
    }),
    queryClient.refetchQueries({
      queryKey: dutyRotationQueryKeys.assignments,
      type: 'active',
    }),
    queryClient.refetchQueries({
      queryKey: dutyRotationQueryKeys.openPool,
      type: 'active',
    }),
    queryClient.refetchQueries({
      queryKey: dutyRotationQueryKeys.pendingDirectedSwaps,
      type: 'active',
    }),
  ]);
};

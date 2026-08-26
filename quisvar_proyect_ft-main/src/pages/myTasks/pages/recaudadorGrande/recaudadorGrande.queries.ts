import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLiquidationRequest,
  fetchEligibleStages,
  fetchLiquidationPreview,
  fetchPreLiquidationStages,
  fetchPreLiquidationStageTasks,
  fetchUnamortizedAdvances,
  grantStageConformity,
  reconcileLiquidation,
} from './recaudadorGrande.service';

export const recaudadorGrandeKeys = {
  all: ['recaudador-grande'] as const,
  preLiquidation: () =>
    [...recaudadorGrandeKeys.all, 'pre-liquidation'] as const,
  stages: (filters: { projectId?: number; stageId?: number }) =>
    [...recaudadorGrandeKeys.preLiquidation(), 'stages', filters] as const,
  stageTasks: (stageId: number | null) =>
    [...recaudadorGrandeKeys.preLiquidation(), 'stage-tasks', stageId] as const,
  eligibleStages: () =>
    [...recaudadorGrandeKeys.all, 'eligible-stages'] as const,
  preview: (stageId: number | null) =>
    [...recaudadorGrandeKeys.all, 'preview', stageId] as const,
  advances: (userId: number) =>
    [...recaudadorGrandeKeys.all, 'unamortized-advances', userId] as const,
};

export const usePreLiquidationStages = (
  filters: { projectId?: number; stageId?: number } = {}
) =>
  useQuery({
    queryKey: recaudadorGrandeKeys.stages(filters),
    queryFn: ({ signal }) => fetchPreLiquidationStages(filters, signal),
  });

export const usePreLiquidationStageTasks = (stageId: number | null) =>
  useQuery({
    queryKey: recaudadorGrandeKeys.stageTasks(stageId),
    queryFn: ({ signal }) =>
      fetchPreLiquidationStageTasks(stageId as number, signal),
    enabled: stageId !== null,
  });

export const useGrantStageConformity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: grantStageConformity,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: recaudadorGrandeKeys.preLiquidation(),
        }),
        queryClient.invalidateQueries({
          queryKey: recaudadorGrandeKeys.eligibleStages(),
        }),
      ]);
    },
  });
};

export const useEligibleLiquidationStages = () =>
  useQuery({
    queryKey: recaudadorGrandeKeys.eligibleStages(),
    queryFn: ({ signal }) => fetchEligibleStages(signal),
  });

export const useLiquidationPreview = (stageId: number | null) =>
  useQuery({
    queryKey: recaudadorGrandeKeys.preview(stageId),
    queryFn: ({ signal }) => fetchLiquidationPreview(stageId as number, signal),
    enabled: stageId !== null,
  });

export const useCreateLiquidationRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLiquidationRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: recaudadorGrandeKeys.all,
      });
    },
  });
};

export const useUnamortizedAdvances = (userId: number, enabled: boolean) =>
  useQuery({
    queryKey: recaudadorGrandeKeys.advances(userId),
    queryFn: ({ signal }) => fetchUnamortizedAdvances(userId, signal),
    enabled: enabled && userId > 0,
  });

export const useReconcileLiquidation = (payrollId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reconcileLiquidation,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['payroll', payrollId] }),
        queryClient.invalidateQueries({ queryKey: recaudadorGrandeKeys.all }),
      ]);
    },
  });
};

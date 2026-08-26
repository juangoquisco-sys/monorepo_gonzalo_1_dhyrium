import { axiosInstance } from '@/services/axiosInstance';
import type {
  CreateLiquidationRequestPayload,
  CreateLiquidationRequestResponse,
  LiquidationEligibleStage,
  LiquidationScopeResolution,
  PreLiquidationStage,
  PreLiquidationStageTasksResponse,
  ReconcileLiquidationPayload,
  UnamortizedAdvance,
} from './recaudadorGrande.types';

export const RECAUDADOR_GRANDE_ENDPOINTS = {
  preLiquidationStages: '/liquidations/pre-stages',
  eligibleStages: '/liquidations/eligible-stages',
  createRequest: '/liquidations/create-request',
  stageTasks: (stageId: number) => `/liquidations/pre-stages/${stageId}/tasks`,
  grantConformity: (stageId: number) =>
    `/liquidations/pre-stages/${stageId}/grant-conformity`,
  preview: (stageId: number) => `/liquidations/preview/${stageId}`,
  unamortizedAdvances: (userId: number) =>
    `/liquidations/unamortized-advances/${userId}`,
  reconcile: (payrollId: number) =>
    `/payrolls/${payrollId}/reconcile-liquidation`,
} as const;

interface PreLiquidationFilters {
  projectId?: number;
  stageId?: number;
}

export const fetchPreLiquidationStages = async (
  filters: PreLiquidationFilters = {},
  signal?: AbortSignal
) => {
  const { data } = await axiosInstance.get<PreLiquidationStage[]>(
    RECAUDADOR_GRANDE_ENDPOINTS.preLiquidationStages,
    { params: filters, signal, headers: { noLoader: true } }
  );
  return data;
};

export const fetchPreLiquidationStageTasks = async (
  stageId: number,
  signal?: AbortSignal
) => {
  const { data } = await axiosInstance.get<PreLiquidationStageTasksResponse>(
    RECAUDADOR_GRANDE_ENDPOINTS.stageTasks(stageId),
    { signal, headers: { noLoader: true } }
  );
  return data;
};

export const grantStageConformity = async (stageId: number) => {
  const { data } = await axiosInstance.post(
    RECAUDADOR_GRANDE_ENDPOINTS.grantConformity(stageId)
  );
  return data;
};

export const fetchEligibleStages = async (signal?: AbortSignal) => {
  const { data } = await axiosInstance.get<LiquidationEligibleStage[]>(
    RECAUDADOR_GRANDE_ENDPOINTS.eligibleStages,
    { signal, headers: { noLoader: true } }
  );
  return data;
};

export const fetchLiquidationPreview = async (
  stageId: number,
  signal?: AbortSignal
) => {
  const { data } = await axiosInstance.get<LiquidationScopeResolution>(
    RECAUDADOR_GRANDE_ENDPOINTS.preview(stageId),
    { signal, headers: { noLoader: true } }
  );
  return data;
};

export const createLiquidationRequest = async ({
  stageId,
  title,
  header,
  description,
  mainProcedure,
  attachments,
}: CreateLiquidationRequestPayload) => {
  const formData = new FormData();
  formData.append(
    'data',
    JSON.stringify({ stageId, title, header, description })
  );
  formData.append('mainProcedure', mainProcedure, `${title}.pdf`);
  attachments.forEach(file => formData.append('fileMail', file));

  const { data } = await axiosInstance.post<CreateLiquidationRequestResponse>(
    RECAUDADOR_GRANDE_ENDPOINTS.createRequest,
    formData
  );
  return data;
};

export const fetchUnamortizedAdvances = async (
  userId: number,
  signal?: AbortSignal
) => {
  const { data } = await axiosInstance.get<UnamortizedAdvance[]>(
    RECAUDADOR_GRANDE_ENDPOINTS.unamortizedAdvances(userId),
    { signal, headers: { noLoader: true } }
  );
  return data;
};

export const reconcileLiquidation = async ({
  payrollId,
  liquidationReportId,
  advanceReportIds,
}: ReconcileLiquidationPayload) => {
  const { data } = await axiosInstance.post(
    RECAUDADOR_GRANDE_ENDPOINTS.reconcile(payrollId),
    { liquidationReportId, advanceReportIds }
  );
  return data;
};

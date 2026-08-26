export type PreLiquidationStageStatus =
  | 'IN_PROGRESS'
  | 'READY_FOR_CONFORMITY'
  | 'CONFORMITY_GRANTED';

export type LiquidationScopeType = 'STAGE' | 'APPROVED_SPECIALTY';

export interface RecaudadorProjectOption {
  id: number;
  name: string;
  stages: Array<{ id: number; name: string }>;
}

export interface PreLiquidationStage {
  id: number;
  name: string;
  updatedAt: string;
  project: {
    id: number;
    name: string;
    contract: { cui: string | null };
  };
  totalTasks: number;
  reviewedTasks: number;
  doneTasks: number;
  pendingTasks: number;
  stageStatus: PreLiquidationStageStatus;
  canGrantConformity: boolean;
  isEligibleForLiquidation: boolean;
}

export interface PreLiquidationTask {
  id: number;
  name: string;
  item: string | null;
  status: string;
  updatedAt: string;
  reviewedAt: string;
  days: number;
  price: number;
  levelId: number;
  stageId: number;
  participationPercentage: number;
  assignedAt: string | null;
  finishedAt: string | null;
}

export interface PreLiquidationStageTasksResponse {
  stage: {
    id: number;
    name: string;
    projectId: number;
    projectName: string;
    cui: string | null;
  };
  summary: {
    totalTasks: number;
    reviewedTasks: number;
    doneTasks: number;
    pendingTasks: number;
    stageStatus: PreLiquidationStageStatus;
    canGrantConformity: boolean;
    isEligibleForLiquidation: boolean;
  };
  tasks: PreLiquidationTask[];
}

export interface LiquidationEligibleStage {
  id: number;
  name: string;
  updatedAt: string;
  eligibleLevelCount: number;
  project: {
    id: number;
    name: string | null;
    contract: { cui: string };
  };
}

export interface LiquidationScopeItem {
  subTaskId: number;
  stageId: number;
  levelId: number;
  taskName: string;
  item: string | null;
  finishedAt: string | null;
  sourceSubTaskOnUserIds: number[];
  participationPercentage: number;
  taskBaseAmount: number;
  userGrossAmount: number;
}

export interface LiquidationScopeSnapshot {
  scopeType?: LiquidationScopeType;
  stageId?: number;
  stageName?: string;
  projectId?: number;
  projectName?: string | null;
  cui?: string | null;
  generatedAt?: string;
  grossAmount?: number;
  items?: LiquidationScopeItem[];
}

export interface LiquidationScopeResolution {
  scopeType: LiquidationScopeType;
  scopeRefId: number;
  userId: number;
  grossAmount: number;
  items: LiquidationScopeItem[];
  snapshot: LiquidationScopeSnapshot;
}

export interface CreateLiquidationRequestPayload {
  stageId: number;
  title: string;
  header: string;
  description: string;
  mainProcedure: Blob;
  attachments: File[];
}

export interface CreateLiquidationRequestResponse {
  report: { id: number; name: string };
  paymessage: { id: number };
  preview: LiquidationScopeResolution;
}

export interface UnamortizedAdvance {
  id: number;
  name: string;
  price: number;
  subprice: number;
  percentage: number;
  initialDate: string;
  untilDate: string;
  createdAt: string;
  paymessage: { id: number; status: string } | null;
}

export interface ReconcileLiquidationPayload {
  payrollId: number;
  liquidationReportId: number;
  advanceReportIds: number[];
}

export type RankingPeriodStatus = 'OPEN' | 'CLOSED';

export interface RankingPeriod {
  id: string;
  type: 'MONTHLY';
  periodStart: string;
  periodEnd: string;
  status: RankingPeriodStatus;
  closedAt: string | null;
  closedById: number | null;
}

export interface RankingConfig {
  id: string | null;
  topN: number;
  periodType: 'MONTHLY';
  minWeightDaysToQualify: number;
  excludedRoleIds: number[];
  excludedUserIds: number[];
  rankingEligibleUnitIds: string[];
}

export interface RankingEntryLine {
  id: string;
  sourceType: 'SUB_TASK' | 'BASIC_TASK' | 'NON_TASK_ACTIVITY';
  sourceId: string;
  sourceLabel: string;
  weightDays: number;
  approvalPct: number;
  contribution: number;
}

export interface RankingEntryUser {
  id: number;
  profile: { firstName: string; lastName: string } | null;
}

export interface RankingEntry {
  id: string;
  userId: number;
  unitId: string | null;
  score: number;
  totalWeightDays: number;
  avgApprovalPct: number;
  position: number;
  qualified: boolean;
  user?: RankingEntryUser;
  lines?: RankingEntryLine[];
}

export interface RankingOfficeEntry {
  id: string;
  unitId: string;
  totalScore: number;
  memberCount: number;
  scorePerMember: number;
  position: number;
}

export type NonTaskActivityStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface NonTaskActivity {
  id: string;
  userId: number;
  type: string;
  description: string | null;
  proposedDays: number;
  approvedDays: number | null;
  status: NonTaskActivityStatus;
  reviewedById: number | null;
  reviewedAt: string | null;
  periodDate: string;
  createdAt: string;
  user?: RankingEntryUser;
}

export interface RankingConfigUpdatePayload {
  topN?: number;
  minWeightDaysToQualify?: number;
  excludedRoleIds?: number[];
  excludedUserIds?: number[];
  rankingEligibleUnitIds?: string[];
}

export interface NonTaskActivityCreatePayload {
  type: string;
  description?: string;
  proposedDays: number;
  periodDate: string;
}

export interface NonTaskActivityReviewPayload {
  status: 'APPROVED' | 'REJECTED';
  approvedDays?: number;
}

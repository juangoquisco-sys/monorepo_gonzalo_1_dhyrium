import { axiosInstance } from '@/services/axiosInstance';
import type {
  NonTaskActivity,
  NonTaskActivityCreatePayload,
  NonTaskActivityReviewPayload,
  RankingConfig,
  RankingConfigUpdatePayload,
  RankingEntry,
  RankingOfficeEntry,
  RankingPeriod,
} from './types';

export const productivityRankingsService = {
  async getConfig(): Promise<RankingConfig> {
    const { data } = await axiosInstance.get<{ config: RankingConfig }>(
      '/productivity-rankings/config',
      { headers: { noLoader: true } }
    );
    return data.config;
  },

  async updateConfig(payload: RankingConfigUpdatePayload): Promise<RankingConfig> {
    const { data } = await axiosInstance.patch<{ config: RankingConfig }>(
      '/productivity-rankings/config',
      payload
    );
    return data.config;
  },

  async listPeriods(): Promise<RankingPeriod[]> {
    const { data } = await axiosInstance.get<{ periods: RankingPeriod[] }>(
      '/productivity-rankings/periods',
      { headers: { noLoader: true } }
    );
    return data.periods;
  },

  async createPeriod(periodStart: string, periodEnd: string): Promise<RankingPeriod> {
    const { data } = await axiosInstance.post<{ period: RankingPeriod }>(
      '/productivity-rankings/periods',
      { periodStart, periodEnd }
    );
    return data.period;
  },

  async closePeriod(periodId: string): Promise<RankingPeriod> {
    const { data } = await axiosInstance.post<{ period: RankingPeriod }>(
      `/productivity-rankings/periods/${periodId}/close`
    );
    return data.period;
  },

  async getTop(
    periodId?: string
  ): Promise<{ period: RankingPeriod | null; entries: RankingEntry[] }> {
    const { data } = await axiosInstance.get<{
      period: RankingPeriod | null;
      entries: RankingEntry[];
    }>('/productivity-rankings/top', {
      params: periodId ? { periodId } : undefined,
      headers: { noLoader: true },
    });
    return data;
  },

  async getOfficeTop(
    periodId?: string
  ): Promise<{ period: RankingPeriod | null; entries: RankingOfficeEntry[] }> {
    const { data } = await axiosInstance.get<{
      period: RankingPeriod | null;
      entries: RankingOfficeEntry[];
    }>('/productivity-rankings/offices/top', {
      params: periodId ? { periodId } : undefined,
      headers: { noLoader: true },
    });
    return data;
  },

  async getMe(
    periodId?: string
  ): Promise<{ period: RankingPeriod | null; entry: RankingEntry | null }> {
    const { data } = await axiosInstance.get<{
      period: RankingPeriod | null;
      entry: RankingEntry | null;
    }>('/productivity-rankings/me', {
      params: periodId ? { periodId } : undefined,
      headers: { noLoader: true },
    });
    return data;
  },

  async getEntry(
    userId: number,
    periodId?: string
  ): Promise<{ period: RankingPeriod | null; entry: RankingEntry | null }> {
    const { data } = await axiosInstance.get<{
      period: RankingPeriod | null;
      entry: RankingEntry | null;
    }>(`/productivity-rankings/entries/${userId}`, {
      params: periodId ? { periodId } : undefined,
      headers: { noLoader: true },
    });
    return data;
  },

  async listAllEntries(
    periodId?: string
  ): Promise<{ period: RankingPeriod | null; entries: RankingEntry[] }> {
    const { data } = await axiosInstance.get<{
      period: RankingPeriod | null;
      entries: RankingEntry[];
    }>('/productivity-rankings/entries', {
      params: periodId ? { periodId } : undefined,
      headers: { noLoader: true },
    });
    return data;
  },

  async createNonTaskActivity(
    payload: NonTaskActivityCreatePayload
  ): Promise<NonTaskActivity> {
    const { data } = await axiosInstance.post<{ activity: NonTaskActivity }>(
      '/productivity-rankings/non-task-activities',
      payload
    );
    return data.activity;
  },

  async listMyNonTaskActivities(): Promise<NonTaskActivity[]> {
    const { data } = await axiosInstance.get<{ activities: NonTaskActivity[] }>(
      '/productivity-rankings/non-task-activities/me',
      { headers: { noLoader: true } }
    );
    return data.activities;
  },

  async listPendingNonTaskActivities(): Promise<NonTaskActivity[]> {
    const { data } = await axiosInstance.get<{ activities: NonTaskActivity[] }>(
      '/productivity-rankings/non-task-activities/pending',
      { headers: { noLoader: true } }
    );
    return data.activities;
  },

  async reviewNonTaskActivity(
    activityId: string,
    payload: NonTaskActivityReviewPayload
  ): Promise<NonTaskActivity> {
    const { data } = await axiosInstance.patch<{ activity: NonTaskActivity }>(
      `/productivity-rankings/non-task-activities/${activityId}/review`,
      payload
    );
    return data.activity;
  },
};

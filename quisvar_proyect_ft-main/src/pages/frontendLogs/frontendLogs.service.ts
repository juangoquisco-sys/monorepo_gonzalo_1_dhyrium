import { axiosInstance } from '@/services/axiosInstance';
import type {
  FrontendLogEventDetail,
  FrontendLogEventsResponse,
  FrontendLogFilters,
  FrontendLogSummary,
} from './models';

const noLoaderHeaders = { headers: { noLoader: true } };

const cleanParams = (filters: FrontendLogFilters) =>
  Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(',') : value,
      ])
      .filter(([, value]) => {
        if (value === undefined || value === null || value === '') return false;
        return value !== 'all';
      })
  );

export const getFrontendLogEvents = async (filters: FrontendLogFilters) => {
  const res = await axiosInstance.get<FrontendLogEventsResponse>(
    '/system/frontend-logs/events',
    {
      params: cleanParams(filters),
      ...noLoaderHeaders,
    }
  );
  return res.data;
};

export const getFrontendLogEventById = async (id: number) => {
  const res = await axiosInstance.get<FrontendLogEventDetail>(
    `/system/frontend-logs/events/${id}`,
    noLoaderHeaders
  );
  return res.data;
};

export const getFrontendLogSummary = async (filters: FrontendLogFilters) => {
  const res = await axiosInstance.get<FrontendLogSummary>(
    '/system/frontend-logs/stats/summary',
    {
      params: cleanParams(filters),
      ...noLoaderHeaders,
    }
  );
  return res.data;
};

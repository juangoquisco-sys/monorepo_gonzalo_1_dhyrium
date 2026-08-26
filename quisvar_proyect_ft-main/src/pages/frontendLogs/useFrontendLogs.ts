import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { FrontendLogFilters } from './models';
import {
  getFrontendLogEventById,
  getFrontendLogEvents,
  getFrontendLogSummary,
} from './frontendLogs.service';

export const frontendLogsKeys = {
  all: ['frontend-logs'] as const,
  events: (filters: FrontendLogFilters) =>
    [...frontendLogsKeys.all, 'events', filters] as const,
  event: (id: number | null) => [...frontendLogsKeys.all, 'event', id] as const,
  summary: (filters: FrontendLogFilters) =>
    [...frontendLogsKeys.all, 'summary', filters] as const,
};

export const useFrontendLogSummary = (filters: FrontendLogFilters) =>
  useQuery({
    queryKey: frontendLogsKeys.summary(filters),
    queryFn: () => getFrontendLogSummary(filters),
    placeholderData: keepPreviousData,
  });

export const useFrontendLogEvents = (filters: FrontendLogFilters) =>
  useQuery({
    queryKey: frontendLogsKeys.events(filters),
    queryFn: () => getFrontendLogEvents(filters),
    placeholderData: keepPreviousData,
  });

export const useFrontendLogEvent = (id: number | null) =>
  useQuery({
    queryKey: frontendLogsKeys.event(id),
    queryFn: () => getFrontendLogEventById(id as number),
    enabled: Boolean(id),
  });

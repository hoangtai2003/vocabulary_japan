import type { CalendarStats, StatsOverview, WeeklyStats } from '@/types/api';
import { apiClient } from './client';

export const DEFAULT_WEEKS = 8;

export const statsApi = {
  overview: (signal?: AbortSignal) =>
    apiClient.get<StatsOverview>('/stats/overview', undefined, signal),

  weekly: (weeks: number = DEFAULT_WEEKS, signal?: AbortSignal) =>
    apiClient.get<WeeklyStats>('/stats/weekly', { weeks }, signal),

  /** from, to dạng YYYY-MM-DD, tính cả hai đầu. */
  calendar: (from: string, to: string, signal?: AbortSignal) =>
    apiClient.get<CalendarStats>('/stats/calendar', { from, to }, signal),
};

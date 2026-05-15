import { queryOptions, useQuery } from "@tanstack/react-query";

import type { ScheduleItemOut } from "#/shared/api";
import { scheduleApi } from "#/shared/api";

export const scheduleKeys = {
  weekCurrent: ["schedule", "week", "current"] as const,
  day: (offset: number) => ["schedule", "day", offset] as const,
};

export const weekCurrentQueryOptions = queryOptions({
  queryKey: scheduleKeys.weekCurrent,
  queryFn: () => scheduleApi.getWeek(),
  staleTime: 60_000,
});

export const dayQueryOptions = (offset: number) =>
  queryOptions<ScheduleItemOut[]>({
    queryKey: scheduleKeys.day(offset),
    queryFn: () => scheduleApi.getDay(offset),
    staleTime: 60_000,
  });

export const useScheduleWeek = () => useQuery(weekCurrentQueryOptions);

export const useScheduleDay = (offset: number) => useQuery(dayQueryOptions(offset));

import { apiClient } from "./client";
import type { ScheduleDayOut, ScheduleItemOut } from "./types";

export const scheduleApi = {
  getDay: (offset = 0) =>
    apiClient.get<ScheduleItemOut[]>(`/api/schedule?offset=${offset}`),
  getWeek: () => apiClient.get<ScheduleDayOut[]>("/api/schedule/week/current"),
};

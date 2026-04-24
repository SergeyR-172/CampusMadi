import { apiClient } from "./client";
import type {
  AdminScheduleItemOut,
  GroupCreate,
  GroupOut,
  GroupUpdate,
  ScheduleItemCreate,
  ScheduleItemUpdate,
  UserCreate,
  UserOut,
  UserUpdate,
} from "./types";

export const adminApi = {
  users: {
    list: () => apiClient.get<UserOut[]>("/api/admin/users"),
    get: (id: number) => apiClient.get<UserOut>(`/api/admin/users/${id}`),
    create: (data: UserCreate) => apiClient.post<UserOut>("/api/admin/users", data),
    update: (id: number, data: UserUpdate) =>
      apiClient.patch<UserOut>(`/api/admin/users/${id}`, data),
    delete: (id: number) => apiClient.delete<void>(`/api/admin/users/${id}`),
  },

  groups: {
    list: () => apiClient.get<GroupOut[]>("/api/admin/groups"),
    get: (id: number) => apiClient.get<GroupOut>(`/api/admin/groups/${id}`),
    create: (data: GroupCreate) => apiClient.post<GroupOut>("/api/admin/groups", data),
    update: (id: number, data: GroupUpdate) =>
      apiClient.patch<GroupOut>(`/api/admin/groups/${id}`, data),
    delete: (id: number) => apiClient.delete<void>(`/api/admin/groups/${id}`),
    schedule: (id: number) =>
      apiClient.get<AdminScheduleItemOut[]>(`/api/admin/groups/${id}/schedule`),
  },

  teachers: {
    list: () => apiClient.get<UserOut[]>("/api/admin/teachers"),
  },

  schedule: {
    list: () => apiClient.get<AdminScheduleItemOut[]>("/api/admin/schedule"),
    get: (id: number) =>
      apiClient.get<AdminScheduleItemOut>(`/api/admin/schedule/${id}`),
    create: (data: ScheduleItemCreate) =>
      apiClient.post<AdminScheduleItemOut>("/api/admin/schedule", data),
    update: (id: number, data: ScheduleItemUpdate) =>
      apiClient.patch<AdminScheduleItemOut>(`/api/admin/schedule/${id}`, data),
    delete: (id: number) => apiClient.delete<void>(`/api/admin/schedule/${id}`),
  },
};

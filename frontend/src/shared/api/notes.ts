import { apiClient } from "./client";
import type { NoteCreate, NoteOut, NoteUpdate } from "./types";

export const notesApi = {
  list: (scheduleItemId?: number, lessonDate?: string) => {
    const params = new URLSearchParams();
    if (scheduleItemId !== undefined) params.set("schedule_item_id", String(scheduleItemId));
    if (lessonDate !== undefined) params.set("lesson_date", lessonDate);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<NoteOut[]>(`/api/notes${query}`);
  },
  get: (id: number) => apiClient.get<NoteOut>(`/api/notes/${id}`),
  create: (data: NoteCreate) => apiClient.post<NoteOut>("/api/notes", data),
  update: (id: number, data: NoteUpdate) =>
    apiClient.patch<NoteOut>(`/api/notes/${id}`, data),
  delete: (id: number) => apiClient.delete<void>(`/api/notes/${id}`),
};

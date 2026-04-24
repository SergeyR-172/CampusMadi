import { apiClient } from "./client";
import type { NoteCreate, NoteOut, NoteUpdate } from "./types";

export const notesApi = {
  list: (scheduleItemId?: number) => {
    const query = scheduleItemId !== undefined ? `?schedule_item_id=${scheduleItemId}` : "";
    return apiClient.get<NoteOut[]>(`/api/notes${query}`);
  },
  get: (id: number) => apiClient.get<NoteOut>(`/api/notes/${id}`),
  create: (data: NoteCreate) => apiClient.post<NoteOut>("/api/notes", data),
  update: (id: number, data: NoteUpdate) =>
    apiClient.patch<NoteOut>(`/api/notes/${id}`, data),
  delete: (id: number) => apiClient.delete<void>(`/api/notes/${id}`),
};

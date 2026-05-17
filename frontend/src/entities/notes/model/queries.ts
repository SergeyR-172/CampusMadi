import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { NoteCreate, NoteOut, NoteUpdate } from "#/shared/api";
import { notesApi } from "#/shared/api";

export const notesKeys = {
  list: (scheduleItemId: number, lessonDate: string) =>
    ["notes", "list", scheduleItemId, lessonDate] as const,
};

export const useNotes = (scheduleItemId: number | undefined, lessonDate: string | undefined) =>
  useQuery({
    queryKey: ["notes", "list", scheduleItemId ?? -1, lessonDate ?? ""] as const,
    queryFn: () => notesApi.list(scheduleItemId!, lessonDate!),
    enabled: scheduleItemId !== undefined && lessonDate !== undefined,
    staleTime: 30_000,
    select: (data: NoteOut[]) => data,
  });

const invalidateAfterMutation = (
  qc: ReturnType<typeof useQueryClient>,
  scheduleItemId: number,
  lessonDate: string,
) => {
  void qc.invalidateQueries({ queryKey: notesKeys.list(scheduleItemId, lessonDate) });
  void qc.invalidateQueries({ queryKey: ["schedule"] });
};

export const useCreateNote = (scheduleItemId: number, lessonDate: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NoteCreate) => notesApi.create(data),
    onSuccess: () => invalidateAfterMutation(qc, scheduleItemId, lessonDate),
  });
};

export const useUpdateNote = (scheduleItemId: number, lessonDate: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: NoteUpdate }) => notesApi.update(id, data),
    onSuccess: () => invalidateAfterMutation(qc, scheduleItemId, lessonDate),
  });
};

export const useDeleteNote = (scheduleItemId: number, lessonDate: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notesApi.delete(id),
    onSuccess: () => invalidateAfterMutation(qc, scheduleItemId, lessonDate),
  });
};

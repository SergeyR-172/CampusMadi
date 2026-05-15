import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { NoteCreate, NoteOut, NoteUpdate } from "#/shared/api";
import { notesApi } from "#/shared/api";

export const notesKeys = {
  list: (scheduleItemId: number) => ["notes", "list", scheduleItemId] as const,
};

export const useNotes = (scheduleItemId: number | undefined) =>
  useQuery({
    queryKey: ["notes", "list", scheduleItemId ?? -1] as const,
    queryFn: () => notesApi.list(scheduleItemId!),
    enabled: scheduleItemId !== undefined,
    staleTime: 30_000,
    select: (data: NoteOut[]) => data,
  });

const invalidateAfterMutation = (qc: ReturnType<typeof useQueryClient>, scheduleItemId: number) => {
  void qc.invalidateQueries({ queryKey: notesKeys.list(scheduleItemId) });
  void qc.invalidateQueries({ queryKey: ["schedule"] });
};

export const useCreateNote = (scheduleItemId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NoteCreate) => notesApi.create(data),
    onSuccess: () => invalidateAfterMutation(qc, scheduleItemId),
  });
};

export const useUpdateNote = (scheduleItemId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: NoteUpdate }) => notesApi.update(id, data),
    onSuccess: () => invalidateAfterMutation(qc, scheduleItemId),
  });
};

export const useDeleteNote = (scheduleItemId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notesApi.delete(id),
    onSuccess: () => invalidateAfterMutation(qc, scheduleItemId),
  });
};

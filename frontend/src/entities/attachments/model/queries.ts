import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { attachmentsApi } from "#/shared/api";

export const attachmentsKeys = {
  list: (scheduleItemId: number, lessonDate: string) =>
    ["attachments", "list", scheduleItemId, lessonDate] as const,
};

export const useAttachments = (
  scheduleItemId: number | undefined,
  lessonDate: string | undefined,
) =>
  useQuery({
    queryKey: ["attachments", "list", scheduleItemId ?? -1, lessonDate ?? ""] as const,
    queryFn: () => attachmentsApi.list(scheduleItemId!, lessonDate!),
    enabled: scheduleItemId !== undefined && lessonDate !== undefined,
    staleTime: 30_000,
  });

export const useUploadAttachment = (scheduleItemId: number, lessonDate: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => attachmentsApi.upload(scheduleItemId, lessonDate, file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: attachmentsKeys.list(scheduleItemId, lessonDate) });
    },
  });
};

export const useDeleteAttachment = (scheduleItemId: number, lessonDate: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => attachmentsApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: attachmentsKeys.list(scheduleItemId, lessonDate) });
    },
  });
};

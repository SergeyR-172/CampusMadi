import { config } from "#/shared/config";

import { ApiError } from "./client";
import type { AttachmentOut } from "./types";

const parseDetail = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { detail?: unknown };
    const detail = body.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const msgs = detail
        .map((d) =>
          d && typeof d === "object" && "msg" in d ? (d as { msg?: unknown }).msg : null,
        )
        .filter((m): m is string => typeof m === "string");
      if (msgs.length > 0) return msgs.join("; ");
    }
  } catch {
    // ignore
  }
  return `HTTP ${response.status}`;
};

export const attachmentsApi = {
  list: async (scheduleItemId: number, lessonDate: string): Promise<AttachmentOut[]> => {
    const params = new URLSearchParams({
      schedule_item_id: String(scheduleItemId),
      lesson_date: lessonDate,
    });
    const res = await fetch(`${config.baseUrl}/api/attachments?${params.toString()}`, {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) throw new ApiError(res.status, await parseDetail(res));
    return (await res.json()) as AttachmentOut[];
  },

  upload: async (
    scheduleItemId: number,
    lessonDate: string,
    file: File,
  ): Promise<AttachmentOut> => {
    const form = new FormData();
    form.append("schedule_item_id", String(scheduleItemId));
    form.append("lesson_date", lessonDate);
    form.append("file", file);
    const res = await fetch(`${config.baseUrl}/api/attachments`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!res.ok) throw new ApiError(res.status, await parseDetail(res));
    return (await res.json()) as AttachmentOut;
  },

  delete: async (attachmentId: number): Promise<void> => {
    const res = await fetch(`${config.baseUrl}/api/attachments/${attachmentId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new ApiError(res.status, await parseDetail(res));
  },

  downloadUrl: (attachmentId: number): string =>
    `${config.baseUrl}/api/attachments/${attachmentId}/download`,
};

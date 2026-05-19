import { useRef } from "react";

import { Download, Paperclip, Trash2 } from "lucide-react";

import { useAttachments, useDeleteAttachment, useUploadAttachment } from "#/entities/attachments";
import { attachmentsApi, getErrorMessage } from "#/shared/api";
import type { AttachmentOut } from "#/shared/api";

type Props = {
  scheduleItemId: number;
  lessonDate: string;
  canEdit: boolean;
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

const AttachmentRow = ({
  attachment,
  canEdit,
  onDelete,
}: {
  attachment: AttachmentOut;
  canEdit: boolean;
  onDelete: () => void;
}) => (
  <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
    <Paperclip size={15} className="shrink-0 text-gray-text" />
    <a
      href={attachmentsApi.downloadUrl(attachment.id)}
      target="_blank"
      rel="noopener noreferrer"
      className="min-w-0 flex-1 truncate text-foreground hover:underline"
      title={attachment.original_filename}
    >
      {attachment.original_filename}
    </a>
    <span className="shrink-0 text-xs text-gray-text">{formatSize(attachment.size)}</span>
    <a
      href={attachmentsApi.downloadUrl(attachment.id)}
      target="_blank"
      rel="noopener noreferrer"
      title="Скачать"
      className="shrink-0 text-gray-400 transition-colors hover:text-foreground"
    >
      <Download size={15} />
    </a>
    {canEdit && (
      <button
        type="button"
        onClick={onDelete}
        title="Удалить файл"
        className="shrink-0 text-gray-400 transition-colors hover:text-destructive"
      >
        <Trash2 size={15} />
      </button>
    )}
  </div>
);

export const AttachmentsList = ({ scheduleItemId, lessonDate, canEdit }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: attachments = [], isLoading } = useAttachments(scheduleItemId, lessonDate);
  const upload = useUploadAttachment(scheduleItemId, lessonDate);
  const remove = useDeleteAttachment(scheduleItemId, lessonDate);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      try {
        await upload.mutateAsync(file);
      } catch (err) {
        // eslint-disable-next-line no-alert
        alert(
          `Не удалось загрузить ${file.name}: ${getErrorMessage(err, "ошибка загрузки")}`,
        );
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = (att: AttachmentOut) => {
    // eslint-disable-next-line no-alert
    if (!confirm(`Удалить файл "${att.original_filename}"?`)) return;
    remove.mutate(att.id);
  };

  if (!canEdit && attachments.length === 0 && !isLoading) return null;

  return (
    <div className="flex flex-col gap-2">
      {attachments.map((att) => (
        <AttachmentRow
          key={att.id}
          attachment={att}
          canEdit={canEdit}
          onDelete={() => handleDelete(att)}
        />
      ))}

      {canEdit && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={upload.isPending}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-gray-100 disabled:opacity-60"
          >
            <Paperclip size={15} />
            {upload.isPending ? "Загрузка…" : "Прикрепить файл"}
          </button>
        </>
      )}
    </div>
  );
};

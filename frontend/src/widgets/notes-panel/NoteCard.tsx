import { FileText, SquarePen, Trash2 } from "lucide-react";

import type { NoteOut } from "#/shared/api";

import { parseNoteText } from "./noteUtils";

type Props = {
  note: NoteOut;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export const NoteCard = ({ note, canEdit, onEdit, onDelete }: Props) => {
  const { title, body } = parseNoteText(note.text);

  return (
    <div className="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      {canEdit && (
        <button
          type="button"
          title="Редактировать"
          onClick={onEdit}
          className="absolute right-3 top-3 text-gray-400 transition-colors hover:text-foreground"
        >
          <SquarePen size={16} />
        </button>
      )}

      {title && (
        <p className="mb-2 pr-7 text-base font-semibold text-foreground">{title}</p>
      )}

      {body && (
        <div
          className="text-sm text-foreground [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4"
          // Internal content authored by trusted users (teachers/students in closed university system)
          dangerouslySetInnerHTML={{ __html: body }}
        />
      )}

      {/* File attachment stub */}
      <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3 text-sm text-gray-text">
        <FileText size={15} className="shrink-0" />
        <span>Файл</span>
      </div>

      {canEdit && (
        <button
          type="button"
          title="Удалить"
          onClick={onDelete}
          className="absolute bottom-3 right-3 text-gray-400 transition-colors hover:text-destructive"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
};

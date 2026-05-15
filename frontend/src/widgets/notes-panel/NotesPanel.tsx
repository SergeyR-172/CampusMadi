import { useState } from "react";

import { Plus } from "lucide-react";

import { useCreateNote, useDeleteNote, useNotes, useUpdateNote } from "#/entities/notes";
import { useCurrentUser } from "#/entities/user";
import type { NoteOut, ScheduleItemOut, UserRole } from "#/shared/api";

import { NoteCard } from "./NoteCard";
import { NoteEditor } from "./NoteEditor";
import { parseNoteText, serializeNote } from "./noteUtils";

type Props = {
  selectedItem: ScheduleItemOut | null;
  role: UserRole | undefined;
};

type EditorState =
  | { kind: "create-private" }
  | { kind: "create-public" }
  | { kind: "edit"; noteId: number }
  | null;

const SelectPrompt = () => (
  <div className="flex flex-col items-center gap-2 rounded-2xl bg-gray-100 px-6 py-8 text-center text-sm text-gray-text">
    Выберите пару, чтобы увидеть заметки
  </div>
);

const CreateCard = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full flex-col items-center gap-2 rounded-2xl bg-gray-100 px-6 py-6 text-center text-sm font-semibold text-foreground transition-colors hover:bg-gray-200"
  >
    {label}
    <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-brand text-brand">
      <Plus size={22} />
    </span>
  </button>
);

export const NotesPanel = ({ selectedItem, role }: Props) => {
  const isTeacher = role === "teacher";
  const [editorState, setEditorState] = useState<EditorState>(null);

  const { user } = useCurrentUser();
  const scheduleItemId = selectedItem?.id;

  const { data: ownNotes = [] } = useNotes(scheduleItemId);
  const createNote = useCreateNote(scheduleItemId ?? 0);
  const updateNote = useUpdateNote(scheduleItemId ?? 0);
  const deleteNote = useDeleteNote(scheduleItemId ?? 0);

  const handleCreate = async (title: string, body: string, isPrivate: boolean) => {
    if (!scheduleItemId) return;
    await createNote.mutateAsync({
      schedule_item_id: scheduleItemId,
      text: serializeNote(title, body),
      private: isPrivate,
    });
    setEditorState(null);
  };

  const handleUpdate = async (noteId: number, title: string, body: string) => {
    const note = ownNotes.find((n) => n.id === noteId);
    if (!note?.schedule_item_id) return;
    await updateNote.mutateAsync({
      id: noteId,
      data: { text: serializeNote(title, body) },
    });
    setEditorState(null);
  };

  const handleDelete = (note: NoteOut) => {
    deleteNote.mutate(note.id);
    if (editorState?.kind === "edit" && editorState.noteId === note.id) {
      setEditorState(null);
    }
  };

  const canEditNote = (note: NoteOut) => !!user && note.author_id === user.id;

  // Teacher's public materials embedded in the schedule item (used for student view)
  const teacherMaterials = isTeacher
    ? []
    : (selectedItem?.teacher_notes ?? []).filter((n) => !n.private);

  const hasAnyContent = teacherMaterials.length > 0 || ownNotes.length > 0;

  return (
    <aside className="flex h-full w-90 shrink-0 flex-col gap-4 overflow-y-auto rounded-2xl border border-gray-300/60 bg-white p-5 shadow-sm [scrollbar-color:#c5cad1_transparent] [scrollbar-width:thin]">
      <h2
        className="shrink-0 text-2xl font-bold text-foreground"
        style={{ fontFamily: "Roboto, sans-serif" }}
      >
        Заметки
      </h2>

      {!selectedItem ? (
        <SelectPrompt />
      ) : (
        <>
          {/* Teacher's public materials — student view, read-only */}
          {!isTeacher && teacherMaterials.length > 0 && (
            <div className="flex flex-col gap-3">
              {teacherMaterials.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  canEdit={false}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              ))}
            </div>
          )}

          {/* Empty state for students when no teacher materials */}
          {!isTeacher && !hasAnyContent && (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-gray-100 px-6 py-8 text-center">
              <p className="text-sm font-semibold text-foreground">
                Преподаватель пока не оставил материалов
              </p>
            </div>
          )}

          {/* Current user's own notes */}
          {ownNotes.length > 0 && (
            <div className="flex flex-col gap-3">
              {ownNotes.map((note) => {
                const isEditing =
                  editorState?.kind === "edit" && editorState.noteId === note.id;

                if (isEditing) {
                  const { title, body } = parseNoteText(note.text);
                  return (
                    <NoteEditor
                      key={note.id}
                      initialTitle={title}
                      initialBody={body}
                      onSave={(t, b) => handleUpdate(note.id, t, b)}
                      isLoading={updateNote.isPending}
                    />
                  );
                }

                return (
                  <NoteCard
                    key={note.id}
                    note={note}
                    canEdit={canEditNote(note)}
                    onEdit={() => setEditorState({ kind: "edit", noteId: note.id })}
                    onDelete={() => handleDelete(note)}
                  />
                );
              })}
            </div>
          )}

          {/* Create private note — available to everyone */}
          {editorState?.kind === "create-private" ? (
            <NoteEditor
              onSave={(title, body) => handleCreate(title, body, true)}
              isLoading={createNote.isPending}
            />
          ) : (
            <CreateCard
              label="Создать заметку"
              onClick={() => setEditorState({ kind: "create-private" })}
            />
          )}

          {/* Add public material — teacher only */}
          {isTeacher &&
            (editorState?.kind === "create-public" ? (
              <NoteEditor
                onSave={(title, body) => handleCreate(title, body, false)}
                isLoading={createNote.isPending}
              />
            ) : (
              <CreateCard
                label="Добавить материал"
                onClick={() => setEditorState({ kind: "create-public" })}
              />
            ))}
        </>
      )}
    </aside>
  );
};

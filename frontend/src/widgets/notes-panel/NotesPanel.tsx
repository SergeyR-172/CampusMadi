import { Plus, Umbrella } from "lucide-react";

import type { ScheduleItemOut, UserRole } from "#/shared/api";

type Props = {
  selectedItem: ScheduleItemOut | null;
  role: UserRole | undefined;
};

const EmptyState = () => (
  <div className="flex flex-col items-center gap-3 rounded-2xl bg-gray-100 px-6 py-8 text-center">
    <p className="text-sm font-semibold text-foreground">
      Преподаватель пока не оставил материалов
    </p>
    <Umbrella size={56} className="text-gray-text" />
  </div>
);

const SelectPrompt = () => (
  <div className="flex flex-col items-center gap-2 rounded-2xl bg-gray-100 px-6 py-8 text-center text-sm text-gray-text">
    Выберите пару, чтобы увидеть заметки
  </div>
);

export const NotesPanel = ({ selectedItem, role }: Props) => {
  const isTeacher = role === "teacher";

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col gap-5 rounded-2xl border border-gray-300/60 bg-white p-5 shadow-sm">
      <h2
        className="text-2xl font-bold text-foreground"
        style={{ fontFamily: "Roboto, sans-serif" }}
      >
        Заметки
      </h2>

      {!selectedItem ? (
        <SelectPrompt />
      ) : (
        <>
          {!isTeacher && <EmptyState />}

          <button
            type="button"
            disabled
            className="flex flex-col items-center gap-2 rounded-2xl bg-gray-100 px-6 py-8 text-center text-sm font-semibold text-foreground opacity-80"
          >
            {isTeacher ? "Добавить материал" : "Создать заметку"}
            <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-brand text-brand">
              <Plus size={22} />
            </span>
          </button>
        </>
      )}
    </aside>
  );
};

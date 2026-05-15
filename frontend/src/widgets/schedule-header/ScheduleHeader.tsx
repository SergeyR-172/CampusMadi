import { User } from "lucide-react";

import type { UserSchema } from "#/shared/api";

type Props = {
  user: UserSchema | null;
  /** Подзаголовок: для студента — группа, для преподавателя — кафедра/роль. */
  subtitle?: string;
};

export const ScheduleHeader = ({ user, subtitle }: Props) => {
  const displayName = user?.name ?? "Фамилия имя";
  const displaySubtitle =
    subtitle ?? (user?.role === "teacher" ? "Преподаватель" : "Группа");

  return (
    <header className="flex items-center justify-between px-8 pt-6 pb-4">
      <h1
        className="text-4xl font-bold text-foreground"
        style={{ fontFamily: "Roboto, sans-serif" }}
      >
        Расписание
      </h1>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p
            className="text-base font-semibold leading-tight text-foreground"
            style={{ fontFamily: "Roboto, sans-serif" }}
          >
            {displayName}
          </p>
          <p className="text-sm leading-tight text-gray-text">{displaySubtitle}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-500">
          <User size={22} />
        </div>
      </div>
    </header>
  );
};

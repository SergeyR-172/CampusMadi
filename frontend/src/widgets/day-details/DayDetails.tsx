import {
  formatDateDots,
  formatTime,
  getSubjectKind,
  subjectKindColor,
} from "#/entities/schedule";
import type { ScheduleItemOut, UserRole } from "#/shared/api";
import { cn } from "#/shared/lib";
import { BuildingIcon, CalendarIcon, ClockIcon } from "#/shared/ui";

type Props = {
  items: ScheduleItemOut[];
  isLoading: boolean;
  isError: boolean;
  selectedDate: Date;
  selectedItemId: number | null;
  onSelect: (id: number) => void;
  role: UserRole | undefined;
};

const PairCard = ({
  item,
  selectedDate,
  active,
  onClick,
  role,
}: {
  item: ScheduleItemOut;
  selectedDate: Date;
  active: boolean;
  onClick: () => void;
  role: UserRole | undefined;
}) => {
  const kind = getSubjectKind(item.subject);
  const stripeColor = subjectKindColor[kind];
  // Аудитория не приходит с бэка — TODO когда появится поле
  const room = "—";
  const subtitle = role === "teacher" ? item.group_name : item.teacher_name;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full shrink-0 items-stretch overflow-hidden rounded-2xl border-2 bg-white text-left transition-all",
        active
          ? "border-brand shadow-md ring-2 ring-brand/20"
          : "border-transparent hover:border-brand/30",
      )}
    >
      <span
        aria-hidden="true"
        className="w-3 shrink-0"
        style={{ backgroundColor: stripeColor }}
      />
      <div className="flex min-w-0 flex-1 items-center gap-6 px-5 py-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p
            className="truncate text-lg font-semibold text-foreground"
            style={{ fontFamily: "Roboto, sans-serif" }}
            title={item.subject}
          >
            {item.subject}
          </p>
          <p className="truncate text-sm text-gray-text" title={subtitle}>
            {subtitle || "—"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-5 text-sm text-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarIcon size={18} className="text-foreground/80" />
            {formatDateDots(selectedDate)}
          </span>
          <span className="flex items-center gap-1.5">
            <BuildingIcon size={18} className="text-foreground/80" />
            {room}
          </span>
          <span className="flex items-center gap-1.5">
            <ClockIcon size={18} className="text-foreground/80" />
            {formatTime(item.start_time)}
          </span>
        </div>
      </div>
    </button>
  );
};

export const DayDetails = ({
  items,
  isLoading,
  isError,
  selectedDate,
  selectedItemId,
  onSelect,
  role,
}: Props) => {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-text">
        Загрузка расписания…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        Не удалось загрузить расписание
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-text">
        В этот день пар нет
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto pr-2 [scrollbar-color:#c5cad1_transparent] [scrollbar-width:thin]">
      {items.map((item) => (
        <PairCard
          key={item.id}
          item={item}
          selectedDate={selectedDate}
          active={item.id === selectedItemId}
          onClick={() => onSelect(item.id)}
          role={role}
        />
      ))}
    </div>
  );
};

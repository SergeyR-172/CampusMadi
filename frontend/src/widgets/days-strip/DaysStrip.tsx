import {
  buildDaysRange,
  formatDayLong,
  getWeekTypeForDate,
  isSameDay,
  weekTypeLabel,
} from "#/entities/schedule";
import { cn } from "#/shared/lib";
import { CalendarIcon } from "#/shared/ui";

const WEEKS_AHEAD = 3;

type Props = {
  selected: Date;
  onSelect: (d: Date) => void;
  today?: Date;
};

export const DaysStrip = ({ selected, onSelect, today = new Date() }: Props) => {
  const days = buildDaysRange(WEEKS_AHEAD, today);

  return (
    <div className="rounded-2xl border border-gray-300/60 bg-white/40 px-3 py-3">
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-color:#c5cad1_transparent] [scrollbar-width:thin]">
        {days.map((d) => {
          const { day, month, weekday } = formatDayLong(d);
          const wType = weekTypeLabel(getWeekTypeForDate(d));
          const active = isSameDay(d, selected);
          const isToday = isSameDay(d, today);

          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelect(d)}
              className={cn(
                "flex h-[170px] w-[120px] shrink-0 flex-col items-center gap-2 rounded-xl border-2 px-3 py-3 text-center transition-all",
                active
                  ? "border-brand bg-brand/10 shadow-md"
                  : "border-gray-300 bg-white hover:border-brand/40",
              )}
            >
              <CalendarIcon
                size={22}
                className={active ? "text-brand" : "text-foreground"}
              />
              <div className="flex flex-col items-center text-sm leading-tight text-foreground">
                <span className="font-semibold">{day}</span>
                <span>{month}</span>
                <span>{weekday}</span>
              </div>
              <div className="mt-auto flex flex-col items-center gap-0.5">
                <span className="text-xs text-gray-text">{wType}</span>
                {isToday && (
                  <span className="rounded-full bg-brand/15 px-2 text-[10px] font-semibold text-brand">
                    Сегодня
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

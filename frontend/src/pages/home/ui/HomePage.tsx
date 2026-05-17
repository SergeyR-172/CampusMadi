import { useMemo, useState } from "react";

import {
  dayOffsetFromToday,
  formatDateIso,
  startOfDay,
  useScheduleDay,
  useScheduleWeek,
} from "#/entities/schedule";
import { useCurrentUser } from "#/entities/user";
import { DayDetails } from "#/widgets/day-details";
import { DaysStrip } from "#/widgets/days-strip";
import { HomeSidebar } from "#/widgets/home-sidebar";
import { NotesPanel } from "#/widgets/notes-panel";
import { ScheduleHeader } from "#/widgets/schedule-header";

export const HomePage = () => {
  const { user } = useCurrentUser();
  // Стабилизируем "сегодня" на время жизни страницы, чтобы переход через полночь
  // не сдвигал индексы дней.
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const offset = dayOffsetFromToday(selectedDate, today);
  // /api/schedule/week/current — фоновая загрузка текущей недели (используется
  // кэшем TanStack, чтобы при переключении на сегодня данные уже были тёплыми).
  useScheduleWeek();
  const dayQuery = useScheduleDay(offset);

  const items = dayQuery.data ?? [];
  const selectedItem =
    items.find((item) => item.id === selectedItemId) ?? null;

  const subtitleFromItems =
    user?.role === "default"
      ? (items[0]?.group_name ?? undefined)
      : undefined;

  const handleSelectDate = (d: Date) => {
    setSelectedDate(d);
    setSelectedItemId(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <HomeSidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        <ScheduleHeader user={user} subtitle={subtitleFromItems} />

        <div className="flex min-h-0 flex-1 gap-6 px-8 pb-6">
          <section className="flex min-w-0 flex-1 flex-col gap-4">
            <DaysStrip
              selected={selectedDate}
              onSelect={handleSelectDate}
              today={today}
            />

            <h2
              className="px-2 text-3xl font-bold text-foreground"
              style={{ fontFamily: "Roboto, sans-serif" }}
            >
              Подробнее
            </h2>

            <div className="min-h-0 flex-1">
              <DayDetails
                items={items}
                isLoading={dayQuery.isPending}
                isError={dayQuery.isError}
                selectedDate={selectedDate}
                selectedItemId={selectedItemId}
                onSelect={setSelectedItemId}
                role={user?.role}
              />
            </div>
          </section>

          <NotesPanel
            selectedItem={selectedItem}
            selectedDate={formatDateIso(selectedDate)}
            role={user?.role}
          />
        </div>
      </main>
    </div>
  );
};

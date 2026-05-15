import type { WeekType } from "#/shared/api";

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

const RU_MONTHS_GENITIVE = [
  "Января",
  "Февраля",
  "Марта",
  "Апреля",
  "Мая",
  "Июня",
  "Июля",
  "Августа",
  "Сентября",
  "Октября",
  "Ноября",
  "Декабря",
];

const RU_WEEKDAYS = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];

const RU_WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const startOfDay = (d: Date): Date => {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
};

/** 1 (Mon) .. 7 (Sun) */
export const isoWeekday = (d: Date): number => {
  const wd = d.getDay();
  return wd === 0 ? 7 : wd;
};

export const addDays = (d: Date, days: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
};

export const getMondayOfWeek = (d: Date): Date => {
  const day = startOfDay(d);
  return addDays(day, -(isoWeekday(day) - 1));
};

export const dayOffsetFromToday = (date: Date, today: Date = new Date()): number => {
  const a = startOfDay(today).getTime();
  const b = startOfDay(date).getTime();
  return Math.round((b - a) / MS_PER_DAY);
};

/** Builds Mon..Sat (6 days) for `weeksAhead` consecutive weeks, starting from current week's Monday. */
export const buildDaysRange = (weeksAhead: number, from: Date = new Date()): Date[] => {
  const monday = getMondayOfWeek(from);
  const result: Date[] = [];
  for (let w = 0; w < weeksAhead; w += 1) {
    for (let i = 0; i < 6; i += 1) {
      result.push(addDays(monday, w * 7 + i));
    }
  }
  return result;
};

/** ISO week number (matches Python's date.isocalendar().week). */
export const getIsoWeek = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
};

export const getWeekTypeForDate = (date: Date): Exclude<WeekType, "both"> =>
  getIsoWeek(date) % 2 === 0 ? "even" : "odd";

export const weekTypeLabel = (t: Exclude<WeekType, "both">): string =>
  t === "odd" ? "Числитель" : "Знаменатель";

export const formatDayLong = (d: Date): { day: number; month: string; weekday: string } => ({
  day: d.getDate(),
  month: RU_MONTHS_GENITIVE[d.getMonth()],
  weekday: RU_WEEKDAYS[isoWeekday(d) - 1],
});

export const formatWeekdayShort = (d: Date): string => RU_WEEKDAYS_SHORT[isoWeekday(d) - 1];

export const formatDateDots = (d: Date): string => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
};

export const formatTime = (time: string): string => time.slice(0, 5);

export const isSameDay = (a: Date, b: Date): boolean =>
  startOfDay(a).getTime() === startOfDay(b).getTime();

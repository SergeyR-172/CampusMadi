export type UserRole = "admin" | "teacher" | "default";
export type WeekType = "odd" | "even" | "both"; // числитель или знаминатель или оба

export type UserSchema = {
  id: number;
  username: string;
  name: string;
  role: UserRole;
};

// тип с постфиксом Out это "выходная схема" — данные, которые API возвращает клиенту в ответе
export type UserOut = {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  group_id: number | null;
};

export type UserLogin = {
  username: string;
  password: string;
};

export type UserCreate = {
  username: string;
  password: string;
  name: string;
  role?: UserRole;
  group_id?: number | null;
};

export type UserUpdate = {
  username?: string | null;
  password?: string | null;
  name?: string | null;
  role?: UserRole | null;
  group_id?: number | null;
};

export type TokenInfo = {
  access_token: string;
  token_type: string;
};

export type GroupOut = {
  id: number;
  name: string;
};

export type GroupCreate = {
  name: string;
};

export type GroupUpdate = {
  name?: string | null;
};

export type NoteOut = {
  id: number;
  author_id: number;
  schedule_item_id: number | null;
  lesson_date: string;
  text: string;
  private: boolean;
};

export type NoteCreate = {
  schedule_item_id: number;
  lesson_date: string;
  text: string;
  private?: boolean;
};

export type NoteUpdate = {
  text?: string | null;
  private?: boolean | null;
};

export type ScheduleItemOut = {
  id: number;
  subject: string;
  group_id: number;
  group_name: string;
  teacher_name: string;
  day_of_week: number;
  pair_number: number;
  week_type: WeekType;
  start_time: string;
  end_time: string;
  date_from: string;
  date_to: string;
  user_notes?: NoteOut[];
  teacher_notes?: NoteOut[];
};

export type ScheduleDayOut = {
  date: string;
  day_of_week: number;
  items: ScheduleItemOut[];
};

export type AdminScheduleItemOut = {
  id: number;
  subject: string;
  group_id: number;
  teacher_id: number;
  day_of_week: number;
  pair_number: number;
  week_type: WeekType;
  start_time: string;
  end_time: string;
  date_from: string;
  date_to: string;
};

export type ScheduleItemCreate = {
  subject: string;
  group_id: number;
  teacher_id: number;
  day_of_week: number;
  pair_number: number;
  week_type?: WeekType;
  start_time: string;
  end_time: string;
  date_from: string;
  date_to: string;
};

export type ScheduleItemUpdate = {
  subject?: string | null;
  group_id?: number | null;
  teacher_id?: number | null;
  day_of_week?: number | null;
  pair_number?: number | null;
  week_type?: WeekType | null;
  start_time?: string | null;
  end_time?: string | null;
  date_from?: string | null;
  date_to?: string | null;
};

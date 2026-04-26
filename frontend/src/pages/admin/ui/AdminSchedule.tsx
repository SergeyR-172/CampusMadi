import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type {
  AdminScheduleItemOut,
  ScheduleItemCreate,
  ScheduleItemUpdate,
  WeekType,
} from "#/shared/api";
import { adminApi } from "#/shared/api";
import { Modal } from "#/shared/ui";

const DAY_NAMES = ["", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const WEEK_TYPE_LABELS: Record<WeekType, string> = {
  both: "Каждую неделю",
  odd: "Нечётная",
  even: "Чётная",
};

const scheduleQueryKey = ["admin", "schedule"] as const;
const groupsQueryKey = ["admin", "groups"] as const;
const teachersQueryKey = ["admin", "teachers"] as const;

const emptyCreate = (): ScheduleItemCreate => ({
  subject: "",
  group_id: 0,
  teacher_id: 0,
  day_of_week: 1,
  pair_number: 1,
  week_type: "both",
  start_time: "08:00",
  end_time: "09:30",
  date_from: "",
  date_to: "",
});

export const AdminSchedule = () => {
  const queryClient = useQueryClient();
  const [scheduleQuery, groupsQuery, teachersQuery] = useQueries({
    queries: [
      { queryKey: scheduleQueryKey, queryFn: adminApi.schedule.list },
      { queryKey: groupsQueryKey, queryFn: adminApi.groups.list },
      { queryKey: teachersQueryKey, queryFn: adminApi.teachers.list },
    ],
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ScheduleItemCreate>(emptyCreate());
  const [createError, setCreateError] = useState<string | null>(null);

  const [editItem, setEditItem] = useState<AdminScheduleItemOut | null>(null);
  const [editForm, setEditForm] = useState<ScheduleItemUpdate>({});
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteItem, setDeleteItem] = useState<AdminScheduleItemOut | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: scheduleQueryKey });

  const createMutation = useMutation({
    mutationFn: (data: ScheduleItemCreate) => adminApi.schedule.create(data),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setCreateForm(emptyCreate());
    },
    onError: () => setCreateError("Не удалось создать занятие"),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; data: ScheduleItemUpdate }) =>
      adminApi.schedule.update(vars.id, vars.data),
    onSuccess: () => {
      invalidate();
      setEditItem(null);
    },
    onError: () => setEditError("Не удалось обновить занятие"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.schedule.delete(id),
    onSuccess: () => {
      invalidate();
      setDeleteItem(null);
    },
  });

  const openEdit = (item: AdminScheduleItemOut) => {
    setEditItem(item);
    setEditForm({
      subject: item.subject,
      group_id: item.group_id,
      teacher_id: item.teacher_id,
      day_of_week: item.day_of_week,
      pair_number: item.pair_number,
      week_type: item.week_type,
      start_time: item.start_time,
      end_time: item.end_time,
      date_from: item.date_from,
      date_to: item.date_to,
    });
    setEditError(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    createMutation.mutate(createForm);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setEditError(null);
    updateMutation.mutate({ id: editItem.id, data: editForm });
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    deleteMutation.mutate(deleteItem.id);
  };

  const items = scheduleQuery.data ?? [];
  const groups = groupsQuery.data ?? [];
  const teachers = teachersQuery.data ?? [];
  const isLoading =
    scheduleQuery.isPending || groupsQuery.isPending || teachersQuery.isPending;
  const isError =
    scheduleQuery.isError || groupsQuery.isError || teachersQuery.isError;

  const groupName = (id: number) => groups.find((g) => g.id === id)?.name ?? String(id);
  const teacherName = (id: number) =>
    teachers.find((t) => t.id === id)?.name ?? String(id);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "Roboto, sans-serif" }}>
          Расписание
        </h1>
        <button
          onClick={() => {
            setCreateForm(emptyCreate());
            setCreateError(null);
            setCreateOpen(true);
          }}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Добавить занятие
        </button>
      </div>

      {isLoading && <p className="text-[#8a8c8f]">Загрузка...</p>}
      {isError && <p className="text-[#e96466]">Не удалось загрузить данные</p>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-[#8a8c8f]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">ID</th>
                <th className="px-4 py-3 text-left font-medium">Предмет</th>
                <th className="px-4 py-3 text-left font-medium">Группа</th>
                <th className="px-4 py-3 text-left font-medium">Преподаватель</th>
                <th className="px-4 py-3 text-left font-medium">День</th>
                <th className="px-4 py-3 text-left font-medium">Пара</th>
                <th className="px-4 py-3 text-left font-medium">Время</th>
                <th className="px-4 py-3 text-left font-medium">Неделя</th>
                <th className="px-4 py-3 text-right font-medium">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-[#8a8c8f]">{item.id}</td>
                  <td className="px-4 py-3 font-medium">{item.subject}</td>
                  <td className="px-4 py-3">{groupName(item.group_id)}</td>
                  <td className="px-4 py-3">{teacherName(item.teacher_id)}</td>
                  <td className="px-4 py-3">{DAY_NAMES[item.day_of_week]}</td>
                  <td className="px-4 py-3">{item.pair_number}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}
                  </td>
                  <td className="px-4 py-3">{WEEK_TYPE_LABELS[item.week_type]}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(item)}
                      className="mr-3 text-brand hover:underline"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => setDeleteItem(item)}
                      className="text-[#e96466] hover:underline"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-[#8a8c8f]">
                    Расписание пустое
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Добавить занятие"
        className="max-w-2xl"
      >
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-sm font-medium">Предмет</label>
            <input
              type="text"
              value={createForm.subject}
              onChange={(e) => setCreateForm((f) => ({ ...f, subject: e.target.value }))}
              required
              className={inputCls}
            />
          </div>
          <SelectField
            label="Группа"
            value={createForm.group_id}
            onChange={(v) => setCreateForm((f) => ({ ...f, group_id: Number(v) }))}
            options={groups.map((g) => ({ value: g.id, label: g.name }))}
          />
          <SelectField
            label="Преподаватель"
            value={createForm.teacher_id}
            onChange={(v) => setCreateForm((f) => ({ ...f, teacher_id: Number(v) }))}
            options={teachers.map((t) => ({ value: t.id, label: t.name }))}
          />
          <SelectField
            label="День недели"
            value={createForm.day_of_week}
            onChange={(v) => setCreateForm((f) => ({ ...f, day_of_week: Number(v) }))}
            options={DAY_NAMES.slice(1).map((d, i) => ({ value: i + 1, label: d }))}
          />
          <NumberField
            label="Номер пары"
            value={createForm.pair_number}
            onChange={(v) => setCreateForm((f) => ({ ...f, pair_number: v }))}
            min={1}
          />
          <TimeField
            label="Начало"
            value={createForm.start_time}
            onChange={(v) => setCreateForm((f) => ({ ...f, start_time: v }))}
          />
          <TimeField
            label="Конец"
            value={createForm.end_time}
            onChange={(v) => setCreateForm((f) => ({ ...f, end_time: v }))}
          />
          <SelectField
            label="Тип недели"
            value={createForm.week_type ?? "both"}
            onChange={(v) => setCreateForm((f) => ({ ...f, week_type: v as WeekType }))}
            options={[
              { value: "both", label: "Каждую неделю" },
              { value: "odd", label: "Нечётная" },
              { value: "even", label: "Чётная" },
            ]}
          />
          <DateField
            label="Дата начала"
            value={createForm.date_from}
            onChange={(v) => setCreateForm((f) => ({ ...f, date_from: v }))}
          />
          <DateField
            label="Дата окончания"
            value={createForm.date_to}
            onChange={(v) => setCreateForm((f) => ({ ...f, date_to: v }))}
          />
          {createError && (
            <p className="col-span-2 text-sm text-[#e96466]">{createError}</p>
          )}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="col-span-2 mt-2 rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {createMutation.isPending ? "Создание..." : "Создать"}
          </button>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="Изменить занятие"
        className="max-w-2xl"
      >
        <form onSubmit={handleEdit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-sm font-medium">Предмет</label>
            <input
              type="text"
              value={editForm.subject ?? ""}
              onChange={(e) => setEditForm((f) => ({ ...f, subject: e.target.value }))}
              className={inputCls}
            />
          </div>
          <SelectField
            label="Группа"
            value={editForm.group_id ?? 0}
            onChange={(v) => setEditForm((f) => ({ ...f, group_id: Number(v) }))}
            options={groups.map((g) => ({ value: g.id, label: g.name }))}
          />
          <SelectField
            label="Преподаватель"
            value={editForm.teacher_id ?? 0}
            onChange={(v) => setEditForm((f) => ({ ...f, teacher_id: Number(v) }))}
            options={teachers.map((t) => ({ value: t.id, label: t.name }))}
          />
          <SelectField
            label="День недели"
            value={editForm.day_of_week ?? 1}
            onChange={(v) => setEditForm((f) => ({ ...f, day_of_week: Number(v) }))}
            options={DAY_NAMES.slice(1).map((d, i) => ({ value: i + 1, label: d }))}
          />
          <NumberField
            label="Номер пары"
            value={editForm.pair_number ?? 1}
            onChange={(v) => setEditForm((f) => ({ ...f, pair_number: v }))}
            min={1}
          />
          <TimeField
            label="Начало"
            value={editForm.start_time ?? ""}
            onChange={(v) => setEditForm((f) => ({ ...f, start_time: v }))}
          />
          <TimeField
            label="Конец"
            value={editForm.end_time ?? ""}
            onChange={(v) => setEditForm((f) => ({ ...f, end_time: v }))}
          />
          <SelectField
            label="Тип недели"
            value={editForm.week_type ?? "both"}
            onChange={(v) => setEditForm((f) => ({ ...f, week_type: v as WeekType }))}
            options={[
              { value: "both", label: "Каждую неделю" },
              { value: "odd", label: "Нечётная" },
              { value: "even", label: "Чётная" },
            ]}
          />
          <DateField
            label="Дата начала"
            value={editForm.date_from ?? ""}
            onChange={(v) => setEditForm((f) => ({ ...f, date_from: v }))}
          />
          <DateField
            label="Дата окончания"
            value={editForm.date_to ?? ""}
            onChange={(v) => setEditForm((f) => ({ ...f, date_to: v }))}
          />
          {editError && <p className="col-span-2 text-sm text-[#e96466]">{editError}</p>}
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="col-span-2 mt-2 rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
          </button>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteItem} onClose={() => setDeleteItem(null)} title="Удалить занятие">
        <p className="mb-6 text-sm">
          Удалить занятие <strong>{deleteItem?.subject}</strong>? Это действие необратимо.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteItem(null)}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex-1 rounded-lg bg-[#e96466] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {deleteMutation.isPending ? "Удаление..." : "Удалить"}
          </button>
        </div>
      </Modal>
    </div>
  );
};

const inputCls =
  "h-10 rounded-lg border border-[#8a8c8f] bg-[#f7faff] px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30";

const SelectField = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  options: { value: string | number; label: string }[];
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

const NumberField = ({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium">{label}</label>
    <input
      type="number"
      value={value}
      min={min}
      onChange={(e) => onChange(Number(e.target.value))}
      className={inputCls}
    />
  </div>
);

const TimeField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium">{label}</label>
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  </div>
);

const DateField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium">{label}</label>
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  </div>
);
